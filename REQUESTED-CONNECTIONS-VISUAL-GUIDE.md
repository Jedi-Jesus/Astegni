# Requested Connections & Tab-Style Visual Guide

## Before vs After Comparison

### BEFORE: Card-Style Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                         Community                                │
│         Connect with tutors, students, parents, etc.            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   👥         │  │   📅         │  │   🎭         │         │
│  │ Connections  │  │   Events     │  │   Clubs      │         │
│  │ View network │  │  Workshops   │  │ Join clubs   │         │
│  │              │  │              │  │              │         │
│  │ Total: 12    │  │ Total: 5     │  │ Total: 3     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### AFTER: Tab-Style Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                         Community                                │
│         Connect with tutors, students, parents, etc.            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ╔═══════════════╗ ┌─────────────┐ ┌─────────────┐       │  │
│  │ ║ 👥 Connections║ │ 📅 Events   │ │ 🎭 Clubs    │       │  │
│  │ ║      12       ║ │      5      │ │      3      │       │  │
│  │ ╚═══════════════╝ └─────────────┘ └─────────────┘       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
*Note: Double-lined box (╔═╗) indicates active tab with primary color background*

## Connection Tabs Layout

### BEFORE: No Requested Tab
```
┌────────────────────────────────────────────────────────────┐
│  [All: 12]  [Tutors: 5]  [Students: 4]  [Parents: 3]  [+] │
└────────────────────────────────────────────────────────────┘
```

### AFTER: With Requested Tab
```
┌──────────────────────────────────────────────────────────────────────┐
│  [All: 12]  [Requested: 2]  [Tutors: 5]  [Students: 4]  [Parents: 3]  [+] │
└──────────────────────────────────────────────────────────────────────┘
```

## Requested Connection Card Visual

### Regular Connection Card
```
┌─────────────────────────────────────────────┐
│  ╭───╮                                      │
│  │ 👤│  John Smith                          │
│  ╰───╯  Connected as Tutor                 │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ✉️  john.smith@email.com           │   │
│  │ 📅  Connected 5 days ago           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [  View Profile  ] [   Message   ]        │
└─────────────────────────────────────────────┘
```

### Requested Connection Card (New!)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ← Yellow border
┃  ╭───╮                                    ┃
┃  │ 👤│🟡 Sarah Johnson                    ┃  ← Yellow indicator
┃  ╰───╯  Wants to connect as Student      ┃
┃                                           ┃
┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   ┃  ← Yellow bg
┃  ┃ ✉️  sarah.j@email.com              ┃   ┃
┃  ┃ 🕐  Requested 2 days ago           ┃   ┃
┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   ┃
┃                                           ┃
┃  [ ✅ Accept ] [ ❌ Reject ] [ 👤 ]       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Differences:**
- 🟡 Yellow/amber border (#fbbf24)
- 🟡 Yellow indicator dot on avatar
- 🟡 Light yellow background for info section
- Text: "Wants to connect" instead of "Connected"
- Buttons: Accept (green), Reject (red), View Profile (outlined)

## Connection Status Badge Colors

### Profile Type Badges
```
Connected as:
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Tutor   │  │ Student  │  │  Parent  │  │Advertiser│
│  (Blue)  │  │  (Blue)  │  │  (Blue)  │  │  (Blue)  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

Wants to connect as:
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Tutor   │  │ Student  │  │  Parent  │
│ (Yellow) │  │ (Yellow) │  │ (Yellow) │
└──────────┘  └──────────┘  └──────────┘
```

## Tab Active States

### Community Main Tabs
```
Active Tab (Primary Color):
╔═══════════════════════╗
║   👥 Connections      ║  ← Blue/Primary background
║         12            ║  ← White text
╚═══════════════════════╝

Inactive Tab (Transparent):
┌───────────────────────┐
│   📅 Events           │  ← Transparent background
│          5            │  ← Gray text
└───────────────────────┘
```

### Connection Filter Tabs
```
Active Filter:
╔═══════════╗
║ All [12]  ║  ← Primary color background, white text
╚═══════════╝

Inactive Filter:
┌─────────────┐
│ Tutors [5]  │  ← Light background, normal text
└─────────────┘
```

## CommunityModal Filter Bar

### BEFORE
```
┌──────────────────────────────────────────────────────────┐
│  [All: 12]  [👨‍🎓 Students: 4]  [👨‍🏫 Tutors: 5]  [👪 Parents: 3]  [+ Add] │
└──────────────────────────────────────────────────────────┘
```

### AFTER
```
┌────────────────────────────────────────────────────────────────────────────┐
│  [All: 12]  [🔔 Requested: 2]  [👨‍🎓 Students: 4]  [👨‍🏫 Tutors: 5]  [👪 Parents: 3]  [+ Add] │
└────────────────────────────────────────────────────────────────────────────┘
```

## Button Styles Reference

### Connection Card Action Buttons

**Regular Connection (2 buttons):**
```
┌─────────────────┐  ┌─────────────────┐
│ 👤 View Profile │  │ 💬 Message      │  ← Outlined     ← Solid Primary
└─────────────────┘  └─────────────────┘
```

**Requested Connection (3 buttons):**
```
┌─────────────┐  ┌─────────────┐  ┌────┐
│ ✅ Accept   │  │ ❌ Reject   │  │ 👤 │  ← Green  ← Red  ← Outlined
└─────────────┘  └─────────────┘  └────┘
```

## Empty State Messages

### All Connections Tab
```
        👥
     (large)
  No connections yet
  Start connecting with tutors,
  students, and parents.
```

### Requested Tab
```
        🔔
     (large)
  No pending connection requests
  Connection requests will appear here.
```

## Responsive Behavior

### Desktop (> 768px)
```
┌──────────────────────────────────────────────────────────┐
│  ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │👥 Connect  │ │📅 Events   │ │🎭 Clubs    │          │
│  │    12      │ │     5      │ │     3      │          │
│  └────────────┘ └────────────┘ └────────────┘          │
└──────────────────────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌────────────────────────────────────────┐
│ ┌──────┐┌──────┐┌──────┐              │  ← Scrollable →
│ │👥 Co││📅 Ev││🎭 Cl│              │
│ │ 12  ││  5  ││  3  │              │
│ └─────┘└─────┘└─────┘              │
└────────────────────────────────────────┘
```

## Color Palette Reference

### Connection Status Colors
- **Connected:** Blue/Primary (#3b82f6)
- **Requested:** Yellow/Amber (#fbbf24)
- **Blocked:** Red (#ef4444)
- **Accept:** Green (#10b981)
- **Reject:** Red (#ef4444)

### Semantic Colors
- **Primary Action:** `var(--button-bg)` (usually #3b82f6)
- **Success:** #10b981 (green)
- **Warning:** #fbbf24 (yellow)
- **Danger:** #ef4444 (red)
- **Muted:** `var(--text-muted)` (gray)

## Hover Effects

### Tab Hover
```
Before Hover:                After Hover:
┌─────────────┐            ┌─────────────┐
│ 📅 Events   │   →       │ 📅 Events   │  ← Slight opacity change
│      5      │            │      5      │  ← or background tint
└─────────────┘            └─────────────┘
```

### Card Hover
```
Before Hover:              After Hover:
┌───────────┐             ┌───────────┐
│ Connection│   →        │ Connection│  ← Box shadow appears
│   Card    │            │   Card    │  ← 0 4px 12px rgba(0,0,0,0.1)
└───────────┘             └───────────┘
```

### Requested Card Hover
```
Before Hover:              After Hover:
┏━━━━━━━━━━┓             ┏━━━━━━━━━━┓
┃ Requested ┃   →        ┃ Requested ┃  ← Yellow glow
┃   Card    ┃            ┃   Card    ┃  ← rgba(251,191,36,0.3)
┗━━━━━━━━━━┛             ┗━━━━━━━━━━┛
```

---

**Legend:**
- `[ ]` = Button
- `┌┐└┘` = Regular border
- `┏┓┗┛` = Highlighted/special border
- `╔╗╚╝` = Active/selected state
- `─│` = Thin line
- `━┃` = Thick line
