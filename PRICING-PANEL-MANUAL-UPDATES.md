# Pricing Panel Manual Updates Guide

## Files Created
✅ `/js/admin-pages/campaign-pricing-manager.js` - Campaign package management
✅ `/js/admin-pages/pricing-functions.js` - All pricing save functions
✅ `/PRICING-PANEL-IMPLEMENTATION.md` - Complete implementation guide

## Required Manual HTML Updates

### 1. Add Script Tags (Before `</body>` tag around line 3650)

Add these two scripts:
```html
<script src="../js/admin-pages/pricing-functions.js"></script>
<script src="../js/admin-pages/campaign-pricing-manager.js"></script>
```

### 2. Replace Campaign Advertising Section (Lines 899-1210)

**Find this section starting with:**
```html
<!-- Campaign Advertising Pricing -->
<div class="card p-6 mb-6">
    <h3 class="text-xl font-bold mb-4">
```

**Replace the ENTIRE section (up to line 1210) with:**
```html
<!-- Campaign Advertising Pricing -->
<div class="card p-6 mb-6" id="campaign-pricing-section">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-xl font-bold">
                <i class="fas fa-bullhorn mr-2 text-orange-600"></i>
                Campaign Advertising Pricing
            </h3>
            <p class="text-sm text-gray-600">Manage advertising campaign packages with custom pricing tiers</p>
        </div>
        <button onclick="openAddCampaignPackageModal()" class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <i class="fas fa-plus mr-2"></i>Add Package
        </button>
    </div>

    <!-- Dynamic Packages Grid -->
    <div id="campaign-packages-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <!-- Packages will be loaded dynamically by campaign-pricing-manager.js -->
    </div>

    <!-- Campaign Features Information -->
    <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h5 class="font-semibold mb-2 flex items-center gap-2">
            <i class="fas fa-info-circle text-blue-600"></i>
            Default Campaign Features (Applied to All Packages)
        </h5>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
            <div class="flex items-start gap-2">
                <i class="fas fa-eye text-blue-600 mt-1"></i>
                <div><strong>Unlimited Impressions:</strong> No cap on ad views during campaign period</div>
            </div>
            <div class="flex items-start gap-2">
                <i class="fas fa-bullseye text-blue-600 mt-1"></i>
                <div><strong>Custom Targeting:</strong> Target by grade level, subject, location, and interests</div>
            </div>
            <div class="flex items-start gap-2">
                <i class="fas fa-star text-blue-600 mt-1"></i>
                <div><strong>Priority Placement:</strong> Ads appear in premium positions across the platform</div>
            </div>
            <div class="flex items-start gap-2">
                <i class="fas fa-chart-bar text-blue-600 mt-1"></i>
                <div><strong>Full Analytics Suite:</strong> Real-time metrics, engagement data, and performance reports</div>
            </div>
        </div>
    </div>
</div>
```

### 3. Add Campaign Package Modal (Before `</body>` tag, around line 3640)

Add this complete modal:
```html
<!-- Campaign Package Modal (Add/Edit) -->
<div id="campaign-package-modal" class="modal hidden">
    <div class="modal-overlay" onclick="closeCampaignPackageModal()"></div>
    <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
            <h2 class="text-xl font-bold" id="campaign-modal-title">
                <i class="fas fa-bullhorn mr-2"></i>Add Campaign Package
            </h2>
            <button class="modal-close" onclick="closeCampaignPackageModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="campaign-package-form" onsubmit="saveCampaignPackage(event)">
                <!-- Hidden ID for editing -->
                <input type="hidden" id="campaign-package-id" value="">

                <!-- Package Name -->
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">Package Name *</label>
                    <input type="text" id="campaign-package-name" class="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Up to 3 Days" required>
                    <p class="text-xs text-gray-500 mt-1">Display name for this package</p>
                </div>

                <!-- Duration (Days) -->
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">Maximum Duration (Days) *</label>
                    <input type="number" id="campaign-package-days" class="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., 3" min="1" required>
                    <p class="text-xs text-gray-500 mt-1">Maximum number of days for this package</p>
                </div>

                <!-- Price per Day -->
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">Price per Day (ETB) *</label>
                    <input type="number" id="campaign-package-price" class="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., 2000" min="0" step="50" required>
                    <p class="text-xs text-gray-500 mt-1">Cost per day in Ethiopian Birr</p>
                </div>

                <!-- Set as Base Package -->
                <div class="mb-4">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" id="campaign-is-base" class="w-4 h-4">
                        <span class="text-sm font-semibold">Set as Base Package (for discount calculations)</span>
                    </label>
                    <p class="text-xs text-gray-500 mt-1">Other packages will show discount % compared to this base price</p>
                </div>

                <!-- Description -->
                <div class="mb-6">
                    <label class="block text-sm font-semibold mb-2">Description</label>
                    <input type="text" id="campaign-package-description" class="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Short-term campaigns">
                    <p class="text-xs text-gray-500 mt-1">Brief description of this package</p>
                </div>

                <!-- Submit Buttons -->
                <div class="flex justify-end gap-3">
                    <button type="button" onclick="closeCampaignPackageModal()"
                        class="px-6 py-2 border rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                        <i class="fas fa-save mr-2"></i>Save Package
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
```

### 4. Update Subscription Pricing Section (Around line 1213)

**Find:**
```html
<!-- Subscription Price Settings with Discount Tiers -->
<div class="card p-6 mb-6">
    <h3 class="text-xl font-bold mb-4">Subscription Price Settings & Discount Tiers</h3>
```

**Add "Set Price" button after the h3:**
```html
<!-- Subscription Price Settings with Discount Tiers -->
<div class="card p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-xl font-bold">Subscription Price Settings & Discount Tiers</h3>
            <p class="text-sm text-gray-600">Set base monthly prices and discounts for longer payment periods</p>
        </div>
        <button onclick="saveSubscriptionPricing()" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <i class="fas fa-save mr-2"></i>Set Price
        </button>
    </div>
```

**Then convert all subscription input values to placeholders:**
- Change `value="99"` to `placeholder="e.g. 99"`
- Change `value="299"` to `placeholder="e.g. 299"`
- Change `value="0"` to `placeholder="0"`
- Change `value="5"` to `placeholder="5"`
- Change `value="10"` to `placeholder="10"`
- Change `value="15"` to `placeholder="15"`
- Change `value="20"` to `placeholder="20"`

### 5. Update Affiliate Management Section (Around line 1300+)

**Find the Affiliate Management card:**
```html
<!-- Affiliate Management -->
<div class="card p-6">
    <h3 class="text-xl font-bold mb-4">
```

**Add "Set Price" button:**
```html
<!-- Affiliate Management -->
<div class="card p-6">
    <div class="flex items-center justify-between mb-4">
        <div>
            <h3 class="text-xl font-bold">
                <i class="fas fa-users mr-2 text-purple-600"></i>
                Affiliate Management
            </h3>
            <p class="text-sm text-gray-600">Configure affiliate commission rates</p>
        </div>
        <button onclick="saveAffiliateSettings()" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <i class="fas fa-save mr-2"></i>Set Rates
        </button>
    </div>
```

**Convert all affiliate input values to placeholders:**
- Change `value="20"` to `placeholder="20"`
- Change `value="25"` to `placeholder="25"`
- Change `value="12"` to `placeholder="12"`
- Change `value="10"` to `placeholder="10"`
- Change `value="15"` to `placeholder="15"`
- Change `value="6"` to `placeholder="6"`
- Change `value="100"` to `placeholder="100"`

## Testing Checklist

After making all updates:

1. ✅ Open manage-system-settings.html
2. ✅ Go to Pricing Management panel
3. ✅ Click "Add Package" - modal should open
4. ✅ Fill form and save - package should appear in grid
5. ✅ Click package card - should open edit modal
6. ✅ Click X on package - should delete with confirmation
7. ✅ Set one package as "Base" - other packages should show discount %
8. ✅ Test "Set Price" buttons on all sections
9. ✅ Refresh page - packages should persist (localStorage)
10. ✅ Test all save functions (check console for logs)

## Features Implemented

✅ Payment Gateway - Save Settings button
✅ Verification Pricing - Set Price button + placeholders
✅ Campaign Advertising - Complete dynamic system with:
  - Add Package modal
  - Edit package (click card)
  - Delete package (X button with hover)
  - Base package designation
  - Automatic discount % calculation
  - Remove icon on cards (hover to show)
  - Color-coded packages
✅ Subscription Pricing - Set Price button + placeholders
✅ Affiliate Management - Set Rates button + placeholders
✅ All data saves to localStorage (ready for backend API integration)

## Backend Integration Notes

When ready to connect to database:

1. Create campaign_packages table (see PRICING-PANEL-IMPLEMENTATION.md)
2. Create pricing_settings table
3. Update API calls in:
   - `campaign-pricing-manager.js` (lines with TODO: API call)
   - `pricing-functions.js` (lines with TODO: API call)
4. Replace localStorage with fetch() calls
5. Add loading states and error handling

## Files Modified

- ✅ manage-system-settings.html (Payment Gateway, Verification sections)
- ⏳ manage-system-settings.html (Campaign, Subscription, Affiliate sections) - NEEDS MANUAL UPDATES
- ✅ manage-system-settings-standalone.js (Panel switching)
- ✅ manage-system-settings.js (Active link detection)

## Files Created

- ✅ js/admin-pages/campaign-pricing-manager.js
- ✅ js/admin-pages/pricing-functions.js
- ✅ PRICING-PANEL-IMPLEMENTATION.md
- ✅ PRICING-PANEL-MANUAL-UPDATES.md (this file)
