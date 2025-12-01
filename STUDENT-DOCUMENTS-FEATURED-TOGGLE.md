# Student Documents Featured Toggle Feature

## Overview
Added an "is_featured" toggle button to the Upload Document Modal in student-profile.html that allows students to mark documents as featured. This feature sets the `is_featured` field (true/false) in the `student_documents` database table.

## Changes Made

### 1. Frontend - student-profile.html

#### UI Component Added (Line ~4825-4836)
```html
<!-- Featured Toggle -->
<div class="form-group">
    <label class="form-label">Featured Document</label>
    <div style="display: flex; align-items: center; gap: 12px;">
        <label class="toggle-switch">
            <input type="checkbox" id="isFeaturedToggle" name="isFeatured">
            <span class="toggle-slider"></span>
        </label>
        <span id="featuredStatusText" style="font-size: 14px; color: var(--text-secondary);">Not Featured</span>
    </div>
    <p class="text-sm text-gray-500 mt-1">Featured documents appear prominently on your profile</p>
</div>
```

#### CSS Styles Added (Line ~1048-1107)
- Modern toggle switch with smooth animation
- Dark mode support
- Primary color highlighting when checked
- 50px width, 26px height toggle
- Smooth 0.4s transition effects

#### JavaScript Updates

**1. Form Data Submission (Line ~5732)**
```javascript
formData.append('is_featured', document.getElementById('isFeaturedToggle').checked);
```

**2. Toggle Status Text Handler (Line ~6214-6232)**
```javascript
// Updates text when toggle changes
featuredToggle.addEventListener('change', function() {
    if (this.checked) {
        featuredStatusText.textContent = 'Featured ⭐';
        featuredStatusText.style.color = 'var(--primary)';
        featuredStatusText.style.fontWeight = '600';
    } else {
        featuredStatusText.textContent = 'Not Featured';
        featuredStatusText.style.color = 'var(--text-secondary)';
        featuredStatusText.style.fontWeight = '400';
    }
});
```

### 2. Backend - student_documents_endpoints.py

#### Endpoint Updated
**File:** `astegni-backend/student_documents_endpoints.py`

**Changes:**
1. Added `is_featured` parameter to upload endpoint (Line ~94):
```python
is_featured: Optional[bool] = Form(False),
```

2. Updated INSERT query to include is_featured column (Line ~177-180):
```sql
INSERT INTO student_documents
(student_id, document_type, title, description, issued_by, date_of_issue,
 expiry_date, document_url, file_name, file_type, file_size, is_featured)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
```

3. Added is_featured value to query parameters (Line ~194):
```python
is_featured  # Added as 12th parameter
```

## How It Works

### User Flow
1. Student opens "Upload Document Modal" from Documents Panel
2. Fills in document details (type, title, description, etc.)
3. Toggles "Featured Document" switch ON or OFF
4. Status text updates in real-time:
   - OFF: "Not Featured" (gray text)
   - ON: "Featured ⭐" (primary color, bold)
5. Submits form
6. Backend receives `is_featured` as boolean (true/false)
7. Document saved to database with is_featured status

### Database
- **Table:** `student_documents`
- **Column:** `is_featured` (boolean)
- **Default:** false
- **Purpose:** Mark documents to display prominently on student profile

### Visual Design
- **Toggle OFF:** Gray slider (left position)
- **Toggle ON:** Primary blue slider (right position)
- **Animation:** Smooth 0.4s transition
- **Dark Mode:** Adaptive colors for both themes

## Files Modified

1. **Frontend:**
   - `profile-pages/student-profile.html`
     - Added toggle HTML (line ~4825)
     - Added CSS styles (line ~1048)
     - Updated JavaScript form submission (line ~5732)
     - Added toggle event listener (line ~6214)

2. **Backend:**
   - `astegni-backend/student_documents_endpoints.py`
     - Added is_featured parameter (line ~94)
     - Updated INSERT query (line ~177)
     - Added is_featured to VALUES tuple (line ~194)

## Testing

### Quick Test Steps
1. Start backend: `cd astegni-backend && python app.py`
2. Start frontend: `python -m http.server 8080`
3. Login as student
4. Navigate to Student Profile → Documents Panel
5. Click "Upload New Document"
6. Toggle "Featured Document" switch ON
7. Upload a document
8. Check database: `is_featured` should be `true`
9. Upload another document with toggle OFF
10. Check database: `is_featured` should be `false`

### Database Query to Verify
```sql
SELECT id, title, document_type, is_featured, created_at
FROM student_documents
WHERE student_id = <your_student_id>
ORDER BY created_at DESC;
```

## Future Enhancements
- Filter documents by featured status
- Display featured documents in special section
- Limit number of featured documents per student
- Auto-display featured docs on public profile
- Featured badge/icon on document cards

## Technical Notes
- Toggle state is boolean (true/false), not string
- Default value is `false` when toggle is unchecked
- Backend properly handles Optional[bool] with Form(False)
- CSS uses CSS variables for theme compatibility
- Dark mode fully supported
