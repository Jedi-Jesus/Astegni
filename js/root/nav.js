

// ============================================
//   NAVIGATION
// ============================================
let navInitialized = false;

function initializeNavigation() {
    // Prevent duplicate initialization
    if (navInitialized) {
        console.log('[Nav] Already initialized, skipping');
        return;
    }
    navInitialized = true;

    const navbar = document.querySelector(".navbar");

    // Support both old (menu-btn) and new (mobileMenuBtn) button IDs
    const menuBtn = document.getElementById("mobileMenuBtn") || document.getElementById("menu-btn");
    const mobileMenu = document.getElementById("mobileMenu") || document.getElementById("mobile-menu");
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

    console.log('[Nav] initializeNavigation called');
    console.log('[Nav] menuBtn found:', !!menuBtn, menuBtn);
    console.log('[Nav] mobileMenu found:', !!mobileMenu);
    console.log('[Nav] mobileMenuOverlay found:', !!mobileMenuOverlay);

    const scrollThreshold = (typeof CONFIG !== 'undefined' && CONFIG.SCROLL_THRESHOLD) ? CONFIG.SCROLL_THRESHOLD : 100;

    window.addEventListener("scroll", () => {
        if (window.scrollY > scrollThreshold) {
            navbar?.classList.add("scrolled");
        } else {
            navbar?.classList.remove("scrolled");
        }
    });

    // Mobile menu toggle (slide-in panel)
    if (menuBtn) {
        console.log('[Nav] Attaching click handler to menuBtn');
        menuBtn.addEventListener("click", () => {
            console.log('[Nav] Menu button clicked!');
            console.log('[Nav] Before toggle - mobileMenu classes:', mobileMenu?.className);
            menuBtn.classList.toggle("active");
            mobileMenu?.classList.toggle("hidden");
            mobileMenuOverlay?.classList.toggle("hidden");
            console.log('[Nav] After toggle - mobileMenu classes:', mobileMenu?.className);
            console.log('[Nav] mobileMenu computed display:', mobileMenu ? getComputedStyle(mobileMenu).display : 'N/A');
            console.log('[Nav] mobileMenu computed transform:', mobileMenu ? getComputedStyle(mobileMenu).transform : 'N/A');
            document.body.style.overflow = mobileMenu?.classList.contains("hidden") ? "" : "hidden";
        });
    } else {
        console.warn('[Nav] menuBtn not found, cannot attach click handler');
    }

    // Close on overlay click
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener("click", () => {
            closeMobileMenu();
        });
    }

    // Close menu when clicking menu items
    document.querySelectorAll(".mobile-menu-item, .mobile-menu-link").forEach((item) => {
        item.addEventListener("click", () => {
            closeMobileMenu();
        });
    });
}

// Global function to close mobile menu (used by onclick handlers)
function closeMobileMenu() {
    const menuBtn = document.getElementById("mobileMenuBtn") || document.getElementById("menu-btn");
    const mobileMenu = document.getElementById("mobileMenu") || document.getElementById("mobile-menu");
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

    menuBtn?.classList.remove("active");
    mobileMenu?.classList.add("hidden");
    mobileMenuOverlay?.classList.add("hidden");
    document.body.style.overflow = "";
}

// Make closeMobileMenu globally available
window.closeMobileMenu = closeMobileMenu;

// Auto-initialize navigation on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    console.log('[Nav] Mobile menu initialized');
});

function initializeNavigationAuth() {
    const navLinks = document.querySelectorAll(".nav-link, .mobile-menu a");

    navLinks.forEach((link) => {
        if (!link.href || !link.getAttribute("href")) return;
        if (link.href.includes("news.html")) return;

        const protectedPages = ["find-tutors", "store", "find-jobs", "reels"];
        const isProtected = protectedPages.some((page) => link.href.includes(page));

        if (isProtected) {
            link.addEventListener("click", (e) => {
                if (!APP_STATE.isLoggedIn) {
                    e.preventDefault();
                    showToast("Please login to access this feature", "warning");
                    localStorage.setItem("intendedDestination", link.href);
                    openModal("login-modal");
                }
            });
        }
    });
}
