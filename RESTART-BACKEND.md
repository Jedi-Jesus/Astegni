# Restart Backend Server

## Quick Restart

### Option 1: Simple Restart
```bash
cd astegni-backend
python app.py
```

### Option 2: With Auto-Reload (Recommended for Development)
```bash
cd astegni-backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## What Changed
- Added `/api/admin/tutor/{id}/reconsider` endpoint
- Enhanced `/api/admin/tutor/{id}/reinstate` endpoint

## After Restart
Your backend will now support:
- ✅ Reconsidering rejected tutors (moves them back to pending)
- ✅ Reinstating suspended tutors (moves them back to verified)

## Verify Server is Running
Open browser and go to:
```
http://localhost:8000/docs
```

You should see both new endpoints listed:
- `POST /api/admin/tutor/{tutor_id}/reconsider`
- `POST /api/admin/tutor/{tutor_id}/reinstate`

## Test the Frontend
1. Navigate to Rejected Tutors panel
2. Click "View" on any rejected tutor
3. You should see "Reconsider" button
4. Click it and confirm
5. Tutor should disappear from rejected list

Same for suspended tutors with "Reinstate" button!
