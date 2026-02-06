// ============================================
// TUTOR PROFILE PANEL MANAGER
// Handles panel switching for tutor dashboard
// ============================================

/**
 * Switch between different panels in the tutor profile dashboard
 * @param {string} panelName - The name of the panel to switch to (e.g., 'dashboard', 'my-students')
 */
async function switchPanel(panelName) {
    console.log(`🔄 Switching to panel: ${panelName}`);

    // ✅ 2FA PRE-VERIFICATION - Uses user-configurable protected panels
    // Check if ProtectedAPI is available and use dynamic panel protection
    if (typeof ProtectedAPI !== 'undefined' && ProtectedAPI.requirePanelVerification) {
        const verified = await ProtectedAPI.requirePanelVerification(panelName, 'tutor');

        if (!verified) {
            console.log('❌ 2FA verification failed or cancelled');
            return; // Don't switch panel
        }
    }

    // Hide all panels
    const allPanels = document.querySelectorAll('.panel-content');
    allPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });

    // Show selected panel
    const selectedPanel = document.getElementById(`${panelName}-panel`);
    if (selectedPanel) {
        selectedPanel.classList.remove('hidden');
        selectedPanel.classList.add('active');
        console.log(`✅ Panel "${panelName}" activated`);
    } else {
        console.error(`❌ Panel "${panelName}-panel" not found in DOM`);
        console.log('Available panels:', Array.from(allPanels).map(p => p.id));
    }

    // Update sidebar active state
    const allSidebarLinks = document.querySelectorAll('.sidebar-link');
    allSidebarLinks.forEach(link => {
        link.classList.remove('active');
    });

    // Find and activate the corresponding sidebar link
    const activeLink = Array.from(allSidebarLinks).find(link =>
        link.getAttribute('onclick')?.includes(`'${panelName}'`)
    );
    if (activeLink) {
        activeLink.classList.add('active');
        console.log(`✅ Sidebar link for "${panelName}" activated`);
    } else {
        console.warn(`⚠️ No sidebar link found for panel: ${panelName}`);
    }

    // Hide profile header for non-dashboard panels
    const profileHeader = document.querySelector('.profile-header-section');
    if (profileHeader) {
        profileHeader.style.display = panelName === 'dashboard' ? 'block' : 'none';
    }

    // Close sidebar on mobile after panel switch
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('packageManagementSidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
            console.log('📱 Sidebar closed (mobile view)');
        }
    }

    // Update URL without page reload (optional - for better UX)
    if (history.pushState) {
        const newUrl = `${window.location.pathname}?panel=${panelName}`;
        history.pushState({ panel: panelName }, '', newUrl);
    }

    // Scroll to top of page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger custom event for other modules to listen to
    const panelSwitchEvent = new CustomEvent('panelSwitch', {
        detail: { panel: panelName, panelName }
    });
    window.dispatchEvent(panelSwitchEvent);

    // Also dispatch 'panelSwitched' for backward compatibility
    const panelSwitchedEvent = new CustomEvent('panelSwitched', {
        detail: { panel: panelName, panelName }
    });
    window.dispatchEvent(panelSwitchedEvent);

    // Initialize Community Panel when switching to community
    if (panelName === 'community' && window.tutorCommunityPanel) {
        console.log('🎯 Initializing Community Panel...');
        setTimeout(() => {
            window.tutorCommunityPanel.initialize();
        }, 100);
    }

    // Load Packages Panel when switching to packages
    if (panelName === 'packages' && window.loadPackagesPanel) {
        console.log('📦 Loading Packages Panel...');
        setTimeout(() => {
            window.loadPackagesPanel();
        }, 100);
    }

    // Initialize Earnings & Investments Panel when switching to earnings-investments
    if (panelName === 'earnings-investments' && window.EarningsInvestmentsManager) {
        console.log('💰 Initializing Earnings & Investments Panel...');
        setTimeout(() => {
            window.EarningsInvestmentsManager.init();
        }, 100);
    }
}

/**
 * Initialize panel manager on page load
 */
function initPanelManager() {
    console.log('📊 Initializing Tutor Profile Panel Manager...');

    // Check URL for panel parameter and switch to it
    const urlParams = new URLSearchParams(window.location.search);
    const panelFromUrl = urlParams.get('panel');

    if (panelFromUrl) {
        console.log(`🔗 URL contains panel parameter: ${panelFromUrl}`);
        switchPanel(panelFromUrl);
    } else {
        // FIXED: Immediately add ?panel=dashboard to URL to ensure consistent behavior
        console.log('🏠 No panel in URL, redirecting to dashboard with parameter');
        window.location.href = `${window.location.pathname}?panel=dashboard`;
        return; // Stop execution, page will reload with parameter
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.panel) {
            console.log(`⬅️ Browser navigation to panel: ${event.state.panel}`);
            switchPanel(event.state.panel);
        }
    });

    console.log('✅ Tutor Profile Panel Manager initialized');
}

// Export to window for onclick handlers
window.switchPanel = switchPanel;
window.initPanelManager = initPanelManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPanelManager);
} else {
    // DOM already loaded
    initPanelManager();
}

console.log('✅ Tutor Profile Panel Manager module loaded');
