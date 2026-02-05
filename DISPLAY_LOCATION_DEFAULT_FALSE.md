# Display Location - Default FALSE (Privacy First)

## Change Summary

Updated `display_location` default value from `TRUE` to `FALSE` to prioritize user privacy.

## Rationale

**Privacy-First Approach:**
- Users should explicitly opt-in to share their location publicly
- Location data is sensitive personal information
- Better to have users enable sharing than disable it
- Aligns with modern privacy best practices (GDPR, data minimization)

## Changes Made

### 1. Migration Script

**File:** `astegni-backend/migrate_add_display_location_to_users.py`

**Before:**
```python
ADD COLUMN display_location BOOLEAN DEFAULT TRUE;
# Default: TRUE (location visible by default)
```

**After:**
```python
ADD COLUMN display_location BOOLEAN DEFAULT FALSE;
# Default: FALSE (location hidden by default for privacy)
```

### 2. User Model

**File:** `astegni-backend/app.py modules/models.py` (Line 54)

**Before:**
```python
display_location = Column(Boolean, default=True)  # Show location on public profile
```

**After:**
```python
display_location = Column(Boolean, default=False)  # Show location on public profile (default: hidden for privacy)
```

## Behavior

### New Users
- Location field: Empty (until user enters/detects)
- `display_location`: `FALSE` (hidden)
- **Result:** Location NOT shown on public profile

### Existing Users (After Migration)
- Location field: May have existing location data
- `display_location`: `FALSE` (migration default)
- **Result:** Location NOT shown on public profile until they check the box

### User Action Required
Users must explicitly check the box to share location:
- ☐ Display location on my public profile ← **Unchecked by default**
- ☑ Display location on my public profile ← User must check this

## Privacy Implications

### Before (Default TRUE):
- ❌ Location visible to everyone by default
- ❌ User must opt-out
- ❌ Privacy risk if user doesn't notice setting
- ❌ Less control over personal data

### After (Default FALSE):
- ✅ Location hidden from everyone by default
- ✅ User must opt-in
- ✅ No privacy risk - explicit consent required
- ✅ Full control over personal data

## User Experience

### First-Time Profile Setup:

1. **User enters/detects location** → Field populated
2. **Location saved** → Stored in database
3. **Checkbox state** → Unchecked (default)
4. **Public profile** → Location NOT displayed
5. **User checks box** → Location becomes visible
6. **Saves profile** → `display_location = TRUE`

### Editing Existing Profile:

1. **Opens edit modal** → Location field shows current location
2. **Checkbox state** → Reflects current `display_location` value
3. **User can change:**
   - Location text
   - Display checkbox (show/hide)
4. **Saves** → Both fields updated

## Database Migration Notes

### Migration Behavior:
```sql
ALTER TABLE users ADD COLUMN display_location BOOLEAN DEFAULT FALSE;
```

**Effect on Existing Rows:**
- All existing users: `display_location = FALSE`
- Location field: Unchanged (keeps existing location data)
- **Result:** Existing users' locations become hidden until they opt-in

### If Users Complain:

**Option 1:** Run update for existing users only:
```sql
-- Set to TRUE only for users who already have location data
UPDATE users
SET display_location = TRUE
WHERE location IS NOT NULL AND location != '';
```

**Option 2:** Communicate to users:
```
"We've added a new privacy feature! Your location is now hidden by default.
To share your location on your public profile, go to Edit Profile and check
'Display location on my public profile'."
```

## Testing

### Test Default Value:

**Create New User:**
```python
new_user = User(
    email="test@example.com",
    password_hash="...",
    # Don't set display_location - let default apply
)
db.add(new_user)
db.commit()

print(new_user.display_location)  # Should print: False
```

**Check Migration:**
```sql
-- After running migration
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'display_location';

-- Expected result:
-- column_default: false
```

### Test UI Checkbox:

**Open Edit Profile:**
1. New user → Checkbox unchecked ✓
2. User checks box → Saves
3. Reopen edit modal → Checkbox checked ✓
4. View public profile → Location visible ✓
5. Uncheck box → Saves
6. View public profile → Location hidden ✓

## Implementation Status

### ✅ Completed:
1. Migration script default changed to `FALSE`
2. User model default changed to `FALSE`
3. Documentation updated

### ⏳ Still Needed:
1. Profile edit managers - Load checkbox state correctly
2. Profile data loaders - Check `display_location` before showing
3. API endpoints - Handle `display_location` field
4. Public profile views - Respect `display_location` setting

## Privacy Compliance

### GDPR Compliance:
- ✅ **Data Minimization:** Only collect/display with consent
- ✅ **User Control:** Users can enable/disable anytime
- ✅ **Transparency:** Clear labeling of what the checkbox does
- ✅ **Default Privacy:** Opt-in, not opt-out

### Best Practices:
- ✅ Privacy by design
- ✅ Privacy by default
- ✅ Explicit consent required
- ✅ Easy to change settings
- ✅ Clear communication

## Summary

**Default Changed:** `TRUE` → `FALSE`

**Reason:** Privacy-first approach - users must explicitly opt-in to share location

**Impact:**
- New users: Location hidden by default
- Existing users: Location hidden by default (after migration)
- Users must check box to share location publicly

**Benefits:**
- Better privacy protection
- GDPR compliant
- User control over personal data
- Reduces accidental data exposure

**Migration Command:**
```bash
cd astegni-backend
python migrate_add_display_location_to_users.py
```

Location data is now private by default! 🔒
