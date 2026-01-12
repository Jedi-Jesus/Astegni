// Subscription Plan Manager
// Handles subscription plan management with upfront payment discounts:
// - Upfront payment discount: For subscribers who pay multiple months at once
//   (e.g., 5% off for paying 3 months upfront, 10% for 6 months, 20% for yearly)
// Note: Storage limits are managed separately in Media Management section

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

// Subscription Plans State
let subscriptionPlans = [];
let currentSubscriptionTab = 'tutor'; // Currently active subscription type tab

// Load Subscription Plans from API
async function loadSubscriptionPlans() {
    console.log('loadSubscriptionPlans() called');

    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('No auth token found, loading default plans');
            subscriptionPlans = getDefaultSubscriptionPlans();
            renderSubscriptionPlans();
            return;
        }

        const apiUrl = getApiBaseUrl();
        console.log('Fetching plans from API...', apiUrl);
        const response = await fetch(`${apiUrl}/api/admin-db/subscription-plans`, {
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

        if (data.success && data.plans) {
            // Map database format to UI format
            subscriptionPlans = data.plans.map(plan => ({
                id: plan.id,
                plan_name: plan.package_title || plan.plan_name || plan.name,
                monthly_price: plan.package_price || plan.monthly_price || plan.price || 0,
                subscription_type: plan.subscription_type || 'tutor',
                currency: plan.currency || 'ETB',
                features: plan.features || [],
                label: plan.label || 'none',
                is_popular: plan.label === 'popular' || plan.is_popular || false,
                is_active: plan.is_active !== false,
                display_order: plan.display_order || 0,
                // Upfront payment discount tiers
                discount_3_months: plan.discount_3_months || 5,
                discount_6_months: plan.discount_6_months || 10,
                discount_yearly: plan.discount_yearly || 20
            }));

            console.log(`Loaded ${subscriptionPlans.length} subscription plans from database`);
            renderSubscriptionPlans();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading subscription plans from API:', error);
        // Fallback to default plans
        subscriptionPlans = getDefaultSubscriptionPlans();
        renderSubscriptionPlans();
    }
}

// Get Default Plans
function getDefaultSubscriptionPlans() {
    return [
        {
            id: 1,
            plan_name: 'Basic',
            monthly_price: 99,
            features: ['Access to basic features', 'Email support', 'Basic analytics'],
            discount_3_months: 5,
            discount_6_months: 10,
            discount_yearly: 20,
            is_popular: false,
            is_active: true,
            display_order: 1
        },
        {
            id: 2,
            plan_name: 'Premium',
            monthly_price: 199,
            features: ['All basic features', 'Priority support', 'Advanced analytics', 'API access', 'Custom branding'],
            discount_3_months: 10,
            discount_6_months: 15,
            discount_yearly: 25,
            is_popular: true,
            is_active: true,
            display_order: 2
        }
    ];
}


// Switch subscription tab
function switchSubscriptionTab(tabType) {
    console.log('Switching to subscription tab:', tabType);
    currentSubscriptionTab = tabType;

    // Update tab button styles
    const tabs = document.querySelectorAll('.subscription-tab');
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabType) {
            tab.classList.add('active', 'bg-purple-100', 'text-purple-700', 'border-purple-500');
            tab.classList.remove('text-gray-600', 'hover:bg-gray-100');
        } else {
            tab.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'border-purple-500');
            tab.classList.add('text-gray-600', 'hover:bg-gray-100');
        }
    });

    // Show/hide tab panels
    const panels = document.querySelectorAll('.subscription-tab-panel');
    panels.forEach(panel => {
        if (panel.id === `subscription-tab-${tabType}`) {
            panel.classList.remove('hidden');
            panel.classList.add('active');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('active');
        }
    });
}

// Update tab counts
function updateSubscriptionTabCounts() {
    const types = ['tutor', 'student', 'parent', 'institute', 'advertiser'];
    types.forEach(type => {
        const count = subscriptionPlans.filter(p => (p.subscription_type || 'tutor') === type).length;
        const tab = document.querySelector(`.subscription-tab[data-tab="${type}"] .tab-count`);
        if (tab) {
            tab.textContent = count;
        }
    });
}

// Render Subscription Plans (organized by tabs)
function renderSubscriptionPlans() {
    console.log('renderSubscriptionPlans() called with', subscriptionPlans.length, 'plans');

    // Update tab counts first
    updateSubscriptionTabCounts();

    const types = ['tutor', 'student', 'parent', 'institute', 'advertiser'];

    types.forEach(type => {
        const grid = document.querySelector(`.subscription-plans-grid[data-type="${type}"]`);
        if (!grid) {
            console.error(`Grid for type ${type} not found`);
            return;
        }

        // Filter plans for this type
        const typePlans = subscriptionPlans.filter(p => (p.subscription_type || 'tutor') === type);

        if (typePlans.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <i class="fas fa-crown text-4xl mb-4 opacity-50"></i>
                    <p class="text-lg font-semibold">No ${type} plans yet</p>
                    <p class="text-sm">Click "Add Plan" to create a subscription plan for ${type}s</p>
                </div>
            `;
            return;
        }

        const colors = [
            { border: 'blue-300', bg: 'blue-50', text: 'blue-700', gradient: 'from-blue-500 to-blue-600' },
            { border: 'purple-300', bg: 'purple-50', text: 'purple-700', gradient: 'from-purple-500 to-purple-600' },
            { border: 'indigo-300', bg: 'indigo-50', text: 'indigo-700', gradient: 'from-indigo-500 to-indigo-600' },
            { border: 'teal-300', bg: 'teal-50', text: 'teal-700', gradient: 'from-teal-500 to-teal-600' },
            { border: 'pink-300', bg: 'pink-50', text: 'pink-700', gradient: 'from-pink-500 to-pink-600' }
        ];

        grid.innerHTML = typePlans.map((plan, index) => {
            const color = colors[index % colors.length];
            const monthlyPrice = parseFloat(plan.monthly_price) || 0;

            // Calculate tier prices (upfront payment discounts)
            const discountYearly = plan.discount_yearly || 20;
            const yearlyPrice = Math.round(monthlyPrice * 12 * (1 - discountYearly / 100));

            // Upfront yearly payment discount badge
            const yearlyBadge = discountYearly > 0 ?
                `<span class="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">Pay Yearly: ${discountYearly}% OFF</span>` : '';

            // Popular badge
            const popularBadge = plan.is_popular ? `
                <span class="px-2 py-0.5 bg-gradient-to-r ${color.gradient} text-white text-xs font-bold rounded">POPULAR</span>
            ` : '';

            // Features list (show max 4)
            const features = plan.features || [];
            const displayFeatures = features.slice(0, 4);
            const moreFeatures = features.length > 4 ? `<div class="text-xs text-gray-500 mt-1">+${features.length - 4} more features</div>` : '';

            return `
                <div class="border-2 border-${color.border} rounded-xl p-5 bg-${color.bg} hover:shadow-xl transition-all relative cursor-pointer group"
                    onclick="editSubscriptionPlan(${plan.id})" title="Click to edit">

                    <!-- Badges (Top Right) -->
                    <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        ${yearlyBadge}
                        ${popularBadge}
                    </div>

                    <button onclick="event.stopPropagation(); deleteSubscriptionPlan(${plan.id})"
                        class="absolute top-2 left-2 w-7 h-7 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete plan">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="text-center mb-4 mt-3">
                        <h4 class="text-xl font-bold text-${color.text}">${plan.plan_name}</h4>
                    </div>

                    <!-- Monthly Price -->
                    <div class="text-center mb-4 p-3 bg-white/50 rounded-lg border">
                        <div class="text-3xl font-bold text-${color.text}">${monthlyPrice.toLocaleString()} ETB</div>
                        <div class="text-sm text-gray-600">/month</div>
                        <div class="text-xs text-gray-500 mt-2">Pay yearly: ${yearlyPrice.toLocaleString()} ETB (${discountYearly}% off)</div>
                    </div>

                    <!-- Features -->
                    <div class="text-xs space-y-1 text-gray-700 border-t pt-3">
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
    });

    console.log(`Successfully rendered ${subscriptionPlans.length} plan cards across tabs`);
}

// Open Modal for Adding Plan
function openAddSubscriptionPlanModal() {
    const modal = document.getElementById('subscription-plan-modal');
    if (!modal) {
        console.error('Subscription plan modal not found');
        return;
    }

    document.getElementById('subscription-modal-title').innerHTML =
        '<i class="fas fa-crown mr-2"></i>Add Subscription Plan';
    document.getElementById('subscription-plan-form').reset();
    document.getElementById('subscription-plan-id').value = '';

    // Pre-select current tab's subscription type
    const subscriptionTypeEl = document.getElementById('subscription-plan-type');
    if (subscriptionTypeEl) subscriptionTypeEl.value = currentSubscriptionTab || 'tutor';

    // Reset discount tier inputs to defaults
    const discount3El = document.getElementById('subscription-discount-3-months');
    const discount6El = document.getElementById('subscription-discount-6-months');
    const discountYearlyEl = document.getElementById('subscription-discount-yearly');
    if (discount3El) discount3El.value = '5';
    if (discount6El) discount6El.value = '10';
    if (discountYearlyEl) discountYearlyEl.value = '20';

    // Reset label radio buttons
    const labelRadios = document.querySelectorAll('input[name="subscription-plan-label"]');
    labelRadios.forEach(radio => {
        radio.checked = radio.value === 'none';
    });

    // Clear features container and show empty state
    const featuresContainer = document.getElementById('subscription-features-container');
    const emptyState = document.getElementById('subscription-features-empty-state');
    if (featuresContainer) {
        featuresContainer.innerHTML = '';
    }
    if (emptyState) {
        emptyState.style.display = 'block';
    }

    // Reset preview
    calculateSubscriptionPreview();

    modal.classList.remove('hidden');
}

// Edit Plan
function editSubscriptionPlan(id) {
    const plan = subscriptionPlans.find(p => p.id === id);
    if (!plan) {
        console.error('Plan not found:', id);
        return;
    }

    document.getElementById('subscription-modal-title').innerHTML =
        '<i class="fas fa-crown mr-2"></i>Edit Subscription Plan';
    document.getElementById('subscription-plan-id').value = plan.id;
    document.getElementById('subscription-plan-name').value = plan.plan_name;
    document.getElementById('subscription-plan-price').value = plan.monthly_price || 0;

    // Set subscription type
    const subscriptionTypeEl = document.getElementById('subscription-plan-type');
    if (subscriptionTypeEl) subscriptionTypeEl.value = plan.subscription_type || 'tutor';

    // Set discount tier values (upfront payment discounts)
    const discount3El = document.getElementById('subscription-discount-3-months');
    const discount6El = document.getElementById('subscription-discount-6-months');
    const discountYearlyEl = document.getElementById('subscription-discount-yearly');
    if (discount3El) discount3El.value = plan.discount_3_months || 5;
    if (discount6El) discount6El.value = plan.discount_6_months || 10;
    if (discountYearlyEl) discountYearlyEl.value = plan.discount_yearly || 20;

    // Set label
    const labelRadios = document.querySelectorAll('input[name="subscription-plan-label"]');
    labelRadios.forEach(radio => {
        radio.checked = plan.is_popular ? radio.value === 'popular' : radio.value === 'none';
    });

    // Load features
    const featuresContainer = document.getElementById('subscription-features-container');
    const emptyState = document.getElementById('subscription-features-empty-state');
    if (featuresContainer) {
        featuresContainer.innerHTML = '';
        if (plan.features && plan.features.length > 0) {
            plan.features.forEach(feature => addSubscriptionPlanFeature(feature));
            if (emptyState) emptyState.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'block';
        }
    }

    // Update preview
    calculateSubscriptionPreview();

    const modal = document.getElementById('subscription-plan-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close Modal
function closeSubscriptionPlanModal() {
    const modal = document.getElementById('subscription-plan-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Calculate Price Preview with upfront payment discounts
function calculateSubscriptionPreview() {
    const monthlyPrice = parseFloat(document.getElementById('subscription-plan-price')?.value) || 0;

    // Get upfront payment discount tier values
    const discount3 = parseFloat(document.getElementById('subscription-discount-3-months')?.value) || 0;
    const discount6 = parseFloat(document.getElementById('subscription-discount-6-months')?.value) || 0;
    const discountYearly = parseFloat(document.getElementById('subscription-discount-yearly')?.value) || 0;

    // Calculate tier prices (upfront payment discounts)
    const price3Months = Math.round(monthlyPrice * 3 * (1 - discount3 / 100));
    const price6Months = Math.round(monthlyPrice * 6 * (1 - discount6 / 100));
    const priceYearly = Math.round(monthlyPrice * 12 * (1 - discountYearly / 100));

    // Format helpers
    const formatPrice = (price) => monthlyPrice > 0 ? `${Math.round(price).toLocaleString()} ETB` : '-- ETB';

    // Monthly price display
    const monthlyEl = document.getElementById('preview-monthly-price');
    if (monthlyEl) monthlyEl.textContent = formatPrice(monthlyPrice);

    // 3 Months pricing
    const price3El = document.getElementById('preview-3-month-price');
    const discount3El = document.getElementById('preview-3-month-discount');
    if (price3El) price3El.textContent = formatPrice(price3Months);
    if (discount3El) discount3El.textContent = discount3 > 0 ? `(${discount3}% off)` : '';

    // 6 Months pricing
    const price6El = document.getElementById('preview-6-month-price');
    const discount6El = document.getElementById('preview-6-month-discount');
    if (price6El) price6El.textContent = formatPrice(price6Months);
    if (discount6El) discount6El.textContent = discount6 > 0 ? `(${discount6}% off)` : '';

    // Yearly pricing
    const priceYearlyEl = document.getElementById('preview-yearly-price');
    const discountYearlyEl = document.getElementById('preview-yearly-discount');
    if (priceYearlyEl) priceYearlyEl.textContent = formatPrice(priceYearly);
    if (discountYearlyEl) discountYearlyEl.textContent = discountYearly > 0 ? `(${discountYearly}% off)` : '';

    return {
        monthlyPrice,
        discount3,
        discount6,
        discountYearly,
        price3Months,
        price6Months,
        priceYearly
    };
}

// Save Plan
async function saveSubscriptionPlan(event) {
    event.preventDefault();

    const id = document.getElementById('subscription-plan-id').value;
    const planName = document.getElementById('subscription-plan-name').value.trim();
    const monthlyPrice = parseFloat(document.getElementById('subscription-plan-price').value);
    const subscriptionType = document.getElementById('subscription-plan-type')?.value || 'tutor';

    // Get upfront payment discount tier values
    const discount3Months = parseFloat(document.getElementById('subscription-discount-3-months')?.value) || 5;
    const discount6Months = parseFloat(document.getElementById('subscription-discount-6-months')?.value) || 10;
    const discountYearly = parseFloat(document.getElementById('subscription-discount-yearly')?.value) || 20;

    // Get label
    const selectedLabel = document.querySelector('input[name="subscription-plan-label"]:checked');
    const label = selectedLabel ? selectedLabel.value : 'none';

    // Collect features
    const features = [];
    const featureInputs = document.querySelectorAll('.subscription-feature-input');
    featureInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            features.push(value);
        }
    });

    // Validation
    if (!planName) {
        alert('Please enter a plan name');
        return;
    }
    if (isNaN(monthlyPrice) || monthlyPrice < 0) {
        alert('Please enter a valid monthly price');
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();

        // Subscription plan data with upfront payment discounts
        const planData = {
            package_title: planName,
            package_price: monthlyPrice,
            subscription_type: subscriptionType,
            currency: 'ETB',
            features: features,
            label: label,
            is_active: true,
            // Upfront payment discount tier values
            discount_3_months: discount3Months,
            discount_6_months: discount6Months,
            discount_yearly: discountYearly
        };

        console.log('Saving subscription plan:', planData);

        let response;
        if (id) {
            // Update existing plan
            response = await fetch(`${apiUrl}/api/admin-db/subscription-plans/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            });
        } else {
            // Create new plan
            response = await fetch(`${apiUrl}/api/admin-db/subscription-plans`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            });
        }

        if (!response.ok) {
            throw new Error('Failed to save plan');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save plan');
        }

        // Reload plans from database
        await loadSubscriptionPlans();
        closeSubscriptionPlanModal();

        alert('Subscription plan saved successfully!');

    } catch (error) {
        console.error('Error saving subscription plan:', error);
        alert('Failed to save subscription plan. Please try again.');
    }
}

// Delete Plan
async function deleteSubscriptionPlan(id) {
    const plan = subscriptionPlans.find(p => p.id === id);
    if (!plan) return;

    if (!confirm(`Are you sure you want to delete "${plan.plan_name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin-db/subscription-plans/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete plan');
        }

        // Reload plans from database
        await loadSubscriptionPlans();
        alert('Plan deleted successfully!');

    } catch (error) {
        console.error('Error deleting subscription plan:', error);
        alert('Failed to delete subscription plan. Please try again.');
    }
}

// ============================================
// PLAN FEATURES MANAGEMENT FUNCTIONS
// ============================================

// Add Plan Feature
function addSubscriptionPlanFeature(value = '') {
    const featuresContainer = document.getElementById('subscription-features-container');
    const emptyState = document.getElementById('subscription-features-empty-state');

    if (!featuresContainer) {
        console.error('Subscription features container not found');
        return;
    }

    // Hide empty state when adding first item
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    const featureId = 'sub-feature-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const featureItem = document.createElement('div');
    featureItem.className = 'flex items-center gap-2';
    featureItem.id = featureId;

    featureItem.innerHTML = `
        <div class="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <i class="fas fa-check-circle text-purple-600"></i>
            <input type="text" class="subscription-feature-input flex-1 bg-transparent border-0 focus:outline-none text-sm"
                placeholder="e.g., Unlimited storage, Priority support" value="${value}">
        </div>
        <button type="button" onclick="removeSubscriptionPlanFeature('${featureId}')"
            class="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm"
            title="Remove this feature">
            <i class="fas fa-times"></i>
        </button>
    `;

    featuresContainer.appendChild(featureItem);

    // Auto-focus on the new input
    const newInput = featureItem.querySelector('.subscription-feature-input');
    if (newInput && !value) {
        newInput.focus();
    }
}

// Remove Plan Feature
function removeSubscriptionPlanFeature(featureId) {
    const featureItem = document.getElementById(featureId);
    if (featureItem) {
        featureItem.remove();
    }

    // Show empty state if no features remain
    const featuresContainer = document.getElementById('subscription-features-container');
    const emptyState = document.getElementById('subscription-features-empty-state');
    if (featuresContainer && featuresContainer.children.length === 0 && emptyState) {
        emptyState.style.display = 'block';
    }
}

// Export functions to window for HTML onclick handlers
window.openAddSubscriptionPlanModal = openAddSubscriptionPlanModal;
window.editSubscriptionPlan = editSubscriptionPlan;
window.closeSubscriptionPlanModal = closeSubscriptionPlanModal;
window.saveSubscriptionPlan = saveSubscriptionPlan;
window.deleteSubscriptionPlan = deleteSubscriptionPlan;
window.loadSubscriptionPlans = loadSubscriptionPlans;
window.addSubscriptionPlanFeature = addSubscriptionPlanFeature;
window.removeSubscriptionPlanFeature = removeSubscriptionPlanFeature;
window.calculateSubscriptionPreview = calculateSubscriptionPreview;
window.switchSubscriptionTab = switchSubscriptionTab;
window.updateSubscriptionTabCounts = updateSubscriptionTabCounts;

// ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('subscription-plan-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeSubscriptionPlanModal();
        }
    }
});

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Subscription Plan Manager initialized');

    // Check if grid exists
    const grid = document.getElementById('subscription-plans-grid');
    if (grid) {
        console.log('subscription-plans-grid found, loading plans...');
        loadSubscriptionPlans();
    } else {
        console.log('subscription-plans-grid NOT FOUND on page load');
        // Try again after a delay (panel might not be rendered yet)
        setTimeout(() => {
            const gridDelayed = document.getElementById('subscription-plans-grid');
            if (gridDelayed) {
                console.log('subscription-plans-grid found after delay, loading plans...');
                loadSubscriptionPlans();
            }
        }, 500);
    }
});

// Also load when pricing panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        console.log('Pricing panel activated, loading subscription plans...');
        setTimeout(() => loadSubscriptionPlans(), 100);
    }
});
