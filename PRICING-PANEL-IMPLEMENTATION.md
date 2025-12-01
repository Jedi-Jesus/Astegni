# Pricing Panel Implementation Guide

This document outlines all the changes needed for the pricing management panel in `manage-system-settings.html`.

## Summary of Changes

### 1. Payment Gateway Configuration
- ✅ Added "Save Settings" button
- ✅ Converted checkboxes to use IDs
- ✅ All input values converted to placeholders

### 2. Verification Pricing
- ✅ Added "Set Price" button
- ✅ Converted values to placeholders (e.g., "50" → placeholder="e.g. 50")

### 3. Campaign Advertising Pricing (MAJOR CHANGES NEEDED)

#### Current State:
- Static 8 hardcoded package cards
- Values instead of placeholders
- No add/edit/delete functionality

#### Required Changes:
Replace entire Campaign Advertising section (lines 899-1210) with:

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
        <!-- Packages will be loaded dynamically here -->
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

###4. Campaign Package Modal

Add this modal before the closing `</body>` tag (around line 3600+):

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
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">Description</label>
                    <input type="text" id="campaign-package-description" class="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Short-term campaigns">
                    <p class="text-xs text-gray-500 mt-1">Brief description of this package</p>
                </div>

                <!-- Features Included -->
                <div class="mb-6">
                    <label class="block text-sm font-semibold mb-2">Features Included</label>
                    <div class="space-y-2">
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="w-4 h-4" value="unlimited_impressions" checked disabled>
                            <span class="text-sm">Unlimited impressions</span>
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="w-4 h-4" value="custom_targeting" checked disabled>
                            <span class="text-sm">Custom targeting</span>
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="w-4 h-4" value="priority_placement" checked disabled>
                            <span class="text-sm">Priority placement</span>
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="w-4 h-4" value="full_analytics" checked disabled>
                            <span class="text-sm">Full analytics suite</span>
                        </label>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">All packages include these default features</p>
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

### 5. JavaScript Functions Required

Add to `manage-system-settings.js` or `manage-system-settings-standalone.js`:

```javascript
// Campaign Packages State
let campaignPackages = [];
let basePackageId = null;

// Load Campaign Packages
function loadCampaignPackages() {
    // TODO: Fetch from database
    // For now, load from localStorage or use defaults
    const saved = localStorage.getItem('campaign_packages');
    if (saved) {
        campaignPackages = JSON.parse(saved);
    } else {
        // Default packages
        campaignPackages = [
            { id: 1, name: 'Up to 3 Days', days: 3, price: 2000, description: 'Short-term campaigns', is_base: true },
            { id: 2, name: 'Up to 7 Days', days: 7, price: 1800, description: '1 week campaigns', is_base: false },
            { id: 3, name: 'Up to Half a Month', days: 15, price: 1500, description: '~15 days campaigns', is_base: false },
            { id: 4, name: 'Up to 1 Month', days: 30, price: 1200, description: '30 days campaigns', is_base: false },
            { id: 5, name: 'Up to 3 Months', days: 90, price: 1000, description: 'Quarterly campaigns', is_base: false },
            { id: 6, name: 'Up to 6 Months', days: 180, price: 800, description: 'Half-year campaigns', is_base: false },
            { id: 7, name: 'Up to 9 Months', days: 270, price: 600, description: 'Extended campaigns', is_base: false },
            { id: 8, name: 'Up to 1 Year', days: 365, price: 400, description: 'Annual campaigns', is_base: false }
        ];
    }

    // Find base package
    const base = campaignPackages.find(p => p.is_base);
    basePackageId = base ? base.id : null;

    renderCampaignPackages();
}

// Render Campaign Packages
function renderCampaignPackages() {
    const grid = document.getElementById('campaign-packages-grid');
    if (!grid) return;

    const basePrice = basePackageId ? campaignPackages.find(p => p.id === basePackageId)?.price : null;

    grid.innerHTML = campaignPackages.map((pkg, index) => {
        const colors = ['orange', 'blue', 'purple', 'green', 'teal', 'cyan', 'pink', 'yellow'];
        const color = colors[index % colors.length];

        // Calculate discount
        let discountHTML = '';
        if (basePrice && !pkg.is_base && pkg.price < basePrice) {
            const discount = Math.round(((basePrice - pkg.price) / basePrice) * 100);
            discountHTML = `
                <div class="absolute top-2 right-2">
                    <span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        ${discount}% OFF
                    </span>
                </div>
            `;
        }

        // Base badge
        const baseBadge = pkg.is_base ? `
            <div class="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span class="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Base Price</span>
            </div>
        ` : '';

        return `
            <div class="border-2 border-${color}-200 rounded-lg p-4 bg-${color}-50 hover:shadow-lg transition-shadow relative cursor-pointer"
                onclick="editCampaignPackage(${pkg.id})">
                ${baseBadge}
                ${discountHTML}
                <button onclick="event.stopPropagation(); deleteCampaignPackage(${pkg.id})"
                    class="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xs">
                    <i class="fas fa-times"></i>
                </button>

                <div class="mb-3 ${pkg.is_base ? 'mt-2' : ''}">
                    <h4 class="font-bold text-${color}-700 mb-1">${pkg.name}</h4>
                    <p class="text-xs text-gray-600">${pkg.description || ''}</p>
                </div>

                <div class="mb-4">
                    <div class="text-2xl font-bold text-${color}-700">${pkg.price.toLocaleString()} ETB</div>
                    <div class="text-xs text-gray-600">per day</div>
                </div>

                <div class="text-xs space-y-1 text-gray-700">
                    <div class="flex items-center gap-1">
                        <i class="fas fa-calendar text-green-600"></i>
                        <span>Up to ${pkg.days} days</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i class="fas fa-check text-green-600"></i>
                        <span>All default features</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Open Modal for Adding Package
function openAddCampaignPackageModal() {
    document.getElementById('campaign-modal-title').innerHTML =
        '<i class="fas fa-bullhorn mr-2"></i>Add Campaign Package';
    document.getElementById('campaign-package-form').reset();
    document.getElementById('campaign-package-id').value = '';
    document.getElementById('campaign-package-modal').classList.remove('hidden');
}

// Edit Package
function editCampaignPackage(id) {
    const pkg = campaignPackages.find(p => p.id === id);
    if (!pkg) return;

    document.getElementById('campaign-modal-title').innerHTML =
        '<i class="fas fa-bullhorn mr-2"></i>Edit Campaign Package';
    document.getElementById('campaign-package-id').value = pkg.id;
    document.getElementById('campaign-package-name').value = pkg.name;
    document.getElementById('campaign-package-days').value = pkg.days;
    document.getElementById('campaign-package-price').value = pkg.price;
    document.getElementById('campaign-is-base').checked = pkg.is_base;
    document.getElementById('campaign-package-description').value = pkg.description || '';
    document.getElementById('campaign-package-modal').classList.remove('hidden');
}

// Close Modal
function closeCampaignPackageModal() {
    document.getElementById('campaign-package-modal').classList.add('hidden');
}

// Save Package
function saveCampaignPackage(event) {
    event.preventDefault();

    const id = document.getElementById('campaign-package-id').value;
    const name = document.getElementById('campaign-package-name').value;
    const days = parseInt(document.getElementById('campaign-package-days').value);
    const price = parseFloat(document.getElementById('campaign-package-price').value);
    const is_base = document.getElementById('campaign-is-base').checked;
    const description = document.getElementById('campaign-package-description').value;

    if (id) {
        // Edit existing
        const index = campaignPackages.findIndex(p => p.id == id);
        if (index !== -1) {
            campaignPackages[index] = { ...campaignPackages[index], name, days, price, description, is_base };
        }
    } else {
        // Add new
        const newId = Math.max(...campaignPackages.map(p => p.id), 0) + 1;
        campaignPackages.push({ id: newId, name, days, price, description, is_base });
    }

    // If this is set as base, remove base from others
    if (is_base) {
        campaignPackages.forEach(p => {
            if (p.id != id) p.is_base = false;
        });
    }

    // Save to localStorage (TODO: Save to database)
    localStorage.setItem('campaign_packages', JSON.stringify(campaignPackages));

    // Reload packages
    loadCampaignPackages();
    closeCampaignPackageModal();

    alert('Campaign package saved successfully!');
}

// Delete Package
function deleteCampaignPackage(id) {
    if (!confirm('Are you sure you want to delete this package?')) return;

    campaignPackages = campaignPackages.filter(p => p.id !== id);
    localStorage.setItem('campaign_packages', JSON.stringify(campaignPackages));
    loadCampaignPackages();

    alert('Package deleted successfully!');
}

// Save Functions for other sections
function savePaymentGatewaySettings() {
    const data = {
        telebirr: {
            enabled: document.getElementById('telebirr-enabled').checked,
            merchant_id: document.getElementById('telebirr-merchant-id').value,
            api_key: document.getElementById('telebirr-api-key').value
        },
        cbe: {
            enabled: document.getElementById('cbe-enabled').checked,
            account_number: document.getElementById('cbe-account-number').value,
            secret_key: document.getElementById('cbe-secret-key').value
        }
    };

    console.log('Saving payment gateway settings:', data);
    // TODO: API call to save to database
    alert('Payment gateway settings saved successfully!');
}

function saveVerificationPricing() {
    const data = {
        individual: parseFloat(document.getElementById('individual-verification-price').value) || 0,
        organization: parseFloat(document.getElementById('org-verification-price').value) || 0
    };

    console.log('Saving verification pricing:', data);
    // TODO: API call to save to database
    alert('Verification pricing saved successfully!');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCampaignPackages();
});
```

### 6. Subscription Price Settings

Update lines around 1213+:
- Add "Set Price" button at the top
- Convert all `value="99"` to `placeholder="e.g. 99"`
- Convert all table input values to placeholders

### 7. Affiliate Management

Add "Set Price" button and convert values to placeholders

## Implementation Steps

1. ✅ Update Payment Gateway section
2. ✅ Update Verification Pricing section
3. ⏳ Replace Campaign Advertising section HTML
4. ⏳ Add Campaign Package Modal
5. ⏳ Add JavaScript functions
6. ⏳ Update Subscription Pricing section
7. ⏳ Update Affiliate Management section
8. ⏳ Test all functionality

## Database Schema Needed

```sql
CREATE TABLE campaign_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    days INTEGER NOT NULL,
    price_per_day DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_base BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pricing_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints Needed

- `GET /api/campaign-packages` - Get all packages
- `POST /api/campaign-packages` - Create package
- `PUT /api/campaign-packages/{id}` - Update package
- `DELETE /api/campaign-packages/{id}` - Delete package
- `POST /api/pricing-settings/payment-gateway` - Save payment gateway settings
- `POST /api/pricing-settings/verification` - Save verification pricing
- `POST /api/pricing-settings/subscription` - Save subscription pricing
- `POST /api/pricing-settings/affiliate` - Save affiliate settings
