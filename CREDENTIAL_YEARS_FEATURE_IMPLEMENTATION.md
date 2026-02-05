# Credential Years Field Implementation

## Summary
Successfully implemented a "Years of Experience" field for credentials that only appears when the credential type is set to "Experience/Work History".

## Changes Made

### 1. Database Migration
**File:** `astegni-backend/migrate_add_years_to_credentials.py`

- Created migration script to add `years` column to `credentials` table
- Column type: `INTEGER`, nullable
- Added column comment for documentation
- Migration successfully executed

**Verification:**
```
Column Name: years
Data Type: integer
Nullable: YES
```

### 2. Frontend Changes

#### Modal Update
**File:** [modals/common-modals/upload-document-modal.html](modals/common-modals/upload-document-modal.html)

- Added "Years of Experience" input field (lines 29-36)
- Field is initially hidden with `display: none`
- Input type: `number` with min=0, max=50
- Added `onchange="handleCredentialTypeChange(this)"` to credential type select

#### JavaScript Manager Update
**File:** [js/tutor-profile/credential-manager.js](js/tutor-profile/credential-manager.js)

**New Function:**
- `handleCredentialTypeChange(selectElement)` (lines 856-879)
  - Shows years field when "experience" type is selected
  - Hides years field for other types (academic, achievement)
  - Sets/removes required attribute dynamically
  - Clears value when hiding field

**Updated Functions:**
- `closeUploadDocumentModal()` - Resets years field when closing modal (lines 505-514)
- `editDocument()` - Populates years field when editing experience credentials (lines 651, 677-679)
- Exposed `handleCredentialTypeChange` to window object for HTML onclick handlers (line 1056)

### 3. Backend Changes

#### Pydantic Models
**File:** [astegni-backend/credentials_endpoints.py](astegni-backend/credentials_endpoints.py)

**Updated `TutorDocumentResponse` model** (lines 57-76):
- Added `years: Optional[int] = None` field

#### API Endpoints

**POST `/api/tutor/documents/upload`** (lines 218-230):
- Added `years: Optional[int] = Form(None)` parameter
- Updated INSERT query to include years column (lines 300-311)
- Added years to RETURNING clause and response

**GET `/api/tutor/documents`** (lines 349-421):
- Added `years` to SELECT queries (lines 371-389)
- Added years to response mapping (line 404)

**GET `/api/tutor/documents/{document_id}`** (lines 424-450):
- Uses updated `get_document_by_id()` helper that includes years

**PUT `/api/tutor/documents/{document_id}`** (lines 453-603):
- Added `years: Optional[int] = Form(None)` parameter
- Added years to update fields logic (lines 524-526)
- Updated RETURNING clause and response to include years

#### Helper Functions

**`get_document_by_id()`** (lines 172-213):
- Added `years` to SELECT query
- Added years to return dictionary

## How It Works

1. **User selects credential type:**
   - When "Experience/Work History" is selected → Years field appears (required)
   - When "Academic Certificate" or "Achievement" is selected → Years field is hidden

2. **Upload flow:**
   - User fills in years field (only for experience type)
   - Frontend sends years value in FormData
   - Backend stores it in credentials.years column

3. **Edit flow:**
   - When editing an experience credential, years field is shown and populated
   - When editing other types, years field remains hidden

4. **Data retrieval:**
   - Years value is returned for all credentials
   - Only experience credentials will have a non-null years value

## Testing

### Manual Testing Steps

1. **Start servers:**
   ```bash
   # Backend
   cd astegni-backend
   python app.py

   # Frontend
   python dev-server.py
   ```

2. **Test upload:**
   - Navigate to tutor profile → Credentials panel
   - Click "Upload Credential"
   - Select "Experience/Work History" → Years field should appear
   - Fill in years (e.g., 5)
   - Complete upload
   - Verify years is saved

3. **Test type switching:**
   - In upload modal, switch between types
   - Verify years field shows only for "experience" type
   - Verify field is required when shown

4. **Test edit:**
   - Edit an experience credential
   - Verify years field is shown and populated
   - Edit a non-experience credential
   - Verify years field is hidden

### Database Verification

Run test script:
```bash
cd astegni-backend
python test_years_column.py
```

Expected output:
```
[OK] Years column exists in credentials table
  Column Name: years
  Data Type: integer
  Nullable: YES
```

## Files Modified

### Created
1. `astegni-backend/migrate_add_years_to_credentials.py` - Migration script
2. `astegni-backend/test_years_column.py` - Test verification script

### Modified
1. `modals/common-modals/upload-document-modal.html` - Added years input field
2. `js/tutor-profile/credential-manager.js` - Added show/hide logic
3. `astegni-backend/credentials_endpoints.py` - Updated all CRUD operations

## Database Schema Change

**Table:** `credentials` (astegni_user_db)

**New Column:**
```sql
years INTEGER NULL
COMMENT 'Number of years of experience (only applicable when credential_type is experience)'
```

## API Changes

All credential endpoints now include `years` field in request/response:
- POST `/api/tutor/documents/upload` - Accepts years in FormData
- GET `/api/tutor/documents` - Returns years in response
- GET `/api/tutor/documents/{id}` - Returns years in response
- PUT `/api/tutor/documents/{id}` - Accepts years for updates

## Notes

- Years field is optional (nullable) in the database
- Frontend enforces it as required only when credential type is "experience"
- Field accepts values from 0 to 50
- When credential type changes from experience to another type, the years value is cleared
- Existing credentials in the database will have `NULL` for the years field

## Production Deployment

1. **Run migration:**
   ```bash
   ssh root@128.140.122.215
   cd /var/www/astegni/astegni-backend

   # Backup database first
   pg_dump astegni_user_db > /var/backups/user_db_$(date +%Y%m%d_%H%M%S).sql

   # Run migration
   source venv/bin/activate
   python migrate_add_years_to_credentials.py
   ```

2. **Deploy code:**
   ```bash
   # Commit and push (triggers auto-deployment)
   git add .
   git commit -m "Add years field to credentials for experience type"
   git push origin main
   ```

3. **Verify:**
   ```bash
   # Check backend restart
   systemctl status astegni-backend

   # Test API
   curl https://api.astegni.com/health
   ```

## Version
- Implemented: 2026-01-22
- Version: 2.1.0
