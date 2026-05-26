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
        signup: '/advertise-pages/modals/signup-modal.html'
    };

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
                fetch(url + '?v202605260000').then(r => {
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
                ['adv-login-modal', 'adv-signup-modal'].forEach(closeAuthModal);
            }
        });
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

    function setError(formErrorId, message) {
        const el = document.getElementById(formErrorId);
        if (el) el.textContent = message || '';
    }

    function storeSession(tokenResponse) {
        if (!tokenResponse || !tokenResponse.access_token) return;
        localStorage.setItem('token', tokenResponse.access_token);
        if (tokenResponse.refresh_token) {
            localStorage.setItem('refresh_token', tokenResponse.refresh_token);
        }
        if (tokenResponse.user) {
            localStorage.setItem('user', JSON.stringify(tokenResponse.user));
        }
    }

    function redirectToProfile() {
        window.location.href = 'advertiser-profile.html';
    }

    // ---------- Signup ----------

    async function handleSignupSubmit(e) {
        e.preventDefault();
        const form = e.target;
        setError('adv-signup-error', '');

        const payload = {
            first_name: form.first_name.value.trim(),
            last_name: form.last_name.value.trim(),
            email: form.email.value.trim().toLowerCase(),
            password: form.password.value,
            role: 'advertiser',
            surface: SURFACE
        };

        const companyName = form.company_name.value.trim();
        if (companyName) {
            // Pre-fills advertiser_profiles.company_name on the backend (Phase 2).
            payload.company_name = companyName;
        }

        if (!payload.first_name || !payload.email || !payload.password) {
            setError('adv-signup-error', 'Please fill in all required fields.');
            return;
        }
        if (payload.password.length < 8) {
            setError('adv-signup-error', 'Password must be at least 8 characters.');
            return;
        }
        if (!form.querySelector('#adv-signup-terms').checked) {
            setError('adv-signup-error', 'Please accept the terms to continue.');
            return;
        }

        setBusy(form, true);
        try {
            const res = await fetch(API + '/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                let msg = data.detail || data.message || 'Signup failed. Please try again.';
                if (res.status === 400 && /different password/i.test(msg)) {
                    msg = 'This email is already registered with a different password. Log in instead.';
                }
                setError('adv-signup-error', msg);
                return;
            }

            const data = await res.json();
            storeSession(data);
            redirectToProfile();
        } catch (err) {
            console.error('[advertise] signup error:', err);
            setError('adv-signup-error', 'Could not reach the server. Please try again.');
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

        // /api/login uses OAuth2PasswordRequestForm — form-encoded, "username" field
        const body = new URLSearchParams();
        body.set('username', email);
        body.set('password', password);
        // surface hint for Phase-2 backend enforcement
        body.set('surface', SURFACE);

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

            // Defense-in-depth: backend enforces surface='advertise' → must have advertiser role
            // (returns 403 if not). This extra check guards against any edge case where the
            // backend returns 200 but with a non-advertiser user.
            const roles = (data.user && data.user.roles) || [];
            if (!roles.includes('advertiser')) {
                setError('adv-login-error',
                    'This account doesn\'t have advertiser access yet. Click "Sign up" to create an advertiser account with this email.');
                return;
            }

            storeSession(data);
            redirectToProfile();
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
        ['login', 'signup'].forEach(k => {
            if (k !== which) closeAuthModal('adv-' + k + '-modal');
        });
        showModal('adv-' + which + '-modal');
    };

    window.advSwitchAuthModal = function (which) {
        ['login', 'signup'].forEach(k => closeAuthModal('adv-' + k + '-modal'));
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
})();
