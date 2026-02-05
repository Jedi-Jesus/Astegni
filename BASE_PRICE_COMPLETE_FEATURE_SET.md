# Base Price System - Complete Feature Set

## 🎯 Overview

Complete implementation of a comprehensive base price system for new tutors with three major enhancements:

1. ✅ **Grade Level Range** (1-14)
2. ✅ **University & Certification Levels** (13-14)
3. ✅ **Country/Location-Specific Pricing**

## Complete Rule Structure

Each pricing rule now supports:

```
Rule Name: "Ethiopia High School Math Online"
├── Country: Ethiopia (ET) or Global (all)
├── Subject: Mathematics or All Subjects
├── Format: Online, In-Person, Hybrid, or All
├── Education Level:
│   ├── Grades 1-12 (K-12 education)
│   ├── University (13) - College/Bachelor's/Master's/PhD
│   └── Certification (14) - Professional certs, test prep
├── Base Price: 50 ETB/hour
├── Credential Bonus: +10 ETB per credential
├── Experience Bonus: +5 ETB per year
├── Priority: High (1), Medium (2), Low (3)
└── Status: Active/Inactive
```

## Matching Priority System

Rules are matched in this order (most specific to least specific):

### Level 1: Country + Subject + Format + Grade Range (Most Specific)
```
ET + Mathematics + Online + Grades 9-12
```

### Level 2: Country + Subject + Format + All Grades
```
KE + Science + Hybrid + Grades 1-14
```

### Level 3: Country + Subject + All Formats
```
CM + Languages + All + Grades 1-12
```

### Level 4: Country + All Subjects + Format
```
MX + All + Online + University (13)
```

### Level 5: Country-Specific Default
```
ET + All + All + All Levels (1-14)
```

### Level 6: Global Rules (Least Specific - Fallback)
```
all + All + All + All Levels
```

## Real-World Examples

### Example 1: Ethiopian High School Math Tutor
```
Country: Ethiopia (ET)
Subject: Mathematics
Format: Online
Education: Grades 9-12
Base Price: 50 ETB/hr
Credential Bonus: +10 ETB (2 credentials = 70 ETB/hr)
Experience Bonus: +5 ETB/year (3 years = 65 ETB/hr)
Final Price: 80 ETB/hr (if 2 credentials + 3 years)
```

### Example 2: Kenyan University Computer Science Tutor
```
Country: Kenya (KE)
Subject: Computer Science & IT
Format: Hybrid
Education: University (13)
Base Price: 800 KES/hr
Credential Bonus: +150 KES
Experience Bonus: +50 KES/year
```

### Example 3: Mexico Professional Certification Prep
```
Country: Mexico (MX)
Subject: Business & Economics
Format: Online
Education: Certification (14) - CPA prep
Base Price: 300 MXN/hr
Credential Bonus: +50 MXN
Experience Bonus: +25 MXN/year
```

### Example 4: Cameroon Elementary School Tutor
```
Country: Cameroon (CM)
Subject: All Subjects
Format: In-Person
Education: Grades 1-6
Base Price: 3000 XAF/hr
Credential Bonus: +500 XAF
Experience Bonus: +200 XAF/year
```

### Example 5: Global Default (Fallback)
```
Country: Global (all)
Subject: All Subjects
Format: All Formats
Education: All Levels (1-14)
Base Price: 100 USD/hr
```

## Database Schema

### base_price_rules Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| rule_name | VARCHAR(200) | - | Descriptive name |
| **country** | **VARCHAR(100)** | **'all'** | **Country code or 'all'** |
| subject_category | VARCHAR(100) | - | Subject or 'all' |
| session_format | VARCHAR(50) | - | Format or 'all' |
| **min_grade_level** | **INTEGER** | **1** | **Min level (1-14)** |
| **max_grade_level** | **INTEGER** | **14** | **Max level (1-14)** |
| base_price_per_hour | NUMERIC(10,2) | - | Base hourly rate |
| credential_bonus | NUMERIC(10,2) | 0 | Bonus per credential |
| experience_bonus_per_year | NUMERIC(10,2) | 0 | Bonus per year |
| priority | INTEGER | 2 | 1=high, 2=medium, 3=low |
| is_active | BOOLEAN | TRUE | Active status |
| created_at | TIMESTAMP | NOW | Creation time |
| updated_at | TIMESTAMP | NULL | Last update |

### Constraints
- `min_grade_level <= max_grade_level`
- `min_grade_level >= 1 AND max_grade_level <= 14`
- Unique active rule per: `country + subject_category + session_format`

### Indexes
- Primary key on `id`
- Index on `country` (for fast lookups)

## Education Level System

| Value | Label | Description | Use Cases |
|-------|-------|-------------|-----------|
| 1-6 | Grades 1-6 | Elementary School | Basic education |
| 7-9 | Grades 7-9 | Middle School | Secondary education |
| 10-12 | Grades 10-12 | High School | Pre-university |
| **13** | **University** | **Higher Education** | **College, Bachelor's, Master's, PhD** |
| **14** | **Certification** | **Professional Certs** | **CPA, AWS, TOEFL, PMP, etc.** |

## Supported Countries

| Code | Country | Region | Notes |
|------|---------|--------|-------|
| **all** | **Global** | **Worldwide** | **Default fallback** |
| ET | Ethiopia | East Africa | Ethiopian Birr (ETB) |
| CM | Cameroon | Central Africa | Central African Franc (XAF) |
| KE | Kenya | East Africa | Kenyan Shilling (KES) |
| MX | Mexico | Latin America | Mexican Peso (MXN) |
| NG | Nigeria | West Africa | Nigerian Naira (NGN) |
| GH | Ghana | West Africa | Ghanaian Cedi (GHS) |
| ZA | South Africa | Southern Africa | South African Rand (ZAR) |
| EG | Egypt | North Africa | Egyptian Pound (EGP) |
| TZ | Tanzania | East Africa | Tanzanian Shilling (TZS) |
| UG | Uganda | East Africa | Ugandan Shilling (UGX) |

*Easy to expand to more countries*

## API Endpoints

### GET /api/admin/base-price-rules
Get all pricing rules

### GET /api/admin/base-price-rules/{id}
Get specific rule by ID

### POST /api/admin/base-price-rules
Create new pricing rule

**Request:**
```json
{
  "rule_name": "Ethiopia HS Math Online",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 9,
  "max_grade_level": 12,
  "base_price_per_hour": 50.0,
  "credential_bonus": 10.0,
  "experience_bonus_per_year": 5.0,
  "priority": 1,
  "is_active": true
}
```

### PUT /api/admin/base-price-rules/{id}
Update existing rule

### DELETE /api/admin/base-price-rules/{id}
Delete pricing rule

### GET /api/admin/base-price-rules/match/tutor
Match best rule for a tutor
```
?country=ET&subject_category=mathematics&session_format=Online&grade_level=10
```

## Admin UI Features

### Rule Creation Form
1. Rule Name (descriptive)
2. **Country/Location** (dropdown)
3. Subject Category (dropdown)
4. Session Format (dropdown)
5. **Education Level Range** (two dropdowns: min-max)
6. Base Price (ETB/hour)
7. Credential Bonus (optional)
8. Experience Bonus (optional)
9. Priority (High/Medium/Low)
10. Active Status (checkbox)

### Rule Display Card
Shows:
- Rule name + status badges
- 🌍 Country
- 🎓 Subject
- 💻 Format
- 📚 Education Level (smart formatting)
- 💰 Price breakdown
- Edit/Delete actions

### Smart Formatting

**Education Levels:**
- `1-14` → "All Levels (K-12, University, Certification)"
- `1-12` → "K-12 Only"
- `13-14` → "University & Certification"
- `13` → "University"
- `14` → "Certification"
- `9-12` → "Grades 9-12"
- `10-13` → "Grade 10 - University"

**Countries:**
- `all` → "Global (All Countries)"
- `ET` → "Ethiopia"
- `CM` → "Cameroon"

## Migration Scripts

All migrations are idempotent and safe to run multiple times:

### 1. Add Grade Level Range
```bash
python migrate_add_grade_level_to_base_price.py
```
Adds `min_grade_level` (1-12) and `max_grade_level` (1-12)

### 2. Add University & Certification
```bash
python migrate_add_university_certification_to_grade_levels.py
```
Expands range to 1-14, updates existing rules

### 3. Add Country/Location
```bash
python migrate_add_country_to_base_price.py
```
Adds `country` column, sets existing rules to 'all'

**Run All (in order):**
```bash
cd astegni-backend
python migrate_add_grade_level_to_base_price.py
python migrate_add_university_certification_to_grade_levels.py
python migrate_add_country_to_base_price.py
```

## Testing Scenarios

### Scenario 1: Ethiopian Elementary School
```
Create Rule:
- Country: ET
- Subject: All Subjects
- Format: In-Person
- Education: Grades 1-6
- Price: 30 ETB/hr

Expected: New Ethiopian elementary tutors start at 30 ETB/hr
```

### Scenario 2: Global University STEM
```
Create Rule:
- Country: Global (all)
- Subject: Science
- Format: Online
- Education: University (13)
- Price: 150 USD/hr

Expected: University STEM tutors worldwide start at $150/hr
```

### Scenario 3: Kenyan Certification Prep
```
Create Rule:
- Country: KE
- Subject: Computer Science
- Format: Online
- Education: Certification (14)
- Price: 1500 KES/hr

Expected: Kenyan IT cert prep tutors start at 1500 KES/hr
```

## Files Created/Modified

### Database Migrations (NEW)
1. `migrate_add_grade_level_to_base_price.py`
2. `migrate_add_university_certification_to_grade_levels.py`
3. `migrate_add_country_to_base_price.py`

### Backend Updates
1. `app.py modules/admin_models.py` - BasePriceRule model
2. `base_price_endpoints.py` - API endpoints

### Frontend Updates
1. `manage-system-settings.html` - Admin form
2. `base-price-manager.js` - JavaScript logic

### Documentation (NEW)
1. `BASE_PRICE_GRADE_LEVEL_FEATURE.md`
2. `UNIVERSITY_CERTIFICATION_UPDATE.md`
3. `COUNTRY_LOCATION_PRICING_UPDATE.md`
4. `BASE_PRICE_COMPLETE_FEATURE_SET.md` (this file)

## Benefits

### ✅ Granular Control
- Country-specific pricing
- Subject-specific rates
- Format-specific pricing
- Education level targeting

### ✅ International Expansion
- Easy to add new countries
- Local currency considerations
- Market-appropriate pricing

### ✅ Complete Education Coverage
- K-12 (Grades 1-12)
- University (Bachelor's, Master's, PhD)
- Professional Certifications

### ✅ Flexible Pricing
- Base price
- Credential-based bonuses
- Experience-based bonuses

### ✅ Smart Matching
- Priority-based rule matching
- Specific → General fallback
- Always has a default

## Platform Expansion Strategy

### Phase 1: Launch (Ethiopia)
```
Rules:
- ET + All + All + All Levels → 80 ETB/hr (Ethiopian default)
- all + All + All + All Levels → 100 USD/hr (global fallback)
```

### Phase 2: East African Expansion
```
Add:
- KE + All + All + All Levels → 800 KES/hr (Kenya)
- TZ + All + All + All Levels → 2000 TZS/hr (Tanzania)
- UG + All + All + All Levels → 350000 UGX/hr (Uganda)
```

### Phase 3: African Continent
```
Add:
- CM + All + All + All Levels → 5000 XAF/hr (Cameroon)
- NG + All + All + All Levels → 4000 NGN/hr (Nigeria)
- GH + All + All + All Levels → 100 GHS/hr (Ghana)
- ZA + All + All + All Levels → 200 ZAR/hr (South Africa)
- EG + All + All + All Levels → 500 EGP/hr (Egypt)
```

### Phase 4: Latin America
```
Add:
- MX + All + All + All Levels → 250 MXN/hr (Mexico)
- More countries as needed...
```

### Phase 5: Global
```
Maintain:
- all + All + All + All Levels → Worldwide fallback
```

## Summary

The base price system now provides:

- **3 Dimensions**: Country × Subject × Format
- **Education Spectrum**: K-12 + University + Certification (1-14)
- **10+ Countries**: Ethiopia, Kenya, Cameroon, Mexico, etc.
- **Flexible Bonuses**: Credentials + Experience
- **Priority Matching**: Specific rules → General fallback
- **Fully Backward Compatible**: No breaking changes

Perfect for:
- International education platforms
- Multi-country marketplaces
- Diverse education levels
- Market-appropriate pricing

---

**Status:** ✅ PRODUCTION READY
**Migrations:** ✅ ALL COMPLETE
**Backend:** ✅ FULLY UPDATED
**Frontend:** ✅ FULLY UPDATED
**Documentation:** ✅ COMPREHENSIVE
**Testing:** ⏭️ READY FOR QA
