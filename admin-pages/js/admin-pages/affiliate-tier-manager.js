// Affiliate Tier Manager
// Handles dynamic affiliate tier management with modal-based CRUD

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
let affiliateProgram = {
    id: null,
    enabled: false,
    payout_threshold: 1000,
    payout_schedule: 'monthly'
};
let affiliateTiers = [];
let currentBusinessType = 'tutoring'; // Default to tutoring tab

// ============================================
// LOAD FUNCTIONS
// ============================================

async function loadAffiliateProgram(businessType = null) {
    console.log('loadAffiliateProgram() called with businessType:', businessType);

    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('No auth token found, loading defaults');
            affiliateTiers = getDefaultTiers();
            renderAffiliateTiers();
            updateTabCounts();
            return;
        }

        const apiUrl = getApiBaseUrl();
        // Fetch all tiers regardless of business type for tab counts
        console.log('Fetching affiliate program from API...', apiUrl);
        const response = await fetch(`${apiUrl}/api/admin-db/affiliate-program`, {
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

        if (data.success) {
            // Load global settings
            if (data.program) {
                affiliateProgram = data.program;
                populateGlobalSettings();
            }

            // Load all tiers
            if (data.tiers && data.tiers.length > 0) {
                affiliateTiers = data.tiers;
            } else {
                affiliateTiers = getDefaultTiers();
            }

            console.log(`Loaded ${affiliateTiers.length} tiers`);
            updateTabCounts();
            renderAffiliateTiers();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading affiliate program:', error);
        affiliateTiers = getDefaultTiers();
        renderAffiliateTiers();
        updateTabCounts();
    }
}

function getDefaultTiers() {
    return [
        {
            tier_level: 1,
            tier_name: 'Direct Referral',
            commission_rate: 10,
            duration_months: 12,
            is_active: true,
            business_type: 'tutoring'
        },
        {
            tier_level: 2,
            tier_name: '2nd Level',
            commission_rate: 5,
            duration_months: 6,
            is_active: true,
            business_type: 'tutoring'
        }
    ];
}

function populateGlobalSettings() {
    const enabledCheckbox = document.getElementById('affiliate-program-enabled');
    const payoutThreshold = document.getElementById('payout-threshold');
    const payoutSchedule = document.getElementById('payout-schedule');

    if (enabledCheckbox) enabledCheckbox.checked = affiliateProgram.enabled;
    if (payoutThreshold) payoutThreshold.value = affiliateProgram.payout_threshold || 1000;
    if (payoutSchedule) payoutSchedule.value = affiliateProgram.payout_schedule || 'monthly';
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAffiliateTiers() {
    console.log('renderAffiliateTiers() called with', affiliateTiers.length, 'tiers');

    const colors = [
        { border: 'emerald-300', bg: 'emerald-50', text: 'emerald-700', icon: 'emerald-600' },
        { border: 'blue-300', bg: 'blue-50', text: 'blue-700', icon: 'blue-600' },
        { border: 'purple-300', bg: 'purple-50', text: 'purple-700', icon: 'purple-600' },
        { border: 'amber-300', bg: 'amber-50', text: 'amber-700', icon: 'amber-600' },
        { border: 'rose-300', bg: 'rose-50', text: 'rose-700', icon: 'rose-600' },
        { border: 'cyan-300', bg: 'cyan-50', text: 'cyan-700', icon: 'cyan-600' }
    ];

    // Render for each business type
    const businessTypes = ['tutoring', 'subscription', 'advertisement'];

    businessTypes.forEach(businessType => {
        const grid = document.querySelector(`.affiliate-tiers-grid[data-business-type="${businessType}"]`);
        if (!grid) {
            console.warn(`Grid for business type ${businessType} not found`);
            return;
        }

        // Filter tiers for this business type
        const filteredTiers = affiliateTiers.filter(t => t.business_type === businessType);

        if (filteredTiers.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <i class="fas fa-layer-group text-4xl mb-4"></i>
                    <p class="text-lg font-semibold">No tiers for ${businessType}</p>
                    <p class="text-sm">Click "Add Tier" to create your first commission tier</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredTiers.map((tier, index) => {
            const color = colors[index % colors.length];
            const commission = parseFloat(tier.commission_rate) || 0;
            const duration = tier.duration_months || 12;
            const isActive = tier.is_active !== false;
            const businessTypeDisplay = tier.business_type || 'tutoring';

            return `
                <div class="border-2 border-${color.border} rounded-xl p-5 bg-${color.bg} hover:shadow-xl transition-all relative cursor-pointer group ${!isActive ? 'opacity-60' : ''}"
                    onclick="editAffiliateTier(${tier.tier_level}, '${businessTypeDisplay}')" title="Click to edit">

                    <button onclick="event.stopPropagation(); deleteAffiliateTier(${tier.tier_level}, '${businessTypeDisplay}')"
                        class="absolute top-2 left-2 w-7 h-7 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete tier">
                        <i class="fas fa-times"></i>
                    </button>

                    ${!isActive ? `
                    <span class="absolute top-2 right-2 px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full">
                        Inactive
                    </span>
                    ` : ''}

                    <div class="text-center mb-4">
                        <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                            <span class="text-2xl font-bold text-${color.icon}">${tier.tier_level}</span>
                        </div>
                        <h4 class="text-lg font-bold text-${color.text}">${tier.tier_name}</h4>
                        <p class="text-xs text-gray-500">Level ${tier.tier_level} Referral</p>
                    </div>

                    <div class="text-center mb-4 py-3 bg-white/50 rounded-lg">
                        <div class="text-3xl font-bold text-${color.text}">${commission}%</div>
                        <div class="text-sm text-gray-600">Commission Rate</div>
                    </div>

                    <div class="text-center py-2 bg-white/30 rounded-lg">
                        <div class="text-lg font-semibold text-gray-700">Valid Max ${duration} months</div>
                        <div class="text-xs text-gray-500">Duration</div>
                    </div>
                </div>
            `;
        }).join('');

        console.log(`Rendered ${filteredTiers.length} tier cards for ${businessType}`);
    });
}

// ============================================
// TAB FUNCTIONS
// ============================================

function switchAffiliateBusinessTab(businessType) {
    console.log('Switching to business type:', businessType);
    currentBusinessType = businessType;

    // Update tab buttons
    const tabs = document.querySelectorAll('.affiliate-business-tab');
    tabs.forEach(tab => {
        if (tab.dataset.tab === businessType) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update tab panels
    const panels = document.querySelectorAll('.affiliate-business-tab-panel');
    panels.forEach(panel => {
        if (panel.id === `affiliate-business-tab-${businessType}`) {
            panel.classList.remove('hidden');
            panel.classList.add('active');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('active');
        }
    });
}

function updateTabCounts() {
    const businessTypes = ['tutoring', 'subscription', 'advertisement'];

    businessTypes.forEach(businessType => {
        const count = affiliateTiers.filter(t => t.business_type === businessType).length;
        const tab = document.querySelector(`.affiliate-business-tab[data-tab="${businessType}"] .tab-count`);
        if (tab) {
            tab.textContent = count;
        }
    });
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openAddAffiliateTierModal() {
    const modal = document.getElementById('affiliate-tier-modal');
    if (!modal) {
        console.error('Affiliate tier modal not found');
        return;
    }

    document.getElementById('affiliate-tier-modal-title').innerHTML =
        '<i class="fas fa-layer-group mr-2"></i>Add Affiliate Tier';
    document.getElementById('affiliate-tier-form').reset();
    document.getElementById('affiliate-tier-level').value = '';
    document.getElementById('affiliate-tier-original-level').value = '';
    document.getElementById('affiliate-tier-original-business-type').value = '';

    // Set business type to current tab
    document.getElementById('affiliate-tier-business-type').value = currentBusinessType;

    // Set default tier level (next available for this business type)
    const tiersForType = affiliateTiers.filter(t => t.business_type === currentBusinessType);
    const nextLevel = tiersForType.length + 1;
    document.getElementById('affiliate-tier-level').value = nextLevel;

    // Set default values
    document.getElementById('affiliate-tier-name').value = nextLevel === 1 ? 'Direct Referral' : `Level ${nextLevel}`;
    document.getElementById('affiliate-tier-commission').value = Math.max(1, 10 - (nextLevel - 1) * 3);
    document.getElementById('affiliate-tier-duration').value = Math.max(3, 12 - (nextLevel - 1) * 3);
    document.getElementById('affiliate-tier-active').checked = true;

    modal.classList.remove('hidden');
}

function editAffiliateTier(tierLevel, businessType) {
    const tier = affiliateTiers.find(t => t.tier_level === tierLevel && t.business_type === businessType);
    if (!tier) {
        console.error('Tier not found:', tierLevel, businessType);
        return;
    }

    document.getElementById('affiliate-tier-modal-title').innerHTML =
        '<i class="fas fa-layer-group mr-2"></i>Edit Affiliate Tier';
    document.getElementById('affiliate-tier-level').value = tier.tier_level;
    document.getElementById('affiliate-tier-original-level').value = tier.tier_level;
    document.getElementById('affiliate-tier-business-type').value = tier.business_type || 'tutoring';
    document.getElementById('affiliate-tier-original-business-type').value = tier.business_type || 'tutoring';
    document.getElementById('affiliate-tier-name').value = tier.tier_name;
    document.getElementById('affiliate-tier-commission').value = tier.commission_rate;
    document.getElementById('affiliate-tier-duration').value = tier.duration_months;
    document.getElementById('affiliate-tier-active').checked = tier.is_active !== false;

    const modal = document.getElementById('affiliate-tier-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeAffiliateTierModal() {
    const modal = document.getElementById('affiliate-tier-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ============================================
// SAVE FUNCTIONS
// ============================================

async function saveAffiliateTier(event) {
    event.preventDefault();

    const tierLevel = parseInt(document.getElementById('affiliate-tier-level').value);
    const tierName = document.getElementById('affiliate-tier-name').value.trim();
    const commissionRate = parseFloat(document.getElementById('affiliate-tier-commission').value);
    const durationMonths = parseInt(document.getElementById('affiliate-tier-duration').value);
    const isActive = document.getElementById('affiliate-tier-active').checked;
    const businessType = document.getElementById('affiliate-tier-business-type').value;

    // Validation
    if (!tierLevel || tierLevel < 1) {
        alert('Please enter a valid tier level (1 or higher)');
        return;
    }
    if (!tierName) {
        alert('Please enter a tier name');
        return;
    }
    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        alert('Please enter a valid commission rate (0-100%)');
        return;
    }
    if (isNaN(durationMonths) || durationMonths < 1) {
        alert('Please enter a valid max duration (1 month or more)');
        return;
    }
    if (!businessType) {
        alert('Please select a business type');
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const tierData = {
            program_id: affiliateProgram.id,
            tier_level: tierLevel,
            tier_name: tierName,
            commission_rate: commissionRate,
            duration_months: durationMonths,
            is_active: isActive,
            business_type: businessType
        };

        console.log('Saving affiliate tier:', tierData);

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin-db/affiliate-tiers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tierData)
        });

        if (!response.ok) {
            throw new Error('Failed to save tier');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save tier');
        }

        // Reload tiers from database
        await loadAffiliateProgram();
        closeAffiliateTierModal();

        alert('Affiliate tier saved successfully!');

    } catch (error) {
        console.error('Error saving affiliate tier:', error);
        alert('Failed to save affiliate tier. Please try again.');
    }
}

async function deleteAffiliateTier(tierLevel, businessType) {
    const tier = affiliateTiers.find(t => t.tier_level === tierLevel && t.business_type === businessType);
    if (!tier) return;

    if (!confirm(`Are you sure you want to delete "${tier.tier_name}" (${businessType})?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const programId = affiliateProgram.id || tier.program_id;
        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin-db/affiliate-tiers/${programId}/${tierLevel}/${businessType}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete tier');
        }

        // Reload tiers
        await loadAffiliateProgram();
        alert('Affiliate tier deleted successfully!');

    } catch (error) {
        console.error('Error deleting affiliate tier:', error);
        alert('Failed to delete affiliate tier. Please try again.');
    }
}

// ============================================
// PROGRAM SETTINGS MODAL FUNCTIONS
// ============================================

function openAffiliateProgramSettingsModal() {
    const modal = document.getElementById('affiliate-program-settings-modal');
    if (!modal) {
        console.error('Affiliate program settings modal not found');
        return;
    }

    // Populate form with current values
    const enabledCheckbox = document.getElementById('affiliate-program-enabled');
    const payoutThreshold = document.getElementById('payout-threshold');
    const payoutSchedule = document.getElementById('payout-schedule');

    if (enabledCheckbox) enabledCheckbox.checked = affiliateProgram.enabled;
    if (payoutThreshold) payoutThreshold.value = affiliateProgram.payout_threshold || 1000;
    if (payoutSchedule) payoutSchedule.value = affiliateProgram.payout_schedule || 'monthly';

    modal.classList.remove('hidden');
}

function closeAffiliateProgramSettingsModal() {
    const modal = document.getElementById('affiliate-program-settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save global settings (enabled, payout threshold, schedule)
async function saveAffiliateProgramSettings(event) {
    if (event) event.preventDefault();

    const programEnabled = document.getElementById('affiliate-program-enabled')?.checked || false;
    const payoutThreshold = parseFloat(document.getElementById('payout-threshold')?.value) || 1000;
    const payoutSchedule = document.getElementById('payout-schedule')?.value || 'monthly';

    // Validation
    if (isNaN(payoutThreshold) || payoutThreshold < 0) {
        alert('Please enter a valid payout threshold');
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        console.log('Saving affiliate program settings...');

        const programData = {
            enabled: programEnabled,
            payout_threshold: payoutThreshold,
            payout_schedule: payoutSchedule
        };

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin-db/affiliate-program`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(programData)
        });

        const result = await response.json();

        if (result.success) {
            // Update local state
            affiliateProgram.enabled = programEnabled;
            affiliateProgram.payout_threshold = payoutThreshold;
            affiliateProgram.payout_schedule = payoutSchedule;

            closeAffiliateProgramSettingsModal();
            alert('Affiliate program settings saved successfully!');
        } else {
            throw new Error('Failed to save affiliate program settings');
        }
    } catch (error) {
        console.error('Error saving affiliate program settings:', error);
        alert('Failed to save affiliate program settings. Please try again.');
    }
}

// ============================================
// EXPORTS & INITIALIZATION
// ============================================

// Export functions to window
window.loadAffiliateProgram = loadAffiliateProgram;
window.renderAffiliateTiers = renderAffiliateTiers;
window.switchAffiliateBusinessTab = switchAffiliateBusinessTab;
window.updateTabCounts = updateTabCounts;
window.openAddAffiliateTierModal = openAddAffiliateTierModal;
window.editAffiliateTier = editAffiliateTier;
window.closeAffiliateTierModal = closeAffiliateTierModal;
window.saveAffiliateTier = saveAffiliateTier;
window.deleteAffiliateTier = deleteAffiliateTier;
window.openAffiliateProgramSettingsModal = openAffiliateProgramSettingsModal;
window.closeAffiliateProgramSettingsModal = closeAffiliateProgramSettingsModal;
window.saveAffiliateProgramSettings = saveAffiliateProgramSettings;

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const tierModal = document.getElementById('affiliate-tier-modal');
        const settingsModal = document.getElementById('affiliate-program-settings-modal');

        if (tierModal && !tierModal.classList.contains('hidden')) {
            closeAffiliateTierModal();
        }
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            closeAffiliateProgramSettingsModal();
        }
    }
});

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Affiliate Tier Manager initialized');

    const grid = document.getElementById('affiliate-tiers-grid');
    if (grid) {
        console.log('affiliate-tiers-grid found, loading tiers...');
        loadAffiliateProgram();
    } else {
        console.log('affiliate-tiers-grid NOT FOUND on page load');
        setTimeout(() => {
            const gridDelayed = document.getElementById('affiliate-tiers-grid');
            if (gridDelayed) {
                console.log('affiliate-tiers-grid found after delay, loading tiers...');
                loadAffiliateProgram();
            }
        }, 500);
    }
});

// Also load when pricing panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'pricing') {
        console.log('Pricing panel activated, loading affiliate tiers...');
        setTimeout(() => loadAffiliateProgram(), 100);
    }
});
