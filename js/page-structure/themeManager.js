
// ============================================
// THEME MANAGER - ENHANCED
// ============================================
class ThemeManager {
  constructor() {
    this.root = document.documentElement;
    this.toggleBtn = document.querySelector(".theme-toggle");
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggle());
    }
    // Apply saved theme on initialization
    this.apply(STATE.currentTheme);
  }

  apply(theme) {
    STATE.currentTheme = theme;

    // Update attributes
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);

    // Update toggle button
    if (this.toggleBtn) {
      this.toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    }

    localStorage.setItem("theme", theme);

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: theme }));
  }

  toggle() {
    const newTheme = STATE.currentTheme === "dark" ? "light" : "dark";
    this.apply(newTheme);
    Utils.showToast(`Theme changed to ${newTheme} mode`, "success");
  }
}
