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
    const REFRESH_KEY = 'advertiserRefreshToken';

    class AdvertiserAuthManager {
        constructor() {
            this.API_BASE_URL = API_BASE_URL;
            this.token = null;
            this.user = null;
            this.refreshToken = null;
            this._refreshing = null; // de-dupe concurrent refreshes
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

        _readRefreshToken() {
            return localStorage.getItem(REFRESH_KEY) || localStorage.getItem('refresh_token');
        }

        /** Persist session under our own keys AND mirror to the shared keys the
         *  advertiser-profile managers still read. Pass refreshToken to persist it
         *  (omit to keep the existing one — e.g. on background verify() re-store). */
        store(token, user, refreshToken) {
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
                if (refreshToken) {
                    this.refreshToken = refreshToken;
                    localStorage.setItem(REFRESH_KEY, refreshToken);
                    localStorage.setItem('refresh_token', refreshToken);
                }
            } catch (e) {
                console.warn('[AdvertiserAuth] store failed:', e);
            }
        }

        /** Exchange the refresh token for a fresh access token. Concurrent callers
         *  share one in-flight request. Returns the new access token, or null. */
        async refresh() {
            if (this._refreshing) return this._refreshing;
            const rt = this.refreshToken || this._readRefreshToken();
            if (!rt) return null;
            this._refreshing = (async () => {
                try {
                    const res = await fetch(`${this.API_BASE_URL}/api/advertiser/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: rt }),
                    });
                    if (!res.ok) {
                        // Refresh token itself is dead → genuine re-login required.
                        if (res.status === 401) this.logout(false);
                        return null;
                    }
                    const data = await res.json();
                    if (!data || !data.access_token) return null;
                    // Re-store the new tokens, keeping the current user object.
                    this.store(data.access_token, this.user || this._readUser(), data.refresh_token);
                    console.log('[AdvertiserAuth] access token refreshed');
                    return data.access_token;
                } catch (e) {
                    console.warn('[AdvertiserAuth] refresh failed:', e);
                    return null; // network error — keep session, let caller decide
                } finally {
                    this._refreshing = null;
                }
            })();
            return this._refreshing;
        }

        /** fetch() wrapper that injects the advertiser bearer token and, on a 401,
         *  refreshes once and retries. Managers should use this for advertiser API
         *  calls so an expired access token recovers transparently. */
        async authFetch(url, options = {}) {
            const withAuth = (tok) => {
                const headers = Object.assign({}, options.headers || {});
                if (tok) headers['Authorization'] = `Bearer ${tok}`;
                return Object.assign({}, options, { headers });
            };
            let res = await fetch(url, withAuth(this.token || this._readToken()));
            if (res.status !== 401) return res;
            const newTok = await this.refresh();
            if (!newTok) return res; // refresh failed — return the original 401
            return fetch(url, withAuth(newTok));
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
            this.refreshToken = this._readRefreshToken();
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
                    // Preserve any existing currentUser fields, then overlay fresh
                    // server data (incl. country_code/location for the KYC location gate).
                    const user = {
                        ...(this.user || {}),
                        id: me.advertiser_id,
                        advertiser_id: me.advertiser_id,
                        email: me.email,
                        name: me.name,
                        company_name: me.company_name,
                        country_code: me.country_code || null,
                        location: me.location || [],
                        person_verified: me.person_verified || false,
                        roles: ['advertiser'],
                        active_role: 'advertiser',
                        role_ids: { advertiser: me.advertiser_id }
                    };
                    this.store(this.token, user);
                    document.dispatchEvent(new CustomEvent('userDataLoaded', { detail: user }));
                    return true;
                }
                if (res.status === 401) {
                    // Access token expired — try the refresh token before clearing.
                    const newTok = await this.refresh();
                    if (newTok) {
                        return this.verify(); // retry /auth/me with the fresh token
                    }
                    console.log('[AdvertiserAuth] token invalid and refresh failed — clearing');
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

        // Profile dropdown helpers (mirror the shared AuthManager API).
        getPrimaryContact(user) {
            const u = user || this.user;
            if (!u) return null;
            if (u.email) return 'email';
            if (u.phone) return 'phone';
            return null;
        }
        maskContact(value, type = 'email') {
            if (!value) return '***';
            if (type === 'phone') {
                const cleaned = value.replace(/\s/g, '');
                if (cleaned.length <= 5) return '***';
                return `${cleaned.substring(0, 3)}${'*'.repeat(cleaned.length - 5)}${cleaned.substring(cleaned.length - 2)}`;
            }
            const [localPart, domain] = value.split('@');
            if (!domain) return '***';
            if (localPart.length <= 5) return `***@${domain}`;
            return `${localPart.substring(0, 3)}${'*'.repeat(localPart.length - 5)}${localPart.substring(localPart.length - 2)}@${domain}`;
        }
        getMaskedContact(user) {
            const u = user || this.user;
            if (!u) return '***';
            const type = this.getPrimaryContact(u);
            if (!type) return '***';
            return this.maskContact(type === 'email' ? u.email : u.phone, type);
        }

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
                [TOKEN_KEY, USER_KEY, REFRESH_KEY, 'token', 'access_token', 'refresh_token',
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

    // ---- global 401 refresh-and-retry interceptor -----------------------------
    // The advertiser-profile managers all use raw fetch() with a Bearer header.
    // Rather than touch each one, wrap window.fetch: when an advertiser API call
    // comes back 401, refresh the access token once and replay the request with
    // the new token. Non-advertiser calls and already-retried calls pass through.
    (function installFetchInterceptor() {
        if (window.__advertiserFetchPatched) return;
        const nativeFetch = window.fetch.bind(window);
        window.__advertiserFetchPatched = true;

        const looksLikeAdvertiserApi = (url) => {
            try {
                const u = String(url);
                // Advertiser-portal endpoints only. (Admin endpoints use adminToken
                // and have no advertiser refresh token, so they must pass through.)
                return u.includes('/api/advertiser/') || u.includes('/api/campaign');
            } catch (e) { return false; }
        };
        const hdrGet = (headers, name) => {
            if (!headers) return null;
            if (headers instanceof Headers) return headers.get(name);
            const k = Object.keys(headers).find(h => h.toLowerCase() === name.toLowerCase());
            return k ? headers[k] : null;
        };

        window.fetch = async function (input, init) {
            const url = (typeof input === 'string') ? input : (input && input.url) || '';
            const res = await nativeFetch(input, init);
            // Only intervene on a 401 from an advertiser API that carried a bearer
            // token, and only when we actually have a refresh token to use.
            if (res.status !== 401 || !looksLikeAdvertiserApi(url)) return res;
            const authHdr = hdrGet(init && init.headers, 'Authorization');
            if (authHdr && !/^Bearer /i.test(authHdr)) return res;
            if (!(mgr.refreshToken || mgr._readRefreshToken())) return res;

            const newTok = await mgr.refresh();
            if (!newTok) return res; // refresh failed → return the original 401

            // Replay with the refreshed token. Rebuild headers preserving the rest.
            const newInit = Object.assign({}, init);
            const headers = new Headers((init && init.headers) || {});
            headers.set('Authorization', `Bearer ${newTok}`);
            newInit.headers = headers;
            return nativeFetch(input, newInit);
        };
    })();
})();
