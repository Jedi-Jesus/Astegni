// ============================================
// System Settings Enhancements
// ============================================
// This file contains new features for manage-system-settings.html:
// 1. Popular/Most Popular labels for brand packages
// 2. Feature management for subscription tiers
// 3. Live discount calculations
// 4. Database integration for affiliate performance
// 5. Drag-and-drop for brand packages

// API Configuration (check if already defined globally)
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:8000';
}
// Use window.API_BASE_URL directly throughout this file

// ============================================
// 1. Subscription Tier Feature Management
// ============================================

// Add feature to Basic Tier
function addBasicTierFeature() {
    const container = document.getElementById('basic-tier-features-container');
    const emptyState = document.getElementById('basic-features-empty-state');

    const featureId = 'basic-feature-' + Date.now();
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex gap-2 items-center';
    featureDiv.id = featureId;
    featureDiv.innerHTML = `
        <input type="text" class="flex-1 p-2 border border-blue-300 rounded text-sm" placeholder="e.g., 10GB Storage">
        <button onclick="removeFeature('${featureId}')" class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(featureDiv);
    emptyState.classList.add('hidden');
}

// Add feature to Premium Tier
function addPremiumTierFeature() {
    const container = document.getElementById('premium-tier-features-container');
    const emptyState = document.getElementById('premium-features-empty-state');

    const featureId = 'premium-feature-' + Date.now();
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex gap-2 items-center';
    featureDiv.id = featureId;
    featureDiv.innerHTML = `
        <input type="text" class="flex-1 p-2 border border-purple-300 rounded text-sm" placeholder="e.g., Unlimited Storage">
        <button onclick="removeFeature('${featureId}')" class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(featureDiv);
    emptyState.classList.add('hidden');
}

// Remove feature
function removeFeature(featureId) {
    const feature = document.getElementById(featureId);
    if (feature) {
        const container = feature.parentElement;
        feature.remove();

        // Show empty state if no features left
        if (container.children.length === 0) {
            const tierType = featureId.startsWith('basic') ? 'basic' : 'premium';
            document.getElementById(`${tierType}-features-empty-state`).classList.remove('hidden');
        }
    }
}

// Get all features for a tier
function getTierFeatures(tierType) {
    const container = document.getElementById(`${tierType}-tier-features-container`);
    const features = [];

    if (container) {
        container.querySelectorAll('input[type="text"]').forEach(input => {
            if (input.value.trim()) {
                features.push(input.value.trim());
            }
        });
    }

    return features;
}

// Export to window for use in other scripts
window.getTierFeatures = getTierFeatures;

// ============================================
// 2. Live Discount Calculations
// ============================================

function calculateLivePricing() {
    // Check if elements exist before accessing values
    const basicBasePriceEl = document.getElementById('basic-base-price');
    const premiumBasePriceEl = document.getElementById('premium-base-price');

    // If elements don't exist, silently return (pricing panel not visible)
    if (!basicBasePriceEl && !premiumBasePriceEl) {
        return;
    }

    const basicBasePrice = basicBasePriceEl ? parseFloat(basicBasePriceEl.value) || 0 : 0;
    const premiumBasePrice = premiumBasePriceEl ? parseFloat(premiumBasePriceEl.value) || 0 : 0;

    if (basicBasePrice === 0 && premiumBasePrice === 0) {
        // Reset all prices to --
        resetPricingDisplay();
        return;
    }

    // Define periods
    const periods = [
        { id: '1m', months: 1 },
        { id: '3m', months: 3 },
        { id: '6m', months: 6 },
        { id: '9m', months: 9 },
        { id: '12m', months: 12 }
    ];

    // Calculate for each period
    periods.forEach(period => {
        // Basic Tier
        if (basicBasePrice > 0) {
            const basicDiscount = parseFloat(document.getElementById(`basic-discount-${period.id}`).value) || 0;
            const basicTotal = basicBasePrice * period.months;
            const basicDiscountAmount = basicTotal * (basicDiscount / 100);
            const basicFinal = basicTotal - basicDiscountAmount;

            document.getElementById(`basic-price-${period.id}`).textContent =
                `${basicFinal.toLocaleString('en-ET')} ETB (${basicDiscount}% off)`;
        }

        // Premium Tier
        if (premiumBasePrice > 0) {
            const premiumDiscount = parseFloat(document.getElementById(`premium-discount-${period.id}`).value) || 0;
            const premiumTotal = premiumBasePrice * period.months;
            const premiumDiscountAmount = premiumTotal * (premiumDiscount / 100);
            const premiumFinal = premiumTotal - premiumDiscountAmount;

            document.getElementById(`premium-price-${period.id}`).textContent =
                `${premiumFinal.toLocaleString('en-ET')} ETB (${premiumDiscount}% off)`;
        }
    });
}

function resetPricingDisplay() {
    const periods = ['1m', '3m', '6m', '9m', '12m'];
    periods.forEach(period => {
        document.getElementById(`basic-price-${period}`).textContent = '--';
        document.getElementById(`premium-price-${period}`).textContent = '--';
    });
}

// ============================================
// 3. Affiliate Performance - Database Integration
// ============================================

async function loadAffiliatePerformanceData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Authentication required');
            return;
        }

        // Show loading state
        document.getElementById('affiliate-active-count').textContent = '...';
        document.getElementById('affiliate-referrals-count').textContent = '...';
        document.getElementById('affiliate-commissions-total').textContent = '... ETB';

        // Fetch data from API
        const response = await fetch(`${window.API_BASE_URL}/api/admin/affiliate-performance`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load affiliate data');
        }

        const data = await response.json();

        // Update UI
        document.getElementById('affiliate-active-count').textContent =
            data.active_affiliates?.toLocaleString() || '0';
        document.getElementById('affiliate-referrals-count').textContent =
            data.total_referrals?.toLocaleString() || '0';
        document.getElementById('affiliate-commissions-total').textContent =
            `${data.total_commissions?.toLocaleString('en-ET') || '0'} ETB`;

    } catch (error) {
        console.error('Error loading affiliate performance:', error);

        // Show error state
        document.getElementById('affiliate-active-count').textContent = 'Error';
        document.getElementById('affiliate-referrals-count').textContent = 'Error';
        document.getElementById('affiliate-commissions-total').textContent = 'Error';

        // Optional: Show notification to user
        alert('Failed to load affiliate performance data. Please try again.');
    }
}

// ============================================
// 4. (Brand package drag-and-drop + label helpers removed: advertising is
//     priced via CPI view tiers, not brand packages.)
// ============================================

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Load affiliate performance data on page load
    if (document.getElementById('affiliate-active-count')) {
        loadAffiliatePerformanceData();
    }

    // Initial pricing calculation if values exist
    calculateLivePricing();

    console.log('System Settings Enhancements loaded successfully');
});

// Panel change event listener - reload affiliate data when pricing panel is shown
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        setTimeout(() => {
            if (document.getElementById('affiliate-active-count')) {
                loadAffiliatePerformanceData();
            }
        }, 100);
    }
});
