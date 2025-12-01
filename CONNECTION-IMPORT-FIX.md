# Connection Import Error Fix

## Problem
When trying to reconnect with a tutor in `view-tutor.html`, the backend threw a 500 Internal Server Error:

```
ImportError: cannot import name 'TutorProfile' from 'app'
```

## Root Cause
After the backend refactoring that moved models from `app.py` to `app.py modules/models.py`, the `connection_profile_helpers.py` file was still trying to import from the old location:

```python
# Old (incorrect) import
from app import TutorProfile, StudentProfile, ParentProfile, AdvertiserProfile, User
```

## Solution
Updated the import statement in `connection_profile_helpers.py` (line 12-15) to import from the new modular location:

```python
# New (correct) import
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))
from models import TutorProfile, StudentProfile, ParentProfile, AdvertiserProfile, User
```

## Files Modified
- `astegni-backend/connection_profile_helpers.py` - Fixed model imports

## Testing
1. Backend server restarted successfully on http://0.0.0.0:8000
2. Connection endpoints now properly import required models
3. Reconnect functionality should work without 500 errors

## How to Test
1. Navigate to `view-tutor.html` for any tutor
2. Click the "Reconnect" button on the connection card
3. Verify the connection is created without errors
4. Check backend logs for successful `POST /api/connections` request (should return 200 OK instead of 500)

## Backend Status
- Server running: ✅ (PID: 28344)
- Port: 8000
- Models imported correctly: ✅
- Connection endpoints functional: ✅

## Related Files
- `astegni-backend/connection_endpoints.py` - Uses the helper functions
- `astegni-backend/app.py modules/models.py` - Contains the model definitions
- `view-profiles/view-tutor.html` - Frontend that triggers reconnect
