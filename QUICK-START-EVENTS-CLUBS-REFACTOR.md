# Quick Start: Events & Clubs Refactor

## Run These Commands (In Order)

### 1. Create Database Tables
```bash
cd astegni-backend
python migrate_create_manage_uploads.py
python migrate_add_joined_status_to_events_clubs.py
```

### 2. Seed System Admin & Update Data
```bash
python seed_manage_uploads_admin.py
```

### 3. Restart Backend
```bash
python app.py
```

### 4. Test in Browser
Open: `http://localhost:8080/profile-pages/tutor-profile.html`
- Login as a tutor
- Click Community Modal
- Check Events and Clubs sections

---

## What Changed?

### API Response:
```json
{
  "created_by": 456,      // ✅ User ID (no more created_by_id)
  "is_system": false,     // ✅ NEW: From manage_uploads check
  "joined_status": true   // ✅ NEW: Boolean from events/clubs table
}
```

### Badge Labels:
- **"Your Event/Club"** - You created it
- **"System Event/Club"** - Admin created it
- **"Participating"** - Joined a system event
- **"Enrolled"** - Joined another tutor's event
- **"Member"** - Joined a system club
- **"Joined"** - Joined another tutor's club

---

## Tables Created:

### `manage_uploads`
- Stores system admins who can create events/clubs
- Similar to `manage_tutors_profile` but for uploads

### Modified Tables:
- `events` - Added `joined_status` boolean
- `clubs` - Added `joined_status` boolean

---

## Verification

### Check Tables Exist:
```bash
python -c "
import psycopg, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute(\"SELECT table_name FROM information_schema.tables WHERE table_name IN ('manage_uploads', 'events', 'clubs')\")
print([row[0] for row in cur.fetchall()])
"
```

### Check Seeded Admin:
```bash
python -c "
import psycopg, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('SELECT admin_id, position, events_created, clubs_created FROM manage_uploads')
print(cur.fetchone())
"
```

---

## Files Modified:

### Backend (4 files):
1. `migrate_create_manage_uploads.py` - New
2. `migrate_add_joined_status_to_events_clubs.py` - New
3. `seed_manage_uploads_admin.py` - New
4. `events_clubs_endpoints.py` - Updated GET endpoints

### Frontend (1 file):
5. `js/page-structure/communityManager.js` - Updated 4 functions

---

## Troubleshooting

### Events/Clubs Not Showing?
- Check if manage_uploads has an entry: `SELECT * FROM manage_uploads;`
- Check if events exist: `SELECT id, created_by FROM events;`
- Check backend logs for SQL errors

### Wrong Badge Showing?
- Verify `is_system` value in API response
- Check `joined_status` in database
- Verify current user ID matches `created_by`

### "Other tutors' events showing"?
- Backend should filter automatically
- Check SQL WHERE clause in `events_clubs_endpoints.py`
- Verify tutor_profile exists for current user

---

## Documentation:

📄 **Complete Guide:** `EVENTS-CLUBS-COMPLETE-REFACTOR.md`
📄 **Old Docs (Outdated):**
  - `EVENTS-CLUBS-CREATED-BY-ID-EXPLANATION.md`
  - `COMMUNITY-MODAL-BADGE-FILTERING-UPDATE.md`
  - `BACKEND-API-UPDATED-FOR-EVENTS-CLUBS.md`

---

## Success Criteria:

✅ `manage_uploads` table exists
✅ `events.joined_status` column exists
✅ `clubs.joined_status` column exists
✅ System admin in `manage_uploads`
✅ All events/clubs created by system admin
✅ API returns `is_system` and `joined_status`
✅ Frontend shows correct badges
✅ Other tutors' events hidden (unless joined)

