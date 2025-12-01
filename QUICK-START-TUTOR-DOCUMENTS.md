# Quick Start: Tutor Documents System

## 5-Minute Setup Guide

### Step 1: Run Database Migration
```bash
cd astegni-backend
python migrate_tutor_documents.py
```

**Expected Output:**
```
Starting migration: tutor_documents table creation...
Dropping old tables (tutor_achievements, tutor_certificates, tutor_experience)...
[OK] Old tables dropped
Creating tutor_documents table...
[OK] tutor_documents table created
Creating indexes...
[OK] Indexes created
Creating trigger for updated_at...
[OK] Trigger created

[SUCCESS] Migration completed successfully!

New table structure:
  - tutor_documents (unified table for all document types)
  - Document types: 'academic', 'achievement', 'experience'
  - Verification workflow: pending -> verified/rejected
  - Admin verification tracking
  - Featured document support
```

### Step 2: Restart Backend Server
```bash
# Stop current server (Ctrl+C)
python app.py
```

### Step 3: Start Frontend Server (if not running)
```bash
# From project root (new terminal)
cd ..
python -m http.server 8080
```

### Step 4: Test the System
1. Open browser: `http://localhost:8080/profile-pages/tutor-profile.html`
2. Login as tutor
3. Click **Documents** in sidebar (📄 icon)
4. You should see:
   - Three type selector cards (Achievements, Academic, Experience)
   - Achievement card active by default (yellow with ring)
   - "Upload Document" button in top right
   - Empty state message: "No documents yet"

### Step 5: Upload Your First Document
1. Click **Upload Document** button
2. Fill the form:
   - **Document Type:** 🏆 Achievement
   - **Document Title:** "Best Teacher Award 2024"
   - **Issued By:** "Ethiopian Ministry of Education"
   - **Description:** "Awarded for excellence in teaching"
   - **Date of Issue:** Select any date
   - **Upload File:** Choose any image or PDF
3. Click **Upload Document** button
4. Wait for success message
5. Document should appear in grid with "⏳ Pending" badge

### Step 6: Test Type Switching
1. Click **Academic** card (blue) - Grid should show academic documents (empty if none)
2. Click **Experience** card (green) - Grid should show experience documents
3. Click **Achievement** card (yellow) - Grid should show your uploaded achievement

✅ **Success!** You now have a fully functional document management system.

---

## Common Issues

### Issue: Migration fails with "relation tutors does not exist"
**Solution:** Table is `tutor_profiles`, not `tutors`. Migration script already fixed.

### Issue: Migration fails with "relation admins does not exist"
**Solution:** Table is `admin_profile`, not `admins`. Migration script already fixed.

### Issue: 401 Unauthorized when uploading
**Solution:**
1. Make sure you're logged in as tutor
2. Check localStorage has valid token: `localStorage.getItem('token')`
3. Token might be expired - logout and login again

### Issue: Upload button doesn't work
**Solution:**
1. Check browser console for errors (F12)
2. Verify JavaScript file is loaded: Check Network tab for `document-manager.js`
3. Verify form ID is `uploadDocumentForm`

### Issue: Documents not loading
**Solution:**
1. Check browser console for API errors
2. Verify backend is running: `http://localhost:8000/docs`
3. Test API directly:
   ```bash
   curl http://localhost:8000/api/tutor/documents \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## File Locations

**Backend:**
- Migration: `astegni-backend/migrate_tutor_documents.py`
- Endpoints: `astegni-backend/tutor_documents_endpoints.py`
- Router registration: `astegni-backend/app.py` (line 95-96)

**Frontend:**
- HTML: `profile-pages/tutor-profile.html`
  - Sidebar link: Line 1515-1518
  - Panel: Line 2701-2770
  - Modal: Line 6809-6906
- JavaScript: `js/tutor-profile/document-manager.js`
- CSS: `css/tutor-profile/documents-panel.css`

---

## Quick Test Commands

### Test API is working
```bash
# Health check
curl http://localhost:8000/docs

# Get documents (requires auth token)
curl http://localhost:8000/api/tutor/documents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check database table exists
```bash
cd astegni-backend
python -c "import psycopg; from dotenv import load_dotenv; import os; load_dotenv(); conn = psycopg.connect(os.getenv('DATABASE_URL')); cursor = conn.cursor(); cursor.execute('SELECT COUNT(*) FROM tutor_documents'); print(f'Documents count: {cursor.fetchone()[0]}')"
```

---

## What's Different?

### Before (3 Separate Systems):
```
Sidebar:
  - 🏆 Achievements
  - 🎓 Certifications
  - 💼 Experience

Tables:
  - tutor_achievements
  - tutor_certificates
  - tutor_experience

Modals:
  - achievementModal
  - certificationModal
  - experienceModal
```

### After (1 Unified System):
```
Sidebar:
  - 📄 Documents

Table:
  - tutor_documents (with document_type field)

Modal:
  - uploadDocumentModal (with type dropdown)

Panel:
  - Switch between types using cards
  - Unified UI with consistent design
```

---

## Verification Workflow

```
Tutor uploads → Status: pending (⏳)
       ↓
Admin reviews
       ↓
   ┌───┴───┐
   ↓       ↓
Approve  Reject
   ↓       ↓
verified rejected
  (✅)    (❌)
```

---

## Next Steps

1. **Test all 3 document types** (achievement, academic, experience)
2. **Test delete functionality** (pending docs only)
3. **Test view functionality** (opens in new tab)
4. **Test dark mode** (toggle theme)
5. **Test mobile responsive** (Chrome DevTools device mode)

Full documentation: See `TUTOR-DOCUMENTS-SYSTEM-COMPLETE.md`
