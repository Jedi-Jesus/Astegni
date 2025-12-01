# System Settings - Quick Reference Card

## 🚀 Get Started in 3 Steps

### Step 1: Add Script Tag
```html
<!-- In manage-system-settings.html, before </body> -->
<script src="../js/admin-pages/system-settings-data.js"></script>
```

### Step 2: Update Panel Switching
```javascript
function switchPanel(panelName) {
    // ... your code ...
    initializeSystemSettingsData(panelName);  // Add this line
}
```

### Step 3: Start Servers
```bash
# Terminal 1 - Backend
cd astegni-backend
venv/Scripts/python.exe app.py

# Terminal 2 - Frontend
python -m http.server 8080
```

**Done!** Open: http://localhost:8080/admin-pages/manage-system-settings.html

---

## 📂 Files Reference

| File | Location | Purpose |
|------|----------|---------|
| **Migration** | `astegni-backend/migrate_system_settings.py` | ✅ Already run |
| **Endpoints** | `astegni-backend/system_settings_endpoints.py` | ✅ Created |
| **Data Manager** | `js/admin-pages/system-settings-data.js` | ✅ Created |
| **HTML** | `admin-pages/manage-system-settings.html` | ⚠️ Add script tag |

---

## 🔌 API Endpoints Cheat Sheet

```
GET  /api/admin/system/dashboard           → Stats
GET  /api/admin/system/general-settings    → Platform settings
PUT  /api/admin/system/general-settings    → Update settings
GET  /api/admin/system/media-settings      → Media tiers
GET  /api/admin/system/impressions         → Analytics
GET  /api/admin/system/logs                → System logs
GET  /api/admin/system/performance         → Metrics
```

**Full API docs**: http://localhost:8000/docs

---

## 🗄️ Database Tables

```
✅ 19 tables created
✅ 9 performance indexes
✅ Default data seeded
✅ All zeros for stats
```

**Verify**: Run test query in Quick Start guide

---

## 💻 JavaScript Usage

```javascript
// Get dashboard data
const manager = new SystemSettingsDataManager();
const stats = await manager.getDashboardData();
console.log(stats.total_users); // 0

// Update settings
await manager.updateGeneralSettings({
    platform_name: "Astegni",
    contact_email: "contact@astegni.com"
});
```

---

## 🎯 Element IDs for Auto-Binding

### Dashboard
```html
<span id="total-users">0</span>
<span id="total-tutors">0</span>
<span id="total-videos">0</span>
```

### Settings
```html
<input id="platform-name">
<input id="contact-email">
```

### Media
```html
<span id="free-video-size">0</span>
<span id="basic-video-size">0</span>
```

---

## 🧪 Quick Test

```bash
# Test API
curl http://localhost:8000/api/admin/system/dashboard

# Expected:
# {"success": true, "data": {"total_users": 0, ...}}
```

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| 404 Not Found | Restart backend server |
| CORS Error | Check frontend on port 8080 |
| No data | Check browser console |
| 500 Error | Check backend logs |

---

## 📚 Documentation

- **Start Here**: SYSTEM-SETTINGS-QUICK-START.md
- **Full Docs**: SYSTEM-SETTINGS-DATABASE-INTEGRATION.md
- **Summary**: SYSTEM-SETTINGS-SUMMARY.md
- **Completion**: SYSTEM-SETTINGS-COMPLETE.md

---

## ✅ Checklist

- [ ] Migration run successfully
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Script tag added to HTML
- [ ] `switchPanel()` updated
- [ ] No console errors
- [ ] Data loading correctly

---

**Status**: ✅ READY TO USE
**Version**: 1.0.0
**Date**: 2025-10-10
