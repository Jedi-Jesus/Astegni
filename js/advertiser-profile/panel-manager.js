// ============================================
// ADVERTISER PROFILE PANEL MANAGER
// Handles panel switching for advertiser dashboard
// ============================================

/**
 * Switch between different panels in the advertiser profile dashboard
 * @param {string} panelName - The name of the panel to switch to (e.g., 'dashboard', 'campaigns')
 */
async function switchPanel(panelName) {
    console.log(`🔄 [Advertiser Profile] Switching to panel: ${panelName}`);

    // ✅ 2FA PRE-VERIFICATION - Uses user-configurable protected panels
    // Check if ProtectedAPI is available and use dynamic panel protection
    if (typeof ProtectedAPI !== 'undefined' && ProtectedAPI.requirePanelVerification) {
        const verified = await ProtectedAPI.requirePanelVerification(panelName, 'advertiser');

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
        const sidebar = document.getElementById('sidebar');
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
        detail: { panelName }
    });
    window.dispatchEvent(panelSwitchEvent);

    // Initialize panel-specific managers when switching
    if (panelName === 'brands' && typeof BrandsManager !== 'undefined') {
        console.log('🏷️ Initializing BrandsManager for brands panel...');
        // Always initialize to ensure brands are loaded and rendered
        BrandsManager.initialize();

        // Force a render after a short delay to ensure DOM is ready
        setTimeout(() => {
            console.log('🏷️ Force rendering brands after panel switch...');
            if (typeof BrandsManager.renderBrands === 'function') {
                BrandsManager.renderBrands();
            }
        }, 100);
    }
}

/**
 * Initialize panel manager on page load
 */
function initPanelManager() {
    console.log('📊 Initializing Advertiser Profile Panel Manager...');

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

    console.log('✅ Advertiser Profile Panel Manager initialized');
}

/**
 * Switch between tabs within the Job Board panel
 * @param {string} tabName - The name of the tab to switch to (e.g., 'draft-post', 'active-jobs')
 */
function switchJobTab(tabName) {
    console.log(`🔄 [Job Board] Switching to tab: ${tabName}`);

    // Hide all job tab contents
    const allJobTabs = document.querySelectorAll('.job-tab-content');
    allJobTabs.forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    // Show selected job tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
        console.log(`✅ Job tab "${tabName}" activated`);
    } else {
        console.error(`❌ Job tab "${tabName}-tab" not found in DOM`);
    }

    // Update tab button active state
    const allTabButtons = document.querySelectorAll('.tab-btn');
    allTabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottomColor = 'transparent';
        btn.style.color = 'var(--text-muted)';
    });

    // Find and activate the corresponding tab button
    const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeTabBtn) {
        activeTabBtn.classList.add('active');
        activeTabBtn.style.borderBottomColor = 'var(--button-bg)';
        activeTabBtn.style.color = 'var(--text-primary)';
        console.log(`✅ Tab button for "${tabName}" activated`);
    }

    // Load data for the selected tab (lazy loading)
    switch (tabName) {
        case 'drafts':
            if (typeof loadDrafts === 'function') loadDrafts();
            break;
        case 'active-jobs':
            if (typeof loadActiveJobs === 'function') loadActiveJobs();
            break;
        case 'closed-jobs':
            if (typeof loadClosedJobs === 'function') loadClosedJobs();
            break;
        case 'applications':
            if (typeof loadApplications === 'function') loadApplications();
            break;
        case 'analytics':
            if (typeof loadJobAnalytics === 'function') loadJobAnalytics();
            break;
    }

    // Scroll to top of panel for better UX
    const jobsPanel = document.getElementById('jobs-panel');
    if (jobsPanel) {
        jobsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Export to window for onclick handlers
window.switchPanel = switchPanel;
window.switchJobTab = switchJobTab;
window.initPanelManager = initPanelManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPanelManager);
} else {
    // DOM already loaded
    initPanelManager();
}

console.log('✅ Advertiser Profile Panel Manager module loaded');
