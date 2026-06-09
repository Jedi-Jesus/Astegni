/**
 * Advertiser Authentication Manager (advertise.astegni.com)
 *
 * Dedicated, self-contained auth for the advertiser portal — analogous to the
 * admin pages having their own auth instead of astegni.com's shared AuthManager.
 *
 * Advertisers authenticate against astegni_advertiser_db via /api/advertiser/*
 * with a self-contained token (type='advertiser'). This manager NEVER calls the
 * user-DB endpoints (/api/me, /api/verify-token, /api/refresh), which 401 for
 * advertiser tokens.
 *
 * Source-of-truth keys: 'advertiserToken' + 'advertiserUser'. For backward
 * compatibility with the many advertiser-profile managers that read the shared
 * 'token'/'currentUser' keys, those are mirrored on every write.
 *
 * It also aliases window.AuthManager so advertiser pages that call
 * window.AuthManager.restoreSession()/isAuthenticated()/getUser() work unchanged.
 */
(function () {
    'use strict';

    const API_BASE_URL = (window.API_BASE_URL)
        || (window.ASTEGNI_CONFIG && window.ASTEGNI_CONFIG.API_BASE_URL)
        || 'http://localhost:8000';

    // localStorage keys this portal owns.
    const TOKEN_KEY = 'advertiserToken';
    const USER_KEY = 'advertiserUser';

    class AdvertiserAuthManager {
        constructor() {
            this.API_BASE_URL = API_BASE_URL;
            this.token = null;
            this.user = null;
            console.log('[AdvertiserAuth] init, API:', this.API_BASE_URL);
        }

        // ---- storage --------------------------------------------------------

        _readToken() {
            // Prefer our own key; fall back to the shared key (e.g. right after
            // login on the home page before this manager has run).
            return localStorage.getItem(TOKEN_KEY)
                || localStorage.getItem('token')
                || localStorage.getItem('access_token');
        }

        _readUser() {
            const raw = localStorage.getItem(USER_KEY) || localStorage.getItem('currentUser');
            if (!raw) return null;
            try { return JSON.parse(raw); } catch (e) { return null; }
        }

        /** Persist session under our own keys AND mirror to the shared keys the
         *  advertiser-profile managers still read. */
        store(token, user) {
            this.token = token;
            this.user = user;
            try {
                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                // Mirror for legacy managers (they read 'token'/'currentUser').
                localStorage.setItem('token', token);
                localStorage.setItem('access_token', token);
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('userRole', 'advertiser');
            } catch (e) {
                console.warn('[AdvertiserAuth] store failed:', e);
            }
        }

        // ---- session --------------------------------------------------------

        async restoreSession() {
            const token = this._readToken();
            const user = this._readUser();
            if (!token) {
                console.log('[AdvertiserAuth] no token to restore');
                return false;
            }
            // Reject anything that isn't an advertiser token.
            if (!this._isAdvertiserToken(token)) {
                console.warn('[AdvertiserAuth] stored token is not an advertiser token — ignoring');
                return false;
            }
            this.token = token;
            this.user = user || { roles: ['advertiser'], active_role: 'advertiser' };
            this.user.roles = ['advertiser'];
            this.user.active_role = 'advertiser';

            // Validate in the background; do not block page load. Only a genuine
            // 401 clears the session.
            this.verify().catch(() => { /* network error — keep session (offline) */ });
            console.log('[AdvertiserAuth] session restored');
            return true;
        }

        async verify() {
            if (!this.token) return false;
            try {
                const res = await fetch(`${this.API_BASE_URL}/api/advertiser/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (res.ok) {
                    const me = await res.json();
                    const user = {
                        id: me.advertiser_id,
                        advertiser_id: me.advertiser_id,
                        email: me.email,
                        name: me.name,
                        company_name: me.company_name,
                        roles: ['advertiser'],
                        active_role: 'advertiser',
                        role_ids: { advertiser: me.advertiser_id }
                    };
                    this.store(this.token, user);
                    document.dispatchEvent(new CustomEvent('userDataLoaded', { detail: user }));
                    return true;
                }
                if (res.status === 401) {
                    console.log('[AdvertiserAuth] token invalid (401) — clearing');
                    this.logout(false);
                    return false;
                }
                return true;
            } catch (e) {
                return true; // offline tolerance
            }
        }

        _isAdvertiserToken(token) {
            try {
                const part = (token || '').split('.')[1];
                if (!part) return false;
                const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
                return payload && payload.type === 'advertiser';
            } catch (e) { return false; }
        }

        // ---- accessors (mirror the shared AuthManager surface) --------------

        isAuthenticated() {
            return !!this.token && !!this.user;
        }
        getUser() { return this.user; }
        getToken() { return this.token; }
        getUserRole() { return 'advertiser'; }

        getAuthHeaders() {
            return this.token
                ? { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
        }

        // Login pages call this after a successful /api/advertiser/login.
        navigateAfterLogin() {
            window.location.href = '/advertiser-profile.html';
        }

        logout(redirect = false) {
            this.token = null;
            this.user = null;
            try {
                [TOKEN_KEY, USER_KEY, 'token', 'access_token', 'refresh_token',
                 'currentUser', 'user', 'userRole'].forEach(k => localStorage.removeItem(k));
            } catch (e) { /* ignore */ }
            if (redirect) window.location.href = '/';
        }
    }

    const mgr = new AdvertiserAuthManager();
    // Expose under both names: pages call window.AuthManager; advertiser-specific
    // code can use window.AdvertiserAuth.
    window.AdvertiserAuth = mgr;
    window.AuthManager = mgr;
    // Some code references the bare global `AuthManager`.
    try { AuthManager = mgr; } catch (e) { /* non-strict global */ }
})();
