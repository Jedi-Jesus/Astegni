# Community Panel - Quick Start Guide

## 🚀 Quick Start (3 Steps)

### 1. Start Servers
```bash
# Terminal 1 - Backend
cd astegni-backend
python app.py

# Terminal 2 - Frontend
cd ..
python -m http.server 8080
```

### 2. Access Tutor Profile
- Navigate to: `http://localhost:8080/profile-pages/tutor-profile.html`
- Log in as a tutor

### 3. Open Community Panel
- Click **"Community"** in the left sidebar
- Explore Connections, Events, Clubs, and Requests tabs!

## 📊 What You'll See

### Connections Tab (Default View)
```
┌─────────────────────────────────────────────────────────┐
│  👥 Connections  📅 Events  🎭 Clubs  📬 Requests       │
│  [Active Card]   [Card]      [Card]    [Card]           │
└─────────────────────────────────────────────────────────┘

Sub-tabs: [All Connections] [Students] [Parents] [Tutors]

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  👤 Avatar   │ │  👤 Avatar   │ │  👤 Avatar   │
│  John Doe    │ │  Jane Smith  │ │  Bob Johnson │
│  👨‍🎓 Student  │ │  👨‍👩‍👧 Parent  │ │  👨‍🏫 Tutor     │
│  🟢 connected│ │  🟢 connected│ │  🟢 connected│
│ [💬 Message] │ │ [💬 Message] │ │ [💬 Message] │
│ [👁️ View]    │ │ [👁️ View]    │ │ [👁️ View]    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Events Tab
```
Summary Cards:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ✅ Joined    │ │ 📅 Upcoming  │ │ 📜 Past      │
│ Events       │ │ Events       │ │ Events       │
│    5         │ │    12        │ │    8         │
└──────────────┘ └──────────────┘ └──────────────┘

Event Cards:
┌──────────────────────────┐
│  [Event Image]  [Badge]  │
│  Workshop on AI          │
│  📅 Dec 15, 2024 2:00 PM │
│  💻 Online Event         │
│  👥 25/50 seats          │
│  💰 Free                 │
│  [View Details] [Join]   │
└──────────────────────────┘
```

### Clubs Tab
```
Summary Cards:
┌──────────────┐ ┌──────────────┐
│ 🎭 Joined    │ │ 🔍 Discover  │
│ Clubs        │ │ Clubs        │
│    3         │ │    15        │
└──────────────┘ └──────────────┘

Club Cards:
┌──────────────────────────┐
│  [Club Image]  [Badge]   │
│  Math Club               │
│  👥 45/100 members       │
│  🌐 Open                 │
│  💰 50 ETB/month         │
│  [View Details] [Join]   │
└──────────────────────────┘
```

## 🎨 Card Features

### Connection Cards
- **Avatar**: Profile picture with role-based fallback
- **Name**: User's full name
- **Role Badge**: 👨‍🎓 Student | 👨‍👩‍👧 Parent | 👨‍🏫 Tutor
- **Status Badge**: 🟢 connected | 🟡 connecting | 🔴 blocked
- **Bio**: User description (if available)
- **Actions**: Message, View Profile

### Event Cards
- **Image**: Event banner with gradient fallback
- **Type Badge**: Workshop | Seminar | Conference | Webinar
- **Date/Time**: Formatted date and time
- **Location**: 📍 Physical or 💻 Online
- **Attendance**: Registered/Available seats
- **Price**: ETB or "Free"
- **Actions**: View Details, Join Event

### Club Cards
- **Image**: Club banner with gradient fallback
- **Category Badge**: Academic | Sports | Arts | Technology
- **Members**: Current/Maximum members
- **Type**: 🌐 Open | 🔒 Invite-only | 🚪 Request-to-join
- **Fee**: Membership price or "Free"
- **Actions**: View Details, Join Club

## 🔍 Interactive Features

### Search
Every section has a search box:
- **Connections**: Search by name, role
- **Events**: Search by title, type, location
- **Clubs**: Search by title, category

### Filtering
- **Connections**: Filter by role (All, Students, Parents, Tutors)
- **Events**: Filter by status (Joined, Upcoming, Past)
- **Clubs**: Filter by membership (Joined, Discover)

### Real-time Loading
- **Loading spinner** while fetching data
- **Empty state messages** when no data exists
- **Error messages** with retry options

## 📱 Responsive Design

### Mobile (< 768px)
- 1 card per row
- Stacked layout
- Touch-optimized buttons

### Tablet (768px - 1024px)
- 2 cards per row
- Balanced spacing
- Easy navigation

### Desktop (> 1024px)
- 3 cards per row
- Full sidebar visible
- Optimal viewing experience

## 🎯 Key Functions

### Data Fetching
```javascript
loadConnectionsGrid('all-connections-grid', 'all')
loadEventsGrid('joined-events-grid', 'joined')
loadClubsGrid('joined-clubs-grid', 'joined')
```

### Tab Switching
```javascript
switchCommunityMainTab('connections')  // Connections tab
switchCommunityMainTab('events')       // Events tab
switchCommunityMainTab('clubs')        // Clubs tab
switchCommunityMainTab('requests')     // Requests tab
```

### Sub-section Switching
```javascript
toggleConnectionsSubSection('students')  // Show only students
toggleEventsSubSection('upcoming')       // Show upcoming events
toggleClubsSubSection('discover')        // Show all clubs
```

## 🐛 Troubleshooting

### No data showing?
1. Check if backend is running: `http://localhost:8000/docs`
2. Verify you're logged in as a tutor
3. Check browser console for errors
4. Ensure database has sample data

### Cards look broken?
1. Verify TailwindCSS CDN is loaded
2. Check for JavaScript errors in console
3. Clear browser cache and reload

### API errors?
1. Check authentication token in localStorage
2. Verify API endpoints in [http://localhost:8000/docs](http://localhost:8000/docs)
3. Check network tab in DevTools

## 📚 Files Created

### New JavaScript Files
1. **`js/tutor-profile/community-panel-data-loader.js`**
   - Fetches data from API
   - Creates beautiful card components
   - Handles loading/empty/error states

2. **`js/tutor-profile/community-panel-integration.js`**
   - Integrates with existing UI
   - Tab switching logic
   - Search and filter functions

### Modified Files
1. **`profile-pages/tutor-profile.html`**
   - Added script tags for new modules (lines 3741, 3744)

## ✅ Testing Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 8080
- [ ] Logged in as a tutor user
- [ ] Community panel opens from sidebar
- [ ] Connections tab loads data automatically
- [ ] Can switch between All/Students/Parents/Tutors
- [ ] Events tab shows joined/upcoming/past events
- [ ] Clubs tab shows joined/discover clubs
- [ ] Search boxes work in all sections
- [ ] Loading spinners appear during data fetch
- [ ] Empty states show helpful messages
- [ ] Cards display with proper styling
- [ ] Action buttons are clickable (placeholders)

## 🎉 Success!

If you see beautiful cards with connections, events, and clubs data, **you're all set!** The community panel is now fully functional and integrated with the database.

---

**Need Help?** Check [COMMUNITY-PANEL-IMPLEMENTATION.md](COMMUNITY-PANEL-IMPLEMENTATION.md) for detailed documentation.
