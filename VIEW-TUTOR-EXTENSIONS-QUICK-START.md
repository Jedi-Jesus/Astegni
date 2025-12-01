# View Tutor Extensions - Quick Start Guide

## What Was Fixed

The achievements, certifications, and experience panels in `view-tutor.html` now work exactly like `tutor-profile.html`:

✅ **Removed all hardcoded data**
✅ **Everything loads from database**
✅ **Exact same card layout as tutor-profile.html**
✅ **View modals open when clicking "View Details"**
✅ **No edit/delete buttons (view-only mode)**

## Quick Test

1. **Start backend**:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Start frontend**:
   ```bash
   # New terminal from project root
   python -m http.server 8080
   ```

3. **Open in browser**:
   ```
   http://localhost:8080/view-profiles/view-tutor.html?id=1
   ```

4. **Test each panel**:
   - Click **"Achievements"** tab → See achievement cards → Click "View Details" → Modal opens
   - Click **"Certifications"** tab → See certification cards → Click "View Details" → Modal opens
   - Click **"Experience"** tab → See experience cards → Click "View Details" → Modal opens

## How It Works

```
User clicks achievement card
  ↓
viewAchievementDetails(id) called
  ↓
Find achievement in loaded data
  ↓
openViewAchievementModal(data)
  ↓
Populate modal fields (read-only)
  ↓
Hide edit/delete buttons
  ↓
Show modal
```

## Card Features

### Achievements
- 🏆 Icon badge
- ⭐ Featured badge (if featured)
- ✓ Verification status
- Year, issuer, description
- Certificate preview (if uploaded)

### Certifications
- 📜 Certification name
- 🏢 Issuing organization
- 📅 Issue/expiry dates
- 🔑 Credential ID
- Certificate image preview

### Experience
- 💼 Job title
- 🏢 Institution
- 📍 Location
- 📅 Start/end dates
- Current badge (if ongoing)
- Responsibilities & achievements

## Files Changed

Only 1 file modified:
- `js/view-tutor/view-tutor-db-loader.js` (+420 lines)

## What's Different from tutor-profile.html

| Feature | Tutor Profile | View Tutor |
|---------|--------------|------------|
| Who can access | Own profile only | Anyone (public) |
| Data shown | All items | Verified only |
| Actions | Add, Edit, Delete, View | View only |
| Edit buttons | ✅ Yes | ❌ No |
| Upload buttons | ✅ Yes | ❌ No |

## Troubleshooting

**Cards not showing?**
- Check backend is running: `http://localhost:8000/docs`
- Check console for errors (F12)
- Verify tutor ID exists: `?id=1` in URL

**Modal not opening?**
- Check console for `viewAchievementDetails` errors
- Verify `viewTutorLoaderInstance` is defined
- Check modal HTML exists in view-tutor.html

**No data displaying?**
- Run backend seeders:
  ```bash
  cd astegni-backend
  python seed_tutor_extensions_data.py
  ```

## API Endpoints Used

```
GET /api/view-tutor/{tutor_id}/achievements
GET /api/view-tutor/{tutor_id}/certificates
GET /api/view-tutor/{tutor_id}/experience
```

All endpoints filter to show only `is_verified = true` items.

## Success! ✅

You should now see:
1. Database-driven cards in all 3 panels
2. Exact same layout as tutor-profile.html
3. Working view modals (no edit/delete)
4. Only verified items displayed
5. Certificate previews with fullscreen viewer
