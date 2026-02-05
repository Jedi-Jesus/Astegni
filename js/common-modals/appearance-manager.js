/**
 * Appearance Manager - Unified Version
 * Handles all appearance modal functionality with mini-mode support
 * Combines class-based structure with global function exports for compatibility
 */

// ==========================================
// CLASS-BASED MANAGER
// ==========================================

class AppearanceModalManager {
    constructor() {
        this.modal = null;
        this.isMiniMode = false;
        this.settings = this.loadSettings();
        this.previewSettings = { ...this.settings };
        this.defaultSettings = {
            theme: 'light',
            colorPalette: 'emerald-gold-charcoal',
            fontFamily: 'patrick-hand',
            fontSize: 16,
            displayDensity: 'comfortable',
            accentColor: 'indigo',
            enableAnimations: true,
            reduceMotion: false,
            sidebarPosition: 'left'
        };
    }

    /**
     * Initialize the appearance modal
     */
    initialize() {
        this.modal = document.getElementById('appearance-modal');
        if (!this.modal) {
            console.log('[Appearance] Modal not found during initialization');
            return;
        }

        this.applySettings();
        this.updateUI();
        this.setupEventListeners();
        console.log('[Appearance] Manager initialized');
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('appearance_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('[Appearance] Error loading settings:', e);
                return { ...this.defaultSettings };
            }
        }
        return { ...this.defaultSettings };
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('appearance_settings', JSON.stringify(this.settings));
            localStorage.setItem('theme', this.settings.theme);
            localStorage.setItem('colorPalette', this.settings.colorPalette);
        } catch (e) {
            console.error('[Appearance] Error saving settings:', e);
        }
    }

    /**
     * Apply all settings to the document
     */
    applySettings() {
        this.applyTheme(this.settings.theme);
        this.applyColorPalette(this.settings.colorPalette);
        this.applyFontFamily(this.settings.fontFamily);
        this.applyFontSize(this.settings.fontSize);
        this.applyDisplayDensity(this.settings.displayDensity);
        this.applyAccentColor(this.settings.accentColor);
        this.applyAnimations(this.settings.enableAnimations);
        this.applyReduceMotion(this.settings.reduceMotion);
        this.applySidebarPosition(this.settings.sidebarPosition);
    }

    /**
     * Update UI to reflect current settings
     */
    updateUI() {
        if (!this.modal) return;

        // Update theme buttons
        document.querySelectorAll('.theme-option').forEach(btn => btn.classList.remove('active'));
        const themeBtn = document.getElementById(`theme-${this.previewSettings.theme}-btn`);
        if (themeBtn) themeBtn.classList.add('active');

        // Update color palette cards
        document.querySelectorAll('.palette-card').forEach(btn => btn.classList.remove('active'));
        const paletteCard = document.querySelector(`.palette-card[data-palette="${this.previewSettings.colorPalette}"]`);
        if (paletteCard) paletteCard.classList.add('active');

        // Update font family buttons
        document.querySelectorAll('.font-option').forEach(btn => btn.classList.remove('active'));
        const fontBtn = document.getElementById(`font-${this.previewSettings.fontFamily}-btn`);
        if (fontBtn) fontBtn.classList.add('active');

        // Update font size slider
        const fontSlider = document.getElementById('font-size-slider');
        const fontValue = document.getElementById('font-size-value');
        if (fontSlider) fontSlider.value = this.settings.fontSize;
        if (fontValue) fontValue.textContent = `${this.settings.fontSize}px`;
        this.previewFontSize(this.settings.fontSize);

        // Update density buttons
        document.querySelectorAll('.density-option').forEach(btn => btn.classList.remove('active'));
        const densityBtn = document.getElementById(`density-${this.settings.displayDensity}-btn`);
        if (densityBtn) densityBtn.classList.add('active');

        // Update accent color buttons
        document.querySelectorAll('.accent-color-btn').forEach(btn => btn.classList.remove('active'));
        const accentBtn = document.querySelector(`.accent-color-btn[data-color="${this.settings.accentColor}"]`);
        if (accentBtn) accentBtn.classList.add('active');

        // Update animation toggles
        const enableAnimationsCheckbox = document.getElementById('enable-animations');
        const reduceMotionCheckbox = document.getElementById('reduce-motion');
        if (enableAnimationsCheckbox) enableAnimationsCheckbox.checked = this.settings.enableAnimations;
        if (reduceMotionCheckbox) reduceMotionCheckbox.checked = this.settings.reduceMotion;

        // Update sidebar position buttons
        document.querySelectorAll('.sidebar-option').forEach(btn => btn.classList.remove('active'));
        const sidebarBtn = document.getElementById(`sidebar-${this.settings.sidebarPosition}-btn`);
        if (sidebarBtn) sidebarBtn.classList.add('active');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Font size slider
        const fontSlider = document.getElementById('font-size-slider');
        if (fontSlider) {
            fontSlider.addEventListener('input', (e) => {
                this.previewFontSize(e.target.value);
                this.previewSettings.fontSize = parseInt(e.target.value);
                this.updateUnsavedIndicator();
            });
        }

        // Animation toggles
        const enableAnimationsCheckbox = document.getElementById('enable-animations');
        const reduceMotionCheckbox = document.getElementById('reduce-motion');

        if (enableAnimationsCheckbox) {
            enableAnimationsCheckbox.addEventListener('change', (e) => {
                this.previewSettings.enableAnimations = e.target.checked;
                this.applyAnimations(e.target.checked);
                this.updateUnsavedIndicator();
            });
        }

        if (reduceMotionCheckbox) {
            reduceMotionCheckbox.addEventListener('change', (e) => {
                this.previewSettings.reduceMotion = e.target.checked;
                this.applyReduceMotion(e.target.checked);
                this.updateUnsavedIndicator();
            });
        }
    }

    /**
     * Apply theme
     */
    applyTheme(theme) {
        const root = document.documentElement;

        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            if (prefersDark) {
                root.classList.add('dark');
                document.body.classList.add('dark');
            } else {
                root.classList.remove('dark');
                document.body.classList.remove('dark');
            }
        } else {
            root.setAttribute('data-theme', theme);
            if (theme === 'dark') {
                root.classList.add('dark');
                document.body.classList.add('dark');
            } else {
                root.classList.remove('dark');
                document.body.classList.remove('dark');
            }
        }

        if (typeof window.theme !== 'undefined') {
            window.theme = theme;
        }
    }

    /**
     * Apply color palette
     */
    applyColorPalette(palette) {
        const root = document.documentElement;
        root.setAttribute('data-palette', palette);
        localStorage.setItem('colorPalette', palette);
    }

    /**
     * Apply font family
     */
    applyFontFamily(family) {
        const fontMap = {
            system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            inter: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            roboto: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            'open-sans': '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            'comic-neue': '"Comic Neue", cursive, -apple-system, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            caveat: '"Caveat", cursive, -apple-system, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            'patrick-hand': '"Patrick Hand", cursive, -apple-system, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            'dancing-script': '"Dancing Script", cursive, -apple-system, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
        };

        const fontValue = fontMap[family] || fontMap.system;
        document.documentElement.style.setProperty('--base-font-family', fontValue);
        document.body.style.fontFamily = fontValue;
    }

    /**
     * Apply font size
     */
    applyFontSize(size) {
        document.documentElement.style.setProperty('--base-font-size', `${size}px`);
        document.body.style.fontSize = `${size}px`;
    }

    /**
     * Preview font size in modal
     */
    previewFontSize(size) {
        const preview = document.getElementById('font-size-preview');
        const value = document.getElementById('font-size-value');

        if (preview) preview.style.fontSize = `${size}px`;
        if (value) value.textContent = `${size}px`;
    }

    /**
     * Apply display density
     */
    applyDisplayDensity(density) {
        const root = document.documentElement;
        root.setAttribute('data-density', density);

        const densityMap = {
            compact: { spacing: '0.5rem', padding: '0.5rem', gap: '0.5rem' },
            comfortable: { spacing: '1rem', padding: '1rem', gap: '1rem' },
            spacious: { spacing: '1.5rem', padding: '1.5rem', gap: '1.5rem' }
        };

        const values = densityMap[density] || densityMap.comfortable;
        root.style.setProperty('--density-spacing', values.spacing);
        root.style.setProperty('--density-padding', values.padding);
        root.style.setProperty('--density-gap', values.gap);
    }

    /**
     * Apply accent color
     */
    applyAccentColor(color) {
        const root = document.documentElement;
        root.setAttribute('data-accent', color);

        const colorMap = {
            indigo: { main: '#6366f1', rgb: '99, 102, 241' },
            blue: { main: '#3b82f6', rgb: '59, 130, 246' },
            green: { main: '#10b981', rgb: '16, 185, 129' },
            amber: { main: '#f59e0b', rgb: '245, 158, 11' },
            red: { main: '#ef4444', rgb: '239, 68, 68' },
            purple: { main: '#a855f7', rgb: '168, 85, 247' },
            pink: { main: '#ec4899', rgb: '236, 72, 153' },
            teal: { main: '#14b8a6', rgb: '20, 184, 166' }
        };

        const colorValue = colorMap[color] || colorMap.indigo;
        root.style.setProperty('--accent-color', colorValue.main);
        root.style.setProperty('--accent-color-rgb', colorValue.rgb);
    }

    /**
     * Apply animations setting
     */
    applyAnimations(enabled) {
        const root = document.documentElement;
        if (enabled) {
            root.removeAttribute('data-no-animations');
        } else {
            root.setAttribute('data-no-animations', 'true');
        }
    }

    /**
     * Apply reduce motion setting
     */
    applyReduceMotion(enabled) {
        const root = document.documentElement;
        if (enabled) {
            root.setAttribute('data-reduce-motion', 'true');
        } else {
            root.removeAttribute('data-reduce-motion');
        }
    }

    /**
     * Apply sidebar position
     */
    applySidebarPosition(position) {
        const root = document.documentElement;
        root.setAttribute('data-sidebar-position', position);
    }

    /**
     * Open the modal
     */
    open() {
        console.log('[Appearance] openAppearanceModal called');

        // Load modal if not already loaded
        if (!this.modal) {
            this.loadModalAndShow('appearance-modal.html', 'appearance-modal', () => {
                this.initialize();
            });
            return;
        }

        // Reset preview settings to current saved settings
        this.previewSettings = { ...this.settings };
        this.modal.classList.remove('hidden');
        this.isMiniMode = false;
        this.modal.classList.remove('mini-mode');

        // Set button text to "Mini-mode" when opening in max mode
        const miniModeBtn = this.modal.querySelector('.minimize-btn');
        if (miniModeBtn) {
            miniModeBtn.textContent = 'Mini-mode';
        }

        this.updateUI();
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.isMiniMode = false;
            this.modal.classList.remove('mini-mode');
            document.body.style.overflow = '';

            // Revert to saved settings if user didn't save
            this.applySettings();
            this.updateUnsavedIndicator();
        }
    }

    /**
     * Toggle mini mode
     */
    toggleMiniMode() {
        if (!this.modal) {
            console.warn('[Appearance] Modal not found for mini-mode toggle');
            return;
        }

        this.isMiniMode = !this.isMiniMode;

        // Update button text
        const miniModeBtn = this.modal.querySelector('.minimize-btn');
        if (miniModeBtn) {
            miniModeBtn.textContent = this.isMiniMode ? 'Max-mode' : 'Mini-mode';
        }

        if (this.isMiniMode) {
            // Enter mini mode
            this.modal.classList.add('mini-mode');
            document.body.style.overflow = '';

            // Make header clickable to restore
            const header = this.modal.querySelector('.modal-header');
            if (header && !header.hasAttribute('data-mini-listener')) {
                header.setAttribute('data-mini-listener', 'true');
                header.addEventListener('click', (e) => {
                    // Don't trigger if clicking buttons
                    if (!e.target.closest('button')) {
                        this.toggleMiniMode();
                    }
                });
            }

            // Initialize scroll position
            this.currentScrollIndex = 0;

            // Update scroll arrows after a brief delay to ensure DOM is ready
            setTimeout(() => {
                this.updateScrollArrows();

                // Add scroll listener to modal content
                const modalContent = this.modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.addEventListener('scroll', () => {
                        this.updateScrollArrows();
                    });
                }
            }, 100);

            console.log('[Appearance] Entered mini-mode');
        } else {
            // Exit mini mode
            this.modal.classList.remove('mini-mode');
            document.body.style.overflow = 'hidden';
            console.log('[Appearance] Exited mini-mode');
        }
    }

    /**
     * Scroll mini-mode section (for navigating themes/palettes)
     */
    scrollMiniModeSection(direction) {
        console.log('[Appearance] Scroll button clicked:', direction, 'Mini-mode:', this.isMiniMode);

        if (!this.isMiniMode) {
            console.warn('[Appearance] Not in mini-mode, ignoring scroll');
            return;
        }

        const modalContent = this.modal.querySelector('.modal-content');
        if (!modalContent) {
            console.error('[Appearance] Modal content not found for scrolling');
            return;
        }

        // Log current scroll position
        console.log('[Appearance] Current scrollTop:', modalContent.scrollTop);
        console.log('[Appearance] ScrollHeight:', modalContent.scrollHeight);
        console.log('[Appearance] ClientHeight:', modalContent.clientHeight);

        // Scroll by a section height (approximately)
        const scrollAmount = 150;

        if (direction === 'up') {
            console.log('[Appearance] Scrolling up by', scrollAmount);
            // Try multiple methods to ensure scrolling works
            modalContent.scrollTop = Math.max(0, modalContent.scrollTop - scrollAmount);

            // Fallback with scrollBy
            modalContent.scrollBy({
                top: -scrollAmount,
                behavior: 'smooth'
            });
        } else if (direction === 'down') {
            console.log('[Appearance] Scrolling down by', scrollAmount);
            // Try multiple methods to ensure scrolling works
            const maxScroll = modalContent.scrollHeight - modalContent.clientHeight;
            modalContent.scrollTop = Math.min(maxScroll, modalContent.scrollTop + scrollAmount);

            // Fallback with scrollBy
            modalContent.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            });
        }

        // Log new scroll position
        setTimeout(() => {
            console.log('[Appearance] New scrollTop:', modalContent.scrollTop);
            this.updateScrollArrows();
        }, 100);
    }

    /**
     * Update scroll arrow states (enable/disable based on scroll position)
     */
    updateScrollArrows() {
        if (!this.isMiniMode || !this.modal) return;

        const modalContent = this.modal.querySelector('.modal-content');
        const upArrow = document.getElementById('mini-scroll-up');
        const downArrow = document.getElementById('mini-scroll-down');

        if (!modalContent || !upArrow || !downArrow) return;

        const scrollTop = modalContent.scrollTop;
        const scrollHeight = modalContent.scrollHeight;
        const clientHeight = modalContent.clientHeight;

        // Disable up arrow if at top
        if (scrollTop <= 0) {
            upArrow.classList.add('disabled');
        } else {
            upArrow.classList.remove('disabled');
        }

        // Disable down arrow if at bottom
        if (scrollTop + clientHeight >= scrollHeight - 5) {
            downArrow.classList.add('disabled');
        } else {
            downArrow.classList.remove('disabled');
        }
    }

    /**
     * Save changes
     */
    async save() {
        console.log('[Appearance] Saving settings');

        // Get current values from UI
        const fontSlider = document.getElementById('font-size-slider');
        if (fontSlider) {
            this.previewSettings.fontSize = parseInt(fontSlider.value);
        }

        const enableAnimations = document.getElementById('enable-animations');
        const reduceMotion = document.getElementById('reduce-motion');
        if (enableAnimations) {
            this.previewSettings.enableAnimations = enableAnimations.checked;
        }
        if (reduceMotion) {
            this.previewSettings.reduceMotion = reduceMotion.checked;
        }

        // Update settings with preview settings
        this.settings = { ...this.previewSettings };

        // Save to localStorage
        this.saveSettings();

        // Save to database (if user is logged in)
        await this.saveToDatabase();

        // Apply settings
        this.applySettings();

        // Remove unsaved indicator
        this.updateUnsavedIndicator();

        // Show success message
        this.showSuccessMessage();

        // Reset mini-mode and close modal
        this.isMiniMode = false;
        if (this.modal) {
            this.modal.classList.remove('mini-mode');
            this.modal.classList.add('hidden');
        }
        document.body.style.overflow = '';
    }

    /**
     * Save appearance settings to database
     */
    async saveToDatabase() {
        if (!window.user || !window.token) {
            console.log('[Appearance] User not logged in, skipping database save');
            return;
        }

        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/appearance-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.token}`
                },
                body: JSON.stringify({
                    theme: this.settings.theme,
                    color_palette: this.settings.colorPalette,
                    font_family: this.settings.fontFamily,
                    font_size: this.settings.fontSize,
                    display_density: this.settings.displayDensity,
                    accent_color: this.settings.accentColor,
                    enable_animations: this.settings.enableAnimations,
                    reduce_motion: this.settings.reduceMotion,
                    sidebar_position: this.settings.sidebarPosition
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save appearance settings to database');
            }

            console.log('[Appearance] Settings saved to database');
        } catch (error) {
            console.error('[Appearance] Error saving to database:', error);
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage() {
        // Use existing notification system if available
        if (typeof window.showToast === 'function') {
            window.showToast('Appearance settings saved', 'success');
            return;
        }

        // Fallback: create toast
        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10001; background: #10b981; color: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); animation: slideInRight 0.3s ease-out;">
                <svg style="width: 20px; height: 20px; display: inline-block; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Appearance settings saved!</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Reset to default settings
     */
    resetDefaults() {
        if (!confirm('Are you sure you want to reset all appearance settings to defaults?')) {
            return;
        }

        this.settings = { ...this.defaultSettings };
        this.previewSettings = { ...this.defaultSettings };
        this.saveSettings();
        this.applySettings();
        this.updateUI();
        this.updateUnsavedIndicator();

        // Show notification
        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10001; background: #6366f1; color: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <span>Settings reset to defaults!</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2000);
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        return JSON.stringify(this.settings) !== JSON.stringify(this.previewSettings);
    }

    /**
     * Update unsaved changes indicator
     */
    updateUnsavedIndicator() {
        if (!this.modal) return;

        if (this.hasUnsavedChanges()) {
            this.modal.classList.add('has-unsaved-changes');
        } else {
            this.modal.classList.remove('has-unsaved-changes');
        }
    }

    /**
     * Set theme preference - PREVIEW MODE
     */
    setTheme(theme) {
        this.previewSettings.theme = theme;
        this.applyTheme(theme);
        this.updateUI();
        this.updateUnsavedIndicator();
    }

    /**
     * Set display density - PREVIEW MODE
     */
    setDisplayDensity(density) {
        this.previewSettings.displayDensity = density;
        this.applyDisplayDensity(density);
        this.updateUI();
        this.updateUnsavedIndicator();
    }

    /**
     * Set accent color - PREVIEW MODE
     */
    setAccentColor(color) {
        this.previewSettings.accentColor = color;
        this.applyAccentColor(color);
        this.updateUI();
        this.updateUnsavedIndicator();
    }

    /**
     * Set sidebar position - PREVIEW MODE
     */
    setSidebarPosition(position) {
        this.previewSettings.sidebarPosition = position;
        this.applySidebarPosition(position);
        this.updateUI();
        this.updateUnsavedIndicator();
    }

    /**
     * Set color palette - PREVIEW MODE
     */
    setColorPalette(palette) {
        this.previewSettings.colorPalette = palette;
        this.applyColorPalette(palette);
        this.updateUI();
        this.updateUnsavedIndicator();
    }

    /**
     * Set font family - PREVIEW MODE
     */
    setFontFamily(family) {
        this.previewSettings.fontFamily = family;
        this.applyFontFamily(family);
        this.updateUI();
        this.updateUnsavedIndicator();
    }

    /**
     * Load modal HTML and show it
     */
    loadModalAndShow(modalFile, modalId, callback) {
        console.log(`[Appearance] Loading modal: ${modalFile}`);

        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            this.modal = existingModal;
            existingModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (callback) callback();
            return;
        }

        // Try ModalLoader first
        if (typeof ModalLoader !== 'undefined' && ModalLoader.load) {
            ModalLoader.load(modalFile).then(() => {
                this.modal = document.getElementById(modalId);
                if (this.modal) {
                    this.modal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                    if (callback) callback();
                }
            }).catch(err => {
                console.error('[Appearance] ModalLoader failed:', err);
                this.loadModalDirectly(modalFile, modalId, callback);
            });
        } else if (typeof window.modalLoader !== 'undefined' && window.modalLoader.loadModal) {
            window.modalLoader.loadModal(modalFile).then(() => {
                this.modal = document.getElementById(modalId);
                if (this.modal) {
                    this.modal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                    if (callback) callback();
                }
            }).catch(err => {
                console.error('[Appearance] window.modalLoader failed:', err);
                this.loadModalDirectly(modalFile, modalId, callback);
            });
        } else {
            this.loadModalDirectly(modalFile, modalId, callback);
        }
    }

    /**
     * Load modal directly via fetch
     */
    loadModalDirectly(modalFile, modalId, callback) {
        const currentPath = window.location.pathname;
        let basePath = 'modals/common-modals/';

        if (currentPath.includes('/profile-pages/') ||
            currentPath.includes('/view-profiles/') ||
            currentPath.includes('/branch/') ||
            currentPath.includes('/admin-pages/')) {
            basePath = '../modals/common-modals/';
        }

        const paths = [
            `${basePath}${modalFile}`,
            `modals/common-modals/${modalFile}`,
            `../modals/common-modals/${modalFile}`,
            `../../modals/common-modals/${modalFile}`
        ];

        this.tryLoadFromPaths(paths, 0, modalId, callback);
    }

    /**
     * Try loading modal from multiple paths
     */
    tryLoadFromPaths(paths, index, modalId, callback) {
        if (index >= paths.length) {
            console.error('[Appearance] Could not load modal from any path');
            return;
        }

        fetch(paths[index])
            .then(response => {
                if (!response.ok) throw new Error('Not found');
                return response.text();
            })
            .then(html => {
                const container = document.createElement('div');
                container.innerHTML = html;

                while (container.firstChild) {
                    document.body.appendChild(container.firstChild);
                }

                this.modal = document.getElementById(modalId);
                if (this.modal) {
                    this.modal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                    if (callback) callback();
                }
            })
            .catch(() => {
                this.tryLoadFromPaths(paths, index + 1, modalId, callback);
            });
    }
}

// ==========================================
// CREATE GLOBAL INSTANCE
// ==========================================

const appearanceModalManager = new AppearanceModalManager();

// ==========================================
// GLOBAL FUNCTION EXPORTS (for HTML onclick handlers)
// ==========================================

function openAppearanceModal() {
    appearanceModalManager.open();
}

function closeAppearanceModal() {
    appearanceModalManager.close();
}

function saveAppearanceSettings() {
    appearanceModalManager.save();
}

function resetAppearanceDefaults() {
    appearanceModalManager.resetDefaults();
}

function setThemePreference(theme) {
    appearanceModalManager.setTheme(theme);
}

function setDisplayDensity(density) {
    appearanceModalManager.setDisplayDensity(density);
}

function setAccentColor(color) {
    appearanceModalManager.setAccentColor(color);
}

function setSidebarPosition(position) {
    appearanceModalManager.setSidebarPosition(position);
}

function previewFontSize(size) {
    appearanceModalManager.previewFontSize(size);
}

function setColorPalette(palette) {
    appearanceModalManager.setColorPalette(palette);
}

function setFontFamily(family) {
    appearanceModalManager.setFontFamily(family);
}

function toggleAppearanceMiniMode() {
    appearanceModalManager.toggleMiniMode();
}

function scrollMiniModeSection(direction) {
    appearanceModalManager.scrollMiniModeSection(direction);
}

// Make functions globally available for HTML onclick handlers
window.openAppearanceModal = openAppearanceModal;
window.closeAppearanceModal = closeAppearanceModal;
window.setThemePreference = setThemePreference;
window.previewFontSize = previewFontSize;
window.setDisplayDensity = setDisplayDensity;
window.setAccentColor = setAccentColor;
window.setSidebarPosition = setSidebarPosition;
window.resetAppearanceDefaults = resetAppearanceDefaults;
window.saveAppearanceSettings = saveAppearanceSettings;
window.setColorPalette = setColorPalette;
window.setFontFamily = setFontFamily;
window.toggleAppearanceMiniMode = toggleAppearanceMiniMode;
window.scrollMiniModeSection = scrollMiniModeSection;
window.appearanceModalManager = appearanceModalManager;

// ==========================================
// TAB SWITCHING
// ==========================================

/**
 * Switch between appearance tabs (Theme and Font)
 * @param {string} tabName - Name of the tab to switch to ('theme' or 'font')
 */
function switchAppearanceTab(tabName) {
    console.log(`[Appearance] Switching to tab: ${tabName}`);

    // Update tab buttons
    const tabs = document.querySelectorAll('.appearance-tab');
    tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
    });

    // Update tab panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
        const isActive = panel.dataset.panel === tabName;
        panel.classList.toggle('active', isActive);
    });
}

// Make function globally available
window.switchAppearanceTab = switchAppearanceTab;

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize appearance settings on page load
 */
function initializeAppearanceSettings() {
    console.log('[Appearance] Initializing on page load');

    // Load and apply saved settings immediately (without modal)
    const saved = JSON.parse(localStorage.getItem('appearance_settings') || '{}');
    const settings = { ...appearanceModalManager.defaultSettings, ...saved };

    appearanceModalManager.settings = settings;
    appearanceModalManager.applySettings();

    console.log('[Appearance] Initialized with settings:', settings);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initializeAppearanceSettings();
});

// CRITICAL FIX: Reapply ALL settings after page load to override theme-toggle.js
// This ensures appearance-manager has final say over ALL appearance settings
window.addEventListener('load', () => {
    // Small delay to ensure all DOMContentLoaded handlers have run
    setTimeout(() => {
        if (appearanceModalManager && appearanceModalManager.settings) {
            console.log('[Appearance] Reapplying ALL settings after page load:', appearanceModalManager.settings);
            // Reapply ALL settings, not just theme
            appearanceModalManager.applySettings();
        }
    }, 100);
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (appearanceModalManager.settings.theme === 'system') {
        console.log('[Appearance] System theme changed, reapplying');
        appearanceModalManager.applyTheme('system');
    }
});
