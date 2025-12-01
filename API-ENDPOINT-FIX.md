# API Endpoint Fix - StudentProfile Field Names

## 🐛 The Error

```
AttributeError: 'StudentProfile' object has no attribute 'bio'
```

**Endpoint:** `GET /api/student/{student_id}`
**File:** [astegni-backend/app.py modules/routes.py:3691](astegni-backend/app.py modules/routes.py#L3691)

---

## 🔍 Root Cause

The `StudentProfile` model was refactored with new field names, but the API endpoint was using the **old field names**.

### **Old vs New Field Names:**

| Old Name | New Name | Type |
|----------|----------|------|
| `bio` | `about` | Text |
| `subjects` | `interested_in` | Array |
| `preferred_languages` | `languages` | Array |
| `interests` | `hobbies` | Array |
| ❌ (didn't exist) | `studying_at` | String |
| ❌ (didn't exist) | `career_aspirations` | Text |
| ❌ (didn't exist) | `learning_method` | Array |
| ❌ (didn't exist) | `hero_title` | Array |
| ❌ (didn't exist) | `hero_subtitle` | Array |

---

## ✅ The Fix

**File:** [astegni-backend/app.py modules/routes.py:3712-3737](astegni-backend/app.py modules/routes.py#L3712-L3737)

### **Before (Old Field Names):**

```python
return {
    "id": student.id,
    "username": student.username,
    "first_name": user.first_name if user else None,
    "father_name": user.father_name if user else None,
    "grandfather_name": user.grandfather_name if user else None,
    "email": user.email if user else None,
    "phone": user.phone if user else None,
    "gender": user.gender if user else None,
    "profile_picture": student.profile_picture,
    "cover_image": student.cover_image,
    "bio": student.bio,  # ❌ ERROR: StudentProfile has no 'bio'
    "quote": student.quote,
    "location": student.location,
    "grade_level": student.grade_level,
    "subjects": student.subjects,  # ❌ ERROR: Should be 'interested_in'
    "preferred_languages": student.preferred_languages,  # ❌ ERROR: Should be 'languages'
    "rating": float(student.rating),  # ❌ ERROR: StudentProfile has no 'rating'
    "rating_count": student.rating_count  # ❌ ERROR: StudentProfile has no 'rating_count'
}
```

### **After (Correct Field Names):**

```python
return {
    "id": student.id,
    "user_id": student.user_id,  # ✅ Added
    "username": student.username,
    "first_name": user.first_name if user else None,
    "father_name": user.father_name if user else None,
    "grandfather_name": user.grandfather_name if user else None,
    "email": user.email if user else None,
    "phone": user.phone if user else None,
    "gender": user.gender if user else None,
    "profile_picture": student.profile_picture,
    "cover_image": student.cover_image,
    "about": student.about,  # ✅ Fixed: was 'bio'
    "quote": student.quote if student.quote else [],  # ✅ Fixed: now array
    "location": student.location,
    "grade_level": student.grade_level,
    "studying_at": student.studying_at,  # ✅ Added
    "career_aspirations": student.career_aspirations,  # ✅ Added
    "interested_in": student.interested_in if student.interested_in else [],  # ✅ Fixed: was 'subjects'
    "hobbies": student.hobbies if student.hobbies else [],  # ✅ Added
    "languages": student.languages if student.languages else [],  # ✅ Fixed: was 'preferred_languages'
    "learning_method": student.learning_method if student.learning_method else [],  # ✅ Added
    "hero_title": student.hero_title if student.hero_title else [],  # ✅ Added
    "hero_subtitle": student.hero_subtitle if student.hero_subtitle else [],  # ✅ Added
    "joined": user.created_at.strftime("%B %Y") if user and user.created_at else None  # ✅ Added
}
```

---

## 📋 StudentProfile Model Reference

**File:** [astegni-backend/app.py modules/models.py:160-201](astegni-backend/app.py modules/models.py#L160-L201)

```python
class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Basic Info
    username = Column(String, unique=True, index=True)
    location = Column(String)

    # Hero Section (NEW)
    hero_title = Column(ARRAY(String), default=[])
    hero_subtitle = Column(ARRAY(String), default=[])

    # Media
    profile_picture = Column(String)
    cover_image = Column(String)

    # Academic Info
    grade_level = Column(String)
    studying_at = Column(String)  # ✅ Renamed from 'school_name'
    career_aspirations = Column(Text)

    # Subjects & Interests (restructured as arrays)
    interested_in = Column(ARRAY(String), default=[])  # ✅ Renamed from 'subjects'
    hobbies = Column(ARRAY(String), default=[])  # ✅ Renamed from 'interests'
    languages = Column(ARRAY(String), default=[])  # ✅ Renamed from 'preferred_languages'

    # Learning Preferences
    learning_method = Column(ARRAY(String), default=[])

    # Personal Info
    quote = Column(ARRAY(String), default=[])  # ✅ Now array
    about = Column(Text)  # ✅ Renamed from 'bio'

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="student_profile")
```

---

## 🎯 Changes Summary

### **Fields Fixed:**
1. ✅ `bio` → `about`
2. ✅ `subjects` → `interested_in`
3. ✅ `preferred_languages` → `languages`
4. ✅ `quote` → Now returns array instead of string

### **Fields Added:**
5. ✅ `user_id` - Added to response
6. ✅ `studying_at` - School/institution name
7. ✅ `career_aspirations` - Future career goals
8. ✅ `hobbies` - Personal interests
9. ✅ `learning_method` - Preferred learning style(s)
10. ✅ `hero_title` - Hero section titles (array)
11. ✅ `hero_subtitle` - Hero section subtitles (array)
12. ✅ `joined` - Account creation date formatted

### **Fields Removed:**
13. ❌ `rating` - StudentProfile doesn't have rating
14. ❌ `rating_count` - StudentProfile doesn't have rating_count

---

## 🧪 Testing

**Test the endpoint:**

```bash
curl http://localhost:8000/api/student/22
```

**Expected Response:**
```json
{
  "id": 22,
  "user_id": 115,
  "username": "student_username",
  "first_name": "John",
  "father_name": "Michael",
  "grandfather_name": "David",
  "email": "john@example.com",
  "phone": "+251912345678",
  "gender": "Male",
  "profile_picture": "/uploads/...",
  "cover_image": "/uploads/...",
  "about": "I'm a passionate learner...",
  "quote": ["Never stop learning", "Stay curious"],
  "location": "Addis Ababa",
  "grade_level": "Grade 10",
  "studying_at": "Addis Ababa High School",
  "career_aspirations": "Become a software engineer",
  "interested_in": ["Mathematics", "Physics", "Computer Science"],
  "hobbies": ["Reading", "Coding", "Sports"],
  "languages": ["English", "Amharic", "Oromo"],
  "learning_method": ["Visual", "Hands-on"],
  "hero_title": ["Excellence in Learning"],
  "hero_subtitle": ["Passionate about mathematics and science"],
  "joined": "January 2024"
}
```

---

## ✅ Status

**Backend:**
- Port: 8000
- Status: ✅ Running with fixed endpoint
- Endpoint: ✅ `/api/student/{student_id}` now works

**Frontend:**
- Port: 8081
- URL: http://localhost:8081/view-profiles/view-student.html?id=22
- Status: ✅ Should now load student data successfully

**The view-student.html page should now work!** 🎉
