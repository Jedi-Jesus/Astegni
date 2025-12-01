# Tutor Profile - Quick Start Guide

## 🚀 Start Servers

### Backend
```bash
cd astegni-backend
uvicorn app:app --reload
```

### Frontend
```bash
# From project root
python -m http.server 8080
```

## 🌐 Access Tutor Profile

### View Specific Tutor
```
http://localhost:8080/profile-pages/tutor-profile.html?tutor_id=64
```

### View Your Own Profile (logged in)
```
http://localhost:8080/profile-pages/tutor-profile.html
```

## ✅ What's Working

### ✓ Data Loading from Database
- Hero section (title, subtitle, stats)
- Profile details (bio, quote, subjects, experience)
- Rating metrics (5 detailed scores)
- Dashboard cards (8 statistics)
- Weekly stats (sessions, hours, attendance)
- Student reviews
- Recent activities
- Today's schedule
- Connection statistics

### ✓ Profile Editing
- Click "Edit Profile" button
- Modify fields
- Click "Save Changes"
- Changes saved to database immediately

### ✓ Image Uploads
- **Profile Picture**: Click upload → Select image → Saves to database
- **Cover Photo**: Click upload → Select image → Saves to database

## 📝 Files Created

| File | Purpose |
|------|---------|
| `js/tutor-profile/api-service.js` | API endpoints (updated) |
| `js/tutor-profile/profile-data-loader.js` | Load & populate all data |
| `js/tutor-profile/profile-edit-handler.js` | Edit profile functionality |
| `js/tutor-profile/image-upload-handler.js` | Image upload functionality |
| `js/tutor-profile/init.js` | Initialize all modules (updated) |

## 🔍 Testing Checklist

- [ ] Backend server running on http://localhost:8000
- [ ] Frontend server running on http://localhost:8080
- [ ] Open tutor-profile.html in browser
- [ ] Check console shows "✅ TUTOR PROFILE INITIALIZATION COMPLETE"
- [ ] Hero section shows tutor data
- [ ] Profile details populated
- [ ] Dashboard cards show statistics
- [ ] Reviews section has student reviews
- [ ] Activity feed shows recent activities
- [ ] Today's schedule displays (if logged in as tutor)
- [ ] Edit Profile works
- [ ] Image uploads work

## 🐛 Troubleshooting

### No Data Loading?
1. Check backend is running: `http://localhost:8000/docs`
2. Check browser console for errors
3. Verify tutor_id exists in database
4. Check Network tab for failed requests

### CORS Errors?
- Backend CORS settings should allow `http://localhost:8080`
- Check `astegni-backend/app.py modules/config.py`

### 401 Unauthorized?
- User needs to be logged in for some features
- Check localStorage has `token` value

### Images Not Uploading?
- Check file size (2MB for profile, 5MB for cover)
- Check file type (JPEG, PNG, GIF, WebP only)
- Verify Backblaze B2 credentials in `.env`

## 📊 Available Data

All data comes from these database tables:
- `tutor_profiles` - Profile info, hero section, stats
- `users` - Basic user info, profile pictures
- `tutor_reviews` - Student reviews with ratings
- `tutor_activities` - Activity timeline
- `tutor_schedules` - Daily schedule entries

## 🔗 API Endpoints Used

| Endpoint | Data Returned |
|----------|---------------|
| `GET /api/tutor/{id}/profile-complete` | Complete profile with all data |
| `GET /api/tutor/{id}/reviews` | Student reviews |
| `GET /api/tutor/{id}/activities` | Recent activities |
| `GET /api/tutor/{id}/schedule` | Schedule entries |
| `GET /api/tutor/schedule/today` | Today's schedule (auth) |
| `PUT /api/tutor/profile/extended` | Update profile |
| `POST /api/upload/profile-picture` | Upload profile pic |
| `POST /api/upload/cover-photo` | Upload cover photo |

## 💡 Quick Tips

### Get Tutor IDs from Database
```bash
cd astegni-backend
python -c "import sys, os; sys.path.append('app.py modules'); from config import DATABASE_URL; from sqlalchemy import create_engine, text; engine = create_engine(DATABASE_URL); conn = engine.connect(); result = conn.execute(text('SELECT id, user_id FROM tutor_profiles LIMIT 10')); print('Tutor IDs:'); [print(f'  ID: {row[0]}, User: {row[1]}') for row in result]"
```

### Check If Data Exists
```bash
# Check if tutor 64 has data
curl http://localhost:8000/api/tutor/64/profile-complete
```

### Force Reload Profile Data
```javascript
// In browser console
await TutorProfileDataLoader.loadCompleteProfile();
```

### Debug Mode
```javascript
// In browser console
window.TutorProfile
// Shows all loaded modules
```

## 📖 Documentation

- **Full Integration Guide**: [TUTOR-PROFILE-FRONTEND-INTEGRATION.md](TUTOR-PROFILE-FRONTEND-INTEGRATION.md)
- **Database Enhancement**: [TUTOR-PROFILE-DATABASE-ENHANCEMENT.md](TUTOR-PROFILE-DATABASE-ENHANCEMENT.md)
- **Migration Guide**: [RUN-TUTOR-MIGRATION.md](RUN-TUTOR-MIGRATION.md)

## 🎉 You're All Set!

The tutor profile is now **fully integrated** with the backend. All data loads from the database, profiles can be edited, and images can be uploaded!
