// Feature Assignment Manager
// Manages assigning features to subscription plans by role

// API Configuration
function getApiBaseUrl() {
    return window.API_BASE_URL || window.ADMIN_API_CONFIG?.API_BASE_URL || 'http://localhost:8000';
}

function getAuthToken() {
    return localStorage.getItem('adminToken') ||
           localStorage.getItem('admin_access_token') ||
           localStorage.getItem('access_token') ||
           localStorage.getItem('token');
}

// State Management
let allSubscriptionPlansForFeatures = [];
let selectedPlanForFeatures = null;
let currentFeatureRoleTab = 'tutor';
let featuresByRole = {
    tutor: [],
    student: [],
    parent: [],
    advertiser: [],
    institute: []
};

// ===================================
// MODAL OPEN/CLOSE
// ===================================

async function openAssignFeaturesModal() {
    const modal = document.getElementById('assign-features-modal');
    if (!modal) {
        console.error('Assign features modal not found');
        return;
    }

    // Reset state
    selectedPlanForFeatures = null;
    featuresByRole = {
        tutor: [],
        student: [],
        parent: [],
        advertiser: [],
        institute: []
    };

    // Hide feature assignment section and show empty state
    const assignmentSection = document.getElementById('feature-assignment-section');
    const emptyState = document.getElementById('feature-assignment-empty-state');
    if (assignmentSection) {
        assignmentSection.classList.add('hidden');
    }
    if (emptyState) {
        emptyState.classList.remove('hidden');
    }

    // Reset selected plan display
    const selectedPlanDisplay = document.getElementById('selected-plan-display');
    if (selectedPlanDisplay) {
        selectedPlanDisplay.classList.add('hidden');
    }

    // Show plans list container
    const plansListContainer = document.getElementById('feature-plans-list-container');
    if (plansListContainer) {
        plansListContainer.classList.remove('hidden');
    }

    // Hide save button
    const saveBtn = document.getElementById('save-features-btn');
    if (saveBtn) {
        saveBtn.classList.add('hidden');
    }

    // Reset search and filter
    const searchInput = document.getElementById('feature-plan-search');
    const roleFilter = document.getElementById('feature-role-filter');
    if (searchInput) searchInput.value = '';
    if (roleFilter) roleFilter.value = '';

    // Show modal
    modal.classList.remove('hidden');

    // Load subscription plans
    await loadSubscriptionPlansForFeatures();
}

function closeAssignFeaturesModal() {
    const modal = document.getElementById('assign-features-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ===================================
// LOAD SUBSCRIPTION PLANS
// ===================================

async function loadSubscriptionPlansForFeatures() {
    const plansList = document.getElementById('feature-plans-list');
    if (!plansList) return;

    try {
        plansList.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p>Loading subscription plans...</p></div>';

        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin-db/subscription-plans`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.plans) {
            allSubscriptionPlansForFeatures = data.plans.map(plan => ({
                id: plan.id,
                plan_name: plan.package_title || plan.plan_name || plan.name,
                monthly_price: plan.package_price || plan.monthly_price || plan.price || 0,
                subscription_type: plan.subscription_type || 'tutor',
                currency: plan.currency || 'ETB',
                label: plan.label || 'none'
            }));

            renderSubscriptionPlansList();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading subscription plans for features:', error);
        plansList.innerHTML = '<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle text-2xl mb-2"></i><p>Failed to load plans. Please try again.</p></div>';
    }
}

// ===================================
// RENDER PLANS LIST
// ===================================

function renderSubscriptionPlansList() {
    const plansList = document.getElementById('feature-plans-list');
    if (!plansList) return;

    const searchTerm = document.getElementById('feature-plan-search')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('feature-role-filter')?.value || '';

    let filteredPlans = allSubscriptionPlansForFeatures;

    // Apply search filter
    if (searchTerm) {
        filteredPlans = filteredPlans.filter(plan =>
            plan.plan_name.toLowerCase().includes(searchTerm)
        );
    }

    // Apply role filter
    if (roleFilter) {
        filteredPlans = filteredPlans.filter(plan =>
            (plan.subscription_type || 'tutor') === roleFilter
        );
    }

    if (filteredPlans.length === 0) {
        plansList.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-search text-2xl mb-2"></i><p>No plans found</p></div>';
        return;
    }

    const roleIcons = {
        tutor: 'fa-chalkboard-teacher',
        student: 'fa-user-graduate',
        parent: 'fa-users',
        advertiser: 'fa-bullhorn',
        institute: 'fa-university'
    };

    const roleColors = {
        tutor: 'bg-purple-100 text-purple-700',
        student: 'bg-blue-100 text-blue-700',
        parent: 'bg-green-100 text-green-700',
        advertiser: 'bg-orange-100 text-orange-700',
        institute: 'bg-indigo-100 text-indigo-700'
    };

    plansList.innerHTML = filteredPlans.map(plan => {
        const roleType = plan.subscription_type || 'tutor';
        const roleIcon = roleIcons[roleType] || 'fa-crown';
        const roleColor = roleColors[roleType] || 'bg-gray-100 text-gray-700';

        return `
            <div class="p-2.5 border rounded-lg hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-all bg-white"
                onclick="selectPlanForFeatures(${plan.id})">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <i class="fas ${roleIcon} text-sm text-gray-500"></i>
                            <h5 class="font-semibold text-sm text-gray-800 truncate">${plan.plan_name}</h5>
                        </div>
                        <div class="text-xs text-gray-600 mb-1">
                            ${plan.monthly_price.toLocaleString()} ${plan.currency}/mo
                        </div>
                        <div class="flex items-center gap-1 flex-wrap">
                            <span class="px-1.5 py-0.5 ${roleColor} text-xs rounded font-medium">
                                ${roleType.charAt(0).toUpperCase() + roleType.slice(1)}
                            </span>
                            ${plan.label === 'popular' ? '<span class="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs rounded font-bold">HOT</span>' : ''}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-300 text-xs mt-1"></i>
                </div>
            </div>
        `;
    }).join('');
}

// ===================================
// SEARCH AND FILTER
// ===================================

function searchSubscriptionPlansForFeatures() {
    renderSubscriptionPlansList();
}

function filterSubscriptionPlansByRole() {
    renderSubscriptionPlansList();
}

// ===================================
// SELECT PLAN
// ===================================

async function selectPlanForFeatures(planId) {
    const plan = allSubscriptionPlansForFeatures.find(p => p.id === planId);
    if (!plan) return;

    selectedPlanForFeatures = plan;

    // Update selected plan display
    const selectedPlanDisplay = document.getElementById('selected-plan-display');
    const selectedPlanName = document.getElementById('selected-plan-name');
    const selectedPlanPrice = document.getElementById('selected-plan-price');

    if (selectedPlanDisplay && selectedPlanName) {
        selectedPlanName.textContent = plan.plan_name;
        if (selectedPlanPrice) {
            selectedPlanPrice.textContent = `${plan.monthly_price.toLocaleString()} ${plan.currency}/month`;
        }
        selectedPlanDisplay.classList.remove('hidden');
    }

    // Hide plans list container after selection
    const plansListContainer = document.getElementById('feature-plans-list-container');
    if (plansListContainer) {
        plansListContainer.classList.add('hidden');
    }

    // Show feature assignment section
    const assignmentSection = document.getElementById('feature-assignment-section');
    const emptyState = document.getElementById('feature-assignment-empty-state');
    if (assignmentSection) {
        assignmentSection.classList.remove('hidden');
    }
    if (emptyState) {
        emptyState.classList.add('hidden');
    }

    // Show save button
    const saveBtn = document.getElementById('save-features-btn');
    if (saveBtn) {
        saveBtn.classList.remove('hidden');
    }

    // Load existing features for this plan
    await loadExistingFeatures(planId);

    // Switch to first role tab
    switchFeatureRoleTab('tutor');
}

function clearFeatureAssignmentSelectedPlan() {
    selectedPlanForFeatures = null;

    // Hide selected plan display
    const selectedPlanDisplay = document.getElementById('selected-plan-display');
    if (selectedPlanDisplay) {
        selectedPlanDisplay.classList.add('hidden');
    }

    // Show plans list container again - CRITICAL: Must be visible
    const plansListContainer = document.getElementById('feature-plans-list-container');
    if (plansListContainer) {
        plansListContainer.classList.remove('hidden');
        // Force display in case of CSS conflicts
        plansListContainer.style.display = '';
    }

    // Hide feature assignment section BEFORE re-rendering plans
    const assignmentSection = document.getElementById('feature-assignment-section');
    const emptyState = document.getElementById('feature-assignment-empty-state');
    if (assignmentSection) {
        assignmentSection.classList.add('hidden');
    }
    if (emptyState) {
        emptyState.classList.remove('hidden');
    }

    // Hide save button
    const saveBtn = document.getElementById('save-features-btn');
    if (saveBtn) {
        saveBtn.classList.add('hidden');
    }

    // Clear features
    featuresByRole = {
        tutor: [],
        student: [],
        parent: [],
        advertiser: [],
        institute: []
    };

    // Re-render plans list with current search/filter
    // If no plans loaded, reload them
    if (allSubscriptionPlansForFeatures.length === 0) {
        loadSubscriptionPlansForFeatures();
    } else {
        renderSubscriptionPlansList();
    }

    renderAllRoleFeatures();
}

// ===================================
// LOAD EXISTING FEATURES
// ===================================

async function loadExistingFeatures(planId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/subscription-plans/${planId}/features`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load features');
        }

        const data = await response.json();

        if (data.success && data.features) {
            // Reset features
            featuresByRole = {
                tutor: [],
                student: [],
                parent: [],
                advertiser: [],
                institute: []
            };

            // Group features by role
            data.features.forEach(feature => {
                const role = feature.role || 'tutor';
                if (featuresByRole[role]) {
                    featuresByRole[role].push({
                        name: feature.feature_name,
                        description: feature.feature_description,
                        enabled: feature.is_enabled,
                        value: feature.feature_value
                    });
                }
            });

            // Render all role features
            renderAllRoleFeatures();
        }
    } catch (error) {
        console.error('Error loading existing features:', error);
    }
}

// ===================================
// ROLE TAB SWITCHING
// ===================================

function switchFeatureRoleTab(role) {
    currentFeatureRoleTab = role;

    // Update tab button styles
    const tabs = document.querySelectorAll('.feature-role-tab');
    tabs.forEach(tab => {
        if (tab.dataset.role === role) {
            tab.classList.add('bg-indigo-100', 'text-indigo-700', 'border-b-2', 'border-indigo-500');
            tab.classList.remove('text-gray-600', 'hover:bg-gray-100');
        } else {
            tab.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-b-2', 'border-indigo-500');
            tab.classList.add('text-gray-600', 'hover:bg-gray-100');
        }
    });

    // Show/hide panels
    const panels = document.querySelectorAll('.feature-role-panel');
    panels.forEach(panel => {
        if (panel.id === `${role}-features-panel`) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });
}

// ===================================
// ADD FEATURE
// ===================================

function addRoleFeature(role, featureData = null) {
    const container = document.getElementById(`${role}-features-container`);
    if (!container) return;

    const featureId = 'feature-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const featureDiv = document.createElement('div');
    featureDiv.className = 'p-3 border rounded-lg bg-gray-50';
    featureDiv.id = featureId;

    const name = featureData?.name || '';
    const description = featureData?.description || '';
    const enabled = featureData?.enabled !== false;
    const value = featureData?.value || '';

    featureDiv.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-1 space-y-2">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Feature Name *</label>
                    <input type="text" class="feature-name-input w-full px-3 py-2 border rounded text-sm"
                        placeholder="e.g., profile_boost, unlimited_storage"
                        value="${name}" required>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                    <input type="text" class="feature-description-input w-full px-3 py-2 border rounded text-sm"
                        placeholder="e.g., Boost profile visibility by 50%"
                        value="${description}" required>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Feature Value (Optional)</label>
                        <input type="text" class="feature-value-input w-full px-3 py-2 border rounded text-sm"
                            placeholder="e.g., 50%, 100GB"
                            value="${value}">
                    </div>
                    <div class="flex items-end">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" class="feature-enabled-input w-4 h-4"
                                ${enabled ? 'checked' : ''}>
                            <span class="text-sm text-gray-700">Enabled</span>
                        </label>
                    </div>
                </div>
            </div>
            <button type="button" onclick="removeRoleFeature('${featureId}')"
                class="mt-1 w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center"
                title="Remove this feature">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    container.appendChild(featureDiv);

    // Auto-focus on the new name input
    const newInput = featureDiv.querySelector('.feature-name-input');
    if (newInput && !name) {
        newInput.focus();
    }
}

function removeRoleFeature(featureId) {
    const featureDiv = document.getElementById(featureId);
    if (featureDiv) {
        featureDiv.remove();
    }
}

// ===================================
// RENDER ALL ROLE FEATURES
// ===================================

function renderAllRoleFeatures() {
    const roles = ['tutor', 'student', 'parent', 'advertiser', 'institute'];

    roles.forEach(role => {
        const container = document.getElementById(`${role}-features-container`);
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Add existing features
        const features = featuresByRole[role] || [];
        if (features.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm border-2 border-dashed rounded-lg"><i class="fas fa-info-circle mb-2"></i><p>No features added for this role yet</p></div>';
        } else {
            features.forEach(feature => {
                addRoleFeature(role, feature);
            });
        }
    });
}

// ===================================
// SAVE ASSIGNED FEATURES
// ===================================

async function saveAssignedFeatures(event) {
    event.preventDefault();

    if (!selectedPlanForFeatures) {
        alert('Please select a subscription plan first');
        return;
    }

    // Collect all features from all roles
    const allFeatures = [];
    const roles = ['tutor', 'student', 'parent', 'advertiser', 'institute'];

    for (const role of roles) {
        const container = document.getElementById(`${role}-features-container`);
        if (!container) continue;

        const featureDivs = container.querySelectorAll('[id^="feature-"]');

        featureDivs.forEach(div => {
            const nameInput = div.querySelector('.feature-name-input');
            const descriptionInput = div.querySelector('.feature-description-input');
            const valueInput = div.querySelector('.feature-value-input');
            const enabledInput = div.querySelector('.feature-enabled-input');

            const name = nameInput?.value.trim();
            const description = descriptionInput?.value.trim();
            const value = valueInput?.value.trim() || null;
            const enabled = enabledInput?.checked || false;

            if (name && description) {
                allFeatures.push({
                    role: role,
                    feature_name: name,
                    feature_description: description,
                    is_enabled: enabled,
                    feature_value: value
                });
            }
        });
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/subscription-plans/${selectedPlanForFeatures.id}/assign-features`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ features: allFeatures })
        });

        if (!response.ok) {
            throw new Error('Failed to save features');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save features');
        }

        alert(`Successfully assigned ${allFeatures.length} features to ${selectedPlanForFeatures.plan_name}!`);
        closeAssignFeaturesModal();

    } catch (error) {
        console.error('Error saving assigned features:', error);
        alert('Failed to save features. Please try again.');
    }
}

// ===================================
// EXPORT TO WINDOW
// ===================================

window.openAssignFeaturesModal = openAssignFeaturesModal;
window.closeAssignFeaturesModal = closeAssignFeaturesModal;
window.searchSubscriptionPlansForFeatures = searchSubscriptionPlansForFeatures;
window.filterSubscriptionPlansByRole = filterSubscriptionPlansByRole;
window.selectPlanForFeatures = selectPlanForFeatures;
window.clearFeatureAssignmentSelectedPlan = clearFeatureAssignmentSelectedPlan;
window.switchFeatureRoleTab = switchFeatureRoleTab;
window.addRoleFeature = addRoleFeature;
window.removeRoleFeature = removeRoleFeature;
window.saveAssignedFeatures = saveAssignedFeatures;

// ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('assign-features-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeAssignFeaturesModal();
        }
    }
});

// Ensure button visibility on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Feature Assignment Manager initialized');

    // Verify the button exists and log for debugging
    const assignButton = document.querySelector('button[onclick="openAssignFeaturesModal()"]');
    if (assignButton) {
        console.log('✅ Assign Features button found');
        // Ensure it's not accidentally hidden
        assignButton.style.display = '';
        assignButton.classList.remove('hidden');
    } else {
        console.warn('⚠️ Assign Features button NOT found - may be in hidden panel');
    }
});

// Also check when pricing panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        console.log('Pricing panel activated - ensuring Assign Features button is visible');
        const assignButton = document.querySelector('button[onclick="openAssignFeaturesModal()"]');
        if (assignButton) {
            assignButton.style.display = '';
            assignButton.classList.remove('hidden');
        }
    }
});

console.log('Feature Assignment Manager loaded');
