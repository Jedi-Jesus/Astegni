

// ============================================
//   NAVIGATION
// ============================================
function initializeNavigation() {
    const navbar = document.querySelector(".navbar");
    const menuBtn = document.getElementById("menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");

    window.addEventListener("scroll", () => {
        if (window.scrollY > CONFIG.SCROLL_THRESHOLD) {
            navbar?.classList.add("scrolled");
        } else {
            navbar?.classList.remove("scrolled");
        }
    });

    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            menuBtn.classList.toggle("active");
            mobileMenu?.classList.toggle("hidden");
            document.body.style.overflow = mobileMenu?.classList.contains("hidden") ? "" : "hidden";
        });
    }

    document.querySelectorAll(".mobile-menu-item").forEach((item) => {
        item.addEventListener("click", () => {
            menuBtn?.classList.remove("active");
            mobileMenu?.classList.add("hidden");
            document.body.style.overflow = "";
        });
    });
}

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
