# Schedule Panel Role-Based Filters - Implementation Complete

## Overview
Added **role-based session filters** to the Schedule panels across all three user profiles (Tutor, Student, Parent). These filters match the ones in the Sessions panel, allowing users to filter schedules based on which role they're acting as.

## Changes Made

### **1. Tutor Profile - Schedule Panel**
**Location:** [tutor-profile.html:1112-1147](profile-pages/tutor-profile.html#L1112-L1147)

**Added before the schedules table:**
```html
<!-- Role-based Filters -->
<div class="mb-6 flex gap-4 flex-wrap">
    <button class="px-4 py-2 rounded-full bg-blue-500 text-white"
        onclick="filterSchedulesByRole('all')">
        <i class="fas fa-users mr-2"></i>All Sessions
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('tutor')">
        <i class="fas fa-chalkboard-teacher mr-2"></i>As Tutor
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('student')">
        <i class="fas fa-user-graduate mr-2"></i>As Student
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('parent')">
        <i class="fas fa-user-friends mr-2"></i>As Parent
    </button>
</div>
```

**Note:** Priority filters (Urgent, High, Medium, Low) remain intact below the role filters.

---

### **2. Student Profile - Schedule Panel**
**Location:** [student-profile.html:3020-3034](profile-pages/student-profile.html#L3020-L3034)

**Added at the beginning of schedules section:**
```html
<!-- Role-based Filters -->
<div class="mb-6 flex gap-4 flex-wrap">
    <button class="px-4 py-2 rounded-full bg-blue-500 text-white"
        onclick="filterSchedulesByRole('all')">
        <i class="fas fa-users mr-2"></i>All Sessions
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('tutor')">
        <i class="fas fa-chalkboard-teacher mr-2"></i>As Tutor
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('student')">
        <i class="fas fa-user-graduate mr-2"></i>As Student
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('parent')">
        <i class="fas fa-user-friends mr-2"></i>As Parent
    </button>
</div>
```

---

### **3. Parent Profile - Schedule Panel**

#### **3a. Panel ID Changed for Consistency**
**Before:** `id="family-schedule-panel"`
**After:** `id="schedule-panel"`

This ensures all three profiles use the same panel ID (`schedule-panel`), making navigation and code maintenance consistent.

#### **3b. Updated References**
- Sidebar link: Changed from `switchPanel('family-schedule')` to `switchPanel('schedule')`
- FAB menu: Changed from `navigateToContent('family-schedule')` to `navigateToContent('schedule')`

#### **3c. Added Role-Based Filters**
**Location:** [parent-profile.html:3049-3063](profile-pages/parent-profile.html#L3049-L3063)

**Added after search bar and before schedules table:**
```html
<!-- Role-based Filters -->
<div class="mb-6 flex gap-4 flex-wrap">
    <button class="px-4 py-2 rounded-full bg-blue-500 text-white"
        onclick="filterSchedulesByRole('all')">
        <i class="fas fa-users mr-2"></i>All Sessions
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('tutor')">
        <i class="fas fa-chalkboard-teacher mr-2"></i>As Tutor
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('student')">
        <i class="fas fa-user-graduate mr-2"></i>As Student
    </button>
    <button class="px-4 py-2 rounded-full bg-gray-200"
        onclick="filterSchedulesByRole('parent')">
        <i class="fas fa-user-friends mr-2"></i>As Parent
    </button>
</div>
```

**Note:** Priority filters (Urgent, High, Medium, Low) remain intact below the role filters.

---

## Rationale

### **Why Add Role Filters to Schedule Panel?**
1. **Consistency** - Both Schedule and Sessions panels now have identical filtering options
2. **Multi-Role Support** - Users with multiple roles can filter schedules by which role they're acting as
3. **Better Organization** - Separate schedules for teaching, learning, and parenting activities
4. **Unified UX** - Same filtering pattern across all panels and profiles

### **Use Cases**

**Example: User with Tutor + Student roles**
- **As Tutor filter** → Show teaching availability schedules
- **As Student filter** → Show personal study plans
- **As Parent filter** → Show children's schedules they're supervising

**Example: User with all three roles (Tutor + Student + Parent)**
- Can easily switch between different schedule contexts
- Reduces cognitive load by filtering schedules by role
- Makes it easier to manage time across different responsibilities

---

## Consistency Across Panels

### **Schedule Panel vs Sessions Panel**
Both panels now have **identical role-based filters**:

```
[All Sessions] [As Tutor] [As Student] [As Parent]
```

| Panel | Purpose | Filters |
|-------|---------|---------|
| **Schedule** | Availability and time blocks | Role-based + Priority-based |
| **Sessions** | Actual booked sessions | Role-based only |

**Schedule Panel** has two filter types:
1. **Role-based filters** (top) - Filter by user's role
2. **Priority filters** (in table header) - Filter by urgency level

---

## Panel ID Standardization

All three profiles now use consistent panel IDs:

| Profile | Schedule Panel ID | Sessions Panel ID |
|---------|-------------------|-------------------|
| **Tutor** | `schedule-panel` | `sessions-panel` |
| **Student** | `schedule-panel` | `sessions-panel` |
| **Parent** | `schedule-panel` (was `family-schedule-panel`) | `sessions-panel` |

This standardization makes:
- Navigation code more predictable
- Panel switching more consistent
- Debugging and maintenance easier

---

## JavaScript Implementation

### **Function to Implement**
All three profiles need a `filterSchedulesByRole()` function in their respective schedule managers:

```javascript
// Filter schedules by user's role
function filterSchedulesByRole(role) {
    console.log(`Filtering schedules by role: ${role}`);

    // Update filter buttons
    document.querySelectorAll('.mb-6 button[onclick^="filterSchedulesByRole"]')
        .forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200');
        });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Filter schedules by user's role in the schedule
    if (role === 'all') {
        loadSchedules();
    } else {
        const filteredSchedules = allSchedules.filter(schedule => {
            return schedule.user_role === role;
        });
        displayFilteredSchedules(filteredSchedules);
    }
}

// Make function globally accessible
window.filterSchedulesByRole = filterSchedulesByRole;
```

### **Expected in Schedule Manager Files**
- [js/tutor-profile/schedule-tab-manager.js](js/tutor-profile/schedule-tab-manager.js)
- [js/student-profile/schedule-manager.js](js/student-profile/schedule-manager.js) (if exists)
- [js/parent-profile/schedule-manager.js](js/parent-profile/schedule-manager.js) (if exists)

---

## Backend Integration

### **API Changes Needed**
Schedules should be returned with a `user_role` field, just like sessions:

**Endpoint:** `GET /api/user/schedules?filter_by={role}`

**Response:**
```json
{
  "schedules": [
    {
      "id": 456,
      "title": "Math Tutoring Block",
      "start_time": "09:00",
      "end_time": "11:00",
      "priority_level": "high",
      "user_role": "tutor",
      "created_at": "2026-01-15"
    },
    {
      "id": 457,
      "title": "Physics Study Session",
      "start_time": "14:00",
      "end_time": "16:00",
      "priority_level": "medium",
      "user_role": "student",
      "created_at": "2026-01-16"
    },
    {
      "id": 458,
      "title": "Alice's Piano Practice",
      "start_time": "17:00",
      "end_time": "18:00",
      "priority_level": "low",
      "user_role": "parent",
      "created_at": "2026-01-17"
    }
  ]
}
```

The backend determines `user_role` by checking which role the user created the schedule for.

---

## Files Modified

1. **[profile-pages/tutor-profile.html](profile-pages/tutor-profile.html)** - Added role filters to schedule panel
2. **[profile-pages/student-profile.html](profile-pages/student-profile.html)** - Added role filters to schedule panel
3. **[profile-pages/parent-profile.html](profile-pages/parent-profile.html)** - Added role filters + changed panel ID from `family-schedule-panel` to `schedule-panel` + updated all references

---

## Testing Checklist

- [ ] **Tutor Profile**
  - [ ] Schedule panel opens correctly
  - [ ] Role filters display and are clickable
  - [ ] Priority filters still work (Urgent, High, Medium, Low)
  - [ ] Clicking role filter changes button styling

- [ ] **Student Profile**
  - [ ] Schedule panel opens correctly
  - [ ] Role filters display and are clickable
  - [ ] New Schedule button still works
  - [ ] Clicking role filter changes button styling

- [ ] **Parent Profile**
  - [ ] Schedule panel opens correctly (using `schedule-panel` ID)
  - [ ] Sidebar "My Schedule" link works
  - [ ] FAB menu schedule link works
  - [ ] Role filters display and are clickable
  - [ ] Priority filters still work (Urgent, High, Medium, Low)
  - [ ] Create Schedule button works
  - [ ] Clicking role filter changes button styling

- [ ] **Cross-Profile Consistency**
  - [ ] All three profiles have identical role filter buttons
  - [ ] All three profiles use `schedule-panel` ID
  - [ ] Navigation works consistently across profiles

---

## Summary

Successfully added role-based session filters to the Schedule panels across all three user profiles, matching the filters already in the Sessions panels. Additionally, standardized the parent profile's schedule panel ID from `family-schedule-panel` to `schedule-panel` for consistency.

This creates a unified filtering experience:
- **Sessions Panel** - Role-based filters for actual bookings
- **Schedule Panel** - Role-based filters + Priority filters for availability/plans

Users with multiple roles can now easily organize both their schedules and sessions by the role they're acting in.

---

**Implementation Date:** January 29, 2026
**Status:** ✅ Complete (HTML only - JavaScript functions need to be implemented)
**Files Changed:** 3 (tutor-profile.html, student-profile.html, parent-profile.html)
**Impact:** Improved UX consistency across all profiles and panels
**Next Step:** Implement `filterSchedulesByRole()` JavaScript function in respective schedule managers
