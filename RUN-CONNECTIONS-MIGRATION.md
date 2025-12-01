# 🚀 Quick Start: Run Connections Migration

## What This Does

Transforms `tutor_connections` table into a universal `connections` table where anyone can connect with anyone.

---

## Step 1: Run Migration

```bash
cd astegni-backend
python migrate_tutor_connections_to_connections.py
```

**What happens:**
- ✅ Creates new `connections` table
- ✅ Migrates existing data (student-tutor connections → follow connections)
- ✅ Backs up old table as `tutor_connections_backup_TIMESTAMP`
- ✅ Creates 7 performance indexes

---

## Step 2: Restart Backend

```bash
# Stop current backend (Ctrl+C)

# Start backend
python app.py
```

The new endpoints are automatically loaded.

---

## Step 3: Test API

Visit: **http://localhost:8000/docs**

### Test Endpoints:

1. **Create Connection (Follow a user)**
   - Endpoint: `POST /api/connections`
   - Body:
     ```json
     {
       "target_user_id": 2,
       "connection_type": "follow"
     }
     ```

2. **Get My Connections**
   - Endpoint: `GET /api/connections?direction=following`

3. **Get Connection Stats**
   - Endpoint: `GET /api/connections/stats`

4. **Check Connection Status**
   - Endpoint: `POST /api/connections/check`
   - Body:
     ```json
     {
       "target_user_id": 2
     }
     ```

---

## What Changed

### Database
| Before | After |
|--------|-------|
| `tutor_connections` | `connections` |
| `student_id` | `user_id_1` |
| `tutor_id` | `user_id_2` |
| Students → Tutors only | Anyone → Anyone |

### New Features
- ✅ **Follow** system (like Instagram)
- ✅ **Friend** system (like Facebook)
- ✅ **Block** system (privacy)
- ✅ Connection statistics
- ✅ Direction-aware queries (followers vs following)

---

## Connection Types

### 1. Follow (Directional)
```javascript
// User A follows User B
POST /api/connections
{
  "target_user_id": user_b_id,
  "connection_type": "follow"
}
// Status: "accepted" (immediate)
```

### 2. Friend (Bidirectional)
```javascript
// User A requests friendship with User B
POST /api/connections
{
  "target_user_id": user_b_id,
  "connection_type": "friend",
  "connection_message": "Let's be friends!"
}
// Status: "pending" (requires acceptance)

// User B accepts
PUT /api/connections/{connection_id}
{
  "status": "accepted"
}
```

### 3. Block
```javascript
// User A blocks User B
POST /api/connections
{
  "target_user_id": user_b_id,
  "connection_type": "block"
}
// Status: "accepted" (immediate)
```

---

## API Reference

### All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/connections` | Create connection |
| GET | `/api/connections` | Get my connections |
| GET | `/api/connections/{id}` | Get specific connection |
| PUT | `/api/connections/{id}` | Update connection (accept/reject) |
| DELETE | `/api/connections/{id}` | Delete connection (unfollow) |
| GET | `/api/connections/stats` | Get connection statistics |
| POST | `/api/connections/check` | Check connection status |
| GET | `/api/users/{id}/connections` | Get user's public connections |

---

## Frontend Integration Example

### Add Follow Button

```javascript
// In profile pages (tutor-profile.html, student-profile.html, etc.)

async function followUser(userId) {
    try {
        const response = await fetch('http://localhost:8000/api/connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                target_user_id: userId,
                connection_type: 'follow'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Now following user:', data);

            // Update button
            const btn = document.getElementById('follow-btn');
            btn.textContent = 'Following';
            btn.classList.add('following');

            // Update count
            loadConnectionStats();
        }
    } catch (error) {
        console.error('Error following user:', error);
    }
}

async function loadConnectionStats() {
    try {
        const response = await fetch('http://localhost:8000/api/connections/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const stats = await response.json();

        // Update UI
        document.getElementById('followers-count').textContent = stats.followers_count;
        document.getElementById('following-count').textContent = stats.following_count;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}
```

---

## Troubleshooting

### Migration fails with "connections table already exists"

```bash
# The script will ask if you want to drop and recreate
# Type "yes" to proceed
```

### Backend fails to start

```bash
# Check if migration completed successfully
cd astegni-backend
python -c "
from sqlalchemy import inspect, create_engine
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
inspector = inspect(engine)

if 'connections' in inspector.get_table_names():
    print('✅ connections table exists')
else:
    print('❌ connections table missing - run migration again')
"
```

### Old endpoints still using tutor_connections

The migration is backward-compatible. Old code will continue to work until you update it.

---

## Next Steps

1. ✅ Run migration
2. ✅ Restart backend
3. ✅ Test endpoints in Swagger UI
4. ⏳ Update frontend to use new endpoints
5. ⏳ Add follow/unfollow buttons to profile pages
6. ⏳ Add connection statistics to profile pages
7. ⏳ Test thoroughly with different user types
8. ⏳ Drop backup table after verification:
   ```sql
   DROP TABLE tutor_connections_backup_TIMESTAMP;
   ```

---

## Documentation

- **Full Guide:** `CONNECTIONS-SYSTEM-REFACTOR.md`
- **Migration Script:** `migrate_tutor_connections_to_connections.py`
- **Endpoints:** `connection_endpoints.py`
- **Models:** `app.py modules/models.py` (Connection class)

---

## Support

If you encounter issues:
1. Check backend logs: `astegni-backend/backend.log`
2. Check database connection: `python test_connection.py`
3. Review migration script output
4. Check Swagger UI for endpoint details: http://localhost:8000/docs

---

**Ready to migrate? Run the command above! 🚀**
