// ============================================
// PRICING & FEATURES MANAGEMENT
// Handles brand packages, subscription pricing, and affiliate settings
// ============================================

// ============================================
// BRAND PACKAGE MANAGEMENT
// ============================================

// Global array to track brand packages
let brandPackages = [];
let packageCounter = 0;

// Store the base package info for discount calculations
let brandBasePackage = null;

// Period definitions for pricing calculations
const PRICING_PERIODS = {
    daily: { days: 1, label: 'Daily' },
    monthly: { days: 30, label: 'Monthly' },
    quarterly: { days: 90, label: '3 Months' },
    biannual: { days: 180, label: '6 Months' },
    yearly: { days: 365, label: 'Yearly' }
};

// Find the base package from loaded packages
function findBrandBasePackage() {
    // Look for package marked as base, or the first package (usually Monthly)
    const basePackage = brandPackages.find(p => p.isBase === true);
    if (basePackage) {
        return basePackage;
    }
    // Fallback: find package with "monthly" in name (case-insensitive)
    const monthlyPackage = brandPackages.find(p =>
        p.name && p.name.toLowerCase().includes('monthly')
    );
    if (monthlyPackage) {
        return monthlyPackage;
    }
    // Last fallback: return first package if any
    return brandPackages.length > 0 ? brandPackages[0] : null;
}

// Toggle base package checkbox handler
function toggleBrandBasePackage() {
    const isBase = document.getElementById('campaign-is-base-package')?.checked || false;
    const discountSection = document.getElementById('brand-discount-preview-section');
    const baseNotice = document.getElementById('brand-is-base-notice');

    if (isBase) {
        // This is the base package - hide discount calculator, show base notice
        if (discountSection) discountSection.classList.add('hidden');
        if (baseNotice) baseNotice.classList.remove('hidden');
    } else {
        // Not base package - show discount calculator, hide base notice
        if (discountSection) discountSection.classList.remove('hidden');
        if (baseNotice) baseNotice.classList.add('hidden');
    }

    // Recalculate preview
    calculateBrandPackagePreview();
}

// Calculate Brand Package Preview with cross-package discount
function calculateBrandPackagePreview() {
    const dailyPrice = parseFloat(document.getElementById('campaign-package-daily-price')?.value) || 0;
    const isBase = document.getElementById('campaign-is-base-package')?.checked || false;

    // Calculate monthly total
    const monthlyTotal = dailyPrice * 30;

    // Update preview elements
    const formatPrice = (price) => dailyPrice > 0 ? `${Math.round(price).toLocaleString()} ETB` : '-- ETB';

    // Daily price display
    const dailyPriceEl = document.getElementById('brand-preview-daily-price');
    if (dailyPriceEl) dailyPriceEl.textContent = formatPrice(dailyPrice);

    // Monthly total display
    const monthlyPriceEl = document.getElementById('brand-preview-monthly-price');
    if (monthlyPriceEl) monthlyPriceEl.textContent = formatPrice(monthlyTotal);

    // Update this package rate display
    const thisRateEl = document.getElementById('brand-this-rate-display');
    if (thisRateEl) thisRateEl.textContent = dailyPrice > 0 ? `${dailyPrice.toLocaleString()} ETB/day` : '-- ETB/day';

    // Calculate discount compared to base package
    if (!isBase && brandBasePackage && brandBasePackage.dailyPrice > 0) {
        const baseRate = brandBasePackage.dailyPrice;
        const discount = ((baseRate - dailyPrice) / baseRate) * 100;

        // Update base rate display
        const baseRateEl = document.getElementById('brand-base-rate-display');
        if (baseRateEl) baseRateEl.textContent = `${baseRate.toLocaleString()} ETB/day`;

        // Update calculated discount
        const discountEl = document.getElementById('brand-calculated-discount');
        if (discountEl) {
            if (dailyPrice > 0 && discount >= 0) {
                discountEl.textContent = `${discount.toFixed(1)}%`;
                discountEl.className = 'text-2xl font-bold ' + (discount > 0 ? 'text-green-600' : 'text-gray-500');
            } else if (discount < 0) {
                // This package is MORE expensive than base
                discountEl.textContent = `+${Math.abs(discount).toFixed(1)}%`;
                discountEl.className = 'text-2xl font-bold text-red-600';
            } else {
                discountEl.textContent = '--%';
                discountEl.className = 'text-2xl font-bold text-gray-400';
            }
        }
    } else if (isBase) {
        // This is the base package
        const baseRateEl = document.getElementById('brand-base-rate-display');
        if (baseRateEl) baseRateEl.textContent = dailyPrice > 0 ? `${dailyPrice.toLocaleString()} ETB/day` : '-- ETB/day';

        const discountEl = document.getElementById('brand-calculated-discount');
        if (discountEl) {
            discountEl.textContent = '0%';
            discountEl.className = 'text-2xl font-bold text-gray-500';
        }
    } else {
        // No base package set
        const baseRateEl = document.getElementById('brand-base-rate-display');
        if (baseRateEl) baseRateEl.textContent = 'No base set';

        const discountEl = document.getElementById('brand-calculated-discount');
        if (discountEl) {
            discountEl.textContent = '--%';
            discountEl.className = 'text-2xl font-bold text-gray-400';
        }
    }

    return {
        dailyPrice,
        monthlyTotal,
        isBase,
        calculatedDiscount: !isBase && brandBasePackage ?
            ((brandBasePackage.dailyPrice - dailyPrice) / brandBasePackage.dailyPrice) * 100 : 0
    };
}

// Backward compatibility - keep old function name
function calculatePeriodPrices() {
    return calculateBrandPackagePreview();
}

// Load Brand Packages from Database
async function loadBrandPackages() {
    console.log('📦 Loading brand packages from database...');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠ No auth token found');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/brand-packages`, {
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
            // Note: API returns single 'discount' field (not discount_3_months, discount_6_months, discount_yearly)
            brandPackages = data.packages.map(pkg => ({
                id: pkg.id || pkg.package_id,
                name: pkg.name || pkg.package_name || pkg.package_title,
                dailyPrice: pkg.daily_price || pkg.price_per_day || pkg.package_price || 0,
                durationDays: pkg.duration_days || 30,
                isBase: pkg.is_base_package || pkg.is_base || pkg.isBase || false,
                calculatedDiscount: pkg.discount || pkg.calculated_discount || pkg.calculatedDiscount || 0,
                label: pkg.label || 'none',
                currency: pkg.currency || 'ETB',
                includes: Array.isArray(pkg.features) ? pkg.features : (pkg.includes || [])
            }));

            // Find and store the base package
            brandBasePackage = findBrandBasePackage();
            console.log(`✅ Loaded ${brandPackages.length} packages from database`);
            console.log(`📍 Base package: ${brandBasePackage ? brandBasePackage.name : 'None'}`);
            renderBrandPackages();
        } else {
            console.warn('⚠ No packages found or invalid response format');
            brandPackages = [];
            renderBrandPackages();
        }
    } catch (error) {
        console.error('❌ Error loading brand packages from database:', error);
        brandPackages = [];
        renderBrandPackages();
    }
}

// Open Add Brand Package Modal
function openAddBrandPackageModal() {
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        // Reset form
        document.getElementById('campaign-package-form').reset();
        document.getElementById('campaign-package-id').value = '';
        document.getElementById('campaign-modal-title').innerHTML = '<i class="fas fa-bullhorn mr-2"></i>Add Brand Package';

        // Reset daily price
        const dailyPriceEl = document.getElementById('campaign-package-daily-price');
        if (dailyPriceEl) dailyPriceEl.value = '';

        // Reset duration days to default 30
        const durationDaysEl = document.getElementById('campaign-package-duration-days');
        if (durationDaysEl) durationDaysEl.value = '30';

        // Reset base package checkbox
        const isBaseCheckbox = document.getElementById('campaign-is-base-package');
        if (isBaseCheckbox) isBaseCheckbox.checked = false;

        // Show/hide discount section based on whether there's a base package
        const discountSection = document.getElementById('brand-discount-preview-section');
        const baseNotice = document.getElementById('brand-is-base-notice');
        const currentBaseInfo = document.getElementById('brand-current-base-info');

        if (discountSection) discountSection.classList.remove('hidden');
        if (baseNotice) baseNotice.classList.add('hidden');

        // Show current base package info if one exists
        if (brandBasePackage && currentBaseInfo) {
            currentBaseInfo.classList.remove('hidden');
            const baseNameEl = document.getElementById('brand-current-base-name');
            const basePriceEl = document.getElementById('brand-current-base-price');
            if (baseNameEl) baseNameEl.textContent = brandBasePackage.name;
            if (basePriceEl) basePriceEl.textContent = brandBasePackage.dailyPrice.toLocaleString();
        } else if (currentBaseInfo) {
            currentBaseInfo.classList.add('hidden');
        }

        // Reset calculated prices display (preview panel)
        calculateBrandPackagePreview();

        // Clear package includes
        document.getElementById('package-includes-container').innerHTML = '';
        document.getElementById('includes-empty-state').style.display = 'block';

        modal.classList.remove('hidden');
    }
}

// Close Brand Package Modal
function closeBrandPackageModal() {
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

// Save Brand Package
async function saveBrandPackage(event) {
    event.preventDefault();

    // Get form values
    const packageId = document.getElementById('campaign-package-id').value;
    const name = document.getElementById('campaign-package-name').value.trim();
    const dailyPrice = parseFloat(document.getElementById('campaign-package-daily-price').value);
    const durationDays = parseInt(document.getElementById('campaign-package-duration-days')?.value) || 30;

    // Get base package flag
    const isBase = document.getElementById('campaign-is-base-package')?.checked || false;

    // Calculate discount based on base package (if not base)
    let calculatedDiscount = 0;
    if (!isBase && brandBasePackage && brandBasePackage.dailyPrice > 0) {
        calculatedDiscount = ((brandBasePackage.dailyPrice - dailyPrice) / brandBasePackage.dailyPrice) * 100;
        calculatedDiscount = Math.max(0, calculatedDiscount); // Don't allow negative discounts
    }

    // Get selected label
    const selectedLabel = document.querySelector('input[name="campaign-package-label"]:checked');
    const label = selectedLabel ? selectedLabel.value : 'none';

    // Get package includes
    const includeInputs = document.querySelectorAll('#package-includes-container [data-feature-input]');
    const includes = Array.from(includeInputs)
        .map(input => input.value.trim())
        .filter(val => val.length > 0);

    // Validate
    if (!name || dailyPrice === null || isNaN(dailyPrice) || dailyPrice <= 0) {
        alert('Please fill in package name and daily price');
        return;
    }

    // Create package object for API with standardized schema
    // Uses single 'discount' field (discount_3_months, discount_6_months, discount_yearly were removed)
    const packageData = {
        package_title: name,
        package_price: dailyPrice,
        duration_days: durationDays,
        is_base_package: isBase,
        label,
        features: includes,
        // Single discount field - auto-calculated from base package
        discount: calculatedDiscount
    };

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        let response;
        if (packageId) {
            // Update existing package
            response = await fetch(`${window.API_BASE_URL}/api/admin/brand-packages/${packageId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            });
        } else {
            // Create new package
            response = await fetch(`${window.API_BASE_URL}/api/admin/brand-packages`, {
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

        console.log('✅ Brand package saved to database:', result);

        // Reload packages from database
        await loadBrandPackages();

        // Close modal
        closeBrandPackageModal();

        alert('Brand package saved successfully!');

    } catch (error) {
        console.error('❌ Error saving brand package:', error);
        alert('Failed to save brand package. Please try again.');
    }
}

// Render Brand Packages
function renderBrandPackages() {
    const grid = document.getElementById('brand-packages-grid');
    if (!grid) return;

    if (brandPackages.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <i class="fas fa-box-open text-5xl mb-4"></i>
                <p class="text-lg">No brand packages yet</p>
                <p class="text-sm">Click "Add Package" to create your first package</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = brandPackages.map(pkg => {
        const dailyPrice = pkg.dailyPrice || 0;
        const monthlyTotal = dailyPrice * 30;

        // Calculate discount vs base package
        let discountBadge = '';
        if (pkg.isBase) {
            discountBadge = '<span class="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">BASE</span>';
        } else if (brandBasePackage && brandBasePackage.dailyPrice > 0) {
            const discount = ((brandBasePackage.dailyPrice - dailyPrice) / brandBasePackage.dailyPrice) * 100;
            if (discount > 0) {
                discountBadge = `<span class="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">${discount.toFixed(0)}% OFF</span>`;
            } else if (discount < 0) {
                discountBadge = `<span class="px-2 py-0.5 bg-red-400 text-white text-xs font-bold rounded">+${Math.abs(discount).toFixed(0)}%</span>`;
            }
        }

        // Popular label badge
        let popularBadge = '';
        if (pkg.label === 'popular') {
            popularBadge = '<span class="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">POPULAR</span>';
        } else if (pkg.label === 'most-popular') {
            popularBadge = '<span class="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded">MOST POPULAR</span>';
        }

        // Includes list
        const includesList = pkg.includes && pkg.includes.length > 0
            ? pkg.includes.map(inc => `
                <div class="flex items-start gap-2 text-xs">
                    <i class="fas fa-check text-green-500 mt-0.5"></i>
                    <span>${inc}</span>
                </div>
            `).join('')
            : '<p class="text-xs text-gray-400 italic">No features listed</p>';

        // Format price with commas
        const formatPrice = (price) => price.toLocaleString();

        return `
            <div class="brand-package-card border-2 rounded-lg p-4 hover:shadow-lg transition-all cursor-move relative ${pkg.isBase ? 'border-orange-400 bg-orange-50/30' : ''}"
                draggable="true"
                data-package-id="${pkg.id}"
                ondragstart="window.handleDragStart(event)"
                ondragend="window.handleDragEnd(event)"
                ondragover="window.handleDragOver(event)"
                ondrop="window.handleDrop(event)">

                <!-- Badges (Top Right) -->
                <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    ${discountBadge}
                    ${popularBadge}
                </div>

                <div class="mb-3">
                    <h4 class="text-lg font-bold mb-1">${pkg.name}</h4>
                    ${pkg.description ? `<p class="text-xs text-gray-600">${pkg.description}</p>` : ''}
                </div>

                <!-- Daily Price (Main) -->
                <div class="mb-3 p-3 ${pkg.isBase ? 'bg-orange-100 border-orange-300' : 'bg-orange-50 border-orange-200'} rounded-lg border">
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-orange-600">${formatPrice(dailyPrice)}</span>
                        <span class="text-sm text-gray-600">ETB/day</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        Monthly: ${formatPrice(monthlyTotal)} ETB
                    </div>
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
                    <button onclick="event.stopPropagation(); window.editBrandPackage(${pkg.id})"
                        class="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="event.stopPropagation(); window.deleteBrandPackage(${pkg.id})"
                        class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Edit Brand Package
function editBrandPackage(packageId) {
    // Convert to number for comparison (in case it comes as string from HTML)
    const pkgId = typeof packageId === 'string' ? parseInt(packageId) : packageId;
    const pkg = brandPackages.find(p => p.id == pkgId); // Use loose equality to handle type mismatches
    if (!pkg) {
        console.error('Package not found with ID:', packageId);
        return;
    }

    // Populate form
    document.getElementById('campaign-package-id').value = pkg.id;
    document.getElementById('campaign-package-name').value = pkg.name;

    // Set daily price
    const dailyPriceEl = document.getElementById('campaign-package-daily-price');
    if (dailyPriceEl) dailyPriceEl.value = pkg.dailyPrice || '';

    // Set duration days
    const durationDaysEl = document.getElementById('campaign-package-duration-days');
    if (durationDaysEl) durationDaysEl.value = pkg.durationDays || 30;

    // Set base package checkbox
    const isBaseCheckbox = document.getElementById('campaign-is-base-package');
    if (isBaseCheckbox) isBaseCheckbox.checked = pkg.isBase || false;

    // Show/hide discount section based on whether this is base package
    const discountSection = document.getElementById('brand-discount-preview-section');
    const baseNotice = document.getElementById('brand-is-base-notice');
    const currentBaseInfo = document.getElementById('brand-current-base-info');

    if (pkg.isBase) {
        if (discountSection) discountSection.classList.add('hidden');
        if (baseNotice) baseNotice.classList.remove('hidden');
        if (currentBaseInfo) currentBaseInfo.classList.add('hidden');
    } else {
        if (discountSection) discountSection.classList.remove('hidden');
        if (baseNotice) baseNotice.classList.add('hidden');

        // Show current base package info
        if (brandBasePackage && currentBaseInfo) {
            currentBaseInfo.classList.remove('hidden');
            const baseNameEl = document.getElementById('brand-current-base-name');
            const basePriceEl = document.getElementById('brand-current-base-price');
            if (baseNameEl) baseNameEl.textContent = brandBasePackage.name;
            if (basePriceEl) basePriceEl.textContent = brandBasePackage.dailyPrice.toLocaleString();
        } else if (currentBaseInfo) {
            currentBaseInfo.classList.add('hidden');
        }
    }

    // Update calculated prices display (preview panel)
    calculateBrandPackagePreview();

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
    document.getElementById('campaign-modal-title').innerHTML = '<i class="fas fa-bullhorn mr-2"></i>Edit Brand Package';

    // Open modal directly (don't call openAddBrandPackageModal as it resets the title)
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Delete Brand Package
async function deleteBrandPackage(packageId) {
    // Convert to number for comparison (in case it comes as string from HTML)
    const pkgId = typeof packageId === 'string' ? parseInt(packageId) : packageId;
    const pkg = brandPackages.find(p => p.id == pkgId); // Use loose equality to handle type mismatches
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

        const response = await fetch(`${window.API_BASE_URL}/api/admin/brand-packages/${packageId}`, {
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

        console.log('✅ Brand package deleted from database');

        // Reload packages from database
        await loadBrandPackages();

        alert('Package deleted successfully!');

    } catch (error) {
        console.error('❌ Error deleting brand package:', error);
        alert('Failed to delete brand package. Please try again.');
    }
}

// ============================================
// DRAG AND DROP FOR BRAND PACKAGES
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
    document.querySelectorAll('.brand-package-card').forEach(card => {
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
        const draggedIndex = brandPackages.findIndex(p => p.id === draggedId);
        const targetIndex = brandPackages.findIndex(p => p.id === targetId);

        // Swap positions in array
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const temp = brandPackages[draggedIndex];
            brandPackages[draggedIndex] = brandPackages[targetIndex];
            brandPackages[targetIndex] = temp;

            // Re-render
            renderBrandPackages();
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

// Brand Package Functions (new names)
window.loadBrandPackages = loadBrandPackages;
window.openAddBrandPackageModal = openAddBrandPackageModal;
window.closeBrandPackageModal = closeBrandPackageModal;
window.addPackageInclude = addPackageInclude;
window.removePackageInclude = removePackageInclude;
window.saveBrandPackage = saveBrandPackage;
window.editBrandPackage = editBrandPackage;
window.deleteBrandPackage = deleteBrandPackage;
window.renderBrandPackages = renderBrandPackages;
window.calculatePeriodPrices = calculatePeriodPrices;
window.calculateBrandPackagePreview = calculateBrandPackagePreview;
window.toggleBrandBasePackage = toggleBrandBasePackage;
window.findBrandBasePackage = findBrandBasePackage;

// Backward compatibility aliases (old Campaign names -> new Brand functions)
window.loadCampaignPackagesFromDB = loadBrandPackages;
window.openAddBrandPackageModal = openAddBrandPackageModal;
window.closeCampaignPackageModal = closeBrandPackageModal;
window.saveCampaignPackage = saveBrandPackage;
window.editCampaignPackage = editBrandPackage;
window.deleteCampaignPackage = deleteBrandPackage;
window.renderCampaignPackages = renderBrandPackages;

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

    // Load brand packages from database if grid exists
    if (document.getElementById('brand-packages-grid')) {
        loadBrandPackages();
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

console.log('✅ pricing-features-manager.js loaded successfully (Brand Packages)');
