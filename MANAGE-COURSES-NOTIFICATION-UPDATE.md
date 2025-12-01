# Manage Courses - Notification System Update

## Summary
Updated the manage-courses.html admin page to improve the course request workflow and add notification capabilities for informing tutors about market demand for courses.

## Key Changes

### 1. Course Request Concept Clarification
- **Request Courses**: When users search for a course and don't find it, they can request it
- **Admin Approval**: Once approved, admins notify relevant tutors about the market demand
- **No Dedicated Instructors**: Courses don't have dedicated instructors since this is a teaching marketplace where any qualified tutor can teach

### 2. Add Course Modal Updates
**Removed:**
- "Instructor" field (no longer applicable)

**Added:**
- "Requested By" field (optional) - to track which user requested the course
- "Course Description" textarea - for detailed course information
- Better Ethiopian educational system grade levels (KG, Grade 1-6, Grade 7-8, etc.)
- More subject categories (Social Studies, Physical Education)
- Improved placeholders and form validation

**Location:** [manage-courses.html:1204-1260](admin-pages/manage-courses.html#L1204-L1260)

### 3. Verified Courses Table Updates

#### Removed Column:
- "Instructor" - Replaced with "Level"

#### Added Column:
- **Notification Status** - Shows whether a notification has been sent to tutors
  - ✅ **Sent** (Green badge with check icon)
  - ❌ **Unsent** (Gray badge with X icon)

#### Updated Columns:
- **Course** - Course name and ID
- **Category** - Subject category
- **Level** - Grade/educational level (replaces Instructor)
- **Students** - Number of enrolled students
- **Rating** - Course rating with stars
- **Notification** - Sent/Unsent status
- **Actions** - View, Edit, and **Send Notification** buttons

**Location:** [manage-courses.html:428-524](admin-pages/manage-courses.html#L428-L524)

### 4. New Notification System

#### Send Notification Button
- Purple bell icon button in the Actions column
- Opens the notification modal
- Tooltip: "Send Notification to Tutors"

#### Send Notification Modal
A comprehensive modal for notifying tutors about course demand:

**Features:**
- **Course ID Display** - Shows which course the notification is for
- **Target Audience Selector** - Choose specific tutor groups:
  - All Tutors
  - Subject-specific tutors (Mathematics, Science, Languages, Technology, Business, Arts)
  - High-Rated Tutors (4+ stars)
  - Verified Tutors Only
  - **Auto-selects** based on course category (e.g., Mathematics course → Mathematics Tutors)
- **Smart Message Template** - Auto-populated with:
  - **Bold course name** using markdown syntax (`**Course Name**`)
  - Course category in parentheses
  - Professional, ready-to-send message
  - Fully editable by admin
  - Monospace font for easy markdown editing
- **Markdown Support** - Use `**text**` for bold formatting (hint displayed below textarea)
- **Delivery Methods Info** - Shows notification will be sent via:
  - In-app notifications
  - Email (if enabled)
  - SMS (for premium tutors)

**Example Auto-Generated Message:**
```
Dear Tutors,

We've identified a market need for **Advanced Mathematics** (Mathematics).
Students are actively searching for this course. If you have expertise in
this area, please consider creating course content to meet this demand.

This is an excellent opportunity to expand your teaching portfolio and
connect with students seeking quality education in this subject.

Best regards,
Astegni Team
```

**Location:** [manage-courses.html:1262-1335](admin-pages/manage-courses.html#L1262-L1335)

### 5. JavaScript Functionality Updates

#### New Functions:
- `sendCourseNotification(courseId)` - Opens notification modal for specific course
  - Extracts course name and category from the table
  - Auto-populates message with **bold course name** and category
  - Auto-selects appropriate target audience based on course category
  - Displays course ID for reference
- `closeSendNotificationModal()` - Closes the notification modal
- `confirmSendNotification()` - Validates and sends the notification
- `updateNotificationStatus(courseId, status)` - Updates the notification badge in the table

#### Updated Functions:
- `saveCourse()` - Enhanced with form validation and data collection
  - Validates required fields
  - Collects all form data
  - Shows appropriate success/error messages
  - Ready for backend API integration

#### Keyboard Shortcuts:
- ESC key now also closes the Send Notification modal

**Location:** [manage-courses.js:24-177](js/admin-pages/manage-courses.js#L24-L177)

## User Workflow

### Course Request Flow:
1. **User searches** for a course (e.g., "Advanced Python for Data Science")
2. **Course not found** → User clicks "Request Course"
3. **Request submitted** → Appears in admin's "Course Requests" panel
4. **Admin reviews** → Decides to approve or reject
5. **If approved** → Course appears in "Active Courses" with "Unsent" notification status

### Notification Flow:
1. **Admin opens** Active Courses panel
2. **Clicks bell icon** on a course → Opens Send Notification modal
3. **Selects target audience** (e.g., "Mathematics Tutors")
4. **Edits message** if needed
5. **Clicks Send** → Notification sent to tutors
6. **Status updates** → Badge changes to "Sent" with green checkmark
7. **Tutors receive** notification and can create course content

## Technical Implementation Notes

### Frontend (Completed):
- ✅ Modal UI for sending notifications
- ✅ Form validation
- ✅ Real-time status updates in table
- ✅ Keyboard shortcuts (ESC to close)
- ✅ Responsive design

### Backend (TODO):
The following backend endpoints need to be implemented:

```javascript
// Course Management
POST /api/courses                           // Create new course request
PUT /api/courses/{id}                       // Update course details
GET /api/courses?status=verified            // Get verified courses

// Notification System
POST /api/notifications/send-course-notification
{
  courseId: "CRS-001",
  message: "notification text",
  targetAudience: "Mathematics Tutors"
}

// Update notification status
PUT /api/courses/{id}/notification-status
{
  status: "sent",
  sentAt: "2025-10-07T14:30:00Z",
  targetAudience: "Mathematics Tutors"
}
```

### Database Schema Updates Needed:

```sql
-- Add to courses table
ALTER TABLE courses ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN notification_sent_at TIMESTAMP;
ALTER TABLE courses ADD COLUMN notification_target_audience VARCHAR(100);
ALTER TABLE courses ADD COLUMN requested_by VARCHAR(100);
ALTER TABLE courses ADD COLUMN description TEXT;

-- Create notifications table (if not exists)
CREATE TABLE course_notifications (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    message TEXT NOT NULL,
    target_audience VARCHAR(100) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_by INTEGER REFERENCES users(id),
    delivery_methods JSON -- {email: true, sms: true, inApp: true}
);
```

## Benefits

1. **Clear Workflow** - Admins understand that course requests come from user demand
2. **Market-Driven** - Tutors are notified about actual market needs
3. **Flexible Teaching** - No dedicated instructors; any qualified tutor can teach
4. **Transparency** - Clear notification status shows which courses have been promoted to tutors
5. **Targeted Outreach** - Ability to notify specific tutor groups based on expertise
6. **Multiple Channels** - Notifications sent via in-app, email, and SMS

## Testing Checklist

- [ ] Add new course request with all fields
- [ ] Verify form validation (required fields)
- [ ] Open Send Notification modal
- [ ] Select different target audiences
- [ ] Send notification and verify status change
- [ ] Test ESC key to close modal
- [ ] Verify table updates with "Sent" status
- [ ] Test on mobile/tablet (responsive design)
- [ ] Backend API integration
- [ ] Database schema updates

## Files Modified

1. [admin-pages/manage-courses.html](admin-pages/manage-courses.html)
   - Updated Verified Courses table structure
   - Modified Add Course modal
   - Added Send Notification modal

2. [js/admin-pages/manage-courses.js](js/admin-pages/manage-courses.js)
   - Added notification functions
   - Enhanced saveCourse() with validation
   - Updated keyboard shortcuts

## Next Steps

1. Implement backend API endpoints for notification system
2. Update database schema with notification tracking fields
3. Integrate with email/SMS service for multi-channel delivery
4. Add notification history/logs for audit trail
5. Create analytics dashboard for notification effectiveness
6. Test with real tutor accounts

---

**Date:** October 7, 2025
**Status:** Frontend Complete ✅ | Backend Integration Pending 🔄
