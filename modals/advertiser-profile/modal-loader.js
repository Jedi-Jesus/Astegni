// ============================================
// ADVERTISER PROFILE MODAL LOADER
// Dynamically loads advertiser-specific modals
// ============================================

console.log('📂 Loading Advertiser Profile Modals...');

// List of advertiser-specific modals to preload
const ADVERTISER_MODALS = [
    'create-job-modal.html'
    // Add more advertiser modals here as they're created
];

// Base path for advertiser modals
const ADVERTISER_MODAL_BASE_PATH = '../modals/advertiser-profile/';

/**
 * Load a single advertiser modal
 * @param {string} modalFileName - The modal HTML file name
 */
async function loadAdvertiserModal(modalFileName) {
    try {
        const response = await fetch(ADVERTISER_MODAL_BASE_PATH + modalFileName);

        if (!response.ok) {
            console.error(`❌ Failed to load ${modalFileName}: ${response.status}`);
            return;
        }

        const modalHTML = await response.text();

        // Create a container div and insert the modal
        const container = document.createElement('div');
        container.innerHTML = modalHTML;
        document.body.appendChild(container);

        console.log(`✅ Loaded advertiser modal: ${modalFileName}`);
    } catch (error) {
        console.error(`❌ Error loading ${modalFileName}:`, error);
    }
}

/**
 * Load all advertiser modals
 */
async function loadAllAdvertiserModals() {
    console.log(`📥 Preloading ${ADVERTISER_MODALS.length} advertiser modals...`);

    // Load all modals in parallel
    await Promise.all(
        ADVERTISER_MODALS.map(modalFileName => loadAdvertiserModal(modalFileName))
    );

    console.log('✅ All advertiser modals loaded');
}

// Auto-load modals when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllAdvertiserModals);
} else {
    loadAllAdvertiserModals();
}
