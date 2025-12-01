// ============================================
// SIMPLIFIED UI MANAGEMENT (MODULAR APPROACH)
// ============================================

const FindTutorsUI = {
    elements: {
        searchBar: null,
        tutorGrid: null,
        loadingSpinner: null
    },

    init() {
        this.cacheElements();
        this.setupEventListeners();

        // Initialize modular components
        SidebarManager.init();
        StatsCounter.init();
    },

    cacheElements() {
        this.elements.searchBar = document.getElementById('searchBar');
        this.elements.tutorGrid = document.getElementById('tutorCards');
        this.elements.loadingSpinner = document.getElementById('loadingSpinner');
    },

    setupEventListeners() {
        // Search functionality
        if (this.elements.searchBar) {
            this.elements.searchBar.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));

            // Track search history when Enter is pressed
            this.elements.searchBar.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    const searchTerm = event.target.value.trim();
                    if (searchTerm && FindTutorsState.filteredTutors && FindTutorsState.filteredTutors.length > 0) {
                        const tutorIds = FindTutorsState.filteredTutors.map(tutor => tutor.id);
                        PreferencesManager.addSearchToHistory(searchTerm, tutorIds);
                    }
                }
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', this.handleClearFilters.bind(this));
        }

        // Individual filter inputs with debouncing
        const gradeLevelInput = document.getElementById('gradeLevelInput');
        if (gradeLevelInput) {
            gradeLevelInput.addEventListener('input', this.debounce(this.handleFilterChange.bind(this, 'gradeLevel'), 300));
        }

        // Course type dropdown
        const courseTypeSelect = document.getElementById('courseTypeSelect');
        if (courseTypeSelect) {
            courseTypeSelect.addEventListener('change', this.handleFilterChange.bind(this, 'courseType'));
        }

        // Session format dropdown (renamed from learning method)
        const sessionFormatSelect = document.querySelector('select[name="sessionFormat"]');
        if (sessionFormatSelect) {
            sessionFormatSelect.addEventListener('change', this.handleFilterChange.bind(this, 'sessionFormat'));
        }

        // Grade level dropdown
        const gradeLevelSelect = document.getElementById('gradeLevelSelect');
        if (gradeLevelSelect) {
            gradeLevelSelect.addEventListener('change', this.handleFilterChange.bind(this, 'gradeLevel'));
        }

        // Price range inputs
        const minPriceInput = document.querySelector('input[name="minPrice"]');
        if (minPriceInput) {
            minPriceInput.addEventListener('input', this.debounce(this.handleFilterChange.bind(this, 'minPrice'), 300));
        }

        const maxPriceInput = document.querySelector('input[name="maxPrice"]');
        if (maxPriceInput) {
            maxPriceInput.addEventListener('input', this.debounce(this.handleFilterChange.bind(this, 'maxPrice'), 300));
        }

        // Rating range inputs
        const minRatingInput = document.querySelector('input[name="minRating"]');
        if (minRatingInput) {
            minRatingInput.addEventListener('input', this.debounce(this.handleFilterChange.bind(this, 'minRating'), 300));
        }

        const maxRatingInput = document.querySelector('input[name="maxRating"]');
        if (maxRatingInput) {
            maxRatingInput.addEventListener('input', this.debounce(this.handleFilterChange.bind(this, 'maxRating'), 300));
        }

        // Gender checkboxes
        const genderCheckboxes = document.querySelectorAll('input[name="gender"]');
        genderCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleGenderFilter.bind(this));
        });

        // Other checkboxes
        const otherCheckboxes = document.querySelectorAll('input[name="trainingCenter"], input[name="nearMe"], input[name="favorite"], input[name="saved"], input[name="searchHistory"]');
        otherCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleCheckboxFilter.bind(this));
        });

        // Sort by dropdown
        const sortBySelect = document.getElementById('sortBySelect');
        if (sortBySelect) {
            sortBySelect.addEventListener('change', this.handleFilterChange.bind(this, 'sortBy'));
        }
    },

    handleSearch(event) {
        const query = event.target.value.trim();
        console.log('Search query:', query);

        FindTutorsState.updateFilter('search', query);
        FindTutorsController.loadTutors();
    },

    handleClearFilters() {
        console.log('Clearing all filters');

        // Clear all form inputs
        const inputs = document.querySelectorAll('#sidebar input, #sidebar select');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });

        // Reset state
        FindTutorsState.reset();
        FindTutorsController.loadTutors();
    },

    handleFilterChange(filterKey, event) {
        const value = event.target.value.trim();
        console.log(`${filterKey} filter:`, value);

        FindTutorsState.updateFilter(filterKey, value);
        FindTutorsController.loadTutors();
    },

    handleGenderFilter() {
        const selectedGenders = Array.from(document.querySelectorAll('input[name="gender"]:checked'))
            .map(checkbox => checkbox.value);

        console.log('Gender filter:', selectedGenders);
        FindTutorsState.updateFilter('gender', selectedGenders.join(','));
        FindTutorsController.loadTutors();
    },

    handleCheckboxFilter(event) {
        const name = event.target.name;
        const isChecked = event.target.checked;

        console.log(`${name} filter:`, isChecked);
        // For preference filters, pass boolean value
        if (name === 'favorite' || name === 'saved' || name === 'searchHistory') {
            FindTutorsState.updateFilter(name, isChecked);
        } else {
            // For other checkboxes, pass the value if checked
            FindTutorsState.updateFilter(name, isChecked ? event.target.value : '');
        }
        FindTutorsController.loadTutors();
    },

    showLoading() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.classList.remove('hidden');
        }
        if (this.elements.tutorGrid) {
            this.elements.tutorGrid.style.opacity = '0.6';
            this.elements.tutorGrid.style.pointerEvents = 'none';
        }
    },

    hideLoading() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.classList.add('hidden');
        }
        if (this.elements.tutorGrid) {
            this.elements.tutorGrid.style.opacity = '1';
            this.elements.tutorGrid.style.pointerEvents = 'auto';
        }
    },

    renderTutors(tutors) {
        if (!this.elements.tutorGrid) return;

        if (tutors.length === 0) {
            this.elements.tutorGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 mb-6">
                        <svg class="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tutors found</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-6">We couldn't find any tutors matching your criteria</p>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button onclick="requestCourse()" class="request-btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                            <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            Request Course
                        </button>
                        <button onclick="requestSchool()" class="request-btn bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                            <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            Request School
                        </button>
                    </div>

                    <div class="mt-6 text-sm text-gray-400">
                        <p>Can't find what you're looking for?</p>
                        <p class="mt-1">Our team will help you find the perfect match!</p>
                    </div>
                </div>
            `;
            return;
        }

        const tutorCards = tutors.map((tutor, index) => TutorCardCreator.createTutorCard(tutor, index)).join('');
        this.elements.tutorGrid.innerHTML = tutorCards;
    },

    renderPagination() {
        PaginationManager.renderPagination(FindTutorsState.currentPage, FindTutorsState.totalPages, FindTutorsState.totalTutors);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};