// ============================================
// PARENT PROFILE PANEL MANAGER
// Handles panel switching for parent dashboard
// ============================================

/**
 * Switch between different panels in the parent profile dashboard
 * @param {string} panelName - The name of the panel to switch to (e.g., 'dashboard', 'my-children')
 */
function switchPanel(panelName) {
    console.log(`🔄 [Parent Profile] Switching to panel: ${panelName}`);

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
}

/**
 * Initialize panel manager on page load
 */
function initPanelManager() {
    console.log('📊 Initializing Parent Profile Panel Manager...');

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

    console.log('✅ Parent Profile Panel Manager initialized');
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

console.log('✅ Parent Profile Panel Manager module loaded');
