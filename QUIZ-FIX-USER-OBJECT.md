# Quiz Endpoints Fix - User Object Issue

## Problem

The quiz endpoints were failing with error:
```
Error creating quiz: 'User' object is not subscriptable
```

## Root Cause

The `get_current_user()` function from `utils.py` returns a **SQLAlchemy User object**, not a dictionary.

The endpoints were incorrectly accessing user data as:
```python
tutor_id = current_user['id']  # ❌ Wrong - treats User as dict
```

## Solution

Updated all quiz endpoints to access User object attributes correctly:

```python
# Before (incorrect):
async def create_quiz(quiz_data: QuizCreate, current_user: dict = Depends(get_current_user)):
    tutor_id = current_user['id']  # ❌ Error

# After (correct):
async def create_quiz(quiz_data: QuizCreate, current_user: User = Depends(get_current_user)):
    tutor_id = current_user.id  # ✅ Correct
```

## Changes Made

Updated [astegni-backend/quiz_endpoints.py](c:\Users\zenna\Downloads\Astegni-v-1.1\astegni-backend\quiz_endpoints.py):

1. Added User model import:
   ```python
   from models import User
   ```

2. Fixed all endpoint signatures and user access:
   - `create_quiz()` - Line 74, 77
   - `get_tutor_quizzes()` - Line 136, 139
   - `get_quiz_details()` - Line 176
   - `update_quiz()` - Line 229, 232
   - `delete_quiz()` - Line 319, 322
   - `get_student_quizzes()` - Line 356, 359
   - `submit_quiz()` - Line 396, 399

## Testing

After restarting the backend server, test quiz creation:

1. Go to tutor profile
2. Click "Quiz Maker"
3. Fill in quiz form and click "Save Quiz" or "Post Quiz"
4. Should now save successfully to database

## Status

✅ **Fixed** - All endpoints now correctly access User object attributes
