# ⚡ Quick Start: Fix Google OAuth in Production

## 🎯 The Problem
Google OAuth works on localhost but NOT on astegni.com

## ✅ The Solution (Already Done by Claude)
Backend code updated to auto-detect production vs development

## 🔴 What YOU Need to Do (5 Minutes)

### Step 1: Configure Google Cloud Console
**This is the ONLY step you MUST do manually!**

```
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on: OAuth 2.0 Client ID (342728116165-...)
3. Add to "Authorized JavaScript origins":
   - https://astegni.com
   - https://www.astegni.com

4. Add to "Authorized redirect URIs":
   - https://astegni.com
   - https://www.astegni.com

5. Click SAVE
6. Wait 5 minutes
```

### Step 2: Update Production Server
**SSH to server:**
```bash
ssh root@128.140.122.215
# Password: UVgkFmAsh4N4
```

**Edit .env file:**
```bash
cd /var/www/astegni/astegni-backend
nano .env
```

**Change these 2 lines:**
```env
ENVIRONMENT=production
GOOGLE_REDIRECT_URI=https://astegni.com
```

**Save:** Ctrl+O, Enter, Ctrl+X

**Restart backend:**
```bash
systemctl restart astegni-backend
systemctl status astegni-backend
```

### Step 3: Test It
```bash
# Test OAuth config
curl https://api.astegni.com/api/oauth/google/config

# Should return:
# {"client_id":"...","redirect_uri":"https://astegni.com"}
```

**Then test in browser:**
1. Open https://astegni.com (Incognito mode)
2. Click "Continue with Google"
3. Sign in
4. ✅ Success!

---

## 📋 Verification Checklist

- [ ] Google Cloud Console updated (Step 1)
- [ ] Waited 5 minutes for Google propagation
- [ ] Production .env updated (Step 2)
- [ ] Backend restarted
- [ ] API endpoint returns production URL
- [ ] Tested login on astegni.com
- [ ] Login works successfully

---

## 🆘 If Something Goes Wrong

**Backend won't start:**
```bash
journalctl -u astegni-backend -n 50
```

**OAuth still doesn't work:**
- Wait 10 minutes (Google propagation)
- Clear browser cache
- Try Incognito mode
- Check console: F12 → Console tab

**Rollback:**
```bash
cd /var/www/astegni/astegni-backend
cp .env.backup.* .env
systemctl restart astegni-backend
```

---

## 📚 Full Documentation

- **Complete Guide:** [GOOGLE_OAUTH_PRODUCTION_FIX.md](GOOGLE_OAUTH_PRODUCTION_FIX.md)
- **Step-by-Step:** [PRODUCTION_DEPLOYMENT_STEPS.md](PRODUCTION_DEPLOYMENT_STEPS.md)
- **Summary:** [GOOGLE_OAUTH_FIX_SUMMARY.md](GOOGLE_OAUTH_FIX_SUMMARY.md)

---

## ⏱️ Timeline

- ✅ Code fixed and pushed (automatic deployment)
- ⏳ Step 1: Google Cloud Console (5 min) ← **YOU ARE HERE**
- ⏳ Step 2: Update .env on server (3 min)
- ⏳ Step 3: Test (2 min)
- **Total: 10 minutes**

---

## 💡 What Changed

**Before:**
```python
# Always used localhost
redirect_uri = "http://localhost:8081"
```

**After:**
```python
# Auto-detects environment
redirect_uri = detect_from_request_origin()
# Returns "https://astegni.com" in production
# Returns "http://localhost:8081" in development
```

---

**Status:** ✅ Code deployed, waiting for your Google Cloud Console update

**Next:** Configure Google Cloud Console (5 minutes)
