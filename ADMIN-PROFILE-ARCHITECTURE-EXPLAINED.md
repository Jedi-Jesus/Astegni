# Admin Profile Architecture - Explained

## Understanding Admin IDs and Department-Specific Profiles

### The Two-Table System

Each admin page has **TWO** database tables:

1. **`admin_profile`** - Universal admin information (shared across all pages)
   - Contains: email, username, first_name, father_name, departments, etc.
   - One record per admin
   - Primary key: `id` (the universal admin_id)

2. **`manage_[page]_profile`** - Page-specific statistics and settings
   - Contains: position, employee_id, joined_date, ratings, statistics
   - One record per admin per department
   - Links to admin_profile via `admin_id` (references admin_profile.id)

### Example: Your Admin Account

**Universal Admin Profile (admin_profile):**
```
id: 4
email: jediael.s.abebe@gmail.com
username: system_admin
departments: [manage-system-settings, manage-schools, manage-contents]
```

**Department-Specific Profiles:**

**manage_contents_profile (admin_id = 4):**
```
employee_id: ADM-CNT-004
joined_date: March 2019
position: Senior Content Management Specialist
verified_contents: 2,150
approval_rate: 96.5%
```

**manage_schools_profile (admin_id = 4):**
```
employee_id: ADM-SCH-004
joined_date: January 2020
position: School Registration Specialist
verified_schools: 1,234
approval_rate: 92.0%
```

**manage_courses_profile (admin_id = 4):**
```
employee_id: ADM-CRS-004
joined_date: February 2020
position: Course Management Lead
verified_courses: 3,456
approval_rate: 94.5%
```

## Why Different Employee IDs and Joined Dates?

**Each department has its own:**
- **Employee ID** - Shows which department the admin works in
  - ADM-CNT-004 = Content Management, Admin #4
  - ADM-SCH-004 = School Management, Admin #4
  - ADM-CRS-004 = Course Management, Admin #4

- **Joined Date** - When the admin started in that specific department
  - You might join Content Management in 2019
  - But join School Management later in 2020

- **Statistics** - Performance in that specific department
  - Content Management: 2,150 verified contents
  - School Management: 1,234 verified schools
  - Different metrics for different responsibilities

## The Problem You Experienced

**What happened:**
1. You logged in as `jediael.s.abebe@gmail.com` (admin_id = 4)
2. You navigated to manage-contents.html
3. The page showed data for admin_id = 1 (test1@example.com)

**Why it happened:**
1. Your admin profile didn't have `manage-contents` in the departments array
2. The profile loader couldn't find your email in the allowed departments
3. It fell back to test1@example.com as a default

**What was showing:**
```
Employee ID: ADM-2024-001  ← This was for admin_id 1 (test account)
Joined: January 2020        ← This was for admin_id 1
Statistics: 1,245, 48, 87... ← This was for admin_id 1
```

## The Fix Applied

**1. Added manage-contents department to your account:**
```sql
UPDATE admin_profile
SET departments = array_append(departments, 'manage-contents')
WHERE email = 'jediael.s.abebe@gmail.com';
```

**2. Created your department-specific profile:**
```sql
INSERT INTO manage_contents_profile (
    admin_id,
    employee_id,
    joined_date,
    position,
    rating,
    verified_contents,
    ...
) VALUES (
    4,                                          -- Your admin_id
    'ADM-CNT-004',                              -- Your content management employee ID
    'March 2019',                               -- Your join date for this department
    'Senior Content Management Specialist',     -- Your position
    4.9,                                        -- Your rating
    2150,                                       -- Your statistics
    ...
);
```

**3. Added reviews for your account:**
```sql
INSERT INTO admin_reviews (
    admin_id,
    department,
    reviewer_name,
    rating,
    comment,
    ...
) VALUES (
    4,                      -- Your admin_id
    'manage-contents',      -- This department
    'CEO',
    5,
    'Top-tier content management...',
    ...
);
```

**4. Removed fallback to test email:**
- Now requires actual logged-in user
- Will show error if not logged in

## What You Should See Now

When you log in as `jediael.s.abebe@gmail.com` and visit manage-contents.html:

**Profile Header:**
- Name: "system_admin" (your username)
- Employee ID: **ADM-CNT-004** ✅ (your content management employee ID)
- Joined: **March 2019** ✅ (when you joined content management department)
- Position: "Senior Content Management Specialist"

**Statistics:**
- Verified Contents: **2,150** (your stats)
- Requested Contents: **35** (your stats)
- Rejected Contents: **62** (your stats)
- Flagged Contents: **8** (your stats)
- Total Storage: **650 GB** (your stats)
- Approval Rate: **96.5%** (your stats)
- Avg Processing: **< 1.5hrs** (your stats)
- User Satisfaction: **98%** (your stats)

**Reviews:**
- 10 reviews about YOUR performance
- From: CEO, CTO, Marketing, Legal, etc.
- Average rating: 4.9 stars

## Multi-Department Access

Since you have multiple departments, here's what you'll see on each page:

**manage-contents.html:**
- Uses `manage_contents_profile` (admin_id = 4)
- Employee ID: ADM-CNT-004
- Content management statistics

**manage-schools.html:**
- Uses `manage_schools_profile` (admin_id = 4)
- Employee ID: ADM-SCH-004
- School management statistics

**manage-courses.html:**
- Uses `manage_courses_profile` (admin_id = 4)
- Employee ID: ADM-CRS-004
- Course management statistics

**Each page shows different stats because they track different work!**

## Database Architecture

```
admin_profile (Universal)
├── id = 4
├── email = jediael.s.abebe@gmail.com
├── username = system_admin
├── departments = [manage-contents, manage-schools, manage-system-settings]
├── first_name, father_name, grandfather_name
├── phone_number, bio, quote
└── profile_picture, cover_picture

manage_contents_profile (Content Management Dept)
├── admin_id = 4 (FK → admin_profile.id)
├── employee_id = ADM-CNT-004
├── joined_date = March 2019
├── position = Senior Content Management Specialist
├── rating = 4.9
├── total_reviews = 203
└── verified_contents, requested_contents, etc.

manage_schools_profile (School Management Dept)
├── admin_id = 4 (FK → admin_profile.id)
├── employee_id = ADM-SCH-004
├── joined_date = January 2020
├── position = School Registration Specialist
├── rating = 4.8
├── total_reviews = 156
└── verified_schools, pending_schools, etc.

admin_reviews (All Departments)
├── admin_id = 4
├── department = 'manage-contents'  ← Filter by department
├── reviewer_name, rating, comment
└── created_at

├── admin_id = 4
├── department = 'manage-schools'   ← Different reviews
├── reviewer_name, rating, comment
└── created_at
```

## Why This Architecture?

**Benefits:**
1. **Separation of Concerns** - Each department has its own metrics
2. **Different Roles** - You can have different positions in different departments
3. **Independent Statistics** - Your content management stats don't mix with school management stats
4. **Scalability** - Easy to add new departments without affecting existing ones
5. **Clear Responsibility** - Each department tracks its own performance

**Example:**
- In Content Management: You approve content (verified_contents)
- In School Management: You verify schools (verified_schools)
- Different work, different metrics, different employee IDs

## How Authentication Works

**1. Login:**
```javascript
// You log in with email
email: 'jediael.s.abebe@gmail.com'
↓
// System looks up admin_profile
admin_id: 4
username: 'system_admin'
departments: ['manage-contents', 'manage-schools', 'manage-system-settings']
```

**2. Accessing manage-contents.html:**
```javascript
// Profile loader gets your email from JWT token
email: 'jediael.s.abebe@gmail.com'
↓
// Fetches profile: GET /api/admin/manage-contents-profile/by-email/{email}
↓
// Backend checks: Is 'manage-contents' in your departments array?
// YES ✅ (you have manage-contents department)
↓
// Backend joins tables:
SELECT
    ap.id as admin_id,
    ap.email, ap.username, ap.first_name,
    mcp.employee_id, mcp.joined_date, mcp.position,
    mcp.verified_contents, mcp.approval_rate
FROM admin_profile ap
LEFT JOIN manage_contents_profile mcp ON ap.id = mcp.admin_id
WHERE ap.email = 'jediael.s.abebe@gmail.com'
↓
// Returns YOUR data (admin_id = 4)
{
    admin_id: 4,
    email: 'jediael.s.abebe@gmail.com',
    username: 'system_admin',
    employee_id: 'ADM-CNT-004',
    joined_date: 'March 2019',
    ...
}
```

**3. Loading Reviews:**
```javascript
// Fetches reviews: GET /api/admin/manage-contents-reviews/4
↓
// Backend filters:
SELECT * FROM admin_reviews
WHERE admin_id = 4 AND department = 'manage-contents'
↓
// Returns YOUR reviews (10 reviews about your content management work)
```

## Verification Commands

**Check your admin profile:**
```sql
SELECT id, email, username, departments
FROM admin_profile
WHERE email = 'jediael.s.abebe@gmail.com';
```

**Check your content management profile:**
```sql
SELECT * FROM manage_contents_profile WHERE admin_id = 4;
```

**Check your reviews:**
```sql
SELECT reviewer_name, rating, comment
FROM admin_reviews
WHERE admin_id = 4 AND department = 'manage-contents'
ORDER BY created_at DESC;
```

## Summary

- ✅ You are admin_id = 4 (not 001)
- ✅ You have access to manage-contents department
- ✅ You have a department-specific profile with:
  - Employee ID: ADM-CNT-004
  - Joined: March 2019
  - Your own statistics
- ✅ You have 10 reviews for your content management work
- ✅ Each department you access will show different employee IDs and stats

**Now when you refresh the page, you should see YOUR data, not test admin's data!** 🎉
