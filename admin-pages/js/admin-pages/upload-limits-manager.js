// Storage Settings Manager
// Handles storage limits per subscription plan with live search

// API Configuration
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:8000';
}

// State
let storageSettings = [];
let selectedPlanId = null;
let searchDebounceTimer = null;

// ============================================
// LOAD FUNCTIONS
// ============================================

async function loadStorageSettings() {
    console.log('loadStorageSettings() called');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No auth token found, loading defaults');
            storageSettings = getDefaultStorageSettings();
            renderStorageSettingsGrid();
            return;
        }

        console.log('Fetching storage settings from API...');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/upload-limits`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);

        if (data.success && data.settings) {
            storageSettings = data.settings;
            console.log(`Loaded ${storageSettings.length} storage settings`);
            renderStorageSettingsGrid();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading storage settings:', error);
        storageSettings = getDefaultStorageSettings();
        renderStorageSettingsGrid();
    }
}

function getDefaultStorageSettings() {
    return [
        {
            id: 1,
            subscription_plan_id: 1,
            plan_name: 'Free',
            price: 0,
            max_image_size_mb: 5,
            max_video_size_mb: 50,
            max_document_size_mb: 10,
            max_audio_size_mb: 10,
            storage_limit_gb: 1
        },
        {
            id: 2,
            subscription_plan_id: 2,
            plan_name: 'Basic',
            price: 99,
            max_image_size_mb: 10,
            max_video_size_mb: 100,
            max_document_size_mb: 20,
            max_audio_size_mb: 20,
            storage_limit_gb: 10
        },
        {
            id: 3,
            subscription_plan_id: 3,
            plan_name: 'Premium',
            price: 299,
            max_image_size_mb: 25,
            max_video_size_mb: 200,
            max_document_size_mb: 50,
            max_audio_size_mb: 50,
            storage_limit_gb: 50
        }
    ];
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderStorageSettingsGrid() {
    console.log('renderStorageSettingsGrid() called');

    const grid = document.getElementById('upload-limits-grid');
    if (!grid) {
        console.error('upload-limits-grid element NOT FOUND');
        return;
    }

    if (storageSettings.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-hdd text-4xl mb-4"></i>
                <p class="text-lg font-semibold">No storage settings configured</p>
                <p class="text-sm">Click "Add Plan Settings" to configure storage limits for subscription plans</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = storageSettings.map(setting => {
        const planIcon = getPlanIcon(setting.plan_name);
        const planColor = getPlanColor(setting.plan_name);

        return `
            <div class="storage-card border-2 rounded-xl p-5 bg-white hover:shadow-lg transition-all">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${planColor} flex items-center justify-center">
                            <i class="fas ${planIcon} text-lg"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg">${setting.plan_name}</h4>
                            <span class="text-xs text-gray-500">${setting.price > 0 ? setting.price + ' ETB/mo' : 'Free'}</span>
                        </div>
                    </div>
                </div>

                <!-- Storage Quota -->
                <div class="mb-4 p-3 bg-purple-50 rounded-lg text-center">
                    <p class="text-2xl font-bold text-purple-600">${setting.storage_limit_gb} GB</p>
                    <p class="text-xs text-gray-500">Total Storage</p>
                </div>

                <!-- File Size Limits -->
                <div class="mb-4">
                    <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Max File Size Per Upload</p>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <i class="fas fa-image text-blue-500"></i>
                            <span>${setting.max_image_size_mb} MB</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <i class="fas fa-video text-green-500"></i>
                            <span>${setting.max_video_size_mb} MB</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <i class="fas fa-file-alt text-orange-500"></i>
                            <span>${setting.max_document_size_mb} MB</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <i class="fas fa-music text-pink-500"></i>
                            <span>${setting.max_audio_size_mb} MB</span>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2 pt-3 border-t">
                    <button onclick="editStorageSettings(${setting.id})"
                        class="flex-1 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="deleteStorageSettings(${setting.id})"
                        class="px-3 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    console.log(`Rendered ${storageSettings.length} storage setting cards`);
}

function getPlanIcon(planName) {
    const name = (planName || '').toLowerCase();
    if (name === 'free') return 'fa-gift';
    if (name === 'basic') return 'fa-star';
    if (name === 'premium') return 'fa-crown';
    if (name === 'enterprise') return 'fa-building';
    return 'fa-layer-group';
}

function getPlanColor(planName) {
    const name = (planName || '').toLowerCase();
    if (name === 'free') return 'bg-gray-100 text-gray-600';
    if (name === 'basic') return 'bg-blue-100 text-blue-600';
    if (name === 'premium') return 'bg-purple-100 text-purple-600';
    if (name === 'enterprise') return 'bg-yellow-100 text-yellow-600';
    return 'bg-gray-100 text-gray-600';
}

// ============================================
// SUBSCRIPTION PLAN SEARCH
// ============================================

async function searchSubscriptionPlans(query) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return [];

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/subscription-plans-search?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.success ? data.plans : [];
    } catch (error) {
        console.error('Error searching plans:', error);
        return [];
    }
}

function renderPlanSearchResults(plans) {
    const resultsContainer = document.getElementById('plan-search-results');
    if (!resultsContainer) return;

    if (plans.length === 0) {
        resultsContainer.innerHTML = `
            <div class="p-3 text-gray-500 text-sm text-center">
                No plans found
            </div>
        `;
        resultsContainer.classList.remove('hidden');
        return;
    }

    // Filter out plans that already have storage settings
    const existingPlanIds = storageSettings.map(s => s.subscription_plan_id);
    const availablePlans = plans.filter(p => !existingPlanIds.includes(p.id));

    if (availablePlans.length === 0) {
        resultsContainer.innerHTML = `
            <div class="p-3 text-gray-500 text-sm text-center">
                All plans already have storage settings
            </div>
        `;
        resultsContainer.classList.remove('hidden');
        return;
    }

    resultsContainer.innerHTML = availablePlans.map(plan => `
        <div class="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
            onclick="selectPlan(${plan.id}, '${plan.plan_name}', ${plan.price})">
            <div class="flex items-center justify-between">
                <span class="font-medium">${plan.plan_name}</span>
                <span class="text-sm text-gray-500">${plan.price > 0 ? plan.price + ' ETB' : 'Free'}</span>
            </div>
        </div>
    `).join('');

    resultsContainer.classList.remove('hidden');
}

function selectPlan(planId, planName, price) {
    selectedPlanId = planId;
    document.getElementById('storage-subscription-plan-id').value = planId;

    // Update selected plan display
    document.getElementById('selected-plan-name').textContent = planName;
    document.getElementById('selected-plan-price').textContent = price > 0 ? `${price} ETB/mo` : 'Free';
    document.getElementById('selected-plan-display').classList.remove('hidden');

    // Hide search input and results
    document.getElementById('plan-search-input').value = '';
    document.getElementById('plan-search-results').classList.add('hidden');
}

function clearSelectedPlan() {
    selectedPlanId = null;
    document.getElementById('storage-subscription-plan-id').value = '';
    document.getElementById('selected-plan-display').classList.add('hidden');
    document.getElementById('plan-search-input').value = '';
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openAddStorageSettingsModal() {
    const modal = document.getElementById('upload-limit-modal');
    if (!modal) {
        console.error('Storage settings modal not found');
        return;
    }

    // Reset form
    document.getElementById('upload-limit-form').reset();
    document.getElementById('storage-setting-id').value = '';
    document.getElementById('storage-subscription-plan-id').value = '';
    selectedPlanId = null;

    // Show search container, hide edit display
    document.getElementById('plan-search-container').classList.remove('hidden');
    document.getElementById('plan-name-display-container').classList.add('hidden');
    document.getElementById('selected-plan-display').classList.add('hidden');

    // Set default values
    document.getElementById('storage-max-image-size').value = 5;
    document.getElementById('storage-max-video-size').value = 50;
    document.getElementById('storage-max-document-size').value = 10;
    document.getElementById('storage-max-audio-size').value = 10;
    document.getElementById('storage-limit-gb').value = 5;

    // Update modal title
    document.getElementById('upload-limit-modal-title').innerHTML =
        '<i class="fas fa-hdd mr-2 text-purple-600"></i>Configure Storage Settings';

    modal.classList.remove('hidden');

    // Setup search input listener
    setupPlanSearchListener();
}

// Alias for backward compatibility
function openAddUploadLimitModal() {
    openAddStorageSettingsModal();
}

function closeUploadLimitModal() {
    const modal = document.getElementById('upload-limit-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Hide search results
    const results = document.getElementById('plan-search-results');
    if (results) {
        results.classList.add('hidden');
    }
}

function setupPlanSearchListener() {
    const searchInput = document.getElementById('plan-search-input');
    if (!searchInput) return;

    // Remove existing listeners
    searchInput.removeEventListener('input', handlePlanSearch);
    searchInput.removeEventListener('focus', handlePlanSearchFocus);

    // Add new listeners
    searchInput.addEventListener('input', handlePlanSearch);
    searchInput.addEventListener('focus', handlePlanSearchFocus);
}

function handlePlanSearch(e) {
    const query = e.target.value;

    // Debounce search
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        const plans = await searchSubscriptionPlans(query);
        renderPlanSearchResults(plans);
    }, 300);
}

async function handlePlanSearchFocus() {
    // Show all plans on focus
    const plans = await searchSubscriptionPlans('');
    renderPlanSearchResults(plans);
}

function editStorageSettings(settingId) {
    const setting = storageSettings.find(s => s.id === settingId);
    if (!setting) {
        console.error('Setting not found:', settingId);
        return;
    }

    const modal = document.getElementById('upload-limit-modal');
    if (!modal) {
        console.error('Storage settings modal not found');
        return;
    }

    // Populate form
    document.getElementById('storage-setting-id').value = setting.id;
    document.getElementById('storage-subscription-plan-id').value = setting.subscription_plan_id;
    document.getElementById('storage-max-image-size').value = setting.max_image_size_mb || 5;
    document.getElementById('storage-max-video-size').value = setting.max_video_size_mb || 50;
    document.getElementById('storage-max-document-size').value = setting.max_document_size_mb || 10;
    document.getElementById('storage-max-audio-size').value = setting.max_audio_size_mb || 10;
    document.getElementById('storage-limit-gb').value = setting.storage_limit_gb || 5;

    // Hide search container, show edit display
    document.getElementById('plan-search-container').classList.add('hidden');
    document.getElementById('plan-name-display-container').classList.remove('hidden');
    document.getElementById('edit-plan-name').textContent = setting.plan_name;

    // Update modal title
    document.getElementById('upload-limit-modal-title').innerHTML =
        `<i class="fas fa-edit mr-2 text-purple-600"></i>Edit Storage Settings - ${setting.plan_name}`;

    modal.classList.remove('hidden');
}

// Alias for backward compatibility
function editUploadLimit(settingId) {
    editStorageSettings(settingId);
}

async function saveStorageSettings(event) {
    event.preventDefault();

    const settingId = document.getElementById('storage-setting-id').value;
    const subscriptionPlanId = document.getElementById('storage-subscription-plan-id').value;

    // Validation for new settings
    if (!settingId && !subscriptionPlanId) {
        alert('Please select a subscription plan');
        return;
    }

    const settingsData = {
        subscription_plan_id: parseInt(subscriptionPlanId),
        max_image_size_mb: parseInt(document.getElementById('storage-max-image-size').value) || 5,
        max_video_size_mb: parseInt(document.getElementById('storage-max-video-size').value) || 50,
        max_document_size_mb: parseInt(document.getElementById('storage-max-document-size').value) || 10,
        max_audio_size_mb: parseInt(document.getElementById('storage-max-audio-size').value) || 10,
        storage_limit_gb: parseInt(document.getElementById('storage-limit-gb').value) || 5
    };

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const isEdit = !!settingId;
        const url = isEdit
            ? `${window.API_BASE_URL}/api/admin/system/upload-limits/${settingId}`
            : `${window.API_BASE_URL}/api/admin/system/upload-limits`;

        console.log(`${isEdit ? 'Updating' : 'Creating'} storage settings:`, settingsData);

        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settingsData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Failed to save storage settings');
        }

        if (!result.success) {
            throw new Error(result.message || 'Failed to save storage settings');
        }

        // Reload data
        await loadStorageSettings();
        closeUploadLimitModal();
        alert(`Storage settings ${isEdit ? 'updated' : 'created'} successfully!`);

    } catch (error) {
        console.error('Error saving storage settings:', error);
        alert(error.message || 'Failed to save storage settings. Please try again.');
    }
}

// Alias for backward compatibility
function saveUploadLimit(event) {
    saveStorageSettings(event);
}

async function deleteStorageSettings(settingId) {
    const setting = storageSettings.find(s => s.id === settingId);
    if (!setting) return;

    if (!confirm(`Are you sure you want to delete storage settings for "${setting.plan_name}"?\n\nThis will affect users on this plan.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/upload-limits/${settingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete storage settings');
        }

        // Reload data
        await loadStorageSettings();
        alert('Storage settings deleted successfully!');

    } catch (error) {
        console.error('Error deleting storage settings:', error);
        alert('Failed to delete storage settings. Please try again.');
    }
}

// Alias for backward compatibility
function deleteUploadLimit(settingId) {
    deleteStorageSettings(settingId);
}

// ============================================
// EXPORTS & INITIALIZATION
// ============================================

// Export functions to window
window.loadStorageSettings = loadStorageSettings;
window.loadUploadLimits = loadStorageSettings; // Alias
window.renderStorageSettingsGrid = renderStorageSettingsGrid;
window.renderUploadLimitsGrid = renderStorageSettingsGrid; // Alias
window.openAddStorageSettingsModal = openAddStorageSettingsModal;
window.openAddUploadLimitModal = openAddStorageSettingsModal; // Alias
window.closeUploadLimitModal = closeUploadLimitModal;
window.editStorageSettings = editStorageSettings;
window.editUploadLimit = editStorageSettings; // Alias
window.saveStorageSettings = saveStorageSettings;
window.saveUploadLimit = saveStorageSettings; // Alias
window.deleteStorageSettings = deleteStorageSettings;
window.deleteUploadLimit = deleteStorageSettings; // Alias
window.selectPlan = selectPlan;
window.clearSelectedPlan = clearSelectedPlan;

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    const searchContainer = document.getElementById('plan-search-container');
    const resultsContainer = document.getElementById('plan-search-results');

    if (searchContainer && resultsContainer && !searchContainer.contains(e.target)) {
        resultsContainer.classList.add('hidden');
    }
});

// ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('upload-limit-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeUploadLimitModal();
        }
    }
});

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Storage Settings Manager initialized');

    const grid = document.getElementById('upload-limits-grid');
    if (grid) {
        console.log('upload-limits-grid found, loading settings...');
        loadStorageSettings();
    } else {
        console.log('upload-limits-grid NOT FOUND on page load');
        setTimeout(() => {
            const gridDelayed = document.getElementById('upload-limits-grid');
            if (gridDelayed) {
                console.log('upload-limits-grid found after delay, loading settings...');
                loadStorageSettings();
            }
        }, 500);
    }
});

// Also load when media panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'media') {
        console.log('Media panel activated, loading storage settings...');
        setTimeout(() => loadStorageSettings(), 100);
    }
});
