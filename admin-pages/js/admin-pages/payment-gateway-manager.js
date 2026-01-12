// Payment Gateway Manager
// Handles dynamic payment gateway management with modal-based CRUD

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

// State
let paymentGateways = [];

// ============================================
// LOAD FUNCTIONS
// ============================================

async function loadPaymentGateways() {
    console.log('loadPaymentGateways() called');

    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('No auth token found, loading default gateways');
            paymentGateways = getDefaultPaymentGateways();
            renderPaymentGateways();
            return;
        }

        const apiUrl = getApiBaseUrl();
        console.log('Fetching payment gateways from API...', apiUrl);
        const response = await fetch(`${apiUrl}/api/admin/pricing/payment-gateways`, {
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

        if (data.success && data.gateways) {
            paymentGateways = data.gateways;
            console.log(`Loaded ${paymentGateways.length} gateways from database`);
            renderPaymentGateways();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading payment gateways from API:', error);
        paymentGateways = getDefaultPaymentGateways();
        renderPaymentGateways();
    }
}

function getDefaultPaymentGateways() {
    return [
        {
            id: 1,
            gateway_name: 'TeleBirr',
            enabled: true,
            api_key: '',
            secret_key: '',
            test_mode: true
        },
        {
            id: 2,
            gateway_name: 'CBE',
            enabled: false,
            api_key: '',
            secret_key: '',
            test_mode: true
        }
    ];
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderPaymentGateways() {
    console.log('renderPaymentGateways() called with', paymentGateways.length, 'gateways');

    const grid = document.getElementById('payment-gateways-grid');
    if (!grid) {
        console.error('payment-gateways-grid element NOT FOUND');
        return;
    }

    if (paymentGateways.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-credit-card text-4xl mb-4"></i>
                <p class="text-lg font-semibold">No payment gateways configured</p>
                <p class="text-sm">Click "Add Gateway" to configure your first payment method</p>
            </div>
        `;
        return;
    }

    // Gateway icons mapping
    const gatewayIcons = {
        'telebirr': 'fa-mobile-alt',
        'cbe': 'fa-university',
        'awash': 'fa-landmark',
        'abyssinia': 'fa-building-columns',
        'stripe': 'fa-stripe',
        'paypal': 'fa-paypal',
        'default': 'fa-credit-card'
    };

    const colors = [
        { border: 'blue-300', bg: 'blue-50', text: 'blue-700', icon: 'blue-600' },
        { border: 'emerald-300', bg: 'emerald-50', text: 'emerald-700', icon: 'emerald-600' },
        { border: 'purple-300', bg: 'purple-50', text: 'purple-700', icon: 'purple-600' },
        { border: 'amber-300', bg: 'amber-50', text: 'amber-700', icon: 'amber-600' },
        { border: 'rose-300', bg: 'rose-50', text: 'rose-700', icon: 'rose-600' },
        { border: 'cyan-300', bg: 'cyan-50', text: 'cyan-700', icon: 'cyan-600' }
    ];

    grid.innerHTML = paymentGateways.map((gateway, index) => {
        const color = colors[index % colors.length];
        const isEnabled = gateway.enabled;
        const isTestMode = gateway.test_mode !== false;
        const gatewayKey = gateway.gateway_name.toLowerCase().replace(/\s+/g, '');
        const icon = gatewayIcons[gatewayKey] || gatewayIcons['default'];

        return `
            <div class="border-2 border-${color.border} rounded-xl p-5 bg-${color.bg} hover:shadow-xl transition-all relative cursor-pointer group ${!isEnabled ? 'opacity-60' : ''}"
                onclick="editPaymentGateway(${gateway.id})" title="Click to edit">

                <button onclick="event.stopPropagation(); deletePaymentGateway(${gateway.id})"
                    class="absolute top-2 left-2 w-7 h-7 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete gateway">
                    <i class="fas fa-times"></i>
                </button>

                <!-- Status badges -->
                <div class="absolute top-2 right-2 flex gap-1">
                    ${isTestMode ? `
                    <span class="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                        Test
                    </span>
                    ` : ''}
                    ${!isEnabled ? `
                    <span class="px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full">
                        Disabled
                    </span>
                    ` : `
                    <span class="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                        Active
                    </span>
                    `}
                </div>

                <div class="text-center mb-4 mt-4">
                    <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                        <i class="fas ${icon} text-2xl text-${color.icon}"></i>
                    </div>
                    <h4 class="text-lg font-bold text-${color.text}">${gateway.gateway_name}</h4>
                    <p class="text-xs text-gray-500">Payment Gateway</p>
                </div>

                <div class="text-center py-3 bg-white/50 rounded-lg">
                    <div class="flex items-center justify-center gap-2">
                        <span class="w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-400'}"></span>
                        <span class="text-sm font-medium text-gray-700">${isEnabled ? 'Accepting Payments' : 'Not Active'}</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${gateway.api_key ? 'API Key configured' : 'API Key not set'}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    console.log(`Rendered ${paymentGateways.length} gateway cards`);
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openAddPaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (!modal) {
        console.error('Payment gateway modal not found');
        return;
    }

    // Update modal title
    const titleEl = modal.querySelector('.modal-header h2');
    if (titleEl) {
        titleEl.innerHTML = '<i class="fas fa-credit-card mr-2"></i>Add Payment Gateway';
    }

    // Reset form
    document.getElementById('payment-gateway-form').reset();
    document.getElementById('gateway-id').value = '';
    document.getElementById('gateway-enabled').checked = true;

    modal.classList.remove('hidden');
}

function editPaymentGateway(gatewayId) {
    const gateway = paymentGateways.find(g => g.id === gatewayId);
    if (!gateway) {
        console.error('Gateway not found:', gatewayId);
        return;
    }

    const modal = document.getElementById('payment-gateway-modal');
    if (!modal) {
        console.error('Payment gateway modal not found');
        return;
    }

    // Update modal title
    const titleEl = modal.querySelector('.modal-header h2');
    if (titleEl) {
        titleEl.innerHTML = '<i class="fas fa-credit-card mr-2"></i>Edit Payment Gateway';
    }

    // Populate form
    document.getElementById('gateway-id').value = gateway.id;
    document.getElementById('gateway-name').value = gateway.gateway_name;
    document.getElementById('gateway-merchant-id').value = gateway.api_key === '***' ? '' : (gateway.api_key || '');
    document.getElementById('gateway-api-key').value = gateway.secret_key === '***' ? '' : (gateway.secret_key || '');
    document.getElementById('gateway-additional-info').value = gateway.webhook_url || '';
    document.getElementById('gateway-enabled').checked = gateway.enabled !== false;

    modal.classList.remove('hidden');
}

function closePaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ============================================
// SAVE FUNCTIONS
// ============================================

async function savePaymentGateway(event) {
    event.preventDefault();

    const gatewayId = document.getElementById('gateway-id').value;
    const gatewayName = document.getElementById('gateway-name').value.trim();
    const merchantId = document.getElementById('gateway-merchant-id').value.trim();
    const apiKey = document.getElementById('gateway-api-key').value.trim();
    const additionalInfo = document.getElementById('gateway-additional-info').value.trim();
    const isEnabled = document.getElementById('gateway-enabled').checked;

    // Validation
    if (!gatewayName) {
        alert('Please enter a gateway name');
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const gatewayData = {
            gateway_name: gatewayName,
            enabled: isEnabled,
            api_key: merchantId,
            secret_key: apiKey,
            webhook_url: additionalInfo,
            test_mode: true,
            settings: {}
        };

        console.log('Saving payment gateway:', gatewayData);

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/pricing/payment-gateways`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gatewayData)
        });

        if (!response.ok) {
            throw new Error('Failed to save gateway');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save gateway');
        }

        // Reload gateways from database
        await loadPaymentGateways();
        closePaymentGatewayModal();

        alert('Payment gateway saved successfully!');

    } catch (error) {
        console.error('Error saving payment gateway:', error);
        alert('Failed to save payment gateway. Please try again.');
    }
}

async function deletePaymentGateway(gatewayId) {
    const gateway = paymentGateways.find(g => g.id === gatewayId);
    if (!gateway) return;

    if (!confirm(`Are you sure you want to delete "${gateway.gateway_name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/pricing/payment-gateways/${gatewayId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete gateway');
        }

        // Reload gateways
        await loadPaymentGateways();
        alert('Payment gateway deleted successfully!');

    } catch (error) {
        console.error('Error deleting payment gateway:', error);
        alert('Failed to delete payment gateway. Please try again.');
    }
}

// ============================================
// EXPORTS & INITIALIZATION
// ============================================

// Export functions to window
window.loadPaymentGateways = loadPaymentGateways;
window.renderPaymentGateways = renderPaymentGateways;
window.openAddPaymentGatewayModal = openAddPaymentGatewayModal;
window.editPaymentGateway = editPaymentGateway;
window.closePaymentGatewayModal = closePaymentGatewayModal;
window.savePaymentGateway = savePaymentGateway;
window.deletePaymentGateway = deletePaymentGateway;

// ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('payment-gateway-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closePaymentGatewayModal();
        }
    }
});

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Payment Gateway Manager initialized');

    const grid = document.getElementById('payment-gateways-grid');
    if (grid) {
        console.log('payment-gateways-grid found, loading gateways...');
        loadPaymentGateways();
    } else {
        console.log('payment-gateways-grid NOT FOUND on page load');
        setTimeout(() => {
            const gridDelayed = document.getElementById('payment-gateways-grid');
            if (gridDelayed) {
                console.log('payment-gateways-grid found after delay, loading gateways...');
                loadPaymentGateways();
            }
        }, 500);
    }
});

// Also load when pricing panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        console.log('Pricing panel activated, loading payment gateways...');
        setTimeout(() => loadPaymentGateways(), 100);
    }
});
