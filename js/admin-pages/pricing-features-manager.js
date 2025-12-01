// ============================================
// PRICING & FEATURES MANAGEMENT
// Handles campaign packages, subscription pricing, and affiliate settings
// ============================================

// ============================================
// CAMPAIGN PACKAGE MANAGEMENT
// ============================================

// Global array to track campaign packages
let campaignPackages = [];
let packageCounter = 0;

// Load Campaign Packages from Database
async function loadCampaignPackagesFromDB() {
    console.log('📦 Loading campaign packages from database...');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠ No auth token found');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/campaign-packages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.packages && Array.isArray(data.packages)) {
            // Map database format to UI format
            campaignPackages = data.packages.map(pkg => ({
                id: pkg.id || pkg.package_id,
                name: pkg.name || pkg.package_name,
                days: pkg.days || pkg.duration_days,
                price: pkg.price || pkg.price_per_day,
                isBase: pkg.is_base || false,
                label: pkg.label || 'none',
                description: pkg.description || '',
                includes: Array.isArray(pkg.features) ? pkg.features : (pkg.includes || [])
            }));

            console.log(`✅ Loaded ${campaignPackages.length} packages from database`);
            renderCampaignPackages();
        } else {
            console.warn('⚠ No packages found or invalid response format');
            campaignPackages = [];
            renderCampaignPackages();
        }
    } catch (error) {
        console.error('❌ Error loading campaign packages from database:', error);
        campaignPackages = [];
        renderCampaignPackages();
    }
}

// Open Add Campaign Package Modal
function openAddCampaignPackageModal() {
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        // Reset form
        document.getElementById('campaign-package-form').reset();
        document.getElementById('campaign-package-id').value = '';
        document.getElementById('campaign-modal-title').innerHTML = '<i class="fas fa-bullhorn mr-2"></i>Add Campaign Package';

        // Clear package includes
        document.getElementById('package-includes-container').innerHTML = '';
        document.getElementById('includes-empty-state').style.display = 'block';

        modal.classList.remove('hidden');
    }
}

// Close Campaign Package Modal
function closeCampaignPackageModal() {
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Add Package Include Feature
function addPackageInclude() {
    const container = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');

    if (!container) return;

    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Create unique ID for this feature
    const featureId = 'feature-' + Date.now();

    // Create feature input row
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex items-center gap-2';
    featureDiv.id = featureId;
    featureDiv.innerHTML = `
        <input type="text"
            class="flex-1 px-3 py-2 border rounded-lg text-sm"
            placeholder="e.g., Unlimited Impressions, Priority Placement"
            data-feature-input>
        <button type="button"
            onclick="removePackageInclude('${featureId}')"
            class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-1 text-sm">
            <i class="fas fa-trash"></i>
            Remove
        </button>
    `;

    container.appendChild(featureDiv);

    // Focus the new input
    const input = featureDiv.querySelector('input');
    if (input) input.focus();
}

// Remove Package Include Feature
function removePackageInclude(featureId) {
    const feature = document.getElementById(featureId);
    if (feature) {
        feature.remove();

        // Show empty state if no features left
        const container = document.getElementById('package-includes-container');
        const emptyState = document.getElementById('includes-empty-state');
        if (container && container.children.length === 0 && emptyState) {
            emptyState.style.display = 'block';
        }
    }
}

// Save Campaign Package
async function saveCampaignPackage(event) {
    event.preventDefault();

    // Get form values
    const packageId = document.getElementById('campaign-package-id').value;
    const name = document.getElementById('campaign-package-name').value.trim();
    const days = parseInt(document.getElementById('campaign-package-days').value);
    const price = parseFloat(document.getElementById('campaign-package-price').value);
    const isBase = document.getElementById('campaign-is-base').checked;
    const description = document.getElementById('campaign-package-description').value.trim();

    // Get selected label
    const selectedLabel = document.querySelector('input[name="campaign-package-label"]:checked');
    const label = selectedLabel ? selectedLabel.value : 'none';

    // Get package includes
    const includeInputs = document.querySelectorAll('#package-includes-container [data-feature-input]');
    const includes = Array.from(includeInputs)
        .map(input => input.value.trim())
        .filter(val => val.length > 0);

    // Validate
    if (!name || !days || price === null || isNaN(price)) {
        alert('Please fill in all required fields');
        return;
    }

    // Create package object for API
    const packageData = {
        name,
        days,
        price,
        is_base: isBase,
        label,
        description,
        features: includes
    };

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        let response;
        if (packageId) {
            // Update existing package
            response = await fetch(`${window.API_BASE_URL}/api/admin/campaign-packages/${packageId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            });
        } else {
            // Create new package
            response = await fetch(`${window.API_BASE_URL}/api/admin/campaign-packages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            });
        }

        if (!response.ok) {
            throw new Error('Failed to save package');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save package');
        }

        console.log('✅ Campaign package saved to database:', result);

        // Reload packages from database
        await loadCampaignPackagesFromDB();

        // Close modal
        closeCampaignPackageModal();

        alert('Campaign package saved successfully!');

    } catch (error) {
        console.error('❌ Error saving campaign package:', error);
        alert('Failed to save campaign package. Please try again.');
    }
}

// Render Campaign Packages
function renderCampaignPackages() {
    const grid = document.getElementById('campaign-packages-grid');
    if (!grid) return;

    if (campaignPackages.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <i class="fas fa-box-open text-5xl mb-4"></i>
                <p class="text-lg">No campaign packages yet</p>
                <p class="text-sm">Click "Add Package" to create your first package</p>
            </div>
        `;
        return;
    }

    // Find base package for discount calculation
    const basePackage = campaignPackages.find(p => p.isBase);

    grid.innerHTML = campaignPackages.map(pkg => {
        // Calculate discount percentage if not base
        let discountBadge = '';
        if (basePackage && !pkg.isBase && basePackage.price > 0) {
            const discount = Math.round(((basePackage.price - pkg.price) / basePackage.price) * 100);
            if (discount > 0) {
                discountBadge = `<span class="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">${discount}% OFF</span>`;
            }
        }

        // Base price badge
        const baseBadge = pkg.isBase ? '<span class="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded">BASE PRICE</span>' : '';

        // Popular label badge
        let popularBadge = '';
        if (pkg.label === 'popular') {
            popularBadge = '<span class="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded absolute top-2 right-2">POPULAR</span>';
        } else if (pkg.label === 'most-popular') {
            popularBadge = '<span class="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded absolute top-2 right-2">MOST POPULAR</span>';
        }

        // Includes list
        const includesList = pkg.includes && pkg.includes.length > 0
            ? pkg.includes.map(inc => `
                <div class="flex items-start gap-2 text-sm">
                    <i class="fas fa-check text-green-500 mt-0.5"></i>
                    <span>${inc}</span>
                </div>
            `).join('')
            : '<p class="text-sm text-gray-400 italic">No specific features listed</p>';

        return `
            <div class="campaign-package-card border-2 rounded-lg p-4 hover:shadow-lg transition-all cursor-move relative"
                draggable="true"
                data-package-id="${pkg.id}"
                ondragstart="window.handleDragStart(event)"
                ondragend="window.handleDragEnd(event)"
                ondragover="window.handleDragOver(event)"
                ondrop="window.handleDrop(event)">

                <!-- Popular Badge (Top Right) -->
                ${popularBadge}

                <div class="mb-3">
                    <h4 class="text-lg font-bold mb-1">${pkg.name}</h4>
                    ${pkg.description ? `<p class="text-xs text-gray-600">${pkg.description}</p>` : ''}
                </div>

                <div class="mb-3">
                    <div class="flex items-baseline gap-2">
                        <span class="text-3xl font-bold text-orange-600">${pkg.price}</span>
                        <span class="text-sm text-gray-600">ETB/day</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Up to ${pkg.days} days</p>
                </div>

                <!-- Badges Row -->
                <div class="flex flex-wrap gap-2 mb-4">
                    ${baseBadge}
                    ${discountBadge}
                </div>

                <!-- Includes -->
                <div class="mb-4 pt-3 border-t">
                    <p class="text-xs font-semibold text-gray-700 mb-2">Package Includes:</p>
                    <div class="space-y-1">
                        ${includesList}
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); window.editCampaignPackage(${pkg.id})"
                        class="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="event.stopPropagation(); window.deleteCampaignPackage(${pkg.id})"
                        class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Edit Campaign Package
function editCampaignPackage(packageId) {
    // Convert to number for comparison (in case it comes as string from HTML)
    const pkgId = typeof packageId === 'string' ? parseInt(packageId) : packageId;
    const pkg = campaignPackages.find(p => p.id == pkgId); // Use loose equality to handle type mismatches
    if (!pkg) {
        console.error('Package not found with ID:', packageId);
        return;
    }

    // Populate form
    document.getElementById('campaign-package-id').value = pkg.id;
    document.getElementById('campaign-package-name').value = pkg.name;
    document.getElementById('campaign-package-days').value = pkg.days;
    document.getElementById('campaign-package-price').value = pkg.price;
    document.getElementById('campaign-is-base').checked = pkg.isBase;
    document.getElementById('campaign-package-description').value = pkg.description || '';

    // Set label radio button
    const labelValue = pkg.label || 'none';
    const labelRadio = document.querySelector(`input[name="campaign-package-label"][value="${labelValue}"]`);
    if (labelRadio) {
        labelRadio.checked = true;
    } else {
        // Fallback to 'none' if label value is invalid
        const noneRadio = document.querySelector(`input[name="campaign-package-label"][value="none"]`);
        if (noneRadio) noneRadio.checked = true;
    }

    // Populate includes
    const container = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');
    container.innerHTML = '';

    if (pkg.includes && pkg.includes.length > 0) {
        emptyState.style.display = 'none';
        pkg.includes.forEach(feature => {
            const featureId = 'feature-' + Date.now() + Math.random();
            const featureDiv = document.createElement('div');
            featureDiv.className = 'flex items-center gap-2';
            featureDiv.id = featureId;
            featureDiv.innerHTML = `
                <input type="text"
                    class="flex-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g., Unlimited Impressions"
                    data-feature-input
                    value="${feature}">
                <button type="button"
                    onclick="removePackageInclude('${featureId}')"
                    class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-1 text-sm">
                    <i class="fas fa-trash"></i>
                    Remove
                </button>
            `;
            container.appendChild(featureDiv);
        });
    } else {
        emptyState.style.display = 'block';
    }

    // Update modal title
    document.getElementById('campaign-modal-title').innerHTML = '<i class="fas fa-bullhorn mr-2"></i>Edit Campaign Package';

    // Open modal directly (don't call openAddCampaignPackageModal as it resets the title)
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Delete Campaign Package
async function deleteCampaignPackage(packageId) {
    // Convert to number for comparison (in case it comes as string from HTML)
    const pkgId = typeof packageId === 'string' ? parseInt(packageId) : packageId;
    const pkg = campaignPackages.find(p => p.id == pkgId); // Use loose equality to handle type mismatches
    if (!pkg) {
        console.error('Package not found with ID:', packageId);
        return;
    }

    if (!confirm(`Are you sure you want to delete "${pkg.name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/campaign-packages/${packageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete package');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to delete package');
        }

        console.log('✅ Campaign package deleted from database');

        // Reload packages from database
        await loadCampaignPackagesFromDB();

        alert('Package deleted successfully!');

    } catch (error) {
        console.error('❌ Error deleting campaign package:', error);
        alert('Failed to delete campaign package. Please try again.');
    }
}

// ============================================
// DRAG AND DROP FOR CAMPAIGN PACKAGES
// ============================================

let draggedElement = null;

function handleDragStart(event) {
    draggedElement = event.currentTarget;
    event.currentTarget.style.opacity = '0.4';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.currentTarget.innerHTML);
}

function handleDragEnd(event) {
    event.currentTarget.style.opacity = '1';

    // Remove all drag over styles
    document.querySelectorAll('.campaign-package-card').forEach(card => {
        card.classList.remove('border-blue-500', 'bg-blue-50');
    });
}

function handleDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }

    event.dataTransfer.dropEffect = 'move';

    // Add visual feedback
    const target = event.currentTarget;
    if (target !== draggedElement) {
        target.classList.add('border-blue-500', 'bg-blue-50');
    }

    return false;
}

function handleDrop(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }

    const dropTarget = event.currentTarget;

    if (draggedElement !== dropTarget) {
        // Get package IDs
        const draggedId = draggedElement.dataset.packageId;
        const targetId = dropTarget.dataset.packageId;

        // Find indices
        const draggedIndex = campaignPackages.findIndex(p => p.id === draggedId);
        const targetIndex = campaignPackages.findIndex(p => p.id === targetId);

        // Swap positions in array
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const temp = campaignPackages[draggedIndex];
            campaignPackages[draggedIndex] = campaignPackages[targetIndex];
            campaignPackages[targetIndex] = temp;

            // Re-render
            renderCampaignPackages();
        }
    }

    return false;
}

// ============================================
// SUBSCRIPTION PRICING WITH LIVE CALCULATIONS
// ============================================

// Calculate Live Pricing for Subscriptions
function calculateLivePricing() {
    // Get base prices
    const basicBase = parseFloat(document.getElementById('basic-base-price')?.value) || 0;
    const premiumBase = parseFloat(document.getElementById('premium-base-price')?.value) || 0;

    // Define periods
    const periods = [
        { suffix: '1m', months: 1 },
        { suffix: '3m', months: 3 },
        { suffix: '6m', months: 6 },
        { suffix: '9m', months: 9 },
        { suffix: '12m', months: 12 }
    ];

    // Calculate for each period
    periods.forEach(period => {
        // Basic tier
        const basicDiscount = parseFloat(document.getElementById(`basic-discount-${period.suffix}`)?.value) || 0;
        const basicTotal = basicBase * period.months;
        const basicFinal = basicTotal * (1 - basicDiscount / 100);
        const basicPriceElement = document.getElementById(`basic-price-${period.suffix}`);
        if (basicPriceElement) {
            basicPriceElement.textContent = basicBase > 0
                ? `${basicFinal.toFixed(2)} ETB (${(basicFinal / period.months).toFixed(2)} ETB/month)`
                : '--';
        }

        // Premium tier
        const premiumDiscount = parseFloat(document.getElementById(`premium-discount-${period.suffix}`)?.value) || 0;
        const premiumTotal = premiumBase * period.months;
        const premiumFinal = premiumTotal * (1 - premiumDiscount / 100);
        const premiumPriceElement = document.getElementById(`premium-price-${period.suffix}`);
        if (premiumPriceElement) {
            premiumPriceElement.textContent = premiumBase > 0
                ? `${premiumFinal.toFixed(2)} ETB (${(premiumFinal / period.months).toFixed(2)} ETB/month)`
                : '--';
        }
    });
}

// Save Subscription Pricing
async function saveSubscriptionPricing() {
    const basicBase = parseFloat(document.getElementById('basic-base-price')?.value) || 0;
    const premiumBase = parseFloat(document.getElementById('premium-base-price')?.value) || 0;

    if (basicBase <= 0 || premiumBase <= 0) {
        alert('Please enter valid base prices for both tiers');
        return;
    }

    // Get all discount values
    const periods = ['1m', '3m', '6m', '9m', '12m'];
    const discounts = {
        basic: {},
        premium: {}
    };

    periods.forEach(period => {
        discounts.basic[period] = parseFloat(document.getElementById(`basic-discount-${period}`)?.value) || 0;
        discounts.premium[period] = parseFloat(document.getElementById(`premium-discount-${period}`)?.value) || 0;
    });

    // Get features
    const basicFeatures = getFeaturesList('basic-tier-features-container');
    const premiumFeatures = getFeaturesList('premium-tier-features-container');

    const pricingData = {
        basic: {
            basePrice: basicBase,
            discounts: discounts.basic,
            features: basicFeatures
        },
        premium: {
            basePrice: premiumBase,
            discounts: discounts.premium,
            features: premiumFeatures
        }
    };

    console.log('Subscription pricing to save:', pricingData);

    // Build detailed alert message
    let alertMessage = 'Subscription pricing saved!\n\n';
    alertMessage += `Basic Tier:\n`;
    alertMessage += `- Base Price: ${basicBase} ETB/month\n`;
    alertMessage += `- Features: ${basicFeatures.length > 0 ? basicFeatures.length + ' features added' : 'No features added'}\n\n`;
    alertMessage += `Premium Tier:\n`;
    alertMessage += `- Base Price: ${premiumBase} ETB/month\n`;
    alertMessage += `- Features: ${premiumFeatures.length > 0 ? premiumFeatures.length + ' features added' : 'No features added'}\n\n`;
    alertMessage += '(In production, this would save to database)';

    alert(alertMessage);

    // TODO: Send to backend
    // await fetch(`${window.API_BASE_URL}/api/admin/system/subscription-pricing`, {...})
}

// ============================================
// SUBSCRIPTION TIER FEATURES
// ============================================

// Add Basic Tier Feature
function addBasicTierFeature() {
    addTierFeature('basic-tier-features-container', 'basic-features-empty-state', 'bg-blue-500', 'bg-blue-600');
}

// Add Premium Tier Feature
function addPremiumTierFeature() {
    addTierFeature('premium-tier-features-container', 'premium-features-empty-state', 'bg-purple-500', 'bg-purple-600');
}

// Generic function to add tier feature
function addTierFeature(containerId, emptyStateId, btnColor, btnHoverColor) {
    const container = document.getElementById(containerId);
    const emptyState = document.getElementById(emptyStateId);

    if (!container) return;

    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Create unique ID
    const featureId = 'tier-feature-' + Date.now();

    // Create feature input
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex items-center gap-2';
    featureDiv.id = featureId;
    featureDiv.innerHTML = `
        <i class="fas fa-check-circle text-green-500"></i>
        <input type="text"
            class="flex-1 px-2 py-1.5 border rounded text-sm"
            placeholder="e.g., 100 GB Storage, Priority Support"
            data-tier-feature-input>
        <button type="button"
            onclick="removeTierFeature('${featureId}', '${emptyStateId}')"
            class="px-2 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(featureDiv);

    // Focus the new input
    const input = featureDiv.querySelector('input');
    if (input) input.focus();
}

// Remove Tier Feature
function removeTierFeature(featureId, emptyStateId) {
    const feature = document.getElementById(featureId);
    if (feature) {
        const container = feature.parentElement;
        feature.remove();

        // Show empty state if no features left
        const emptyState = document.getElementById(emptyStateId);
        if (container && container.children.length === 0 && emptyState) {
            emptyState.style.display = 'block';
        }
    }
}

// Get features list from container
function getFeaturesList(containerId) {
    const inputs = document.querySelectorAll(`#${containerId} [data-tier-feature-input]`);
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(val => val.length > 0);
}

// ============================================
// AFFILIATE MANAGEMENT WITH LIVE CALCULATIONS
// ============================================

// Calculate Affiliate Commission Examples
function calculateAffiliateExamples() {
    // Get base prices (from subscription section)
    const basicBase = parseFloat(document.getElementById('basic-base-price')?.value) || 0;
    const premiumBase = parseFloat(document.getElementById('premium-base-price')?.value) || 0;

    // Get selected period from dropdown
    const periodSelect = document.getElementById('affiliate-calc-period');
    const selectedPeriod = periodSelect ? periodSelect.value : '6m';

    // Get discount for selected period
    const basicDiscount = parseFloat(document.getElementById(`basic-discount-${selectedPeriod}`)?.value) || 0;
    const premiumDiscount = parseFloat(document.getElementById(`premium-discount-${selectedPeriod}`)?.value) || 0;

    // Get number of months for selected period
    const periodMonths = {
        '1m': 1,
        '3m': 3,
        '6m': 6,
        '9m': 9,
        '12m': 12
    };
    const months = periodMonths[selectedPeriod] || 6;

    // Calculate discounted final prices (what customer actually pays)
    const basicTotal = basicBase * months;
    const premiumTotal = premiumBase * months;
    const basicFinalPrice = basicTotal * (1 - basicDiscount / 100);
    const premiumFinalPrice = premiumTotal * (1 - premiumDiscount / 100);

    // Get affiliate commission rates
    const directBasic = parseFloat(document.getElementById('direct-basic-commission')?.value) || 0;
    const directPremium = parseFloat(document.getElementById('direct-premium-commission')?.value) || 0;
    const indirectBasic = parseFloat(document.getElementById('indirect-basic-commission')?.value) || 0;
    const indirectPremium = parseFloat(document.getElementById('indirect-premium-commission')?.value) || 0;

    // Calculate commissions based on FINAL DISCOUNTED PRICE
    const directBasicCommission = (basicFinalPrice * directBasic / 100).toFixed(2);
    const directPremiumCommission = (premiumFinalPrice * directPremium / 100).toFixed(2);
    const indirectBasicCommission = (basicFinalPrice * indirectBasic / 100).toFixed(2);
    const indirectPremiumCommission = (premiumFinalPrice * indirectPremium / 100).toFixed(2);

    // Period labels
    const periodLabels = {
        '1m': '1 Month',
        '3m': '3 Months',
        '6m': '6 Months',
        '9m': '9 Months',
        '12m': '1 Year'
    };
    const periodLabel = periodLabels[selectedPeriod];

    // Update live calculator display
    const directBasicCalc = document.getElementById('direct-basic-calc');
    const directPremiumCalc = document.getElementById('direct-premium-calc');
    const indirectBasicCalc = document.getElementById('indirect-basic-calc');
    const indirectPremiumCalc = document.getElementById('indirect-premium-calc');

    // Update detail displays
    const directBasicDetail = document.getElementById('direct-basic-calc-detail');
    const directPremiumDetail = document.getElementById('direct-premium-calc-detail');
    const indirectBasicDetail = document.getElementById('indirect-basic-calc-detail');
    const indirectPremiumDetail = document.getElementById('indirect-premium-calc-detail');

    if (directBasicCalc) {
        directBasicCalc.textContent = basicBase > 0 && directBasic > 0
            ? `${directBasicCommission} ETB`
            : '-- ETB';
    }
    if (directBasicDetail) {
        directBasicDetail.textContent = basicBase > 0 && directBasic > 0
            ? `${directBasic}% of ${basicFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    if (directPremiumCalc) {
        directPremiumCalc.textContent = premiumBase > 0 && directPremium > 0
            ? `${directPremiumCommission} ETB`
            : '-- ETB';
    }
    if (directPremiumDetail) {
        directPremiumDetail.textContent = premiumBase > 0 && directPremium > 0
            ? `${directPremium}% of ${premiumFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    if (indirectBasicCalc) {
        indirectBasicCalc.textContent = basicBase > 0 && indirectBasic > 0
            ? `${indirectBasicCommission} ETB`
            : '-- ETB';
    }
    if (indirectBasicDetail) {
        indirectBasicDetail.textContent = basicBase > 0 && indirectBasic > 0
            ? `${indirectBasic}% of ${basicFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    if (indirectPremiumCalc) {
        indirectPremiumCalc.textContent = premiumBase > 0 && indirectPremium > 0
            ? `${indirectPremiumCommission} ETB`
            : '-- ETB';
    }
    if (indirectPremiumDetail) {
        indirectPremiumDetail.textContent = premiumBase > 0 && indirectPremium > 0
            ? `${indirectPremium}% of ${premiumFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    console.log('Affiliate Commission Examples (After Discount):');
    console.log(`Period: ${periodLabel}`);
    console.log(`Direct - Basic: ${directBasicCommission} ETB (${directBasic}% of ${basicFinalPrice.toFixed(2)} ETB after ${basicDiscount}% discount)`);
    console.log(`Direct - Premium: ${directPremiumCommission} ETB (${directPremium}% of ${premiumFinalPrice.toFixed(2)} ETB after ${premiumDiscount}% discount)`);
    console.log(`Indirect - Basic: ${indirectBasicCommission} ETB (${indirectBasic}% of ${basicFinalPrice.toFixed(2)} ETB after ${basicDiscount}% discount)`);
    console.log(`Indirect - Premium: ${indirectPremiumCommission} ETB (${indirectPremium}% of ${premiumFinalPrice.toFixed(2)} ETB after ${premiumDiscount}% discount)`);

    return {
        direct: { basic: directBasicCommission, premium: directPremiumCommission },
        indirect: { basic: indirectBasicCommission, premium: indirectPremiumCommission }
    };
}

// Save Affiliate Settings
async function saveAffiliateSettings() {
    const affiliateData = {
        direct: {
            basicCommission: parseFloat(document.getElementById('direct-basic-commission')?.value) || 0,
            premiumCommission: parseFloat(document.getElementById('direct-premium-commission')?.value) || 0,
            duration: parseInt(document.getElementById('direct-duration')?.value) || 12
        },
        indirect: {
            basicCommission: parseFloat(document.getElementById('indirect-basic-commission')?.value) || 0,
            premiumCommission: parseFloat(document.getElementById('indirect-premium-commission')?.value) || 0,
            duration: parseInt(document.getElementById('indirect-duration')?.value) || 6
        },
        settings: {
            minimumPayout: parseFloat(document.getElementById('minimum-payout')?.value) || 100,
            payoutSchedule: document.getElementById('payout-schedule')?.value || 'monthly',
            enableAffiliateProgram: document.getElementById('enable-affiliate-program')?.checked || false
        }
    };

    console.log('Affiliate settings to save:', affiliateData);

    // Calculate and show examples
    const examples = calculateAffiliateExamples();

    alert(`Affiliate settings saved!\n\nCommission Examples:\nDirect Basic: ${examples.direct.basic} ETB\nDirect Premium: ${examples.direct.premium} ETB\nIndirect Basic: ${examples.indirect.basic} ETB\nIndirect Premium: ${examples.indirect.premium} ETB\n\nMinimum Payout: ${affiliateData.settings.minimumPayout} ETB\nPayout Schedule: ${affiliateData.settings.payoutSchedule}`);

    // TODO: Send to backend
    // await fetch(`${window.API_BASE_URL}/api/admin/system/affiliate-settings`, {...})
}

// ============================================
// PAYMENT GATEWAY MANAGEMENT
// ============================================

// Array to store additional payment gateways
let additionalGateways = [];
let gatewayCounter = 0;

// Open Add Payment Gateway Modal
function openAddPaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        // Reset form
        document.getElementById('payment-gateway-form').reset();
        document.getElementById('gateway-enabled').checked = true;
        modal.classList.remove('hidden');
    }
}

// Close Payment Gateway Modal
function closePaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save Payment Gateway
function savePaymentGateway(event) {
    event.preventDefault();

    // Get form values
    const name = document.getElementById('gateway-name').value.trim();
    const merchantId = document.getElementById('gateway-merchant-id').value.trim();
    const apiKey = document.getElementById('gateway-api-key').value.trim();
    const additionalInfo = document.getElementById('gateway-additional-info').value.trim();
    const enabled = document.getElementById('gateway-enabled').checked;

    if (!name) {
        alert('Please enter a gateway name');
        return;
    }

    // Create gateway object
    const gateway = {
        id: ++gatewayCounter,
        name,
        merchantId,
        apiKey,
        additionalInfo,
        enabled
    };

    // Add to array
    additionalGateways.push(gateway);

    console.log('Payment gateway added:', gateway);

    // Render the gateway
    renderAdditionalGateways();

    // Close modal
    closePaymentGatewayModal();

    alert(`Payment gateway "${name}" added successfully!`);
}

// Render Additional Payment Gateways
function renderAdditionalGateways() {
    const container = document.getElementById('additional-gateways-container');
    if (!container) return;

    if (additionalGateways.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = additionalGateways.map(gateway => `
        <div class="border rounded-lg p-4" data-gateway-id="${gateway.id}">
            <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold">${gateway.name}</h4>
                <div class="flex items-center gap-3">
                    <label class="flex items-center gap-2">
                        <input type="checkbox"
                            ${gateway.enabled ? 'checked' : ''}
                            onchange="toggleGateway(${gateway.id})"
                            class="w-4 h-4">
                        <span class="text-sm">Enabled</span>
                    </label>
                    <button onclick="removeGateway(${gateway.id})"
                        class="text-red-500 hover:text-red-700 text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${gateway.merchantId ? `
                    <div>
                        <label class="block mb-1 text-xs text-gray-600">Merchant/Account ID</label>
                        <input type="text" value="${gateway.merchantId}"
                            onchange="updateGatewayField(${gateway.id}, 'merchantId', this.value)"
                            class="w-full p-2 border rounded-lg text-sm">
                    </div>
                ` : ''}
                ${gateway.apiKey ? `
                    <div>
                        <label class="block mb-1 text-xs text-gray-600">API Key</label>
                        <input type="password" value="${gateway.apiKey}"
                            onchange="updateGatewayField(${gateway.id}, 'apiKey', this.value)"
                            class="w-full p-2 border rounded-lg text-sm">
                    </div>
                ` : ''}
            </div>
            ${gateway.additionalInfo ? `
                <div class="mt-3">
                    <label class="block mb-1 text-xs text-gray-600">Additional Info</label>
                    <textarea
                        onchange="updateGatewayField(${gateway.id}, 'additionalInfo', this.value)"
                        class="w-full p-2 border rounded-lg text-sm" rows="2">${gateway.additionalInfo}</textarea>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Toggle Gateway Enabled/Disabled
function toggleGateway(gatewayId) {
    const gateway = additionalGateways.find(g => g.id === gatewayId);
    if (gateway) {
        gateway.enabled = !gateway.enabled;
        console.log(`Gateway "${gateway.name}" ${gateway.enabled ? 'enabled' : 'disabled'}`);
    }
}

// Update Gateway Field
function updateGatewayField(gatewayId, field, value) {
    const gateway = additionalGateways.find(g => g.id === gatewayId);
    if (gateway) {
        gateway[field] = value;
        console.log(`Gateway "${gateway.name}" ${field} updated:`, value);
    }
}

// Remove Gateway
function removeGateway(gatewayId) {
    const gateway = additionalGateways.find(g => g.id === gatewayId);
    if (!gateway) return;

    if (!confirm(`Remove payment gateway "${gateway.name}"?`)) {
        return;
    }

    additionalGateways = additionalGateways.filter(g => g.id !== gatewayId);
    renderAdditionalGateways();
    console.log(`Gateway "${gateway.name}" removed`);
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

// Campaign Package Functions
window.openAddCampaignPackageModal = openAddCampaignPackageModal;
window.closeCampaignPackageModal = closeCampaignPackageModal;
window.addPackageInclude = addPackageInclude;
window.removePackageInclude = removePackageInclude;
window.saveCampaignPackage = saveCampaignPackage;
window.editCampaignPackage = editCampaignPackage;
window.deleteCampaignPackage = deleteCampaignPackage;
window.renderCampaignPackages = renderCampaignPackages;

// Drag and Drop Functions
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;

// Subscription Pricing Functions
window.calculateLivePricing = calculateLivePricing;
window.saveSubscriptionPricing = saveSubscriptionPricing;
window.addBasicTierFeature = addBasicTierFeature;
window.addPremiumTierFeature = addPremiumTierFeature;
window.removeTierFeature = removeTierFeature;

// Affiliate Functions
window.calculateAffiliateExamples = calculateAffiliateExamples;
window.saveAffiliateSettings = saveAffiliateSettings;

// Payment Gateway Functions
window.openAddPaymentGatewayModal = openAddPaymentGatewayModal;
window.closePaymentGatewayModal = closePaymentGatewayModal;
window.savePaymentGateway = savePaymentGateway;
window.toggleGateway = toggleGateway;
window.updateGatewayField = updateGatewayField;
window.removeGateway = removeGateway;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Pricing & Features Manager loaded');

    // Load campaign packages from database if grid exists
    if (document.getElementById('campaign-packages-grid')) {
        loadCampaignPackagesFromDB();
    }

    // Add input listeners for live pricing calculation
    const pricingInputs = document.querySelectorAll('#basic-base-price, #premium-base-price, [id^="basic-discount-"], [id^="premium-discount-"]');
    pricingInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                calculateLivePricing();
                calculateAffiliateExamples(); // Also update affiliate calculations when prices change
            });
        }
    });

    // Add input listeners for affiliate calculations
    const affiliateInputs = document.querySelectorAll('[id^="direct-"][id$="-commission"], [id^="indirect-"][id$="-commission"]');
    affiliateInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', calculateAffiliateExamples);
        }
    });

    // Add listener for period selector in affiliate calculator
    const periodSelect = document.getElementById('affiliate-calc-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', calculateAffiliateExamples);
    }

    // Auto-load commission calculator on page load
    // Use setTimeout to ensure all values are loaded first
    setTimeout(() => {
        if (document.getElementById('affiliate-calc-period')) {
            console.log('🔄 Auto-loading commission calculator...');
            calculateAffiliateExamples();
            console.log('✅ Commission calculator loaded automatically');
        }
    }, 300);
});

// Expose loadCampaignPackagesFromDB to window for manual reload
window.loadCampaignPackagesFromDB = loadCampaignPackagesFromDB;

console.log('✅ pricing-features-manager.js loaded successfully');
