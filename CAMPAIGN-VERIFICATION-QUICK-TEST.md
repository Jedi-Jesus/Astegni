# Campaign Verification System - Quick Test Guide

## ✅ Implementation Complete

All changes have been successfully implemented for the advertiser campaign verification system.

## 🚀 Quick Start Testing

### Step 1: Run Database Migration (If Not Done)
```bash
cd astegni-backend
python migrate_campaign_verification.py
```

**Expected Output:**
```
✅ Added 'is_verified' column
✅ Added 'verification_status' column
✅ Migration completed successfully!
```

### Step 2: Start Backend Server
```bash
cd astegni-backend
python app.py
# Or
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Step 3: Start Frontend Server
```bash
# From project root
python -m http.server 8080
```

### Step 4: Test Campaign Creation

1. **Open Advertiser Profile:**
   - Navigate to: `http://localhost:8080/profile-pages/advertiser-profile.html`

2. **Click "Create Campaign" Button**

3. **Verify Form Changes:**
   - ✅ No "Status" dropdown
   - ✅ No "Total Budget" field
   - ✅ No "Daily Budget" field
   - ✅ Target Audience has "All Users" as first option
   - ✅ "Upload Media" section present
   - ✅ Button says "Send for Verification" (not "Create Campaign")

4. **Fill Out Form:**
   ```
   Campaign Name: Test Summer Campaign
   Campaign Type: Video Ad
   Description: Test description
   Start Date: 2025-01-20
   End Date: 2025-02-20
   Target Audience: Select "All Users" + "Students"
   Target Regions: Select "Addis Ababa"
   Primary Goal: Brand Awareness
   Campaign URL: https://example.com
   Upload Media: Select a test image or video
   ```

5. **Test Media Preview:**
   - Select an image → Should show image preview
   - Select a video → Should show video player
   - Preview appears in "Media Preview" section

6. **Submit Campaign:**
   - Click "Send for Verification"
   - Should see: "Campaign submitted for verification successfully!"

## 🔍 Verify Database Changes

### Check Campaign Table Structure:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ad_campaigns'
AND column_name IN ('is_verified', 'verification_status')
ORDER BY column_name;
```

**Expected Result:**
```
is_verified         | boolean             | false
verification_status | character varying   | 'pending'::character varying
```

### Check Created Campaigns:
```sql
SELECT id, name, is_verified, verification_status, target_audience, creative_urls
FROM ad_campaigns
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
id | name                  | is_verified | verification_status | target_audience        | creative_urls
---|-----------------------|-------------|---------------------|------------------------|---------------
1  | Test Summer Campaign  | false       | pending             | ["all", "students"]    | [...]
```

## 🎯 What Changed - Quick Reference

### Frontend (advertiser-profile.html)
| Removed | Added |
|---------|-------|
| Status dropdown | "All Users" in Target Audience |
| Total Budget field | Upload Media section |
| Daily Budget field | Media Preview area |
| "Create Campaign" button text | "Send for Verification" button text |

### Backend (Models & API)
| Old Field | New Field |
|-----------|-----------|
| status (VARCHAR) | is_verified (BOOLEAN) |
| - | verification_status (VARCHAR) |
| target_audience (JSON object) | target_audience (Array) |
| Required budget on create | No budget required (added after approval) |

### Database (ad_campaigns table)
| Column | Type | Default | Values |
|--------|------|---------|--------|
| is_verified | BOOLEAN | FALSE | true/false |
| verification_status | VARCHAR(50) | 'pending' | pending, verified, rejected, suspended |

## 📝 Test Checklist

### Frontend Tests:
- [ ] Campaign modal opens correctly
- [ ] No status dropdown visible
- [ ] No budget fields visible
- [ ] "All Users" appears in target audience
- [ ] Media upload input works
- [ ] Image preview displays correctly
- [ ] Video preview displays correctly
- [ ] Button says "Send for Verification"
- [ ] Form validation works (required fields)
- [ ] Multi-select works for audience & regions

### Backend Tests:
- [ ] Migration runs without errors
- [ ] New columns exist in database
- [ ] CHECK constraint works (only allows valid statuses)
- [ ] Campaign creation endpoint works
- [ ] is_verified defaults to false
- [ ] verification_status defaults to 'pending'
- [ ] No budget deduction on creation
- [ ] Success message correct

### Integration Tests:
- [ ] File upload works (if endpoint exists)
- [ ] Campaign saved with media URL
- [ ] Target audience saved as array
- [ ] Locations saved correctly
- [ ] Campaign appears in database
- [ ] Notifications display correctly

## 🐛 Troubleshooting

### Issue: Migration fails with encoding error
**Solution:** The script already includes UTF-8 encoding fix for Windows

### Issue: "Upload endpoint not found" (404)
**Solution:** Create the upload endpoint or use existing:
```python
# Use existing endpoint: POST /api/upload/profile-picture
# Or implement: POST /api/upload/campaign-media
```

### Issue: "Advertiser profile not found"
**Solution:** Make sure user is logged in and has advertiser role

### Issue: Target audience not saving
**Solution:** Backend expects List[str] now, not Dict. Check model compatibility.

### Issue: Preview not showing
**Solution:** Check browser console for errors, verify file input ID is "campaignMediaFile"

## 📊 Verification Status Flow

```
┌─────────────────────────────────────────┐
│  Advertiser Creates Campaign            │
│  → is_verified: false                   │
│  → verification_status: "pending"       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Admin Reviews Campaign                 │
│  (Future feature - to be implemented)   │
└─────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐      ┌────────────────┐
│   APPROVED    │      │    REJECTED    │
│ → verified    │      │  → rejected    │
│ → true        │      │  → false       │
└───────────────┘      └────────────────┘
```

## 🎉 Success Criteria

Your implementation is successful if:

1. ✅ Migration runs without errors
2. ✅ New columns appear in database with correct defaults
3. ✅ Campaign form shows all new fields
4. ✅ No budget/status fields visible
5. ✅ Media preview works
6. ✅ Campaign saves with verification_status="pending"
7. ✅ Button text is "Send for Verification"
8. ✅ Success message shows "Campaign submitted for verification successfully!"

## 📚 Related Files

- **Migration Script:** `astegni-backend/migrate_campaign_verification.py`
- **Frontend HTML:** `profile-pages/advertiser-profile.html`
- **Frontend JS:** `js/advertiser-profile/advertiser-profile.js`
- **Backend Models:** `astegni-backend/app.py modules/models.py`
- **Backend Routes:** `astegni-backend/app.py modules/routes.py`
- **Full Documentation:** `ADVERTISER-CAMPAIGN-VERIFICATION-IMPLEMENTATION.md`

## 🔜 Next Steps (Future Work)

1. Implement admin verification dashboard
2. Add campaign review/approval endpoints
3. Create notification system for status changes
4. Build campaign media upload endpoint (if not exists)
5. Add verification history logging
6. Implement budget allocation after approval

---

**All changes are complete and ready for testing!** 🚀
