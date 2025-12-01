# Tutor Verification System - Complete Implementation Guide

## Overview

The Tutor Verification System allows admins to review, approve, or reject tutor registration applications. This comprehensive system includes backend verification fields, API endpoints, and a complete frontend review modal interface.

---

## 🎯 Features

### Admin Review Capabilities
1. **Profile Picture** - View tutor's uploaded profile photo
2. **ID Document** - View and verify uploaded identification document
3. **Personal Information** - Name, email, phone, location
4. **Professional Details** - Teaches at, experience, education level, subjects, languages
5. **Bio** - Review tutor's self-description

### Actions Available
- ✅ **Approve** - Verify and activate the tutor profile
- ❌ **Reject** - Reject application with mandatory reason
- 👁️ **Review** - View all tutor details before making a decision

---

## 🗄️ Database Schema Changes

### New Fields in `tutor_profiles` Table

```sql
-- Verification status tracking
verification_status VARCHAR DEFAULT 'pending'  -- Options: 'pending', 'verified', 'rejected'
rejection_reason TEXT                          -- Reason provided when rejecting
verified_at TIMESTAMP                          -- When the tutor was verified
verified_by INTEGER                            -- Admin user ID who verified
id_document_url VARCHAR                        -- URL to uploaded ID document

-- Existing field (kept for backward compatibility)
is_verified BOOLEAN DEFAULT FALSE              -- True when verification_status = 'verified'
```

### Migration Required

Run the migration script before using the verification system:

```bash
cd astegni-backend
python migrate_tutor_verification.py
```

**What the migration does:**
- Adds all new verification columns to `tutor_profiles` table
- Updates existing verified tutors (where `is_verified = TRUE`) to have `verification_status = 'verified'`
- Safe to run multiple times (uses `IF NOT EXISTS`)

---

## 🔌 Backend API Endpoints

### 1. Get Pending Tutors (Admin Only)

**Endpoint:** `GET /api/admin/tutors/pending`

**Authentication:** Required (Admin role)

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, default: 15, max: 100) - Items per page

**Response:**
```json
{
  "tutors": [
    {
      "id": 5,
      "user_id": 123,
      "name": "Abebe Tadesse",
      "profile_picture": "https://...",
      "id_document_url": "https://...",
      "teaches_at": "Addis Ababa University",
      "location": "Addis Ababa",
      "courses": ["Mathematics", "Physics"],
      "experience": 5,
      "education_level": "Master's Degree",
      "created_at": "2025-01-08T10:30:00",
      "verification_status": "pending"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 15,
  "total_pages": 1
}
```

---

### 2. Get Tutor Review Details (Admin Only)

**Endpoint:** `GET /api/admin/tutor/{tutor_id}/review`

**Authentication:** Required (Admin role)

**Response:**
```json
{
  "id": 5,
  "user_id": 123,
  "name": "Abebe Tadesse Bekele",
  "email": "abebe@example.com",
  "phone": "+251911234567",
  "profile_picture": "https://...",
  "id_document_url": "https://...",
  "teaches_at": "Addis Ababa University",
  "location": "Addis Ababa, Bole",
  "bio": "Experienced mathematics teacher...",
  "courses": ["Mathematics", "Physics"],
  "grades": ["Grade 11-12", "University Level"],
  "languages": ["English", "Amharic"],
  "experience": 5,
  "education_level": "Master's Degree",
  "certifications": ["PhD in Mathematics", "Teaching Certificate"],
  "sessionFormat": "Online",
  "price": 200.0,
  "currency": "ETB",
  "verification_status": "pending",
  "rejection_reason": null,
  "created_at": "2025-01-08T10:30:00"
}
```

---

### 3. Approve/Verify Tutor (Admin Only)

**Endpoint:** `POST /api/admin/tutor/{tutor_id}/verify`

**Authentication:** Required (Admin role)

**Response:**
```json
{
  "success": true,
  "message": "Tutor verified successfully",
  "tutor_id": 5,
  "verification_status": "verified"
}
```

**What happens on approval:**
- `is_verified` → `true`
- `verification_status` → `"verified"`
- `verified_at` → Current timestamp
- `verified_by` → Admin's user ID
- `rejection_reason` → Cleared (set to `null`)

---

### 4. Reject Tutor (Admin Only)

**Endpoint:** `POST /api/admin/tutor/{tutor_id}/reject`

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "reason": "Incomplete documentation - ID document is not clear enough to verify identity"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tutor rejected",
  "tutor_id": 5,
  "verification_status": "rejected",
  "rejection_reason": "Incomplete documentation - ID document is not clear enough to verify identity"
}
```

**What happens on rejection:**
- `is_verified` → `false`
- `verification_status` → `"rejected"`
- `rejection_reason` → Provided reason
- `verified_at` → Cleared (set to `null`)
- `verified_by` → Admin's user ID (for audit trail)

---

## 🎨 Frontend Implementation

### File Structure

```
admin-pages/
└── manage-tutors.html          # Main admin page with review modal

js/admin-pages/
└── tutor-review.js             # Review modal logic and API calls
```

### Review Modal UI Components

#### 1. **Tutor Header Section**
- Profile picture (24x24, rounded)
- Name (full name from users table)
- Teaches at (institution/organization)
- Location

#### 2. **ID Document Viewer**
- Full-size image display
- Click to open in new tab
- Placeholder when no document uploaded

#### 3. **Information Grid**
- Email, Phone
- Experience (in years)
- Education Level
- Subjects (comma-separated)
- Languages (comma-separated)
- Bio (full text)

#### 4. **Action Buttons**
- **Cancel** - Close modal without action
- **Reject** - Show rejection reason input
- **Approve** - Immediately verify tutor (with confirmation)

#### 5. **Rejection Flow**
- Click "Reject" → Shows textarea for reason
- Buttons swap: "Reject" becomes "Confirm Rejection"
- Mandatory reason validation
- Confirmation dialog before submitting

---

## 🔧 JavaScript Functions

### Core Functions in `tutor-review.js`

#### `reviewTutorRequest(tutorId)`
Opens the review modal and loads tutor details from API.

```javascript
await reviewTutorRequest(5); // Opens modal for tutor ID 5
```

#### `loadTutorReviewDetails(tutorId)`
Fetches tutor data from `/api/admin/tutor/{id}/review` endpoint.

#### `populateReviewModal(tutor)`
Populates all modal fields with tutor data.

#### `closeTutorReviewModal()`
Closes the modal and resets state.

#### `showRejectReason()`
Shows rejection reason textarea and swaps buttons.

#### `approveTutor()`
Submits approval request to backend.

#### `confirmRejectTutor()`
Validates and submits rejection with reason.

---

## 🚀 Usage Instructions

### For Admin Users

1. **Navigate to Manage Tutors Page**
   - Go to `admin-pages/manage-tutors.html`
   - Switch to "Tutor Requests" panel in sidebar

2. **Review a Tutor Application**
   - Click the **"Review"** button next to pending tutor
   - Modal opens with full tutor details

3. **Verify Tutor Documents**
   - Check profile picture
   - Click ID document to view full size
   - Verify name matches documents
   - Confirm institution/organization

4. **Make Decision**

   **To Approve:**
   - Click **"Approve"** button
   - Confirm in dialog
   - Tutor is immediately verified

   **To Reject:**
   - Click **"Reject"** button
   - Textarea appears for reason
   - Enter detailed rejection reason (mandatory)
   - Click **"Confirm Rejection"**
   - Tutor status updated to rejected

---

## 🔐 Security Features

### Backend Security
- ✅ **Admin-only access** - All endpoints check for admin role
- ✅ **JWT authentication** - Required for all API calls
- ✅ **Audit trail** - `verified_by` tracks which admin took action
- ✅ **Timestamp tracking** - `verified_at` records when action occurred

### Frontend Security
- ✅ **Token-based auth** - Uses localStorage token for API calls
- ✅ **Error handling** - Graceful degradation on API failures
- ✅ **Confirmation dialogs** - Prevents accidental approvals/rejections

---

## 📋 Testing Checklist

### Backend Testing

```bash
# Start backend server
cd astegni-backend
python app.py

# Test endpoints (requires admin auth token)
# 1. Get pending tutors
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/tutors/pending

# 2. Get tutor review details
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/tutor/5/review

# 3. Approve tutor
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/tutor/5/verify

# 4. Reject tutor
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test rejection"}' \
  http://localhost:8000/api/admin/tutor/5/reject
```

### Frontend Testing

1. ✅ Modal opens when clicking "Review" button
2. ✅ Tutor details load correctly from API
3. ✅ Profile picture displays (or shows placeholder)
4. ✅ ID document displays (or shows "not uploaded")
5. ✅ All fields populate with correct data
6. ✅ Approve button works and shows success message
7. ✅ Reject button reveals textarea
8. ✅ Rejection requires reason text
9. ✅ Confirmation dialogs appear
10. ✅ Modal closes after successful action
11. ✅ ESC key closes modal
12. ✅ Page refreshes or updates tutor list after action

---

## 🐛 Troubleshooting

### Issue: "Admin access required" Error
**Solution:** Ensure logged-in user has "admin" in their roles array in the database.

```sql
-- Add admin role to user
UPDATE users SET roles = '["admin"]' WHERE id = YOUR_USER_ID;
```

### Issue: Modal doesn't open
**Solution:** Check browser console for JavaScript errors. Ensure `tutor-review.js` is loaded.

### Issue: ID document not showing
**Solution:** Tutor must upload ID document to `id_document_url` field. This is optional but recommended.

### Issue: Rejection without reason
**Solution:** Frontend validates this, but backend also requires reason. Check error messages.

---

## 🔄 Future Enhancements

### Potential Additions
1. **Email notifications** - Notify tutors of approval/rejection
2. **Reapplication system** - Allow rejected tutors to reapply
3. **Batch approval** - Approve multiple tutors at once
4. **Verification notes** - Add admin notes during review
5. **Document upload in tutor registration** - Guide tutors to upload ID during signup
6. **Multi-stage verification** - Preliminary review → final approval
7. **Appeal process** - Allow tutors to contest rejections

---

## 📊 Database Queries for Monitoring

### Count tutors by verification status
```sql
SELECT verification_status, COUNT(*) as count
FROM tutor_profiles
GROUP BY verification_status;
```

### Recent verifications
```sql
SELECT tp.id, u.first_name, u.father_name, tp.verified_at, tp.verification_status
FROM tutor_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.verified_at IS NOT NULL
ORDER BY tp.verified_at DESC
LIMIT 10;
```

### Pending tutors older than 7 days
```sql
SELECT tp.id, u.first_name, u.father_name, tp.created_at
FROM tutor_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.verification_status = 'pending'
  AND tp.created_at < NOW() - INTERVAL '7 days'
ORDER BY tp.created_at ASC;
```

### Rejection reasons analysis
```sql
SELECT rejection_reason, COUNT(*) as count
FROM tutor_profiles
WHERE verification_status = 'rejected'
GROUP BY rejection_reason
ORDER BY count DESC;
```

---

## 📞 Support & Maintenance

### Key Files to Monitor
- `astegni-backend/app.py modules/models.py` - TutorProfile schema
- `astegni-backend/app.py modules/routes.py` - Verification endpoints (lines 3475-3635)
- `admin-pages/manage-tutors.html` - Review modal UI
- `js/admin-pages/tutor-review.js` - Frontend logic

### Related Documentation
- `CLAUDE.md` - Main project documentation
- `TUTOR-PROFILE-DATABASE-ENHANCEMENT.md` - Tutor profile enhancements
- `MANAGE-TUTORS-FEATURE-COMPLETE.md` - Admin tutor management

---

## ✅ Implementation Complete

This tutor verification system is **production-ready** and includes:

✅ Database schema with verification fields
✅ Migration script for existing databases
✅ 4 secure admin-only API endpoints
✅ Complete review modal UI
✅ JavaScript functions for all actions
✅ Validation and error handling
✅ Audit trail (verified_by, verified_at)
✅ Mandatory rejection reasons
✅ ESC key support
✅ Responsive design
✅ Comprehensive documentation

**Ready to use after running the database migration!**
