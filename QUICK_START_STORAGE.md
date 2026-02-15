# Storage Limits - Quick Start Guide

## ⚡ Quick Setup (5 minutes)

### 1. Run Migration
```bash
cd astegni-backend
python migrate_create_user_storage_usage.py
```

### 2. Restart Backend
```bash
python app.py
```

### 3. Test It Works
```bash
# Check if endpoints are available
curl http://localhost:8000/api/storage/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

That's it! The system is now active.

---

## 📊 Subscription Tiers

| Tier | Max Image | Max Video | Total Storage |
|------|-----------|-----------|---------------|
| Free | 5 MB | 50 MB | 1 GB |
| Basic | 10 MB | 200 MB | 64 GB |
| Basic+ | 15 MB | 500 MB | 100 GB |
| Standard | 25 MB | 1 GB | 250 GB |
| Standard+ | 50 MB | 2 GB | 500 GB |
| Premium | 100 MB | 5 GB | 1 TB |

---

## 🔧 How It Works

### When User Uploads:

1. **Frontend checks** (before upload)
   - StorageManager validates file size
   - Shows error if quota exceeded
   - Prevents unnecessary uploads

2. **Backend validates** (during upload)
   - Checks individual file size limit
   - Checks total storage quota
   - Returns 400 error if limits exceeded

3. **Backend tracks** (after upload)
   - Updates user_storage_usage table
   - Increments file count
   - Updates total_size

---

## 📝 API Endpoints

### Get Storage Usage
```bash
GET /api/storage/usage

Response:
{
  "usage": {
    "total_size": 157286400,
    "images_count": 25,
    "videos_count": 3
  },
  "summary": {
    "total_used_gb": 0.15,
    "storage_limit_gb": 5,
    "usage_percentage": 2.93,
    "remaining_gb": 4.85
  }
}
```

### Validate Before Upload
```bash
POST /api/storage/validate?file_size_mb=10&file_type=image

Response:
{
  "is_allowed": true,
  "remaining_storage_mb": 4974.0,
  "usage_percentage": 2.93
}
```

---

## 🚨 Common Issues

### Issue: "Storage limit exceeded" but user hasn't uploaded much
**Solution:** Check if they have a subscription plan assigned
```sql
SELECT id, email, subscription_plan_id FROM users WHERE id = 1;
```

### Issue: Frontend validation not working
**Solution:** Make sure storage-manager.js is loaded
```html
<script src="js/root/storage-manager.js"></script>
```

### Issue: Upload succeeds but storage not tracked
**Solution:** Check if StorageService.update_storage_usage() is called after upload

---

## 📁 Key Files

### Backend
- `storage_service.py` - Validation logic
- `storage_endpoints.py` - API endpoints
- `app.py modules/routes.py` - Upload endpoints (lines 2888-3133)

### Frontend
- `js/root/storage-manager.js` - Client validation
- `js/tutor-profile/global-functions.js` - Upload modal integration

### Database
- `user_storage_usage` - Tracks usage per user
- `system_media_settings` - Subscription tier limits (admin DB)

---

## 🧪 Testing

### Quick Test
```bash
cd astegni-backend
python test_storage_simple.py
```

Expected output:
```
[PASS] user_storage_usage table                 PASSED
[PASS] system_media_settings table              PASSED
[PASS] storage validation logic                 PASSED
[PASS] API endpoints availability               PASSED

Total: 4/4 tests passed
```

---

## 📚 Full Documentation

- Implementation Guide: [STORAGE_LIMITS_IMPLEMENTATION.md](STORAGE_LIMITS_IMPLEMENTATION.md)
- Test Results: [TESTING_RESULTS.md](TESTING_RESULTS.md)

---

## ✅ Deployment Checklist

- [ ] Run migration: `python migrate_create_user_storage_usage.py`
- [ ] Restart backend server
- [ ] Test upload through browser
- [ ] Verify error messages appear
- [ ] Check storage tracking updates

---

## 🎯 What Users See

**When approaching limit:**
- Upload works normally
- Can check usage at /api/storage/usage

**When limit exceeded:**
- Clear error message: "Storage limit exceeded. You've used X GB of Y GB"
- Upload is blocked
- Prompted to upgrade subscription

**After upload:**
- Storage automatically tracked
- No manual intervention needed
- Next upload checks against updated usage

---

That's it! The system is production-ready and working. 🚀
