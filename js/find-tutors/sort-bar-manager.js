/**
 * Sort Bar Manager
 * Handles all sort bar interactions including quick sort buttons, view toggle, and dropdown
 */

class SortBarManager {
    constructor() {
        this.currentSort = 'smart';
        this.currentView = 'grid';
        this.init();
    }

    init() {
        console.log('[Sort Bar] Initializing...');
        this.setupQuickSortButtons();
        this.setupViewToggle();
        this.setupSortDropdown();
        this.setupActiveFiltersDisplay();
        console.log('[Sort Bar] Initialized successfully');
    }

    /**
     * Setup quick sort button handlers
     */
    setupQuickSortButtons() {
        const sortButtons = document.querySelectorAll('.sort-btn[data-sort]');

        sortButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const sortValue = button.getAttribute('data-sort');
                console.log('[Sort Bar] Quick sort clicked:', sortValue);

                // Update UI
                sortButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update dropdown to match
                const dropdown = document.getElementById('sortBySelect');
                if (dropdown) {
                    dropdown.value = sortValue;
                }

                // Apply sort
                this.applySort(sortValue);
            });
        });
    }

    /**
     * Setup view toggle (grid/list)
     */
    setupViewToggle() {
        const viewButtons = document.querySelectorAll('.view-toggle-btn[data-view]');
        const tutorCardsContainer = document.getElementById('tutorCards');

        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const viewValue = button.getAttribute('data-view');
                console.log('[Sort Bar] View toggle clicked:', viewValue);

                // Update UI
                viewButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Apply view
                this.applyView(viewValue);

                // Save preference
                localStorage.setItem('tutor_view_preference', viewValue);
                console.log('[Sort Bar] Saved view preference:', viewValue);
            });
        });

        // Load and apply saved preference on initialization
        const savedView = localStorage.getItem('tutor_view_preference');
        if (savedView) {
            console.log('[Sort Bar] Loading saved view preference:', savedView);

            // Update button state
            viewButtons.forEach(btn => btn.classList.remove('active'));
            const savedButton = document.querySelector(`.view-toggle-btn[data-view="${savedView}"]`);
            if (savedButton) {
                savedButton.classList.add('active');
            }

            // Apply the view
            this.applyView(savedView);
        } else {
            // Default to grid view
            console.log('[Sort Bar] No saved preference, defaulting to grid view');
            this.applyView('grid');
        }
    }

    /**
     * Apply view style to tutor cards container
     */
    applyView(viewValue) {
        const tutorCardsContainer = document.getElementById('tutorCards');

        if (!tutorCardsContainer) {
            console.warn('[Sort Bar] Tutor cards container not found');
            return;
        }

        this.currentView = viewValue;

        if (viewValue === 'list') {
            tutorCardsContainer.classList.remove('tutor-cards-grid');
            tutorCardsContainer.classList.add('tutor-cards-list');
            console.log('[Sort Bar] Applied list view');
        } else {
            tutorCardsContainer.classList.remove('tutor-cards-list');
            tutorCardsContainer.classList.add('tutor-cards-grid');
            console.log('[Sort Bar] Applied grid view');
        }

        // Store in instance for access by other components
        this.currentView = viewValue;
    }

    /**
     * Setup sort dropdown handler
     */
    setupSortDropdown() {
        const dropdown = document.getElementById('sortBySelect');

        if (dropdown) {
            dropdown.addEventListener('change', (e) => {
                const sortValue = e.target.value;
                console.log('[Sort Bar] Dropdown sort changed:', sortValue);

                // Update quick sort buttons to match
                const sortButtons = document.querySelectorAll('.sort-btn[data-sort]');
                sortButtons.forEach(btn => btn.classList.remove('active'));

                const matchingButton = document.querySelector(`.sort-btn[data-sort="${sortValue}"]`);
                if (matchingButton) {
                    matchingButton.classList.add('active');
                }

                // Apply sort
                this.applySort(sortValue);
            });
        }
    }

    /**
     * Apply sort and trigger tutor reload
     */
    applySort(sortValue) {
        this.currentSort = sortValue;

        // Update state
        if (window.FindTutorsState) {
            FindTutorsState.updateFilter('sortBy', sortValue);
        }

        // Trigger reload
        if (window.FindTutorsController) {
            FindTutorsController.loadTutors();
        }
    }

    /**
     * Setup active filters display
     */
    setupActiveFiltersDisplay() {
        // This will be called when filters change to update the chips display
        console.log('[Sort Bar] Active filters display ready');
    }

    /**
     * Update active filters chips display
     */
    updateActiveFilters(filters) {
        const container = document.getElementById('activeFiltersDisplay');
        if (!container) return;

        container.innerHTML = '';

        const filterLabels = {
            search: 'Search',
            subject: 'Subject',
            gender: 'Gender',
            minGradeLevel: 'Min Grade',
            maxGradeLevel: 'Max Grade',
            sessionFormat: 'Format',
            minPrice: 'Min Price',
            maxPrice: 'Max Price',
            minRating: 'Min Rating',
            maxRating: 'Max Rating'
        };

        Object.keys(filters).forEach(key => {
            const value = filters[key];

            // Skip empty, default, or system values
            if (!value || value === '' || key === 'sortBy' || key === 'tiered' ||
                key === 'favorite' || key === 'saved' || key === 'searchHistory' ||
                key === 'nearMe') {
                return;
            }

            const label = filterLabels[key] || key;
            const chip = this.createFilterChip(label, value, key);
            container.appendChild(chip);
        });
    }

    /**
     * Create a filter chip element
     */
    createFilterChip(label, value, key) {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';

        // Format value for display
        let displayValue = value;
        if (key === 'minGradeLevel' || key === 'maxGradeLevel') {
            const gradeMap = {
                '0': 'Nursery',
                '0.5': 'KG',
                '13': 'University'
            };
            displayValue = gradeMap[value] || `Grade ${value}`;
        }

        chip.innerHTML = `
            <span>${label}: ${displayValue}</span>
            <div class="filter-chip-remove" data-filter="${key}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </div>
        `;

        // Add remove handler
        const removeBtn = chip.querySelector('.filter-chip-remove');
        removeBtn.addEventListener('click', () => {
            console.log('[Sort Bar] Removing filter:', key);

            // Clear filter
            if (window.FindTutorsState) {
                FindTutorsState.updateFilter(key, '');
            }

            // Clear UI element
            const filterInput = document.querySelector(`[name="${key}"]`) || document.getElementById(key);
            if (filterInput) {
                filterInput.value = '';
            }

            // Reload
            if (window.FindTutorsController) {
                FindTutorsController.loadTutors();
            }
        });

        return chip;
    }

    /**
     * Update results count display
     */
    updateResultsCount(count, total) {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            if (count === total) {
                resultsCount.textContent = `Showing ${count} tutors`;
            } else {
                resultsCount.textContent = `Showing ${count} of ${total} tutors`;
            }
        }
    }

    /**
     * Reapply current view (call this after tutors are loaded)
     */
    reapplyCurrentView() {
        console.log('[Sort Bar] Reapplying current view:', this.currentView);
        this.applyView(this.currentView);
    }

    /**
     * Get current view preference
     */
    getCurrentView() {
        return this.currentView;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sortBarManager = new SortBarManager();
    });
} else {
    window.sortBarManager = new SortBarManager();
}
