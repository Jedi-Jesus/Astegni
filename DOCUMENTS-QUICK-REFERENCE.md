# Tutor Documents - Quick Reference Card

## 🚀 Quick Start (3 Commands)

```bash
# 1. Run migration (one-time)
cd astegni-backend
python migrate_tutor_documents.py

# 2. Backend already running ✅
# (You have it running - no action needed)

# 3. Test the feature
# Navigate to: http://localhost:8080/profile-pages/tutor-profile.html
# Click "Documents" in sidebar
```

## 📍 Where to Find Things

### In Sidebar
Look for: **📄 Documents** (replaced Achievements, Certifications, Experience)

### In Panel
You'll see 3 clickable cards:
- 🏆 **Achievements** (yellow) - Awards, honors, milestones
- 🎓 **Academic** (blue) - Degrees, certifications
- 💼 **Experience** (green) - Work history, credentials

### Upload Button
Top right: **📤 Upload Document**

## 🎯 How to Use

### Upload a Document
1. Click **Documents** in sidebar
2. Click **Upload Document** button
3. Fill form:
   - Select document type (achievement/academic/experience)
   - Enter title, issued by, description
   - Select issue date (expiry optional)
   - Upload file (PDF, JPG, PNG, DOC)
4. Click **Upload Document**
5. ✅ Document appears with "⏳ Pending" badge

### Switch Between Types
- Click any of the 3 cards (Achievement, Academic, Experience)
- Active card shows yellow/blue/green ring
- Grid updates to show documents of that type

### View Document
- Click **👁️ View** button on any document
- Opens file in new browser tab

### Delete Document
- Click **🗑️** button on pending/rejected documents
- Confirm deletion
- Document is removed immediately

⚠️ **Note:** Verified documents CANNOT be deleted (protection)

## 🔄 Verification Workflow

```
Upload → ⏳ Pending
  ↓
Admin Reviews
  ↓
┌─────┴─────┐
↓           ↓
✅ Verified  ❌ Rejected
(Cannot     (Can delete
 delete)     & re-upload)
```

## 🎨 Visual Indicators

### Status Badges
- **⏳ Pending** - Yellow badge (awaiting admin review)
- **✅ Verified** - Green badge (approved by admin)
- **❌ Rejected** - Red badge (see rejection reason below)

### Rejection Reason
Rejected documents show a red box with admin's feedback:
```
⚠️ REJECTION REASON:
Certificate image is not clear. Please upload
a higher quality scan showing all details.
```

### Document Counts
Each type card shows a count badge:
- 🏆 Achievements **[3]**
- 🎓 Academic **[2]**
- 💼 Experience **[1]**

## 🔧 API Endpoints

### For Testing (with curl)

**Get all documents:**
```bash
curl http://localhost:8000/api/tutor/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get by type:**
```bash
curl "http://localhost:8000/api/tutor/documents?document_type=achievement" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Upload document:**
```bash
curl -X POST http://localhost:8000/api/tutor/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document_type=achievement" \
  -F "title=Best Teacher Award" \
  -F "issued_by=Ministry of Education" \
  -F "date_of_issue=2024-01-15" \
  -F "file=@certificate.pdf"
```

## 🐛 Troubleshooting

### Documents not loading?
1. Check browser console (F12) for errors
2. Verify backend is running: http://localhost:8000/docs
3. Check you're logged in as tutor (not student/parent/admin)

### Upload failing?
1. File too large? Max 10MB
2. Wrong file type? Use JPG, PNG, PDF, DOC, DOCX
3. Token expired? Logout and login again

### Can't delete document?
- ✅ Can delete: Pending or Rejected documents
- ❌ Cannot delete: Verified documents (by design)

### Documents panel empty?
1. Click "Upload Document" to add your first document
2. Switch between types using the cards
3. Check if documents exist in other types

## 📂 File Locations

**Backend:**
- `astegni-backend/tutor_documents_endpoints.py` - API logic
- `astegni-backend/migrate_tutor_documents.py` - Database setup

**Frontend:**
- `js/tutor-profile/document-manager.js` - JavaScript logic
- `css/tutor-profile/documents-panel.css` - Styling
- `profile-pages/tutor-profile.html` - UI (lines 1515, 2701, 6809)

## 📊 Database

**Table:** `tutor_documents`
**Key Columns:**
- `document_type` - academic | achievement | experience
- `verification_status` - pending | verified | rejected
- `title`, `issued_by`, `date_of_issue`, `expiry_date`
- `document_url` - File stored in Backblaze B2
- `rejection_reason` - Admin feedback (if rejected)

## 🎓 What Changed?

### Before (Old System)
```
Sidebar:
├─ 🏆 Achievements
├─ 🎓 Certifications
└─ 💼 Experience

Database:
├─ tutor_achievements
├─ tutor_certificates
└─ tutor_experience
```

### After (New System)
```
Sidebar:
└─ 📄 Documents

Database:
└─ tutor_documents
   ├─ type: achievement
   ├─ type: academic
   └─ type: experience
```

## ✨ Key Features

✅ Unified interface (1 panel instead of 3)
✅ Type switching with visual cards
✅ Document verification workflow
✅ Rejection reason display
✅ Protected verified documents
✅ Document counts per type
✅ Responsive design (mobile/tablet/desktop)
✅ Dark mode support
✅ Real-time UI updates

## 📚 Documentation

**Quick Start:** `QUICK-START-TUTOR-DOCUMENTS.md`
**Complete Guide:** `TUTOR-DOCUMENTS-SYSTEM-COMPLETE.md`
**Visual Guide:** `TUTOR-DOCUMENTS-VISUAL-GUIDE.md`
**This File:** `DOCUMENTS-QUICK-REFERENCE.md`

## 🎉 Status

**Implementation:** ✅ COMPLETE
**Testing:** ✅ READY
**Production:** ✅ READY

---

**Need Help?**
1. Check browser console for errors
2. Review backend logs
3. See full documentation in `TUTOR-DOCUMENTS-SYSTEM-COMPLETE.md`
