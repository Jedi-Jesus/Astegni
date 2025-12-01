// ============================================
// SIDEBAR CONTENT MANAGER - RENAMED TO AVOID CONFLICT
// ============================================
class SidebarContentManager {
  constructor() {
    this.sidebar = document.querySelector(".left-sidebar");
    this.toggleBtn = document.querySelector(".sidebar-toggle");
    this.buttons = document.querySelectorAll(".sidebar-btn");
    this.panels = document.querySelectorAll(".sidebar-content-panel");
    this.mainContainer = document.querySelector(".main-container");

    this.init();
  }

  init() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggle());
    }

    this.buttons.forEach((btn) => {
      btn.addEventListener("click", () => this.switchContent(btn));
    });

    // Initialize sidebar state
    const savedState = localStorage.getItem("sidebarState");
    if (savedState === "closed") {
      this.sidebar?.classList.add("closed");
      this.mainContainer?.classList.add("sidebar-closed");
    }
  }

  toggle() {
    this.sidebar?.classList.toggle("closed");
    this.mainContainer?.classList.toggle("sidebar-closed");

    const isClosed = this.sidebar?.classList.contains("closed");

    if (this.toggleBtn) {
      this.toggleBtn.style.transform = isClosed
        ? "rotate(180deg)"
        : "rotate(0)";
    }

    // Save state
    localStorage.setItem("sidebarState", isClosed ? "closed" : "open");
  }

  switchContent(button) {
    // Remove active from all buttons
    this.buttons.forEach((btn) => btn.classList.remove("active"));

    // Add active to clicked button
    button.classList.add("active");

    // Hide all panels with fade out
    this.panels.forEach((panel) => {
      if (panel.classList.contains("active")) {
        panel.style.animation = "fadeOut 0.3s ease";
        setTimeout(() => {
          panel.classList.remove("active");
          panel.style.display = "none";
        }, 300);
      }
    });

    // Show target panel with fade in
    const contentType = button.dataset.content;
    setTimeout(() => {
      const targetPanel = document.getElementById(`${contentType}-content`);
      if (targetPanel) {
        targetPanel.style.display = "block";
        targetPanel.classList.add("active");
        targetPanel.style.animation = "fadeIn 0.5s ease";

        // Load content for the panel
        if (window.contentLoader) {
          window.contentLoader.load(contentType);
        }
      }
    }, 350);
  }
}