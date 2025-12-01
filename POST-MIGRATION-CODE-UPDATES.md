# Post-Migration Code Updates

After running `migrate_cleanup_connections_table.py`, you need to update the backend code to remove references to the deleted columns.

## Columns Removed:
1. ❌ `user_id_1`
2. ❌ `user_id_2`
3. ❌ `connection_type`

## Columns to Use Instead:
1. ✅ `profile_id_1` + `profile_type_1` (instead of user_id_1)
2. ✅ `profile_id_2` + `profile_type_2` (instead of user_id_2)
3. ✅ `status` alone (instead of connection_type)

---

## 1. Update Models (`app.py modules/models.py` or `models.py`)

### BEFORE:
```python
class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True)
    user_id_1 = Column(Integer, ForeignKey("users.id"), nullable=False)  # ❌ REMOVE
    user_id_2 = Column(Integer, ForeignKey("users.id"), nullable=False)  # ❌ REMOVE
    connection_type = Column(String(20), nullable=False, default='connect')  # ❌ REMOVE
    status = Column(String(20), nullable=False, default='pending')
    profile_id_1 = Column(Integer, nullable=False)
    profile_type_1 = Column(String(20), nullable=False)
    profile_id_2 = Column(Integer, nullable=False)
    profile_type_2 = Column(String(20), nullable=False)
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    connection_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    connected_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### AFTER:
```python
class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True)
    # Profile-based identification (multi-role support)
    profile_id_1 = Column(Integer, nullable=False)
    profile_type_1 = Column(String(20), nullable=False)  # 'tutor', 'student', 'parent', etc.
    profile_id_2 = Column(Integer, nullable=False)
    profile_type_2 = Column(String(20), nullable=False)
    # Connection details
    status = Column(String(20), nullable=False, default='connecting')
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    connection_message = Column(Text)
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    connected_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## 2. Update Pydantic Schemas

### BEFORE:
```python
class ConnectionCreate(BaseModel):
    target_user_id: int  # ❌ REMOVE (use target_profile_id instead)
    connection_type: str = 'connect'  # ❌ REMOVE (infer from status)
    connection_message: Optional[str] = None
```

### AFTER:
```python
class ConnectionCreate(BaseModel):
    target_profile_id: int  # Profile ID to connect with
    target_profile_type: str  # 'tutor', 'student', 'parent', etc.
    connection_message: Optional[str] = None
    is_block: bool = False  # True for blocking, False for connection
```

---

## 3. Update connection_endpoints.py

### Change 1: Create Connection (POST /api/connections)

**BEFORE:**
```python
@router.post("/api/connections")
async def create_connection(
    connection_data: ConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine initial status based on connection type
    if connection_data.connection_type == 'block':  # ❌ REMOVE
        initial_status = 'blocked'
    else:
        initial_status = 'connecting'

    new_connection = Connection(
        user_id_1=user_id,  # ❌ REMOVE
        user_id_2=target_user_id,  # ❌ REMOVE
        connection_type=connection_data.connection_type,  # ❌ REMOVE
        status=initial_status,
        profile_id_1=current_profile_id,
        profile_type_1=current_profile_type,
        profile_id_2=target_profile_id,
        profile_type_2=target_profile_type,
        initiated_by=user_id,
        connection_message=connection_data.connection_message
    )
```

**AFTER:**
```python
@router.post("/api/connections")
async def create_connection(
    connection_data: ConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine initial status based on is_block flag
    if connection_data.is_block:  # ✅ NEW
        initial_status = 'blocked'
    else:
        initial_status = 'connecting'

    new_connection = Connection(
        profile_id_1=current_profile_id,
        profile_type_1=current_profile_type,
        profile_id_2=connection_data.target_profile_id,  # ✅ FROM REQUEST
        profile_type_2=connection_data.target_profile_type,  # ✅ FROM REQUEST
        status=initial_status,
        initiated_by=user_id,
        connection_message=connection_data.connection_message
    )
```

### Change 2: Get Connections (GET /api/connections)

**BEFORE:**
```python
@router.get("/api/connections")
async def get_my_connections(
    connection_type: Optional[str] = Query(None, description="Filter by type: connect, block"),  # ❌ REMOVE
    status: Optional[str] = Query(None, description="Filter by status"),
    ...
):
    query = db.query(Connection).filter(...)

    # Filter by connection_type
    if connection_type:  # ❌ REMOVE
        query = query.filter(Connection.connection_type == connection_type)

    # Filter by status
    if status:
        query = query.filter(Connection.status == status)
```

**AFTER:**
```python
@router.get("/api/connections")
async def get_my_connections(
    status: Optional[str] = Query(None, description="Filter by status: connecting, connected, blocked, etc."),
    exclude_blocked: bool = Query(False, description="Exclude blocked users"),
    ...
):
    query = db.query(Connection).filter(...)

    # Filter by status
    if status:
        query = query.filter(Connection.status == status)

    # Optionally exclude blocked
    if exclude_blocked:
        query = query.filter(Connection.status != 'blocked')
```

### Change 3: Get Connection Stats (GET /api/connections/stats)

**BEFORE:**
```python
# Connected connections
connected_count = db.query(func.count(Connection.id)).filter(
    or_(
        Connection.user_id_1 == user_id,  # ❌ REMOVE
        Connection.user_id_2 == user_id   # ❌ REMOVE
    ),
    Connection.connection_type == 'connect',  # ❌ REMOVE
    Connection.status == 'connected'
).scalar()

# Blocked users
blocked_count = db.query(func.count(Connection.id)).filter(
    Connection.user_id_1 == user_id,  # ❌ REMOVE
    Connection.connection_type == 'block',  # ❌ REMOVE
    Connection.status == 'blocked'
).scalar()
```

**AFTER:**
```python
# Helper: Get user's current profile (assuming tutor profile for now)
tutor_profile = db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first()
if not tutor_profile:
    # Handle case where user doesn't have this profile type
    return {...}

profile_id = tutor_profile.id
profile_type = 'tutor'

# Connected connections
connected_count = db.query(func.count(Connection.id)).filter(
    or_(
        and_(
            Connection.profile_id_1 == profile_id,
            Connection.profile_type_1 == profile_type
        ),
        and_(
            Connection.profile_id_2 == profile_id,
            Connection.profile_type_2 == profile_type
        )
    ),
    Connection.status == 'connected'  # ✅ Status alone is sufficient
).scalar()

# Blocked users (where current user blocked someone)
blocked_count = db.query(func.count(Connection.id)).filter(
    Connection.profile_id_1 == profile_id,
    Connection.profile_type_1 == profile_type,
    Connection.status == 'blocked'  # ✅ Status alone is sufficient
).scalar()
```

### Change 4: Check Connection Status (POST /api/connections/check)

**BEFORE:**
```python
return {
    "is_connected": connection.status == 'connected',
    "connection_type": connection.connection_type,  # ❌ REMOVE
    "status": connection.status,
    ...
}
```

**AFTER:**
```python
return {
    "is_connected": connection.status == 'connected',
    "status": connection.status,
    "is_blocked": connection.status == 'blocked',  # ✅ NEW - explicit flag
    "is_pending": connection.status == 'connecting',  # ✅ NEW - explicit flag
    ...
}
```

---

## 4. Update Frontend (JavaScript)

### Change 1: Create Connection Request

**BEFORE:**
```javascript
// js/tutor-profile/community-panel-data-loader.js
const response = await fetch(`${API_BASE_URL}/api/connections`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        target_user_id: userId,  // ❌ REMOVE
        connection_type: 'connect',  // ❌ REMOVE
        connection_message: message
    })
});
```

**AFTER:**
```javascript
const response = await fetch(`${API_BASE_URL}/api/connections`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        target_profile_id: profileId,  // ✅ Profile ID
        target_profile_type: profileType,  // ✅ 'tutor', 'student', 'parent'
        connection_message: message,
        is_block: false  // ✅ false for connection, true for block
    })
});
```

### Change 2: Block User

**BEFORE:**
```javascript
const response = await fetch(`${API_BASE_URL}/api/connections`, {
    method: 'POST',
    body: JSON.stringify({
        target_user_id: userId,
        connection_type: 'block'  // ❌ REMOVE
    })
});
```

**AFTER:**
```javascript
const response = await fetch(`${API_BASE_URL}/api/connections`, {
    method: 'POST',
    body: JSON.stringify({
        target_profile_id: profileId,
        target_profile_type: profileType,
        is_block: true  // ✅ Use flag instead
    })
});
```

### Change 3: Fetch Connections

**BEFORE:**
```javascript
// Get active connections (not blocks)
const response = await fetch(
    `${API_BASE_URL}/api/connections?connection_type=connect&status=connected`,  // ❌ REMOVE connection_type
    { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**AFTER:**
```javascript
// Get active connections (exclude blocks)
const response = await fetch(
    `${API_BASE_URL}/api/connections?status=connected`,  // ✅ Status alone
    { headers: { 'Authorization': `Bearer ${token}` } }
);

// Or with explicit exclusion
const response = await fetch(
    `${API_BASE_URL}/api/connections?exclude_blocked=true&status=connected`,
    { headers: { 'Authorization': `Bearer ${token}` } }
);
```

---

## 5. Helper Functions to Add

### Backend Helper: Infer Connection Type from Status

```python
def get_connection_type(status: str) -> str:
    """Infer connection type from status (for backwards compatibility)"""
    if status == 'blocked':
        return 'block'
    else:  # connecting, connected, disconnect, connection_failed
        return 'connect'
```

### Backend Helper: Get User's Profile ID and Type

```python
def get_current_user_profile(user_id: int, db: Session):
    """
    Get user's current active profile
    Priority: tutor > student > parent
    Returns: (profile_id, profile_type) or (None, None)
    """
    # Try tutor profile
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first()
    if tutor:
        return (tutor.id, 'tutor')

    # Try student profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if student:
        return (student.id, 'student')

    # Try parent profile
    parent = db.query(ParentProfile).filter(ParentProfile.user_id == user_id).first()
    if parent:
        return (parent.id, 'parent')

    return (None, None)
```

---

## 6. Testing Checklist

After making all updates, test these scenarios:

### Connection Flow:
- [ ] User A sends connection request to User B (as tutor → student)
- [ ] User B sees request in "Received Requests"
- [ ] User A sees request in "Sent Requests"
- [ ] User B accepts request
- [ ] Both users see each other in "Connections"
- [ ] Either user disconnects
- [ ] Connection status updates to 'disconnect'

### Blocking Flow:
- [ ] User A blocks User B
- [ ] Block takes effect immediately (no acceptance needed)
- [ ] User B appears in User A's "Blocked" list
- [ ] User B cannot see User A's profile or send messages

### API Endpoints:
- [ ] POST /api/connections (create connection/block)
- [ ] GET /api/connections (list connections with filters)
- [ ] GET /api/connections/stats (connection statistics)
- [ ] PUT /api/connections/{id} (update connection status)
- [ ] POST /api/connections/check (check connection between users)
- [ ] DELETE /api/connections/{id} (delete connection)

---

## Summary

**Removed:**
- ❌ `user_id_1`, `user_id_2` → Use `profile_id_1/2` + `profile_type_1/2`
- ❌ `connection_type` → Use `status` alone

**Benefits:**
- ✅ Cleaner schema (3 fewer columns)
- ✅ Less confusion (profile-based is clearer than user-based)
- ✅ Single source of truth (status tells you everything)
- ✅ Easier queries (no redundant filters)

**Key Changes:**
- All queries now use `profile_id + profile_type` instead of `user_id`
- All queries filter by `status` only (no `connection_type`)
- Frontend sends `target_profile_id + target_profile_type` instead of `target_user_id`
- Frontend uses `is_block: true/false` instead of `connection_type`
