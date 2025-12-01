# Additional Fixes Complete

## Summary

Fixed 2 additional issues in the system settings:

1. ✅ **Package Features Saving/Loading** - Now correctly saves and loads subscription tier features
2. ✅ **Delete Gateway Button** - Added delete functionality for payment gateways

---

## Fix 1: Package Features Saving/Loading

### Problem
The previous fix was looking in the wrong container:
- Code was searching for `package-includes-container` (campaign packages)
- Should search `basic-tier-features-container` and `premium-tier-features-container` (subscription tiers)

### Solution

**Updated Functions in [system-settings-fixes.js](js/admin-pages/system-settings-fixes.js):**

#### 1. `getPackageFeatures(tier)` - Lines 386-429
Now correctly identifies the right containers:
```javascript
const containerId = tier === 'basic'
    ? 'basic-tier-features-container'
    : 'premium-tier-features-container';
```

**Features:**
- Logs collected features to console for debugging
- Falls back to defaults if no features in UI
- Properly extracts all input values

#### 2. `populatePackageFeatures(tier, features)` - Lines 458-506
Completely new implementation that:
- Clears existing features before loading
- Creates feature inputs dynamically
- Shows/hides empty state correctly
- Adds remove buttons for each feature
- Uses correct border colors (blue for basic, purple for premium)

**HTML Generated:**
```html
<div class="flex gap-2 items-center" id="basic-feature-123456-0">
    <input type="text" value="5 GB Storage"
           class="flex-1 p-2 border border-blue-300 rounded text-sm">
    <button onclick="removeFeature('basic-feature-123456-0')"
            class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
        <i class="fas fa-times"></i>
    </button>
</div>
```

#### 3. `loadSubscriptionFeatures()` - Lines 431-456
Enhanced with:
- Console logging for debugging
- Proper tier name handling (lowercase conversion)
- Calls `populatePackageFeatures()` for each tier

### Testing Package Features

**Test Scenario 1: Adding Features**
```
1. Go to Pricing panel
2. Find "Subscription Price Settings"
3. Click "Add Feature" under Basic Tier
4. Enter: "10 GB Storage"
5. Click "Add Feature" again
6. Enter: "Email Support"
7. Click "Set Price"
8. Check console: Should see "Collected 2 features for basic tier"
9. Refresh page
10. ✅ Both features should appear in the inputs
```

**Test Scenario 2: Editing Features**
```
1. Load page with saved features
2. Modify existing feature text
3. Click "Set Price"
4. Refresh page
5. ✅ Modified feature text persists
```

**Test Scenario 3: Removing Features**
```
1. Click X button on a feature
2. Feature disappears from UI
3. Click "Set Price"
4. Refresh page
5. ✅ Removed feature stays removed
```

**Console Output:**
```javascript
Loading subscription tiers: [
  { tier_name: "Basic", features: ["5 GB Storage", "Email Support"], ... },
  { tier_name: "Premium", features: ["50 GB Storage", ...], ... }
]

Populating 2 features for basic tier
Collected 2 features for basic tier from basic-tier-features-container:
  ["5 GB Storage", "Email Support"]
```

---

## Fix 2: Delete Gateway Button

### Problem
- Payment gateways could be added but never deleted
- No way to remove unwanted gateways from the system

### Solution

**Frontend: Added Delete Button**

Updated `loadPaymentGateways()` in [system-settings-fixes.js:223-281](js/admin-pages/system-settings-fixes.js):

**Changes:**
1. Added `data-gateway-id` attribute to gateway container
2. Added delete button with onclick handler
3. Moved enabled checkbox into flex container with delete button

**New HTML Structure:**
```html
<div class="border rounded-lg p-4" data-gateway-id="5">
    <div class="flex items-center justify-between mb-4">
        <h4 class="font-semibold">Bank of Abyssinia</h4>
        <div class="flex items-center gap-3">
            <!-- Enabled checkbox -->
            <label class="flex items-center gap-2">
                <input type="checkbox" class="gateway-enabled-checkbox"
                       data-gateway="Bank of Abyssinia" checked>
                <span class="text-sm">Enabled</span>
            </label>
            <!-- DELETE BUTTON (NEW) -->
            <button onclick="deletePaymentGateway('Bank of Abyssinia', 5)"
                class="px-3 py-1.5 bg-red-500 text-white text-sm rounded
                       hover:bg-red-600 transition-colors"
                title="Delete Gateway">
                <i class="fas fa-trash mr-1"></i>Delete
            </button>
        </div>
    </div>
    <!-- Merchant ID and API Key fields -->
</div>
```

**New Function: `deletePaymentGateway(gatewayName, gatewayId)`** - Lines 283-312

**Flow:**
1. Shows confirmation dialog
2. Calls DELETE endpoint
3. Removes from UI on success
4. Shows error if failed

**Code:**
```javascript
async function deletePaymentGateway(gatewayName, gatewayId) {
    // Confirmation
    if (!confirm(`Are you sure you want to delete "${gatewayName}"?`)) {
        return;
    }

    // DELETE request
    const response = await fetch(
        `${API_BASE_URL}/api/admin/pricing/payment-gateways/${gatewayId}`,
        {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }
    );

    // Remove from UI
    const element = document.querySelector(`[data-gateway-id="${gatewayId}"]`);
    element.remove();
}
```

**Backend: Added DELETE Endpoint**

New endpoint in [pricing_settings_endpoints.py:210-252](astegni-backend/pricing_settings_endpoints.py):

```python
@router.delete("/payment-gateways/{gateway_id}")
async def delete_payment_gateway(gateway_id: int):
    """Delete a payment gateway by ID"""
    # Check if exists
    cursor.execute("SELECT gateway_name FROM payment_gateways WHERE id = %s",
                   (gateway_id,))

    if not cursor.fetchone():
        raise HTTPException(404, "Payment gateway not found")

    # Delete
    cursor.execute("DELETE FROM payment_gateways WHERE id = %s", (gateway_id,))
    conn.commit()

    return {"success": True, "message": "Gateway deleted"}
```

**Features:**
- Validates gateway exists before deleting
- Returns 404 if not found
- Returns success message with gateway name
- Properly handles database transaction

### Testing Delete Gateway

**Test Scenario 1: Delete Gateway**
```
1. Go to Pricing panel → Payment Gateway section
2. Add a test gateway: "Test Bank"
3. Refresh page to see it loaded
4. Click "Delete" button
5. ✅ Confirmation dialog appears
6. Click OK
7. ✅ Alert: "Payment gateway 'Test Bank' deleted successfully!"
8. ✅ Gateway disappears from UI
9. Refresh page
10. ✅ Gateway doesn't reappear
```

**Test Scenario 2: Cancel Delete**
```
1. Click "Delete" on a gateway
2. Click "Cancel" in confirmation
3. ✅ Gateway remains in UI
4. ✅ No API call made
```

**Test Scenario 3: Delete Non-Existent Gateway**
```
1. Manually call: deletePaymentGateway('Fake', 99999)
2. ✅ Error alert shown
3. ✅ UI remains unchanged
```

**Network Tab:**
```
DELETE /api/admin/pricing/payment-gateways/5
Response: { "success": true, "message": "Payment gateway Bank of Abyssinia deleted" }
```

---

## Files Modified

### 1. [js/admin-pages/system-settings-fixes.js](js/admin-pages/system-settings-fixes.js)

**Lines 386-429:** Updated `getPackageFeatures()` to use correct containers
**Lines 431-456:** Enhanced `loadSubscriptionFeatures()` with logging
**Lines 458-506:** New `populatePackageFeatures()` implementation
**Lines 223-281:** Updated `loadPaymentGateways()` with delete button
**Lines 283-312:** New `deletePaymentGateway()` function
**Lines 631-642:** Exported new functions to window

### 2. [astegni-backend/pricing_settings_endpoints.py](astegni-backend/pricing_settings_endpoints.py)

**Lines 210-252:** New `DELETE /payment-gateways/{gateway_id}` endpoint

---

## API Endpoints

### New Endpoint

**DELETE /api/admin/pricing/payment-gateways/{gateway_id}**

**Request:**
```http
DELETE /api/admin/pricing/payment-gateways/5
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment gateway Bank of Abyssinia deleted"
}
```

**Response (Not Found):**
```json
{
  "detail": "Payment gateway not found"
}
```

### Existing Endpoints (Enhanced)

**GET /api/admin/pricing/subscription-tiers**

Now properly returns features:
```json
{
  "success": true,
  "tiers": [
    {
      "tier_name": "Basic",
      "monthly_price": 99.00,
      "features": [
        "5 GB Storage",
        "Email Support",
        "Basic Analytics"
      ],
      "period_discounts": { "1m": 0, "3m": 5, ... }
    },
    {
      "tier_name": "Premium",
      "monthly_price": 299.00,
      "features": [
        "50 GB Storage",
        "Priority Support",
        ...
      ]
    }
  ]
}
```

**POST /api/admin/pricing/subscription-tiers**

Now correctly saves features from UI:
```json
{
  "tier_name": "Basic",
  "monthly_price": 99.00,
  "features": [
    "5 GB Storage",
    "Email Support"
  ]
}
```

---

## Database Schema

### payment_gateways Table

**Supports DELETE operation:**
```sql
DELETE FROM payment_gateways WHERE id = 5;
-- Returns: DELETE 1 (if successful)
```

### subscription_tiers Table

**Features column properly populated:**
```sql
SELECT tier_name, features FROM subscription_tiers;

-- Returns:
-- Basic    | ["5 GB Storage", "Email Support", "Basic Analytics"]
-- Premium  | ["50 GB Storage", "Priority Support", "Advanced Analytics", ...]
```

---

## Console Debugging

### Package Features

**On Page Load:**
```
Loading subscription tiers: [Array(2)]
Populating 3 features for basic tier
Populating 6 features for premium tier
```

**When Saving:**
```
Collected 3 features for basic tier from basic-tier-features-container:
  ["5 GB Storage", "Email Support", "Basic Analytics"]
Collected 6 features for premium tier from premium-tier-features-container:
  ["50 GB Storage", ...]
Saving subscription pricing...
```

**When Loading Empty:**
```
No features found in UI for basic, using defaults
```

### Delete Gateway

**On Delete:**
```
Deleting payment gateway: Bank of Abyssinia (ID: 5)
Response: {success: true, message: "Payment gateway Bank of Abyssinia deleted"}
```

**On Error:**
```
Error deleting payment gateway: 404 Not Found
```

---

## Summary

| Feature | Status | Details |
|---------|--------|---------|
| Package Features Saving | ✅ Fixed | Uses correct containers, saves to DB |
| Package Features Loading | ✅ Fixed | Populates UI from DB on page load |
| Delete Gateway Button | ✅ Added | Red button with trash icon |
| Delete Gateway API | ✅ Added | Backend DELETE endpoint |
| Delete Gateway UI | ✅ Added | Removes from UI after delete |
| Confirmation Dialog | ✅ Added | Prevents accidental deletion |

---

## Quick Reference

### Add Subscription Feature
```javascript
// Click "Add Feature" button (uses addBasicTierFeature from system-settings-enhancements.js)
// Enter feature text
// Click "Set Price" to save
```

### Load Subscription Features
```javascript
// Automatic on page load
loadSubscriptionFeatures(); // Manual call if needed
```

### Delete Payment Gateway
```javascript
// Click "Delete" button
deletePaymentGateway(gatewayName, gatewayId);
```

### Test All Features
```bash
# 1. Add features to Basic tier
# 2. Click "Set Price"
# 3. Check console for "Collected X features"
# 4. Refresh page
# 5. Features should populate

# 6. Add payment gateway "Test Bank"
# 7. Click "Delete" on Test Bank
# 8. Confirm deletion
# 9. Gateway disappears
# 10. Refresh page - gateway stays deleted
```

---

## Known Limitations

1. **Feature Ordering**: Features are loaded in array order, no drag-and-drop yet
2. **Gateway Dependencies**: No check if gateway is in use before deletion
3. **Undo Delete**: No way to restore deleted gateway (permanent deletion)

---

## Future Enhancements

1. **Soft Delete**: Mark gateways as deleted instead of removing from DB
2. **Feature Icons**: Add icon selection for each feature
3. **Feature Templates**: Pre-defined feature sets for quick setup
4. **Bulk Operations**: Delete multiple gateways at once
5. **Gateway Usage**: Show which subscriptions use which gateway

---

**Status:** ✅ All additional fixes complete
**Date:** 2025-10-17
**Files Changed:** 2 (1 frontend, 1 backend)
**New Functions:** 1 (deletePaymentGateway)
**Updated Functions:** 3 (getPackageFeatures, loadSubscriptionFeatures, populatePackageFeatures)
**New Endpoints:** 1 (DELETE /payment-gateways/{id})
