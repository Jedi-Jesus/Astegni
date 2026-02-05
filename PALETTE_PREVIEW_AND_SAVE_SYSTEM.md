# 🎨 Color Palette Preview & Save System

## How It Works

### **Two-Stage System:**

1. **Preview Mode** (Instant, Not Saved)
   - User clicks a color palette
   - Changes apply **instantly** across the entire page
   - User can try multiple palettes
   - Changes are **NOT saved yet**

2. **Save Mode** (Permanent)
   - User clicks "Save Changes" button
   - Settings saved to **localStorage**
   - Settings saved to **database**
   - Changes persist across sessions and devices

---

## 🔄 User Flow

```
1. User clicks Settings → Appearance
2. User clicks a color palette (e.g., "Whiteboard")
   → ✅ Page changes instantly (PREVIEW)
   → ❌ NOT saved yet
3. User tries another palette (e.g., "Ethiopian Heritage")
   → ✅ Page changes instantly again
   → ❌ Still not saved
4. User clicks "Save Changes"
   → ✅ Saved to localStorage
   → ✅ Saved to database
   → ✅ Will persist after refresh/login
5. User closes modal
   → ✅ Palette remains applied

Alternative flow:
1-3. Same as above
4. User clicks "Cancel" or closes modal without saving
   → ❌ Changes reverted
   → ✅ Goes back to previously saved palette
```

---

## 🛠️ Technical Implementation

### **Frontend: Preview vs Save**

```javascript
class AppearanceModalManager {
    constructor() {
        this.settings = {...};        // SAVED settings
        this.previewSettings = {...}; // PREVIEW settings (temporary)
    }

    // When user clicks a palette
    setColorPalette(palette) {
        this.previewSettings.colorPalette = palette; // Update preview only
        this.applyColorPalette(palette);            // Apply instantly
        // NOT saved to this.settings yet
    }

    // When user clicks "Save Changes"
    save() {
        this.settings = {...this.previewSettings};  // Copy preview to saved
        this.saveSettings();                        // Save to localStorage
        await this.saveToDatabase();                // Save to database
    }

    // When user closes modal without saving
    close() {
        this.applySettings(); // Revert to saved settings
    }
}
```

---

## 💾 Database Storage

### **Migration:**

```bash
cd astegni-backend
python migrate_add_appearance_settings_to_users.py
```

This adds columns to the `users` table:
- `theme` - VARCHAR(20)
- `color_palette` - VARCHAR(50)
- `font_size` - INTEGER
- `display_density` - VARCHAR(20)
- `accent_color` - VARCHAR(20)
- `enable_animations` - BOOLEAN
- `reduce_motion` - BOOLEAN
- `sidebar_position` - VARCHAR(20)

### **Backend Endpoints:**

1. **GET `/api/user/appearance-settings`**
   - Fetch user's saved appearance settings
   - Returns defaults if not set

2. **PUT `/api/user/appearance-settings`**
   - Save user's appearance settings
   - Validates values before saving

3. **POST `/api/user/appearance-settings/reset`**
   - Reset to default settings

---

## 📝 Setup Instructions

### **Step 1: Run Database Migration**

```bash
cd astegni-backend
python migrate_add_appearance_settings_to_users.py
```

Expected output:
```
✓ Added 'theme' column
✓ Added 'color_palette' column
✓ Added 'font_size' column
...
✅ Migration completed successfully!
```

### **Step 2: Add Endpoint to Backend**

Add to `app.py`:

```python
# Import the router
from appearance_settings_endpoints import router as appearance_router

# Register the router
app.include_router(appearance_router, tags=["Appearance Settings"])
```

### **Step 3: Restart Backend**

```bash
# Stop backend (Ctrl+C)
python app.py
```

### **Step 4: Test the System**

```bash
# Start frontend
python dev-server.py

# Open browser
http://localhost:8081

# Login as a user
# Open Settings → Appearance
# Click different palettes (instant preview)
# Click "Save Changes" (permanent save)
# Refresh page (settings should persist)
# Logout and login again (settings should still be there)
```

---

## 🧪 Testing Scenarios

### **Test 1: Preview Without Save**
1. Open appearance modal
2. Click "Whiteboard" palette
3. Verify: Page turns into whiteboard theme instantly
4. Close modal without saving
5. Verify: Page reverts to previous palette

### **Test 2: Preview and Save**
1. Open appearance modal
2. Click "Ethiopian Heritage" palette
3. Verify: Instant preview
4. Click "Save Changes"
5. Verify: Success message appears
6. Refresh page
7. Verify: Ethiopian Heritage palette still active

### **Test 3: Database Persistence**
1. Login as user A
2. Set palette to "Blackboard"
3. Save changes
4. Logout
5. Login again as user A
6. Verify: Blackboard palette auto-applied

### **Test 4: Multiple Preview**
1. Open appearance modal
2. Click "Whiteboard"
3. Click "Greenboard"
4. Click "Blackboard"
5. Click "Emerald Gold"
6. Verify: Each click changes theme instantly
7. Click "Save Changes"
8. Verify: Only "Emerald Gold" is saved (last selection)

---

## 🔍 Debugging

### **Check Preview vs Saved State:**

Open browser console:

```javascript
// Check current preview (what you see)
document.documentElement.getAttribute('data-palette')

// Check saved settings
console.log(appearanceModalManager.settings.colorPalette)

// Check preview settings
console.log(appearanceModalManager.previewSettings.colorPalette)

// Check localStorage
localStorage.getItem('appearance_settings')
```

### **Check Database:**

```sql
-- Check user's saved palette
SELECT id, email, color_palette, theme
FROM users
WHERE email = 'test@example.com';
```

### **Check API Response:**

```javascript
// Fetch user's appearance settings
fetch('http://localhost:8000/api/user/appearance-settings', {
    headers: {
        'Authorization': `Bearer ${window.token}`
    }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📊 Flow Diagram

```
User Opens Modal
        ↓
User Clicks Palette
        ↓
[PREVIEW MODE]
   ├── Update previewSettings.colorPalette
   ├── Apply palette instantly (DOM update)
   └── Show active state in UI
        ↓
User Clicks "Save Changes"?
        ↓
    YES              NO
     ↓               ↓
[SAVE MODE]     [CANCEL]
     ↓               ↓
Copy preview    Revert to
to settings     saved settings
     ↓               ↓
Save to         Close modal
localStorage
     ↓
Save to
database
     ↓
Close modal
```

---

## ✅ Expected Behavior

### **On Palette Click:**
- ✅ Theme changes instantly
- ✅ No page reload needed
- ✅ All elements update (buttons, cards, text)
- ❌ NOT saved to database yet
- ❌ NOT in localStorage yet

### **On "Save Changes":**
- ✅ Saved to localStorage
- ✅ Saved to database (if logged in)
- ✅ Persists after refresh
- ✅ Persists after logout/login

### **On "Cancel" or Close Without Save:**
- ✅ Reverts to previous palette
- ✅ Preview discarded
- ❌ Changes NOT saved

---

## 🚨 Important Notes

1. **Preview is NOT saved** - Users must click "Save Changes"
2. **Database save requires login** - Anonymous users only use localStorage
3. **LocalStorage is fallback** - Works even if database save fails
4. **All changes revert on cancel** - Including theme, font size, etc.
5. **One save for all settings** - Palette, theme, font size all saved together

---

## 🎯 Next Steps

1. ✅ Run migration
2. ✅ Add endpoint to app.py
3. ✅ Restart backend
4. ⏳ Test preview mode
5. ⏳ Test save mode
6. ⏳ Test database persistence
7. ⏳ Add loading states (optional)
8. ⏳ Add error handling for failed database saves

---

## 📚 Related Files

- **Frontend JS:** `js/common-modals/appearance-modal.js`
- **Backend:** `astegni-backend/appearance_settings_endpoints.py`
- **Migration:** `astegni-backend/migrate_add_appearance_settings_to_users.py`
- **HTML:** `modals/common-modals/appearance-modal.html`

---

**Version:** 2.1.5
**Last Updated:** 2026-01-27
