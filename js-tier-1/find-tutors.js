document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const API_BASE_URL = 'http://localhost:8000/api';
    let tutorsData = [];
    let filteredTutors = [];

    // Add pagination variables
    let currentPage = 1;
    let totalPages = 1;
    let totalTutors = 0;

    // Initialize sidebar state - CLOSED by default
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const hamburger = document.getElementById('hamburger');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    // Initialize sidebar as CLOSED
    const initializeSidebar = () => {
        sidebar.classList.remove('open');
        mainContent.classList.remove('shifted');
    };

    initializeSidebar();

    // ============================================
// PREFERENCES MANAGEMENT
// ============================================

const PreferencesManager = {
    // Get saved preferences from localStorage
    getFavorites() {
        return JSON.parse(localStorage.getItem('favoriteTutors') || '[]');
    },
    
    getSaved() {
        return JSON.parse(localStorage.getItem('savedTutors') || '[]');
    },
    
    getSearchHistory() {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    },
    
    // Add/remove favorites
    toggleFavorite(tutorId) {
        let favorites = this.getFavorites();
        const index = favorites.indexOf(tutorId);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(tutorId);
        }
        localStorage.setItem('favoriteTutors', JSON.stringify(favorites));
        return favorites.includes(tutorId);
    },
    
    // Add/remove saved
    toggleSaved(tutorId) {
        let saved = this.getSaved();
        const index = saved.indexOf(tutorId);
        if (index > -1) {
            saved.splice(index, 1);
        } else {
            saved.push(tutorId);
        }
        localStorage.setItem('savedTutors', JSON.stringify(saved));
        return saved.includes(tutorId);
    },
    
    // Add to search history
    addToSearchHistory(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') return;
        
        let history = this.getSearchHistory();
        // Remove if exists (to move to front)
        history = history.filter(item => item !== searchTerm);
        // Add to beginning
        history.unshift(searchTerm);
        // Keep only last 10 searches
        history = history.slice(0, 10);
        
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }
};

    // Hamburger menu toggle
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (window.innerWidth >= 1024) {
            mainContent.classList.toggle('shifted');
        }
        hamburger.classList.toggle('active');
    });

    // Mobile menu toggle
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 1024) {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                hamburger.classList.remove('active');
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebar.classList.contains('open')) {
                mainContent.classList.add('shifted');
            }
        } else {
            mainContent.classList.remove('shifted');
        }
    });

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    const html = document.documentElement;

    const setTheme = (theme) => {
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('theme', theme);
    };

    // Theme toggle event listeners
    [themeToggle, themeToggleMobile].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const newTheme = html.classList.contains('dark') ? 'light' : 'dark';
                setTheme(newTheme);
            });
        }
    });

    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // Background Image Rotation
    const backgroundImages = 15;
    let currentBgIndex = 1;

    function changeBackground() {
        mainContent.className = mainContent.className.replace(/bg-\d+/g, '');
        mainContent.classList.add(`bg-${currentBgIndex}`);
        currentBgIndex = (currentBgIndex % backgroundImages) + 1;
    }

    changeBackground();
    let bgRotationInterval = setInterval(changeBackground, 10000);

    // Typing Animation
    const typedTextElement = document.getElementById('typedText');
    const cursorElement = document.getElementById('cursor');
    const heroTexts = [
        'Find Your Perfect Tutor',
        'Learn from Expert Educators',
        'Get Professional Certifications',
        'Achieve Academic Excellence',
        'Master New Skills Today'
    ];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        if (!typedTextElement || !cursorElement) return;

        const currentText = heroTexts[textIndex];

        if (isDeleting) {
            typedTextElement.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typedTextElement.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
        }

        if (!isDeleting && charIndex === currentText.length) {
            isDeleting = true;
            typingSpeed = 50;
            setTimeout(type, 1500);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % heroTexts.length;
            typingSpeed = 100;
            setTimeout(type, 500);
        } else {
            setTimeout(type, typingSpeed);
        }
    }

    type();

    // ============================================
    // RATING TOOLTIP FUNCTIONS
    // ============================================

    window.showRatingTooltip = function (element, breakdown, overallRating) {
        // Remove any existing tooltip
        hideAllTooltips();

        const tooltip = document.createElement('div');
        tooltip.className = 'rating-tooltip show';

        // Use breakdown data or create default
        const ratingData = breakdown || {
            discipline: overallRating,
            punctuality: overallRating,
            communication_skills: overallRating,
            knowledge_level: overallRating,
            retention: overallRating
        };

        tooltip.innerHTML = `
            <div class="rating-summary">
                <div class="rating-summary-value">${overallRating}</div>
                <div class="rating-summary-stars">${'★'.repeat(Math.floor(overallRating))}${'☆'.repeat(5 - Math.floor(overallRating))}</div>
            </div>
            <div class="rating-breakdown">
                ${createRatingBar('Discipline', ratingData.discipline || overallRating)}
                ${createRatingBar('Punctuality', ratingData.punctuality || overallRating)}
                ${createRatingBar('Communication', ratingData.communication_skills || overallRating)}
                ${createRatingBar('Knowledge', ratingData.knowledge_level || overallRating)}
                ${createRatingBar('Retention', ratingData.retention || overallRating)}
            </div>
        `;

        element.parentElement.appendChild(tooltip);
    };

    window.hideRatingTooltip = function (element) {
        const tooltip = element.parentElement.querySelector('.rating-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    };

    function hideAllTooltips() {
        document.querySelectorAll('.rating-tooltip').forEach(tooltip => {
            tooltip.remove();
        });
    }

    function createRatingBar(label, value) {
        const percentage = (value / 5) * 100;
        return `
            <div class="rating-item">
                <span class="rating-label">${label}</span>
                <div class="rating-bar-container">
                    <div class="rating-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="rating-value">${value}</span>
            </div>
        `;
    }

    // ============================================
    // AD PLACEHOLDER FUNCTIONS
    // ============================================

    function createAdPlaceholder(adIndex) {
        const adVariations = [
            {
                title: "Become a Top Tutor",
                subtitle: "Join 500+ certified tutors earning 400-500 ETB per session",
                cta: "Start Teaching",
                badge: "Featured"
            },
            {
                title: "Get Certified",
                subtitle: "Learn programming, video editing, and more from experts",
                cta: "Browse Courses",
                badge: "Popular"
            },
            {
                title: "Special Offer",
                subtitle: "Get 30% off on all certification courses this month",
                cta: "Claim Offer",
                badge: "Limited Time"
            },
            {
                title: "Find Your Perfect Tutor",
                subtitle: "From Grade 9 to University level - We have you covered",
                cta: "Get Started",
                badge: "Recommended"
            }
        ];

        const ad = adVariations[adIndex % adVariations.length];

        const adSection = document.createElement('div');
        adSection.className = 'ad-placeholder-section';
        adSection.innerHTML = `
            <div class="ad-content">
                <span class="ad-badge">${ad.badge}</span>
                <h2 class="ad-title">${ad.title}</h2>
                <p class="ad-subtitle">${ad.subtitle}</p>
                <a href="#" class="ad-cta" onclick="handleAdClick(event, '${ad.title}')">${ad.cta}</a>
            </div>
        `;

        return adSection;
    }

    window.handleAdClick = function (event, adTitle) {
        event.preventDefault();
        showNotification(`Opening ${adTitle}...`, 'info');
        // Add your ad click handling logic here
    };

    // ============================================
    // FETCH TUTORS WITH ERROR HANDLING
    // ============================================

    async function fetchTutors(page = 1) {
        try {
            console.log('Fetching tutors from:', `${API_BASE_URL}/tutors?page=${page}&limit=15`);
            showLoadingState();

            const response = await fetch(`${API_BASE_URL}/tutors?page=${page}&limit=15`);
            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error(`Failed to fetch tutors: ${response.status}`);
            }

            const data = await response.json();
            console.log('Data received:', data);

            // Handle paginated response structure
            if (data.tutors) {
                tutorsData = data.tutors;
                currentPage = data.page;
                totalPages = data.total_pages;
                totalTutors = data.total;
            } else if (Array.isArray(data)) {
                tutorsData = data;
                currentPage = 1;
                totalPages = Math.ceil(data.length / 15);
                totalTutors = data.length;
            } else {
                tutorsData = [];
                currentPage = 1;
                totalPages = 1;
                totalTutors = 0;
            }

            filteredTutors = tutorsData;
            renderTutorCards(filteredTutors);
            renderPagination();

            if (tutorsData.length > 0) {
                const noResultsElement = document.getElementById('noResults');
                if (noResultsElement) {
                    noResultsElement.classList.add('hidden');
                }
            }

        } catch (error) {
            console.error('Error fetching tutors:', error);

            if (error.message.includes('Failed to fetch')) {
                showNotification('Cannot connect to server. Please ensure the backend is running on port 8000.', 'error');
            } else {
                showNotification('Failed to load tutors. Please try again later.', 'error');
            }

            const noResultsElement = document.getElementById('noResults');
            if (noResultsElement) {
                noResultsElement.classList.remove('hidden');
            }

        } finally {
            hideLoadingState();
        }
    }

    // Helper functions for loading states
    function showLoadingState() {
        const tutorCardsContainer = document.getElementById('tutorCards');
        if (tutorCardsContainer) {
            tutorCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p class="mt-2 text-gray-600">Loading tutors...</p>
            </div>
        `;
        }
    }

    function hideLoadingState() {
        // Loading state is replaced by actual content in renderTutorCards
    }

    // ============================================
    // ENHANCED TUTOR CARD GENERATION
    // ============================================

function generateTutorCard(tutor, index) {
    const card = document.createElement('div');
    card.className = 'tutor-card animate__animated animate__fadeInUp';
    card.style.animationDelay = `${index * 0.05}s`;

    // Ensure proper data handling
    const courseTypeLabel = tutor.course_type === 'certifications' ? 'Certification' : 'Academic';
    const gradeInfo = tutor.grades && tutor.grades.length > 0 ? tutor.grades.join(', ') : 'All Levels';
    const teachingMethod = tutor.learning_method || tutor.teaching_methods?.[0] || 'Online';
    const teachesAt = tutor.teaches_at || 'Independent';

    // Default quotes for tutors without quotes
    const defaultQuotes = [
        "Education is the key to unlocking potential.",
        "Every student can succeed with the right guidance.",
        "Learning is a journey, not a destination.",
        "I believe in making complex concepts simple.",
        "Patience and persistence lead to excellence.",
        "Together we can achieve your academic goals.",
        "Knowledge is power, let's empower you.",
        "Your success is my mission."
    ];

    const quote = tutor.quote || defaultQuotes[index % defaultQuotes.length];

    // RATING SYSTEM: Default 2.0 for new tutors, minimum 1.0 for bad tutors
    const rating = tutor.rating || 2.0;
    const ratingDisplay = rating.toFixed(1);
    const starCount = Math.round(rating);

    // Clean bio if it contains school name
    let bio = tutor.bio || '';
    if (bio.includes('Currently teaching at')) {
        bio = bio.split('Currently teaching at')[0].trim();
    }

    // FIX: Ensure each rating breakdown property has a safe default
    const defaultRating = tutor.rating || 2.0;
    const ratingBreakdown = {
        discipline: tutor.rating_breakdown?.discipline ?? defaultRating,
        punctuality: tutor.rating_breakdown?.punctuality ?? defaultRating,
        communication_skills: tutor.rating_breakdown?.communication_skills ?? defaultRating,
        knowledge_level: tutor.rating_breakdown?.knowledge_level ?? defaultRating,
        retention: tutor.rating_breakdown?.retention ?? defaultRating
    };

    // Safe profile picture with fallback
    const profilePicture = tutor.profile_picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name || 'User')}&size=60&background=random`;

    // Add a "New Tutor" badge if rating is exactly 2.0
    const isNewTutor = rating === 2.0;

    // Check if this tutor is favorited or saved (MOVED OUTSIDE HTML STRING)
    const isFavorited = PreferencesManager.getFavorites().includes(tutor.id);
    const isSaved = PreferencesManager.getSaved().includes(tutor.id);

    card.innerHTML = `
        <div class="tutor-header">
            <img src="${profilePicture}" alt="${tutor.name}" class="tutor-avatar" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 60 60\'%3E%3Crect width=\'60\' height=\'60\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'20\'%3E${(tutor.name || 'U')[0]}%3C/text%3E%3C/svg%3E'">
            <div class="tutor-info">
                <div class="tutor-name-wrapper">
                    <a href="../view-profile-tier-1/view-tutor.html?id=${tutor.id}" class="tutor-name">${tutor.name || 'Unknown Tutor'}</a>
                    ${isNewTutor ? '<span class="new-tutor-badge" style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px;">NEW</span>' : ''}
                    <span class="mock-badge">Test data</span>
                </div>
                <div class="rating-stars-container">
                    <div class="rating-stars">
                        ${'★'.repeat(starCount)}${'☆'.repeat(Math.max(0, 5 - starCount))}
                        <span style="font-size: 0.875rem; color: #6b7280; margin-left: 0.25rem;">(${ratingDisplay})</span>
                    </div>
                    <div class="rating-breakdown-tooltip">
                        <div class="tooltip-arrow"></div>
                        <div class="tooltip-content">
                            <div class="rating-item">
                                <span class="rating-label">Discipline</span>
                                <div class="rating-bar">
                                    <div class="rating-fill" style="width: ${Math.min(100, (ratingBreakdown.discipline / 5) * 100)}%"></div>
                                </div>
                                <span class="rating-value">${ratingBreakdown.discipline.toFixed(1)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Punctuality</span>
                                <div class="rating-bar">
                                    <div class="rating-fill" style="width: ${Math.min(100, (ratingBreakdown.punctuality / 5) * 100)}%"></div>
                                </div>
                                <span class="rating-value">${ratingBreakdown.punctuality.toFixed(1)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Communication</span>
                                <div class="rating-bar">
                                    <div class="rating-fill" style="width: ${Math.min(100, (ratingBreakdown.communication_skills / 5) * 100)}%"></div>
                                </div>
                                <span class="rating-value">${ratingBreakdown.communication_skills.toFixed(1)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Knowledge</span>
                                <div class="rating-bar">
                                    <div class="rating-fill" style="width: ${Math.min(100, (ratingBreakdown.knowledge_level / 5) * 100)}%"></div>
                                </div>
                                <span class="rating-value">${ratingBreakdown.knowledge_level.toFixed(1)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Retention</span>
                                <div class="rating-bar">
                                    <div class="rating-fill" style="width: ${Math.min(100, (ratingBreakdown.retention / 5) * 100)}%"></div>
                                </div>
                                <span class="rating-value">${ratingBreakdown.retention.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ACTION BUTTONS -->
            <div class="tutor-actions" style="display: flex; gap: 8px; margin-left: auto;">
                <button class="favorite-btn action-btn ${isFavorited ? 'active' : ''}" 
                    data-id="${tutor.id}" 
                    title="Add to favorites" 
                    style="
                        background: transparent;
                        border: none;
                        cursor: pointer;
                        padding: 8px;
                        color: ${isFavorited ? '#F59E0B' : '#6b7280'};
                        transition: all 0.3s ease;
                    ">
                    <svg width="20" height="20" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z">
                        </path>
                    </svg>
                </button>
                <button class="save-btn action-btn ${isSaved ? 'active' : ''}" 
                    data-id="${tutor.id}" 
                    title="Save for later" 
                    style="
                        background: transparent;
                        border: none;
                        cursor: pointer;
                        padding: 8px;
                        color: ${isSaved ? '#F59E0B' : '#6b7280'};
                        transition: all 0.3s ease;
                    ">
                    <svg width="20" height="20" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z">
                        </path>
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- QUOTE SECTION -->
        <div class="tutor-quote" style="
            margin: 12px 0;
            padding: 12px;
            background: var(--quote-bg, linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.08) 100%));
            border-left: 4px solid var(--button-bg, #F59E0B);
            border-radius: 0 8px 8px 0;
            position: relative;
        ">
            <span style="
                position: absolute;
                top: -5px;
                left: 10px;
                font-size: 28px;
                color: var(--button-bg, #F59E0B);
                opacity: 0.3;
                font-family: Georgia, serif;
            ">"</span>
            <em style="
                font-size: 0.9rem;
                color: var(--text, #374151);
                display: block;
                line-height: 1.5;
                font-style: italic;
                padding-left: 10px;
                opacity: 0.9;
            ">
                ${quote}
            </em>
        </div>
        
        <div class="tutor-details">
            <div class="detail-item">
                <span class="detail-label">Type:</span> ${courseTypeLabel}
            </div>
            <div class="detail-item">
                <span class="detail-label">Gender:</span> ${tutor.gender || 'Not specified'}
            </div>
            <div class="detail-item">
                <span class="detail-label">Specialized in:</span> ${Array.isArray(tutor.courses) ? tutor.courses.join(', ') : 'Various subjects'}
            </div>
            <div class="detail-item">
                <span class="detail-label">Grades:</span> ${gradeInfo}
            </div>
            <div class="detail-item">
                <span class="detail-label">Experience:</span> ${tutor.experience || tutor.experience_years || 0} years
            </div>
            <div class="detail-item">
                <span class="detail-label">Location:</span> ${tutor.location || 'Not specified'}
            </div>
            <div class="detail-item tutor-teaches-at">
                <span class="detail-label">Teaches at:</span> <em>${teachesAt}</em>
            </div>
            <div class="detail-item">
                <span class="detail-label">Method:</span> ${teachingMethod}
            </div>
            <div class="detail-item tutor-price">
                <span class="detail-label">Price:</span> 
                <span class="price-amount">${tutor.price || 100} ETB</span>
                <span class="price-period">/session</span>
            </div>
            ${bio ? `
            <div class="detail-item" style="margin-top: 10px;">
                <span class="detail-label">Bio:</span>
                <p style="margin-top: 4px; font-size: 0.875rem; line-height: 1.4; color: #4b5563;">
                    ${bio}
                </p>
            </div>
            ` : ''}
        </div>
        <a href="../view-profile-tier-1/view-tutor.html?id=${tutor.id}" class="view-tutor-btn">View Full Profile</a>
    `;

    return card;
}

    // ============================================
    // RENDER TUTOR CARDS
    // ============================================

    function renderTutorCards(tutors) {
        const tutorCardsContainer = document.getElementById('tutorCards');
        if (!tutorCardsContainer) {
            console.error('Tutor cards container not found');
            return;
        }

        tutorCardsContainer.innerHTML = '';

        if (!tutors || tutors.length === 0) {
            document.getElementById('noResults').classList.remove('hidden');
            tutorCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-gray-500">No tutors found matching your criteria.</p>
            </div>
        `;
        } else {
            document.getElementById('noResults').classList.add('hidden');

            // Simply render tutor cards without ad placeholders
            tutors.forEach((tutor, index) => {
                const card = generateTutorCard(tutor, index);
                tutorCardsContainer.appendChild(card);
            });
        }

        attachCardEventListeners();
    }

    // Attach event listeners to card buttons
    function attachCardEventListeners() {
    // Favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const tutorId = parseInt(btn.dataset.id);
            const isFavorited = PreferencesManager.toggleFavorite(tutorId);
            
            // Update button appearance
            btn.classList.toggle('active', isFavorited);
            btn.style.color = isFavorited ? '#F59E0B' : '#6b7280';
            const svg = btn.querySelector('svg');
            svg.setAttribute('fill', isFavorited ? 'currentColor' : 'none');
            
            showNotification(
                isFavorited ? 'Added to favorites' : 'Removed from favorites',
                'success'
            );
        });
    });

    // Save buttons
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const tutorId = parseInt(btn.dataset.id);
            const isSaved = PreferencesManager.toggleSaved(tutorId);
            
            // Update button appearance
            btn.classList.toggle('active', isSaved);
            btn.style.color = isSaved ? '#F59E0B' : '#6b7280';
            const svg = btn.querySelector('svg');
            svg.setAttribute('fill', isSaved ? 'currentColor' : 'none');
            
            showNotification(
                isSaved ? 'Saved for later' : 'Removed from saved',
                'success'
            );
        });
    });
}

    // ============================================
    // PAGINATION
    // ============================================

    function renderPagination() {
        const existingPagination = document.getElementById('paginationContainer');
        if (existingPagination) {
            existingPagination.remove();
        }

        if (totalPages <= 1) return;

        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        paginationContainer.className = 'flex justify-center items-center gap-2 mt-8 pb-8';

        // Previous button - theme aware
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.style.cssText = `
        padding: 8px 16px;
        background: ${currentPage === 1 ? '#e5e7eb' : 'var(--button-bg, #F59E0B)'};
        color: ${currentPage === 1 ? '#9ca3af' : 'white'};
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.3s ease;
        opacity: ${currentPage === 1 ? '0.5' : '1'};
        cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};
    `;
        prevButton.disabled = currentPage === 1;
        if (currentPage > 1) {
            prevButton.onmouseover = () => {
                prevButton.style.transform = 'translateY(-2px)';
                prevButton.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
            };
            prevButton.onmouseout = () => {
                prevButton.style.transform = 'translateY(0)';
                prevButton.style.boxShadow = 'none';
            };
        }
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) fetchTutors(currentPage - 1);
        });
        paginationContainer.appendChild(prevButton);

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Page buttons with theme styling
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            const isActive = i === currentPage;
            pageButton.style.cssText = `
            padding: 8px 12px;
            background: ${isActive ? 'var(--button-bg, #F59E0B)' : 'transparent'};
            color: ${isActive ? 'white' : 'var(--text, #374151)'};
            border: 2px solid ${isActive ? 'var(--button-bg, #F59E0B)' : 'var(--border-color, #e5e7eb)'};
            border-radius: 8px;
            font-weight: ${isActive ? '600' : '500'};
            transition: all 0.3s ease;
            cursor: pointer;
        `;
            if (!isActive) {
                pageButton.onmouseover = () => {
                    pageButton.style.background = 'var(--button-bg, #F59E0B)';
                    pageButton.style.color = 'white';
                    pageButton.style.transform = 'translateY(-2px)';
                };
                pageButton.onmouseout = () => {
                    pageButton.style.background = 'transparent';
                    pageButton.style.color = 'var(--text, #374151)';
                    pageButton.style.transform = 'translateY(0)';
                };
            }
            pageButton.addEventListener('click', () => fetchTutors(i));
            paginationContainer.appendChild(pageButton);
        }

        // Next button - theme aware
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.style.cssText = `
        padding: 8px 16px;
        background: ${currentPage === totalPages ? '#e5e7eb' : 'var(--button-bg, #F59E0B)'};
        color: ${currentPage === totalPages ? '#9ca3af' : 'white'};
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.3s ease;
        opacity: ${currentPage === totalPages ? '0.5' : '1'};
        cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};
    `;
        nextButton.disabled = currentPage === totalPages;
        if (currentPage < totalPages) {
            nextButton.onmouseover = () => {
                nextButton.style.transform = 'translateY(-2px)';
                nextButton.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
            };
            nextButton.onmouseout = () => {
                nextButton.style.transform = 'translateY(0)';
                nextButton.style.boxShadow = 'none';
            };
        }
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) fetchTutors(currentPage + 1);
        });
        paginationContainer.appendChild(nextButton);

        // Info text
        const infoSpan = document.createElement('span');
        infoSpan.className = 'ml-4';
        infoSpan.style.color = 'var(--text, #6b7280)';
        infoSpan.textContent = `Page ${currentPage} of ${totalPages} (${totalTutors} tutors)`;
        paginationContainer.appendChild(infoSpan);

        const tutorCardsElement = document.getElementById('tutorCards');
        if (tutorCardsElement && tutorCardsElement.parentNode) {
            tutorCardsElement.parentNode.insertBefore(paginationContainer, tutorCardsElement.nextSibling);
        }
    }
    // ============================================
    // FILTERS
    // ============================================

    // Replace your current applyFilters function with this fixed version:
    async function applyFilters() {
        const searchBar = document.getElementById('searchBar');
        const courseTypeSelect = document.getElementById('courseTypeSelect');
        const gradeSelect = document.getElementById('gradeSelect');
        const learningMethodSelect = document.querySelector('select[name="learningMethod"]');
        const minRatingInput = document.querySelector('input[name="minRating"]');
        const maxRatingInput = document.querySelector('input[name="maxRating"]');
        const minPriceInput = document.querySelector('input[name="minPrice"]');
        const maxPriceInput = document.querySelector('input[name="maxPrice"]');
        const genderCheckboxes = document.querySelectorAll('input[name="gender"]:checked');

        // Build filter parameters
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '15');

        // Add filters
        if (searchBar?.value) {
            params.append('search', searchBar.value);
        }

        if (courseTypeSelect?.value) {
            params.append('course_type', courseTypeSelect.value);
        }

        if (gradeSelect?.value) {
            params.append('grade', gradeSelect.value);
        }

        if (learningMethodSelect?.value) {
            params.append('learning_method', learningMethodSelect.value);
        }

        // In applyFilters function, update the gender handling:
        if (genderCheckboxes.length > 0) {
            const genders = Array.from(genderCheckboxes).map(cb => cb.value);
            // Send as comma-separated string
            params.append('gender', genders.join(','));
        }

        if (minPriceInput?.value) {
            params.append('min_price', minPriceInput.value);
        }
        if (maxPriceInput?.value) {
            params.append('max_price', maxPriceInput.value);
        }

        if (minRatingInput?.value) {
            params.append('min_rating', minRatingInput.value);
        }
        if (maxRatingInput?.value) {
            params.append('max_rating', maxRatingInput.value);
        }

        try {
            showLoadingState();
            const url = `${API_BASE_URL}/tutors?${params.toString()}`;
            console.log('Applying filters with URL:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch filtered tutors');
            }

            const data = await response.json();
            console.log('Filtered data received:', data);

            // Update data
            if (data.tutors) {
                tutorsData = data.tutors;
                currentPage = data.page || 1;
                totalPages = data.total_pages || 1;
                totalTutors = data.total || 0;
            } else if (Array.isArray(data)) {
                tutorsData = data;
                currentPage = 1;
                totalPages = Math.ceil(data.length / 15);
                totalTutors = data.length;
            }

            filteredTutors = tutorsData;

            // Reset to page 1 when filtering
            currentPage = 1;

            renderTutorCards(filteredTutors);
            renderPagination();
            updateHeroStats(); // Update stats after filtering

            // Show result count
            if (totalTutors === 0) {
                document.getElementById('noResults').classList.remove('hidden');
                showNotification('No tutors found matching your filters', 'info');
            } else {
                document.getElementById('noResults').classList.add('hidden');
                showNotification(`Found ${totalTutors} tutor${totalTutors !== 1 ? 's' : ''}`, 'success');
            }

        } catch (error) {
            console.error('Filter error:', error);
            showNotification('Failed to apply filters', 'error');
        } finally {
            hideLoadingState();
        }
    }


    function updateHeroStats() {
        // Calculate stats from current filtered data
        const totalTutorsCount = totalTutors || tutorsData.length || 0;
        const averageRating = tutorsData.length > 0
            ? (tutorsData.reduce((sum, t) => sum + (t.rating || 2.0), 0) / tutorsData.length).toFixed(1)
            : '4.5';

        // Count unique training centers
        const trainingCenters = new Set(tutorsData
            .filter(t => t.teaches_at && t.teaches_at !== 'Independent')
            .map(t => t.teaches_at)
        ).size || 50;

        // Update hero stats in DOM
        const statsHTML = `
        <div class="stat-item animate__animated animate__fadeInUp" style="animation-delay: 0.2s">
            <span class="stat-number">${totalTutorsCount}+</span>
            <span class="stat-label">Expert Tutors</span>
        </div>
        <div class="stat-item animate__animated animate__fadeInUp" style="animation-delay: 0.3s">
            <span class="stat-number">${trainingCenters}+</span>
            <span class="stat-label">Training Centers</span>
        </div>
        <div class="stat-item animate__animated animate__fadeInUp" style="animation-delay: 0.4s">
            <span class="stat-number">${averageRating}★</span>
            <span class="stat-label">Average Rating</span>
        </div>
    `;

        const heroStats = document.querySelector('.hero-stats');
        if (heroStats) {
            heroStats.innerHTML = statsHTML;
        }
    }

    // Debounce function
    function debounce(func, wait) {
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

    const debouncedSearch = debounce(applyFilters, 300);

    // Get filter elements
    const searchBar = document.getElementById('searchBar');
    const courseTypeSelect = document.getElementById('courseTypeSelect');
    const gradeSelect = document.getElementById('gradeSelect');
    const learningMethodSelect = document.querySelector('select[name="learningMethod"]');
    const minRatingInput = document.querySelector('input[name="minRating"]');
    const maxRatingInput = document.querySelector('input[name="maxRating"]');
    const minPriceInput = document.querySelector('input[name="minPrice"]');
    const maxPriceInput = document.querySelector('input[name="maxPrice"]');

    // Add event listeners with null checks
    searchBar?.addEventListener('input', debouncedSearch);
    courseTypeSelect?.addEventListener('change', applyFilters);
    gradeSelect?.addEventListener('change', applyFilters);
    learningMethodSelect?.addEventListener('change', applyFilters);
    minRatingInput?.addEventListener('input', debouncedSearch);
    maxRatingInput?.addEventListener('input', debouncedSearch);
    minPriceInput?.addEventListener('input', debouncedSearch);
    maxPriceInput?.addEventListener('input', debouncedSearch);

    // Gender checkboxes
    document.querySelectorAll('input[name="gender"]').forEach(cb => {
        cb.addEventListener('change', applyFilters);
    });

    // Simple location filter (requires user to be logged in and have location set)
    const nearMeCheckbox = document.querySelector('input[name="nearMe"]');
    nearMeCheckbox?.addEventListener('change', async (e) => {
        if (e.target.checked) {
            // Get user's location from profile (if logged in)
            const userLocation = localStorage.getItem('user_location') || 'Addis Ababa'; // Default

            // Add location to search
            const searchBar = document.getElementById('searchBar');
            if (searchBar) {
                searchBar.value = userLocation;
                applyFilters(); // Trigger filter
            }
        } else {
            // Clear location search
            const searchBar = document.getElementById('searchBar');
            if (searchBar && searchBar.value.includes('Addis Ababa')) {
                searchBar.value = '';
                applyFilters();
            }
        }
    });

    // Preference filters
const favoriteCheckbox = document.querySelector('input[name="favorite"]');
const savedCheckbox = document.querySelector('input[name="saved"]');
const searchHistoryCheckbox = document.querySelector('input[name="searchHistory"]');

favoriteCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
        // Show only favorited tutors
        const favorites = PreferencesManager.getFavorites();
        filteredTutors = tutorsData.filter(tutor => favorites.includes(tutor.id));
        renderTutorCards(filteredTutors);
        
        if (filteredTutors.length === 0) {
            showNotification('No favorite tutors yet. Click the heart icon to add favorites!', 'info');
        }
    } else {
        // Show all tutors
        filteredTutors = tutorsData;
        renderTutorCards(filteredTutors);
    }
});

savedCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
        // Show only saved tutors
        const saved = PreferencesManager.getSaved();
        filteredTutors = tutorsData.filter(tutor => saved.includes(tutor.id));
        renderTutorCards(filteredTutors);
        
        if (filteredTutors.length === 0) {
            showNotification('No saved tutors yet. Click the bookmark icon to save tutors!', 'info');
        }
    } else {
        // Show all tutors
        filteredTutors = tutorsData;
        renderTutorCards(filteredTutors);
    }
});

searchHistoryCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
        // Show search history
        const history = PreferencesManager.getSearchHistory();
        if (history.length > 0) {
            showNotification(`Recent searches: ${history.slice(0, 3).join(', ')}`, 'info');
            // Apply the most recent search
            const searchBar = document.getElementById('searchBar');
            if (searchBar && history[0]) {
                searchBar.value = history[0];
                applyFilters();
            }
        } else {
            showNotification('No search history yet', 'info');
        }
        e.target.checked = false; // Uncheck after showing
    }
});


    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    clearFiltersBtn?.addEventListener('click', () => {
        // Clear all inputs
        if (searchBar) searchBar.value = '';
        if (courseTypeSelect) courseTypeSelect.value = '';
        if (gradeSelect) gradeSelect.value = '';
        if (learningMethodSelect) learningMethodSelect.value = '';
        if (minRatingInput) minRatingInput.value = '';
        if (maxRatingInput) maxRatingInput.value = '';
        if (minPriceInput) minPriceInput.value = '';
        if (maxPriceInput) maxPriceInput.value = '';

        // Clear checkboxes
        document.querySelectorAll('input[name="gender"]').forEach(cb => cb.checked = false);

        // Reset to first page
        currentPage = 1;

        // Fetch unfiltered data
        fetchTutors(1);
    });


    

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                padding: 15px 20px;
                border-radius: 8px;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set styles based on type
        const styles = {
            error: 'background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5;',
            success: 'background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7;',
            warning: 'background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;',
            info: 'background: #DBEAFE; color: #1E40AF; border: 1px solid #93C5FD;'
        };

        notification.style.cssText += styles[type] || styles.info;
        notification.textContent = message;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification) {
                notification.remove();
            }
        }, 5000);
    }

    // Add CSS animation for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    // Make fetchTutors available globally for pagination
    window.fetchTutors = fetchTutors;
    window.fetchTutorsPage = fetchTutors;

    // ============================================
    // RETRY LOGIC
    // ============================================

    let retryCount = 0;
    const maxRetries = 3;

    async function fetchTutorsWithRetry(page = 1) {
        try {
            await fetchTutors(page);
            retryCount = 0; // Reset on success
        } catch (error) {
            retryCount++;
            if (retryCount <= maxRetries) {
                showNotification(`Connection failed. Retrying... (${retryCount}/${maxRetries})`, 'warning');
                setTimeout(() => fetchTutorsWithRetry(page), 2000);
            } else {
                showNotification('Unable to connect to server. Please check your connection.', 'error');
            }
        }
    }

    // ============================================
    // WEBSOCKET (OPTIONAL)
    // ============================================

    function initWebSocket() {
        if (!window.WebSocket) {
            console.log('WebSocket not supported');
            return;
        }

        try {
            const ws = new WebSocket('ws://localhost:8000/ws/tutors/client_' + Date.now());

            ws.onopen = () => {
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'tutor_update') {
                        showNotification('New tutors available! Refreshing...', 'info');
                        fetchTutors(currentPage);
                    }
                } catch (e) {
                    console.error('WebSocket message parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.log('WebSocket connection failed - continuing without real-time updates');
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                // Only reconnect after 30 seconds to avoid spamming
                setTimeout(initWebSocket, 30000);
            };
        } catch (error) {
            console.log('WebSocket initialization skipped:', error.message);
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    // Initialize on page load - SINGLE INITIALIZATION
    // Initialize on page load - SINGLE INITIALIZATION
    (function initializePage() {
        // Check if backend is running at the root endpoint
        fetch('http://localhost:8000/')
            .then(response => {
                if (response.ok) {
                    console.log('Backend connected successfully');
                    // Fetch tutors on page load ONCE
                    fetchTutors(1);
                } else {
                    throw new Error('Backend not responding');
                }
            })
            .catch(error => {
                console.error('Backend connection error:', error);
                showNotification('Backend server is not running. Please start the server with: uvicorn app:app --reload', 'error');
            });
    })();

    // ============================================
// PREFERENCES MANAGEMENT
// ============================================



    // Initialize WebSocket (optional)
    initWebSocket();

    console.log('✨ Astegni Find Tutors - Initialized with Ad Placeholders and Rating Tooltips');
});