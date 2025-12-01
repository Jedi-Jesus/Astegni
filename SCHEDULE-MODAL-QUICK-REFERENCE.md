# Schedule Modal - Quick Reference

## 🚀 Quick Start

### 1. Setup (One Time):
```bash
cd astegni-backend
python migrate_create_tutor_schedules.py
python app.py
```

### 2. Use:
1. Open tutor profile → Schedule panel
2. Click "Create Schedule"
3. Fill form
4. Submit

## 📋 New Features at a Glance

| Feature | Description | Type |
|---------|-------------|------|
| **Other Subject** | Text input (was textarea) | Changed |
| **Description** | Rich textarea for details | New |
| **Year** | Dropdown 2024-2028 | New |
| **Schedule Type** | Recurring or Specific dates | New |
| **Specific Dates** | Calendar picker + list | New |
| **Alarm System** | Browser notifications + sound | New |

## 🔔 Notification Quick Facts

### ✅ Works When:
- Browser is open
- Tab is open or in background
- Schedules stored in localStorage
- Checks every 60 seconds

### ❌ Doesn't Work When:
- Browser is completely closed
- Computer is off/sleeping
- Browser notifications blocked

### ⚙️ Settings:
- 5min to 1 day before options
- Browser popup notification
- Sound alert
- Visual toast message

## 📊 Two Schedule Types

### 1. Recurring (Months & Days)
```
Select: Months + Days of week
Example: Jan-Mar, Mon/Wed/Fri @ 14:00-16:00
```

### 2. Specific Dates
```
Pick: Individual dates
Example: Jan 15, Jan 22, Feb 5 @ 09:00-12:00
```

## 🎯 Quick Form Guide

**Required Fields:**
- Title ✅
- Subject ✅ (if "Other", name required)
- Grade Level ✅
- Year ✅
- At least 1 month OR 1 specific date ✅
- Start & End Time ✅

**Optional Fields:**
- Description
- Notes
- Alarm settings

## 💾 Data Storage

- **Database**: All schedule data
- **localStorage**: Notifications queue
- **Auto-sync**: On page load

## 🔧 Common Commands

```bash
# Setup
python migrate_create_tutor_schedules.py

# Run server
python app.py

# Test notification
localStorage.getItem('scheduledNotifications')

# Clear notifications
localStorage.removeItem('scheduledNotifications')
```

## 📱 Browser Notification Setup

### Chrome/Edge:
1. Click 🔔 icon in address bar
2. Allow notifications
3. Or: Settings → Privacy → Site Settings → Notifications

### Firefox:
1. Click 🛡️ icon in address bar
2. Allow notifications
3. Or: Settings → Privacy → Permissions → Notifications

### Safari:
1. Safari → Preferences → Websites → Notifications
2. Allow for your site

## 🎨 Visual Guide

```
Schedule Type: ( ) Recurring  (•) Specific Dates
                      ↓
           Shows calendar picker
                      ↓
           Add dates to list
                      ↓
   [×] Mon, Jan 15, 2025  [Remove]
   [×] Wed, Jan 22, 2025  [Remove]
```

## ⚡ Quick Test

```javascript
// Test notification (in browser console)
new Notification('Test', {
  body: 'Notifications working!',
  icon: '/uploads/system_images/system_images/Astegni_qrcode.png'
});
```

## 🐛 Quick Fixes

**Problem:** Modal doesn't open
→ Check console for errors

**Problem:** No notifications
→ Check browser permission

**Problem:** Database error
→ Run migration script

**Problem:** Dates won't add
→ Select date first, check mode

## 📞 Key Functions

```javascript
// Open modal
openScheduleModal()

// Toggle type
toggleScheduleType()

// Add date
addSpecificDate()

// Remove date
removeSpecificDate('2025-01-15')

// Toggle alarm
toggleAlarmSettings()
```

## ✅ Features Checklist

- [✅] Text input for custom subject
- [✅] Description textarea
- [✅] Year dropdown
- [✅] Recurring schedules
- [✅] Specific dates calendar
- [✅] Add/remove dates
- [✅] Notification system
- [✅] Browser alerts
- [✅] Sound alerts
- [✅] Persistent storage
- [✅] Dark mode
- [✅] Mobile responsive
- [✅] Database integrated

## 🎉 Status: COMPLETE!

All features implemented and tested!
Ready for production use.

For detailed documentation, see:
- `SCHEDULE-MODAL-ENHANCED-SUMMARY.md`
- `SCHEDULE-MODAL-DB-SETUP.md`
