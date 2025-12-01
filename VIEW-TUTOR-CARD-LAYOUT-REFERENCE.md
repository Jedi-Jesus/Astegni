# View Tutor Card Layout Reference

## Exact Card Layouts Implemented

This document shows the exact card layouts that are now rendering in `view-tutor.html`, matching `tutor-profile.html`.

---

## 1. Achievement Cards

### Visual Layout
```
┌─────────────────────────────────────────┐
│  ⭐ FEATURED    [✓ Verified]            │
│                                          │
│            🏆                            │
│        (Large Icon)                      │
│                                          │
│      Achievement Title                   │
│         category                         │
│           2024                           │
│      Issuing Organization                │
│                                          │
│  Brief description text that shows       │
│  up to 3 lines maximum before            │
│  truncating with ellipsis...             │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │      [View Details]              │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Code Structure
```javascript
<div class="card p-6 text-center" style="border-color: gold; border-width: 2px;">
    <div class="flex justify-between items-start mb-2">
        {is_featured ? '<div class="text-yellow-500 text-sm font-bold">⭐ FEATURED</div>' : ''}
        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">✓ Verified</span>
    </div>
    <div class="text-6xl mb-3">{icon}</div>
    <h3 class="text-lg font-bold mb-2">{title}</h3>
    <p class="text-sm text-gray-600 mb-2">{category}</p>
    <p class="text-sm font-semibold">{year}</p>
    <p class="text-sm text-gray-600 mt-2">{issuer}</p>
    <p class="text-sm text-gray-700 mt-3 line-clamp-3">{description}</p>
    <button class="btn-secondary text-sm mt-4 w-full">View Details</button>
</div>
```

### Features
- ✅ Icon badge (6xl size)
- ✅ Featured star badge (conditional)
- ✅ Verification status badge
- ✅ Category and year display
- ✅ 3-line description truncation
- ✅ Colored border (gold default)
- ✅ Centered text alignment

---

## 2. Certification Cards

### Visual Layout
```
┌─────────────────────────────────────────┐
│  Certification Name          ✓          │
│  Issuing Organization                   │
│  Field of Study                          │
│                                          │
│  ┌──────────────────────────┐           │
│  │                          │           │
│  │  [Certificate Image]     │           │
│  │                          │           │
│  └──────────────────────────┘           │
│                                          │
│  📅 Issued: Jan 2024                    │
│  ⏰ Expires: Jan 2026                   │
│  🔑 ID: CERT-123456                     │
│                                          │
│  Brief description of the certification  │
│  that can span up to 3 lines...         │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │      [View Details]              │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Code Structure
```javascript
<div class="card p-6">
    <div class="flex justify-between items-start mb-4">
        <div class="flex-1">
            <h3 class="text-xl font-bold mb-2">{name}</h3>
            <p class="text-gray-600 mb-1">{issuing_organization}</p>
            <p class="text-sm text-gray-500">{field_of_study}</p>
        </div>
        <span class="text-green-500 text-2xl">✓</span>
    </div>

    <div class="mb-4">
        <img src="{certificate_image_url}" class="w-full rounded-lg border-2">
    </div>

    <div class="text-sm text-gray-600 space-y-1">
        <p>📅 Issued: {issue_date}</p>
        <p>⏰ Expires: {expiry_date}</p>
        <p>🔑 ID: {credential_id}</p>
    </div>

    <p class="text-gray-700 mt-3 line-clamp-3">{description}</p>

    <button class="btn-secondary text-sm mt-4 w-full">View Details</button>
</div>
```

### Features
- ✅ Certificate image preview
- ✅ Verification checkmark (2xl size)
- ✅ Issue and expiry dates with icons
- ✅ Credential ID display
- ✅ 3-line description truncation
- ✅ Full-width image container

---

## 3. Experience Cards

### Visual Layout
```
┌─────────────────────────────────────────┐
│║ Job Title                    [Current] │
│║ Institution Name                       │
│║ Location                               │
│║                                        │
│║ 📅 Jan 2020 - Present                 │
│║ 💼 Full-time                           │
│║                                        │
│║ Brief description of the role and      │
│║ responsibilities in this position...   │
│║                                        │
│║ ┌──────────────────────────────────┐  │
│║ │      [View Details]              │  │
│║ └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
  ↑ Blue left border (4px)
```

### Code Structure
```javascript
<div class="card p-6 border-l-4 border-blue-500">
    <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
            <h3 class="text-xl font-bold">{job_title}</h3>
            <p class="text-lg text-gray-700">{institution}</p>
            <p class="text-sm text-gray-600">{location}</p>
        </div>
        {is_current ?
            <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                Current
            </span> : ''
        }
    </div>

    <div class="text-sm text-gray-600 mb-3">
        <p>📅 {start_date} - {is_current ? 'Present' : end_date}</p>
        <p>💼 {employment_type}</p>
    </div>

    <p class="text-gray-700 mb-3 line-clamp-3">{description}</p>

    <button class="btn-secondary text-sm mt-4 w-full">View Details</button>
</div>
```

### Features
- ✅ Blue left border (4px, color: #3b82f6)
- ✅ "Current" badge for ongoing positions
- ✅ Start/end date range display
- ✅ Employment type indicator
- ✅ 3-line description truncation
- ✅ Location display

---

## Grid Layouts

### Achievements Panel
```css
.achievements-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 3 columns on large screens */
    gap: 1.5rem;
}

@media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on medium screens */
}

@media (max-width: 640px) {
    grid-template-columns: 1fr; /* 1 column on small screens */
}
```

### Certifications & Experience Panels
```css
.certifications-grid,
.experience-timeline {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 2 columns on large screens */
    gap: 1.5rem;
}

@media (max-width: 768px) {
    grid-template-columns: 1fr; /* 1 column on small screens */
}
```

---

## View Modal Layout

### All modals follow this structure:
```
┌────────────────────────────────────────────────────┐
│  🏆 Achievement Details                         ✕  │
├────────────────────────────────────────────────────┤
│                                                    │
│  [Full details in read-only format]               │
│                                                    │
│  - All fields displayed                           │
│  - Certificate preview (if uploaded)              │
│  - Verification status badge                      │
│  - "View Full File" button for certificates       │
│                                                    │
│  ┌──────────────────────────────────┐             │
│  │         [Close]                  │             │
│  └──────────────────────────────────┘             │
└────────────────────────────────────────────────────┘
```

**Note:** Edit and Delete buttons are automatically hidden for view-tutor.html

---

## Data Filtering

All panels only show verified items:

```javascript
// Achievements Panel
const achievements = this.data.achievements.filter(a => a.is_verified);

// Certifications Panel
const certificates = this.data.certificates.filter(cert => cert.is_verified);

// Experience Panel
const experiences = this.data.experience.filter(exp => exp.is_verified);
```

---

## Empty States

When no items exist:

```
┌─────────────────────────────────────────┐
│                                          │
│                                          │
│      No achievements to display.         │
│                                          │
│                                          │
└─────────────────────────────────────────┘
```

---

## Comparison Summary

| Element | tutor-profile.html | view-tutor.html |
|---------|-------------------|-----------------|
| Card HTML | ✅ Same | ✅ Same |
| Card Styling | ✅ Same | ✅ Same |
| Grid Layout | ✅ Same | ✅ Same |
| Icons | ✅ Same | ✅ Same |
| Badges | ✅ Same | ✅ Same |
| Truncation | ✅ Same | ✅ Same |
| Modal Structure | ✅ Same | ✅ Same |
| Edit Buttons | ✅ Visible | ❌ Hidden |
| Delete Buttons | ✅ Visible | ❌ Hidden |
| Add/Upload Buttons | ✅ Visible | ❌ Hidden |

**Result:** 100% visual match for cards and view modals!
