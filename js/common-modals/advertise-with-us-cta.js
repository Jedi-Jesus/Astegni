/**
 * Advertise With Us CTA + Pricing Modal
 *
 * Auto-injects:
 *   1. A subtle "Promote your brand on Astegni" strip below the first
 *      .leaderboard-banner on the current page.
 *   2. A "View pricing" button that opens a modal listing the view-tier
 *      pricing (fetched from GET /api/cpi/full-rates).
 *   3. The "Book Now" CTA on each tier card sends the user to
 *      https://advertise.astegni.com/?signup=1 (same tab), which the
 *      advertise home page recognizes and uses to auto-pop the signup modal.
 *
 * Loaded on every page that has a .leaderboard-banner. Self-contained — no
 * setup required from page authors.
 */

(function () {
    'use strict';

    if (window.__AdvertiseWithUsCTAInitialized) return;
    window.__AdvertiseWithUsCTAInitialized = true;

    const ADVERTISE_BASE = 'https://advertise.astegni.com/';
    const API = window.API_BASE_URL || 'http://localhost:8000';

    /**
     * Pick the right destination on advertise.astegni.com based on the user's
     * current state on astegni.com:
     *   - logged in WITH advertiser role -> plain login modal (?login=1).
     *     We deliberately do NOT pass their email. Sessions don't carry
     *     across subdomains and we don't want identity to leak through the
     *     URL — the user types email + password fresh.
     *   - logged in WITHOUT advertiser role -> "choose email" modal asks
     *     whether to add the advertiser role to their existing account
     *     (same email) or sign up with a different email. ?addrole=1&email=…
     *   - logged out -> plain signup (?signup=1)
     */
    function buildAdvertiseUrl() {
        try {
            const userJson = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            if (token && userJson) {
                const user = JSON.parse(userJson);
                const roles = (user && user.roles) || [];
                if (roles.includes('advertiser')) {
                    // No email pre-fill — clean login.
                    return ADVERTISE_BASE + '?login=1';
                }
                const email = user && user.email;
                if (email) {
                    const q = new URLSearchParams();
                    q.set('addrole', '1');
                    q.set('email', email);
                    return ADVERTISE_BASE + '?' + q.toString();
                }
            }
        } catch (e) {
            // localStorage parse failed; fall through to plain signup.
        }
        return ADVERTISE_BASE + '?signup=1';
    }

    let modalRoot = null;
    let cachedRates = null;
    let rateFetchPromise = null;

    function $(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        return tpl.content.firstElementChild;
    }

    function formatNumber(n) {
        if (!Number.isFinite(n)) return '—';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'k';
        return String(n);
    }

    function formatCurrency(value, currency) {
        if (!Number.isFinite(value)) return '—';
        const cur = currency || 'ETB';
        if (value === Math.floor(value)) return `${value.toFixed(0)} ${cur}`;
        return `${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} ${cur}`;
    }

    function injectCTAStrip() {
        const firstBanner = document.querySelector('.leaderboard-banner');
        if (!firstBanner) return;
        if (firstBanner.nextElementSibling && firstBanner.nextElementSibling.classList.contains('advertise-with-us-cta')) {
            return; // already injected
        }

        const strip = $(`
            <aside class="advertise-with-us-cta" role="complementary" aria-label="Advertise on Astegni">
                <div class="advertise-with-us-cta__copy">
                    <span class="advertise-with-us-cta__icon" aria-hidden="true">
                        <i class="fas fa-bullhorn"></i>
                    </span>
                    <span class="advertise-with-us-cta__text">
                        <span class="advertise-with-us-cta__headline">Promote your brand on Astegni</span>
                        <span class="advertise-with-us-cta__sub">Reach thousands of verified students, tutors, and parents.</span>
                    </span>
                </div>
                <button class="advertise-with-us-cta__action" type="button">
                    See pricing <i class="fas fa-arrow-right" aria-hidden="true"></i>
                </button>
            </aside>
        `);
        strip.querySelector('.advertise-with-us-cta__action').addEventListener('click', openPricingModal);
        firstBanner.insertAdjacentElement('afterend', strip);
    }

    function ensureModalRoot() {
        if (modalRoot && document.body.contains(modalRoot)) return modalRoot;

        modalRoot = $(`
            <div class="aw-modal aw-hidden" role="dialog" aria-modal="true" aria-labelledby="aw-modal-title">
                <div class="aw-modal__backdrop" data-aw-close></div>
                <div class="aw-modal__content">
                    <button class="aw-modal__close" data-aw-close aria-label="Close pricing modal">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                    <header class="aw-modal__header">
                        <p class="aw-modal__eyebrow">Advertise on Astegni</p>
                        <h2 class="aw-modal__title" id="aw-modal-title">
                            Reach your audience with <em>verified&nbsp;impressions</em>.
                        </h2>
                        <p class="aw-modal__lede">
                            Pick a view package below. Each tier locks in a guaranteed number of
                            impressions on Astegni at a transparent CPI. Audience and placement
                            premiums apply on top, configured at campaign launch.
                        </p>
                    </header>
                    <div class="aw-modal__body" data-aw-body>
                        <p class="aw-modal__loading"><i class="fas fa-spinner fa-spin"></i> Loading pricing…</p>
                    </div>
                </div>
            </div>
        `);

        modalRoot.querySelectorAll('[data-aw-close]').forEach(el => {
            el.addEventListener('click', closePricingModal);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalRoot && !modalRoot.classList.contains('aw-hidden')) {
                closePricingModal();
            }
        });

        document.body.appendChild(modalRoot);
        return modalRoot;
    }

    async function fetchRates() {
        if (cachedRates) return cachedRates;
        if (rateFetchPromise) return rateFetchPromise;

        rateFetchPromise = fetch(`${API}/api/cpi/full-rates`, { cache: 'no-store' })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                cachedRates = data;
                return data;
            })
            .catch(err => {
                rateFetchPromise = null;
                throw err;
            });

        return rateFetchPromise;
    }

    function renderError(body, message) {
        body.innerHTML = `
            <p class="aw-modal__error">
                <i class="fas fa-exclamation-circle"></i>
                ${message || 'Could not load pricing right now. Please try again later.'}
            </p>
            <p class="aw-modal__fineprint">
                You can still <a href="${buildAdvertiseUrl()}">sign up at advertise.astegni.com</a> and our team will share rates.
            </p>
        `;
    }

    function renderTiers(body, rates) {
        const tiers = Array.isArray(rates.viewTierPremiums) ? [...rates.viewTierPremiums] : [];
        const currency = rates.currency || 'ETB';
        const baseRate = Number.isFinite(rates.baseRate) ? rates.baseRate : 0;

        // Filter to well-formed tiers and sort ascending by view_count.
        const cleanTiers = tiers
            .map(t => ({
                view_count: Number(t.view_count),
                base_cpi: Number(t.base_cpi != null ? t.base_cpi : t.premium),
                label: t.label || ''
            }))
            .filter(t => Number.isFinite(t.view_count) && t.view_count > 0)
            .sort((a, b) => a.view_count - b.view_count);

        if (cleanTiers.length === 0) {
            body.innerHTML = `
                <p class="aw-modal__base-rate">
                    Base rate: <strong>${formatCurrency(baseRate, currency)}</strong> per impression
                </p>
                <p class="aw-modal__fineprint">
                    View-tier packages aren't configured yet. Sign up at
                    <a href="${buildAdvertiseUrl()}">advertise.astegni.com</a> for a custom quote based on
                    your campaign size, audience, and placement.
                </p>
            `;
            return;
        }

        // Mark the middle-ish tier as "Most popular" — purely cosmetic guidance.
        const popularIndex = cleanTiers.length >= 3
            ? Math.floor(cleanTiers.length / 2)
            : -1;

        const cards = cleanTiers.map((tier, idx) => {
            const perImpression = Number.isFinite(tier.base_cpi) ? tier.base_cpi : baseRate;
            const total = perImpression * tier.view_count;
            const popular = idx === popularIndex ? ' aw-tier-card--popular' : '';
            const label = tier.label
                ? `<p class="aw-tier-card__label">${escapeHtml(tier.label)}</p>`
                : `<p class="aw-tier-card__label">Tier ${idx + 1}</p>`;

            return `
                <div class="aw-tier-card${popular}">
                    ${label}
                    <p class="aw-tier-card__views">${formatNumber(tier.view_count)}</p>
                    <p class="aw-tier-card__views-suffix">guaranteed impressions</p>
                    <p class="aw-tier-card__price">
                        <strong>${formatCurrency(perImpression, currency)}</strong>
                    </p>
                    <p class="aw-tier-card__per">per impression</p>
                    <p class="aw-tier-card__total">
                        Starting from <strong>${formatCurrency(total, currency)}</strong>
                    </p>
                    <button class="aw-tier-card__cta" type="button" data-aw-book>
                        Book now <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </button>
                </div>
            `;
        }).join('');

        body.innerHTML = `
            <p class="aw-modal__base-rate">
                Base rate starts at <strong>${formatCurrency(baseRate, currency)}</strong> per impression.
                Tier packages below lock in pricing for the committed view count.
            </p>
            <div class="aw-tier-grid">${cards}</div>
            <p class="aw-modal__fineprint">
                Audience targeting (students, tutors, parents) and placement
                premiums (leaderboard, logo, in-session banner) are added on top
                at campaign launch. Final estimate is shown in your advertiser
                dashboard before you confirm.
            </p>
        `;

        body.querySelectorAll('[data-aw-book]').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href = buildAdvertiseUrl();
            });
        });
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function openPricingModal() {
        ensureModalRoot();
        modalRoot.classList.remove('aw-hidden');
        document.body.style.overflow = 'hidden';

        const body = modalRoot.querySelector('[data-aw-body]');
        body.innerHTML = `<p class="aw-modal__loading"><i class="fas fa-spinner fa-spin"></i> Loading pricing…</p>`;

        try {
            const rates = await fetchRates();
            renderTiers(body, rates);
        } catch (err) {
            console.warn('[advertise-with-us] Failed to load CPI rates:', err);
            renderError(body);
        }
    }

    function closePricingModal() {
        if (!modalRoot) return;
        modalRoot.classList.add('aw-hidden');
        document.body.style.overflow = '';
    }

    // Auto-init when DOM is ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCTAStrip);
    } else {
        injectCTAStrip();
    }

    // Expose for manual triggering.
    window.AdvertiseWithUsCTA = {
        open: openPricingModal,
        close: closePricingModal
    };
})();
