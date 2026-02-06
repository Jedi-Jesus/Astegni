// ============================================
// TRAINING CENTER PROFILE - PART 4
// BUTTON HANDLERS AND MODAL MANAGERS
// ============================================

// ============================================
// MODALS MANAGER - ENHANCED
// ============================================


// Initialize immediately, don't wait for DOMContentLoaded
if (!window.modalsManager) {
    window.modalsManager = new ModalsManager();
}







// Global function for package selection
window.selectPackage = function(packageId) {
    const pkg = AdPackageManager.packages.find(p => p.id === packageId);
    if (!pkg) return;
    
    Utils.showToast(`✅ Selected: ${pkg.title} - ${pkg.pricePerDay} ${pkg.currency}/day`, "success");
    
    // You can add checkout redirection here
    setTimeout(() => {
        // window.location.href = `/checkout?package=${packageId}`;
        console.log('Proceed to checkout with:', pkg);
    }, 1500);
};


// ============================================
// GLOBAL FUNCTION HANDLERS
// ============================================

// Package selection handlers
window.showPackageType = function(type) {
    document.querySelectorAll('.package-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const grid = document.getElementById('packagesGrid');
    if (grid) {
        grid.innerHTML = getPackagesHTML(type);
    }
};

window.selectPackage = function(packageId) {
    Utils.showToast(`✅ Package ${packageId} selected! Redirecting to checkout...`, "success");
    setTimeout(() => {
        window.location.href = "#checkout";
    }, 1500);
};

window.submitCustomPackage = function() {
    Utils.showToast("📧 Custom package request sent! We'll contact you within 24 hours.", "success");
    window.modalsManager.close('promoAnalyticsModal');
};

// Switch metric for analytics
window.switchMetric = function(metric) {
    if (window.analyticsManager) {
        window.analyticsManager.switchMetric(metric);
    }
};

// View all events handler
window.viewAllEvents = function() {
    window.eventsManager.viewAllEvents();
};

// ============================================
// INITIALIZE ON DOM READY
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize enhanced modals manager if not already initialized
    if (!window.modalsManager) {
        window.modalsManager = new ModalsManager();
    }

    // Initialize other managers if needed
    if (!window.analyticsManager) {
        window.analyticsManager = new AnalyticsManager();
    }

    if (!window.weatherManager) {
        window.weatherManager = new WeatherManager();
    }

    if (!window.widgetsManager) {
        window.widgetsManager = new WidgetsManager();
    }

    if (!window.animationsManager) {
        window.animationsManager = new AnimationsManager();
    }

    
    AIInsights.init();

    // Enhance ad analytics modal
AdPackageManager.renderPackages();

    // Ensure all modal close buttons work
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn && !closeBtn.hasAttribute('data-handler-attached')) {
            closeBtn.setAttribute('data-handler-attached', 'true');
            closeBtn.addEventListener('click', () => {
                window.modalsManager.close(modal.id);
            });
        }

        // Ensure overlay closes modal
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay && !overlay.hasAttribute('data-handler-attached')) {
            overlay.setAttribute('data-handler-attached', 'true');
            overlay.addEventListener('click', () => {
                window.modalsManager.close(modal.id);
            });
        }
    });

    // Fix ad placeholder learn more buttons
    document.querySelectorAll('.promo-cta').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.modalsManager.open('promoAnalyticsModal');
        });
    });

    // Ensure all buttons have proper handlers
    attachAllButtonHandlers();

    console.log("✅ Training Center Profile Part 4 - All buttons initialized!");
});

// ============================================
// ATTACH ALL BUTTON HANDLERS
// ============================================
// Update the button handler attachments (around line 1340)
function attachAllButtonHandlers() {
    // Fix edit profile button
    const editProfileBtn = document.querySelector('.edit-profile');
    if (editProfileBtn && !editProfileBtn.hasAttribute('data-handler')) {
        editProfileBtn.setAttribute('data-handler', 'true');
        editProfileBtn.addEventListener('click', () => {
            window.modalsManager.open('edit-profile-modal'); // Correct ID
        });
    }

    // Fix schedule button  
    const scheduleBtn = document.querySelector('.set-schedule');
    if (scheduleBtn && !scheduleBtn.hasAttribute('data-handler')) {
        scheduleBtn.setAttribute('data-handler', 'true');
        scheduleBtn.addEventListener('click', () => {
            window.modalsManager.open('create-session-modal'); // Correct ID
        });
    }
}

// Export managers for global access
window.ModalsManager = ModalsManager;
window.AnalyticsManager = AnalyticsManager;
window.WeatherManager = WeatherManager;
window.WidgetsManager = WidgetsManager;
window.AnimationsManager = AnimationsManager;

console.log("✅ Page Structure 4 loaded (uses modular managers)!");
console.log("   → Using: adPackageFunctionsManager.js, initializationManager.js");