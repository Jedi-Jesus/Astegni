# Complete Base Price System - Feature Summary

## Overview

The Astegni admin base price system now includes comprehensive location-based and education-level pricing with automatic GPS detection. This allows admins to set market-appropriate starting prices for new tutors based on country, subject, session format, and education level.

## Complete Feature Set

### 1. Grade Level Range (1-14)
**Documentation:** [BASE_PRICE_GRADE_LEVEL_FEATURE.md](BASE_PRICE_GRADE_LEVEL_FEATURE.md)

- Grades 1-12: K-12 education
- Level 13: University (College, Bachelor's, Master's, PhD)
- Level 14: Certification (Professional certifications, test prep)
- Range-based pricing (e.g., "Grades 9-12", "University only", "All Levels")

### 2. University & Certification Support
**Documentation:** [UNIVERSITY_CERTIFICATION_UPDATE.md](UNIVERSITY_CERTIFICATION_UPDATE.md)

- Expanded grade system from 1-12 to 1-14
- University-specific pricing rules
- Professional certification pricing (CPA, AWS, TOEFL, etc.)
- Mixed-range support (e.g., "Grade 10 - University")

### 3. Country/Location-Based Pricing
**Documentation:** [COUNTRY_LOCATION_PRICING_UPDATE.md](COUNTRY_LOCATION_PRICING_UPDATE.md)

- 10+ supported countries (ET, CM, KE, MX, NG, GH, ZA, EG, TZ, UG)
- Global fallback ('all' for worldwide rules)
- Market-appropriate pricing per country
- Priority matching: Country-specific rules first, then global

### 4. GPS Auto-Detection (NEW)
**Documentation:** [GPS_AUTO_COUNTRY_DETECTION.md](GPS_AUTO_COUNTRY_DETECTION.md)

- Automatic country detection when creating rules
- Browser Geolocation API + Nominatim reverse geocoding
- Real-time status feedback (detecting, success, error)
- Manual override still available
- Intelligent fallbacks for errors

## Database Schema

### base_price_rules Table

```sql
CREATE TABLE base_price_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(200) NOT NULL,
    country VARCHAR(100) DEFAULT 'all',  -- NEW: Country code or 'all'
    subject_category VARCHAR(100) NOT NULL,
    session_format VARCHAR(50) NOT NULL,
    min_grade_level INTEGER DEFAULT 1,  -- NEW: 1-14 range
    max_grade_level INTEGER DEFAULT 14, -- NEW: 1-14 range
    base_price_per_hour NUMERIC(10,2) NOT NULL,
    credential_bonus NUMERIC(10,2) DEFAULT 0,
    experience_bonus_per_year NUMERIC(10,2) DEFAULT 0,  -- NEW: Per-year bonus
    priority INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,

    CONSTRAINT check_grade_level_range
        CHECK (min_grade_level <= max_grade_level
               AND min_grade_level >= 1
               AND max_grade_level <= 14)
);

CREATE INDEX idx_base_price_rules_country ON base_price_rules(country);
```

## Rule Priority Matching

The system matches rules from most specific to least specific:

```
1. Country + Subject + Format + Grade Level  (most specific)
2. Country + Subject + All Formats + Grade Level
3. Country + All Subjects + Format + Grade Level
4. Country + All + All + Grade Level
5. Global (all) + Subject + Format + Grade Level
6. Global (all) + All + All + All Levels  (least specific, ultimate fallback)
```

### Example Matching

**Tutor Profile:**
- Country: Ethiopia (ET)
- Subject: Mathematics
- Format: Online
- Teaching: Grades 9-12

**Rule Matching Order:**
1. ✓ ET + Mathematics + Online + (9-12 within range)
2. ET + Mathematics + All + (9-12 within range)
3. ET + All + Online + (9-12 within range)
4. ET + All + All + (9-12 within range)
5. all + Mathematics + Online + (9-12 within range)
6. all + All + All + (1-14 covers 9-12)

## Complete API Example

### Create Rule Request
```json
POST /api/admin/base-price-rules

{
  "rule_name": "Ethiopia High School Math Online",
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

### Response
```json
{
  "id": 7,
  "rule_name": "Ethiopia High School Math Online",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 9,
  "max_grade_level": 12,
  "base_price_per_hour": 50.0,
  "credential_bonus": 10.0,
  "experience_bonus_per_year": 5.0,
  "priority": 1,
  "is_active": true,
  "created_at": "2026-01-22T12:00:00Z",
  "updated_at": null
}
```

## Pricing Calculation

### Formula
```
Final Price = Base Price
            + (Number of Credentials × Credential Bonus)
            + (Years of Experience × Experience Bonus per Year)
```

### Example Calculation

**Rule:** Ethiopia University Math Online
- Base Price: 100 ETB/hr
- Credential Bonus: 15 ETB/credential
- Experience Bonus: 10 ETB/year

**Tutor A:** 2 credentials, 3 years experience
```
Price = 100 + (2 × 15) + (3 × 10)
      = 100 + 30 + 30
      = 160 ETB/hr
```

**Tutor B:** 5 credentials, 10 years experience
```
Price = 100 + (5 × 15) + (10 × 10)
      = 100 + 75 + 100
      = 275 ETB/hr
```

## Real-World Use Cases

### Use Case 1: Multi-Country Expansion

**Ethiopia (Local Market):**
```json
{
  "rule_name": "Ethiopia K-12 All Subjects",
  "country": "ET",
  "subject_category": "all",
  "session_format": "all",
  "min_grade_level": 1,
  "max_grade_level": 12,
  "base_price_per_hour": 50.0
}
```

**Kenya (Expansion Market):**
```json
{
  "rule_name": "Kenya K-12 All Subjects",
  "country": "KE",
  "subject_category": "all",
  "session_format": "all",
  "min_grade_level": 1,
  "max_grade_level": 12,
  "base_price_per_hour": 600.0  // ~50 USD in KES
}
```

**Global Fallback:**
```json
{
  "rule_name": "Global Default",
  "country": "all",
  "subject_category": "all",
  "session_format": "all",
  "min_grade_level": 1,
  "max_grade_level": 14,
  "base_price_per_hour": 100.0  // USD equivalent
}
```

### Use Case 2: Education Level Specialization

**High School Only:**
```json
{
  "rule_name": "Ethiopia High School STEM",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 9,
  "max_grade_level": 12,
  "base_price_per_hour": 80.0
}
```

**University Only:**
```json
{
  "rule_name": "Ethiopia University STEM",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 13,
  "max_grade_level": 13,
  "base_price_per_hour": 150.0  // Higher for university
}
```

**Professional Certification:**
```json
{
  "rule_name": "Ethiopia AWS Certification Prep",
  "country": "ET",
  "subject_category": "computer_science",
  "session_format": "Online",
  "min_grade_level": 14,
  "max_grade_level": 14,
  "base_price_per_hour": 200.0  // Premium for cert prep
}
```

### Use Case 3: Session Format Differentiation

**Online (Lower Cost):**
```json
{
  "rule_name": "Ethiopia Math Online",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 1,
  "max_grade_level": 14,
  "base_price_per_hour": 60.0
}
```

**In-Person (Higher Cost):**
```json
{
  "rule_name": "Ethiopia Math In-Person",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "In-Person",
  "min_grade_level": 1,
  "max_grade_level": 14,
  "base_price_per_hour": 120.0  // 2x for travel/logistics
}
```

**Hybrid (Medium Cost):**
```json
{
  "rule_name": "Ethiopia Math Hybrid",
  "country": "ET",
  "subject_category": "mathematics",
  "session_format": "Hybrid",
  "min_grade_level": 1,
  "max_grade_level": 14,
  "base_price_per_hour": 90.0  // Between online and in-person
}
```

## GPS Auto-Detection Feature

### User Flow with GPS

1. **Admin clicks "Add Price Rule"**
   - Modal opens instantly
   - Country field defaults to 'all'
   - Status shows: "Detecting location..." (blue spinner)

2. **GPS Detection (1-2 seconds)**
   - Browser requests location permission (first time only)
   - Gets GPS coordinates
   - Reverse geocodes to country
   - Maps country name to code

3. **Success:**
   - Country field updates to detected country (e.g., "ET")
   - Status shows: "✓ Detected: Ethiopia" (green)
   - Admin can proceed or change manually

4. **Fallback:**
   - If GPS fails, stays at 'all'
   - Status shows appropriate error message
   - Admin selects country manually

### Supported GPS Scenarios

| Scenario | Country Field | Status Message | Color |
|----------|---------------|----------------|-------|
| Ethiopia detected | ET | Detected: Ethiopia | Green |
| Kenya detected | KE | Detected: Kenya | Green |
| USA detected (not in list) | all | United States not in pricing regions. Set to Global. | Yellow |
| Permission denied | all | Location permission denied. Please select manually. | Red |
| GPS unavailable | all | Location unavailable. Please select manually. | Yellow |
| Timeout (>10s) | all | Location timeout. Please select manually. | Yellow |
| Edit existing rule | (preserved) | (default message) | Gray |

## Migration History

### Migration 1: Grade Level Range
**File:** `migrate_add_grade_level_to_base_price.py`
- Added `min_grade_level` (default: 1)
- Added `max_grade_level` (default: 12)
- Added constraint: 1 ≤ min ≤ max ≤ 12

### Migration 2: University & Certification
**File:** `migrate_add_university_certification_to_grade_levels.py`
- Dropped old constraint (1-12)
- Added new constraint (1-14)
- Auto-updated existing rules: 1-12 → 1-14

### Migration 3: Experience Bonus
**File:** `migrate_add_experience_bonus_to_base_price.py`
- Added `experience_bonus_per_year` column
- Default: 0 (no bonus)

### Migration 4: Country/Location
**File:** `migrate_add_country_to_base_price.py`
- Added `country` column (default: 'all')
- Created index on country
- Auto-updated existing rules to 'all' (global)

## Frontend Features

### Admin Panel UI

**Rule Card Display:**
```
┌─────────────────────────────────────────────┐
│ Ethiopia High School Math         [Active] │
│                                             │
│ 🌍 Country: Ethiopia                       │
│ 🎓 Subject: Mathematics                    │
│ 💻 Format: Online                          │
│ 📚 Grade Level: Grade 9 - Grade 12        │
│                                             │
│           50 ETB/hr                        │
│                                             │
│   + 10 ETB/credential                      │
│   + 5 ETB/year experience                  │
│                                             │
│    [Edit]           [Delete]               │
└─────────────────────────────────────────────┘
```

### Modal Form

**Country Field with GPS:**
```
Country/Location *  [🌍 Auto-detected from GPS]
[Ethiopia (ET)    ▼]
✓ Detected: Ethiopia
```

**Education Level Range:**
```
Education Level Range *
Min: [Grade 9     ▼]  Max: [Grade 12    ▼]
```

**Price Preview:**
```
Base Price: 50 ETB/hr

With Credentials:
• 1 credential: 60 ETB/hr
• 2 credentials: 70 ETB/hr
• 3 credentials: 80 ETB/hr

With Experience:
• 1 year: 55 ETB/hr
• 3 years: 65 ETB/hr
• 5 years: 75 ETB/hr
```

## Files Changed

### Backend
1. `astegni-backend/app.py modules/admin_models.py` - BasePriceRule model
2. `astegni-backend/base_price_endpoints.py` - API endpoints
3. `astegni-backend/migrate_add_grade_level_to_base_price.py` - Migration
4. `astegni-backend/migrate_add_university_certification_to_grade_levels.py` - Migration
5. `astegni-backend/migrate_add_experience_bonus_to_base_price.py` - Migration
6. `astegni-backend/migrate_add_country_to_base_price.py` - Migration

### Frontend
1. `admin-pages/manage-system-settings.html` - Form UI
2. `admin-pages/js/admin-pages/base-price-manager.js` - CRUD logic + GPS

### Documentation
1. `BASE_PRICE_GRADE_LEVEL_FEATURE.md`
2. `UNIVERSITY_CERTIFICATION_UPDATE.md`
3. `COUNTRY_LOCATION_PRICING_UPDATE.md`
4. `GPS_AUTO_COUNTRY_DETECTION.md`
5. `BASE_PRICE_COMPLETE_SYSTEM.md` (this file)

## Testing Checklist

### Database
- [x] All migrations run successfully
- [x] Constraints enforce valid ranges
- [x] Indexes created for performance
- [x] Existing rules auto-updated

### Backend API
- [x] Create rule with all fields
- [x] Update rule preserves values
- [x] Delete rule works
- [x] Duplicate check includes country
- [x] Grade level validation (min ≤ max)
- [x] Priority matching order

### Frontend
- [x] GPS detection on modal open
- [x] Real-time status updates
- [x] Fallbacks work correctly
- [x] Manual override possible
- [x] Edit mode preserves country
- [x] Grade level dropdowns show 1-14
- [x] Price preview calculates correctly
- [x] Rule cards display all fields

### User Experience
- [x] Modal opens instantly
- [x] GPS detection non-blocking
- [x] Error messages helpful
- [x] Form validation works
- [x] Success/error feedback clear

## Performance Considerations

### GPS Detection
- Non-blocking (doesn't delay modal opening)
- 10-second timeout prevents hanging
- 5-minute cache reduces repeated GPS calls
- Graceful fallback on error

### Database Queries
- Index on `country` column for fast filtering
- Priority sorting in memory (small dataset)
- Matching algorithm optimized for specificity

### Frontend
- No external dependencies
- Uses browser native Geolocation API
- Nominatim API is free and fast
- Status updates via DOM manipulation (no framework)

## Security Considerations

### GPS Privacy
- Requires explicit user permission
- Only used client-side (not sent to server separately)
- Country code stored, not coordinates
- Permission requested per browser security model

### API Security
- Admin authentication required
- Rate limiting on endpoints
- Input validation (Pydantic models)
- SQL injection prevention (SQLAlchemy ORM)

## Future Enhancements

### Potential Additions
1. **Currency Support**: Store prices in local currency with conversion
2. **Time-Based Pricing**: Different rates for weekends/holidays
3. **Bulk Operations**: Import/export rules via CSV
4. **Rule Templates**: Pre-configured rules for common scenarios
5. **Analytics**: Track which rules are used most
6. **A/B Testing**: Test different pricing strategies
7. **Seasonal Adjustments**: Automatic price adjustments by season
8. **More Countries**: Expand to 50+ countries worldwide

## Summary

The base price system is now a comprehensive, location-aware pricing engine with:

- **4 Dimensions**: Country, Subject, Format, Grade Level
- **14 Education Levels**: K-12 + University + Certification
- **10+ Countries**: With automatic GPS detection
- **3 Bonus Types**: Base + Credentials + Experience
- **Smart Matching**: Priority-based rule selection
- **Auto-Detection**: GPS-powered country selection
- **Graceful Fallbacks**: Works even when GPS fails

This enables true international expansion with market-appropriate pricing while maintaining simplicity for admins through GPS automation and intelligent defaults.

---

**Overall Status:** ✅ COMPLETE & PRODUCTION READY
**Last Updated:** 2026-01-22
**Version:** 2.0.0
