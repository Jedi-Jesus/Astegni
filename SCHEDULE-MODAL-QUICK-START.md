# Schedule Modal - Quick Start Guide

## 🚀 What Was Added

A complete **Teaching Schedule Creation Modal** for tutors to manage their availability and pricing.

## 📂 Files Changed

1. **profile-pages/tutor-profile.html** - Added modal HTML (lines 3225-3467)
2. **js/tutor-profile/global-functions.js** - Added schedule functions (lines 2413-2559)
3. **css/tutor-profile/tutor-profile.css** - Added modal styling (lines 3835-4040)

## ✨ Features

### Schedule Creation Form
- 📝 Schedule title (e.g., "Mathematics - Grade 10")
- 📚 Subject selection (Ethiopian curriculum)
- 🎓 Grade level (KG to University)
- 📅 Multiple day selection (Mon-Sun with visual checkboxes)
- ⏰ Time range (start/end time)
- 💻 Session format (Online/In-person/Hybrid)
- 📍 Location (dynamic - shows only for in-person/hybrid)
- ⏱️ Session duration (30min to 3 hours)
- 👥 Maximum students (1-50)
- 💰 Price in ETB (Ethiopian Birr)
- 📄 Additional notes (optional)
- 🔘 Status (Active/Draft)

## 🎯 How to Use

### For Users:
1. Navigate to tutor profile
2. Click "Schedule" panel in sidebar
3. Click "Create Schedule" button
4. Fill in the form
5. Click "Create Schedule" to save

### For Developers:
```javascript
// Open the modal
openScheduleModal();

// Close the modal
closeScheduleModal();

// Save schedule (called on form submit)
saveSchedule();
```

## 🎨 Visual Features

### Day Selection Grid
```
[Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
```
- Click to toggle selection
- Visual feedback (blue background when selected)
- Multiple selection supported

### Dynamic Location Field
- Hidden for "Online" format
- Visible for "In-person" and "Hybrid"
- Automatically required when visible

### Form Validation
- ✅ All required fields checked
- ✅ At least one day must be selected
- ✅ End time must be after start time
- ✅ User-friendly error messages

## 📱 Responsive Design

### Desktop
- 7-column day grid
- Side-by-side time inputs
- Full-width modal (max 700px)

### Tablet
- 4-column day grid
- Reduced padding

### Mobile
- 3-column day grid
- Stacked time inputs
- Full-width buttons
- Optimized spacing

## 🌙 Dark Mode Support

Full dark mode styling included:
- Dark backgrounds
- Adjusted borders
- Maintained contrast
- Smooth transitions

## 🔗 Integration

### Current Integrations:
- ✅ TutorModalManager (for open/close)
- ✅ TutorProfileUI (for notifications)
- ✅ Global functions accessible from HTML

### Ready for Backend:
```javascript
// API endpoint structure
POST /api/tutor/schedules
{
  title, subject, grade, days, startTime, endTime,
  format, location, duration, maxStudents, price,
  notes, status, createdAt
}
```

## 🧪 Testing

Quick test:
1. Open [tutor-profile.html](profile-pages/tutor-profile.html)
2. Click Schedule panel
3. Click "Create Schedule"
4. Modal should open ✅
5. Fill form and submit
6. Should see success notification ✅

## 🎓 Ethiopian Context

- Subjects: Math, Physics, Chemistry, Biology, English, Amharic, etc.
- Grade levels: Ethiopian education system
- Pricing: Ethiopian Birr (ETB)
- Locations: Ethiopian cities

## 📊 Data Structure

```javascript
{
  title: "Mathematics - Grade 10",
  subject: "Mathematics",
  grade: "Grade 9-10",
  days: ["Monday", "Wednesday", "Friday"],
  startTime: "14:00",
  endTime: "16:00",
  format: "Online",
  location: null,
  duration: 120, // minutes
  maxStudents: 5,
  price: 200, // ETB
  notes: "Bring textbook",
  status: "active",
  createdAt: "2025-10-21T10:30:00.000Z"
}
```

## 🚧 Next Steps (For Backend Team)

1. Create database table for schedules
2. Implement POST /api/tutor/schedules endpoint
3. Implement GET /api/tutor/schedules endpoint
4. Add schedule list display to Schedule panel
5. Add edit/delete functionality

## 💡 Tips

### For Customization:
- Add more subjects in the subject dropdown (line 3254)
- Adjust time duration options (line 3378)
- Change max students limit (line 3395)
- Modify price step increment (line 3414)

### For Debugging:
- Check browser console for logs
- Look for "📅 Creating schedule:" message
- Verify form validation messages
- Test modal open/close functions

## 🎉 Success Criteria

✅ Modal opens when clicking "Create Schedule"
✅ All form fields are functional
✅ Day checkboxes work with visual feedback
✅ Location field shows/hides dynamically
✅ Form validation works correctly
✅ Success notification appears
✅ Modal closes after saving
✅ Form resets for next entry
✅ Dark mode works
✅ Mobile responsive

## 📞 Support

For issues or questions:
- Check console logs
- Review [SCHEDULE-MODAL-IMPLEMENTATION.md](SCHEDULE-MODAL-IMPLEMENTATION.md) for details
- Test in different browsers
- Verify all three files are updated

---

**Status:** ✅ Ready to use
**Version:** 1.0
**Last Updated:** 2025-10-21
