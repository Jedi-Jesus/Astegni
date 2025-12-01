// ============================================
// MODALS MANAGER - ENHANCED
// ============================================
class ModalsManager {
    constructor() {
        this.activeModals = new Set();
        this.init();
    }

    init() {
        // Handle all modal overlays
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("modal-overlay")) {
                const modal = e.target.closest(".modal");
                if (modal) {
                    this.close(modal.id);
                }
            }
        });

        // Handle ESC key for all modals
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeTopModal();
            }
        });
        
        console.log("ModalsManager initialized");
    }

    open(modalId) {
        console.log(`Opening modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            console.error(`Modal not found: ${modalId}`);
            return;
        }
        
        // Remove all hiding classes
        modal.classList.remove("hidden");
        modal.classList.add("show");
        
        // Force display
        modal.style.display = "flex";
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        
        this.activeModals.add(modalId);

        const content = modal.querySelector(".modal-content");
        if (content) {
            content.style.animation = "modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
        }

        // Auto-attach close button handler
        const closeBtn = modal.querySelector(".modal-close");
        if (closeBtn && !closeBtn.hasAttribute("data-handler-attached")) {
            closeBtn.setAttribute("data-handler-attached", "true");
            closeBtn.addEventListener("click", () => this.close(modalId));
        }
        
        console.log(`Modal ${modalId} opened successfully`);
    }

    close(modalId) {
        console.log(`Closing modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("show");
            modal.classList.add("hidden");
            modal.style.display = "none";
            this.activeModals.delete(modalId);
        }
    }

    closeTopModal() {
        if (this.activeModals.size > 0) {
            const lastModal = Array.from(this.activeModals).pop();
            this.close(lastModal);
        }
    }

    closeAll() {
        document.querySelectorAll(".modal.show").forEach((modal) => {
            modal.classList.remove("show");
            modal.classList.add("hidden");
            modal.style.display = "none";
        });
        this.activeModals.clear();
    }
}