// ============================================================
//   FOOTER MANAGER - Common footer logic for all pages
//   Handles: live stats from API, modal triggers, social links
// ============================================================

(function () {
    'use strict';

    // ── Config ─────────────────────────────────────────────
    const API_BASE_URL = (function () {
        const isProduction = ['astegni.com', 'www.astegni.com'].includes(window.location.hostname);
        return isProduction ? 'https://api.astegni.com' : 'http://localhost:8000';
    })();

    // ── Fetch live stats from the API ───────────────────────
    async function loadFooterStats() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/footer-stats`);
            if (!res.ok) throw new Error('non-2xx');
            const data = await res.json();

            setStatNumber('footer-stat-users',   formatCount(data.active_users));
            setStatNumber('footer-stat-courses',  formatCount(data.total_courses));
        } catch (err) {
            // Keep the placeholder text already in the HTML; silently fail
            console.warn('[FooterManager] Could not load footer stats:', err.message);
        }
    }

    function setStatNumber(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function formatCount(n) {
        if (n === null || n === undefined) return '—';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M+';
        if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k+';
        return n.toString();
    }

    // ── Modal openers ───────────────────────────────────────
    window.openAboutAstegniModal = function () {
        if (typeof openModal === 'function') {
            openModal('about-astegni-modal');
        } else {
            // Fallback: try CommonModalLoader then open
            const tryOpen = () => {
                const modal = document.getElementById('about-astegni-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                } else {
                    setTimeout(tryOpen, 100);
                }
            };
            tryOpen();
        }
    };

    window.closeAboutAstegniModal = function () {
        if (typeof closeModal === 'function') {
            closeModal('about-astegni-modal');
        } else {
            const modal = document.getElementById('about-astegni-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }
    };

    // ── Init ────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        loadFooterStats();

        // Close about modal on overlay click
        document.addEventListener('click', function (e) {
            const modal = document.getElementById('about-astegni-modal');
            if (modal && e.target === modal) {
                window.closeAboutAstegniModal();
            }
        });

        // ESC key closes about modal
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('about-astegni-modal');
                if (modal && !modal.classList.contains('hidden') && modal.style.display !== 'none') {
                    window.closeAboutAstegniModal();
                }
            }
        });
    });

})();
