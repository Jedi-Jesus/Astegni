// Pricing Functions for Manage System Settings
// Handles saving all pricing-related settings

// Check if API_BASE_URL is defined
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'https://api.astegni.com';
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
            fetch(`${API_BASE_URL}/api/admin/pricing/payment-gateways`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(telebirrData)
            })
        );

        promises.push(
            fetch(`${API_BASE_URL}/api/admin/pricing/payment-gateways`, {
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
            fetch(`${API_BASE_URL}/api/admin/pricing/verification-tiers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(individualData)
            }),
            fetch(`${API_BASE_URL}/api/admin/pricing/verification-tiers`, {
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
function saveSubscriptionPricing() {
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

    // Get discount percentages for each period
    const discounts = {
        '1_month': {
            basic: parseInt(document.querySelector('input[data-period="1-month"][data-tier="basic"]')?.value) || 0,
            premium: parseInt(document.querySelector('input[data-period="1-month"][data-tier="premium"]')?.value) || 0
        },
        '3_months': {
            basic: parseInt(document.querySelector('input[data-period="3-months"][data-tier="basic"]')?.value) || 0,
            premium: parseInt(document.querySelector('input[data-period="3-months"][data-tier="premium"]')?.value) || 0
        },
        '6_months': {
            basic: parseInt(document.querySelector('input[data-period="6-months"][data-tier="basic"]')?.value) || 0,
            premium: parseInt(document.querySelector('input[data-period="6-months"][data-tier="premium"]')?.value) || 0
        },
        '9_months': {
            basic: parseInt(document.querySelector('input[data-period="9-months"][data-tier="basic"]')?.value) || 0,
            premium: parseInt(document.querySelector('input[data-period="9-months"][data-tier="premium"]')?.value) || 0
        },
        '1_year': {
            basic: parseInt(document.querySelector('input[data-period="1-year"][data-tier="basic"]')?.value) || 0,
            premium: parseInt(document.querySelector('input[data-period="1-year"][data-tier="premium"]')?.value) || 0
        }
    };

    const data = {
        base_prices: {
            basic: basicPrice,
            premium: premiumPrice
        },
        discounts: discounts
    };

    console.log('Saving subscription pricing:', data);

    // TODO: API call to save to database
    // fetch('/api/pricing-settings/subscription', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(data)
    // }).then(res => res.json()).then(result => {
    //     if (result.success) {
    //         alert('Subscription pricing saved successfully!');
    //     }
    // });

    // For now, save to localStorage
    localStorage.setItem('subscription_pricing', JSON.stringify(data));

    alert('Subscription pricing saved successfully!');
}

// Affiliate Management Settings
function saveAffiliateSettings() {
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

    const data = {
        direct_affiliate: {
            basic_commission: directBasic,
            premium_commission: directPremium,
            duration_months: directDuration
        },
        indirect_affiliate: {
            basic_commission: indirectBasic,
            premium_commission: indirectPremium,
            duration_months: indirectDuration
        },
        settings: {
            min_payout: minPayout,
            payout_schedule: payoutSchedule,
            enabled: programEnabled
        }
    };

    console.log('Saving affiliate settings:', data);

    // TODO: API call to save to database
    // fetch('/api/pricing-settings/affiliate', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(data)
    // }).then(res => res.json()).then(result => {
    //     if (result.success) {
    //         alert('Affiliate settings saved successfully!');
    //     }
    // });

    // For now, save to localStorage
    localStorage.setItem('affiliate_settings', JSON.stringify(data));

    alert('Affiliate settings saved successfully!');
}

// Load saved settings on page load
function loadPricingSettings() {
    // Load Payment Gateway Settings
    const paymentSettings = localStorage.getItem('payment_gateway_settings');
    if (paymentSettings) {
        try {
            const data = JSON.parse(paymentSettings);
            if (data.telebirr) {
                document.getElementById('telebirr-enabled').checked = data.telebirr.enabled;
                document.getElementById('telebirr-merchant-id').value = data.telebirr.merchant_id;
                document.getElementById('telebirr-api-key').value = data.telebirr.api_key;
            }
            if (data.cbe) {
                document.getElementById('cbe-enabled').checked = data.cbe.enabled;
                document.getElementById('cbe-account-number').value = data.cbe.account_number;
                document.getElementById('cbe-secret-key').value = data.cbe.secret_key;
            }
        } catch (e) {
            console.error('Error loading payment settings:', e);
        }
    }

    // Load Verification Pricing
    const verificationPricing = localStorage.getItem('verification_pricing');
    if (verificationPricing) {
        try {
            const data = JSON.parse(verificationPricing);
            document.getElementById('individual-verification-price').value = data.individual;
            document.getElementById('org-verification-price').value = data.organization;
        } catch (e) {
            console.error('Error loading verification pricing:', e);
        }
    }

    // TODO: Load other settings similarly
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
