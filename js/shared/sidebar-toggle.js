/**
 * Sidebar Toggle - Shared Component for Profile Pages
 * Handles hamburger menu toggling for sidebar visibility
 */

document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (!hamburgerBtn || !sidebar) {
        console.warn('[SidebarToggle] Hamburger or sidebar element not found');
        return;
    }

    // Remove any existing listeners by cloning
    const newHamburgerBtn = hamburgerBtn.cloneNode(true);
    hamburgerBtn.parentNode.replaceChild(newHamburgerBtn, hamburgerBtn);

    // Get the inner .hamburger element for animation
    const hamburgerInner = newHamburgerBtn.querySelector('.hamburger');

    // Create overlay element
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
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
    }

    // Toggle sidebar function
    function toggleSidebar() {
        const isActive = sidebar.classList.toggle('active');
        newHamburgerBtn.classList.toggle('active');
        // Also toggle on inner .hamburger element for CSS animation
        if (hamburgerInner) {
            hamburgerInner.classList.toggle('active');
        }

        if (isActive) {
            overlay.style.display = 'block';
            // Trigger reflow for transition
            overlay.offsetHeight;
            overlay.style.opacity = '1';
            // Prevent body scroll on mobile
            if (window.innerWidth < 768) {
                document.body.style.overflow = 'hidden';
            }
        } else {
            closeSidebar();
        }
    }

    // Close sidebar function
    function closeSidebar() {
        sidebar.classList.remove('active');
        newHamburgerBtn.classList.remove('active');
        // Also remove from inner .hamburger element
        if (hamburgerInner) {
            hamburgerInner.classList.remove('active');
        }
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
    }

    // Hamburger click handler
    newHamburgerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });

    // Overlay click to close
    overlay.addEventListener('click', closeSidebar);

    // Close button inside sidebar
    const closeBtn = document.getElementById('sidebar-close') || document.querySelector('.sidebar-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    // ESC key to close sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    // Close sidebar when clicking a sidebar link (mobile)
    const sidebarLinks = sidebar.querySelectorAll('.sidebar-link, .nav-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 1024) {
                closeSidebar();
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024 && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    // Export toggle function globally
    window.toggleSidebar = toggleSidebar;
    window.closeSidebar = closeSidebar;

    console.log('[SidebarToggle] Initialized successfully');
});
