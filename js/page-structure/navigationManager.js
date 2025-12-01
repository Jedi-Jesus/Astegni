// ============================================
// NAVIGATION MANAGER
// Navigation and routing functions
// ============================================

window.navigateToStore = function() {
    window.location.href = "../branch/store.html";
};

window.shareProfile = function() {
    const profileUrl = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: 'Check out my profile',
            url: profileUrl
        }).catch(err => console.log('Share failed:', err));
    } else {
        navigator.clipboard.writeText(profileUrl);
        if (window.Utils) {
            Utils.showToast('📋 Profile link copied to clipboard!', 'success');
        }
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('leftSidebar');
    const mainContainer = document.querySelector('.main-container');

    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        if (mainContainer) {
            mainContainer.classList.toggle('sidebar-collapsed');
        }
    }
};

window.startAdvertising = function() {
    if (window.Utils) {
        Utils.showToast("📧 Opening advertising registration...", "info");
    }
    setTimeout(() => {
        window.location.href = "#advertising-signup";
    }, 1000);
};

console.log("✅ Navigation Manager loaded!");
