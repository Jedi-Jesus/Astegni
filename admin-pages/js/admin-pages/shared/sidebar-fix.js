/**
 * Sidebar Toggle Fix for Admin Pages
 * Ensures hamburger menu properly toggles sidebar visibility
 *
 * ⚠️ UPDATED: switchPanel is now handled by panel-manager-unified.js
 * This file now ONLY handles sidebar toggling, NOT panel switching
 */

// DO NOT OVERRIDE switchPanel - it's handled by panel-manager-unified.js
console.log('sidebar-fix.js: Skipping switchPanel definition (handled by unified manager)');

document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (hamburger && sidebar) {
        // Remove any existing listeners and add new one
        const newHamburger = hamburger.cloneNode(true);
        hamburger.parentNode.replaceChild(newHamburger, hamburger);

        newHamburger.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            newHamburger.classList.toggle('active');

            // Overlay mode: sidebar overlaps content, no shifting
            // Create or toggle overlay
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 998;
                    display: none;
                `;
                document.body.appendChild(overlay);
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('active');
                    newHamburger.classList.remove('active');
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                });
            }

            if (sidebar.classList.contains('active')) {
                overlay.style.display = 'block';
                // Only prevent scroll on mobile devices
                if (window.innerWidth < 768) {
                    document.body.style.overflow = 'hidden';
                }
            } else {
                overlay.style.display = 'none';
                document.body.style.overflow = ''; // Restore scroll
            }
        });

        // Close button inside sidebar
        const closeBtn = document.getElementById('sidebar-close') || document.querySelector('.sidebar-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                sidebar.classList.remove('active');
                newHamburger.classList.remove('active');
                const overlay = document.querySelector('.sidebar-overlay');
                if (overlay) overlay.style.display = 'none';
                document.body.style.overflow = '';
            });
        }

        // ESC key to close sidebar
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                newHamburger.classList.remove('active');
                const overlay = document.querySelector('.sidebar-overlay');
                if (overlay) overlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }

    // Panel initialization is now handled by panel-manager-unified.js
    console.log('sidebar-fix.js: Sidebar toggle initialized (panel switching handled by unified manager)');
});