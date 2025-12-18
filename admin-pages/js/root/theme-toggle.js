

// ============================================
//   THEME MANAGEMENT
// ============================================
function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Handle TailwindCSS dark class for both html and body
    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
    }

    // Update global theme variable from app.js if it exists
    if (typeof theme !== 'undefined') {
        window.theme = savedTheme;
    }

    updateThemeIcons(savedTheme);

    const themeToggleBtn = document.getElementById("theme-toggle-btn") || document.getElementById("themeToggle");
    const mobileThemeToggleBtn = document.getElementById("mobile-theme-toggle-btn") || document.getElementById("themeToggleMobile");

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", toggleTheme);
    }
    if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.addEventListener("click", toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    // Handle TailwindCSS dark class for both html and body
    if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
    }

    // Update global theme variable from app.js if it exists
    if (typeof theme !== 'undefined') {
        window.theme = newTheme;
    }

    // Update APP_STATE if it exists
    if (typeof APP_STATE !== 'undefined') {
        APP_STATE.theme = newTheme;
    }

    updateThemeIcons(newTheme);

    // Show notification if available
    if (typeof showToast !== 'undefined') {
        showToast("Theme changed to " + newTheme + " mode", "info");
    } else if (typeof showNotification !== 'undefined') {
        showNotification("Theme changed to " + newTheme + " mode", "success");
    }
}

function updateThemeIcons(theme) {
    const iconPath = theme === "light"
        ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        : "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z";

    const themeIcon = document.querySelector("#theme-icon path");
    const mobileThemeIcon = document.querySelector("#mobile-theme-icon path");

    if (themeIcon) themeIcon.setAttribute("d", iconPath);
    if (mobileThemeIcon) mobileThemeIcon.setAttribute("d", iconPath);
}

// Initialize theme when page loads
document.addEventListener('DOMContentLoaded', initializeTheme);

// Make toggleTheme available globally
window.toggleTheme = toggleTheme;