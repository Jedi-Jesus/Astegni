// Subscription Plan Manager
// Handles STORAGE-BASED subscription plan management with TWO types of discounts:
// 1. Package-based discount: Calculated from base plan's price per GB
//    (e.g., 1TB plan cheaper per GB than 64GB base plan)
// 2. Upfront payment discount: For subscribers who pay multiple months at once
//    (e.g., 5% off for paying 3 months upfront, 10% for 6 months, 20% for yearly)

// API Configuration (check if already defined globally)
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:8000';
}

// Subscription Plans State
let subscriptionPlans = [];
let subscriptionBasePlan = null; // The base plan for package-based discount calculations
let currentSubscriptionTab = 'tutor'; // Currently active subscription type tab

// Load Subscription Plans from API
async function loadSubscriptionPlans() {
    console.log('loadSubscriptionPlans() called');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No auth token found, loading default plans');
            subscriptionPlans = getDefaultSubscriptionPlans();
            renderSubscriptionPlans();
            return;
        }

        console.log('Fetching plans from API...');
        const response = await fetch(`${window.API_BASE_URL}/api/admin-db/subscription-plans`, {
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
            // Map database format to UI format - storage-based subscriptions
            subscriptionPlans = data.plans.map(plan => ({
                id: plan.id,
                plan_name: plan.package_title || plan.plan_name || plan.name,
                monthly_price: plan.package_price || plan.monthly_price || plan.price || 0,
                storage_gb: plan.storage_gb || plan.duration_days || 64, // Default 64GB (base plan)
                subscription_type: plan.subscription_type || 'tutor',
                currency: plan.currency || 'ETB',
                features: plan.features || [],
                label: plan.label || 'none',
                is_popular: plan.label === 'popular' || plan.is_popular || false,
                is_base_package: plan.is_base_package || false, // Base plan for package discount calculation
                is_active: plan.is_active !== false,
                display_order: plan.display_order || 0,
                // Upfront payment discount tiers
                discount_3_months: plan.discount_3_months || 5,
                discount_6_months: plan.discount_6_months || 10,
                discount_yearly: plan.discount_yearly || 20
            }));

            // Find and store the base plan for package-based discount calculations
            findSubscriptionBasePlan();

            console.log(`Loaded ${subscriptionPlans.length} storage-based plans from database`);
            if (subscriptionBasePlan) {
                console.log(`Base plan: ${subscriptionBasePlan.plan_name} at ${(subscriptionBasePlan.monthly_price / subscriptionBasePlan.storage_gb).toFixed(2)} ETB/GB`);
            }
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
            storage_gb: 64,
            features: ['Access to basic features', '64 GB storage', 'Email support', 'Basic analytics'],
            discount_3_months: 5,
            discount_6_months: 10,
            discount_yearly: 20,
            is_popular: false,
            is_base_package: true, // This is the base plan
            is_active: true,
            display_order: 1
        },
        {
            id: 2,
            plan_name: 'Premium',
            monthly_price: 199,
            storage_gb: 256,
            features: ['All basic features', '256 GB storage', 'Priority support', 'Advanced analytics', 'API access', 'Custom branding'],
            discount_3_months: 10,
            discount_6_months: 15,
            discount_yearly: 25,
            is_popular: true,
            is_base_package: false,
            is_active: true,
            display_order: 2
        }
    ];
}

// Find and store the base plan for package-based discount calculations
function findSubscriptionBasePlan() {
    subscriptionBasePlan = subscriptionPlans.find(p => p.is_base_package) || null;
    return subscriptionBasePlan;
}

// Toggle base plan status (called from HTML checkbox)
function toggleSubscriptionBasePlan() {
    const checkbox = document.getElementById('subscription-is-base-plan');
    const basePlanNotice = document.getElementById('subscription-base-plan-notice');
    const packageDiscountSection = document.getElementById('subscription-package-discount-section');

    if (checkbox && checkbox.checked) {
        // Show base plan notice, hide package discount section
        if (basePlanNotice) basePlanNotice.classList.remove('hidden');
        if (packageDiscountSection) packageDiscountSection.classList.add('hidden');
    } else {
        // Hide base plan notice, show package discount section
        if (basePlanNotice) basePlanNotice.classList.add('hidden');
        if (packageDiscountSection) packageDiscountSection.classList.remove('hidden');
    }

    // Recalculate preview to update package discount display
    calculateSubscriptionPreview();
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
            const storageGB = parseInt(plan.storage_gb) || 64;

            // Calculate tier prices (upfront payment discounts)
            const discount3 = plan.discount_3_months || 5;
            const discount6 = plan.discount_6_months || 10;
            const discountYearly = plan.discount_yearly || 20;
            const yearlyPrice = Math.round(monthlyPrice * 12 * (1 - discountYearly / 100));

            // Calculate price per GB and package discount
            const pricePerGB = storageGB > 0 ? (monthlyPrice / storageGB) : 0;
            let packageDiscount = 0;
            if (subscriptionBasePlan && !plan.is_base_package && storageGB > 0) {
                const basePricePerGB = subscriptionBasePlan.storage_gb > 0 ?
                    (subscriptionBasePlan.monthly_price / subscriptionBasePlan.storage_gb) : 0;
                if (basePricePerGB > 0 && pricePerGB < basePricePerGB) {
                    packageDiscount = Math.round(((basePricePerGB - pricePerGB) / basePricePerGB) * 100);
                }
            }

            // Upfront yearly payment discount badge
            const yearlyBadge = discountYearly > 0 ?
                `<span class="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">Pay Yearly: ${discountYearly}% OFF</span>` : '';

            // Package discount badge (vs base plan)
            const packageDiscountBadge = packageDiscount > 0 ?
                `<span class="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">Pkg: ${packageDiscount}% OFF</span>` : '';

            // Base plan badge
            const basePlanBadge = plan.is_base_package ?
                `<span class="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">BASE PLAN</span>` : '';

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
                        ${basePlanBadge}
                        ${packageDiscountBadge}
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

                    <!-- Monthly Price & Storage -->
                    <div class="text-center mb-4 p-3 bg-white/50 rounded-lg border">
                        <div class="text-3xl font-bold text-${color.text}">${monthlyPrice.toLocaleString()} ETB</div>
                        <div class="text-sm text-gray-600">/month</div>
                        <div class="flex items-center justify-center gap-2 mt-2 text-blue-600">
                            <i class="fas fa-database"></i>
                            <span class="font-semibold">${storageGB} GB Storage</span>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">${pricePerGB.toFixed(2)} ETB/GB</div>
                        <div class="text-xs text-gray-500">Pay yearly: ${yearlyPrice.toLocaleString()} ETB (${discountYearly}% off)</div>
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

    // Reset storage amount to default 64 GB (typical base plan)
    const storageEl = document.getElementById('subscription-plan-storage');
    if (storageEl) storageEl.value = '64';

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

    // Reset base plan checkbox
    const basePlanCheckbox = document.getElementById('subscription-is-base-plan');
    if (basePlanCheckbox) basePlanCheckbox.checked = false;

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

    // Update current base plan info display
    updateCurrentBasePlanInfo();

    // Show/hide base plan sections appropriately
    toggleSubscriptionBasePlan();

    // Reset preview
    calculateSubscriptionPreview();

    modal.classList.remove('hidden');
}

// Update current base plan info display in modal
function updateCurrentBasePlanInfo() {
    const infoEl = document.getElementById('subscription-current-base-info');
    const nameEl = document.getElementById('subscription-current-base-name');
    const pricePerGBEl = document.getElementById('subscription-current-base-price-per-gb');

    if (!infoEl) return;

    if (subscriptionBasePlan) {
        const basePricePerGB = subscriptionBasePlan.storage_gb > 0 ?
            (subscriptionBasePlan.monthly_price / subscriptionBasePlan.storage_gb) : 0;

        if (nameEl) nameEl.textContent = subscriptionBasePlan.plan_name;
        if (pricePerGBEl) pricePerGBEl.textContent = basePricePerGB.toFixed(2);
        infoEl.classList.remove('hidden');
    } else {
        infoEl.classList.add('hidden');
    }
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

    // Set storage amount (stored as storage_gb)
    const storageEl = document.getElementById('subscription-plan-storage');
    if (storageEl) storageEl.value = plan.storage_gb || 64;

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

    // Set base plan checkbox
    const basePlanCheckbox = document.getElementById('subscription-is-base-plan');
    if (basePlanCheckbox) basePlanCheckbox.checked = plan.is_base_package || false;

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

    // Update current base plan info display
    updateCurrentBasePlanInfo();

    // Show/hide base plan sections appropriately
    toggleSubscriptionBasePlan();

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

// Calculate Price Preview with discount tiers (storage-based subscription)
function calculateSubscriptionPreview() {
    const monthlyPrice = parseFloat(document.getElementById('subscription-plan-price')?.value) || 0;
    const storageGB = parseInt(document.getElementById('subscription-plan-storage')?.value) || 64;
    const isBasePlan = document.getElementById('subscription-is-base-plan')?.checked || false;

    // Get upfront payment discount tier values
    const discount3 = parseFloat(document.getElementById('subscription-discount-3-months')?.value) || 0;
    const discount6 = parseFloat(document.getElementById('subscription-discount-6-months')?.value) || 0;
    const discountYearly = parseFloat(document.getElementById('subscription-discount-yearly')?.value) || 0;

    // Calculate tier prices (upfront payment discounts)
    const price3Months = Math.round(monthlyPrice * 3 * (1 - discount3 / 100));
    const price6Months = Math.round(monthlyPrice * 6 * (1 - discount6 / 100));
    const priceYearly = Math.round(monthlyPrice * 12 * (1 - discountYearly / 100));

    // Calculate price per GB
    const pricePerGB = storageGB > 0 ? (monthlyPrice / storageGB) : 0;

    // Calculate package-based discount (vs base plan)
    let packageDiscount = 0;
    let basePricePerGB = 0;
    if (subscriptionBasePlan && !isBasePlan && storageGB > 0) {
        basePricePerGB = subscriptionBasePlan.storage_gb > 0 ?
            (subscriptionBasePlan.monthly_price / subscriptionBasePlan.storage_gb) : 0;
        if (basePricePerGB > 0 && pricePerGB < basePricePerGB) {
            packageDiscount = Math.round(((basePricePerGB - pricePerGB) / basePricePerGB) * 100);
        }
    }

    // Format helpers
    const formatPrice = (price) => monthlyPrice > 0 ? `${Math.round(price).toLocaleString()} ETB` : '-- ETB';

    // Monthly price display
    const monthlyEl = document.getElementById('preview-monthly-price');
    if (monthlyEl) monthlyEl.textContent = formatPrice(monthlyPrice);

    // Storage amount display
    const storageEl = document.getElementById('preview-storage-amount');
    if (storageEl) storageEl.textContent = `${storageGB} GB`;

    // Price per GB display
    const pricePerGBEl = document.getElementById('subscription-price-per-gb');
    if (pricePerGBEl) pricePerGBEl.textContent = pricePerGB > 0 ? `${pricePerGB.toFixed(2)} ETB/GB` : '-- ETB/GB';

    // Package discount display (vs base plan)
    const baseRateEl = document.getElementById('subscription-base-rate-display');
    const thisRateEl = document.getElementById('subscription-this-rate-display');
    const packageDiscountEl = document.getElementById('subscription-package-discount');
    if (baseRateEl) baseRateEl.textContent = basePricePerGB > 0 ? `${basePricePerGB.toFixed(2)} ETB/GB` : '-- ETB/GB';
    if (thisRateEl) thisRateEl.textContent = pricePerGB > 0 ? `${pricePerGB.toFixed(2)} ETB/GB` : '-- ETB/GB';
    if (packageDiscountEl) packageDiscountEl.textContent = packageDiscount > 0 ? `${packageDiscount}%` : '--%';

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
        storageGB,
        pricePerGB,
        packageDiscount,
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
    const storageGB = parseInt(document.getElementById('subscription-plan-storage')?.value) || 64;
    const subscriptionType = document.getElementById('subscription-plan-type')?.value || 'tutor';

    // Get base plan status
    const isBasePlan = document.getElementById('subscription-is-base-plan')?.checked || false;

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
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        // Storage-based subscription plan data with TWO discount types:
        // 1. is_base_package - for package-based discount calculation
        // 2. discount_*_months - for upfront payment discounts
        const planData = {
            package_title: planName,
            package_price: monthlyPrice,
            duration_days: storageGB, // Repurpose duration_days as storage_gb for now
            subscription_type: subscriptionType,
            currency: 'ETB',
            features: features,
            label: label,
            is_active: true,
            is_base_package: isBasePlan, // For package-based discount calculation
            // Upfront payment discount tier values
            discount_3_months: discount3Months,
            discount_6_months: discount6Months,
            discount_yearly: discountYearly
        };

        console.log('Saving storage-based subscription plan:', planData);

        let response;
        if (id) {
            // Update existing plan
            response = await fetch(`${window.API_BASE_URL}/api/admin-db/subscription-plans/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            });
        } else {
            // Create new plan
            response = await fetch(`${window.API_BASE_URL}/api/admin-db/subscription-plans`, {
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
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin-db/subscription-plans/${id}`, {
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
window.toggleSubscriptionBasePlan = toggleSubscriptionBasePlan;
window.updateCurrentBasePlanInfo = updateCurrentBasePlanInfo;
window.findSubscriptionBasePlan = findSubscriptionBasePlan;
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
