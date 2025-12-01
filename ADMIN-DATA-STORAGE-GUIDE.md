# 📊 Admin Data Storage - Database Tables Guide

## 🎯 **Where Admin Data is Stored**

Admin data is stored across **7 tables** in the PostgreSQL database:

---

## 1️⃣ **`users` Table** (Main Authentication)

**Purpose:** Core user authentication and account information

**Location:** All admin users are stored here with `roles` containing `'admin'`

### **Structure:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    father_name VARCHAR(255),
    grandfather_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(255),
    password_hash VARCHAR(255),        -- Bcrypt hashed password
    roles JSON,                        -- ['admin', 'super_admin', etc.]
    active_role VARCHAR(255),
    username VARCHAR(255),
    gender VARCHAR(50),
    profile_picture VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP
);
```

### **Current Admin Data:**
```
ID: 1
Email: admin@astegni.com
Roles: ['admin', 'tutor', 'student']
Password: Bcrypt hashed (use create_admin.py to reset)
Created: 2025-09-15
```

### **Query Example:**
```sql
-- Get all admin users
SELECT id, email, roles, created_at
FROM users
WHERE roles::text LIKE '%admin%';

-- Login check
SELECT * FROM users WHERE email = 'admin@astegni.com';
```

---

## 2️⃣ **`admin_profile_stats` Table** (Profile Information)

**Purpose:** Admin profile details, bio, department, etc.

### **Structure:**
```sql
CREATE TABLE admin_profile_stats (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    display_name VARCHAR(200),
    department VARCHAR(200),           -- 'Educational Services', etc.
    employee_id VARCHAR(100),          -- 'ADM-2024-001'
    joined_date DATE,
    rating NUMERIC(3, 2),              -- 4.95
    total_reviews INTEGER,
    profile_quote TEXT,
    bio TEXT,
    specialization VARCHAR(200),
    years_experience INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Used For:**
- Profile header display
- Department information
- Employee ID
- Admin rating/reviews count

---

## 3️⃣ **`admin_panel_statistics` Table** (Dashboard Stats)

**Purpose:** Dynamic statistics for admin panels

### **Structure:**
```sql
CREATE TABLE admin_panel_statistics (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    panel_name VARCHAR(100),           -- 'school_management', 'tutor_management'
    stat_key VARCHAR(100),             -- 'verified_count', 'pending_count'
    stat_value VARCHAR(200),           -- '89', '8', '98%'
    stat_type VARCHAR(50),             -- 'count', 'percentage', 'rate'
    display_label VARCHAR(200),        -- 'Verified Schools', 'Approval Rate'
    display_order INTEGER,
    last_updated TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Example Data:**
```sql
INSERT INTO admin_panel_statistics VALUES
(1, 1, 'school_management', 'verified_count', '2', 'count', 'Verified Schools', 1, NOW(), NOW()),
(2, 1, 'school_management', 'pending_count', '2', 'count', 'Pending Schools', 2, NOW(), NOW()),
(3, 1, 'school_management', 'approval_rate', '33%', 'percentage', 'Approval Rate', 5, NOW(), NOW());
```

---

## 4️⃣ **`admin_achievements` Table** (Badges/Awards)

**Purpose:** Admin achievements, badges, awards

### **Structure:**
```sql
CREATE TABLE admin_achievements (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    achievement_type VARCHAR(100),     -- 'top_performer', 'excellence'
    title VARCHAR(200),                -- 'Top Performer', '5-Star Admin'
    description TEXT,
    icon VARCHAR(50),                  -- '🏆', '🥇', '⭐'
    earned_date DATE,
    earned_period VARCHAR(100),        -- 'Q4 2024', 'Annual 2023'
    metadata JSONB,
    display_order INTEGER,
    is_featured BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Example Data:**
```sql
INSERT INTO admin_achievements VALUES
(1, 1, 'top_performer', 'Top Performer', 'Outstanding performance in Q4', '🏆', '2024-12-31', 'Q4 2024', '{}', 1, TRUE, NOW(), NOW()),
(2, 1, 'excellence', 'Excellence', 'Annual excellence award', '🥇', '2023-12-31', 'Annual 2023', '{}', 2, TRUE, NOW(), NOW());
```

---

## 5️⃣ **`admin_reviews` Table** (Performance Reviews)

**Purpose:** Reviews and feedback for admin performance

### **Structure:**
```sql
CREATE TABLE admin_reviews (
    id SERIAL PRIMARY KEY,
    review_id VARCHAR(50) UNIQUE,
    admin_id INTEGER REFERENCES users(id),
    admin_name VARCHAR(255),
    reviewer_name VARCHAR(255),
    reviewer_role VARCHAR(50),         -- 'Marketing Director', 'Sales Team'
    rating NUMERIC(2, 1),              -- 5.0, 4.5
    response_time_rating NUMERIC(2, 1),
    accuracy_rating NUMERIC(2, 1),
    comment TEXT,
    review_date DATE,
    is_featured BOOLEAN,
    sentiment VARCHAR(20),             -- 'positive', 'neutral', 'negative'
    category VARCHAR(100),             -- 'campaign_management', 'approval_process'
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Example Data:**
```sql
INSERT INTO admin_reviews VALUES
(1, 'REV001', 1, 'Admin User', 'Marketing Director', 'director', 5.0, 5.0, 5.0,
 'Outstanding campaign management. Revenue increased by 25% this quarter.',
 '2025-01-05', TRUE, 'positive', 'campaign_management', NOW(), NOW());
```

---

## 6️⃣ **`admin_daily_quotas` Table** (Work Quotas)

**Purpose:** Track daily work quotas and limits

### **Structure:**
```sql
CREATE TABLE admin_daily_quotas (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    date DATE,
    category VARCHAR(50),              -- 'verified', 'pending', 'rejected'
    current_count INTEGER,             -- 142
    quota_limit INTEGER,               -- 150
    percentage NUMERIC(5, 2),          -- 94.67
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Used For:**
- Daily quota widget
- Performance tracking
- Workload management

---

## 7️⃣ **`admin_fire_streaks` Table** (Activity Streaks)

**Purpose:** Track admin activity streaks and consistency

### **Structure:**
```sql
CREATE TABLE admin_fire_streaks (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    current_streak INTEGER,            -- 45 days
    longest_streak INTEGER,            -- 120 days
    last_activity_date DATE,
    streak_started_date DATE,
    weekly_pattern JSONB,              -- {'Mon': 10, 'Tue': 8, ...}
    total_active_days INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### **Used For:**
- Fire streak widget (🔥 45 days)
- Activity tracking
- Gamification

---

## 🔗 **Table Relationships**

```
users (admin authentication)
  ↓ (admin_id)
  ├── admin_profile_stats (profile details)
  ├── admin_panel_statistics (dashboard stats)
  ├── admin_achievements (badges/awards)
  ├── admin_reviews (performance reviews)
  ├── admin_daily_quotas (work quotas)
  └── admin_fire_streaks (activity streaks)
```

---

## 📋 **Complete Data Flow**

### **Login Process:**
```
1. User enters email/password in frontend
        ↓
2. POST /api/login with credentials
        ↓
3. Backend queries: SELECT * FROM users WHERE email = ?
        ↓
4. Verify password: bcrypt.verify(password, password_hash)
        ↓
5. Check roles: 'admin' in user.roles
        ↓
6. Generate JWT token with user.id
        ↓
7. Return token + user data to frontend
        ↓
8. Frontend stores token in localStorage
        ↓
9. All subsequent requests include: Authorization: Bearer <token>
```

### **Profile Data Loading:**
```
1. User loads manage-schools.html
        ↓
2. JavaScript checks localStorage.getItem('token')
        ↓
3. If token exists, fetch profile data:
   - GET /api/me (from users table)
   - GET /api/admin/profile (from admin_profile_stats)
   - GET /api/admin/stats (from admin_panel_statistics)
        ↓
4. Display in profile header and widgets
```

---

## 🔍 **Query Examples**

### **Get Complete Admin Data:**
```sql
-- Main user account
SELECT * FROM users WHERE id = 1;

-- Profile information
SELECT * FROM admin_profile_stats WHERE admin_id = 1;

-- Dashboard stats
SELECT * FROM admin_panel_statistics
WHERE admin_id = 1 AND panel_name = 'school_management'
ORDER BY display_order;

-- Achievements
SELECT * FROM admin_achievements
WHERE admin_id = 1
ORDER BY display_order;

-- Recent reviews
SELECT * FROM admin_reviews
WHERE admin_id = 1
ORDER BY review_date DESC
LIMIT 5;

-- Daily quotas (today)
SELECT * FROM admin_daily_quotas
WHERE admin_id = 1 AND date = CURRENT_DATE;

-- Activity streak
SELECT * FROM admin_fire_streaks WHERE admin_id = 1;
```

### **Update Password:**
```sql
-- Using bcrypt hash
UPDATE users
SET password_hash = '$2b$12$...'
WHERE id = 1;
```

### **Add Achievement:**
```sql
INSERT INTO admin_achievements (
    admin_id, achievement_type, title, icon,
    earned_date, earned_period
) VALUES (
    1, 'top_performer', 'Top Performer', '🏆',
    CURRENT_DATE, 'Q1 2025'
);
```

---

## 🛠️ **Management Scripts**

### **Create/Reset Admin Password:**
```bash
cd astegni-backend
python create_admin.py
```

### **View Admin Data:**
```bash
# Direct SQL
psql -U astegni_user -d astegni_db
\dt admin*  # List all admin tables
SELECT * FROM users WHERE id = 1;
```

---

## 📝 **Summary**

**Admin Authentication:**
- **Table:** `users`
- **Email:** admin@astegni.com
- **Password:** Hashed in `password_hash` column
- **Roles:** JSON array `['admin', 'super_admin']`

**Admin Profile:**
- **Table:** `admin_profile_stats`
- **Contains:** Name, department, employee ID, bio, rating

**Admin Statistics:**
- **Table:** `admin_panel_statistics`
- **Contains:** Dashboard stats for each panel

**Admin Achievements:**
- **Table:** `admin_achievements`
- **Contains:** Badges, awards, achievements

**Admin Reviews:**
- **Table:** `admin_reviews`
- **Contains:** Performance reviews and feedback

**Admin Quotas:**
- **Table:** `admin_daily_quotas`
- **Contains:** Daily work limits and progress

**Admin Streaks:**
- **Table:** `admin_fire_streaks`
- **Contains:** Activity streak tracking

---

## 🔐 **Security Notes**

1. **Passwords** are NEVER stored in plain text - only bcrypt hashed
2. **JWT tokens** expire after 30 minutes (access) or 7 days (refresh)
3. **Admin role** required for approve/reject/suspend operations
4. **Email verification** can be enforced via `email_verified` column
5. **Active status** can disable accounts via `is_active` column

---

## 🎯 **Current Admin:**

```
ID: 1
Email: admin@astegni.com
Roles: ['admin', 'tutor', 'student']
Created: September 15, 2025
Status: Active, Email Verified

Use create_admin.py to reset password to: Admin@123
```
