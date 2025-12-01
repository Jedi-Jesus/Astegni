# System Settings Testing Guide

## Pre-Test Setup
1. Ensure backend is running: `cd astegni-backend && python app.py`
2. Ensure frontend is running: `python -m http.server 8080`
3. Open browser: `http://localhost:8080/admin-pages/manage-system-settings.html`
4. Open DevTools Console (F12)

## Expected Console Output (No Errors)
```
✅ Should see green success messages:
   🚀 System Settings page loaded - Initializing...
   📡 Starting to load admin profile from database...
   ✅ Panel Manager initialized
   ✅ All window functions exposed successfully
   🇪🇹 Initializing Ethiopian SMS Providers...
   ✅ Ethiopian SMS Providers Extension loaded successfully

❌ Should NOT see any red errors
```

## Quick Verification Commands
Open browser console and type:

```javascript
// All should return "function"
typeof window.switchPanel
typeof window.selectSMSProvider
typeof window.closeSMSConfigModal
typeof window.openImageUploadModal
typeof window.openVideoUploadModal
typeof window.showAddSMSProviderModal
```

## Test Checklist

### ✅ Panel Switching (30 seconds)
- [ ] Click "Dashboard" → Panel switches, shows stats
- [ ] Click "General Settings" → Shows platform info
- [ ] Click "Media Management" → Shows storage tiers
- [ ] Click "Email" → Shows email accounts
- [ ] Click "SMS" → Shows SMS providers
- [ ] Click "Pricing" → Shows pricing tiers
- [ ] URL updates with ?panel=xxx

### ✅ Modals Opening (1 minute)
- [ ] Media Panel → Click "Upload Image" → Modal opens
- [ ] Click X or outside → Modal closes
- [ ] Click "Upload Video" → Modal opens
- [ ] Click X or outside → Modal closes
- [ ] SMS Panel → Click "Add SMS Provider" → Modal opens
- [ ] Click X or outside → Modal closes

### ✅ Ethiopian Gateway (2 minutes)
- [ ] SMS Panel → "Add SMS Provider" → Modal opens
- [ ] Select "Ethiopian SMS Gateway" → Config modal opens
- [ ] See fields: Provider Name, API URL, API Key, Username, Sender ID, HTTP Method
- [ ] Close modal
- [ ] "Add SMS Provider" again
- [ ] Select "Ethio Telecom" → Config modal opens
- [ ] See fields: Account ID, API Key, API Secret, Short Code, API Endpoint
- [ ] Close modal

### ✅ Database Data Loading (1 minute)
- [ ] Dashboard shows real stats (not all zeros)
- [ ] General Settings shows platform name
- [ ] SMS Panel loads providers list (or "No providers" if empty)
- [ ] Media Panel shows storage tiers with values

### ✅ Full SMS Provider CRUD (3 minutes)
- [ ] Create: Add Ethiopian Gateway provider with test data → Saves successfully
- [ ] Read: Provider appears in list with Ethiopian flag icon
- [ ] Update: Click "Edit" → Modal opens with data → Change field → Save → Updates
- [ ] Delete: Click "Delete" → Confirm → Provider removed
- [ ] Repeat for Ethio Telecom

## If Something Fails

### Modals Don't Open
1. Check console for errors
2. Verify `typeof window.selectSMSProvider` returns "function"
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard reload (Ctrl+Shift+R)

### Panels Don't Switch
1. Check console for errors
2. Verify `typeof window.switchPanel` returns "function"
3. Verify panel-manager.js loaded (check Network tab)
4. Check URL updates when clicking sidebar links

### Data Not Loading
1. Verify backend is running: `http://localhost:8000/docs`
2. Check Network tab for API calls
3. Verify token in localStorage: `localStorage.getItem('token')`
4. Check backend console for errors

### Ethiopian Modals Not Found
1. Search HTML for: `id="configure-ethiopian-gateway-modal"`
2. Should exist around line 3710
3. Search for: `id="configure-ethio-telecom-modal"`
4. Should exist around line 3809

## Success Criteria
✅ All 5 test sections pass without errors
✅ No red console errors
✅ All functions return "function" type
✅ Database data displays correctly
✅ Ethiopian gateways fully functional

## Report Issues
If tests fail, report:
1. Which test section failed
2. Exact console error message
3. Browser used (Chrome/Firefox/Edge)
4. Screenshot of error if possible

---

**Expected Result: ALL TESTS PASS ✅**
