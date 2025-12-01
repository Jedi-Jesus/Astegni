# Manage Tutors - Testing Instructions

## ✅ Setup Complete
The manage-tutors.html page is now fully integrated with the `tutor_profiles` table!

## What's Working

### Backend
- ✅ Server is running on http://localhost:8000
- ✅ All endpoints query from `tutor_profiles` table
- ✅ Suspension fields added to database
- ✅ All verification_status values are handled correctly

### Frontend
- ✅ Server is running on http://localhost:8080
- ✅ All JavaScript files updated to work with tutor_profiles
- ✅ Suspend/Reinstate/Reconsider actions implemented

## How to Test

### 1. Access the Admin Panel
1. Open browser: http://localhost:8080/admin-pages/manage-tutors.html
2. Login with admin credentials (if you have an admin account)
3. If you don't have an admin account, create one first

### 2. Create Admin Account (if needed)
```bash
cd astegni-backend
python
```
```python
from app import SessionLocal, User, hash_password
db = SessionLocal()

# Create admin user
admin = User(
    username="admin",
    email="admin@astegni.com",
    password=hash_password("admin123"),
    roles=["admin", "tutor"],
    first_name="Admin",
    father_name="User"
)
db.add(admin)
db.commit()
print("Admin user created!")
```

### 3. Test Each Panel

#### Dashboard Panel
- Should show statistics for all verification statuses
- Live widget shows recent tutor activity
- Stats are calculated from tutor_profiles table

#### Pending Tutors Panel
- Shows tutors with verification_status='pending'
- Review button opens modal with details
- Approve/Reject buttons update status

#### Verified Tutors Panel
- Shows tutors with verification_status='verified'
- **NEW: Suspend button** - click to suspend a tutor
- View button shows tutor details

#### Rejected Tutors Panel
- Shows tutors with verification_status='rejected'
- **NEW: Reconsider button** - moves back to pending
- Shows rejection reason

#### Suspended Tutors Panel
- Shows tutors with verification_status='suspended'
- **NEW: Reinstate button** - moves back to verified
- Shows suspension reason

## Current Data Status

From the migration output:
- **39 verified tutors** in the database
- All have verification_status='verified'
- Ready for testing suspend/reinstate actions

## API Endpoints (All Working)

### Statistics
- `GET /api/admin/tutors/statistics` - Dashboard stats
- `GET /api/admin/tutors/recent-activity` - Live widget data

### Tutor Lists
- `GET /api/admin/tutors/pending` - Pending tutors
- `GET /api/admin/tutors/verified` - Verified tutors
- `GET /api/admin/tutors/rejected` - Rejected tutors
- `GET /api/admin/tutors/suspended` - Suspended tutors

### Actions
- `POST /api/admin/tutor/{id}/verify` - Approve tutor
- `POST /api/admin/tutor/{id}/reject` - Reject with reason
- `POST /api/admin/tutor/{id}/suspend` - Suspend with reason
- `POST /api/admin/tutor/{id}/reinstate` - Reinstate suspended
- `POST /api/admin/tutor/{id}/reconsider` - Reconsider rejected

## Quick Actions to Try

1. **Suspend a Tutor**
   - Go to Verified panel
   - Click suspend button (ban icon)
   - Enter suspension reason
   - Tutor moves to Suspended panel

2. **Reinstate a Tutor**
   - Go to Suspended panel
   - Click Reinstate button
   - Tutor moves back to Verified

3. **Reconsider Application**
   - Go to Rejected panel
   - Click Reconsider button
   - Application moves back to Pending

## Verification
All data comes from `tutor_profiles` table with proper `verification_status` values:
- 'not_verified' - Users who haven't applied
- 'pending' - Awaiting review
- 'verified' - Approved tutors
- 'rejected' - Rejected applications
- 'suspended' - Suspended tutors

## Troubleshooting

### If no data shows:
1. Check backend console for errors
2. Verify you're logged in as admin
3. Check browser console (F12) for API errors

### If actions don't work:
1. Ensure you have admin role
2. Check notification messages
3. Verify backend is running

## Success!
The manage-tutors page now fully operates on the `tutor_profiles` table using `verification_status` field! 🎉