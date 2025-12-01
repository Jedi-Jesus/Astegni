# Campaign Package Modal - Updated HTML with Dynamic Features

## Complete Modal HTML (Replace in manage-system-settings.html)

Add this modal before `</body>` tag (around line 3640):

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

                <!-- Features Included (DYNAMIC SECTION) -->
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-semibold">Features Included *</label>
                        <button type="button" onclick="addNewFeature()"
                            class="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs flex items-center gap-1">
                            <i class="fas fa-plus"></i>
                            Add Feature
                        </button>
                    </div>
                    <div id="package-features-list" class="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                        <!-- Features will be added dynamically here by JavaScript -->
                        <!-- Each feature will have a text input and a remove button -->
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        Click "Add Feature" to add custom features. Each feature appears as a checkmark on the package card.
                    </p>
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

## How It Works

### 1. Add Feature Button
- Clicking the green "Add Feature" button creates a new text input field
- Each input has a remove (X) button on the right side

### 2. Feature Input Structure
Each feature input looks like this:
```html
<div class="flex items-center gap-2 mb-2">
    <input type="text" class="feature-input flex-1 px-3 py-2 border rounded-lg text-sm"
        placeholder="e.g., Unlimited impressions" value="Feature Name">
    <button type="button" onclick="removeFeatureInput('feature-id')"
        class="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600">
        <i class="fas fa-times"></i>
    </button>
</div>
```

### 3. Default Features
When you open the modal to add a new package or edit an existing one, it automatically loads:
- Unlimited impressions
- Custom targeting
- Priority placement
- Full analytics suite

### 4. Add/Remove Features
- **Add**: Click "Add Feature" button → new input appears → type feature name
- **Remove**: Click X button next to any feature → that feature is removed
- **Minimum**: At least one feature must remain (enforced by validation)

### 5. Save Behavior
When saving:
- Collects all feature input values
- Validates at least one feature exists
- Saves features array with the package
- Features display on package cards with checkmark icons

## Example Usage

### Adding a New Package with Custom Features:
1. Click "Add Package"
2. Fill in: Name, Days, Price, Description
3. Default 4 features are pre-loaded
4. Click "Add Feature" to add more (e.g., "Dedicated support", "Custom landing page")
5. Remove unwanted features by clicking their X buttons
6. Click "Save Package"

### Editing Package Features:
1. Click on any package card
2. Modal opens with existing features loaded
3. Add new features or remove existing ones
4. Click "Save Package"

## Features Display on Cards

Package cards will show all features like this:
```
Up to 3 Days
Short-term campaigns

2,000 ETB
per day

📅 Up to 3 days
✓ Unlimited impressions
✓ Custom targeting
✓ Priority placement
✓ Full analytics suite
✓ Dedicated support (if added)
```

## JavaScript Functions Used

All these functions are in `campaign-pricing-manager.js`:

1. **addNewFeature()** - Called by "Add Feature" button
2. **addFeatureInput(value)** - Creates a feature input field
3. **removeFeatureInput(id)** - Removes a feature input
4. **saveCampaignPackage(event)** - Collects all features and saves

## Validation

- Package must have at least 1 feature
- Empty feature inputs are ignored
- Validation message appears if trying to save with no features

## Styling Notes

- Features container has `max-h-60 overflow-y-auto` for scrolling when many features
- Each feature input is full-width with small remove button
- Green "Add Feature" button is positioned top-right
- Gray background (`bg-gray-50`) distinguishes the features area

## Complete Update Checklist

✅ JavaScript file updated: `campaign-pricing-manager.js`
✅ Default packages include features array
✅ Render function displays features on cards
✅ Modal opens with features pre-loaded
✅ Add/Remove feature functions implemented
✅ Save function collects and validates features
⏳ HTML modal needs to be added to `manage-system-settings.html` (use code above)

## Files Modified

- ✅ `js/admin-pages/campaign-pricing-manager.js` - Updated with feature management
- ⏳ `admin-pages/manage-system-settings.html` - Add modal HTML (pending)
