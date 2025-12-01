# Parent Profile Hero Fields Implementation

## Summary

Added `hero_title` (array) and `hero_subtitle` (string) fields to the `parent_profiles` table to support hero section content on parent profile pages.

## Changes Made

### 1. Database Migration
**File:** `astegni-backend/migrate_add_parent_hero_fields.py`

- Added `hero_title` column as TEXT[] (PostgreSQL array) with default empty array
- Added `hero_subtitle` column as TEXT with nullable default
- Migration includes verification and sample usage examples

**Run Migration:**
```bash
cd astegni-backend
python migrate_add_parent_hero_fields.py
```

### 2. SQLAlchemy Model Update
**File:** `astegni-backend/app.py modules/models.py`

Added to `ParentProfile` class (lines 245-247):
```python
# Hero Section
hero_title = Column(ARRAY(String), default=[])  # Array of hero title lines
hero_subtitle = Column(Text)  # Single hero subtitle
```

### 3. Pydantic Schema Updates

**ParentProfileUpdate** (lines 1178-1179):
```python
hero_title: Optional[List[str]] = None  # Array of hero title lines
hero_subtitle: Optional[str] = None  # Single hero subtitle
```

**ParentProfileResponse** (lines 1199-1200):
```python
hero_title: List[str] = []  # Array of hero title lines
hero_subtitle: Optional[str] = None  # Single hero subtitle
```

## Database Schema

```sql
-- parent_profiles table
hero_title TEXT[] DEFAULT ARRAY[]::TEXT[]  -- Array of strings
hero_subtitle TEXT                          -- Single string (nullable)
```

## API Usage

### Update Parent Profile with Hero Fields

**Endpoint:** `PUT /api/parent/profile`

**Example Request:**
```json
{
    "hero_title": [
        "Supporting My Children",
        "Building Their Future",
        "Through Quality Education"
    ],
    "hero_subtitle": "Dedicated parent committed to educational excellence and holistic child development"
}
```

### Response Example
```json
{
    "id": 1,
    "user_id": 123,
    "username": "parent_user",
    "hero_title": [
        "Supporting My Children",
        "Building Their Future",
        "Through Quality Education"
    ],
    "hero_subtitle": "Dedicated parent committed to educational excellence...",
    "bio": "...",
    "location": "Addis Ababa",
    "total_children": 2,
    "rating": 4.8,
    // ... other fields
}
```

## Usage Examples

### Example 1: Multi-line Hero Title
```json
{
    "hero_title": [
        "Empowering Young Minds",
        "One Child at a Time",
        "Together We Learn"
    ],
    "hero_subtitle": "Passionate about holistic child development"
}
```

### Example 2: Simple Hero
```json
{
    "hero_title": ["Dedicated Parent & Educator"],
    "hero_subtitle": "Committed to finding the best tutors for my children"
}
```

### Example 3: Community Focused
```json
{
    "hero_title": [
        "Active in the Astegni Community",
        "Supporting 3 Amazing Children"
    ],
    "hero_subtitle": "Believer in the power of great tutoring and personalized learning"
}
```

## Frontend Integration (To-Do)

The frontend `parent-profile.html` should be updated to:

1. **Display hero section** with title lines and subtitle
2. **Add edit functionality** to allow parents to customize their hero content
3. **Styling suggestions:**
   - Display `hero_title` as multiple lines with larger font
   - Each line can have different styling (e.g., gradient, emphasis)
   - Display `hero_subtitle` as smaller supporting text
   - Consider adding a hero background or overlay

### Example HTML Structure
```html
<div class="hero-section">
    <div class="hero-title">
        <div class="hero-title-line" *ngFor="let line of hero_title">
            {{ line }}
        </div>
    </div>
    <div class="hero-subtitle">
        {{ hero_subtitle }}
    </div>
</div>
```

### Example CSS
```css
.hero-section {
    padding: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
}

.hero-title-line {
    font-size: 2.5rem;
    font-weight: bold;
    line-height: 1.2;
    margin: 10px 0;
}

.hero-subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-top: 20px;
}
```

## Testing

**Test Script:** `astegni-backend/test_parent_hero_fields.py`

Verifies:
- Database schema correctness
- Reading/writing hero fields
- Data integrity

**Run Tests:**
```bash
cd astegni-backend
python test_parent_hero_fields.py
```

**Test Results:**
- ✓ Schema verified - both columns exist
- ✓ Successfully updated parent profile with sample data
- ✓ Data persists and retrieves correctly

## Backend Endpoint Compatibility

The existing parent profile endpoint automatically handles these new fields:
- `PUT /api/parent/profile` - Uses dynamic `setattr()` so new fields work immediately
- `GET /api/parent/profile` - Returns all fields including hero_title and hero_subtitle
- No endpoint code changes required!

## Notes

- **hero_title is an ARRAY**: Allows multiple lines for creative hero sections
  - Example: `["Line 1", "Line 2", "Line 3"]`
- **hero_subtitle is a STRING**: Single supporting line
- Both fields are **optional** (nullable)
- Default values: `hero_title = []`, `hero_subtitle = null`
- Compatible with existing parent profile endpoints (no breaking changes)

## Files Modified

1. ✅ `astegni-backend/migrate_add_parent_hero_fields.py` - Migration script (new)
2. ✅ `astegni-backend/app.py modules/models.py` - SQLAlchemy model & Pydantic schemas
3. ✅ `astegni-backend/test_parent_hero_fields.py` - Test script (new)
4. 📝 `profile-pages/parent-profile.html` - Frontend (to-do)

## Migration Status

✅ **COMPLETE** - Ready for frontend integration

- Database columns added
- Models updated
- Schemas updated
- API endpoints compatible
- Tests passing

## Next Steps

1. Update `profile-pages/parent-profile.html` to display hero section
2. Add edit modal for hero fields in parent profile page
3. Add hero section styling with CSS
4. Test hero section with various content lengths
5. Consider adding character limits for better UX
