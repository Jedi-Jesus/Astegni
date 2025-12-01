# Partner "Other" Type Enhancement

## Summary
Added dynamic text field that appears when "Other" is selected in partnership type, allowing users to specify their custom partnership type.

## What Was Added

### 1. ✅ Conditional Text Field in HTML
**Location:** [index.html](index.html:1261-1265)

```html
<!-- Shows/hides based on partnership type selection -->
<div class="form-group" id="other-partner-type-container" style="display: none;">
    <input type="text" id="other-partner-type" placeholder=" ">
    <label>Please specify partnership type</label>
</div>
```

### 2. ✅ Toggle Function in JavaScript
**Location:** [js/index/partner.js](js/index/partner.js:137-150)

```javascript
window.toggleOtherPartnerType = function(value) {
    const otherContainer = document.getElementById('other-partner-type-container');
    const otherInput = document.getElementById('other-partner-type');

    if (value === 'other') {
        otherContainer.style.display = 'block';
        otherInput.required = true;
    } else {
        otherContainer.style.display = 'none';
        otherInput.required = false;
        otherInput.value = ''; // Clear when hidden
    }
};
```

### 3. ✅ Form Submission Updates
**Location:** [js/index/partner.js](js/index/partner.js:202-233)

**Added:**
- Collects `otherPartnerType` value
- Validates that "Other" type is specified if selected
- Sends both `partnership_type` (actual value) and `partnership_type_category` (category)

```javascript
// If "Other" is selected, make sure they specified the type
if (partnershipType === 'other' && !otherPartnerType) {
    alert('Please specify your partnership type');
    return;
}

// Determine the final partnership type value
const finalPartnershipType = partnershipType === 'other' ? otherPartnerType : partnershipType;

formData.append('partnership_type', finalPartnershipType);
formData.append('partnership_type_category', partnershipType);
```

### 4. ✅ Reset Function Update
**Location:** [js/index/partner.js](js/index/partner.js:173-180)

Resets the "Other" field when success modal is closed:

```javascript
// Hide the "Other" partnership type field
const otherContainer = document.getElementById('other-partner-type-container');
const otherInput = document.getElementById('other-partner-type');
if (otherContainer) {
    otherContainer.style.display = 'none';
    otherInput.required = false;
    otherInput.value = '';
}
```

### 5. ✅ Backend API Update
**Location:** [astegni-backend/partner_request_endpoints.py](astegni-backend/partner_request_endpoints.py:30-83)

**Updated endpoint parameters:**
```python
async def create_partner_request(
    ...
    partnership_type: str = Form(...),  # Actual type (custom if "other")
    partnership_type_category: str = Form(...),  # Category: 'educational_institution', 'technology', 'other'
    ...
):
```

**Validation:**
```python
if partnership_type_category not in ['educational_institution', 'technology', 'other']:
    raise HTTPException(status_code=400, detail="Invalid partnership type category")

if not partnership_type:
    raise HTTPException(status_code=400, detail="Partnership type is required")
```

### 6. ✅ Database Migration
**Location:** [astegni-backend/migrate_add_partnership_type_category.py](astegni-backend/migrate_add_partnership_type_category.py)

Adds `partnership_type_category` column to existing `partner_requests` table.

## How It Works

### User Flow

#### Scenario 1: Pre-defined Type (Educational Institution or Technology)
1. User selects "Educational Institution" or "Technology Partner"
2. No additional field appears
3. Form submits with:
   - `partnership_type`: "educational_institution"
   - `partnership_type_category`: "educational_institution"

#### Scenario 2: Custom Type (Other)
1. User selects "Other" from dropdown
2. Text field appears: "Please specify partnership type"
3. User enters custom type: "Content Provider"
4. Form submits with:
   - `partnership_type`: "Content Provider" (custom text)
   - `partnership_type_category`: "other" (category)

### Database Storage

**Table: partner_requests**

| Field | Educational Institution | Technology Partner | Other (Content Provider) |
|-------|-------------------------|--------------------|-----------------------------|
| partnership_type | educational_institution | technology | Content Provider |
| partnership_type_category | educational_institution | technology | other |

### Example Submissions

#### Example 1: Educational Institution
```json
{
  "company_name": "Addis Ababa University",
  "partnership_type": "educational_institution",
  "partnership_type_category": "educational_institution"
}
```

#### Example 2: Technology Partner
```json
{
  "company_name": "Tech Solutions Ethiopia",
  "partnership_type": "technology",
  "partnership_type_category": "technology"
}
```

#### Example 3: Other (Custom)
```json
{
  "company_name": "EduContent Publishers",
  "partnership_type": "Content Provider",
  "partnership_type_category": "other"
}
```

## Setup Instructions

### 1. Run Database Migration (If partner_requests table already exists)
```bash
cd astegni-backend
python migrate_add_partnership_type_category.py
```

**Expected Output:**
```
================================================================================
ADD PARTNERSHIP_TYPE_CATEGORY COLUMN MIGRATION
================================================================================
Adding partnership_type_category column to partner_requests table...
✅ Successfully added partnership_type_category column!

📋 Updated columns:
--------------------------------------------------------------------------------
Column                         Type                 Max Length      Nullable
--------------------------------------------------------------------------------
partnership_type               character varying    50              NO
partnership_type_category      character varying    50              NO
--------------------------------------------------------------------------------

✅ Migration completed successfully!
```

### 2. Or Run Fresh Migration (If starting from scratch)
```bash
cd astegni-backend
python migrate_create_partner_requests_table.py
python migrate_add_partnership_type_category.py
```

### 3. Test the Feature
1. Open http://localhost:8080
2. Click "Become a Partner"
3. Select "Other" from Partnership Type dropdown
4. Verify text field appears
5. Enter custom type (e.g., "Content Provider")
6. Submit form
7. Verify success modal shows

## Testing Guide

### Test Case 1: Select "Other" - Field Appears
1. Open partner modal
2. Select "Other" from Partnership Type
3. **Verify:** Text field appears with label "Please specify partnership type"
4. **Verify:** Field is marked as required

### Test Case 2: Enter Custom Type
1. Select "Other"
2. Enter custom type: "Content Provider"
3. Fill remaining fields
4. Submit
5. **Verify:** Success modal appears
6. **Verify:** Database has `partnership_type = "Content Provider"` and `partnership_type_category = "other"`

### Test Case 3: Switch from "Other" to Pre-defined
1. Select "Other"
2. Enter custom type: "Something"
3. Switch to "Technology Partner"
4. **Verify:** Text field disappears
5. **Verify:** Custom type value is cleared
6. Submit
7. **Verify:** Database has `partnership_type = "technology"` and `partnership_type_category = "technology"`

### Test Case 4: Validation - Other Without Specification
1. Select "Other"
2. Leave text field empty
3. Try to submit
4. **Verify:** Alert appears: "Please specify your partnership type"
5. **Verify:** Form does not submit

### Test Case 5: Form Reset
1. Select "Other"
2. Enter custom type
3. Submit successfully
4. Success modal appears
5. Click "Got it, thanks!"
6. Reopen partner modal
7. **Verify:** Partnership type is reset to default
8. **Verify:** "Other" text field is hidden

## Database Query Examples

### Get All "Other" Partnerships
```sql
SELECT company_name, partnership_type, partnership_type_category
FROM partner_requests
WHERE partnership_type_category = 'other';
```

**Result:**
```
company_name              | partnership_type      | partnership_type_category
--------------------------|-----------------------|--------------------------
EduContent Publishers     | Content Provider      | other
Learning Tech Inc         | EdTech Solution       | other
Digital Library Co        | Digital Resources     | other
```

### Get Partnership Type Distribution
```sql
SELECT
    partnership_type_category as category,
    COUNT(*) as count
FROM partner_requests
GROUP BY partnership_type_category
ORDER BY count DESC;
```

**Result:**
```
category                  | count
--------------------------|------
educational_institution   | 15
technology                | 8
other                     | 5
```

### Get Custom Partnership Types
```sql
SELECT
    partnership_type,
    COUNT(*) as count
FROM partner_requests
WHERE partnership_type_category = 'other'
GROUP BY partnership_type
ORDER BY count DESC;
```

**Result:**
```
partnership_type          | count
--------------------------|------
Content Provider          | 2
EdTech Solution           | 1
Digital Resources         | 1
Learning Platform         | 1
```

## Benefits

### 1. ✅ Flexibility
- Users can specify any partnership type not covered by pre-defined options
- No need to constantly update dropdown options

### 2. ✅ Data Organization
- `partnership_type_category` allows filtering by broad categories
- `partnership_type` stores specific partnership details
- Easy to analyze both general and specific partnership types

### 3. ✅ User Experience
- Clean UI - field only appears when needed
- Clear validation messages
- Automatic form reset

### 4. ✅ Admin Benefits
- Can filter by category (educational_institution, technology, other)
- Can see specific custom types entered by users
- Can identify trending partnership types in "other" category

## Success Criteria ✅

- ✅ Text field appears when "Other" is selected
- ✅ Text field is required when "Other" is selected
- ✅ Text field hides when switching to pre-defined type
- ✅ Custom type value is cleared when field hides
- ✅ Form validates that "Other" type is specified
- ✅ Both category and actual type are sent to backend
- ✅ Database stores both fields correctly
- ✅ Form resets properly after submission
- ✅ Migration adds new column to existing table

## Future Enhancements (Optional)

1. **Admin Dashboard - Trending Types**
   - Show most common custom partnership types in "other" category
   - Suggest promoting popular custom types to pre-defined options

2. **Autocomplete for "Other"**
   - Show previously entered custom types as suggestions
   - Help users find existing similar partnerships

3. **Category Icons**
   - Add icons next to partnership types
   - Visual distinction between categories

4. **Type Validation**
   - Prevent duplicate custom types (case-insensitive)
   - Suggest existing similar types when user types
