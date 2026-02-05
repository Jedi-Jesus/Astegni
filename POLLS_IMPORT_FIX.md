# Polls Import Fix

## Issue

Backend failed to start with error:
```
NameError: name 'get_current_user' is not defined
```

**Root Cause**: The polls stub endpoints use `Depends(get_current_user)` but `get_current_user` wasn't imported.

## Fix Applied

Added missing import to [astegni-backend/chat_endpoints.py](astegni-backend/chat_endpoints.py#L27):

```python
from utils import get_current_user
```

## Restart Backend

```bash
Ctrl+C (if still running)

cd astegni-backend
python app.py
```

Backend should now start successfully!

---

**Date**: 2026-02-03
**Fix**: Import get_current_user for polls endpoints
