// ============================================
// SIDEBAR MANAGEMENT MODULE
// ============================================

const SidebarManager = {
    elements: {
        sidebar: null,
        mainContent: null,
        hamburger: null
    },

    init() {
        this.cacheElements();
        this.initializeSidebar();
        this.setupEventListeners();
    },

    cacheElements() {
        this.elements.sidebar = document.getElementById('sidebar');
        this.elements.mainContent = document.getElementById('mainContent');
        this.elements.hamburger = document.getElementById('hamburger');
    },

    setupEventListeners() {
        if (this.elements.hamburger) {
            this.elements.hamburger.addEventListener('click', this.toggleSidebar.bind(this));
        }
    },

    initializeSidebar() {
        if (this.elements.sidebar && this.elements.mainContent) {
            // Initialize sidebar as closed
            this.elements.sidebar.classList.remove('open');
            this.elements.mainContent.classList.remove('shifted');
        }
    },

    toggleSidebar() {
        if (this.elements.sidebar && this.elements.mainContent) {
            this.elements.sidebar.classList.toggle('open');
            this.elements.mainContent.classList.toggle('shifted');

            // Handle mobile overlay
            let overlay = document.getElementById('sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'sidebar-overlay';
                overlay.addEventListener('click', () => this.closeSidebar());
                document.body.appendChild(overlay);
            }

            if (this.elements.sidebar.classList.contains('open')) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
    },

    closeSidebar() {
        if (this.elements.sidebar && this.elements.mainContent) {
            this.elements.sidebar.classList.remove('open');
            this.elements.mainContent.classList.remove('shifted');

            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        }
    }
};