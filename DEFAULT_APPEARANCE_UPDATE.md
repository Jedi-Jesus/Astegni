# Default Appearance Settings Update

**Date:** 2026-02-05

## Summary

Updated the default appearance settings for Astegni to use:
- **Theme:** Growth Mindset (emerald-gold-charcoal) 🇪🇹
- **Font:** Patrick Hand (Natural handwriting)

## Changes Made

### 1. Frontend (JavaScript)
**File:** `js/common-modals/appearance-manager.js`

Updated `defaultSettings` object:
```javascript
this.defaultSettings = {
    theme: 'light',
    colorPalette: 'emerald-gold-charcoal',  // Changed from 'astegni-classic'
    fontFamily: 'patrick-hand',              // Changed from 'system'
    fontSize: 16,
    displayDensity: 'comfortable',
    accentColor: 'indigo',
    enableAnimations: true,
    reduceMotion: false,
    sidebarPosition: 'left'
};
```

### 2. Backend (Database Models)
**File:** `astegni-backend/app.py modules/models.py`

Updated User model defaults:
```python
color_palette = Column(String(50), default='emerald-gold-charcoal')  # Changed from 'astegni-classic'
font_family = Column(String(50), default='patrick-hand')              # Changed from 'system'
```

### 3. Modal UI Updates
**File:** `modals/common-modals/appearance-modal.html`

- Changed "Astegni Classic" tag from "Default" to "Legacy"
- Changed "Growth Mindset" tag from "🇪🇹 Recommended" to "🇪🇹 Default"
- Added "⭐ Default" indicator to "Patrick Hand" font option

### 4. Database Migration
**File:** `astegni-backend/migrate_update_default_appearance.py`

Migration script that:
- Updates schema defaults for new users
- Migrates existing users from old defaults to new defaults

## Why These Defaults?

### Growth Mindset Theme (emerald-gold-charcoal)
- Ethiopian-inspired color palette (green, gold)
- Psychology-based learning colors
- Already marked as "Recommended" in the system
- Represents growth, prosperity, and education
- Strong connection to Ethiopian culture 🇪🇹

### Patrick Hand Font
- Natural handwriting style that feels approachable
- More educational and friendly than system fonts
- Better engagement for learning environments
- Maintains readability while adding personality
- Popular choice for educational platforms

## Running the Migration

To apply these changes to the database:

```bash
cd astegni-backend
python migrate_update_default_appearance.py
```

This will:
1. Update the schema defaults for new users
2. Update existing users who had the old defaults
3. Show a summary of changes

## Testing

After running the migration:

1. **New Users:** Create a new account and verify appearance settings
2. **Existing Users:** Check that settings were updated (if they had old defaults)
3. **Modal Display:** Open Appearance modal and verify "Default" tags are correct
4. **Reset Function:** Test "Reset to Defaults" button uses new defaults

## Impact

- **New Users:** Will automatically get Growth Mindset theme + Patrick Hand font
- **Existing Users:** Those with old defaults will be updated to new defaults
- **Users with Custom Settings:** Will NOT be affected - their choices are preserved
- **Backward Compatible:** All old themes and fonts still available as options

## Rollback

If needed, revert by:
1. Change defaults back to `'astegni-classic'` and `'system'`
2. Run database rollback:
   ```sql
   ALTER TABLE users ALTER COLUMN color_palette SET DEFAULT 'astegni-classic';
   ALTER TABLE users ALTER COLUMN font_family SET DEFAULT 'system';
   ```

## Notes

- This change aligns with the Ethiopian focus of the platform
- Growth Mindset palette was already recommended in the UI
- Patrick Hand provides a warmer, more educational feel
- All users can still customize their appearance preferences
- Changes apply immediately for new registrations
