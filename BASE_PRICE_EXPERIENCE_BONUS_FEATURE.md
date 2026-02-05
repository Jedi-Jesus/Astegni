# Base Price Experience Bonus Feature

## Overview

The base price rules system now supports **years of experience multiplier** in addition to credential bonuses. This allows admins to set pricing that rewards tutors based on their teaching experience.

## How It Works

### Formula
```
Final Price = Base Price + (Credential Bonus × Number of Credentials) + (Experience Bonus × Years of Experience)
```

### Example
**Rule Configuration:**
- Base Price: 100 ETB/hour
- Credential Bonus: 10 ETB per credential
- Experience Bonus: 5 ETB per year

**Tutor A:** 2 credentials, 3 years experience
```
Price = 100 + (10 × 2) + (5 × 3)
      = 100 + 20 + 15
      = 135 ETB/hour
```

**Tutor B:** 1 credential, 5 years experience
```
Price = 100 + (10 × 1) + (5 × 5)
      = 100 + 10 + 25
      = 135 ETB/hour
```

**Tutor C:** 3 credentials, 0 years experience (new tutor)
```
Price = 100 + (10 × 3) + (5 × 0)
      = 100 + 30 + 0
      = 130 ETB/hour
```

## Database Changes

### Migration Required

**File:** `migrate_add_experience_bonus_to_base_price.py`

**What it does:**
- Adds `experience_bonus_per_year` column to `base_price_rules` table
- Type: `NUMERIC(10, 2)`
- Default: `0`
- NOT NULL constraint

**Run migration:**
```bash
cd astegni-backend
python migrate_add_experience_bonus_to_base_price.py
```

### Updated Schema

**Table:** `base_price_rules` in `astegni_admin_db`

```sql
CREATE TABLE base_price_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(200) NOT NULL,
    subject_category VARCHAR(100) NOT NULL,
    session_format VARCHAR(50) NOT NULL,
    base_price_per_hour NUMERIC(10, 2) NOT NULL,
    credential_bonus NUMERIC(10, 2) DEFAULT 0,
    experience_bonus_per_year NUMERIC(10, 2) DEFAULT 0,  -- NEW FIELD
    priority INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

## Backend Changes

### Models Updated

**File:** `app.py modules/admin_models.py` (line 264)

```python
class BasePriceRule(AdminBase):
    __tablename__ = "base_price_rules"

    # ... existing fields ...
    credential_bonus = Column(Numeric(10, 2), default=0)
    experience_bonus_per_year = Column(Numeric(10, 2), default=0)  # NEW
    # ... rest of fields ...
```

### API Endpoints Updated

**File:** `base_price_endpoints.py`

**Pydantic Models:**
```python
class BasePriceRuleCreate(BaseModel):
    rule_name: str
    subject_category: str
    session_format: str
    base_price_per_hour: float
    credential_bonus: float = 0
    experience_bonus_per_year: float = 0  # NEW
    priority: int = 2
    is_active: bool = True

class BasePriceRuleUpdate(BaseModel):
    # ... fields ...
    experience_bonus_per_year: Optional[float] = None  # NEW

class BasePriceRuleResponse(BaseModel):
    # ... fields ...
    credential_bonus: float
    experience_bonus_per_year: float  # NEW
    # ... rest ...
```

**Create Endpoint:**
```python
@router.post("", response_model=BasePriceRuleResponse)
async def create_base_price_rule(rule_data: BasePriceRuleCreate, db: Session):
    new_rule = BasePriceRule(
        # ... existing fields ...
        credential_bonus=rule_data.credential_bonus,
        experience_bonus_per_year=rule_data.experience_bonus_per_year,  # NEW
        # ... rest ...
    )
```

## Frontend Changes

### HTML Form

**File:** `manage-system-settings.html` (lines 5447-5453)

Added new input field:
```html
<!-- Experience Bonus -->
<div class="mb-4">
    <label class="block text-sm font-semibold mb-2">Experience Bonus (ETB/year)</label>
    <input type="number" id="base-price-experience-bonus"
           class="w-full px-3 py-2 border rounded-lg"
           placeholder="e.g., 5" min="0" step="1" value="0"
           oninput="updateBasePricePreview()">
    <p class="text-xs text-gray-500 mt-1">
        Additional price per year of experience (e.g., 5 years × bonus = 5× bonus)
    </p>
</div>
```

### Preview Section

**File:** `manage-system-settings.html` (lines 5518-5541)

Added experience bonus preview:
```html
<!-- Experience Bonus Preview -->
<div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
    <h5 class="font-semibold text-purple-800 mb-3">
        <i class="fas fa-briefcase mr-1"></i>With Experience
    </h5>
    <div class="space-y-2">
        <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">1 Year:</span>
            <span id="preview-1-year" class="font-semibold text-gray-800">-- ETB/hr</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">3 Years:</span>
            <span id="preview-3-years" class="font-semibold text-gray-800">-- ETB/hr</span>
        </div>
        <div class="flex justify-between items-center border-t border-purple-300 pt-2 mt-2">
            <span class="text-sm font-semibold text-purple-700">5 Years:</span>
            <span id="preview-5-years" class="text-lg font-bold text-purple-700">-- ETB/hr</span>
        </div>
    </div>
    <p class="text-xs text-gray-500 mt-3">
        <i class="fas fa-info-circle mr-1"></i>
        Bonus multiplies by years of experience
    </p>
</div>
```

### JavaScript Updates

**File:** `base-price-manager.js`

**Display in Card (lines 121-136):**
```javascript
${rule.credential_bonus > 0 || rule.experience_bonus_per_year > 0 ? `
    <div class="mt-3 pt-3 border-t border-teal-200 space-y-2">
        ${rule.credential_bonus > 0 ? `
            <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">
                    <i class="fas fa-certificate text-cyan-600 mr-1"></i>Credential Bonus:
                </span>
                <span class="font-semibold text-cyan-700">+${rule.credential_bonus} ETB/credential</span>
            </div>
        ` : ''}
        ${rule.experience_bonus_per_year > 0 ? `
            <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">
                    <i class="fas fa-briefcase text-purple-600 mr-1"></i>Experience Bonus:
                </span>
                <span class="font-semibold text-purple-700">+${rule.experience_bonus_per_year} ETB/year</span>
            </div>
        ` : ''}
    </div>
` : ''}
```

**Form Reset (lines 183-186):**
```javascript
document.getElementById('base-price-credential-bonus').value = '0';
document.getElementById('base-price-experience-bonus').value = '0';  // NEW
```

**Edit Form (line 218):**
```javascript
document.getElementById('base-price-experience-bonus').value = rule.experience_bonus_per_year || 0;
```

**Save Data (line 259):**
```javascript
const ruleData = {
    // ... existing fields ...
    credential_bonus: parseFloat(document.getElementById('base-price-credential-bonus').value) || 0,
    experience_bonus_per_year: parseFloat(document.getElementById('base-price-experience-bonus').value) || 0,
    // ... rest ...
};
```

**Preview Function (lines 330-347):**
```javascript
function updateBasePricePreview() {
    const basePrice = parseFloat(document.getElementById('base-price-amount').value) || 0;
    const credentialBonus = parseFloat(document.getElementById('base-price-credential-bonus').value) || 0;
    const experienceBonus = parseFloat(document.getElementById('base-price-experience-bonus').value) || 0;

    // Base price
    document.getElementById('preview-base-price').textContent =
        basePrice > 0 ? `${basePrice} ETB` : '-- ETB';

    // Credential bonus preview
    document.getElementById('preview-1-credential').textContent =
        basePrice > 0 ? `${basePrice + credentialBonus} ETB/hr` : '-- ETB/hr';
    document.getElementById('preview-2-credentials').textContent =
        basePrice > 0 ? `${basePrice + (credentialBonus * 2)} ETB/hr` : '-- ETB/hr';
    document.getElementById('preview-3-credentials').textContent =
        basePrice > 0 ? `${basePrice + (credentialBonus * 3)} ETB/hr` : '-- ETB/hr';

    // Experience bonus preview (NEW)
    document.getElementById('preview-1-year').textContent =
        basePrice > 0 ? `${basePrice + (experienceBonus * 1)} ETB/hr` : '-- ETB/hr';
    document.getElementById('preview-3-years').textContent =
        basePrice > 0 ? `${basePrice + (experienceBonus * 3)} ETB/hr` : '-- ETB/hr';
    document.getElementById('preview-5-years').textContent =
        basePrice > 0 ? `${basePrice + (experienceBonus * 5)} ETB/hr` : '-- ETB/hr';
}
```

## Usage

### Admin Panel

1. Navigate to System Settings → Pricing Panel
2. Click "Add Price Rule" or edit existing rule
3. Fill in the form:
   - **Base Price:** Starting hourly rate (e.g., 100 ETB)
   - **Credential Bonus:** Additional ETB per credential (e.g., 10 ETB)
   - **Experience Bonus:** Additional ETB per year of experience (e.g., 5 ETB)
4. Preview shows calculated prices:
   - With 1, 2, 3 credentials
   - With 1, 3, 5 years of experience
5. Save the rule

### Example Rule Configurations

**High-Value Subjects (Mathematics, Science):**
```
Base Price: 150 ETB/hour
Credential Bonus: 15 ETB per credential
Experience Bonus: 8 ETB per year
Priority: High

Example: Tutor with Master's degree (2 credentials) + 4 years experience
= 150 + (15 × 2) + (8 × 4)
= 150 + 30 + 32
= 212 ETB/hour
```

**Standard Subjects (Languages, Social Studies):**
```
Base Price: 100 ETB/hour
Credential Bonus: 10 ETB per credential
Experience Bonus: 5 ETB per year
Priority: Medium

Example: Tutor with Bachelor's degree (1 credential) + 2 years experience
= 100 + (10 × 1) + (5 × 2)
= 100 + 10 + 10
= 120 ETB/hour
```

**Entry-Level / Other Subjects:**
```
Base Price: 80 ETB/hour
Credential Bonus: 8 ETB per credential
Experience Bonus: 3 ETB per year
Priority: Low

Example: New tutor with Bachelor's degree (1 credential) + 0 years experience
= 80 + (8 × 1) + (3 × 0)
= 80 + 8 + 0
= 88 ETB/hour
```

## Testing

### Steps to Test

1. **Run migration:**
   ```bash
   cd astegni-backend
   python migrate_add_experience_bonus_to_base_price.py
   ```

2. **Restart backend:**
   ```bash
   python app.py  # Port 8001
   ```

3. **Open admin panel:**
   - Navigate to System Settings → Pricing
   - Create new rule with experience bonus
   - Verify preview calculations are correct
   - Save and verify data persists

4. **Verify database:**
   ```sql
   SELECT * FROM base_price_rules;
   -- Should show experience_bonus_per_year column
   ```

5. **Test API:**
   ```bash
   curl http://localhost:8001/api/admin/base-price-rules
   # Response should include experience_bonus_per_year field
   ```

## Files Modified

### Backend
- ✅ `astegni-backend/app.py modules/admin_models.py` (line 264)
- ✅ `astegni-backend/base_price_endpoints.py` (lines 29, 40, 52, 129)
- ✅ `astegni-backend/migrate_add_experience_bonus_to_base_price.py` (new file)

### Frontend
- ✅ `admin-pages/manage-system-settings.html` (lines 5447-5453, 5518-5541)
- ✅ `admin-pages/js/admin-pages/base-price-manager.js` (lines 121-136, 186, 218, 259, 330-347)

## Migration Status

- [ ] Run migration script
- [ ] Restart backend server
- [ ] Test rule creation
- [ ] Test rule editing
- [ ] Verify preview calculations
- [ ] Test API responses

## Benefits

1. **Rewards Experience:** Tutors with more teaching experience get higher base prices
2. **Flexible Pricing:** Admins can balance credentials vs. experience based on subject
3. **Fair Compensation:** Both formal education (credentials) and practical experience valued
4. **Market Competitive:** Can adjust experience bonus to match market rates
5. **Transparent Calculation:** Clear formula visible in preview

## Notes

- Experience bonus multiplies by years (e.g., 5 ETB × 3 years = 15 ETB)
- Credential bonus remains per credential (e.g., 10 ETB × 2 credentials = 20 ETB)
- Both bonuses stack with base price
- Setting bonus to 0 disables that bonus type
- Preview updates in real-time as values change
