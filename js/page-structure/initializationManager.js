// ============================================
// INITIALIZATION MANAGER
// DOMContentLoaded initialization logic
// Extracted from page-structure-3.js and page-structure-4.js
// ============================================

class InitializationManager {
    static init() {
        this.initializeManagers();
        this.setupModalHandlers();
        this.setupButtonHandlers();
        this.ensureModalStyles();
    }

    static initializeManagers() {
        // Initialize modals manager if not already initialized
        if (!window.modalsManager && typeof ModalsManager !== 'undefined') {
            window.modalsManager = new ModalsManager();
        }

        // Initialize other managers if available and not initialized
        if (!window.analyticsManager && typeof AnalyticsManager !== 'undefined') {
            window.analyticsManager = new AnalyticsManager();
        }

        if (!window.weatherManager && typeof WeatherManager !== 'undefined') {
            window.weatherManager = new WeatherManager();
        }

        if (!window.widgetsManager && typeof WidgetsManager !== 'undefined') {
            window.widgetsManager = new WidgetsManager();
        }

        if (!window.animationsManager && typeof AnimationsManager !== 'undefined') {
            window.animationsManager = new AnimationsManager();
        }

        // Initialize AI Insights if available
        if (window.AIInsights) {
            window.AIInsights.init();
        }

        // Render ad packages if available
        if (window.AdPackageManager) {
            window.AdPackageManager.renderPackages();
        }
    }

    static setupModalHandlers() {
        // Ensure all modal close buttons work
        document.querySelectorAll('.modal').forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn && !closeBtn.hasAttribute('data-handler-attached')) {
                closeBtn.setAttribute('data-handler-attached', 'true');
                closeBtn.addEventListener('click', () => {
                    if (window.modalsManager) {
                        window.modalsManager.close(modal.id);
                    }
                });
            }

            // Ensure overlay closes modal
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay && !overlay.hasAttribute('data-handler-attached')) {
                overlay.setAttribute('data-handler-attached', 'true');
                overlay.addEventListener('click', () => {
                    if (window.modalsManager) {
                        window.modalsManager.close(modal.id);
                    }
                });
            }
        });

        // Fix ad placeholder learn more buttons
        document.querySelectorAll('.promo-cta').forEach(btn => {
            if (!btn.hasAttribute('data-handler-attached')) {
                btn.setAttribute('data-handler-attached', 'true');
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.modalsManager) {
                        window.modalsManager.open('promoAnalyticsModal');
                    }
                });
            }
        });
    }

    static setupButtonHandlers() {
        // Fix edit profile button
        const editProfileBtn = document.querySelector('.edit-profile');
        if (editProfileBtn && !editProfileBtn.hasAttribute('data-handler')) {
            editProfileBtn.setAttribute('data-handler', 'true');
            editProfileBtn.addEventListener('click', () => {
                if (window.modalsManager) {
                    window.modalsManager.open('edit-profile-modal');
                }
            });
        }

        // Fix schedule button
        const scheduleBtn = document.querySelector('.set-schedule');
        if (scheduleBtn && !scheduleBtn.hasAttribute('data-handler')) {
            scheduleBtn.setAttribute('data-handler', 'true');
            scheduleBtn.addEventListener('click', () => {
                if (window.modalsManager) {
                    window.modalsManager.open('create-session-modal');
                }
            });
        }
    }

    static ensureModalStyles() {
        document.querySelectorAll(".modal").forEach((modal) => {
            modal.style.position = "fixed";
            modal.style.top = "0";
            modal.style.left = "0";
            modal.style.width = "100%";
            modal.style.height = "100%";
            modal.style.zIndex = "10000";
            modal.style.display = "none";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
        });
    }

    static exposeManagerClasses() {
        // Export manager classes for global access
        if (typeof ModalsManager !== 'undefined') {
            window.ModalsManager = ModalsManager;
        }
        if (typeof AnalyticsManager !== 'undefined') {
            window.AnalyticsManager = AnalyticsManager;
        }
        if (typeof WeatherManager !== 'undefined') {
            window.WeatherManager = WeatherManager;
        }
        if (typeof WidgetsManager !== 'undefined') {
            window.WidgetsManager = WidgetsManager;
        }
        if (typeof AnimationsManager !== 'undefined') {
            window.AnimationsManager = AnimationsManager;
        }
    }
}

// Auto-initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    InitializationManager.init();
    InitializationManager.exposeManagerClasses();
    console.log("✅ Initialization Manager completed!");
});

// Export globally
window.InitializationManager = InitializationManager;

console.log("✅ Initialization Manager loaded!");
