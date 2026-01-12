// Verification Fee Manager
// Handles dynamic verification fee management

// API Configuration - use global config set by api-config.js
function getApiBaseUrl() {
    return window.API_BASE_URL || window.ADMIN_API_CONFIG?.API_BASE_URL || 'http://localhost:8000';
}

// Get auth token - check all possible keys used in admin pages
function getAuthToken() {
    return localStorage.getItem('adminToken') ||
           localStorage.getItem('admin_access_token') ||
           localStorage.getItem('access_token') ||
           localStorage.getItem('token');
}

// Verification Fees State
let verificationFees = [];

// Load Verification Fees from API
async function loadVerificationFees() {
    console.log('loadVerificationFees() called');

    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('No auth token found, loading default fees');
            verificationFees = getDefaultVerificationFees();
            renderVerificationFees();
            return;
        }

        const apiUrl = getApiBaseUrl();
        console.log('Fetching verification fees from API...', apiUrl);
        const response = await fetch(`${apiUrl}/api/admin-db/verification-fee`, {
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

        if (data.success && data.fees) {
            verificationFees = data.fees;
            console.log(`Loaded ${verificationFees.length} fees from database`);
            renderVerificationFees();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading verification fees from API:', error);
        // Fallback to default fees
        verificationFees = getDefaultVerificationFees();
        renderVerificationFees();
    }
}

// Get Default Fees
function getDefaultVerificationFees() {
    return [
        {
            id: 1,
            type: 'individual',
            display_name: 'Individual Verification',
            price: 99,
            currency: 'ETB',
            features: ['Profile verification badge', 'Identity verification', 'Priority support']
        },
        {
            id: 2,
            type: 'organization',
            display_name: 'Organization Verification',
            price: 499,
            currency: 'ETB',
            features: ['Organization verification badge', 'Identity verification', 'Multiple user verification', 'Featured listing', 'Priority support']
        }
    ];
}

// Render Verification Fees
function renderVerificationFees() {
    console.log('renderVerificationFees() called with', verificationFees.length, 'fees');

    const grid = document.getElementById('verification-fees-grid');
    if (!grid) {
        console.error('verification-fees-grid element NOT FOUND in DOM');
        return;
    }

    console.log('verification-fees-grid element found');

    if (verificationFees.length === 0) {
        console.log('No fees to render, showing empty state');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-certificate text-4xl mb-4"></i>
                <p class="text-lg font-semibold">No verification fees yet</p>
                <p class="text-sm">Click "Add Fee Type" to create your first verification fee</p>
            </div>
        `;
        return;
    }

    console.log('Rendering', verificationFees.length, 'fee cards...');

    const colors = [
        { border: 'indigo-300', bg: 'indigo-50', text: 'indigo-700', icon: 'indigo-600' },
        { border: 'emerald-300', bg: 'emerald-50', text: 'emerald-700', icon: 'emerald-600' },
        { border: 'amber-300', bg: 'amber-50', text: 'amber-700', icon: 'amber-600' },
        { border: 'rose-300', bg: 'rose-50', text: 'rose-700', icon: 'rose-600' },
        { border: 'cyan-300', bg: 'cyan-50', text: 'cyan-700', icon: 'cyan-600' }
    ];

    // Icon mapping based on fee type
    const typeIcons = {
        'individual': 'fa-user-check',
        'organization': 'fa-building',
        'enterprise': 'fa-city',
        'basic': 'fa-check-circle',
        'premium': 'fa-star'
    };

    grid.innerHTML = verificationFees.map((fee, index) => {
        const color = colors[index % colors.length];
        const price = parseFloat(fee.price) || 0;
        const displayName = fee.display_name || formatTypeName(fee.type);
        const icon = typeIcons[fee.type.toLowerCase()] || 'fa-certificate';

        // Features list (show max 4)
        const features = fee.features || [];
        const displayFeatures = features.slice(0, 4);
        const moreFeatures = features.length > 4 ? `<div class="text-xs text-gray-500 mt-1">+${features.length - 4} more features</div>` : '';

        return `
            <div class="border-2 border-${color.border} rounded-xl p-5 bg-${color.bg} hover:shadow-xl transition-all relative cursor-pointer group"
                onclick="editVerificationFee('${fee.type}')" title="Click to edit">

                <button onclick="event.stopPropagation(); deleteVerificationFee('${fee.type}')"
                    class="absolute top-2 left-2 w-7 h-7 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete fee">
                    <i class="fas fa-times"></i>
                </button>

                <div class="text-center mb-4">
                    <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                        <i class="fas ${icon} text-2xl text-${color.icon}"></i>
                    </div>
                    <h4 class="text-lg font-bold text-${color.text}">${displayName}</h4>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">${fee.type}</p>
                </div>

                <div class="text-center mb-4 py-3 bg-white/50 rounded-lg">
                    <div class="text-3xl font-bold text-${color.text}">${price.toLocaleString()} ETB</div>
                    <div class="text-sm text-gray-600">One-time fee</div>
                </div>

                <!-- Features -->
                <div class="text-xs space-y-1.5 text-gray-700 border-t pt-3">
                    ${displayFeatures.map(feature => `
                        <div class="flex items-center gap-2">
                            <i class="fas fa-check text-green-600"></i>
                            <span>${feature}</span>
                        </div>
                    `).join('')}
                    ${moreFeatures}
                </div>
            </div>
        `;
    }).join('');

    console.log(`Successfully rendered ${verificationFees.length} fee cards to DOM`);
}

// Format type name for display
function formatTypeName(type) {
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Open Modal for Adding Fee
function openAddVerificationFeeModal() {
    const modal = document.getElementById('verification-fee-modal');
    if (!modal) {
        console.error('Verification fee modal not found');
        return;
    }

    document.getElementById('verification-modal-title').innerHTML =
        '<i class="fas fa-certificate mr-2"></i>Add Verification Fee';
    document.getElementById('verification-fee-form').reset();
    document.getElementById('verification-fee-id').value = '';

    // Clear features container and show empty state
    const featuresContainer = document.getElementById('verification-features-container');
    const emptyState = document.getElementById('verification-features-empty-state');
    if (featuresContainer) {
        featuresContainer.innerHTML = '';
    }
    if (emptyState) {
        emptyState.style.display = 'block';
    }

    modal.classList.remove('hidden');
}

// Edit Fee
function editVerificationFee(type) {
    const fee = verificationFees.find(f => f.type === type);
    if (!fee) {
        console.error('Fee not found:', type);
        return;
    }

    document.getElementById('verification-modal-title').innerHTML =
        '<i class="fas fa-certificate mr-2"></i>Edit Verification Fee';
    document.getElementById('verification-fee-id').value = fee.id || '';
    document.getElementById('verification-fee-type').value = fee.type;
    document.getElementById('verification-fee-name').value = fee.display_name || formatTypeName(fee.type);
    document.getElementById('verification-fee-price').value = fee.price;

    // Load features
    const featuresContainer = document.getElementById('verification-features-container');
    const emptyState = document.getElementById('verification-features-empty-state');
    if (featuresContainer) {
        featuresContainer.innerHTML = '';
        if (fee.features && fee.features.length > 0) {
            fee.features.forEach(feature => addVerificationFeeFeature(feature));
            if (emptyState) emptyState.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'block';
        }
    }

    const modal = document.getElementById('verification-fee-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close Modal
function closeVerificationFeeModal() {
    const modal = document.getElementById('verification-fee-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save Fee
async function saveVerificationFee(event) {
    event.preventDefault();

    const id = document.getElementById('verification-fee-id').value;
    const feeType = document.getElementById('verification-fee-type').value.trim().toLowerCase().replace(/\s+/g, '_');
    const displayName = document.getElementById('verification-fee-name').value.trim();
    const price = parseFloat(document.getElementById('verification-fee-price').value);

    // Collect features
    const features = [];
    const featureInputs = document.querySelectorAll('.verification-feature-input');
    featureInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            features.push(value);
        }
    });

    // Validation
    if (!feeType) {
        alert('Please enter a fee type');
        return;
    }
    if (!displayName) {
        alert('Please enter a display name');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('Please enter a valid price');
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const feeData = {
            type: feeType,
            display_name: displayName,
            features: features,
            price: price,
            currency: 'ETB'
        };

        console.log('Saving verification fee:', feeData);

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin-db/verification-fee`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feeData)
        });

        if (!response.ok) {
            throw new Error('Failed to save fee');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save fee');
        }

        // Reload fees from database
        await loadVerificationFees();
        closeVerificationFeeModal();

        alert('Verification fee saved successfully!');

    } catch (error) {
        console.error('Error saving verification fee:', error);
        alert('Failed to save verification fee. Please try again.');
    }
}

// Delete Fee
async function deleteVerificationFee(type) {
    const fee = verificationFees.find(f => f.type === type);
    if (!fee) return;

    const displayName = fee.display_name || formatTypeName(fee.type);
    if (!confirm(`Are you sure you want to delete "${displayName}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin-db/verification-fee/${type}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete fee');
        }

        // Reload fees from database
        await loadVerificationFees();
        alert('Verification fee deleted successfully!');

    } catch (error) {
        console.error('Error deleting verification fee:', error);
        alert('Failed to delete verification fee. Please try again.');
    }
}

// ============================================
// FEE FEATURES MANAGEMENT FUNCTIONS
// ============================================

// Add Fee Feature
function addVerificationFeeFeature(value = '') {
    const featuresContainer = document.getElementById('verification-features-container');
    const emptyState = document.getElementById('verification-features-empty-state');

    if (!featuresContainer) {
        console.error('Verification features container not found');
        return;
    }

    // Hide empty state when adding first item
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    const featureId = 'ver-feature-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const featureItem = document.createElement('div');
    featureItem.className = 'flex items-center gap-2';
    featureItem.id = featureId;

    featureItem.innerHTML = `
        <div class="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <i class="fas fa-check-circle text-indigo-600"></i>
            <input type="text" class="verification-feature-input flex-1 bg-transparent border-0 focus:outline-none text-sm"
                placeholder="e.g., Profile badge, Priority support" value="${value}">
        </div>
        <button type="button" onclick="removeVerificationFeeFeature('${featureId}')"
            class="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm"
            title="Remove this feature">
            <i class="fas fa-times"></i>
        </button>
    `;

    featuresContainer.appendChild(featureItem);

    // Auto-focus on the new input
    const newInput = featureItem.querySelector('.verification-feature-input');
    if (newInput && !value) {
        newInput.focus();
    }
}

// Remove Fee Feature
function removeVerificationFeeFeature(featureId) {
    const featureItem = document.getElementById(featureId);
    if (featureItem) {
        featureItem.remove();
    }

    // Show empty state if no features remain
    const featuresContainer = document.getElementById('verification-features-container');
    const emptyState = document.getElementById('verification-features-empty-state');
    if (featuresContainer && featuresContainer.children.length === 0 && emptyState) {
        emptyState.style.display = 'block';
    }
}

// Export functions to window for HTML onclick handlers
window.openAddVerificationFeeModal = openAddVerificationFeeModal;
window.editVerificationFee = editVerificationFee;
window.closeVerificationFeeModal = closeVerificationFeeModal;
window.saveVerificationFee = saveVerificationFee;
window.deleteVerificationFee = deleteVerificationFee;
window.loadVerificationFees = loadVerificationFees;
window.addVerificationFeeFeature = addVerificationFeeFeature;
window.removeVerificationFeeFeature = removeVerificationFeeFeature;

// ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('verification-fee-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeVerificationFeeModal();
        }
    }
});

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Verification Fee Manager initialized');

    // Check if grid exists
    const grid = document.getElementById('verification-fees-grid');
    if (grid) {
        console.log('verification-fees-grid found, loading fees...');
        loadVerificationFees();
    } else {
        console.log('verification-fees-grid NOT FOUND on page load');
        // Try again after a delay (panel might not be rendered yet)
        setTimeout(() => {
            const gridDelayed = document.getElementById('verification-fees-grid');
            if (gridDelayed) {
                console.log('verification-fees-grid found after delay, loading fees...');
                loadVerificationFees();
            }
        }, 500);
    }
});

// Also load when pricing panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        console.log('Pricing panel activated, loading verification fees...');
        setTimeout(() => loadVerificationFees(), 100);
    }
});
