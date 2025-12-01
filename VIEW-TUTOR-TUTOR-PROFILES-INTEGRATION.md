# View-Tutor.html Integration with tutor_profiles Table

## Overview
Updated `view-tutor.html` and related JavaScript files to properly integrate with the new `tutor_profiles` table structure. This document outlines all changes made to ensure the frontend correctly displays data from the updated database schema.

---

## Database Schema Changes

### New/Updated Fields in tutor_profiles Table

| Field | Type | Description | Status |
|-------|------|-------------|--------|
| `hero_titles` | JSONB | Array of hero titles (e.g., `["Title 1", "Title 2"]`) | ✅ Updated |
| `expertise_badge` | VARCHAR(50) | Badge level: "Tutor", "Senior Tutor", "Expert Tutor", "Master Tutor" | ✅ Added |
| `verification_status` | VARCHAR | Status: "pending", "verified", "rejected" | ✅ Added |
| `is_verified` | BOOLEAN | Quick verification check | ✅ Added |
| `is_suspended` | BOOLEAN | Suspension status | ✅ Added |
| `suspension_reason` | TEXT | Reason for suspension | ✅ Added |
| `verified_at` | TIMESTAMP | Verification timestamp | ✅ Added |
| `rejected_at` | TIMESTAMP | Rejection timestamp | ✅ Added |
| `suspended_at` | TIMESTAMP | Suspension timestamp | ✅ Added |

---

## Files Updated

### 1. Backend: `view_tutor_endpoints.py` ✅

**Location:** `astegni-backend/view_tutor_endpoints.py`

**Changes:**
- Updated SQL query to select `hero_titles` (JSONB array) instead of `hero_title` (singular)
- Added `expertise_badge`, `is_suspended`, `suspension_reason` to SELECT statement
- Updated profile dictionary to include new fields with proper index mapping

**Updated Query (Lines 46-67):**
```python
cur.execute(f"""
    SELECT
        tp.id, tp.user_id, tp.username, tp.bio, tp.quote,
        tp.courses, tp.grades, tp.course_type, tp.location, tp.teaches_at,
        tp."sessionFormat", tp.languages, tp.experience, tp.education_level,
        tp.price, tp.currency, tp.availability,
        tp.hero_titles, tp.hero_subtitle, tp.students_taught, tp.courses_created,
        tp.rating, tp.rating_count, tp.rating_breakdown,
        tp.total_students, tp.total_sessions, tp.success_rate,
        tp.response_time_hours, tp.total_connections,
        tp.is_verified, tp.verification_status, tp.profile_picture, tp.cover_image,
        tp.intro_video_url, tp.social_links,
        u.first_name, u.father_name, u.grandfather_name, u.email, u.phone, u.gender,
        tp.retention_score, tp.discipline_score, tp.punctuality_score,
        tp.subject_matter_score, tp.communication_score,
        tp.current_students, tp.monthly_earnings, tp.total_hours_taught,
        tp.sessions_this_week, tp.hours_this_week, tp.attendance_rate,
        tp.expertise_badge, tp.is_suspended, tp.suspension_reason
    FROM tutor_profiles tp
    JOIN users u ON tp.user_id = u.id
    WHERE {where_clause}
""", (tutor_id,))
```

**Updated Profile Dictionary (Lines 80-137):**
```python
profile = {
    # ... existing fields ...
    "hero_titles": row[17] or ["Excellence in Education, Delivered with Passion"],  # JSONB array
    "hero_subtitle": row[18],
    # ... existing fields ...
    "expertise_badge": row[52],      # NEW
    "is_suspended": row[53],         # NEW
    "suspension_reason": row[54]     # NEW
}
```

---

### 2. Frontend: `view-tutor-db-loader.js` ✅

**Location:** `js/view-tutor/view-tutor-db-loader.js`

#### Change 1: Hero Section (Lines 237-256)

**Before:**
```javascript
populateHeroSection() {
    const profile = this.data.profile;
    if (!profile) return;

    const heroTitleEl = document.querySelector('.hero-title');
    const heroSubtitleEl = document.querySelector('.hero-subtitle');

    if (heroTitleEl && profile.hero_title) {
        heroTitleEl.textContent = profile.hero_title;
    }
    if (heroSubtitleEl && profile.hero_subtitle) {
        heroSubtitleEl.textContent = profile.hero_subtitle;
    }
}
```

**After:**
```javascript
populateHeroSection() {
    const profile = this.data.profile;
    if (!profile) return;

    const heroTitleEl = document.querySelector('.hero-title #typedText');
    const heroSubtitleEl = document.getElementById('hero-subtitle');

    // hero_titles is now a JSONB array - use first title or default
    if (heroTitleEl) {
        if (profile.hero_titles && Array.isArray(profile.hero_titles) && profile.hero_titles.length > 0) {
            heroTitleEl.textContent = profile.hero_titles[0];
        } else {
            heroTitleEl.textContent = 'Excellence in Education, Delivered with Passion';
        }
    }

    if (heroSubtitleEl && profile.hero_subtitle) {
        heroSubtitleEl.textContent = profile.hero_subtitle;
    }
}
```

**Key Changes:**
- Changed from `hero_title` (string) to `hero_titles` (array)
- Uses first element of array: `profile.hero_titles[0]`
- Fallback to default title if array is empty/null
- Fixed selector to target `#typedText` element inside `.hero-title`

---

#### Change 2: Badges Section (Lines 278-337)

**Before:**
```javascript
// Verified badge - always show
if (profile.is_verified || profile.verification_status === 'verified') {
    badgesHTML += `<span>✔ Verified Tutor</span>`;
} else {
    badgesHTML += `<span>✗ Not Verified</span>`;
}

// Elite/Expert badge
if (profile.rating >= 4.5) {
    badgesHTML += `<span>🏆 Elite Tutor</span>`;
} else {
    badgesHTML += `<span>No Elite Badge Yet</span>`;
}
```

**After:**
```javascript
// Verified badge - check verification_status and is_verified from tutor_profiles
if (profile.is_verified || profile.verification_status === 'verified') {
    badgesHTML += `<span class="verified">✔ Verified Tutor</span>`;
} else if (profile.verification_status === 'pending') {
    badgesHTML += `<span class="pending">⏳ Verification Pending</span>`;
} else if (profile.verification_status === 'rejected') {
    badgesHTML += `<span class="rejected">✗ Verification Rejected</span>`;
} else {
    badgesHTML += `<span class="not-verified">✗ Not Verified</span>`;
}

// Expertise badge from tutor_profiles.expertise_badge
if (profile.expertise_badge) {
    const expertiseBadgeMap = {
        'Master Tutor': { emoji: '👑', color: '#9333ea', bg: 'rgba(147, 51, 234, 0.1)' },
        'Expert Tutor': { emoji: '🏆', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        'Senior Tutor': { emoji: '⭐', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        'Tutor': { emoji: '📚', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
    };

    const badgeInfo = expertiseBadgeMap[profile.expertise_badge] || expertiseBadgeMap['Tutor'];
    badgesHTML += `<span>${badgeInfo.emoji} ${profile.expertise_badge}</span>`;
}

// Suspension badge - show if tutor is suspended
if (profile.is_suspended) {
    badgesHTML += `<span class="suspended">🚫 Suspended</span>`;
}
```

**Key Changes:**
- Added support for `verification_status` with 4 states: verified, pending, rejected, unverified
- Added `expertise_badge` display with 4 tiers:
  - 👑 Master Tutor (purple)
  - 🏆 Expert Tutor (gold)
  - ⭐ Senior Tutor (blue)
  - 📚 Tutor (green)
- Added suspension badge display when `is_suspended = true`
- Removed rating-based "Elite Tutor" badge (replaced by expertise_badge)

---

## Badge System Comparison

### Old System (Rating-Based)
```
✔ Verified / ✗ Not Verified
🏆 Elite Tutor (if rating >= 4.5) / No Elite Badge Yet
```

### New System (Database-Driven)
```
Verification: ✔ Verified / ⏳ Pending / ✗ Rejected / ✗ Not Verified
Expertise: 👑 Master / 🏆 Expert / ⭐ Senior / 📚 Tutor
Suspension: 🚫 Suspended (if applicable)
```

---

## Data Flow

```
Database (tutor_profiles table)
    ↓
Backend API (view_tutor_endpoints.py)
    → GET /api/view-tutor/{tutor_id}
    ↓
Frontend JavaScript (view-tutor-db-loader.js)
    → ViewTutorDBLoader.loadMainProfile()
    → ViewTutorDBLoader.populateHeroSection()
    → ViewTutorDBLoader.populateProfileHeader()
    ↓
HTML DOM (view-tutor.html)
    → Hero section displays hero_titles[0]
    → Badges row displays verification + expertise + suspension badges
```

---

## Testing Checklist

### Backend Testing
- [ ] Verify `/api/view-tutor/{tutor_id}` returns `hero_titles` as array
- [ ] Verify `expertise_badge` field is included in response
- [ ] Verify `is_suspended` and `suspension_reason` are included
- [ ] Test with tutor IDs that have different verification statuses
- [ ] Test with tutors having different expertise badges

**Test Command:**
```bash
curl http://localhost:8000/api/view-tutor/1 | jq '.profile | {hero_titles, expertise_badge, verification_status, is_suspended}'
```

### Frontend Testing
- [ ] Open `http://localhost:8080/view-profiles/view-tutor.html?id=1`
- [ ] Check hero section displays first title from hero_titles array
- [ ] Verify badges display correctly:
  - Verification badge shows correct status
  - Expertise badge displays with correct emoji and color
  - Suspension badge appears only if is_suspended = true
- [ ] Test with different tutor profiles (verified, pending, rejected, suspended)

---

## Migration Notes

### If hero_titles is NULL in Database
The backend will use default fallback:
```python
"hero_titles": row[17] or ["Excellence in Education, Delivered with Passion"]
```

### If expertise_badge is NULL in Database
No expertise badge will be displayed (graceful degradation).

### Backward Compatibility
- Old `hero_title` field (if still exists) is **NOT** used
- System now exclusively uses `hero_titles` (JSONB array)
- Frontend handles both empty arrays and null values

---

## API Response Example

**Endpoint:** `GET /api/view-tutor/1`

```json
{
  "profile": {
    "id": 1,
    "user_id": 85,
    "username": "abebe_math",
    "full_name": "Abebe Kebede Tesfaye",
    "hero_titles": [
      "Master Mathematics Educator",
      "15 Years of Teaching Excellence"
    ],
    "hero_subtitle": "Empowering students through personalized learning",
    "verification_status": "verified",
    "is_verified": true,
    "expertise_badge": "Expert Tutor",
    "is_suspended": false,
    "suspension_reason": null,
    "rating": 4.8,
    "rating_count": 127,
    "courses": ["Mathematics", "Physics"],
    "grades": ["Grade 10", "Grade 11", "Grade 12"],
    "location": "Addis Ababa",
    "session_format": "both"
  },
  "stats": {
    "active_students": 23,
    "total_sessions_count": 456,
    "completion_rate": 98
  }
}
```

---

## Summary of Integration

### ✅ Completed
1. Updated backend endpoint to query `hero_titles` (JSONB array)
2. Added `expertise_badge`, `is_suspended`, `suspension_reason` to backend response
3. Updated frontend JavaScript to handle array-based hero titles
4. Implemented comprehensive badge system (verification + expertise + suspension)
5. Added proper fallbacks for null/empty data

### 🎯 Key Improvements
- **Hero Titles:** Supports multiple rotating titles (future enhancement: typing animation through array)
- **Expertise System:** Database-driven badges replace hardcoded rating thresholds
- **Verification States:** 4-state system (verified, pending, rejected, unverified)
- **Suspension Display:** Clear visual indicator for suspended tutors
- **Data Integrity:** All data now sourced from tutor_profiles table

### 📋 No Changes Required
- HTML structure in `view-tutor.html` remains unchanged
- CSS styling unchanged (badges styled inline)
- Other JavaScript files unchanged

---

## Future Enhancements

1. **Hero Titles Animation:**
   - Implement typing animation cycling through `hero_titles` array
   - Example: Rotate every 5 seconds through all titles

2. **Badge Tooltips:**
   - Add hover tooltips explaining each expertise level
   - Show verification date/rejection reason on hover

3. **Suspension Notice:**
   - Display suspension reason in modal when clicking suspended badge
   - Show suspension date and duration

---

## Rollback Plan

If issues occur, revert these commits:
1. `view_tutor_endpoints.py` changes (backend)
2. `view-tutor-db-loader.js` changes (frontend)

**Quick Rollback:**
```bash
git checkout HEAD~1 -- astegni-backend/view_tutor_endpoints.py
git checkout HEAD~1 -- js/view-tutor/view-tutor-db-loader.js
```

---

## Contact

For questions about this integration:
- Check `tutor_profiles` table schema: `\d tutor_profiles` in PostgreSQL
- Review backend logs for API response structure
- Test with different tutor IDs to verify all badge combinations

**Last Updated:** 2025-11-21
**Status:** ✅ Integration Complete
