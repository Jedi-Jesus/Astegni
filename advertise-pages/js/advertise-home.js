// ============================================
//   advertise.astegni.com — home page logic
// ============================================
//
// Responsibilities:
//   * Lazy-load login & signup modal HTML into the page
//   * Open / close / switch between auth modals
//   * Submit signup → POST /api/register (with surface='advertise', role='advertiser')
//   * Submit login → POST /api/login (form-encoded)
//   * On success: store JWT in localStorage and redirect to advertiser-profile.html
//
// Surface boundary:
//   We send `surface: 'advertise'` to /api/register and /api/login. The backend
//   (Phase 2) enforces:
//     * register: role is forced to 'advertiser'; non-advertiser roles rejected
//     * login: account must have 'advertiser' in roles, or returns 403

(function () {
    'use strict';

    const API = window.API_BASE_URL || 'http://localhost:8000';
    const SURFACE = (window.ASTEGNI_CONFIG && window.ASTEGNI_CONFIG.surface) || 'advertise';

    const MODAL_FILES = {
        login: '/advertise-pages/modals/login-modal.html',
        signup: '/advertise-pages/modals/signup-modal.html',
        'choose-email': '/advertise-pages/modals/choose-email-modal.html',
        'confirm-password': '/advertise-pages/modals/confirm-account-modal.html',
        'confirm-contact': '/advertise-pages/modals/contact-confirmation-modal.html',
        otp: '/advertise-pages/modals/otp-modal.html'
    };

    // Signup data held between the signup form and the OTP verification step.
    let pendingSignup = null;

    let modalsLoaded = false;
    let loadingPromise = null;

    function loadModalsOnce() {
        if (modalsLoaded) return Promise.resolve();
        if (loadingPromise) return loadingPromise;

        const container = document.getElementById('auth-modal-container');
        if (!container) {
            console.error('[advertise] #auth-modal-container missing from index.html');
            return Promise.reject(new Error('modal container missing'));
        }

        loadingPromise = Promise.all(
            Object.values(MODAL_FILES).map(url =>
                fetch(url + '?v202605290100').then(r => {
                    if (!r.ok) throw new Error('Failed to fetch ' + url);
                    return r.text();
                })
            )
        ).then(htmlChunks => {
            container.innerHTML = htmlChunks.join('\n');
            wireModalClosing();
            wireFormHandlers();
            modalsLoaded = true;
        }).catch(err => {
            console.error('[advertise] modal load failed:', err);
            loadingPromise = null;
            throw err;
        });

        return loadingPromise;
    }

    function wireModalClosing() {
        // Backdrop + close-button clicks
        document.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                const which = el.getAttribute('data-close');
                closeAuthModal('adv-' + which + '-modal');
            });
        });

        // Esc key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                [
                    'adv-login-modal',
                    'adv-signup-modal',
                    'adv-choose-email-modal',
                    'adv-confirm-password-modal',
                    'adv-confirm-contact-modal',
                    'adv-otp-modal'
                ].forEach(closeAuthModal);
            }
        });

        // Choose-email modal:
        //   "same"      -> confirm-password modal (just ask for their existing password)
        //   "different" -> fresh signup form, email blank
        document.querySelectorAll('#adv-choose-email-modal [data-choice]').forEach(card => {
            card.addEventListener('click', () => {
                const choice = card.getAttribute('data-choice');
                const email = card.closest('#adv-choose-email-modal')?.dataset.email || '';
                closeAuthModal('adv-choose-email-modal');

                if (choice === 'same') {
                    window.openAuthModal('confirm-password').then(() => {
                        if (!email) return;
                        const emailInput = document.getElementById('adv-confirm-password-email');
                        if (emailInput) emailInput.value = email;
                        const display = document.getElementById('adv-confirm-password-email-display');
                        if (display) display.textContent = email;
                        const pwd = document.getElementById('adv-confirm-password-password');
                        if (pwd) pwd.focus();
                    });
                } else {
                    // Different email -> fresh signup
                    window.openAuthModal('signup');
                }
            });
        });

        // Confirm-password form submit
        const confirmForm = document.getElementById('adv-confirm-password-form');
        if (confirmForm) confirmForm.addEventListener('submit', handleConfirmPasswordSubmit);
    }

    function wireFormHandlers() {
        const loginForm = document.getElementById('adv-login-form');
        if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

        const signupForm = document.getElementById('adv-signup-form');
        if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);
    }

    function showModal(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Auto-focus first input
        const firstInput = el.querySelector('input:not([type=checkbox])');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
    }

    function closeAuthModal(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('hidden');
        document.body.style.overflow = '';
        // Clear any inline errors
        el.querySelectorAll('.adv-form-error').forEach(e => { e.textContent = ''; });
    }

    function setBusy(form, busy) {
        const btn = form.querySelector('button[type=submit]');
        if (!btn) return;
        btn.disabled = busy;
        const label = btn.querySelector('.adv-btn-label');
        const spin = btn.querySelector('.adv-btn-spinner');
        if (label) label.classList.toggle('hidden', busy);
        if (spin) spin.classList.toggle('hidden', !busy);
    }

    function setBtnBusy(btn, busy) {
        if (!btn) return;
        btn.disabled = busy;
        const label = btn.querySelector('.adv-btn-label');
        const spin = btn.querySelector('.adv-btn-spinner');
        if (label) label.classList.toggle('hidden', busy);
        if (spin) spin.classList.toggle('hidden', !busy);
    }

    function setError(formErrorId, message) {
        const el = document.getElementById(formErrorId);
        if (el) el.textContent = message || '';
    }

    function storeSession(tokenResponse) {
        if (!tokenResponse || !tokenResponse.access_token) return;
        // Match the keys js/root/auth.js (AuthManager.restoreSession) looks for:
        // 'token' (also 'access_token' for compatibility), 'currentUser', 'userRole'.
        // Without these, the shared auth manager treats the user as logged-out and
        // some legacy redirect kicks them back to astegni.com/index.html.
        localStorage.setItem('token', tokenResponse.access_token);
        localStorage.setItem('access_token', tokenResponse.access_token);
        if (tokenResponse.refresh_token) {
            localStorage.setItem('refresh_token', tokenResponse.refresh_token);
        }
        if (tokenResponse.user) {
            localStorage.setItem('currentUser', JSON.stringify(tokenResponse.user));
            // Force the advertise surface's view of the role, regardless of any
            // stale active_role on the user object.
            localStorage.setItem('userRole', 'advertiser');
        }
    }

    function redirectToProfile() {
        // Use absolute path so the nginx rewrite serves the right file
        // (root docroot, /advertiser-profile.html → /advertise-pages/advertiser-profile.html).
        window.location.href = '/advertiser-profile.html';
    }

    // ---------- Post-login dispatch (Google + email/password share this) ----------
    //
    // Branch on the user's roles:
    //   - has 'advertiser'         -> stay here, advertiser profile
    //   - has another role         -> hand off token to astegni.com via URL hash;
    //                                 land on that role's profile page
    //   - no roles at all          -> do NOT establish a session; show an error
    //                                 (user must finish account setup on astegni.com)
    function dispatchAfterLogin(tokenResponse) {
        const user = tokenResponse && tokenResponse.user;
        const roles = (user && user.roles) || [];

        if (roles.includes('advertiser')) {
            storeSession(tokenResponse);
            redirectToProfile();
            return;
        }

        if (roles.length === 0) {
            setError('adv-login-error',
                'This account doesn\'t have any role yet. Finish setting up your account on astegni.com first.');
            // No session stored. Sign-out any partial state Google may have left behind.
            try { localStorage.removeItem('token'); localStorage.removeItem('currentUser'); localStorage.removeItem('userRole'); } catch (e) { }
            return;
        }

        // Has other roles but no advertiser → hand off to astegni.com.
        // Subdomains don't share localStorage, so pass tokens via URL hash; the
        // astegni.com AuthManager consumes #advertise_login=1 on page load.
        const role = user.active_role || roles[0];
        const profilePages = {
            student: '/profile-pages/student-profile.html',
            tutor: '/profile-pages/tutor-profile.html',
            parent: '/profile-pages/parent-profile.html',
            user: '/profile-pages/user-profile.html'
        };
        const path = profilePages[role] || '/index.html';
        const params = new URLSearchParams();
        params.set('advertise_login', '1');
        params.set('token', tokenResponse.access_token);
        if (tokenResponse.refresh_token) params.set('refresh', tokenResponse.refresh_token);
        params.set('user', encodeURIComponent(JSON.stringify(user)));
        window.location.href = 'https://astegni.com' + path + '#' + params.toString();
    }

    // Google sign-in goes through the shared googleOAuthManager (js/root/google-oauth.js).
    // Override its post-login navigation on this surface so the same branching applies.
    (function patchGoogleNavigateAfterLogin() {
        function apply() {
            if (!window.googleOAuthManager) return false;
            window.googleOAuthManager.navigateAfterLogin = function (user) {
                // Reconstruct a token-response-like object from what storeSession
                // already wrote (the shared manager stored tokens before calling
                // this navigate hook).
                const fake = {
                    access_token: localStorage.getItem('token') || localStorage.getItem('access_token'),
                    refresh_token: localStorage.getItem('refresh_token') || null,
                    user: user
                };
                dispatchAfterLogin(fake);
            };
            return true;
        }
        if (!apply()) {
            // Manager initializes ~1s after DOMContentLoaded; retry briefly.
            let tries = 0;
            const iv = setInterval(() => {
                if (apply() || ++tries > 30) clearInterval(iv);
            }, 200);
        }
    })();

    // ---------- Signup (Google OR email + OTP) ----------
    //
    // Flow (mirrors astegni.com): signup form -> confirm-contact screen ->
    // "Send OTP" (POST /api/send-registration-otp) -> OTP input ->
    // "Verify & create" (POST /api/verify-registration-otp, role='advertiser').
    // The account is created server-side only after the OTP is verified.

    function handleSignupSubmit(e) {
        e.preventDefault();
        const form = e.target;
        setError('adv-signup-error', '');

        const email = form.email.value.trim().toLowerCase();
        const password = form.password.value;
        const confirm = form.password_confirm.value;

        if (!email || !password) {
            setError('adv-signup-error', 'Please fill in all required fields.');
            return;
        }
        if (password.length < 8) {
            setError('adv-signup-error', 'Password must be at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('adv-signup-error', 'Passwords do not match.');
            return;
        }
        if (!form.querySelector('#adv-signup-terms').checked) {
            setError('adv-signup-error', 'Please accept the terms to continue.');
            return;
        }

        pendingSignup = { email, password };

        // Show the confirm-contact screen (do not send OTP yet).
        closeAuthModal('adv-signup-modal');
        showModal('adv-confirm-contact-modal');
        const display = document.getElementById('adv-confirm-email-display');
        if (display) display.value = email;
    }

    // Step 2: send (or resend) the registration OTP for the pending email.
    window.advSendOtp = async function () {
        if (!pendingSignup) {
            setError('adv-confirm-contact-error', 'Your session expired. Please sign up again.');
            return;
        }
        setError('adv-confirm-contact-error', '');
        setError('adv-otp-error', '');

        // The "Send OTP" button (confirm-contact) and "Resend" link (otp modal)
        // both call this; only the confirm-contact button has a busy spinner.
        const sendBtn = document.querySelector('#adv-confirm-contact-modal .adv-btn-primary');
        setBtnBusy(sendBtn, true);
        try {
            const res = await fetch(API + '/api/send-registration-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingSignup.email, phone: '' })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // e.g. "An account with this email already exists"
                const target = document.getElementById('adv-otp-modal') &&
                    !document.getElementById('adv-otp-modal').classList.contains('hidden')
                    ? 'adv-otp-error' : 'adv-confirm-contact-error';
                setError(target, data.detail || 'Could not send the code. Please try again.');
                return;
            }

            // Development mode returns the OTP so we can log it.
            if (data.otp) console.log('[advertise] Dev OTP:', data.otp);

            closeAuthModal('adv-confirm-contact-modal');
            showModal('adv-otp-modal');
            const otpInput = document.getElementById('adv-otp-input');
            if (otpInput) otpInput.value = '';
        } catch (err) {
            console.error('[advertise] send-otp error:', err);
            setError('adv-confirm-contact-error', 'Could not reach the server. Please try again.');
        } finally {
            setBtnBusy(sendBtn, false);
        }
    };

    // Step 3: verify the OTP and create the advertiser account server-side.
    window.advVerifyOtp = async function () {
        if (!pendingSignup) {
            setError('adv-otp-error', 'Your session expired. Please sign up again.');
            return;
        }
        setError('adv-otp-error', '');

        const otp = (document.getElementById('adv-otp-input')?.value || '').trim();
        if (!/^\d{6}$/.test(otp)) {
            setError('adv-otp-error', 'Please enter the 6-digit code.');
            return;
        }

        const verifyBtn = document.querySelector('#adv-otp-modal .adv-btn-primary');
        setBtnBusy(verifyBtn, true);
        try {
            const res = await fetch(API + '/api/verify-registration-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    otp_code: otp,
                    email: pendingSignup.email,
                    phone: '',
                    password: pendingSignup.password,
                    role: 'advertiser'
                })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError('adv-otp-error', data.detail || 'Invalid or expired code. Please try again.');
                return;
            }

            pendingSignup = null;
            storeSession(data);
            redirectToProfile();
        } catch (err) {
            console.error('[advertise] verify-otp error:', err);
            setError('adv-otp-error', 'Could not reach the server. Please try again.');
        } finally {
            setBtnBusy(verifyBtn, false);
        }
    };

    // Go back to the signup form (from confirm-contact or OTP), email prefilled.
    window.advEditSignupInfo = function () {
        closeAuthModal('adv-confirm-contact-modal');
        closeAuthModal('adv-otp-modal');
        showModal('adv-signup-modal');
        const emailInput = document.getElementById('adv-signup-email');
        if (emailInput && pendingSignup) emailInput.value = pendingSignup.email;
    };

    // ---------- Confirm password (same-email "add advertiser role") ----------

    async function handleConfirmPasswordSubmit(e) {
        e.preventDefault();
        const form = e.target;
        setError('adv-confirm-password-error', '');

        const email = form.email.value.trim().toLowerCase();
        const password = form.password.value;

        if (!email) {
            setError('adv-confirm-password-error', 'Email is missing — please try again from the previous step.');
            return;
        }
        if (!password) {
            setError('adv-confirm-password-error', 'Please enter your password.');
            return;
        }

        // /api/register on the advertise surface with an existing email +
        // matching password adds the advertiser role to the existing account
        // and returns a fresh JWT (routes.py:213-254).
        const payload = {
            email,
            password,
            role: 'advertiser',
            surface: SURFACE
        };

        setBusy(form, true);
        try {
            const res = await fetch(API + '/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                let msg = data.detail || data.message || 'Could not add advertiser role.';
                if (res.status === 400 && /different password/i.test(msg)) {
                    msg = 'That password doesn\'t match this account. Try again, or use a different email.';
                }
                setError('adv-confirm-password-error', msg);
                return;
            }

            const data = await res.json();
            storeSession(data);
            redirectToProfile();
        } catch (err) {
            console.error('[advertise] confirm-password error:', err);
            setError('adv-confirm-password-error', 'Could not reach the server. Please try again.');
        } finally {
            setBusy(form, false);
        }
    }

    // ---------- Login ----------

    async function handleLoginSubmit(e) {
        e.preventDefault();
        const form = e.target;
        setError('adv-login-error', '');

        const email = form.email.value.trim().toLowerCase();
        const password = form.password.value;

        if (!email || !password) {
            setError('adv-login-error', 'Please enter your email and password.');
            return;
        }

        // /api/login uses OAuth2PasswordRequestForm — form-encoded, "username" field.
        // We intentionally do NOT send surface='advertise' here: the backend gates
        // that surface to advertiser-only (403 otherwise), but we now want to *log
        // in* non-advertisers on advertise.astegni.com so we can redirect them to
        // astegni.com with a valid token. The role branching lives in
        // dispatchAfterLogin() below.
        const body = new URLSearchParams();
        body.set('username', email);
        body.set('password', password);

        setBusy(form, true);
        try {
            const res = await fetch(API + '/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError('adv-login-error', data.detail || 'Invalid email or password.');
                return;
            }

            const data = await res.json();
            dispatchAfterLogin(data);
        } catch (err) {
            console.error('[advertise] login error:', err);
            setError('adv-login-error', 'Could not reach the server. Please try again.');
        } finally {
            setBusy(form, false);
        }
    }

    // ---------- Public API (called from inline onclick handlers) ----------

    window.openAuthModal = async function (which) {
        try {
            await loadModalsOnce();
        } catch (e) {
            alert('Could not open the form. Please refresh the page and try again.');
            return;
        }
        // Hide any other auth modal
        ['login', 'signup', 'choose-email', 'confirm-password'].forEach(k => {
            if (k !== which) closeAuthModal('adv-' + k + '-modal');
        });
        showModal('adv-' + which + '-modal');
    };

    window.advSwitchAuthModal = function (which) {
        ['login', 'signup', 'choose-email', 'confirm-password']
            .forEach(k => closeAuthModal('adv-' + k + '-modal'));
        showModal('adv-' + which + '-modal');
    };

    window.advTogglePassword = function (id) {
        const input = document.getElementById(id);
        if (!input) return;
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        // toggle icon
        const btn = input.parentElement && input.parentElement.querySelector('.adv-password-toggle i');
        if (btn) btn.className = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
    };

    // Auto-redirect already-logged-in advertisers to their profile
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const token = localStorage.getItem('token');
            const userJson = localStorage.getItem('user');
            if (!token || !userJson) return;
            const user = JSON.parse(userJson);
            const roles = (user && user.roles) || [];
            if (roles.includes('advertiser')) {
                // Optional: surface a "You're logged in — go to dashboard" CTA instead of auto-redirect.
                // For now, leave the home page visible; user clicks "Log in" if they want to enter.
                // (Auto-redirect would be surprising for users who came to read marketing copy.)
            }
        } catch (e) {
            // Ignore corrupt localStorage; user can still log in manually.
        }
    });

    // Auto-pop a modal when arriving from a "Book now" link on astegni.com.
    // advertise-with-us-cta.js sends users here with one of:
    //   ?signup=1                   - logged out on astegni.com
    //   ?login=1&email=...          - logged in WITH advertiser role
    //   ?addrole=1&email=...        - logged in WITHOUT advertiser role
    //                                  -> show the "same email or different?" prompt
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const prefillEmail = params.get('email') || '';

            let which = null;
            if (params.get('addrole') === '1') which = 'choose-email';
            else if (params.get('signup') === '1') which = 'signup';
            else if (params.get('login') === '1') which = 'login';
            if (!which) return;

            // Defer slightly so the modals get fetched and inserted into the DOM first.
            setTimeout(async () => {
                if (typeof window.openAuthModal !== 'function') return;
                await window.openAuthModal(which);

                if (which === 'choose-email') {
                    // Stash the email on the modal so the card click can read it later,
                    // and show it in the header copy.
                    const modalEl = document.getElementById('adv-choose-email-modal');
                    if (modalEl && prefillEmail) {
                        modalEl.dataset.email = prefillEmail;
                        const display = document.getElementById('adv-choose-email-display');
                        if (display) display.textContent = prefillEmail;
                    }
                    return;
                }

                if (prefillEmail) {
                    const input = document.getElementById('adv-' + which + '-email');
                    if (input) {
                        input.value = prefillEmail;
                        const pwd = document.getElementById('adv-' + which + '-password');
                        if (pwd) pwd.focus();
                    }
                }
            }, 100);
        } catch (e) {
            // Ignore — the page is still usable; the user can click the CTA manually.
        }
    });
})();
