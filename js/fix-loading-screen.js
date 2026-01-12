/**
 * Fix Loading Screen Issue
 * Removes any loading screens that incorrectly appear on profile pages
 */

(function() {
    // Immediately check for and remove loading screens on non-index pages
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');

    if (!isIndexPage) {
        // Remove any loading screens immediately
        const removeLoadingScreens = () => {
            const loadingScreens = document.querySelectorAll('#loading-screen, .loading-screen');
            loadingScreens.forEach(screen => {
                console.log('[LoadingScreenFix] Removing inappropriate loading screen:', screen.id || screen.className);
                screen.remove();
            });

            // Ensure body is visible
            if (document.body) {
                document.body.style.display = '';
                document.body.style.visibility = 'visible';
                document.body.style.opacity = '1';
            }
        };

        // Run immediately
        removeLoadingScreens();

        // Run after DOM loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', removeLoadingScreens);
        }

        // Monitor for dynamically added loading screens
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.id === 'loading-screen' ||
                            node.classList?.contains('loading-screen')) {
                            console.log('[LoadingScreenFix] Caught and removed dynamically added loading screen');
                            node.remove();
                        }
                    }
                });
            });
        });

        // Start observing once body exists
        const startObserving = () => {
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                console.log('[LoadingScreenFix] Monitoring for inappropriate loading screens');
            }
        };

        if (document.body) {
            startObserving();
        } else {
            document.addEventListener('DOMContentLoaded', startObserving);
        }

        // Clean up every 100ms for the first 3 seconds (aggressive cleanup)
        let cleanupCount = 0;
        const aggressiveCleanup = setInterval(() => {
            cleanupCount++;
            removeLoadingScreens();

            if (cleanupCount >= 30) { // 30 * 100ms = 3 seconds
                clearInterval(aggressiveCleanup);
                console.log('[LoadingScreenFix] Aggressive cleanup complete');
            }
        }, 100);
    }
})();
