# Student Credentials Panel Fix - Complete

## Problem
In student-profile.html, the credentials panel cards (Achievements and Academic Credentials) were not properly switching sections and loading role-based data from the credentials table.

## Solution Applied

### 1. Fixed Credential Count Badge IDs
**File**: `js/common-modals/credential-manager.js` (line 528-549)

**Issue**: Student profile uses different badge IDs than tutor profile:
- Student: `stat-achievement-count`, `stat-academic-count`
- Tutor: `achievement-count`, `academic-count`

**Fix**: Updated `updateCredentialCounts()` to support both naming conventions:
```javascript
const achievementBadge = document.getElementById('achievement-count') || document.getElementById('stat-achievement-count');
const academicBadge = document.getElementById('academic-count') || document.getElementById('stat-academic-count');
const experienceBadge = document.getElementById('experience-count') || document.getElementById('stat-experience-count');
```

### 2. Fixed Card Border Highlighting
**File**: `js/common-modals/credential-manager.js` (line 297-335)

**Issue**: The code was looking for `.credential-type-card` class, but student profile cards use IDs only (`cred-card-achievement`, `cred-card-academic`). Border rings weren't being removed from inactive cards.

**Fix**: Updated to remove ring classes from all cards by ID:
```javascript
// Remove active styling from ALL credential cards
const allCards = ['achievement', 'academic', 'experience'];
allCards.forEach(type => {
    const card = document.getElementById(`cred-card-${type}`);
    if (card) {
        card.classList.remove('active', 'ring-4', 'ring-yellow-400', 'ring-blue-400', 'ring-green-400');
    }
});

// Add active styling to the selected card
const activeCard = document.getElementById(`cred-card-${credentialType}`);
if (activeCard) {
    activeCard.classList.add('active', 'ring-4');
    if (credentialType === 'achievement') {
        activeCard.classList.add('ring-yellow-400');
    } else if (credentialType === 'academic') {
        activeCard.classList.add('ring-blue-400');
    } else if (credentialType === 'experience') {
        activeCard.classList.add('ring-green-400');
    }
}
```

### 3. Fixed Section Switching
**File**: `js/common-modals/credential-manager.js` (line 347-360)

**Issue**: Student profile has separate sections (`cred-section-achievement`, `cred-section-academic`) that need to be hidden/shown when switching between credential types.

**Fix**: Added section visibility toggle logic to `switchCredentialSection()`:
```javascript
// Hide/Show credential sections (for student profile layout with separate sections)
const allSections = ['achievement', 'academic', 'experience'];
allSections.forEach(type => {
    const section = document.getElementById(`cred-section-${type}`);
    if (section) {
        if (type === credentialType) {
            section.classList.remove('hidden');
            console.log(`✅ Showing section: cred-section-${type}`);
        } else {
            section.classList.add('hidden');
            console.log(`❌ Hiding section: cred-section-${type}`);
        }
    }
});
```

## How It Works Now

### Click Flow
1. User clicks "Awards and Honors" card → `onclick="window.switchCredentialSection('achievement')"`
2. `switchCredentialSection('achievement')` is called:
   - Hides `cred-section-academic` section
   - Shows `cred-section-achievement` section
   - Calls `displayCredentials('achievement')`
3. `displayCredentials('achievement')`:
   - Filters credentials where `document_type === 'achievement'`
   - Finds grid: `#achievements-grid`
   - Renders achievement cards in the grid

4. User clicks "Academic Credentials" card → `onclick="window.switchCredentialSection('academic')"`
5. `switchCredentialSection('academic')` is called:
   - Hides `cred-section-achievement` section
   - Shows `cred-section-academic` section
   - Calls `displayCredentials('academic')`
6. `displayCredentials('academic')`:
   - Filters credentials where `document_type === 'academic'`
   - Finds grid: `#academic-grid`
   - Renders academic credential cards in the grid

### Data Loading (Role-Based)
The credential manager automatically detects the student role and loads data:

**API Endpoint**: `GET /api/documents?uploader_role=student`
- Backend file: `astegni-backend/credentials_endpoints.py` (line 1310-1400)
- Fetches from unified `credentials` table
- Filters by `uploader_role='student'` and `uploader_id=student_profile_id`
- Returns all credentials for the current student

**Role Detection** (line 38-42):
```javascript
function getCurrentRole() {
    const role = localStorage.getItem('activeRole') || localStorage.getItem('userRole');
    console.log('[CredentialManager] Current role:', role);
    return role;
}
```

**Endpoint Selection** (line 60-71):
```javascript
// Students use unified endpoints with uploader_role parameter
return {
    list: `${CRED_API_BASE_URL}/api/documents?uploader_role=${role}`,
    upload: `${CRED_API_BASE_URL}/api/documents/upload`,
    update: (id) => `${CRED_API_BASE_URL}/api/documents/${id}`,
    delete: (id) => `${CRED_API_BASE_URL}/api/documents/${id}`,
    useRoleParam: true,
    roleParamValue: role
};
```

## Student Profile HTML Structure

### Credentials Panel (student-profile.html line 3335-3400)
```html
<div id="credentials-panel" class="panel-content hidden">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
        <h1>📄 My Credentials</h1>
        <button onclick="window.openUploadCredentialModal()">Upload Credential</button>
    </div>

    <!-- Type Selector Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Achievements Card -->
        <div onclick="window.switchCredentialSection('achievement')" id="cred-card-achievement">
            <h3>Awards and Honors</h3>
            <div id="stat-achievement-count">0</div>
        </div>

        <!-- Academic Credentials Card -->
        <div onclick="window.switchCredentialSection('academic')" id="cred-card-academic">
            <h3>Academic Credentials</h3>
            <div id="stat-academic-count">0</div>
        </div>
    </div>

    <!-- Awards and Honors Section -->
    <div id="cred-section-achievement" class="credential-section">
        <h2>🏆 Awards and Honors</h2>
        <div id="achievements-grid">
            <!-- Achievement credentials loaded here -->
        </div>
    </div>

    <!-- Academic Credentials Section -->
    <div id="cred-section-academic" class="credential-section hidden">
        <h2>🎓 Academic Credentials</h2>
        <div id="academic-grid">
            <!-- Academic credentials loaded here -->
        </div>
    </div>
</div>
```

## Database Schema

### Credentials Table (unified for all roles)
```sql
CREATE TABLE credentials (
    id SERIAL PRIMARY KEY,
    uploader_id INTEGER NOT NULL,
    uploader_role VARCHAR(20) NOT NULL,  -- 'student', 'tutor', 'parent', 'advertiser'
    document_type VARCHAR(50) NOT NULL,  -- 'achievement', 'academic', 'experience'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issued_by VARCHAR(255),
    date_of_issue DATE,
    expiry_date DATE,
    years INTEGER,  -- For experience documents
    document_url TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by_admin_id INTEGER,
    status_reason TEXT,
    status_at TIMESTAMP,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Checklist

### Manual Testing
1. ✅ Open student-profile.html
2. ✅ Click on "Credentials" panel tab
3. ✅ Verify both cards show "0" initially
4. ✅ Click "Awards and Honors" card
   - Achievement section should be visible
   - Academic section should be hidden
   - Achievements grid should load student's achievements
5. ✅ Click "Academic Credentials" card
   - Achievement section should be hidden
   - Academic section should be visible
   - Academic grid should load student's academic credentials
6. ✅ Upload a new achievement
   - Count on "Awards and Honors" card should increment
   - New achievement should appear in achievements grid
7. ✅ Upload a new academic credential
   - Count on "Academic Credentials" card should increment
   - New credential should appear in academic grid

### Console Checks
Open browser console and verify these logs:
```
[CredentialManager] Current role: student
✅ Loaded X student credentials
📊 Credential counts - Achievements: X, Academic: Y, Experience: 0
✅ Showing section: cred-section-achievement
❌ Hiding section: cred-section-academic
```

## Files Modified

1. **js/common-modals/credential-manager.js**
   - Line 528-549: Updated `updateCredentialCounts()` to support both ID naming conventions
   - Line 297-367: Added section visibility toggle in `switchCredentialSection()`

## Backend Endpoints Used

1. **GET /api/documents?uploader_role=student**
   - Returns all credentials for current student
   - File: `astegni-backend/credentials_endpoints.py` line 1310

2. **POST /api/documents/upload**
   - Uploads new credential with `uploader_role=student`
   - File: `astegni-backend/credentials_endpoints.py`

3. **PUT /api/documents/{id}**
   - Updates existing credential
   - File: `astegni-backend/credentials_endpoints.py`

4. **DELETE /api/documents/{id}**
   - Deletes credential
   - File: `astegni-backend/credentials_endpoints.py`

## Summary

The fix ensures that:
1. ✅ Clicking "Awards and Honors" card opens `cred-section-achievement` and loads achievements
2. ✅ Clicking "Academic Credentials" card opens `cred-section-academic` and loads academic credentials
3. ✅ Both sections pull data from the unified `credentials` table
4. ✅ Data is filtered by `uploader_role='student'` and student's profile ID
5. ✅ Counts are updated correctly on both card types
6. ✅ Works seamlessly with the existing upload/edit/delete workflow

The credential manager is now fully role-aware and supports both tutor and student profiles with different UI layouts.
