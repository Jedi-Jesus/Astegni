// ============================================
//   INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check for saved user session
        const savedUser = localStorage.getItem("currentUser");
        const savedRole = localStorage.getItem("userRole");
        const savedToken = localStorage.getItem("token") || localStorage.getItem("access_token");

        if (savedUser && savedRole && savedToken) {
            try {
                APP_STATE.currentUser = JSON.parse(savedUser);
                APP_STATE.userRole = savedRole;
                APP_STATE.isLoggedIn = true;

                // Update UI immediately with cached data
                updateUIForLoggedInUser();
                updateProfileLink(savedRole);

                // Verify token in background (don't block UI)
                window.AuthManager.verifyToken().then(isValid => {
                    if (!isValid) {
                        // Token verification failed silently - user can re-login if needed
                        // Don't show warnings for expected auth failures
                    }
                }).catch(error => {
                    // Silently handle verification errors - don't clutter console
                    // Don't clear auth on network errors - allow offline usage
                });
            } catch (error) {
                console.error("Session restoration error:", error);
                window.AuthManager.clearAuth();
            }
        }
    // Add event listeners for new forms
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    const comingSoonForm = document.getElementById('coming-soon-form');
    if (comingSoonForm) {
        comingSoonForm.addEventListener('submit', handleComingSoonNotification);
    }
    
    // Replace the existing register form handler with enhanced version
const registerForm = document.getElementById('register-form');
if (registerForm) {
    // Just add the event listener, no need to remove/re-add
    registerForm.addEventListener('submit', handleRegister);
}
    
    // Add password match validation listeners
    const registerPassword = document.getElementById('register-password');
    const registerConfirmPassword = document.getElementById('register-confirm-password');
    
    if (registerPassword) {
        registerPassword.addEventListener('input', (e) => {
            calculatePasswordStrength(e.target.value);
            validatePasswordMatch();
        });
    }
    
    if (registerConfirmPassword) {
        registerConfirmPassword.addEventListener('input', validatePasswordMatch);
    }
    
    // Initialize improved navbar responsiveness
    improveNavbarResponsiveness();
        // Initialize all features
        initializeNavigationAuth();
        initializeTheme();
        initializeNavigation();
        initializeHeroSection();
        initializeCounters();
        initializeNewsSection();
        initializeVideoCarousel();
        initializeCourses();
        initializeTestimonials();
        initializePartners();
        initializeModals();

        // Handle URL parameters for parent invitation registration
        handleParentInvitationFromURL();

        initializeScrollEffects();
        initializeFormValidation();
        initializeSearch();
        initializeNotifications();
        initializeTooltips();
        initializeLazyLoading();

        // Initialize professional reviews
        if (typeof initializeProfessionalReviews === 'function') {
            await initializeProfessionalReviews();
            // Setup carousel hover pause after initialization
            if (typeof setupCarouselHoverPause === 'function') {
                setupCarouselHoverPause();
            }
        }

        await loadRealData();

        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById("loading-screen");
            if (loadingScreen) {
                loadingScreen.classList.add("fade-out");
                document.body.style.overflow = "hidden";

                setTimeout(() => {
                    loadingScreen.style.display = "none";
                    document.body.style.overflow = "";

                    const sections = document.querySelectorAll(
                        ".hero-section, .features-section, .news-section"
                    );
                    sections.forEach((section, index) => {
                        section.style.opacity = "0";
                        section.style.transform = "translateY(30px)";
                        setTimeout(() => {
                            section.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
                            section.style.opacity = "1";
                            section.style.transform = "translateY(0)";
                        }, index * 150);
                    });
                }, 600);
            }
        }, 3000);
    } catch (error) {
        console.error("Initialization error:", error);
    }
});
