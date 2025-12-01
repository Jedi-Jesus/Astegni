# Manage Tutor Documents - Quick Start Guide

## Quick Testing Steps

### 1. Start Backend Server
```bash
cd astegni-backend
python app.py
```
Server runs on: `http://localhost:8000`

### 2. Start Frontend Server
```bash
# From project root
python -m http.server 8080
```
Frontend runs on: `http://localhost:8080`

### 3. Access the Page
Navigate to: `http://localhost:8080/admin-pages/manage-tutor-documents.html`

## What to Expect

### ✅ Profile Header Loads Automatically
- Admin name from database
- Profile picture and cover image
- Rating and reviews count
- Department badges
- Position and joined date

### ✅ Access Control
**Allowed:**
- `manage-tutors` department admins
- `manage-system-settings` department admins

**Denied (403):**
- All other departments

### ✅ Edit Profile Works
1. Click "Edit Profile" button
2. Form populates with current data
3. Edit any personal fields
4. Submit → UI updates immediately

## API Endpoints Used

### Load Profile
```
GET /api/admin/manage-tutors-profile/by-email/{email}
```
**Headers:**
```
Authorization: Bearer {token}
```

### Update Profile
```
PUT /api/admin/profile/{admin_id}
```
**Body:**
```json
{
  "first_name": "New Name",
  "bio": "Updated bio",
  "quote": "New quote"
}
```

## Required localStorage Items

```javascript
localStorage.setItem('adminEmail', 'admin@astegni.et');
localStorage.setItem('token', 'your_jwt_token');
```

Auto-stored after successful API call:
```javascript
localStorage.setItem('adminId', '1');
```

## Browser Console Messages

### Success:
```
Profile header updated successfully
```

### Access Denied:
```
Access denied. Only manage-tutors and manage-system-settings departments can access this page.
```
→ Redirects to homepage

### API Failure:
```
Error loading manage-tutor-documents profile: [error]
Loading fallback profile data
```
→ Shows sample data instead

## File Structure

```
astegni-backend/
  ├── admin_profile_endpoints.py         ← NEW ENDPOINTS ADDED
  └── app.py                             ← Imports router

admin-pages/
  └── manage-tutor-documents.html        ← UPDATED (script added)

js/admin-pages/
  └── manage-tutor-documents-profile.js  ← NEW FILE
```

## Database Tables

### admin_profile
```sql
SELECT id, username, first_name, father_name, grandfather_name,
       email, phone_number, bio, quote, profile_picture,
       cover_picture, departments, last_login, created_at
FROM admin_profile
WHERE email = 'admin@astegni.et';
```

### manage_tutors_profile
```sql
SELECT position, rating, total_reviews, badges,
       tutors_verified, tutors_rejected, tutors_suspended,
       total_applications_processed, verification_rate,
       permissions, joined_date, created_at
FROM manage_tutors_profile
WHERE admin_id = 1;
```

## Common Issues & Solutions

### ❌ Profile not loading
**Check:**
1. Backend server running? (`http://localhost:8000`)
2. Token in localStorage? (Open DevTools → Application → Local Storage)
3. adminEmail in localStorage?
4. Network tab shows 200 response?

**Fix:**
- Restart backend server
- Re-login to get fresh token
- Check browser console for errors

### ❌ 403 Access Denied
**Reason:** Admin doesn't have `manage-tutors` or `manage-system-settings` department

**Fix:**
- Update admin departments in database:
```sql
UPDATE admin_profile
SET departments = '["manage-tutors"]'
WHERE email = 'admin@astegni.et';
```

### ❌ Edit Profile not working
**Check:**
1. adminId in localStorage?
2. Token valid?
3. Form fields populated?

**Fix:**
- Reload page to fetch profile again
- Check Network tab for PUT request status

### ❌ Images not uploading
**Note:** Upload endpoints may need to be implemented in backend

**Endpoints needed:**
- `POST /api/admin/upload/profile-picture/{admin_id}`
- `POST /api/admin/upload/cover-image/{admin_id}`

## Testing Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 8080
- [ ] Admin email set in localStorage
- [ ] Valid token in localStorage
- [ ] Admin has correct department access
- [ ] Page loads without console errors
- [ ] Profile header shows correct data
- [ ] Edit Profile modal opens and populates
- [ ] Profile update submits successfully
- [ ] UI updates after profile edit
- [ ] Access denied for unauthorized departments

## Next Steps

After confirming profile header works:
1. Test tutor document verification features
2. Test panel switching (Dashboard, Requested, Verified, etc.)
3. Test search and filter functionality
4. Test tutor review modal

## Support

For issues or questions:
- Check browser console for errors
- Check Network tab for API responses
- Review backend logs: `astegni-backend/server.log`
- See full documentation: `MANAGE-TUTOR-DOCUMENTS-DATABASE-INTEGRATION.md`
