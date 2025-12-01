# Documents Panel - Quick Start Guide

## 🚀 Quick Test (5 Minutes)

### 1. Start Backend
```bash
cd astegni-backend
python app.py
```

### 2. Open Student Profile
```
http://localhost:8080/profile-pages/student-profile.html
```

### 3. Navigate to Documents
1. Log in as student
2. Click **"📄 Documents"** in sidebar
3. You should see:
   - ⏳ Loading spinner (briefly)
   - 📊 Stats cards with counts
   - 📋 Document grid (or empty state)

## 🎯 What's New

### ✅ Fixed Issues
- ❌ **Before:** Used `user_id` from users table
- ✅ **Now:** Uses `student_id` from student_profiles table

- ❌ **Before:** Saved to `documents/resources/`
- ✅ **Now:** Saves to `files/user_{student_id}/`

- ❌ **Before:** No loading states
- ✅ **Now:** Loading spinners + error messages + retry buttons

- ❌ **Before:** Panel didn't reload on switch
- ✅ **Now:** Auto-reloads documents when panel opens

### 🔄 Complete Flow
```
Click "Documents" → Loading Spinner → Documents Loaded → Stats Updated
```

## 📝 Upload Test

1. Click **"Upload Document"** button
2. Fill form:
   - **Type:** Achievement
   - **Title:** "Test Certificate"
   - **Description:** "Testing upload"
   - **Issued By:** "Test Org"
   - **Date:** Today's date
   - **File:** Upload any PDF/image
3. Click **"Upload Document"**
4. Should see:
   - ⏳ "Uploading..." (button disabled)
   - ✅ Success alert
   - 📄 Document appears in grid immediately
   - 📊 Stats count increases

## 🗑️ Delete Test

1. Click **trash icon** on any document
2. Confirm deletion
3. Should see:
   - ❌ Document disappears
   - ✅ Success alert
   - 📊 Stats count decreases

## 🏗️ File Storage

Your uploads are saved to:
```
Backblaze B2: files/user_{student_profile_id}/{filename}_{timestamp}.ext

Example:
files/user_28/certificate_20240115_143022.pdf
```

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/student/documents` | GET | Get all documents (or filter by type) |
| `/api/student/documents/stats` | GET | Get document counts |
| `/api/student/documents/upload` | POST | Upload new document |
| `/api/student/documents/{id}` | DELETE | Delete document |

## 🎨 UI States

### Loading State
```
┌─────────────────────────┐
│   🔄 (spinning)         │
│   Loading documents...  │
└─────────────────────────┘
```

### Error State
```
┌─────────────────────────────────┐
│   ⚠️                            │
│   Error Loading Documents       │
│   Authentication failed         │
│   [🔄 Retry Button]             │
└─────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────┐
│   🏆                            │
│   No achievements yet           │
│   Click "Upload Document"       │
└─────────────────────────────────┘
```

### Success State
```
┌───────────────┐  ┌───────────────┐
│  🏆           │  │  🏆           │
│  Math Medal   │  │  Science Fair │
│  2024-03-15   │  │  2024-04-10   │
│  [View] [🗑️] │  │  [View] [🗑️] │
└───────────────┘  └───────────────┘
```

## 🐛 Troubleshooting

### Documents Not Loading?
1. Check browser console for errors
2. Verify token in localStorage: `localStorage.getItem('token')`
3. Check network tab for API calls
4. Verify backend is running on port 8000

### Upload Failing?
1. Check file size (max 10MB)
2. Check file type (PDF, JPG, PNG, DOC, DOCX allowed)
3. Verify you're logged in as student
4. Check backend logs for errors

### Wrong Folder in Backblaze?
- Should be: `files/user_{student_id}/`
- Not: `documents/resources/user_{user_id}/`
- If wrong, backend needs restart after fix

## 📱 Document Types

| Type | Icon | Grid/List | Example |
|------|------|-----------|---------|
| Achievement | 🏆 | Grid (2 columns) | Awards, medals, honors |
| Academic Certificate | 📜 | Grid (2 columns) | Diplomas, certifications |
| Extracurricular | 🎯 | List (full width) | Sports, clubs, volunteer |

## 🎯 Expected Console Logs

When everything works:
```javascript
[Documents Panel] Initializing...
[Documents] Loading documents for type: achievement
[Documents] Response status: 200
[Documents] Successfully loaded 5 documents
[Documents] Rendering 5 documents for type: achievement
[Documents] Successfully rendered 5 documents
[Documents Panel] Initialized successfully
```

## ✅ Success Checklist

- [ ] Backend running on port 8000
- [ ] Frontend served on port 8080
- [ ] Logged in as student
- [ ] Documents panel opens
- [ ] Loading spinner shows
- [ ] Documents load from database
- [ ] Stats show correct counts
- [ ] Can switch between document types
- [ ] Can upload new documents
- [ ] Files save to `files/user_{student_id}/`
- [ ] Can delete documents
- [ ] Stats update after upload/delete
- [ ] Error messages show on failures
- [ ] Retry button works

## 📚 Full Documentation

See `DOCUMENTS-PANEL-COMPLETE-UPDATE.md` for:
- Complete implementation details
- All code changes with line numbers
- Flow diagrams
- Error handling scenarios
- Future enhancements

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-01-15
**Version:** 2.0 (Complete Refactor)
