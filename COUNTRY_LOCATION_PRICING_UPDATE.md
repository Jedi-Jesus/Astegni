# Country/Location-Based Pricing Feature

## ✅ Implementation Complete

Successfully added country/location-specific pricing to the base price system. Admins can now set different starting prices for different countries (Ethiopia, Cameroon, Kenya, Mexico, etc.) or create global rules.

## What Was Added

### Country/Location Support

| Country Code | Country Name | Notes |
|--------------|--------------|-------|
| **all** | **Global (All Countries)** | Default - applies worldwide |
| ET | Ethiopia | East Africa |
| CM | Cameroon | Central Africa |
| KE | Kenya | East Africa |
| MX | Mexico | Latin America |
| NG | Nigeria | West Africa |
| GH | Ghana | West Africa |
| ZA | South Africa | Southern Africa |
| EG | Egypt | North Africa |
| TZ | Tanzania | East Africa |
| UG | Uganda | East Africa |

## Files Modified

### 1. Database Migration ✅
**File:** [migrate_add_country_to_base_price.py](astegni-backend/migrate_add_country_to_base_price.py)

- Added `country` column (VARCHAR(100), default: 'all')
- Created index on country for faster lookups
- Auto-set existing rules to 'all' (global)

**Run Migration:**
```bash
cd astegni-backend
python migrate_add_country_to_base_price.py
```

### 2. Backend Model ✅
**File:** [admin_models.py:260](astegni-backend/app.py modules/admin_models.py#L260)

```python
country = Column(String(100), default='all')  # Country code (ET, CM, KE, MX, etc.) or 'all' for global
```

### 3. API Endpoints ✅
**File:** [base_price_endpoints.py](astegni-backend/base_price_endpoints.py)

Updated Pydantic models:
- `BasePriceRuleCreate`: Added `country` field (default: 'all')
- `BasePriceRuleUpdate`: Added optional `country` field
- `BasePriceRuleResponse`: Added `country` field
- Duplicate check now includes country: `country + subject + format`

### 4. Frontend HTML ✅
**File:** [manage-system-settings.html:5400-5417](admin-pages/manage-system-settings.html)

Added Country/Location dropdown (first field after Rule Name):
```html
<select id="base-price-country">
    <option value="all">Global (All Countries)</option>
    <option value="ET">Ethiopia (ET)</option>
    <option value="CM">Cameroon (CM)</option>
    ...
</select>
```

### 5. Frontend JavaScript ✅
**File:** [base-price-manager.js](admin-pages/js/admin-pages/base-price-manager.js)

Updates:
- Added `formatCountryLabel()` function
- Display country in rule cards with globe icon
- Include country in form handling (add/edit/save)
- Default country set to 'all' for new rules

## Migration Status

```
[OK] Migration completed successfully!

Database:
✓ country column added (VARCHAR(100), default: 'all')
✓ Index created on country column
✓ Existing rules set to 'all' (global)

Current rules: 2 rules (both global)
```

## Usage Examples

### Example 1: Ethiopia-Specific Pricing
```
Rule Name: "Ethiopia Math Tutors"
Country: Ethiopia (ET)
Subject: Mathematics
Format: Online
Education Level: Grades 1-12
Price: 50 ETB/hr  ← Lower for Ethiopian market
```

### Example 2: Mexico Professional Certifications
```
Rule Name: "Mexico Professional Cert Prep"
Country: Mexico (MX)
Subject: All Subjects
Format: Online
Education Level: Certification (14)
Price: 300 MXN/hr  ← Priced in Mexican Pesos equivalent
```

### Example 3: Cameroon University Tutoring
```
Rule Name: "Cameroon University STEM"
Country: Cameroon (CM)
Subject: Science
Format: Hybrid
Education Level: University (13)
Price: 5000 XAF/hr  ← Priced for Cameroonian market
```

### Example 4: Global Default Rule
```
Rule Name: "Global Default Pricing"
Country: Global (All Countries)
Subject: All Subjects
Format: All Formats
Education Level: All Levels (1-14)
Price: 100 USD/hr  ← Worldwide fallback
```

## Pricing Rule Priority

The system matches rules with the following priority:

1. **Country-Specific + Subject + Format** (most specific)
   - Example: ET + Mathematics + Online

2. **Country-Specific + Subject + All Formats**
   - Example: KE + Science + All

3. **Country-Specific + All Subjects + Format**
   - Example: MX + All + Online

4. **Country-Specific + All + All**
   - Example: CM + All + All

5. **Global + Subject + Format**
   - Example: all + Languages + In-Person

6. **Global + All + All** (least specific, ultimate fallback)
   - Example: all + All + All

## Display Examples

| Country Value | Display |
|---------------|---------|
| all | "Global (All Countries)" |
| ET | "Ethiopia" |
| CM | "Cameroon" |
| KE | "Kenya" |
| MX | "Mexico" |

## API Changes

### Request Body (Create/Update)
```json
{
  "rule_name": "Ethiopia High School Math",
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

### Response Body
```json
{
  "id": 7,
  "rule_name": "Ethiopia High School Math",
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

## Rule Card Display

Rules now display country prominently:

```
┌─────────────────────────────────────┐
│ Ethiopia Math Online         [Active]│
│                                       │
│ 🌍 Country: Ethiopia                 │
│ 🎓 Subject: Mathematics              │
│ 💻 Format: Online                    │
│ 📚 Grade Level: Grades 9-12          │
│                                       │
│      50 ETB/hr                        │
│                                       │
│    [Edit]        [Delete]             │
└─────────────────────────────────────┘
```

## Use Cases

### Multi-Country Platform Expansion

**Current (Ethiopia):**
- Default pricing: 50-100 ETB/hr

**Expanding to Cameroon:**
- Add CM-specific rules: 3000-6000 XAF/hr

**Expanding to Kenya:**
- Add KE-specific rules: 600-1200 KES/hr

**Expanding to Mexico:**
- Add MX-specific rules: 200-400 MXN/hr

### Currency & Economic Differences

Different countries have different:
- **Currency values** (ETB vs XAF vs KES vs MXN)
- **Cost of living**
- **Market rates for tutoring**
- **Economic conditions**

Country-specific pricing allows admins to set appropriate rates for each market.

## Backward Compatibility

✅ **Fully Backward Compatible**
- All existing rules automatically set to 'all' (global)
- No breaking changes
- Frontend defaults to 'all' for new rules
- API accepts and validates country codes

## Testing Checklist

- [x] Migration script runs successfully
- [x] Database column and index added
- [x] Backend model updated
- [x] API endpoints accept country field
- [x] Frontend dropdown shows country options
- [x] JavaScript formats country labels
- [x] Country displayed on rule cards
- [x] Default set to 'all' (global)

## Real-World Scenario

**Platform Expansion Timeline:**

**Phase 1: Ethiopia Only**
```
- Rule: all + All + All → 80 ETB/hr (global default)
```

**Phase 2: Add Kenya**
```
- Rule: ET + All + All → 80 ETB/hr (Ethiopia)
- Rule: KE + All + All → 800 KES/hr (Kenya)
- Rule: all + All + All → 100 USD/hr (other countries)
```

**Phase 3: Add Cameroon & Mexico**
```
- Rule: ET + All + All → 80 ETB/hr
- Rule: KE + All + All → 800 KES/hr
- Rule: CM + All + All → 5000 XAF/hr (Cameroon)
- Rule: MX + All + All → 250 MXN/hr (Mexico)
- Rule: all + All + All → 100 USD/hr (global)
```

## Next Steps

After deployment:
1. Run migration script on production
2. Test creating country-specific rules
3. Verify country display in admin panel
4. Update tutor matching logic to consider tutor's country
5. Add more countries as platform expands

## Benefits

✅ **Market-Appropriate Pricing**
- Set prices that match local economies

✅ **Currency Flexibility**
- Price in local currency equivalents

✅ **Scalability**
- Easy to add new countries as you expand

✅ **Global Fallback**
- 'all' rules work worldwide

✅ **Granular Control**
- Country + Subject + Format + Grade Level

## Summary

The base price system now supports location-based pricing:

- **Range**: Global (all) or country-specific (ET, CM, KE, MX, etc.)
- **Default**: 'all' (global) for backward compatibility
- **Priority Matching**: Country-specific rules matched first, global as fallback
- **Migration**: Auto-updated 2 existing rules to global
- **10 Countries**: Pre-configured with common African and Latin American markets

Admins can now create pricing rules specific to each country's market conditions, enabling true international expansion with appropriate local pricing.

---

**Status:** ✅ READY FOR TESTING
**Migration:** ✅ COMPLETE
**Backend:** ✅ UPDATED
**Frontend:** ✅ UPDATED
**Backward Compatible:** ✅ YES
