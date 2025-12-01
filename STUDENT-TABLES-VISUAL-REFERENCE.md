# Student Enhancement Tables - Visual Reference

## Table Structure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS TABLE                              │
│  (Existing - Multi-role authentication)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Foreign Key: student_id
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────────┐
│  ACHIEVEMENTS │  │ CERTIFICATIONS │  │  EXTRACURRICULAR │
│               │  │                │  │                  │
│ 20 records    │  │ 19 records     │  │  23 records      │
└───────────────┘  └────────────────┘  └──────────────────┘
```

---

## 1. student_achievements

### Purpose
Track academic awards, honors, competition wins, and recognitions

### Schema Diagram
```
┌──────────────────────────────────────────────────────────┐
│             STUDENT_ACHIEVEMENTS                         │
├──────────────────────────────────────────────────────────┤
│ id                          SERIAL PRIMARY KEY           │
│ student_id                  INTEGER → users(id)          │
│ title                       VARCHAR(255) NOT NULL        │
│ description                 TEXT                         │
│ achievement_type            VARCHAR(50) NOT NULL         │
│   ↳ Values: 'academic', 'competition', 'honor',         │
│              'award', 'other'                            │
│ issuing_organization        VARCHAR(255)                 │
│ date_received               DATE                         │
│ verification_status         VARCHAR(20) DEFAULT pending  │
│   ↳ Values: 'pending', 'verified', 'rejected'           │
│ verification_document_url   TEXT (Backblaze B2)          │
│ is_featured                 BOOLEAN DEFAULT FALSE        │
│ display_order               INTEGER DEFAULT 0            │
│ created_at                  TIMESTAMP                    │
│ updated_at                  TIMESTAMP                    │
└──────────────────────────────────────────────────────────┘

Indexes:
  • idx_achievements_student_id (query by student)
  • idx_achievements_type (filter by type)
  • idx_achievements_verification (filter by status)
  • idx_achievements_featured (featured items)
```

### Sample Data
```
┌──────────────────────────────────────────────┬──────────────┬────────────┐
│ Title                                        │ Type         │ Status     │
├──────────────────────────────────────────────┼──────────────┼────────────┤
│ National Mathematics Olympiad - First Place  │ competition  │ verified   │
│ Best Student Award                           │ academic     │ verified   │
│ Science Fair Gold Medal                      │ competition  │ verified   │
│ Dean's List - Fall 2024                      │ honor        │ pending    │
│ English Debate Championship Winner           │ competition  │ verified   │
│ Perfect Score in National Exam               │ academic     │ verified   │
│ Young Innovator Award                        │ award        │ verified   │
│ Chemistry Excellence Award                   │ academic     │ verified   │
└──────────────────────────────────────────────┴──────────────┴────────────┘
```

---

## 2. student_certifications

### Purpose
Track professional certificates, course completions, and credentials

### Schema Diagram
```
┌──────────────────────────────────────────────────────────┐
│           STUDENT_CERTIFICATIONS                         │
├──────────────────────────────────────────────────────────┤
│ id                          SERIAL PRIMARY KEY           │
│ student_id                  INTEGER → users(id)          │
│ certification_name          VARCHAR(255) NOT NULL        │
│ issuing_organization        VARCHAR(255) NOT NULL        │
│ issue_date                  DATE                         │
│ expiration_date             DATE (NULL if no expiry)     │
│ credential_id               VARCHAR(255)                 │
│ credential_url              TEXT                         │
│ certificate_document_url    TEXT (Backblaze B2)          │
│ skills                      TEXT[] (PostgreSQL array)    │
│ description                 TEXT                         │
│ verification_status         VARCHAR(20) DEFAULT pending  │
│   ↳ Values: 'pending', 'verified', 'rejected'           │
│ is_featured                 BOOLEAN DEFAULT FALSE        │
│ display_order               INTEGER DEFAULT 0            │
│ created_at                  TIMESTAMP                    │
│ updated_at                  TIMESTAMP                    │
└──────────────────────────────────────────────────────────┘

Indexes:
  • idx_certifications_student_id (query by student)
  • idx_certifications_verification (filter by status)
  • idx_certifications_featured (featured items)
  • idx_certifications_expiration (expiring certs)
```

### Sample Data
```
┌─────────────────────────────────┬───────────────────┬──────────────────────────┐
│ Certification                   │ Organization      │ Skills                   │
├─────────────────────────────────┼───────────────────┼──────────────────────────┤
│ Python Programming Certificate  │ Coursera          │ [Python, Algorithms,     │
│                                 │                   │  Data Structures, OOP]   │
├─────────────────────────────────┼───────────────────┼──────────────────────────┤
│ Digital Marketing Fundamentals  │ Google            │ [SEO, Social Media,      │
│                                 │                   │  Analytics, Content]     │
├─────────────────────────────────┼───────────────────┼──────────────────────────┤
│ First Aid and CPR               │ Ethiopian Red     │ [First Aid, CPR,         │
│ (Expires: 2025-06-15)           │ Cross Society     │  Emergency Response]     │
├─────────────────────────────────┼───────────────────┼──────────────────────────┤
│ Microsoft Office Specialist     │ Microsoft         │ [Word, Excel,            │
│                                 │                   │  PowerPoint, Office]     │
├─────────────────────────────────┼───────────────────┼──────────────────────────┤
│ Web Development Bootcamp        │ Udemy             │ [HTML, CSS, JavaScript,  │
│                                 │                   │  React, Node.js]         │
├─────────────────────────────────┼───────────────────┼──────────────────────────┤
│ IELTS - Band 7.5                │ British Council   │ [English Speaking,       │
│ (Expires: 2025-04-10)           │ Ethiopia          │  Writing, Reading]       │
└─────────────────────────────────┴───────────────────┴──────────────────────────┘
```

---

## 3. student_extracurricular_activities

### Purpose
Track clubs, sports, volunteering, leadership roles, and activities

### Schema Diagram
```
┌──────────────────────────────────────────────────────────┐
│       STUDENT_EXTRACURRICULAR_ACTIVITIES                 │
├──────────────────────────────────────────────────────────┤
│ id                          SERIAL PRIMARY KEY           │
│ student_id                  INTEGER → users(id)          │
│ activity_name               VARCHAR(255) NOT NULL        │
│ activity_type               VARCHAR(50) NOT NULL         │
│   ↳ Values: 'club', 'sport', 'volunteer', 'leadership', │
│              'arts', 'music', 'drama', 'debate', 'other' │
│ organization_name           VARCHAR(255)                 │
│ role_position               VARCHAR(255)                 │
│ start_date                  DATE                         │
│ end_date                    DATE (NULL if active)        │
│ is_currently_active         BOOLEAN DEFAULT TRUE         │
│ hours_per_week              DECIMAL(4,1)                 │
│ description                 TEXT                         │
│ achievements                TEXT[] (PostgreSQL array)    │
│ skills_gained               TEXT[] (PostgreSQL array)    │
│ verification_document_url   TEXT (Backblaze B2)          │
│ verification_status         VARCHAR(20) DEFAULT pending  │
│   ↳ Values: 'pending', 'verified', 'rejected'           │
│ is_featured                 BOOLEAN DEFAULT FALSE        │
│ display_order               INTEGER DEFAULT 0            │
│ created_at                  TIMESTAMP                    │
│ updated_at                  TIMESTAMP                    │
└──────────────────────────────────────────────────────────┘

Indexes:
  • idx_extracurricular_student_id (query by student)
  • idx_extracurricular_type (filter by type)
  • idx_extracurricular_verification (filter by status)
  • idx_extracurricular_active (active activities)
  • idx_extracurricular_featured (featured items)
```

### Sample Data
```
┌──────────────────────────┬────────────┬─────────────────┬────────┬──────────────┐
│ Activity                 │ Type       │ Role            │ Status │ Hours/Week   │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ Student Government       │ leadership │ Vice President  │ ENDED  │ 8.0          │
│ Association              │            │                 │        │              │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ Football Club            │ sport      │ Team Captain    │ ACTIVE │ 10.0         │
│                          │            │                 │        │              │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ Ethiopian Red Cross      │ volunteer  │ Volunteer       │ ACTIVE │ 6.0          │
│ Volunteer                │            │ Coordinator     │        │              │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ Drama Club               │ drama      │ Lead Actor &    │ ENDED  │ 5.0          │
│                          │            │ Director        │        │              │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ Environmental            │ club       │ Founding Member │ ACTIVE │ 4.0          │
│ Conservation Club        │            │                 │        │              │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ Debate Society           │ debate     │ Member          │ ACTIVE │ 3.0          │
│                          │            │                 │        │              │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ University Choir         │ music      │ Choir Member    │ ENDED  │ 4.0          │
│                          │            │                 │        │              │
├──────────────────────────┼────────────┼─────────────────┼────────┼──────────────┤
│ Coding Club              │ club       │ Mentor          │ ACTIVE │ 6.0          │
│                          │            │                 │        │              │
└──────────────────────────┴────────────┴─────────────────┴────────┴──────────────┘
```

---

## Verification Workflow

```
┌─────────────┐
│   STUDENT   │
│   Creates   │
│    Item     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Status: PENDING  │
│ (Yellow Badge)   │
└──────┬───────────┘
       │
       │ Optional: Upload Document
       ▼
┌──────────────────────────┐
│ verification_document_url│
│ (Backblaze B2 URL)       │
└──────┬───────────────────┘
       │
       │ Admin Reviews
       ▼
    ┌──────┐
    │ ADMIN│
    └──┬───┘
       │
   ────┴────
  │         │
  ▼         ▼
┌──────┐  ┌──────┐
│VERIFY│  │REJECT│
└──┬───┘  └──┬───┘
   │         │
   ▼         ▼
┌─────────┐ ┌─────────┐
│VERIFIED │ │REJECTED │
│(Green)  │ │ (Red)   │
└─────────┘ └─────────┘
   │
   ▼
┌──────────────────┐
│ Shown on Public  │
│ Profile Pages    │
└──────────────────┘
```

---

## Data Statistics Visual

```
ACHIEVEMENTS (20 total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified:   ████████████████████████████████████████  90% (18)
Pending:    ████                                       10% (2)

CERTIFICATIONS (19 total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified:   ████████████████████████████               68% (13)
Pending:    ████████████                               32% (6)

EXTRACURRICULAR (23 total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified:   ██████████████████████████                 65% (15)
Pending:    ██████████████                             35% (8)

FEATURED ITEMS (24 total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Achievements:     ████████  8
Certifications:   ████████  8
Extracurricular:  ████████  8
```

---

## Sample Complete Student Profile (Visual)

```
╔═══════════════════════════════════════════════════════════╗
║  STUDENT PROFILE - ID: 93                                 ║
╚═══════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────┐
│ 🏆 ACHIEVEMENTS (2)                                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ⭐ National Mathematics Olympiad - First Place           │
│    Type: Competition | Status: ✓ Verified                │
│    Ethiopian Mathematics Society | Dec 2024              │
│    Won first place among Grade 12 students across        │
│    Ethiopia                                               │
│                                                           │
│ ⏳ Dean's List - Fall 2024                                │
│    Type: Honor | Status: ⏳ Pending                       │
│    Jimma University | Nov 2024                            │
│    Recognized for achieving GPA above 3.8                 │
│                                                           │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ 📜 CERTIFICATIONS (1)                                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ⭐ Python Programming Certificate                         │
│    Issued by: Coursera | Status: ✓ Verified              │
│    Issued: Jun 2024 | Credential: CERT-PY-2024-8475      │
│    Skills: [Python] [Data Structures] [Algorithms]       │
│           [Object-Oriented Programming]                   │
│    Completed comprehensive Python programming course      │
│    with hands-on projects                                 │
│                                                           │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ 🎨 EXTRACURRICULAR ACTIVITIES (4)                         │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ⭐ Student Government Association                         │
│    Type: Leadership | Role: Vice President               │
│    Status: ✓ Verified | Duration: ENDED                  │
│    Addis Ababa University | 8 hrs/week                    │
│    Jan 2023 - Jun 2024                                    │
│    Achievements:                                          │
│    • Organized 5 major campus events                      │
│    • Increased student participation by 40%               │
│    Skills: [Leadership] [Public Speaking] [Management]    │
│                                                           │
│ ✓ Football Club                                           │
│    Type: Sport | Role: Team Captain                       │
│    Status: ✓ Verified | Duration: ACTIVE 🟢              │
│    Youth Sports Center | 10 hrs/week                      │
│    Since: Jan 2022                                        │
│    Achievements:                                          │
│    • Won Regional Championship 2023                       │
│    • Top scorer in 2024 season                            │
│    Skills: [Teamwork] [Leadership] [Physical Fitness]     │
│                                                           │
│ ⏳ Ethiopian Red Cross Volunteer                          │
│    Type: Volunteer | Role: Volunteer Coordinator          │
│    Status: ⏳ Pending | Duration: ACTIVE 🟢               │
│    Ethiopian Red Cross Society | 6 hrs/week               │
│    Since: Jan 2023                                        │
│    Achievements:                                          │
│    • Organized 12 blood donation drives                   │
│    • Recruited 150+ new volunteers                        │
│    Skills: [Community Service] [Coordination]             │
│                                                           │
│ ⏳ Debate Society                                          │
│    Type: Debate | Role: Member                            │
│    Status: ⏳ Pending | Duration: ACTIVE 🟢               │
│    Hawassa University | 3 hrs/week                        │
│    Since: May 2023                                        │
│    Achievements:                                          │
│    • Won 3 inter-university debates                       │
│    • Best speaker award twice                             │
│    Skills: [Critical Thinking] [Public Speaking]          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## Legend

### Status Badges
- ✓ Verified (Green) - Admin approved
- ⏳ Pending (Yellow) - Awaiting verification
- ✗ Rejected (Red) - Not approved

### Activity Status
- 🟢 ACTIVE - Currently ongoing
- 🔴 ENDED - Completed/finished

### Featured Items
- ⭐ Featured - Highlighted on profile

### Arrays
- [Skills] - PostgreSQL TEXT[] array
- [Achievements] - PostgreSQL TEXT[] array

---

## Quick Reference Commands

```bash
# Create tables
python migrate_create_student_enhancement_tables.py

# Seed data
python seed_student_enhancements.py

# Verify
python verify_student_tables.py

# Check specific student
psql $DATABASE_URL -c "SELECT * FROM student_achievements WHERE student_id = 93"
```

---

This visual reference provides a quick overview of the three student enhancement tables, their structure, relationships, and sample data.
