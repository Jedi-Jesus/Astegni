// ============================================
// AD PACKAGE FUNCTIONS MANAGER
// Package selection and ad-related functions
// For advertiser profiles
// ============================================

window.selectPackage = function(packageId) {
    if (window.Utils) {
        Utils.showToast(`✅ Package ${packageId} selected! Redirecting to checkout...`, "success");
    }
    setTimeout(() => {
        window.location.href = "#checkout";
    }, 1500);
};

window.showPackageType = function(type) {
    document.querySelectorAll('.package-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }

    const grid = document.getElementById('packagesGrid');
    if (grid && window.AdPackageManager) {
        grid.innerHTML = window.AdPackageManager.getPackagesHTML(type);
    }
};

window.submitCustomPackage = function() {
    if (window.Utils) {
        Utils.showToast("📧 Custom package request sent! We'll contact you within 24 hours.", "success");
    }
    if (window.modalsManager) {
        window.modalsManager.close('adAnalyticsModal');
    }
};

window.switchMetric = function(metric) {
    if (window.analyticsManager) {
        window.analyticsManager.switchMetric(metric);
    }
};

window.viewAllEvents = function() {
    if (window.eventsManager) {
        window.eventsManager.viewAllEvents();
    }
};

console.log("✅ Ad Package Functions Manager loaded!");
