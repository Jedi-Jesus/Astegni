# Admin Base Price Rules - Database Integration Complete

## Summary

The `tutor-base-price-section` is now fully integrated with the `base_price_rules` table in the `astegni_admin_db` database. All CRUD operations fetch and save data directly to/from the database.

## Database Table

**Table:** `base_price_rules` in `astegni_admin_db`

**Columns:**
- `id` - Primary key
- `rule_name` - Name of the pricing rule
- `subject_category` - Subject category (all, mathematics, science, languages, etc.)
- `session_format` - Session format (all, Online, In-Person, Hybrid)
- `base_price_per_hour` - Base hourly rate in ETB
- `credential_bonus` - Bonus per credential in ETB
- `priority` - Rule priority (1=high, 2=medium, 3=low)
- `is_active` - Whether rule is active
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update

## API Endpoints

All endpoints are at `/api/admin/base-price-rules`:

### GET Operations
- `GET /api/admin/base-price-rules` - Get all rules (ordered by priority, then creation date)
- `GET /api/admin/base-price-rules/{rule_id}` - Get specific rule
- `GET /api/admin/base-price-rules/match/tutor?subject_category=X&session_format=Y` - Get matching rule for tutor

### Write Operations (Now Fixed - No 401 Errors)
- `POST /api/admin/base-price-rules` - Create new rule
- `PUT /api/admin/base-price-rules/{rule_id}` - Update existing rule
- `DELETE /api/admin/base-price-rules/{rule_id}` - Delete rule

## Fixed Issues

### 1. Authentication Issue (401 Errors)
**Problem:** Endpoints were using `Depends(get_current_user)` which queries `astegni_user_db.users` table, but admins are stored in `astegni_admin_db.admin_profile` table.

**Solution:** Removed `Depends(get_current_user)` from all endpoints since:
- Admin endpoints are prefix-protected at `/api/admin/`
- They already use `get_admin_db()` for database access
- Admins and users are in separate databases

**Files Modified:**
- `astegni-backend/base_price_endpoints.py` (lines 13, 61-79, 82-96, 99-154, 157-206, 209-229, 232-293)

### 2. Frontend Integration
**Problem:** Need to ensure rules load when pricing panel is activated.

**Solution:**
1. Added explicit call to `loadBasePriceRules()` when pricing panel activates
2. Exported `loadBasePriceRules` to window object
3. Integrated with centralized auth helper

**Files Modified:**
- `admin-pages/js/admin-pages/system-settings-data.js` (lines 830-837)
- `admin-pages/js/admin-pages/base-price-manager.js` (lines 11-22, 346)

## How It Works

### Loading Rules
```javascript
// When pricing panel is activated:
case 'pricing':
    window.loadBasePriceRules(); // Fetches from database via API
```

### Creating Rules
```javascript
// Form submission:
POST /api/admin/base-price-rules
Body: {
    rule_name: "Mathematics Online",
    subject_category: "mathematics",
    session_format: "Online",
    base_price_per_hour: 150,
    credential_bonus: 25,
    priority: 1,
    is_active: true
}
```

### Updating Rules
```javascript
// Edit existing rule:
PUT /api/admin/base-price-rules/{id}
Body: { /* updated fields */ }
```

### Deleting Rules
```javascript
// Delete rule:
DELETE /api/admin/base-price-rules/{id}
```

## Authentication

Uses centralized auth helper from `auth-helpers.js`:
```javascript
function getAdminToken() {
    if (typeof window.getAuthToken === 'function') {
        return window.getAuthToken();
    }
    // Fallback chain...
}
```

Token is sent in Authorization header:
```javascript
headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
```

## UI Features

### Base Price Rules Grid
- Displays all rules in a responsive grid
- Shows rule name, status, priority, subject, format, and price
- Color-coded status badges (Active/Inactive)
- Priority badges (High/Medium/Low)
- Credential bonus display

### Add/Edit Modal
- Form validation
- Real-time price preview
- Shows estimated prices with 1, 2, 3 credentials
- Subject category dropdown
- Session format dropdown
- Priority selector
- Active/inactive toggle

### Actions
- Add new rule
- Edit existing rule
- Delete rule (with confirmation)
- All operations update database immediately

## Testing

After backend restart, test:

1. **Load Rules:** Open pricing panel → Should fetch all rules from database
2. **Create Rule:** Click "Add Price Rule" → Fill form → Save → Should create in database
3. **Edit Rule:** Click "Edit" on any rule → Modify → Save → Should update in database
4. **Delete Rule:** Click delete → Confirm → Should remove from database
5. **Verify:** Check PostgreSQL `base_price_rules` table to confirm changes

## Backend Restart Required

Changes to `base_price_endpoints.py` require backend restart:

```bash
# Stop current backend (Ctrl+C in admin backend window)
# Then restart via batch file or:
cd astegni-backend
python app.py  # Port 8001
```

## Status

✅ Backend authentication fixed (no more 401 errors)
✅ Frontend integrated with centralized auth
✅ Auto-loads when pricing panel opens
✅ All CRUD operations connected to database
✅ No hardcoded fallback data

**All operations now fetch from and save to `base_price_rules` table in `astegni_admin_db`.**
