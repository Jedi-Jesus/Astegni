# Debug Campaign Creation Modal - Step by Step

## Quick Debug Steps

### 1. **Open Browser Console**
- Press `F12` or `Ctrl+Shift+I`
- Go to "Console" tab
- Keep it open while testing

### 2. **Refresh Page**
- Refresh advertiser profile page
- Look for this log message:
  ```
  [BrandsManager] Campaign creation confirmation modal loaded successfully
  ```
- If you don't see it, there's a loading problem

### 3. **Verify Modal Object Exists**
Type this in console:
```javascript
typeof CampaignCreationConfirmation
```
- Should return: `"object"`
- If returns: `"undefined"` → Modal script didn't execute

### 4. **Check Modal HTML Loaded**
Type this in console:
```javascript
document.getElementById('campaign-creation-confirmation-overlay')
```
- Should return: `<div>` element
- If returns: `null` → Modal HTML didn't load

### 5. **Try Creating Campaign**
- Fill out campaign form
- Click "Review & Create"
- Watch console for these logs:
  ```
  [BrandsManager] submitCreateCampaign called
  [BrandsManager] Current brand: {id: 1, name: "..."}
  [BrandsManager] Form data gathered: {...}
  [BrandsManager] CPI breakdown: {...}
  [BrandsManager] Confirmation data prepared: {...}
  [BrandsManager] Opening confirmation modal...
  ```

### 6. **Common Issues**

#### **Issue 1: No logs appear**
**Symptom**: Click "Review & Create", nothing happens
**Cause**: Form submission not triggering
**Fix**: Check if form has `onsubmit="BrandsManager.submitCreateCampaign(event)"`

#### **Issue 2: "Modal not loaded" alert**
**Symptom**: Alert shows "Confirmation modal not loaded"
**Cause**: `CampaignCreationConfirmation` object doesn't exist
**Check**:
```javascript
// In console
typeof CampaignCreationConfirmation
// If "undefined", scripts didn't execute
```

#### **Issue 3: Modal HTML missing**
**Symptom**: Console shows "Modal overlay element exists: false"
**Cause**: Fetch failed or HTML not appended
**Check**:
```javascript
// In console
document.getElementById('campaign-creation-confirmation-overlay')
// If null, HTML didn't load
```

#### **Issue 4: Error in CPI calculation**
**Symptom**: Logs show up to "Form data gathered" then stop
**Cause**: Error in `calculateCpiBreakdown()`
**Check**: Look for red error messages in console

---

## Expected Console Output (Success)

When everything works, you should see:

```
1. [BrandsManager] Campaign creation confirmation modal loaded successfully
   (when page loads)

2. [BrandsManager] submitCreateCampaign called
   (when you click "Review & Create")

3. [BrandsManager] Current brand: {id: 1, name: "Brand Name", ...}

4. [BrandsManager] Form data gathered: {
     selectedObjectives: ["awareness"],
     selectedAudiences: ["student", "parent"],
     location: "regional",
     budget: 10000
   }

5. [BrandsManager] CPI breakdown: {
     baseRate: 0.05,
     audiencePremium: 0.067,
     locationPremium: 0.02,
     regionExclusionPremium: 0.015,
     placementPremium: 0.03,
     totalCpi: 0.182
   }

6. [BrandsManager] Confirmation data prepared: {
     campaign_name: "Summer Sale",
     audiences: ["Students", "Parents"],
     location: {type: "Regional", regions: ["Addis Ababa"]},
     ...
   }

7. [BrandsManager] Opening confirmation modal...
   (modal should appear on screen)
```

---

## Manual Tests

### Test 1: Verify Modal Loads
```javascript
// After page load, in console:
CampaignCreationConfirmation
// Should show object with methods
```

### Test 2: Manually Open Modal
```javascript
// In console:
CampaignCreationConfirmation.open({
    campaign_name: "Test Campaign",
    audiences: ["Students"],
    location: {type: "Global", regions: []},
    placements: ["Widget"],
    base_cpi: 0.05,
    audience_premium: 0.02,
    location_premium: 0.01,
    placement_premium: 0.02,
    total_cpi: 0.10,
    deposit_amount: 1000,
    estimated_impressions: 10000,
    cancellation_fee_percent: 5,
    min_threshold: 100,
    currency: 'ETB'
});
```
Modal should appear with test data.

### Test 3: Check Form Handler
```javascript
// In console:
BrandsManager.submitCreateCampaign
// Should show: function submitCreateCampaign(event) {...}

// If shows "undefined":
typeof BrandsManager
// Check if BrandsManager exists
```

---

## Files to Check

### 1. **Modal HTML** (`modals/advertiser-profile/campaign-creation-confirmation-modal.html`)
- Contains: `<div id="campaign-creation-confirmation-overlay">`
- Contains: `<script>` tag with `const CampaignCreationConfirmation = {...}`

### 2. **Modal Loader** (`js/advertiser-profile/brands-manager.js` - Line ~48)
```javascript
// Load campaign creation confirmation modal
const confirmationResponse = await fetch('../modals/advertiser-profile/campaign-creation-confirmation-modal.html');
if (!confirmationResponse.ok) {
    throw new Error(`Failed to load confirmation modal: ${confirmationResponse.status}`);
}
const confirmationHtml = await confirmationResponse.text();

if (!document.getElementById('campaign-creation-confirmation-overlay')) {
    const container = document.createElement('div');
    container.innerHTML = confirmationHtml;

    // Extract and execute script tags
    const scripts = container.querySelectorAll('script');
    const scriptContent = Array.from(scripts).map(script => script.textContent).join('\n');

    // Append HTML (without scripts)
    document.body.appendChild(container.firstElementChild);

    // Execute scripts
    if (scriptContent) {
        const scriptEl = document.createElement('script');
        scriptEl.textContent = scriptContent;
        document.body.appendChild(scriptEl);
    }

    console.log('[BrandsManager] Campaign creation confirmation modal loaded successfully');
}
```

### 3. **Form Submit** (`modals/advertiser-profile/campaign-modal.html` - Line ~133)
```html
<form id="create-campaign-form" onsubmit="BrandsManager.submitCreateCampaign(event)">
```

### 4. **Submit Handler** (`js/advertiser-profile/brands-manager.js` - Line ~1961)
```javascript
async submitCreateCampaign(event) {
    console.log('[BrandsManager] submitCreateCampaign called');
    event.preventDefault();
    // ... rest of function
}
```

---

## Network Tab Check

1. Open DevTools → **Network** tab
2. Refresh page
3. Filter by "campaign-creation"
4. Should see: `campaign-creation-confirmation-modal.html` with status **200 OK**
5. Click on it → **Preview** tab → Should show HTML content
6. If status **404**: File not found (check file path/name)
7. If status **500**: Server error

---

## Quick Fix Checklist

- [ ] Page refreshed after code changes?
- [ ] Browser cache cleared? (Ctrl+Shift+Delete)
- [ ] Console shows modal loaded successfully?
- [ ] `typeof CampaignCreationConfirmation` returns "object"?
- [ ] Modal overlay element exists in DOM?
- [ ] Form has correct `onsubmit` attribute?
- [ ] Button text shows "Review & Create"?
- [ ] No red errors in console?

---

## If Still Not Working

### **Last Resort: Check if BrandsManager.init() was called**

```javascript
// In console:
BrandsManager
// Should show object with all methods

BrandsManager.currentBrand
// Should show selected brand or null
```

If `BrandsManager` is `undefined`, the script file didn't load or init wasn't called.

### **Hard Refresh**
- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### **Clear Cache Completely**
1. DevTools open (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"

---

## Success Indicators

When working correctly:

1. ✅ Console log: "Campaign creation confirmation modal loaded successfully"
2. ✅ `typeof CampaignCreationConfirmation` returns "object"
3. ✅ Click "Review & Create" → Logs appear in console
4. ✅ Modal appears on screen with correct data
5. ✅ Modal title shows "Create Campaign"
6. ✅ Button shows "Create Campaign" (not "Launch")

---

## Report Back

Please share:
1. **Console output** (copy all logs)
2. **Any red errors**
3. **What step failed** (modal load, form submit, modal open, etc.)
4. **Screenshot** if possible

This will help diagnose the exact issue!
