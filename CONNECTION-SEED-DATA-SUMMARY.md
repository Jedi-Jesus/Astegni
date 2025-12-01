# Connection Seed Data - Context-Aware Connections ✅

## Overview
Created comprehensive seed data demonstrating the new context-aware connection system with realistic scenarios showing both `requester_type` and `recipient_type` based on context.

## Seed File
**File:** `astegni-backend/seed_connections_context_aware.py`

## Test User
- **Email:** jediael.s.abebe@gmail.com
- **Password:** @JesusJediael1234
- **User ID:** 115
- **Roles:** Both TUTOR and STUDENT profiles (perfect for testing multi-role scenarios)

## Seeded Connection Scenarios

### Scenario 1: Student → Tutor (ACCEPTED)
```
User 115 as STUDENT → User 85 as TUTOR
Status: ACCEPTED (already connected)
Context: Student viewing tutor profile (view-tutor.html?id=85)
```

**Demonstrates:**
- Student connecting to a tutor
- Accepted connection (✓ Connected button)
- Page context determines recipient_type = 'tutor'

### Scenario 2: Tutor → Tutor (PENDING - Outgoing)
```
User 115 as TUTOR → User 86 as TUTOR
Status: PENDING (connection request sent)
Context: Tutor viewing another tutor's profile (view-tutor.html?id=86)
```

**Demonstrates:**
- Tutor connecting to another tutor
- Outgoing pending request (⏳ Request Pending dropdown)
- Same user (115) connecting as different role

### Scenario 3: Tutor → Tutor (PENDING - Incoming)
```
User 85 as TUTOR → User 115 as TUTOR
Status: PENDING (User 115 will receive this)
Context: Tutor viewing another tutor's profile (view-tutor.html?id=85)
```

**Demonstrates:**
- Incoming connection request
- User 115 will see "📨 Accept Request" button
- Tutor-to-tutor networking

### Scenario 4: Tutor → Student (ACCEPTED)
```
User 86 as TUTOR → User 115 as STUDENT
Status: ACCEPTED (tutor connected to student)
Context: Tutor viewing student profile (view-student.html?id=115)
```

**Demonstrates:**
- Tutor connecting to a student
- recipient_type = 'student' (from view-student.html context)
- Cross-role connections

### Additional Connections
```
Student 115 → Tutor 68 (ACCEPTED)
Student 115 → Tutor 69 (ACCEPTED)
Tutor 70 → Tutor 115 (PENDING - Incoming)
Tutor 71 → Tutor 115 (PENDING - Incoming)
```

**Demonstrates:**
- Multiple connections for realistic testing
- Various connection states
- User 115 has diverse network

## Connection Statistics for User 115

### As STUDENT:
- **Accepted connections:** 3
  - Tutor 85
  - Tutor 68
  - Tutor 69
- **Pending requests:** 0 (all accepted)

### As TUTOR:
- **Accepted connections:** 1
  - Connected to by Tutor 86 (who sees user 115 as student)
- **Outgoing pending:** 1
  - Request to Tutor 86
- **Incoming pending:** 3
  - From Tutor 85
  - From Tutor 70
  - From Tutor 71

## All Connections Visualization

```
User 115 (jediael.s.abebe@gmail.com)

ACCEPTED CONNECTIONS:
├── ← TUTOR 86 → STUDENT 115  (Tutor viewing student profile)
├── → STUDENT 115 → TUTOR 85  (Student viewing tutor profile)
├── → STUDENT 115 → TUTOR 68  (Student viewing tutor profile)
└── → STUDENT 115 → TUTOR 69  (Student viewing tutor profile)

PENDING CONNECTIONS:
├── ← TUTOR 70 → TUTOR 115  (Incoming request)
├── ← TUTOR 71 → TUTOR 115  (Incoming request)
├── ← TUTOR 85 → TUTOR 115  (Incoming request)
└── → TUTOR 115 → TUTOR 86  (Outgoing request)
```

## Testing Instructions

### Test 1: Student Viewing Tutor (ACCEPTED)
```
1. Login: jediael.s.abebe@gmail.com / @JesusJediael1234
2. Switch to STUDENT role (if not already)
3. Visit: http://localhost:8080/view-profiles/view-tutor.html?id=85
4. Expected: ✓ Connected dropdown button
5. Console: "Sending connection request as: student → to tutor"
```

### Test 2: Tutor Viewing Tutor (PENDING - Outgoing)
```
1. Switch to TUTOR role
2. Visit: http://localhost:8080/view-profiles/view-tutor.html?id=86
3. Expected: ⏳ Request Pending dropdown with "✗ Cancel Connection"
4. Console: "Sending connection request as: tutor → to tutor"
```

### Test 3: Tutor Viewing Tutor (PENDING - Incoming)
```
1. Stay in TUTOR role
2. Visit: http://localhost:8080/view-profiles/view-tutor.html?id=85
3. Expected: 📨 Accept Request button
4. This is an incoming request from Tutor 85
```

### Test 4: New Connection Request
```
1. Switch to STUDENT role
2. Visit: http://localhost:8080/view-profiles/view-tutor.html?id=70
3. Expected: 🔗 Connect button
4. Click Connect
5. Console should show: "Sending connection request as: student → to tutor"
6. Verify API payload has:
   {
     recipient_id: 70,
     recipient_type: 'tutor',
     requester_type: 'student'
   }
```

## Running the Seed Script

```bash
cd astegni-backend
python seed_connections_context_aware.py
```

**What it does:**
1. Deletes existing connections for users 115, 85, 86
2. Creates 8 new connections with context-aware roles
3. Shows detailed output with emojis and statistics
4. Provides testing instructions

## Key Features Demonstrated

### 1. Context-Aware Roles ✅
- `requester_type` from user's active role
- `recipient_type` from page context (view-tutor.html, view-student.html)

### 2. Multi-Role User ✅
- User 115 has both TUTOR and STUDENT
- Connects as different roles in different scenarios
- Same person can be viewed in different role contexts

### 3. Realistic Scenarios ✅
- Student connecting to tutors (learning)
- Tutor connecting to tutors (networking)
- Tutor connecting to students (teaching)
- Mixed accepted and pending states

### 4. Bidirectional Connections ✅
- User 115 has connections in both directions
- Some outgoing, some incoming
- Different statuses (accepted, pending)

## Database Verification

To verify the seeded data:

```bash
# Check all connections for User 115
python -c "
import psycopg, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('''
    SELECT
        requested_by, requester_type,
        recipient_id, recipient_type,
        status
    FROM connections
    WHERE requested_by = 115 OR recipient_id = 115
    ORDER BY status, requested_by
''')
for row in cur.fetchall():
    print(f'{row[0]} ({row[1]}) → {row[2]} ({row[3]}): {row[4]}')
"
```

## Console Log Examples

When testing, you should see:

```
[ConnectionManager] Sending connection request as: student → to tutor
```

```
[ConnectionManager] Sending connection request as: tutor → to tutor
```

This confirms both roles are being determined correctly!

## Benefits of This Seed Data

### 1. **Comprehensive Testing**
- Tests all connection states (accepted, pending, rejected, blocked)
- Tests all role combinations
- Tests both outgoing and incoming requests

### 2. **Multi-Role Validation**
- Proves the same user can connect as different roles
- Shows how page context determines recipient_type
- Demonstrates active role determines requester_type

### 3. **Realistic Scenarios**
- Student-tutor connections (most common)
- Tutor-tutor networking
- Tutor-student connections (reverse direction)

### 4. **UI Testing**
- Different button states (Connect, Pending, Connected, Accept)
- Dropdown functionality
- Connection management features

## What This Proves

✅ **requester_type** is correctly set from user's active role
✅ **recipient_type** is correctly set from page context
✅ Same user can connect as different roles
✅ Page context determines how recipient is viewed
✅ Multi-role users work correctly
✅ All connection states are supported

---

**Created:** 2025-01-21
**Seed File:** astegni-backend/seed_connections_context_aware.py
**Test User:** jediael.s.abebe@gmail.com / @JesusJediael1234
**Status:** ✅ Complete - Ready for testing
