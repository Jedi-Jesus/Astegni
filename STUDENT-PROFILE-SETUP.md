# Student Profile Setup - CORRECT Structure

## ✅ CORRECT Database Structure

### Users Table (Identity Only)
```
- first_name, father_name, grandfather_name
- username, email, phone
- NO gender, NO profile_picture, NO cover_image
```

### Student_Profiles Table (All Student Data)
```
- gender, profile_picture, cover_image
- bio, quote, location
- grade_level, subjects, preferred_languages
- rating, rating_count, gpa, attendance_rate
- total_connections
```

### Tutor_Profiles Table (All Tutor Data)
```
- gender, profile_picture, cover_image
- bio, quote, location
- (tutor-specific fields...)
```

## Why Separate?

Each role has its own:
- **gender** - Can be different per role
- **profile_picture** - Different pic for student vs tutor role
- **cover_image** - Different cover for student vs tutor role

Example: User "Abebe" is both student and tutor with different pictures for each.

## Setup Steps

### 1. Run Migration
```bash
cd astegni-backend
python migrate_student_enhancements.py
```

Adds to `student_profiles`:
- gender, profile_picture, cover_image
- bio, quote, location, preferred_languages
- rating, rating_count, gpa, attendance_rate, total_connections

### 2. Restart Backend
```bash
python app.py
```

### 3. Test
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:8080/profile-pages/student-profile.html

## API Endpoints

**GET /api/student/profile** - Get own profile
**PUT /api/student/profile** - Update profile
**GET /api/student/{id}** - Get public profile

Data comes from:
- `users`: username, first_name, father_name, grandfather_name, email, phone
- `student_profiles`: gender, profile_picture, cover_image, bio, subjects, etc.

## Image Uploads

Upload endpoints update `student_profiles` table:
- POST /api/upload/profile-picture → student_profiles.profile_picture
- POST /api/upload/cover-photo → student_profiles.cover_image

## Done! ✨

Run the migration and restart the server. Everything is now correct!
