/**
 * Debug Page Load Script
 * Comprehensive logging to track page initialization and identify loading screen issues
 */

(function() {
    console.log('%c=== PAGE LOAD DEBUG STARTED ===', 'background: #222; color: #00ff00; font-size: 16px; font-weight: bold; padding: 10px;');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);

    // Track all scripts loading
    const scriptLoadTimes = new Map();
    let scriptStartTime = performance.now();

    // Monitor DOM changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check for loading screens
                        if (node.id === 'loading-screen' ||
                            node.classList?.contains('loading-screen') ||
                            node.classList?.contains('loader') ||
                            node.classList?.contains('spinner')) {
                            console.log('%c[DOM] Loading screen element added:', 'color: orange; font-weight: bold;', {
                                id: node.id,
                                className: node.className,
                                innerHTML: node.innerHTML?.substring(0, 200),
                                timestamp: performance.now()
                            });
                        }

                        // Check for body visibility changes
                        if (node.tagName === 'BODY' || node === document.body) {
                            console.log('%c[DOM] Body element modified:', 'color: cyan;', {
                                display: node.style.display,
                                visibility: node.style.visibility,
                                opacity: node.style.opacity,
                                overflow: node.style.overflow
                            });
                        }
                    }
                });

                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.id === 'loading-screen' ||
                            node.classList?.contains('loading-screen')) {
                            console.log('%c[DOM] Loading screen removed!', 'color: lime; font-weight: bold;', {
                                id: node.id,
                                timestamp: performance.now()
                            });
                        }
                    }
                });
            }

            // Monitor attribute changes on body
            if (mutation.type === 'attributes' && mutation.target === document.body) {
                console.log('%c[DOM] Body attribute changed:', 'color: yellow;', {
                    attribute: mutation.attributeName,
                    value: document.body.getAttribute(mutation.attributeName),
                    style: {
                        display: document.body.style.display,
                        visibility: document.body.style.visibility,
                        opacity: document.body.style.opacity
                    }
                });
            }
        });
    });

    // Start observing
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden']
        });
    } else {
        // Wait for body
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'hidden']
            });
        });
    }

    // Log all script executions
    console.log('%c[SCRIPTS] Monitoring script execution...', 'color: cyan; font-weight: bold;');

    // Track DOMContentLoaded
    let domContentLoadedFired = false;
    document.addEventListener('DOMContentLoaded', () => {
        domContentLoadedFired = true;
        console.log('%c[EVENT] DOMContentLoaded fired', 'color: lime; font-weight: bold; font-size: 14px;', {
            timestamp: performance.now(),
            bodyExists: !!document.body,
            bodyChildren: document.body?.children.length
        });

        // Check for loading screens
        setTimeout(() => {
            const loadingScreens = document.querySelectorAll('[id*="loading"], [class*="loading"], [class*="loader"], [class*="spinner"]');
            if (loadingScreens.length > 0) {
                console.log('%c[DEBUG] Found loading screen elements:', 'color: orange; font-weight: bold;',
                    Array.from(loadingScreens).map(el => ({
                        id: el.id,
                        className: el.className,
                        display: window.getComputedStyle(el).display,
                        visibility: window.getComputedStyle(el).visibility,
                        opacity: window.getComputedStyle(el).opacity
                    }))
                );
            } else {
                console.log('%c[DEBUG] No loading screen elements found', 'color: lime;');
            }
        }, 100);
    });

    // Track window.onload
    window.addEventListener('load', () => {
        console.log('%c[EVENT] Window load complete', 'color: lime; font-weight: bold; font-size: 14px;', {
            timestamp: performance.now()
        });
    });

    // Monitor localStorage and sessionStorage
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        if (key.includes('load') || key.includes('init') || key.includes('ready')) {
            console.log('[STORAGE] setItem:', key, '=', value);
        }
        return originalSetItem.apply(this, arguments);
    };

    // Monitor console errors
    const originalError = console.error;
    console.error = function(...args) {
        console.log('%c[ERROR DETECTED]', 'color: red; font-weight: bold;', ...args);
        return originalError.apply(console, arguments);
    };

    // Check body visibility every 500ms for first 10 seconds
    let checkCount = 0;
    const visibilityChecker = setInterval(() => {
        checkCount++;
        if (checkCount > 20 || !document.body) {
            clearInterval(visibilityChecker);
            return;
        }

        const bodyStyle = window.getComputedStyle(document.body);
        const bodyVisible = bodyStyle.display !== 'none' &&
                           bodyStyle.visibility !== 'hidden' &&
                           parseFloat(bodyStyle.opacity) > 0;

        if (!bodyVisible) {
            console.log('%c[VISIBILITY] Body is HIDDEN!', 'color: red; font-weight: bold; font-size: 14px;', {
                timestamp: performance.now(),
                display: bodyStyle.display,
                visibility: bodyStyle.visibility,
                opacity: bodyStyle.opacity,
                checkNumber: checkCount
            });
        }

        // Check for overlays
        const overlays = document.querySelectorAll('[class*="overlay"], [class*="modal"]');
        const visibleOverlays = Array.from(overlays).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   parseFloat(style.opacity) > 0 &&
                   parseFloat(style.zIndex) > 100;
        });

        if (visibleOverlays.length > 0) {
            console.log('%c[VISIBILITY] Found visible overlays:', 'color: orange; font-weight: bold;',
                visibleOverlays.map(el => ({
                    id: el.id,
                    className: el.className,
                    zIndex: window.getComputedStyle(el).zIndex,
                    position: window.getComputedStyle(el).position
                }))
            );
        }
    }, 500);

    // Log critical manager initializations
    setTimeout(() => {
        console.log('%c[MANAGERS] Checking manager status...', 'color: cyan; font-weight: bold;');

        const managers = [
            'AuthManager',
            'whiteboardManager',
            'StudentProfileDataLoader',
            'TutorProfileDataLoader',
            'ProfileSystem',
            'ModalLoader',
            'CommonModalLoader'
        ];

        managers.forEach(manager => {
            const exists = typeof window[manager] !== 'undefined';
            console.log(`[MANAGER] ${manager}:`, exists ? '✅ Loaded' : '❌ Not loaded');

            if (exists && typeof window[manager].initialize === 'function') {
                console.log(`  └─ Has initialize() method`);
            }
        });
    }, 1000);

    // Final summary after 5 seconds
    setTimeout(() => {
        console.log('%c=== PAGE LOAD DEBUG SUMMARY (5s) ===', 'background: #222; color: #00ff00; font-size: 16px; font-weight: bold; padding: 10px;');
        console.log('DOMContentLoaded fired:', domContentLoadedFired);
        console.log('Body visible:', document.body && window.getComputedStyle(document.body).display !== 'none');
        console.log('Loading screens present:', document.querySelectorAll('[id*="loading"], [class*="loading"]').length);
        console.log('Active modals:', document.querySelectorAll('[class*="modal"].active, [class*="overlay"].active').length);

        // Check if any element is covering the page
        const bodyRect = document.body?.getBoundingClientRect();
        if (bodyRect) {
            const centerX = bodyRect.width / 2;
            const centerY = bodyRect.height / 2;
            const topElement = document.elementFromPoint(centerX, centerY);
            console.log('Element at page center:', {
                tagName: topElement?.tagName,
                id: topElement?.id,
                className: topElement?.className,
                zIndex: topElement ? window.getComputedStyle(topElement).zIndex : null
            });
        }

        console.log('%c=== END DEBUG SUMMARY ===', 'background: #222; color: #00ff00; font-size: 16px; font-weight: bold; padding: 10px;');
    }, 5000);

    // Log when script completes
    console.log('%c[DEBUG SCRIPT] Monitoring active. Check console for real-time updates.', 'color: lime; font-weight: bold;');
})();
