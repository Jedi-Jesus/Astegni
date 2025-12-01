// Pricing Functions for Manage System Settings
// Handles saving all pricing-related settings

// Check if API_BASE_URL is defined - use window object to avoid redeclaration
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://api.astegni.com';
}

// Payment Gateway Settings
async function savePaymentGatewaySettings() {
    try {
        // Save TeleBirr settings
        const telebirrData = {
            gateway_name: 'TeleBirr',
            enabled: document.getElementById('telebirr-enabled')?.checked || false,
            api_key: document.getElementById('telebirr-merchant-id')?.value || '',
            secret_key: document.getElementById('telebirr-api-key')?.value || '',
            test_mode: true,
            settings: {}
        };

        // Save CBE settings
        const cbeData = {
            gateway_name: 'CBE',
            enabled: document.getElementById('cbe-enabled')?.checked || false,
            api_key: document.getElementById('cbe-account-number')?.value || '',
            secret_key: document.getElementById('cbe-secret-key')?.value || '',
            test_mode: true,
            settings: {}
        };

        console.log('Saving payment gateway settings...');

        // Save to database
        const promises = [];

        promises.push(
            fetch(`${window.API_BASE_URL}/api/admin/pricing/payment-gateways`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(telebirrData)
            })
        );

        promises.push(
            fetch(`${window.API_BASE_URL}/api/admin/pricing/payment-gateways`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(cbeData)
            })
        );

        const results = await Promise.all(promises);
        const responses = await Promise.all(results.map(r => r.json()));

        if (responses.every(r => r.success)) {
            alert('Payment gateway settings saved successfully!');
        } else {
            throw new Error('Failed to save some settings');
        }
    } catch (error) {
        console.error('Error saving payment gateway settings:', error);
        alert('Failed to save payment gateway settings. Please try again.');
    }
}

// Verification Pricing
async function saveVerificationPricing() {
    const individualPrice = parseFloat(document.getElementById('individual-verification-price')?.value);
    const orgPrice = parseFloat(document.getElementById('org-verification-price')?.value);

    // Validation
    if (isNaN(individualPrice) || individualPrice < 0) {
        alert('Please enter a valid price for Individual Verification');
        return;
    }
    if (isNaN(orgPrice) || orgPrice < 0) {
        alert('Please enter a valid price for Organization Verification');
        return;
    }

    try {
        // Save individual tier
        const individualData = {
            tier: 'individual',
            price: individualPrice,
            currency: 'ETB',
            features: ['Profile verification badge', 'Priority support', 'Verified status'],
            badge_type: 'blue',
            duration_days: 365
        };

        // Save organization tier
        const orgData = {
            tier: 'organization',
            price: orgPrice,
            currency: 'ETB',
            features: ['Organization verification badge', 'Priority support', 'Multiple user verification', 'Featured listing'],
            badge_type: 'gold',
            duration_days: 365
        };

        console.log('Saving verification pricing...');

        const promises = [
            fetch(`${window.API_BASE_URL}/api/admin/pricing/verification-tiers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(individualData)
            }),
            fetch(`${window.API_BASE_URL}/api/admin/pricing/verification-tiers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(orgData)
            })
        ];

        const results = await Promise.all(promises);
        const responses = await Promise.all(results.map(r => r.json()));

        if (responses.every(r => r.success)) {
            alert('Verification pricing saved successfully!');
        } else {
            throw new Error('Failed to save verification pricing');
        }
    } catch (error) {
        console.error('Error saving verification pricing:', error);
        alert('Failed to save verification pricing. Please try again.');
    }
}

// Subscription Pricing
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

        // Get features from UI using the getTierFeatures function from system-settings-enhancements.js
        const basicFeatures = typeof getTierFeatures === 'function'
            ? getTierFeatures('basic')
            : [
                'Access to basic features',
                '5 GB storage',
                'Email support',
                'Basic analytics'
            ];

        const premiumFeatures = typeof getTierFeatures === 'function'
            ? getTierFeatures('premium')
            : [
                'All basic features',
                '50 GB storage',
                'Priority support',
                'Advanced analytics',
                'API access',
                'Custom branding'
            ];

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

// Affiliate Management Settings
async function saveAffiliateSettings() {
    // Get commission percentages
    const directBasic = parseFloat(document.getElementById('direct-basic-commission')?.value);
    const directPremium = parseFloat(document.getElementById('direct-premium-commission')?.value);
    const directDuration = parseInt(document.getElementById('direct-duration')?.value);

    const indirectBasic = parseFloat(document.getElementById('indirect-basic-commission')?.value);
    const indirectPremium = parseFloat(document.getElementById('indirect-premium-commission')?.value);
    const indirectDuration = parseInt(document.getElementById('indirect-duration')?.value);

    const minPayout = parseFloat(document.getElementById('min-payout')?.value) || 100;
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

        console.log('Saving affiliate settings...');

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
        } else {
            throw new Error('Failed to save affiliate settings');
        }
    } catch (error) {
        console.error('Error saving affiliate settings:', error);
        alert('Failed to save affiliate settings. Please try again.');
    }
}

// Load saved settings on page load
async function loadPricingSettings() {
    try {
        // Load Payment Gateway Settings
        const gatewayResponse = await fetch(`${window.API_BASE_URL}/api/admin/pricing/payment-gateways`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (gatewayResponse.ok) {
            const gatewayData = await gatewayResponse.json();
            if (gatewayData.success && gatewayData.gateways) {
                gatewayData.gateways.forEach(gateway => {
                    if (gateway.gateway_name === 'TeleBirr') {
                        const telebirrEnabled = document.getElementById('telebirr-enabled');
                        const telebirrMerchantId = document.getElementById('telebirr-merchant-id');
                        const telebirrApiKey = document.getElementById('telebirr-api-key');

                        if (telebirrEnabled) telebirrEnabled.checked = gateway.enabled;
                        if (telebirrMerchantId) telebirrMerchantId.value = gateway.api_key || '';
                        if (telebirrApiKey) telebirrApiKey.value = gateway.secret_key || '';
                    } else if (gateway.gateway_name === 'CBE') {
                        const cbeEnabled = document.getElementById('cbe-enabled');
                        const cbeAccountNumber = document.getElementById('cbe-account-number');
                        const cbeSecretKey = document.getElementById('cbe-secret-key');

                        if (cbeEnabled) cbeEnabled.checked = gateway.enabled;
                        if (cbeAccountNumber) cbeAccountNumber.value = gateway.api_key || '';
                        if (cbeSecretKey) cbeSecretKey.value = gateway.secret_key || '';
                    }
                });
            }
        }

        // Load Verification Pricing
        const verificationResponse = await fetch(`${window.API_BASE_URL}/api/admin/pricing/verification-tiers`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (verificationResponse.ok) {
            const verificationData = await verificationResponse.json();
            if (verificationData.success && verificationData.tiers) {
                verificationData.tiers.forEach(tier => {
                    if (tier.tier === 'individual') {
                        const individualPrice = document.getElementById('individual-verification-price');
                        if (individualPrice) individualPrice.value = tier.price;
                    } else if (tier.tier === 'organization') {
                        const orgPrice = document.getElementById('org-verification-price');
                        if (orgPrice) orgPrice.value = tier.price;
                    }
                });
            }
        }

        // Load Subscription Tiers
        const subscriptionResponse = await fetch(`${window.API_BASE_URL}/api/admin/pricing/subscription-tiers`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            if (subscriptionData.success && subscriptionData.tiers) {
                subscriptionData.tiers.forEach(tier => {
                    if (tier.tier_name === 'Basic') {
                        const basicPrice = document.getElementById('basic-base-price');
                        if (basicPrice) basicPrice.value = tier.monthly_price;

                        // Load period discounts for Basic tier
                        if (tier.period_discounts) {
                            Object.keys(tier.period_discounts).forEach(period => {
                                const discountInput = document.getElementById(`basic-discount-${period}`);
                                if (discountInput) {
                                    discountInput.value = tier.period_discounts[period];
                                }
                            });
                        }
                    } else if (tier.tier_name === 'Premium') {
                        const premiumPrice = document.getElementById('premium-base-price');
                        if (premiumPrice) premiumPrice.value = tier.monthly_price;

                        // Load period discounts for Premium tier
                        if (tier.period_discounts) {
                            Object.keys(tier.period_discounts).forEach(period => {
                                const discountInput = document.getElementById(`premium-discount-${period}`);
                                if (discountInput) {
                                    discountInput.value = tier.period_discounts[period];
                                }
                            });
                        }
                    }
                });

                // Trigger live pricing calculation after loading
                if (typeof calculateLivePricing === 'function') {
                    calculateLivePricing();
                }
            }
        }

        // Load Affiliate Settings
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

                const minPayout = document.getElementById('min-payout');
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
            }
        }

    } catch (error) {
        console.error('Error loading pricing settings:', error);
        // Fallback to localStorage if API fails
        loadPricingSettingsFromLocalStorage();
    }
}

// Fallback function to load from localStorage
function loadPricingSettingsFromLocalStorage() {
    // Load Payment Gateway Settings
    const paymentSettings = localStorage.getItem('payment_gateway_settings');
    if (paymentSettings) {
        try {
            const data = JSON.parse(paymentSettings);
            if (data.telebirr) {
                const telebirrEnabled = document.getElementById('telebirr-enabled');
                const telebirrMerchantId = document.getElementById('telebirr-merchant-id');
                const telebirrApiKey = document.getElementById('telebirr-api-key');

                if (telebirrEnabled) telebirrEnabled.checked = data.telebirr.enabled;
                if (telebirrMerchantId) telebirrMerchantId.value = data.telebirr.merchant_id;
                if (telebirrApiKey) telebirrApiKey.value = data.telebirr.api_key;
            }
            if (data.cbe) {
                const cbeEnabled = document.getElementById('cbe-enabled');
                const cbeAccountNumber = document.getElementById('cbe-account-number');
                const cbeSecretKey = document.getElementById('cbe-secret-key');

                if (cbeEnabled) cbeEnabled.checked = data.cbe.enabled;
                if (cbeAccountNumber) cbeAccountNumber.value = data.cbe.account_number;
                if (cbeSecretKey) cbeSecretKey.value = data.cbe.secret_key;
            }
        } catch (e) {
            console.error('Error loading payment settings from localStorage:', e);
        }
    }

    // Load Verification Pricing
    const verificationPricing = localStorage.getItem('verification_pricing');
    if (verificationPricing) {
        try {
            const data = JSON.parse(verificationPricing);
            const individualPrice = document.getElementById('individual-verification-price');
            const orgPrice = document.getElementById('org-verification-price');

            if (individualPrice) individualPrice.value = data.individual;
            if (orgPrice) orgPrice.value = data.organization;
        } catch (e) {
            console.error('Error loading verification pricing from localStorage:', e);
        }
    }
}

// Export functions to window
window.savePaymentGatewaySettings = savePaymentGatewaySettings;
window.saveVerificationPricing = saveVerificationPricing;
window.saveSubscriptionPricing = saveSubscriptionPricing;
window.saveAffiliateSettings = saveAffiliateSettings;
window.loadPricingSettings = loadPricingSettings;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Pricing Functions initialized');
    loadPricingSettings();
});