/**
 * Subscription Modal Manager
 * Fetches subscription plans from database based on user role (tutor/student)
 * and renders them dynamically in the subscription modal.
 */

(function() {
    'use strict';

    // State
    let selectedPlanData = {};
    let currentSubscription = null;
    let loadedPlans = [];
    let currentSubscriptionType = 'tutor'; // Default to tutor

    // API Configuration
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

    /**
     * Get the current user's subscription type based on their active role
     * @returns {string} 'tutor', 'student', 'parent', or 'advertiser'
     */
    function getCurrentSubscriptionType() {
        // Check various sources for the current role
        // 1. Check window.currentRole (set by profile pages)
        if (window.currentRole) {
            return window.currentRole.toLowerCase();
        }

        // 2. Check localStorage for activeRole
        const activeRole = localStorage.getItem('activeRole');
        if (activeRole) {
            return activeRole.toLowerCase();
        }

        // 3. Check URL path to determine profile type
        const path = window.location.pathname.toLowerCase();
        if (path.includes('tutor-profile') || path.includes('tutor')) {
            return 'tutor';
        }
        if (path.includes('student-profile') || path.includes('student')) {
            return 'student';
        }
        if (path.includes('parent-profile') || path.includes('parent')) {
            return 'parent';
        }
        if (path.includes('advertiser-profile') || path.includes('advertiser')) {
            return 'advertiser';
        }

        // 4. Check for user object
        if (window.user && window.user.role) {
            return window.user.role.toLowerCase();
        }

        // Default to tutor
        return 'tutor';
    }

    /**
     * Fetch subscription plans from the API
     * @param {string} subscriptionType - 'tutor' or 'student'
     * @returns {Promise<Array>} Array of subscription plans
     */
    async function fetchSubscriptionPlans(subscriptionType) {
        try {
            const url = `${API_BASE_URL}/api/admin-db/subscription-plans?subscription_type=${subscriptionType}`;
            console.log('[SubscriptionModal] Fetching plans from:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.plans) {
                console.log(`[SubscriptionModal] Loaded ${data.plans.length} ${subscriptionType} plans`);
                return data.plans;
            }

            return [];
        } catch (error) {
            console.error('[SubscriptionModal] Failed to fetch plans:', error);
            throw error;
        }
    }

    /**
     * Get the base package from loaded plans
     * @returns {Object|null} Base package plan or null
     */
    function getBasePackage() {
        return loadedPlans.find(p => p.is_base_package || p.isBase) || null;
    }

    /**
     * Calculate package discount compared to base package price-per-GB
     * @param {Object} plan - Current plan
     * @param {Object} basePackage - Base package for comparison
     * @returns {number} Discount percentage (0-100)
     */
    function calculatePackageDiscount(plan, basePackage) {
        if (!basePackage) return 0;

        const planPrice = parseFloat(plan.package_price || plan.monthly_price || 0);
        const planStorage = plan.duration_days || plan.storage_gb || 0;
        const basePrice = parseFloat(basePackage.package_price || basePackage.monthly_price || 0);
        const baseStorage = basePackage.duration_days || basePackage.storage_gb || 0;

        // Can't calculate for free plans or if storage is 0
        if (planPrice === 0 || planStorage === 0 || basePrice === 0 || baseStorage === 0) {
            return 0;
        }

        // Calculate price per GB
        const basePricePerGB = basePrice / baseStorage;
        const planPricePerGB = planPrice / planStorage;

        // If this IS the base package, no discount
        if (plan.is_base_package || plan.isBase) {
            return 0;
        }

        // Calculate discount percentage
        const discount = ((basePricePerGB - planPricePerGB) / basePricePerGB) * 100;

        // Return 0 if no discount or negative (shouldn't happen)
        return discount > 0 ? Math.round(discount) : 0;
    }

    /**
     * Render a single subscription plan card
     * @param {Object} plan - Plan data from API
     * @param {number} index - Plan index for styling
     * @returns {string} HTML string for the plan card
     */
    function renderPlanCard(plan, index) {
        const planId = plan.id;
        const planName = plan.package_title || plan.name || 'Untitled';
        const price = parseFloat(plan.package_price || plan.monthly_price || 0);
        const storageGB = plan.duration_days || plan.storage_gb || 0; // duration_days is repurposed as storage_gb
        const currency = plan.currency || 'ETB';
        const features = plan.features || [];
        const label = plan.label || 'none';
        const isPopular = label === 'popular' || label === 'recommended';
        const isFree = price === 0;
        const isBase = plan.is_base_package || plan.isBase;

        // Calculate package discount compared to base package (price per GB savings)
        const basePackage = getBasePackage();
        const packageDiscount = calculatePackageDiscount(plan, basePackage);

        // Format storage display
        let storageDisplay = '';
        if (storageGB >= 1000) {
            storageDisplay = `${(storageGB / 1000).toFixed(0)} TB`;
        } else {
            storageDisplay = `${storageGB} GB`;
        }

        // Calculate price per GB for display
        const pricePerGB = storageGB > 0 ? (price / storageGB).toFixed(2) : 0;

        // Generate features list HTML
        let featuresHTML = '';
        if (features && features.length > 0) {
            features.forEach(feature => {
                featuresHTML += `
                    <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>${feature}</span>
                    </li>
                `;
            });
        } else {
            // Default features based on storage
            featuresHTML = `
                <li class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${storageDisplay} Storage</span>
                </li>
            `;

            if (!isFree && pricePerGB > 0) {
                featuresHTML += `
                    <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>${pricePerGB} ${currency}/GB</span>
                    </li>
                `;
            }

            if (!isFree) {
                featuresHTML += `
                    <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Boosted Visibility</span>
                    </li>
                    <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Priority Search Ranking</span>
                    </li>
                `;
            }
        }

        // Generate package discount HTML (savings compared to base package)
        let discountBadgeHTML = '';
        if (packageDiscount > 0) {
            discountBadgeHTML = `
                <div class="mt-3 flex items-center gap-2">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                        </svg>
                        Save ${packageDiscount}%
                    </span>
                </div>
            `;
        } else if (isBase) {
            discountBadgeHTML = `
                <div class="mt-3">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Base Plan
                    </span>
                </div>
            `;
        }

        // Card styling based on popularity
        const cardClasses = isPopular
            ? 'subscription-card featured relative border-2 border-purple-400 rounded-xl p-5 bg-gradient-to-b from-purple-50 to-white shadow-lg'
            : 'subscription-card border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-lg transition-all';

        // Button styling based on popularity
        const buttonClasses = isPopular
            ? 'w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium text-sm'
            : 'w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm';

        // Popular badge
        const popularBadge = isPopular
            ? '<span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full">Popular</span>'
            : '';

        // Format price display
        const priceDisplay = isFree ? 'Free' : `${price.toLocaleString()} ${currency}/month`;

        return `
            <div class="${cardClasses}" data-plan-id="${planId}">
                ${popularBadge}
                <h3 class="text-lg font-bold text-gray-800 mb-2 ${isPopular ? 'mt-2' : ''}">${planName}</h3>
                <div class="mb-4">
                    <span class="text-2xl font-bold text-gray-900">${isFree ? 'Free' : price.toLocaleString()}</span>
                    ${!isFree ? `<span class="text-gray-500 text-sm"> ${currency}/month</span>` : ''}
                </div>
                <ul class="space-y-2 mb-4 text-sm text-gray-600">
                    ${featuresHTML}
                </ul>
                ${discountBadgeHTML}
                <div class="space-y-2 mt-4">
                    <button class="subscribe-btn ${buttonClasses}"
                            data-plan="${planName.toLowerCase()}"
                            data-plan-id="${planId}"
                            data-price="${price}"
                            data-storage="${storageGB}"
                            onclick="selectPlan('${planName}', ${price}, ${storageGB}, ${planId})">
                        ${isFree ? 'Current Plan' : 'Subscribe'}
                    </button>
                    <button class="switch-plan-btn hidden w-full py-2.5 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                            data-plan="${planName.toLowerCase()}"
                            data-plan-id="${planId}"
                            onclick="openSwitchSubscriptionModal()">
                        Switch Plan
                    </button>
                    <button class="unsubscribe-btn hidden w-full py-2.5 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
                            data-plan="${planName.toLowerCase()}"
                            data-plan-id="${planId}"
                            onclick="startUnsubscribeFlow('${planName.toLowerCase()}')">
                        Unsubscribe
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render all subscription plans in the grid
     * @param {Array} plans - Array of plan objects
     */
    function renderPlans(plans) {
        const grid = document.getElementById('subscription-plans-grid');
        if (!grid) {
            console.error('[SubscriptionModal] Plans grid container not found');
            return;
        }

        // Sort plans by display_order, then by price
        plans.sort((a, b) => {
            const orderA = a.display_order || 999;
            const orderB = b.display_order || 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.package_price || 0) - (b.package_price || 0);
        });

        // Render each plan
        const plansHTML = plans.map((plan, index) => renderPlanCard(plan, index)).join('');
        grid.innerHTML = plansHTML;

        console.log(`[SubscriptionModal] Rendered ${plans.length} plan cards`);
    }

    /**
     * Show loading state
     */
    function showLoading() {
        const loading = document.getElementById('subscription-plans-loading');
        const error = document.getElementById('subscription-plans-error');
        const grid = document.getElementById('subscription-plans-grid');

        if (loading) loading.classList.remove('hidden');
        if (error) error.classList.add('hidden');
        if (grid) grid.classList.add('hidden');
    }

    /**
     * Show error state
     */
    function showError() {
        const loading = document.getElementById('subscription-plans-loading');
        const error = document.getElementById('subscription-plans-error');
        const grid = document.getElementById('subscription-plans-grid');

        if (loading) loading.classList.add('hidden');
        if (error) error.classList.remove('hidden');
        if (grid) grid.classList.add('hidden');
    }

    /**
     * Show plans grid
     */
    function showPlans() {
        const loading = document.getElementById('subscription-plans-loading');
        const error = document.getElementById('subscription-plans-error');
        const grid = document.getElementById('subscription-plans-grid');

        if (loading) loading.classList.add('hidden');
        if (error) error.classList.add('hidden');
        if (grid) grid.classList.remove('hidden');
    }

    /**
     * Load subscription plans based on current user role
     */
    async function loadSubscriptionPlans() {
        showLoading();

        try {
            currentSubscriptionType = getCurrentSubscriptionType();
            console.log(`[SubscriptionModal] Loading plans for subscription type: ${currentSubscriptionType}`);

            // Only tutor and student have subscription plans currently
            const validTypes = ['tutor', 'student'];
            const subscriptionType = validTypes.includes(currentSubscriptionType)
                ? currentSubscriptionType
                : 'tutor';

            loadedPlans = await fetchSubscriptionPlans(subscriptionType);

            if (loadedPlans.length === 0) {
                // Try fallback to tutor plans if no plans found
                if (subscriptionType !== 'tutor') {
                    console.log('[SubscriptionModal] No plans found, falling back to tutor plans');
                    loadedPlans = await fetchSubscriptionPlans('tutor');
                }
            }

            if (loadedPlans.length > 0) {
                renderPlans(loadedPlans);
                showPlans();
            } else {
                showError();
            }
        } catch (error) {
            console.error('[SubscriptionModal] Error loading plans:', error);
            showError();
        }
    }

    /**
     * Open Subscription Modal
     */
    function openSubscriptionModal() {
        console.log('[SubscriptionModal] Opening modal...');
        const modal = document.getElementById('subscription-modal');
        if (!modal) {
            console.error('[SubscriptionModal] Modal not found!');
            return;
        }

        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';

        // Load plans when modal opens
        loadSubscriptionPlans();

        console.log('[SubscriptionModal] Modal opened');
    }

    /**
     * Close Subscription Modal
     */
    function closeSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    /**
     * Select a plan
     */
    function selectPlan(planName, monthlyPrice, storageGB, planId) {
        // Find the full plan data to get discounts (handle both string and number IDs)
        const fullPlan = loadedPlans.find(p => p.id == planId); // Use == for loose comparison

        console.log('[SubscriptionModal] Looking for plan ID:', planId, 'Type:', typeof planId);
        console.log('[SubscriptionModal] Loaded plans:', loadedPlans);
        console.log('[SubscriptionModal] Found full plan:', fullPlan);

        // Extract discounts from the plan
        let discounts = { quarterly: 5, biannual: 10, yearly: 20 }; // Defaults

        if (fullPlan) {
            // The API returns discounts in a 'discounts' object
            if (fullPlan.discounts) {
                discounts = {
                    quarterly: parseFloat(fullPlan.discounts.quarterly) || 5,
                    biannual: parseFloat(fullPlan.discounts.biannual) || 10,
                    yearly: parseFloat(fullPlan.discounts.yearly) || 20
                };
            } else {
                // Fallback to direct properties
                discounts = {
                    quarterly: parseFloat(fullPlan.discount_3_months) || 5,
                    biannual: parseFloat(fullPlan.discount_6_months) || 10,
                    yearly: parseFloat(fullPlan.discount_yearly) || 20
                };
            }
        }

        // Calculate package discount compared to base package
        const basePackage = getBasePackage();
        const packageDiscount = calculatePackageDiscount({ package_price: monthlyPrice, duration_days: storageGB }, basePackage);

        selectedPlanData = {
            id: planId,
            name: planName,
            monthlyPrice: monthlyPrice,
            storage: storageGB,
            discounts: discounts,
            packageDiscount: packageDiscount,
            isBase: fullPlan?.is_base_package || fullPlan?.isBase || false
        };

        console.log('[SubscriptionModal] Plan selected:', selectedPlanData);
        console.log('[SubscriptionModal] Discounts from DB:', selectedPlanData.discounts);

        // Update plan details modal if it exists
        const selectedPlanNameEl = document.getElementById('selectedPlanName');
        const selectedStorageEl = document.getElementById('selectedStorage');
        const selectedMonthlyPriceEl = document.getElementById('selectedMonthlyPrice');

        if (selectedPlanNameEl) {
            selectedPlanNameEl.textContent = planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan';
        }
        if (selectedStorageEl) {
            const storageDisplay = storageGB >= 1000 ? `${(storageGB / 1000).toFixed(0)} TB` : `${storageGB} GB`;
            selectedStorageEl.textContent = storageDisplay;
        }
        if (selectedMonthlyPriceEl) {
            selectedMonthlyPriceEl.textContent = monthlyPrice.toLocaleString() + ' ETB';
        }

        // Update package discount badge
        const packageDiscountBadge = document.getElementById('packageDiscountBadge');
        const packageDiscountPercent = document.getElementById('packageDiscountPercent');
        if (packageDiscountBadge && packageDiscountPercent) {
            if (selectedPlanData.packageDiscount > 0 && !selectedPlanData.isBase) {
                packageDiscountPercent.textContent = `Save ${selectedPlanData.packageDiscount}%`;
                packageDiscountBadge.classList.remove('hidden');
            } else {
                packageDiscountBadge.classList.add('hidden');
            }
        }

        // Reset duration to 1 month and reset radio buttons
        const radioButtons = document.querySelectorAll('input[name="duration"]');
        radioButtons.forEach(radio => {
            if (radio.value === '1') {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });

        // Calculate initial values
        calculateDiscount();

        // Open the sliding panel (stays within the subscription modal)
        openPlanDetailsPanel();
    }

    /**
     * Open Plan Details Panel (slides from right)
     */
    function openPlanDetailsPanel() {
        const panel = document.getElementById('plan-details-panel');
        if (!panel) {
            console.warn('[SubscriptionModal] Plan details panel not found');
            return;
        }

        // Show panel and animate slide in
        panel.style.display = 'block';
        // Force reflow for animation
        panel.offsetHeight;
        // Slide in from right
        setTimeout(() => {
            panel.classList.remove('translate-x-full');
            panel.classList.add('translate-x-0');
        }, 10);

        // Update discount labels from database
        updateDiscountLabels();

        console.log('[SubscriptionModal] Panel opened');
    }

    /**
     * Close Plan Details Panel (slides back to right)
     */
    function closePlanDetailsPanel() {
        const panel = document.getElementById('plan-details-panel');
        if (!panel) return;

        // Slide out to right
        panel.classList.remove('translate-x-0');
        panel.classList.add('translate-x-full');

        // Hide after animation
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);

        console.log('[SubscriptionModal] Panel closed');
    }

    /**
     * Update discount labels in the duration selection from database values
     */
    function updateDiscountLabels() {
        const discounts = selectedPlanData.discounts || {};

        const discount3Label = document.getElementById('discount3Label');
        const discount6Label = document.getElementById('discount6Label');
        const discount12Label = document.getElementById('discount12Label');

        if (discount3Label) {
            const val = parseFloat(discounts.quarterly) || 5;
            discount3Label.textContent = `Save ${val}%`;
        }
        if (discount6Label) {
            const val = parseFloat(discounts.biannual) || 10;
            discount6Label.textContent = `Save ${val}%`;
        }
        if (discount12Label) {
            const val = parseFloat(discounts.yearly) || 20;
            discount12Label.textContent = `Save ${val}%`;
        }
    }

    // Backwards compatibility aliases
    function openPlanDetailsModal() {
        openPlanDetailsPanel();
    }

    function closePlanDetailsModal() {
        closePlanDetailsPanel();
    }

    /**
     * Calculate discount based on duration
     * Uses discount rates from the database (discount_3_months, discount_6_months, discount_yearly)
     */
    function calculateDiscount() {
        // Get selected duration from radio buttons
        const selectedRadio = document.querySelector('input[name="duration"]:checked');
        const duration = selectedRadio ? parseInt(selectedRadio.value) : 1;
        const monthlyPrice = selectedPlanData.monthlyPrice || 0;

        console.log('[SubscriptionModal] calculateDiscount called');
        console.log('[SubscriptionModal] Selected duration:', duration);
        console.log('[SubscriptionModal] Monthly price:', monthlyPrice);
        console.log('[SubscriptionModal] selectedPlanData:', selectedPlanData);

        // Get discount rates from selectedPlanData (loaded from database)
        let discountPercent = 0;
        const discounts = selectedPlanData.discounts || {};

        console.log('[SubscriptionModal] Discounts object:', discounts);

        if (duration === 3) {
            // 3-month (quarterly) discount from database
            discountPercent = parseFloat(discounts.quarterly) || 0;
        } else if (duration === 6) {
            // 6-month (biannual) discount from database
            discountPercent = parseFloat(discounts.biannual) || 0;
        } else if (duration === 12) {
            // Yearly discount from database
            discountPercent = parseFloat(discounts.yearly) || 0;
        }

        console.log(`[SubscriptionModal] Duration: ${duration} months, Discount: ${discountPercent}% (from DB)`);

        const subtotal = monthlyPrice * duration;
        const discountAmount = Math.round((subtotal * discountPercent) / 100);
        const totalPrice = subtotal - discountAmount;

        // Update subtotal (use unique IDs to avoid conflicts with other modals)
        const subtotalPriceEl = document.getElementById('subscription-subtotalPrice');
        if (subtotalPriceEl) {
            subtotalPriceEl.textContent = subtotal.toLocaleString() + ' ETB';
        }

        // Update discount amount
        const discountAmountEl = document.getElementById('subscription-discountAmount');
        if (discountAmountEl) {
            discountAmountEl.textContent = '-' + discountAmount.toLocaleString() + ' ETB (' + discountPercent + '%)';
        }

        // Update total price
        const totalPriceEl = document.getElementById('subscription-totalPrice');
        if (totalPriceEl) {
            totalPriceEl.textContent = totalPrice.toLocaleString() + ' ETB';
        }
    }

    /**
     * Confirm Subscription - Coming Soon
     */
    async function confirmSubscription() {
        console.log('[SubscriptionModal] Subscription feature coming soon');

        // Close the panel first
        closePlanDetailsPanel();

        // Open the coming soon modal after panel closes
        setTimeout(() => {
            closeSubscriptionModal();
            // Try to open coming soon modal
            if (typeof window.openComingSoonModal === 'function') {
                window.openComingSoonModal();
            } else {
                const comingSoonModal = document.getElementById('coming-soon-modal');
                if (comingSoonModal) {
                    comingSoonModal.classList.remove('hidden');
                    comingSoonModal.classList.add('active');
                    comingSoonModal.style.display = 'flex';
                } else {
                    alert('Subscription payments coming soon! Stay tuned.');
                }
            }
        }, 300);

        return; // Early return - feature not yet implemented

        /*
        // FUTURE IMPLEMENTATION: Process subscription payment
        const selectedRadio = document.querySelector('input[name="duration"]:checked');
        const duration = selectedRadio ? parseInt(selectedRadio.value) : 1;

        const subscriptionData = {
            plan_id: selectedPlanData.id,
            plan: selectedPlanData.name,
            storage: selectedPlanData.storage,
            monthlyPrice: selectedPlanData.monthlyPrice,
            duration: duration,
            totalPrice: document.getElementById('subscription-totalPrice')?.textContent || '0 ETB',
            subscription_type: currentSubscriptionType
        };

        console.log('[SubscriptionModal] Subscription confirmed:', subscriptionData);

        // TODO: Send to backend API and process payment
        const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(subscriptionData)
        });

        // Set current subscription (for demonstration)
        currentSubscription = subscriptionData.plan;

        // Update button visibility
        document.querySelectorAll('.subscribe-btn').forEach(btn => {
            const btnPlanId = btn.getAttribute('data-plan-id');
            if (btnPlanId == selectedPlanData.id) {
                btn.classList.add('hidden');
                btn.style.display = 'none';

                const parentDiv = btn.parentElement;
                const switchBtn = parentDiv?.querySelector('.switch-plan-btn');
                const unsubscribeBtn = parentDiv?.querySelector('.unsubscribe-btn');

                if (switchBtn) {
                    switchBtn.classList.remove('hidden');
                    switchBtn.style.display = 'block';
                }
                if (unsubscribeBtn) {
                    unsubscribeBtn.classList.remove('hidden');
                    unsubscribeBtn.style.display = 'block';
                }
            } else {
                btn.classList.remove('hidden');
                btn.style.display = 'block';
            }
        });

        alert('Subscription confirmed!\n\nPlan: ' + subscriptionData.plan + '\nTotal: ' + subscriptionData.totalPrice);

        // Close the panel and then the modal
        closePlanDetailsPanel();
        setTimeout(() => {
            closeSubscriptionModal();
        }, 300);
        */
    }

    /**
     * Start unsubscribe flow
     */
    function startUnsubscribeFlow(planName) {
        console.log('[SubscriptionModal] Starting unsubscribe flow for:', planName);
        // Open unsubscribe modal if available
        if (typeof window.openUnsubscribeModal === 'function') {
            window.openUnsubscribeModal();
        } else {
            // Try to find and open the modal directly
            const unsubscribeModal = document.getElementById('unsubscribeModal1') ||
                                     document.getElementById('unsubscribe-modal');
            if (unsubscribeModal) {
                unsubscribeModal.classList.remove('hidden');
                unsubscribeModal.classList.add('active');
                unsubscribeModal.style.display = 'flex';
            } else {
                alert('Unsubscribe functionality coming soon!');
            }
        }
    }

    /**
     * Open switch subscription modal
     */
    function openSwitchSubscriptionModal() {
        console.log('[SubscriptionModal] Opening switch subscription modal');
        const switchModal = document.getElementById('switchSubscriptionModal') ||
                           document.getElementById('switch-subscription-modal');
        if (switchModal) {
            switchModal.classList.remove('hidden');
            switchModal.classList.add('active');
            switchModal.style.display = 'flex';
        } else {
            // Just reload plans and show subscription modal
            openSubscriptionModal();
        }
    }

    // Make functions globally available
    window.openSubscriptionModal = openSubscriptionModal;
    window.closeSubscriptionModal = closeSubscriptionModal;
    window.selectPlan = selectPlan;
    window.openPlanDetailsModal = openPlanDetailsModal;
    window.closePlanDetailsModal = closePlanDetailsModal;
    window.openPlanDetailsPanel = openPlanDetailsPanel;
    window.closePlanDetailsPanel = closePlanDetailsPanel;
    window.calculateDiscount = calculateDiscount;
    window.confirmSubscription = confirmSubscription;
    window.loadSubscriptionPlans = loadSubscriptionPlans;
    window.startUnsubscribeFlow = startUnsubscribeFlow;
    window.openSwitchSubscriptionModal = openSwitchSubscriptionModal;
    window.updateDiscountLabels = updateDiscountLabels;

    console.log('[SubscriptionModal] JavaScript loaded - Dynamic version');
})();
