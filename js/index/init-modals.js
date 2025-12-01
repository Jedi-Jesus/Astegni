
// ============================================
//   MODALS
// ============================================

/**
 * Attach form event listeners to modals
 * Called after modals are loaded into the DOM
 */
function attachModalFormHandlers() {
    console.log('[initializeModals] Attaching form handlers to dynamically loaded modals...');

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const forgotPasswordForm = document.getElementById("forgot-password-form");
    const resetPasswordForm = document.getElementById("reset-password-form");

    if (loginForm) {
        // Remove any existing listener to prevent duplicates
        loginForm.removeEventListener("submit", handleLogin);
        loginForm.addEventListener("submit", handleLogin);
        console.log('[initializeModals] Login form handler attached');
    } else {
        console.warn('[initializeModals] Login form not found in DOM');
    }

    if (registerForm) {
        registerForm.removeEventListener("submit", handleRegister);
        registerForm.addEventListener("submit", handleRegister);
        console.log('[initializeModals] Register form handler attached');
    } else {
        console.warn('[initializeModals] Register form not found in DOM');
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.removeEventListener("submit", handleForgotPassword);
        forgotPasswordForm.addEventListener("submit", handleForgotPassword);
        console.log('[initializeModals] Forgot password form handler attached');
    }

    if (resetPasswordForm) {
        resetPasswordForm.removeEventListener("submit", handleResetPassword);
        resetPasswordForm.addEventListener("submit", handleResetPassword);
        console.log('[initializeModals] Reset password form handler attached');
    }

    // Handle select element floating labels
    initializeSelectLabels();

    // Add click-outside-to-close for all modals
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Attach password validation listeners for register form
    const registerPassword = document.getElementById('register-password');
    const registerConfirmPassword = document.getElementById('register-confirm-password');

    if (registerPassword) {
        registerPassword.addEventListener('input', (e) => {
            if (typeof calculatePasswordStrength === 'function') {
                calculatePasswordStrength(e.target.value);
            }
            if (typeof validatePasswordMatch === 'function') {
                validatePasswordMatch();
            }
        });
    }

    if (registerConfirmPassword) {
        registerConfirmPassword.addEventListener('input', () => {
            if (typeof validatePasswordMatch === 'function') {
                validatePasswordMatch();
            }
        });
    }

    console.log('[initializeModals] All form handlers attached successfully');
}

function initializeModals() {
    // Check if modals are already in the DOM (inline modals)
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        // Modals are already in DOM - attach handlers immediately
        console.log('[initializeModals] Modals found in DOM, attaching handlers immediately');
        attachModalFormHandlers();
    } else {
        // Modals will be loaded dynamically - wait for modalsLoaded event
        console.log('[initializeModals] Modals not yet in DOM, waiting for modalsLoaded event...');

        // Listen for the modalsLoaded event from IndexModalLoader
        document.addEventListener('modalsLoaded', (event) => {
            console.log('[initializeModals] modalsLoaded event received:', event.detail);
            attachModalFormHandlers();
        }, { once: true }); // Only listen once

        // Fallback: If modals were loaded before this listener was attached,
        // check again after a short delay
        setTimeout(() => {
            const loginFormCheck = document.getElementById("login-form");
            if (loginFormCheck && !loginFormCheck.hasAttribute('data-handlers-attached')) {
                console.log('[initializeModals] Fallback: Modals found after delay, attaching handlers');
                attachModalFormHandlers();
                loginFormCheck.setAttribute('data-handlers-attached', 'true');
            }
        }, 500);
    }

    // These don't depend on dynamic modals - initialize immediately
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Initialize select elements to properly handle floating labels
function initializeSelectLabels() {
    const selectElements = document.querySelectorAll(
        '#login-modal select, #register-modal select, #partner-modal select, #forgot-password-modal select'
    );

    selectElements.forEach(select => {
        // Check initial value
        updateSelectClass(select);

        // Update on change
        select.addEventListener('change', () => {
            updateSelectClass(select);
        });

        // Update on focus (to show options immediately)
        select.addEventListener('focus', () => {
            select.classList.add('has-value');
        });

        // Update on blur
        select.addEventListener('blur', () => {
            updateSelectClass(select);
        });
    });
}

function updateSelectClass(select) {
    if (select.value && select.value !== '') {
        select.classList.add('has-value');
    } else {
        select.classList.remove('has-value');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        setTimeout(() => modal.classList.add("active"), 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        modal.classList.remove("front");
        setTimeout(() => {
            modal.style.display = "none";
            modal.classList.add("hidden");
            document.body.style.overflow = "";
        }, 300);
    }
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    setTimeout(() => openModal(toModal), 300);
}

// Export modal functions to window
window.openModal = openModal;
window.closeModal = closeModal;
window.switchModal = switchModal;
window.attachModalFormHandlers = attachModalFormHandlers;
window.initializeModals = initializeModals;