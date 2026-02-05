# Credential Management Systems Comparison

## Overview
Astegni has **two different credential management implementations** for different profile types. Understanding the differences is crucial for maintaining and debugging the credential system.

## System Comparison

| Feature | Tutor Profile | Student Profile |
|---------|---------------|-----------------|
| **Implementation** | External JS file | Inline in HTML |
| **File** | `js/tutor-profile/credential-manager.js` | `profile-pages/student-profile.html` |
| **Structure** | Single grid, filtered view | Multiple grids, tabbed sections |
| **Grid IDs** | `credentials-grid` | `achievements-grid`, `academic-grid` |
| **Empty State IDs** | `credentials-empty-state` | `achievements-empty-state`, `academic-empty-state` |
| **Credential Types** | Achievement, Academic, Experience (3) | Achievement, Academic (2) |
| **Switching Logic** | Filter + re-render same grid | Show/hide different sections |
| **Upload Modal** | Shared modal | Shared modal |
| **API Endpoints** | `/api/tutor/documents` | `/api/documents?uploader_role=student` |

## Tutor Profile Architecture

### File Structure
```
js/tutor-profile/
  └── credential-manager.js ← Single file handles everything
```

### HTML Structure
```html
<!-- Single grid for ALL credential types -->
<div id="credentials-grid">
  <!-- Filtered credentials rendered here -->
</div>

<div id="credentials-empty-state">
  <!-- Shown when no credentials of current type -->
</div>
```

### JavaScript Logic
```javascript
// Line 302: Looks for single grid
const credentialsGrid = document.getElementById('credentials-grid');

// Filters allCredentials array by type
const filteredCredentials = allCredentials.filter(
  cred => cred.document_type === credentialType
);

// Re-renders grid with filtered results
credentialsGrid.innerHTML = '';
filteredCredentials.forEach(cred => {
  const card = createCredentialCard(cred);
  credentialsGrid.insertAdjacentHTML('beforeend', card);
});
```

## Student Profile Architecture

### File Structure
```
profile-pages/
  └── student-profile.html ← All credential code inline (lines 6480-7100)
```

### HTML Structure
```html
<!-- Separate section for achievements -->
<div id="cred-section-achievement" class="credential-section">
  <div id="achievements-grid">
    <!-- Achievement credentials rendered here -->
  </div>
  <div id="achievements-empty-state">
    <!-- Shown when no achievements -->
  </div>
</div>

<!-- Separate section for academic -->
<div id="cred-section-academic" class="credential-section hidden">
  <div id="academic-grid">
    <!-- Academic credentials rendered here -->
  </div>
  <div id="academic-empty-state">
    <!-- Shown when no academic credentials -->
  </div>
</div>
```

### JavaScript Logic
```javascript
// Line 7023: Maps section names to credential types
const sectionToTypeMap = {
  'achievement': 'achievement',
  'academic': 'academic_certificate',
  'academics': 'academic_certificate'
};

// Line 6537, 6673: Maps types to grid IDs
const containerMap = {
  'achievement': 'achievements-grid',
  'academic_certificate': 'academic-grid'
};

// Shows/hides entire sections
document.querySelectorAll('.credential-section').forEach(sec =>
  sec.classList.add('hidden')
);
document.getElementById(`cred-section-${section}`).classList.remove('hidden');
```

## Why Two Different Systems?

### Design Rationale

**Tutor Profile (External JS):**
- Tutors have 3 credential types (including "Experience")
- More complex with work experience features
- Reusable across multiple tutor-related pages
- Justifies external module

**Student Profile (Inline):**
- Students have only 2 credential types
- Simpler, more visual tabbed interface
- Page-specific implementation
- Fewer lines of code, easier to maintain inline

### Performance Implications

**Tutor (Single Grid):**
- ✅ Less DOM manipulation (one grid)
- ❌ Re-renders entire grid on type switch
- ✅ Smaller HTML file

**Student (Multiple Grids):**
- ✅ No re-rendering on switch (just show/hide)
- ❌ More DOM elements in memory
- ❌ Larger HTML file

## Common Pitfalls

### ❌ DON'T: Load credential-manager.js in Student Profile
```html
<!-- WRONG - Causes "Credentials grid not found" error -->
<script src="../js/tutor-profile/credential-manager.js"></script>
```

**Why?** The credential-manager.js looks for `credentials-grid` which doesn't exist in the student profile.

### ✅ DO: Use Inline Code for Student Profile
```html
<!-- CORRECT - Student profile has its own inline implementation -->
<script>
  function switchCredentialSection(section) {
    // ... inline implementation ...
  }
</script>
```

### ❌ DON'T: Use Wrong Grid IDs
```javascript
// WRONG in student profile
const grid = document.getElementById('credentials-grid'); // Doesn't exist!

// CORRECT in student profile
const grid = document.getElementById('academic-grid'); // Exists ✓
```

### ✅ DO: Check Profile Type Before Modifications
Before modifying credential code, always check:
1. Which profile am I working on? (tutor vs student)
2. Which implementation does it use? (external vs inline)
3. What grid IDs does it expect?

## API Differences

### Tutor Endpoints
```javascript
// Load all tutor credentials
GET /api/tutor/documents

// Upload tutor credential
POST /api/tutor/documents/upload

// Update tutor credential
PUT /api/tutor/documents/{id}

// Delete tutor credential
DELETE /api/tutor/documents/{id}
```

### Student Endpoints
```javascript
// Load student credentials (filtered by uploader_role)
GET /api/documents?document_type={type}&uploader_role=student

// Upload student credential
POST /api/student/documents/upload

// Update student credential
PUT /api/student/documents/{id}

// Delete student credential
DELETE /api/student/documents/{id}
```

## Debugging Guide

### Student Credentials Not Loading?

1. **Check Console for Errors**
   ```
   "Credentials grid not found" ← Wrong grid ID or script conflict
   "Container not found for type" ← Wrong container map
   ```

2. **Verify Script Tags**
   ```html
   <!-- Should NOT have this in student profile -->
   <script src="../js/tutor-profile/credential-manager.js"></script>
   ```

3. **Check Grid IDs in HTML**
   ```html
   <!-- Must have these IDs in student profile -->
   <div id="achievements-grid">
   <div id="academic-grid">
   ```

4. **Verify Container Maps in JS**
   ```javascript
   // Line ~6537, 6580, 6673
   'academic_certificate': 'academic-grid' // Not 'certificates-grid'!
   ```

### Tutor Credentials Not Loading?

1. **Check Console for Errors**
   ```
   "credentials-grid not found" ← Grid doesn't exist
   "Failed to load credentials" ← API error
   ```

2. **Verify Script Tags**
   ```html
   <!-- Must have this in tutor profile -->
   <script src="../js/tutor-profile/credential-manager.js"></script>
   ```

3. **Check Grid IDs in HTML**
   ```html
   <!-- Must have this ID in tutor profile -->
   <div id="credentials-grid">
   ```

## Migration Notes

### If You Need to Unify the Systems

**Option 1: Extend credential-manager.js**
- Add support for multi-grid layout
- Add configuration to switch between modes
- Risk: Increased complexity

**Option 2: Extract student code to separate file**
- Create `js/student-profile/credential-manager.js`
- Keep architectures separate
- Risk: Code duplication

**Option 3: Create shared base class**
- Extract common functions to `js/common/credential-base.js`
- Each profile extends the base
- Risk: Over-engineering

**Recommendation:** Keep them separate. The implementations are fundamentally different enough that trying to unify them would add unnecessary complexity.

## File Reference

| Component | Tutor Profile | Student Profile |
|-----------|---------------|-----------------|
| **HTML** | `profile-pages/tutor-profile.html` | `profile-pages/student-profile.html` |
| **JavaScript** | `js/tutor-profile/credential-manager.js` | Inline (lines 6480-7100) |
| **Modal** | `modals/common-modals/upload-document-modal.html` | Same (shared) |
| **CSS** | `css/tutor-profile/tutor-profile.css` | `css/student-profile/student-profile.css` |
| **API** | `/api/tutor/documents/*` | `/api/documents?uploader_role=student` |

## Version History

- **v2.1.0** - Current: Two separate implementations
- **v2.0.0** - Unified credential-manager.js (caused issues)
- **v1.5.0** - Separate inline implementations (stable)

---

**Last Updated:** 2026-01-30
**Maintainer:** Development Team
**Related Docs:** `STUDENT_CREDENTIALS_GRID_FIX.md`, `CLAUDE.md`
