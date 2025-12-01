# Manage Courses - View Modal & Row Movement Implementation

## Summary
Implemented a comprehensive View Course Details modal and dynamic row movement between tables when actions are performed (approve, reject, suspend, reinstate).

## ✅ Completed Features

### 1. View Course Details Modal

**Features:**
- **Responsive Design** - Full-width modal (max-w-3xl) with scrollable content
- **Dynamic Content** - Adapts based on course status (Pending, Active, Rejected, Suspended)
- **Conditional Sections** - Shows/hides sections based on relevance:
  - Rating & Students (for active courses)
  - Rejection/Suspension Reason (for rejected/suspended courses)
  - Notification Status (for active courses)
- **Action Buttons** - Context-aware buttons in modal footer:
  - Pending: Approve, Reject
  - Active: Edit, Send Notification
  - Rejected: Reconsider
  - Suspended: Reinstate

**Modal Fields:**
- Course Title & ID
- Category
- Level
- Requested By
- Status Badge
- Submitted/Date
- Description
- Rating (if active)
- Enrolled Students (if active)
- Rejection/Suspension Reason (if applicable)
- Notification Status (if active)

**Location:** [manage-courses.html:1308-1392](admin-pages/manage-courses.html#L1308-L1392)

---

### 2. Row Movement System

All action buttons now **dynamically move course rows** between tables:

#### 📋 Pending Requests → ✅ Active Courses
**Function:** `approveCourse(requestId)`
- Confirms approval with admin
- Creates new row in Active Courses table
- Changes ID: `REQ-CRS-005` → `CRS-005`
- Sets initial values:
  - Students: 0
  - Rating: ☆☆☆☆☆ (0)
  - Notification: Unsent
- Removes original row from Pending table
- Shows success notification

#### 📋 Pending Requests → ❌ Rejected Courses
**Function:** `rejectCourse(requestId)`
- Prompts admin for rejection reason
- Creates new row in Rejected Courses table
- Changes ID: `REQ-CRS-005` → `REJ-CRS-005`
- Displays rejection reason in badge
- Sets rejection date to current date
- Removes original row from Pending table
- Shows warning notification

#### ❌ Rejected Courses → 📋 Pending Requests
**Function:** `reconsiderCourse(rejectedId)`
- Confirms reconsideration with admin
- Creates new row in Pending Requests table
- Changes ID: `REJ-CRS-002` → `REQ-CRS-002`
- Sets submitted date to "Just now"
- Removes original row from Rejected table
- Shows success notification

#### ✅ Active Courses → ⏸️ Suspended Courses
**Function:** `suspendCourse(courseId)`
- Prompts admin for suspension reason
- Creates new row in Suspended Courses table
- Changes ID: `CRS-001` → `SUS-CRS-001`
- Displays suspension reason in badge
- Sets suspension date to current date
- Removes original row from Active table
- Shows warning notification

#### ⏸️ Suspended Courses → ✅ Active Courses
**Function:** `reinstateCourse(suspendedId)`
- Confirms reinstatement with admin
- Creates new row in Active Courses table
- Changes ID: `SUS-CRS-001` → `CRS-001`
- Preserves all original data (students, rating)
- Resets notification status to "Unsent"
- Removes original row from Suspended table
- Shows success notification

---

### 3. Helper Functions

#### `findCourseRow(courseId)`
- Searches all tables for a course by ID
- Returns the table row element
- Used by all action functions

#### `extractCourseData(row, courseId)`
- Intelligently extracts data from table row
- Adapts to different table structures
- Returns standardized data object with:
  - title, category, level, requester
  - students, rating, notification status
  - status badge, modal actions
  - description (placeholder for now)

#### `viewCourseRequest(requestId)` / `viewCourse(courseId)`
- Opens View Course Details modal
- Populates all fields with course data
- Shows/hides sections based on course status
- Adds context-aware action buttons
- Both functions use the same modal

---

### 4. View Button Functionality

**All "View" buttons now open the modal:**

| Panel | Button Click | Shows |
|-------|-------------|-------|
| Pending Requests | `viewCourseRequest('REQ-CRS-005')` | Course details + Approve/Reject buttons |
| Active Courses | `viewCourse('CRS-001')` | Course details + Edit/Notify buttons |
| Rejected Courses | `viewCourseRequest('REJ-CRS-002')` | Course details + reason + Reconsider button |
| Suspended Courses | `viewCourse('SUS-CRS-001')` | Course details + reason + Reinstate button |

---

## User Experience Flow

### Example 1: Approve a Course Request
1. Admin clicks **View** (👁️) on "Python for Beginners" (REQ-CRS-005)
2. Modal opens showing course details and description
3. Admin clicks **Approve** button in modal
4. Confirmation dialog appears
5. Admin confirms
6. Course disappears from Pending Requests table
7. Course appears at top of Active Courses table as "CRS-005"
8. Success notification: "Course approved! You can now send notifications to tutors."
9. Modal auto-closes

### Example 2: Suspend an Active Course
1. Admin clicks **Suspend** (⏸️) on "Advanced Mathematics" (CRS-001)
2. Prompt asks for suspension reason
3. Admin enters: "Content quality review needed"
4. Course disappears from Active Courses table
5. Course appears at top of Suspended Courses table as "SUS-CRS-001"
6. Suspension reason shown in orange badge
7. Warning notification appears

### Example 3: View and Reconsider Rejected Course
1. Admin clicks **View** (👁️) on rejected course (REJ-CRS-002)
2. Modal shows course details
3. **Rejection Reason section** visible with reason in red box
4. Admin clicks **Reconsider** button in modal
5. Confirmation dialog appears
6. Admin confirms
7. Modal closes
8. Course disappears from Rejected table
9. Course reappears in Pending Requests as "REQ-CRS-002"
10. Success notification appears

---

## Technical Implementation

### Data Flow
```
Pending (REQ-CRS-xxx)
  ├─→ Approve → Active (CRS-xxx)
  │             ├─→ Suspend → Suspended (SUS-CRS-xxx)
  │             │              └─→ Reinstate → Active (CRS-xxx)
  │             └─→ Delete → Permanent removal
  └─→ Reject → Rejected (REJ-CRS-xxx)
                ├─→ Reconsider → Pending (REQ-CRS-xxx)
                └─→ Delete → Permanent removal
```

### ID Transformation Pattern
```javascript
// Approve
'REQ-CRS-005' → 'CRS-005'

// Reject
'REQ-CRS-005' → 'REJ-CRS-005'

// Suspend
'CRS-001' → 'SUS-CRS-001'

// Reconsider
'REJ-CRS-005' → 'REQ-CRS-005'

// Reinstate
'SUS-CRS-001' → 'CRS-001'
```

### Row Creation
All functions dynamically create HTML table rows with:
- Proper Tailwind CSS classes
- FontAwesome icons
- Working onclick handlers
- Tooltips
- Hover states
- Responsive design

---

## Files Modified

1. **[admin-pages/manage-courses.html](admin-pages/manage-courses.html)**
   - Added View Course Details modal (lines 1308-1392)
   - Full responsive design with conditional sections

2. **[js/admin-pages/manage-courses.js](js/admin-pages/manage-courses.js)**
   - Added `courseDataStore` global object
   - Implemented `viewCourseRequest()` - Populates and shows modal
   - Implemented `closeViewCourseModal()` - Closes modal
   - Added `findCourseRow()` helper - Finds course in any table
   - Added `extractCourseData()` helper - Extracts data from row
   - Updated `viewCourse()` - Now opens the modal
   - Updated `approveCourse()` - Moves row to Active Courses
   - Updated `rejectCourse()` - Moves row to Rejected Courses
   - Updated `reconsiderCourse()` - Moves row back to Pending
   - Updated `suspendCourse()` - Moves row to Suspended Courses
   - Updated `reinstateCourse()` - Moves row back to Active
   - Added `closeViewCourseModal()` to ESC key handler

---

## Benefits

### 1. **Visual Feedback**
- Admins see instant results of their actions
- Courses physically move between tables
- No page reload required

### 2. **Data Preservation**
- Course information retained during transitions
- Rejection/suspension reasons displayed
- Notification status preserved

### 3. **Intuitive Workflow**
- View → Approve → See in Active Courses immediately
- View → Reject → See in Rejected Courses with reason
- Reconsider → See back in Pending immediately

### 4. **Comprehensive Information**
- Modal shows ALL available course data
- Context-aware action buttons
- Description field ready for backend integration

---

## Backend Integration Notes

### Required API Endpoints

```javascript
// View Course Details (with description from DB)
GET /api/courses/{id}
Response: {
  id: "CRS-001",
  title: "Advanced Mathematics",
  category: "Mathematics",
  level: "Grade 12",
  description: "Full course description from database",
  requester: "Sara Tadesse",
  students: 1250,
  rating: 4.8,
  notification_sent: true,
  status: "active"
}

// Approve Course
POST /api/courses/{id}/approve
Response: { new_id: "CRS-005", status: "active" }

// Reject Course
POST /api/courses/{id}/reject
Body: { reason: "Quality issues" }
Response: { new_id: "REJ-CRS-005", status: "rejected" }

// Suspend Course
POST /api/courses/{id}/suspend
Body: { reason: "Content review" }
Response: { new_id: "SUS-CRS-001", status: "suspended" }

// Reconsider Course
POST /api/courses/{id}/reconsider
Response: { new_id: "REQ-CRS-005", status: "pending" }

// Reinstate Course
POST /api/courses/{id}/reinstate
Response: { new_id: "CRS-001", status: "active" }
```

### Description Field
Currently showing placeholder text:
```
"This is a sample course description. In a real implementation,
this would be fetched from the database."
```

Update `extractCourseData()` to fetch from API when backend is ready.

---

## Testing Checklist

- [x] View course from Pending Requests
- [x] View course from Active Courses
- [x] View course from Rejected Courses
- [x] View course from Suspended Courses
- [x] Approve course → verify appears in Active Courses
- [x] Reject course with reason → verify appears in Rejected with reason displayed
- [x] Reconsider rejected course → verify appears in Pending
- [x] Suspend active course with reason → verify appears in Suspended with reason
- [x] Reinstate suspended course → verify appears in Active
- [x] ESC key closes View modal
- [x] Action buttons in modal work correctly
- [x] Modal shows/hides sections appropriately
- [ ] Backend API integration
- [ ] Real course descriptions from database

---

**Date:** October 8, 2025
**Status:** Frontend Complete ✅ | Backend Integration Pending 🔄
**All row movement and view modal features working perfectly!**
