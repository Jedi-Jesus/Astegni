// Campaign Pricing Manager
// Handles dynamic campaign package management

// API Configuration (check if already defined globally)
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://api.astegni.com';
}
// Use window.API_BASE_URL directly throughout this file

// Campaign Packages State
let campaignPackages = [];
let basePackageId = null;

// Load Campaign Packages from API
async function loadCampaignPackages() {
    console.log('loadCampaignPackages() called');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠ No auth token found, loading from localStorage as fallback');
            loadCampaignPackagesFromLocalStorage();
            return;
        }

        console.log('Fetching packages from API...');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/campaign-packages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('API Response status:', response.status);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);

        if (data.success && data.packages) {
            campaignPackages = data.packages;
            console.log(`✓ Loaded ${campaignPackages.length} packages from database`);

            // Find base package
            const base = campaignPackages.find(p => p.is_base);
            basePackageId = base ? base.id : null;
            console.log('Base package ID:', basePackageId);

            renderCampaignPackages();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('✗ Error loading campaign packages from API:', error);
        // Fallback to localStorage
        loadCampaignPackagesFromLocalStorage();
    }
}

// Fallback: Load from localStorage
function loadCampaignPackagesFromLocalStorage() {
    const saved = localStorage.getItem('campaign_packages');
    if (saved) {
        try {
            campaignPackages = JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing campaign packages:', e);
            campaignPackages = getDefaultPackages();
        }
    } else {
        campaignPackages = getDefaultPackages();
    }

    // Find base package
    const base = campaignPackages.find(p => p.is_base);
    basePackageId = base ? base.id : null;

    renderCampaignPackages();
}

// Get Default Packages
function getDefaultPackages() {
    const defaultFeatures = ['Unlimited impressions', 'Custom targeting', 'Priority placement', 'Full analytics suite'];
    return [
        { id: 1, name: 'Up to 3 Days', days: 3, price: 2000, description: 'Short-term campaigns', is_base: true, features: [...defaultFeatures] },
        { id: 2, name: 'Up to 7 Days', days: 7, price: 1800, description: '1 week campaigns', is_base: false, features: [...defaultFeatures] },
        { id: 3, name: 'Up to Half a Month', days: 15, price: 1500, description: '~15 days campaigns', is_base: false, features: [...defaultFeatures] },
        { id: 4, name: 'Up to 1 Month', days: 30, price: 1200, description: '30 days campaigns', is_base: false, features: [...defaultFeatures] },
        { id: 5, name: 'Up to 3 Months', days: 90, price: 1000, description: 'Quarterly campaigns', is_base: false, features: [...defaultFeatures] },
        { id: 6, name: 'Up to 6 Months', days: 180, price: 800, description: 'Half-year campaigns', is_base: false, features: [...defaultFeatures] },
        { id: 7, name: 'Up to 9 Months', days: 270, price: 600, description: 'Extended campaigns', is_base: false, features: [...defaultFeatures] },
        { id: 8, name: 'Up to 1 Year', days: 365, price: 400, description: 'Annual campaigns', is_base: false, features: [...defaultFeatures] }
    ];
}

// Render Campaign Packages
function renderCampaignPackages() {
    console.log('renderCampaignPackages() called with', campaignPackages.length, 'packages');

    const grid = document.getElementById('campaign-packages-grid');
    if (!grid) {
        console.error('✗ campaign-packages-grid element NOT FOUND in DOM');
        return;
    }

    console.log('✓ campaign-packages-grid element found');

    if (campaignPackages.length === 0) {
        console.log('No packages to render, showing empty state');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-box-open text-4xl mb-4"></i>
                <p class="text-lg font-semibold">No campaign packages yet</p>
                <p class="text-sm">Click "Add Package" to create your first package</p>
            </div>
        `;
        return;
    }

    console.log('Rendering', campaignPackages.length, 'package cards...');

    const basePrice = basePackageId ? campaignPackages.find(p => p.id === basePackageId)?.price : null;

    grid.innerHTML = campaignPackages.map((pkg, index) => {
        const colors = [
            { border: 'orange-200', bg: 'orange-50', text: 'orange-700' },
            { border: 'blue-300', bg: 'blue-50', text: 'blue-700' },
            { border: 'purple-200', bg: 'purple-50', text: 'purple-700' },
            { border: 'green-200', bg: 'green-50', text: 'green-700' },
            { border: 'teal-200', bg: 'teal-50', text: 'teal-700' },
            { border: 'cyan-200', bg: 'cyan-50', text: 'cyan-700' },
            { border: 'pink-200', bg: 'pink-50', text: 'pink-700' },
            { border: 'yellow-200', bg: 'yellow-50', text: 'yellow-700' }
        ];
        const color = colors[index % colors.length];

        // Calculate discount
        let discountHTML = '';
        if (basePrice && !pkg.is_base && pkg.price < basePrice) {
            const discount = Math.round(((basePrice - pkg.price) / basePrice) * 100);
            discountHTML = `
                <div class="absolute top-2 right-2 z-10">
                    <span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                        ${discount}% OFF
                    </span>
                </div>
            `;
        }

        // Base badge
        const baseBadge = pkg.is_base ? `
            <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <span class="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">Base Price</span>
            </div>
        ` : '';

        return `
            <div class="border-2 border-${color.border} rounded-lg p-4 bg-${color.bg} hover:shadow-lg transition-all relative cursor-pointer group"
                onclick="editCampaignPackage(${pkg.id})" title="Click to edit">
                ${baseBadge}
                ${discountHTML}
                <button onclick="event.stopPropagation(); deleteCampaignPackage(${pkg.id})"
                    class="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete package">
                    <i class="fas fa-times"></i>
                </button>

                <div class="mb-3 ${pkg.is_base ? 'mt-2' : ''}">
                    <h4 class="font-bold text-${color.text} mb-1">${pkg.name}</h4>
                    ${pkg.description ? `<p class="text-xs text-gray-600">${pkg.description}</p>` : ''}
                </div>

                <div class="mb-4">
                    <div class="text-2xl font-bold text-${color.text}">${pkg.price.toLocaleString()} ETB</div>
                    <div class="text-xs text-gray-600">per day</div>
                </div>

                <div class="text-xs space-y-1 text-gray-700">
                    <div class="flex items-center gap-1">
                        <i class="fas fa-calendar text-green-600"></i>
                        <span>Up to ${pkg.days} days</span>
                    </div>
                    ${pkg.features && pkg.features.length > 0 ? pkg.features.map(feature => `
                        <div class="flex items-center gap-1">
                            <i class="fas fa-check text-green-600"></i>
                            <span>${feature}</span>
                        </div>
                    `).join('') : ''}
                </div>
            </div>
        `;
    }).join('');

    console.log(`✓ Successfully rendered ${campaignPackages.length} package cards to DOM`);
}

// Open Modal for Adding Package
function openAddCampaignPackageModal() {
    const modal = document.getElementById('campaign-package-modal');
    if (!modal) {
        console.error('Campaign package modal not found');
        return;
    }

    document.getElementById('campaign-modal-title').innerHTML =
        '<i class="fas fa-bullhorn mr-2"></i>Add Campaign Package';
    document.getElementById('campaign-package-form').reset();
    document.getElementById('campaign-package-id').value = '';

    // Clear includes container and show empty state
    const includesContainer = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');
    if (includesContainer) {
        includesContainer.innerHTML = '';
    }
    if (emptyState) {
        emptyState.style.display = 'block';
    }

    modal.classList.remove('hidden');
}

// Edit Package
function editCampaignPackage(id) {
    const pkg = campaignPackages.find(p => p.id === id);
    if (!pkg) {
        console.error('Package not found:', id);
        return;
    }

    document.getElementById('campaign-modal-title').innerHTML =
        '<i class="fas fa-bullhorn mr-2"></i>Edit Campaign Package';
    document.getElementById('campaign-package-id').value = pkg.id;
    document.getElementById('campaign-package-name').value = pkg.name;
    document.getElementById('campaign-package-days').value = pkg.days;
    document.getElementById('campaign-package-price').value = pkg.price;
    document.getElementById('campaign-is-base').checked = pkg.is_base || false;
    document.getElementById('campaign-package-description').value = pkg.description || '';

    // Set package label if available
    if (typeof setPackageLabel === 'function' && pkg.label) {
        setPackageLabel(pkg.label);
    }

    // Load includes
    const includesContainer = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');
    if (includesContainer) {
        includesContainer.innerHTML = '';
        if (pkg.features && pkg.features.length > 0) {
            pkg.features.forEach(feature => addPackageInclude(feature));
            if (emptyState) emptyState.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'block';
        }
    }

    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close Modal
function closeCampaignPackageModal() {
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save Package
async function saveCampaignPackage(event) {
    event.preventDefault();

    const id = document.getElementById('campaign-package-id').value;
    const name = document.getElementById('campaign-package-name').value.trim();
    const days = parseInt(document.getElementById('campaign-package-days').value);
    const price = parseFloat(document.getElementById('campaign-package-price').value);
    const is_base = document.getElementById('campaign-is-base').checked;
    const description = document.getElementById('campaign-package-description').value.trim();

    // Collect features/includes
    const features = [];
    const includeInputs = document.querySelectorAll('.package-include-input');
    includeInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            features.push(value);
        }
    });

    // Get label from system-settings-enhancements.js if available
    const label = typeof getSelectedPackageLabel === 'function'
        ? getSelectedPackageLabel()
        : 'none';

    // Validation
    if (!name) {
        alert('Please enter a package name');
        return;
    }
    if (isNaN(days) || days < 1) {
        alert('Please enter a valid number of days (minimum 1)');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('Please enter a valid price');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const packageData = {
            name,
            days,
            price,
            description,
            is_base,
            features,
            label
        };

        let response;
        if (id) {
            // Update existing package
            response = await fetch(`${window.API_BASE_URL}/api/admin/campaign-packages/${id}`, {
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

        // Reload packages from database
        await loadCampaignPackages();
        closeCampaignPackageModal();

        alert('Campaign package saved successfully!');

    } catch (error) {
        console.error('Error saving campaign package:', error);
        alert('Failed to save campaign package. Please try again.');
    }
}

// Delete Package
async function deleteCampaignPackage(id) {
    const pkg = campaignPackages.find(p => p.id === id);
    if (!pkg) return;

    if (!confirm(`Are you sure you want to delete "${pkg.name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/campaign-packages/${id}`, {
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

        // Reload packages from database
        await loadCampaignPackages();
        alert('Package deleted successfully!');

    } catch (error) {
        console.error('Error deleting campaign package:', error);
        alert('Failed to delete campaign package. Please try again.');
    }
}

// ============================================
// PACKAGE INCLUDES MANAGEMENT FUNCTIONS
// ============================================

// Add Package Include (called when "Add Feature" button is clicked or when loading existing includes)
function addPackageInclude(value = '') {
    const includesContainer = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');

    if (!includesContainer) {
        console.error('Package includes container not found');
        return;
    }

    // Hide empty state when adding first item
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    const includeId = 'include-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const includeItem = document.createElement('div');
    includeItem.className = 'flex items-center gap-2';
    includeItem.id = includeId;

    includeItem.innerHTML = `
        <div class="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <i class="fas fa-check-circle text-green-600"></i>
            <input type="text" class="package-include-input flex-1 bg-transparent border-0 focus:outline-none text-sm"
                placeholder="e.g., Unlimited impressions, Priority placement" value="${value}">
        </div>
        <button type="button" onclick="removePackageInclude('${includeId}')"
            class="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm"
            title="Remove this feature">
            <i class="fas fa-times"></i>
        </button>
    `;

    includesContainer.appendChild(includeItem);

    // Auto-focus on the new input
    const newInput = includeItem.querySelector('.package-include-input');
    if (newInput && !value) {
        newInput.focus();
    }
}

// Remove Package Include
function removePackageInclude(includeId) {
    const includeItem = document.getElementById(includeId);
    if (includeItem) {
        includeItem.remove();
    }

    // Show empty state if no includes remain
    const includesContainer = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');
    if (includesContainer && includesContainer.children.length === 0 && emptyState) {
        emptyState.style.display = 'block';
    }
}

// Export functions to window for HTML onclick handlers
window.openAddCampaignPackageModal = openAddCampaignPackageModal;
window.editCampaignPackage = editCampaignPackage;
window.closeCampaignPackageModal = closeCampaignPackageModal;
window.saveCampaignPackage = saveCampaignPackage;
window.deleteCampaignPackage = deleteCampaignPackage;
window.loadCampaignPackages = loadCampaignPackages;
window.addPackageInclude = addPackageInclude;
window.removePackageInclude = removePackageInclude;

// ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('campaign-package-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeCampaignPackageModal();
        }
    }
});

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Campaign Pricing Manager initialized');

    // Check if grid exists
    const grid = document.getElementById('campaign-packages-grid');
    if (grid) {
        console.log('✓ campaign-packages-grid found, loading packages...');
        loadCampaignPackages();
    } else {
        console.error('✗ campaign-packages-grid NOT FOUND on page load!');
        // Try again after a delay (panel might not be rendered yet)
        setTimeout(() => {
            const gridDelayed = document.getElementById('campaign-packages-grid');
            if (gridDelayed) {
                console.log('✓ campaign-packages-grid found after delay, loading packages...');
                loadCampaignPackages();
            } else {
                console.error('✗ campaign-packages-grid still not found after delay');
            }
        }, 500);
    }
});

// Also load when pricing panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        console.log('Pricing panel activated, loading campaign packages...');
        setTimeout(() => loadCampaignPackages(), 100);
    }
});
