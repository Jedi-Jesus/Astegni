// ============================================
// System Settings Fixes
// ============================================
// This file fixes the following issues:
// 1. minimum-payout field not saving/loading in affiliate settings
// 2. Payment gateway modal not saving to DB or loading on page load
// 3. Package features not saving/loading in subscription pricing
// 4. Commission calculator not calculating on page load

// Check if API_BASE_URL is defined
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://api.astegni.com';
}

// ============================================
// FIX 1: Minimum Payout in Affiliate Settings
// ============================================
// The issue is in pricing-functions.js line 275:
// It reads from 'min-payout' but HTML has 'minimum-payout'

// Override saveAffiliateSettings to fix the field name
async function saveAffiliateSettings() {
    // Get commission percentages
    const directBasic = parseFloat(document.getElementById('direct-basic-commission')?.value);
    const directPremium = parseFloat(document.getElementById('direct-premium-commission')?.value);
    const directDuration = parseInt(document.getElementById('direct-duration')?.value);

    const indirectBasic = parseFloat(document.getElementById('indirect-basic-commission')?.value);
    const indirectPremium = parseFloat(document.getElementById('indirect-premium-commission')?.value);
    const indirectDuration = parseInt(document.getElementById('indirect-duration')?.value);

    // FIX: Changed from 'min-payout' to 'minimum-payout'
    const minPayout = parseFloat(document.getElementById('minimum-payout')?.value) || 100;
    const payoutSchedule = document.getElementById('payout-schedule')?.value || 'monthly';
    const programEnabled = document.getElementById('affiliate-program-enabled')?.checked || false;

    // Validation
    if (isNaN(directBasic) || directBasic < 0 || directBasic > 100) {
        alert('Please enter a valid Direct Basic commission (0-100%)');
        return;
    }
    if (isNaN(directPremium) || directPremium < 0 || directPremium > 100) {
        alert('Please enter a valid Direct Premium commission (0-100%)');
        return;
    }
    if (isNaN(indirectBasic) || indirectBasic < 0 || indirectBasic > 100) {
        alert('Please enter a valid Indirect Basic commission (0-100%)');
        return;
    }
    if (isNaN(indirectPremium) || indirectPremium < 0 || indirectPremium > 100) {
        alert('Please enter a valid Indirect Premium commission (0-100%)');
        return;
    }

    try {
        const data = {
            enabled: programEnabled,
            commission_percentage: directBasic, // Use direct basic as default
            minimum_payout: minPayout,
            payout_frequency: payoutSchedule,
            cookie_duration_days: directDuration * 30, // Convert months to days
            tier_bonuses: {
                direct_basic: directBasic,
                direct_premium: directPremium,
                direct_duration_months: directDuration,
                indirect_basic: indirectBasic,
                indirect_premium: indirectPremium,
                indirect_duration_months: indirectDuration
            }
        };

        console.log('Saving affiliate settings with minimum_payout:', minPayout);

        const response = await fetch(`${window.API_BASE_URL}/api/admin/pricing/affiliate-settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            alert('Affiliate settings saved successfully!');
            // Trigger calculator update after save
            calculateAffiliateExamples();
        } else {
            throw new Error('Failed to save affiliate settings');
        }
    } catch (error) {
        console.error('Error saving affiliate settings:', error);
        alert('Failed to save affiliate settings. Please try again.');
    }
}

// Update loadPricingSettings to fix the field name
async function loadAffiliateSettings() {
    try {
        const affiliateResponse = await fetch(`${window.API_BASE_URL}/api/admin/pricing/affiliate-settings`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (affiliateResponse.ok) {
            const affiliateData = await affiliateResponse.json();
            if (affiliateData.success && affiliateData.settings) {
                const settings = affiliateData.settings;

                const programEnabled = document.getElementById('affiliate-program-enabled');
                if (programEnabled) programEnabled.checked = settings.enabled;

                // FIX: Changed from 'min-payout' to 'minimum-payout'
                const minPayout = document.getElementById('minimum-payout');
                if (minPayout) minPayout.value = settings.minimum_payout;

                const payoutSchedule = document.getElementById('payout-schedule');
                if (payoutSchedule) payoutSchedule.value = settings.payout_frequency;

                if (settings.tier_bonuses) {
                    const bonuses = settings.tier_bonuses;

                    const directBasic = document.getElementById('direct-basic-commission');
                    if (directBasic) directBasic.value = bonuses.direct_basic || settings.commission_percentage;

                    const directPremium = document.getElementById('direct-premium-commission');
                    if (directPremium) directPremium.value = bonuses.direct_premium || settings.commission_percentage;

                    const directDuration = document.getElementById('direct-duration');
                    if (directDuration) directDuration.value = bonuses.direct_duration_months || Math.floor(settings.cookie_duration_days / 30);

                    const indirectBasic = document.getElementById('indirect-basic-commission');
                    if (indirectBasic) indirectBasic.value = bonuses.indirect_basic || 5;

                    const indirectPremium = document.getElementById('indirect-premium-commission');
                    if (indirectPremium) indirectPremium.value = bonuses.indirect_premium || 5;

                    const indirectDuration = document.getElementById('indirect-duration');
                    if (indirectDuration) indirectDuration.value = bonuses.indirect_duration_months || 6;
                }

                // Trigger calculator update after loading
                calculateAffiliateExamples();
            }
        }
    } catch (error) {
        console.error('Error loading affiliate settings:', error);
    }
}

// ============================================
// FIX 2: Payment Gateway Modal Functions
// ============================================

function openAddPaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Clear form
        document.getElementById('payment-gateway-form').reset();
    }
}

function closePaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function savePaymentGateway(event) {
    event.preventDefault();

    const gatewayName = document.getElementById('gateway-name')?.value;
    const merchantId = document.getElementById('gateway-merchant-id')?.value;
    const apiKey = document.getElementById('gateway-api-key')?.value;
    const enabled = document.getElementById('gateway-enabled')?.checked;

    if (!gatewayName) {
        alert('Please enter a gateway name');
        return;
    }

    try {
        const data = {
            gateway_name: gatewayName,
            enabled: enabled,
            api_key: merchantId || '',
            secret_key: apiKey || '',
            test_mode: true,
            settings: {}
        };

        console.log('Saving payment gateway:', data);

        const response = await fetch(`${window.API_BASE_URL}/api/admin/pricing/payment-gateways`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            alert(`Payment gateway "${gatewayName}" added successfully!`);
            closePaymentGatewayModal();
            // Reload payment gateways
            loadPaymentGateways();
        } else {
            throw new Error('Failed to save payment gateway');
        }
    } catch (error) {
        console.error('Error saving payment gateway:', error);
        alert('Failed to save payment gateway. Please try again.');
    }
}

async function loadPaymentGateways() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/admin/pricing/payment-gateways`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.gateways) {
                const container = document.getElementById('additional-gateways-container');
                if (container) {
                    // Clear existing
                    container.innerHTML = '';

                    // Add each gateway (excluding built-in Telebirr and CBE)
                    data.gateways.forEach(gateway => {
                        if (gateway.gateway_name !== 'TeleBirr' && gateway.gateway_name !== 'CBE') {
                            const gatewayHtml = `
                                <div class="border rounded-lg p-4" data-gateway-id="${gateway.id}">
                                    <div class="flex items-center justify-between mb-4">
                                        <h4 class="font-semibold">${gateway.gateway_name}</h4>
                                        <div class="flex items-center gap-3">
                                            <label class="flex items-center gap-2">
                                                <input type="checkbox" class="gateway-enabled-checkbox" data-gateway="${gateway.gateway_name}" ${gateway.enabled ? 'checked' : ''}>
                                                <span class="text-sm">Enabled</span>
                                            </label>
                                            <button onclick="deletePaymentGateway('${gateway.gateway_name}', ${gateway.id})"
                                                class="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                                                title="Delete Gateway">
                                                <i class="fas fa-trash mr-1"></i>Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block mb-2 text-sm">Merchant ID</label>
                                            <input type="text" value="${gateway.api_key === '***' ? '' : gateway.api_key || ''}"
                                                class="w-full p-2 border rounded-lg" placeholder="***" readonly>
                                        </div>
                                        <div>
                                            <label class="block mb-2 text-sm">API Key</label>
                                            <input type="password" value="${gateway.secret_key === '***' ? '' : gateway.secret_key || ''}"
                                                class="w-full p-2 border rounded-lg" placeholder="***" readonly>
                                        </div>
                                    </div>
                                </div>
                            `;
                            container.insertAdjacentHTML('beforeend', gatewayHtml);
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error loading payment gateways:', error);
    }
}

async function deletePaymentGateway(gatewayName, gatewayId) {
    if (!confirm(`Are you sure you want to delete the payment gateway "${gatewayName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/admin/pricing/payment-gateways/${gatewayId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(`Payment gateway "${gatewayName}" deleted successfully!`);
            // Remove from UI
            const gatewayElement = document.querySelector(`[data-gateway-id="${gatewayId}"]`);
            if (gatewayElement) {
                gatewayElement.remove();
            }
        } else {
            throw new Error('Failed to delete payment gateway');
        }
    } catch (error) {
        console.error('Error deleting payment gateway:', error);
        alert('Failed to delete payment gateway. Please try again.');
    }
}

// ============================================
// FIX 3: Subscription Pricing Features
// ============================================
// The issue is that saveSubscriptionPricing in pricing-functions.js uses getTierFeatures()
// but doesn't properly save them. Let's override it.

async function saveSubscriptionPricing() {
    // Get base prices
    const basicPrice = parseFloat(document.getElementById('basic-base-price')?.value);
    const premiumPrice = parseFloat(document.getElementById('premium-base-price')?.value);

    // Validation
    if (isNaN(basicPrice) || basicPrice < 0) {
        alert('Please enter a valid Basic tier price');
        return;
    }
    if (isNaN(premiumPrice) || premiumPrice < 0) {
        alert('Please enter a valid Premium tier price');
        return;
    }

    try {
        // Collect period discounts for all periods
        const periods = ['1m', '3m', '6m', '9m', '12m'];
        const basicDiscounts = {};
        const premiumDiscounts = {};

        periods.forEach(period => {
            const basicDiscountEl = document.getElementById(`basic-discount-${period}`);
            const premiumDiscountEl = document.getElementById(`premium-discount-${period}`);

            basicDiscounts[period] = basicDiscountEl ? parseFloat(basicDiscountEl.value) || 0 : 0;
            premiumDiscounts[period] = premiumDiscountEl ? parseFloat(premiumDiscountEl.value) || 0 : 0;
        });

        console.log('Collected discount percentages:', { basicDiscounts, premiumDiscounts });

        // FIX: Get features from the package-includes-container
        const basicFeatures = getPackageFeatures('basic');
        const premiumFeatures = getPackageFeatures('premium');

        console.log('Collected features:', { basicFeatures, premiumFeatures });

        // Basic tier
        const basicData = {
            tier_name: 'Basic',
            monthly_price: basicPrice,
            annual_price: basicPrice * 10, // Discounted annual price
            currency: 'ETB',
            features: basicFeatures,
            limits: {
                storage_gb: 5,
                api_calls_per_month: 1000,
                users: 1
            },
            is_popular: false,
            period_discounts: basicDiscounts
        };

        // Premium tier
        const premiumData = {
            tier_name: 'Premium',
            monthly_price: premiumPrice,
            annual_price: premiumPrice * 10, // Discounted annual price
            currency: 'ETB',
            features: premiumFeatures,
            limits: {
                storage_gb: 50,
                api_calls_per_month: 10000,
                users: 10
            },
            is_popular: true,
            period_discounts: premiumDiscounts
        };

        console.log('Saving subscription pricing...');

        const promises = [
            fetch(`${window.API_BASE_URL}/api/admin/pricing/subscription-tiers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(basicData)
            }),
            fetch(`${window.API_BASE_URL}/api/admin/pricing/subscription-tiers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(premiumData)
            })
        ];

        const results = await Promise.all(promises);
        const responses = await Promise.all(results.map(r => r.json()));

        if (responses.every(r => r.success)) {
            alert('Subscription pricing saved successfully!');
        } else {
            throw new Error('Failed to save subscription pricing');
        }
    } catch (error) {
        console.error('Error saving subscription pricing:', error);
        alert('Failed to save subscription pricing. Please try again.');
    }
}

// Helper function to get package features from the UI
function getPackageFeatures(tier) {
    // Use the correct container IDs for subscription tier features
    const containerId = tier === 'basic' ? 'basic-tier-features-container' : 'premium-tier-features-container';
    const container = document.getElementById(containerId);
    const features = [];

    if (container) {
        // Find all feature input fields
        const featureInputs = container.querySelectorAll('input[type="text"]');

        featureInputs.forEach(input => {
            if (input.value.trim()) {
                features.push(input.value.trim());
            }
        });
    }

    console.log(`Collected ${features.length} features for ${tier} tier from ${containerId}:`, features);

    // If no features found in container, use default features
    if (features.length === 0) {
        console.log(`No features found in UI for ${tier}, using defaults`);
        if (tier === 'basic') {
            return [
                'Access to basic features',
                '5 GB storage',
                'Email support',
                'Basic analytics'
            ];
        } else if (tier === 'premium') {
            return [
                'All basic features',
                '50 GB storage',
                'Priority support',
                'Advanced analytics',
                'API access',
                'Custom branding'
            ];
        }
    }

    return features;
}

// Load subscription features
async function loadSubscriptionFeatures() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/admin/pricing/subscription-tiers`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.tiers) {
                console.log('Loading subscription tiers:', data.tiers);
                // Load features into the tier containers
                data.tiers.forEach(tier => {
                    if (tier.features && Array.isArray(tier.features)) {
                        const tierName = tier.tier_name.toLowerCase();
                        populatePackageFeatures(tierName, tier.features);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading subscription features:', error);
    }
}

// Populate package features in the UI
function populatePackageFeatures(tier, features) {
    const containerId = tier === 'basic' ? 'basic-tier-features-container' : 'premium-tier-features-container';
    const emptyStateId = tier === 'basic' ? 'basic-features-empty-state' : 'premium-features-empty-state';

    const container = document.getElementById(containerId);
    const emptyState = document.getElementById(emptyStateId);

    if (!container) {
        console.warn(`Container ${containerId} not found`);
        return;
    }

    // Clear existing features
    container.innerHTML = '';

    if (features && features.length > 0) {
        console.log(`Populating ${features.length} features for ${tier} tier`);

        // Hide empty state
        if (emptyState) {
            emptyState.classList.add('hidden');
        }

        // Add each feature
        features.forEach((feature, index) => {
            const featureId = `${tier}-feature-${Date.now()}-${index}`;
            const featureDiv = document.createElement('div');
            featureDiv.className = 'flex gap-2 items-center';
            featureDiv.id = featureId;

            const borderColor = tier === 'basic' ? 'border-blue-300' : 'border-purple-300';

            featureDiv.innerHTML = `
                <input type="text" value="${feature}" class="flex-1 p-2 border ${borderColor} rounded text-sm" placeholder="e.g., 10GB Storage">
                <button onclick="removeFeature('${featureId}')" class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
                    <i class="fas fa-times"></i>
                </button>
            `;

            container.appendChild(featureDiv);
        });
    } else {
        // Show empty state if no features
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
    }
}

// ============================================
// FIX 4: Commission Calculator on Page Load
// ============================================

function calculateAffiliateExamples() {
    // Get selected period
    const period = document.getElementById('affiliate-calc-period')?.value || '6m';

    // Get commission rates
    const directBasic = parseFloat(document.getElementById('direct-basic-commission')?.value) || 0;
    const directPremium = parseFloat(document.getElementById('direct-premium-commission')?.value) || 0;
    const indirectBasic = parseFloat(document.getElementById('indirect-basic-commission')?.value) || 0;
    const indirectPremium = parseFloat(document.getElementById('indirect-premium-commission')?.value) || 0;

    // Get subscription prices
    const basicPrice = parseFloat(document.getElementById('basic-base-price')?.value) || 99;
    const premiumPrice = parseFloat(document.getElementById('premium-base-price')?.value) || 299;

    // Get period discounts
    const basicDiscount = parseFloat(document.getElementById(`basic-discount-${period}`)?.value) || 0;
    const premiumDiscount = parseFloat(document.getElementById(`premium-discount-${period}`)?.value) || 0;

    // Calculate number of months
    const months = period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : period === '9m' ? 9 : 12;

    // Calculate subscription totals
    const basicTotal = basicPrice * months;
    const basicDiscountAmount = basicTotal * (basicDiscount / 100);
    const basicFinal = basicTotal - basicDiscountAmount;

    const premiumTotal = premiumPrice * months;
    const premiumDiscountAmount = premiumTotal * (premiumDiscount / 100);
    const premiumFinal = premiumTotal - premiumDiscountAmount;

    // Calculate commissions
    const directBasicCommission = basicFinal * (directBasic / 100);
    const directPremiumCommission = premiumFinal * (directPremium / 100);
    const indirectBasicCommission = basicFinal * (indirectBasic / 100);
    const indirectPremiumCommission = premiumFinal * (indirectPremium / 100);

    // Update Direct Affiliate Basic
    const directBasicCalc = document.getElementById('direct-basic-calc');
    const directBasicDetail = document.getElementById('direct-basic-calc-detail');
    if (directBasicCalc) {
        directBasicCalc.textContent = `${Math.round(directBasicCommission).toLocaleString('en-ET')} ETB`;
    }
    if (directBasicDetail) {
        directBasicDetail.textContent = `${directBasic}% of ${Math.round(basicFinal).toLocaleString('en-ET')} ETB`;
    }

    // Update Direct Affiliate Premium
    const directPremiumCalc = document.getElementById('direct-premium-calc');
    const directPremiumDetail = document.getElementById('direct-premium-calc-detail');
    if (directPremiumCalc) {
        directPremiumCalc.textContent = `${Math.round(directPremiumCommission).toLocaleString('en-ET')} ETB`;
    }
    if (directPremiumDetail) {
        directPremiumDetail.textContent = `${directPremium}% of ${Math.round(premiumFinal).toLocaleString('en-ET')} ETB`;
    }

    // Update Indirect Affiliate Basic
    const indirectBasicCalc = document.getElementById('indirect-basic-calc');
    const indirectBasicDetail = document.getElementById('indirect-basic-calc-detail');
    if (indirectBasicCalc) {
        indirectBasicCalc.textContent = `${Math.round(indirectBasicCommission).toLocaleString('en-ET')} ETB`;
    }
    if (indirectBasicDetail) {
        indirectBasicDetail.textContent = `${indirectBasic}% of ${Math.round(basicFinal).toLocaleString('en-ET')} ETB`;
    }

    // Update Indirect Affiliate Premium
    const indirectPremiumCalc = document.getElementById('indirect-premium-calc');
    const indirectPremiumDetail = document.getElementById('indirect-premium-calc-detail');
    if (indirectPremiumCalc) {
        indirectPremiumCalc.textContent = `${Math.round(indirectPremiumCommission).toLocaleString('en-ET')} ETB`;
    }
    if (indirectPremiumDetail) {
        indirectPremiumDetail.textContent = `${indirectPremium}% of ${Math.round(premiumFinal).toLocaleString('en-ET')} ETB`;
    }
}

// ============================================
// Export Functions to Window
// ============================================

window.saveAffiliateSettings = saveAffiliateSettings;
window.loadAffiliateSettings = loadAffiliateSettings;
window.openAddPaymentGatewayModal = openAddPaymentGatewayModal;
window.closePaymentGatewayModal = closePaymentGatewayModal;
window.savePaymentGateway = savePaymentGateway;
window.loadPaymentGateways = loadPaymentGateways;
window.deletePaymentGateway = deletePaymentGateway;
window.saveSubscriptionPricing = saveSubscriptionPricing;
window.getPackageFeatures = getPackageFeatures;
window.loadSubscriptionFeatures = loadSubscriptionFeatures;
window.populatePackageFeatures = populatePackageFeatures;
window.calculateAffiliateExamples = calculateAffiliateExamples;

// ============================================
// Initialize on DOM Load
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('System Settings Fixes loaded');

    // Load affiliate settings
    setTimeout(() => {
        loadAffiliateSettings();
        loadPaymentGateways();
        loadSubscriptionFeatures();
        // Calculate commission examples on page load
        calculateAffiliateExamples();
    }, 1000);
});

// Also calculate when panel changes to pricing
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        setTimeout(() => {
            loadAffiliateSettings();
            loadPaymentGateways();
            calculateAffiliateExamples();
        }, 100);
    }
});
