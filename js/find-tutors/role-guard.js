/**
 * Access Guard for Find Tutors Page
 *
 * Access policy:
 *   - User must be logged in
 *   - User must be verified (users.is_verified === true)
 *   - User must have at least one role (any role)
 *
 * Anyone meeting all three can browse find-tutors regardless of which role.
 */

(function () {
    'use strict';

    const REDIRECT_URL = '../index.html';

    /**
     * Pull a normalized roles array off the user object.
     * Accepts user.roles (array), or single user.role / user.active_role.
     */
    function getUserRoles(user) {
        if (!user) return [];
        if (Array.isArray(user.roles)) {
            return user.roles.filter(Boolean);
        }
        const single = user.active_role || user.role;
        return single ? [single] : [];
    }

    /**
     * Check if user has permission to access find-tutors page
     * @returns {Promise<boolean>}
     */
    async function checkAccess() {
        console.log('[AccessGuard] Checking access for find-tutors page...');

        const userStr = localStorage.getItem('currentUser');
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        if (!token) {
            console.log('[AccessGuard] No token - user not logged in');
            showAuthRequiredModal();
            return false;
        }

        if (!userStr) {
            console.log('[AccessGuard] No user data');
            showAuthRequiredModal();
            return false;
        }

        let user;
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error('[AccessGuard] Failed to parse user data:', e);
            showAuthRequiredModal();
            return false;
        }

        const roles = getUserRoles(user);
        const isVerified = user.is_verified === true;

        console.log('[AccessGuard] is_verified:', isVerified, 'roles:', roles);

        // Both checks must pass
        if (!isVerified && roles.length === 0) {
            showAccessDeniedModal({ reason: 'unverified_and_no_role' });
            return false;
        }
        if (!isVerified) {
            showAccessDeniedModal({ reason: 'unverified' });
            return false;
        }
        if (roles.length === 0) {
            showAccessDeniedModal({ reason: 'no_role' });
            return false;
        }

        console.log('[AccessGuard] Access granted');
        return true;
    }

    function showAuthRequiredModal() {
        const modal = document.getElementById('authRequiredModal');
        if (modal) {
            const message = document.getElementById('authModalMessage');
            if (message) {
                message.textContent = 'Please log in to access the tutor marketplace.';
            }
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        } else {
            alert('Please log in to access the tutor marketplace.');
            setTimeout(() => { window.location.href = REDIRECT_URL; }, 100);
        }
    }

    /**
     * Show access-denied modal with reason-specific copy and CTA
     */
    async function showAccessDeniedModal({ reason }) {
        let modal = document.getElementById('roleAccessDeniedModal');

        if (!modal) {
            try {
                const response = await fetch('../modals/common-modals/role-access-denied-modal.html');
                if (response.ok) {
                    const html = await response.text();
                    document.body.insertAdjacentHTML('beforeend', html);
                    modal = document.getElementById('roleAccessDeniedModal');
                } else {
                    throw new Error('Modal fetch failed');
                }
            } catch (error) {
                console.error('[AccessGuard] Failed to load modal, using fallback:', error);
                showFallbackAccessDenied(reason);
                return;
            }
        }

        const titleEl = document.getElementById('roleAccessDeniedTitle');
        const messageEl = document.getElementById('roleAccessDeniedMessage');
        const currentRoleText = document.getElementById('currentRoleText');
        const suggestionEl = document.getElementById('roleAccessDeniedSuggestion');
        const actionsEl = document.getElementById('roleAccessDeniedActions');

        if (titleEl) titleEl.textContent = 'Access Restricted';
        if (currentRoleText) currentRoleText.textContent = '';

        const goBackBtn = `
            <button onclick="goBackToPreviousPage()"
                class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                Go Back
            </button>`;

        const addRoleBtn = `
            <button onclick="openAddRoleModalFromGuard()"
                class="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span>Add Role</span>
            </button>`;

        const verifyBtn = `
            <button onclick="goToVerification()"
                class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl">
                Verify Account
            </button>`;

        if (reason === 'unverified_and_no_role') {
            if (messageEl) messageEl.textContent = 'The tutor marketplace requires a verified account with at least one role.';
            if (suggestionEl) suggestionEl.innerHTML = 'Please verify your account and add a role to continue.';
            if (actionsEl) actionsEl.innerHTML = goBackBtn + addRoleBtn + verifyBtn;
        } else if (reason === 'unverified') {
            if (messageEl) messageEl.textContent = 'The tutor marketplace is only accessible to verified users.';
            if (suggestionEl) suggestionEl.innerHTML = 'Please verify your account to continue.';
            if (actionsEl) actionsEl.innerHTML = goBackBtn + verifyBtn;
        } else if (reason === 'no_role') {
            if (messageEl) messageEl.textContent = 'The tutor marketplace requires at least one role on your account.';
            if (suggestionEl) suggestionEl.innerHTML = 'Please add a role to continue.';
            if (actionsEl) actionsEl.innerHTML = goBackBtn + addRoleBtn;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function showFallbackAccessDenied(reason) {
        const messages = {
            unverified_and_no_role: 'You must verify your account and have at least one role to access the tutor marketplace.',
            unverified: 'You must verify your account to access the tutor marketplace.',
            no_role: 'You must have at least one role to access the tutor marketplace.'
        };
        alert(messages[reason] || 'Access denied.');
        goBackToPreviousPage();
    }

    // Global helpers
    window.goBackToPreviousPage = function () {
        closeRoleAccessDeniedModal();
        if (document.referrer && document.referrer !== window.location.href) {
            window.location.href = document.referrer;
        } else if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = REDIRECT_URL;
        }
    };

    window.closeRoleAccessDeniedModal = function (event) {
        if (event && event.target !== event.currentTarget) return;
        const modal = document.getElementById('roleAccessDeniedModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    };

    // Lazy-load the verify-personal-info modal partial + its JS, then open it.
    // Idempotent — safe to call multiple times.
    let _verifyModalLoadPromise = null;
    function ensureVerifyPersonalInfoModalLoaded() {
        if (typeof window.openVerifyPersonalInfoModal === 'function') {
            return Promise.resolve();
        }
        if (_verifyModalLoadPromise) {
            return _verifyModalLoadPromise;
        }

        _verifyModalLoadPromise = (async () => {
            // 1. Inject the modal HTML partial if not already in the DOM
            if (!document.getElementById('verify-personal-info-modal')) {
                try {
                    const resp = await fetch('../modals/common-modals/verify-personal-info-modal.html');
                    if (resp.ok) {
                        const html = await resp.text();
                        let container = document.getElementById('modal-container');
                        if (!container) {
                            container = document.createElement('div');
                            container.id = 'modal-container';
                            document.body.appendChild(container);
                        }
                        container.insertAdjacentHTML('beforeend', html);
                    } else {
                        throw new Error('Failed to fetch verify-personal-info-modal partial');
                    }
                } catch (e) {
                    console.error('[AccessGuard] Failed to load verify modal HTML:', e);
                    throw e;
                }
            }

            // 2. Load the verification JS if openVerifyPersonalInfoModal isn't already defined
            if (typeof window.openVerifyPersonalInfoModal !== 'function') {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = '../js/tutor-profile/settings-panel-personal-verification.js?v202605211228';
                    s.onload = resolve;
                    s.onerror = () => reject(new Error('Failed to load settings-panel-personal-verification.js'));
                    document.body.appendChild(s);
                });
            }
        })();

        return _verifyModalLoadPromise;
    }

    window.goToVerification = async function () {
        closeRoleAccessDeniedModal();
        try {
            await ensureVerifyPersonalInfoModalLoaded();
            if (typeof window.openVerifyPersonalInfoModal === 'function') {
                window.openVerifyPersonalInfoModal();
            } else {
                throw new Error('openVerifyPersonalInfoModal not available');
            }
        } catch (e) {
            console.error('[AccessGuard] Could not open verify modal, falling back to home:', e);
            window.location.href = REDIRECT_URL;
        }
    };

    window.openAddRoleModalFromGuard = async function () {
        closeRoleAccessDeniedModal();
        await new Promise(resolve => setTimeout(resolve, 350));

        if (typeof window.openAddRoleModal === 'function') {
            await window.openAddRoleModal();
        } else {
            const modal = document.getElementById('add-role-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('show', 'active');
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            } else {
                alert('Unable to open Add Role modal. Please refresh the page.');
            }
        }
    };

    // ESC closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('roleAccessDeniedModal');
            if (modal && !modal.classList.contains('hidden')) {
                closeRoleAccessDeniedModal();
            }
        }
    });

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', performAccessCheck);
        } else {
            performAccessCheck();
        }
    }

    function performAccessCheck() {
        // Wait briefly for auth.js to populate currentUser
        let attempts = 0;
        const maxAttempts = 30; // 30 * 100ms = 3s

        const waitForAuth = () => {
            attempts++;
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userStr = localStorage.getItem('currentUser');

            if (!token) {
                performFinalAccessCheck();
                return;
            }

            if (token && userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user && user.id) {
                        performFinalAccessCheck();
                        return;
                    }
                } catch (e) {
                    // fall through to retry
                }
            }

            if (attempts < maxAttempts) {
                setTimeout(waitForAuth, 100);
            } else {
                performFinalAccessCheck();
            }
        };

        waitForAuth();
    }

    async function performFinalAccessCheck() {
        const hasAccess = await checkAccess();

        if (!hasAccess) {
            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.style.display = 'none';

            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.style.display = 'none';

            const footer = document.getElementById('footer');
            if (footer) footer.style.display = 'none';
        }
    }

    init();
})();
