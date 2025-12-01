/**
 * Modal Loader for Index Page
 *
 * This module handles dynamic loading of modals that have been extracted
 * from index.html into separate files for better maintainability.
 *
 * Usage:
 * 1. Include this script in index.html:
 *    <script src="modals/index/modal-loader.js"></script>
 *
 * 2. Initialize on page load:
 *    IndexModalLoader.init();
 *
 * 3. Load specific modal when needed:
 *    IndexModalLoader.load('login-modal.html');
 *
 * 4. Or preload all modals:
 *    IndexModalLoader.preloadAll();
 */

const IndexModalLoader = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        indexModalPath: 'modals/index/',
        commonModalPath: 'modals/common-modals/',
        containerId: 'modal-container',
        cache: true, // Cache loaded modals
        preloadOnInit: true // Preload all modals on page load for instant access
    };

    // Modal file registry - Index page specific modals
    const INDEX_MODALS = [
        'login-modal.html',
        'register-modal.html',
        'contact-confirmation-modal.html',
        'forgot-password-modal.html',
        'reset-password-modal.html',
        'notification-modal.html',
        'partner-modal.html',
        'partner-success-modal.html'
    ];

    // Modals in common-modals folder (shared across pages)
    const COMMON_MODALS = [
        'add-role-modal.html',
        'otp-verification-modal.html',
        'coming-soon-modal.html',
        'logout-modal.html'
    ];

    // Modal ID to filename and path mapping
    const MODAL_ID_MAP = {
        // Index page specific modals
        'login-modal': { file: 'login-modal.html', path: 'index' },
        'register-modal': { file: 'register-modal.html', path: 'index' },
        'contact-confirmation-modal': { file: 'contact-confirmation-modal.html', path: 'index' },
        'forgot-password-modal': { file: 'forgot-password-modal.html', path: 'index' },
        'reset-password-modal': { file: 'reset-password-modal.html', path: 'index' },
        'notification-modal': { file: 'notification-modal.html', path: 'index' },
        'partner-modal': { file: 'partner-modal.html', path: 'index' },
        'partner-success-modal': { file: 'partner-success-modal.html', path: 'index' },

        // Common modals (shared across pages)
        'add-role-modal': { file: 'add-role-modal.html', path: 'common-modals' },
        'otp-verification-modal': { file: 'otp-verification-modal.html', path: 'common-modals' },
        'coming-soon-modal': { file: 'coming-soon-modal.html', path: 'common-modals' },
        'logout-modal': { file: 'logout-modal.html', path: 'common-modals' },
        'adAnalyticsModal': { file: 'ad-analytics-modal.html', path: 'common-modals' }
    };

    // Cache for loaded modals
    const cache = {};

    // Loading state
    let initialized = false;
    let container = null;

    /**
     * Initialize the modal loader
     */
    function init() {
        if (initialized) {
            console.warn('[IndexModalLoader] Already initialized');
            return;
        }

        // Get or create modal container
        container = document.getElementById(CONFIG.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = CONFIG.containerId;
            document.body.appendChild(container);
            console.log('[IndexModalLoader] Created modal container');
        }

        initialized = true;
        console.log('[IndexModalLoader] Initialized successfully');

        // Preload all modals if configured
        if (CONFIG.preloadOnInit) {
            preloadAll();
        }
    }

    /**
     * Get the full path for a modal file
     * @param {string} filename - Modal filename
     * @param {string} pathType - 'index' or 'common-modals'
     * @returns {string} Full path
     */
    function getModalPath(filename, pathType) {
        if (pathType === 'common-modals') {
            return CONFIG.commonModalPath + filename;
        }
        return CONFIG.indexModalPath + filename;
    }

    /**
     * Load a single modal by filename or ID
     * @param {string} modalIdentifier - Modal filename or ID
     * @returns {Promise<void>}
     */
    async function load(modalIdentifier) {
        if (!initialized) {
            console.error('[IndexModalLoader] Not initialized. Call IndexModalLoader.init() first.');
            return;
        }

        // Determine filename and path
        let filename, modalPath;
        const modalInfo = MODAL_ID_MAP[modalIdentifier];

        if (modalInfo) {
            // Modal ID found in mapping
            filename = modalInfo.file;
            modalPath = getModalPath(filename, modalInfo.path);
        } else {
            // Assume it's a filename, check which array it belongs to
            filename = modalIdentifier;
            if (COMMON_MODALS.includes(filename)) {
                modalPath = CONFIG.commonModalPath + filename;
            } else {
                modalPath = CONFIG.indexModalPath + filename;
            }
        }

        // Check cache first
        if (CONFIG.cache && cache[modalPath]) {
            console.log(`[IndexModalLoader] Loading from cache: ${filename}`);
            appendToContainer(cache[modalPath]);
            return;
        }

        // Fetch modal HTML
        try {
            console.log(`[IndexModalLoader] Fetching: ${filename} from ${modalPath}`);
            const response = await fetch(modalPath);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // Cache the modal
            if (CONFIG.cache) {
                cache[modalPath] = html;
            }

            // Append to container
            appendToContainer(html);
            console.log(`[IndexModalLoader] Loaded successfully: ${filename}`);

        } catch (error) {
            console.error(`[IndexModalLoader] Failed to load ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Load modal by ID (convenience method)
     * @param {string} modalId - Modal DOM ID
     * @returns {Promise<void>}
     */
    async function loadById(modalId) {
        return load(modalId);
    }

    /**
     * Preload all modals
     * @returns {Promise<void>}
     */
    async function preloadAll() {
        if (!initialized) {
            console.error('[IndexModalLoader] Not initialized. Call IndexModalLoader.init() first.');
            return;
        }

        console.log('[IndexModalLoader] Preloading all modals...');
        const startTime = performance.now();

        // Load all index modals
        const indexPromises = INDEX_MODALS.map(filename => {
            const path = CONFIG.indexModalPath + filename;
            return fetchAndCache(path, filename);
        });

        // Load all common modals
        const commonPromises = COMMON_MODALS.map(filename => {
            const path = CONFIG.commonModalPath + filename;
            return fetchAndCache(path, filename);
        });

        try {
            await Promise.all([...indexPromises, ...commonPromises]);
            const endTime = performance.now();
            console.log(`[IndexModalLoader] Preloaded ${INDEX_MODALS.length + COMMON_MODALS.length} modals (${INDEX_MODALS.length} index + ${COMMON_MODALS.length} common) in ${(endTime - startTime).toFixed(2)}ms`);

            // Dispatch custom event to notify that all modals are loaded
            // This allows other scripts to attach event listeners after modals exist in DOM
            const event = new CustomEvent('modalsLoaded', {
                detail: {
                    indexModals: INDEX_MODALS.length,
                    commonModals: COMMON_MODALS.length,
                    loadTime: endTime - startTime
                }
            });
            document.dispatchEvent(event);
            console.log('[IndexModalLoader] Dispatched "modalsLoaded" event');

        } catch (error) {
            console.error('[IndexModalLoader] Failed to preload some modals:', error);
        }
    }

    /**
     * Fetch and cache a modal
     * @param {string} path - Full path to modal file
     * @param {string} filename - Modal filename (for logging)
     * @returns {Promise<void>}
     */
    async function fetchAndCache(path, filename) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const html = await response.text();
            cache[path] = html;
            appendToContainer(html);
        } catch (error) {
            console.warn(`[IndexModalLoader] Could not load ${filename}:`, error.message);
        }
    }

    /**
     * Append HTML to the modal container
     * @param {string} html - HTML content
     */
    function appendToContainer(html) {
        if (!container) {
            console.error('[IndexModalLoader] Container not found');
            return;
        }

        // Check if modal already exists in DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const modalElement = tempDiv.querySelector('[id]');

        if (modalElement) {
            const existingModal = document.getElementById(modalElement.id);
            if (existingModal) {
                console.log(`[IndexModalLoader] Modal already in DOM: ${modalElement.id}`);
                return; // Don't add duplicate
            }
        }

        container.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Clear all loaded modals from container
     */
    function clearAll() {
        if (container) {
            container.innerHTML = '';
            console.log('[IndexModalLoader] Cleared all modals from container');
        }
    }

    /**
     * Clear cache
     */
    function clearCache() {
        Object.keys(cache).forEach(key => delete cache[key]);
        console.log('[IndexModalLoader] Cleared cache');
    }

    /**
     * Get list of all available modals
     * @returns {Object} Object with index and common modal arrays
     */
    function getAvailableModals() {
        return {
            index: [...INDEX_MODALS],
            common: [...COMMON_MODALS],
            all: [...INDEX_MODALS, ...COMMON_MODALS]
        };
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
        loadById,
        preloadAll,
        clearAll,
        clearCache,
        getAvailableModals,
        isLoaded,
        // Expose config for customization
        setConfig: function(options) {
            Object.assign(CONFIG, options);
        }
    };
})();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => IndexModalLoader.init());
} else {
    IndexModalLoader.init();
}
