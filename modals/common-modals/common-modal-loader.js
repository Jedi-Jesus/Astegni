/**
 * Common Modal Loader
 *
 * This module handles dynamic loading of common modals shared across all pages.
 * Use this for pages that don't have their own modal-loader (reels, find-tutors, view-profiles, etc.)
 *
 * Usage:
 * 1. Include this script in your HTML:
 *    <script src="../modals/common-modals/common-modal-loader.js"></script>
 *    OR for pages in root: <script src="modals/common-modals/common-modal-loader.js"></script>
 *
 * 2. It auto-initializes and preloads all common modals
 */

const CommonModalLoader = (function() {
    'use strict';

    // Configuration - will be auto-detected based on page location
    let CONFIG = {
        containerId: 'modal-container',
        cache: true,
        preloadOnInit: true
    };

    // Common modals shared across all pages
    const COMMON_MODALS = [
        'access-restricted-modal.html',
        'add-role-modal.html',
        'coming-soon-modal.html',
        'community-modal.html',
        'create-job-modal.html',
        'logout-modal.html',
        'subscription-modal.html',
        'view-request-modal.html'
    ];

    // Modal ID to filename mapping
    const MODAL_ID_MAP = {
        'access-restricted-modal': 'access-restricted-modal.html',
        'accessRestrictedModal': 'access-restricted-modal.html',
        'add-role-modal': 'add-role-modal.html',
        'coming-soon-modal': 'coming-soon-modal.html',
        'community-modal': 'community-modal.html',
        'communityModal': 'community-modal.html',
        'create-job-modal': 'create-job-modal.html',
        'createJobModal': 'create-job-modal.html',
        'logout-modal': 'logout-modal.html',
        'subscription-modal': 'subscription-modal.html',
        'view-request-modal': 'view-request-modal.html'
    };

    // Cache for loaded modals
    const cache = {};

    // Loading state
    let initialized = false;
    let container = null;
    let basePath = '';

    /**
     * Detect the base path based on current page location
     */
    function detectBasePath() {
        const currentPath = window.location.pathname;

        if (currentPath.includes('/profile-pages/')) {
            return '../modals/common-modals/';
        } else if (currentPath.includes('/view-profiles/')) {
            return '../modals/common-modals/';
        } else if (currentPath.includes('/branch/')) {
            return '../modals/common-modals/';
        } else if (currentPath.includes('/admin-pages/')) {
            return '../modals/common-modals/';
        } else {
            // Root level (index.html, etc.)
            return 'modals/common-modals/';
        }
    }

    /**
     * Initialize the modal loader
     */
    function init() {
        if (initialized) {
            console.warn('[CommonModalLoader] Already initialized');
            return;
        }

        // Detect base path
        basePath = detectBasePath();
        console.log('[CommonModalLoader] Detected base path:', basePath);

        // Get or create modal container
        container = document.getElementById(CONFIG.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = CONFIG.containerId;
            document.body.appendChild(container);
            console.log('[CommonModalLoader] Created modal container');
        }

        initialized = true;
        console.log('[CommonModalLoader] Initialized successfully');

        // Preload all modals if configured
        if (CONFIG.preloadOnInit) {
            preloadAll();
        }
    }

    /**
     * Load a single modal by filename or ID
     * @param {string} modalIdentifier - Modal filename or ID
     * @returns {Promise<void>}
     */
    async function load(modalIdentifier) {
        if (!initialized) {
            console.error('[CommonModalLoader] Not initialized. Call CommonModalLoader.init() first.');
            return;
        }

        // Determine filename
        let filename = MODAL_ID_MAP[modalIdentifier] || modalIdentifier;

        // Full URL
        const url = basePath + filename;

        // Check cache first
        if (CONFIG.cache && cache[url]) {
            console.log(`[CommonModalLoader] Loading from cache: ${filename}`);
            appendToContainer(cache[url]);
            return;
        }

        // Fetch modal HTML
        try {
            console.log(`[CommonModalLoader] Fetching: ${filename}`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // Cache the modal
            if (CONFIG.cache) {
                cache[url] = html;
            }

            // Append to container
            appendToContainer(html);
            console.log(`[CommonModalLoader] Loaded successfully: ${filename}`);

        } catch (error) {
            console.error(`[CommonModalLoader] Failed to load ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Preload all common modals
     * @returns {Promise<void>}
     */
    async function preloadAll() {
        if (!initialized) {
            console.error('[CommonModalLoader] Not initialized. Call CommonModalLoader.init() first.');
            return;
        }

        console.log('[CommonModalLoader] Preloading all common modals...');
        const startTime = performance.now();

        const promises = COMMON_MODALS.map(filename => load(filename));

        try {
            await Promise.all(promises);
            const endTime = performance.now();
            console.log(`[CommonModalLoader] Preloaded ${COMMON_MODALS.length} modals in ${(endTime - startTime).toFixed(2)}ms`);

            // Dispatch custom event
            const event = new CustomEvent('commonModalsLoaded', {
                detail: {
                    modals: COMMON_MODALS.length,
                    loadTime: endTime - startTime
                }
            });
            document.dispatchEvent(event);

        } catch (error) {
            console.error('[CommonModalLoader] Failed to preload some modals:', error);
        }
    }

    /**
     * Append HTML to the modal container
     * @param {string} html - HTML content
     */
    function appendToContainer(html) {
        if (!container) {
            console.error('[CommonModalLoader] Container not found');
            return;
        }

        // Check if modal already exists in DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const modalElement = tempDiv.querySelector('[id]');

        if (modalElement) {
            const existingModal = document.getElementById(modalElement.id);
            if (existingModal) {
                console.log(`[CommonModalLoader] Modal already in DOM: ${modalElement.id}`);
                return; // Don't add duplicate
            }
        }

        container.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Check if a modal is loaded
     * @param {string} modalId - Modal DOM ID
     * @returns {boolean}
     */
    function isLoaded(modalId) {
        return document.getElementById(modalId) !== null;
    }

    // Public API
    return {
        init,
        load,
        preloadAll,
        isLoaded,
        setConfig: function(options) {
            Object.assign(CONFIG, options);
        }
    };
})();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CommonModalLoader.init());
} else {
    CommonModalLoader.init();
}
