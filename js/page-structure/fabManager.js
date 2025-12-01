// ============================================
// FAB MANAGER
// ============================================
class FABManager {
  constructor() {
    this.container = document.querySelector(".fab-container");
    this.mainBtn = document.getElementById("main-fab");
    this.init();
  }

  init() {
    if (!this.mainBtn || !this.container) return;

    this.mainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });
  }

  toggle() {
    this.container.classList.toggle("active");
    this.mainBtn.classList.toggle("active");

    const icon = this.mainBtn.querySelector(".fab-icon");
    if (icon) {
      icon.style.transform = this.container.classList.contains("active")
        ? "rotate(45deg)"
        : "rotate(0)";
    }
  }

  close() {
    this.container.classList.remove("active");
    this.mainBtn.classList.remove("active");
    const icon = this.mainBtn.querySelector(".fab-icon");
    if (icon) {
      icon.style.transform = "rotate(0)";
    }
  }
}