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
// FIX FOR find-tutors.js
// Replace the existing fetchTutors function with this complete version
// ============================================

// Add this at the top of your find-tutors.js file if not already present


// Replace your existing fetchTutors function with this:
async function fetchTutors(page = 1) {
    try {
        console.log('Fetching tutors from:', `${API_BASE_URL}/tutors?page=${page}&limit=20`);
        showLoadingState();
        
        const response = await fetch(`${API_BASE_URL}/tutors?page=${page}&limit=20`);
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
            // Paginated response from backend
            tutorsData = data.tutors;
            currentPage = data.page;
            totalPages = data.total_pages;
            totalTutors = data.total;
        } else if (Array.isArray(data)) {
            // Non-paginated response (fallback)
            tutorsData = data;
            currentPage = 1;
            totalPages = 1;
            totalTutors = data.length;
        } else {
            // No data
            tutorsData = [];
            currentPage = 1;
            totalPages = 1;
            totalTutors = 0;
        }

        filteredTutors = tutorsData;
        
        // THIS IS THE KEY LINE THAT WAS MISSING:
        renderTutorCards(filteredTutors);
        renderPagination();
        
        // Hide no results message if we have tutors
        if (tutorsData.length > 0) {
            const noResultsElement = document.getElementById('noResults');
            if (noResultsElement) {
                noResultsElement.classList.add('hidden');
            }
        }
        
    } catch (error) {
        console.error('Error fetching tutors:', error);
        
        // Show user-friendly error messages
        if (error.message.includes('Failed to fetch')) {
            showNotification('Cannot connect to server. Please ensure the backend is running on port 8000.', 'error');
        } else {
            showNotification('Failed to load tutors. Please try again later.', 'error');
        }
        
        // Show no results message on error
        const noResultsElement = document.getElementById('noResults');
        if (noResultsElement) {
            noResultsElement.classList.remove('hidden');
            noResultsElement.innerHTML = `
                <div class="text-center py-8">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 class="mt-2 text-lg font-medium text-gray-900">Connection Error</h3>
                    <p class="mt-1 text-sm text-gray-500">Unable to load tutors. Please check your connection.</p>
                    <button onclick="fetchTutors(1)" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Try Again
                    </button>
                </div>
            `;
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

// Render pagination controls
function renderPagination() {
    // Remove existing pagination if any
    const existingPagination = document.getElementById('paginationContainer');
    if (existingPagination) {
        existingPagination.remove();
    }

    if (totalPages <= 1) return;

    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'paginationContainer';
    paginationContainer.className = 'flex justify-center items-center gap-2 mt-8 pb-8';

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button 
            onclick="fetchTutors(${currentPage - 1})" 
            class="px-3 py-1 bg-gray-200 rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}"
            ${currentPage === 1 ? 'disabled' : ''}>
            Previous
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <button onclick="fetchTutors(1)" class="px-3 py-1 border rounded hover:bg-gray-100">1</button>
            ${startPage > 2 ? '<span class="px-2">...</span>' : ''}
        `;
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button 
                onclick="fetchTutors(${i})" 
                class="px-3 py-1 border rounded ${i === currentPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<span class="px-2">...</span>' : ''}
            <button onclick="fetchTutors(${totalPages})" class="px-3 py-1 border rounded hover:bg-gray-100">${totalPages}</button>
        `;
    }

    // Next button
    paginationHTML += `
        <button 
            onclick="fetchTutors(${currentPage + 1})" 
            class="px-3 py-1 bg-blue-500 text-white rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}"
            ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
    `;

    // Info text
    paginationHTML += `
        <span class="ml-4 text-gray-600">
            Page ${currentPage} of ${totalPages} (${totalTutors} tutors)
        </span>
    `;

    paginationContainer.innerHTML = paginationHTML;
    
    const tutorCardsElement = document.getElementById('tutorCards');
    if (tutorCardsElement && tutorCardsElement.parentNode) {
        tutorCardsElement.parentNode.insertBefore(paginationContainer, tutorCardsElement.nextSibling);
    }
}

// Ensure the renderTutorCards function exists and works properly
function renderTutorCards(tutors) {
    const tutorCardsContainer = document.getElementById('tutorCards');
    if (!tutorCardsContainer) {
        console.error('Tutor cards container not found');
        return;
    }

    tutorCardsContainer.innerHTML = '';

    if (!tutors || tutors.length === 0) {
        const noResultsElement = document.getElementById('noResults');
        if (noResultsElement) {
            noResultsElement.classList.remove('hidden');
        }
        tutorCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-gray-500">No tutors found matching your criteria.</p>
            </div>
        `;
    } else {
        const noResultsElement = document.getElementById('noResults');
        if (noResultsElement) {
            noResultsElement.classList.add('hidden');
        }
        
        tutors.forEach((tutor, index) => {
            const card = generateTutorCard(tutor, index);
            if (card) {
                tutorCardsContainer.appendChild(card);
            }
        });
    }

    attachCardEventListeners();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if backend is running
    fetch(`${API_BASE_URL}/`)
        .then(response => {
            if (response.ok) {
                console.log('Backend connected successfully');
                // Fetch tutors on page load
                fetchTutors(1);
            } else {
                throw new Error('Backend not responding');
            }
        })
        .catch(error => {
            console.error('Backend connection error:', error);
            showNotification('Backend server is not running. Please start the server with: uvicorn app:app --reload', 'error');
        });
});

// Helper function for notifications
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

    // Generate Tutor Card
    const tutorCardsContainer = document.getElementById('tutorCards');

function generateTutorCard(tutor, index) {
    const card = document.createElement('div');
    card.className = 'tutor-card animate__animated animate__fadeInUp';
    card.style.animationDelay = `${index * 0.05}s`;

    const courseTypeLabel = tutor.course_type === 'certifications' ? 'Certification' : 'Academic';
    const gradeInfo = tutor.grades && tutor.grades.length > 0 ? tutor.grades.join(', ') : 'All Levels';

    // Rating breakdown (from API or calculated)
    const ratingBreakdown = tutor.rating_breakdown || {
        engagement: tutor.rating,
        discipline: tutor.rating,
        punctuality: tutor.rating,
        communication: tutor.rating,
        subject_matter: tutor.rating
    };

    card.innerHTML = `
        <div class="tutor-header">
            <img src="${tutor.profile_picture || 'https://via.placeholder.com/60'}" alt="${tutor.name}" class="tutor-avatar">
            <div class="tutor-info">
                <div class="tutor-name-wrapper">
                    <a href="view-tutor.html?id=${tutor.id}" class="tutor-name">${tutor.name}</a>
                    <span style="
                        display: inline-block;
                        margin-left: 8px;
                        padding: 2px 8px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        font-size: 10px;
                        font-weight: 600;
                        border-radius: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.4);
                    ">Mock</span>
                </div>
                <div class="rating-stars-container">
                    <div class="rating-stars">
                        ${'★'.repeat(Math.round(tutor.rating))}${'☆'.repeat(5 - Math.round(tutor.rating))}
                        <span style="font-size: 0.875rem; color: #6b7280; margin-left: 0.25rem;">(${tutor.rating.toFixed(1)})</span>
                    </div>
                </div>
            </div>
            <div class="tutor-actions">                 
                <button class="action-btn favorite-btn ${tutor.is_favorite ? 'active' : ''}" data-id="${tutor.id}" aria-label="Favorite">
                    <svg class="w-5 h-5" fill="${tutor.is_favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                </button>
                                    <button class="action-btn save-btn" data-id="${tutor.id}" aria-label="Save">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                        </svg>
                    </button>
            </div>
        </div>
        <div class="tutor-details">
        ${tutor.quote ? `
            <div class="detail-item" style="margin-top: 10px; padding: 10px; background: #f3f4f6; border-left: 3px solid #667eea; border-radius: 4px;">
                <em style="font-size: 0.875rem; color: #374151; display: block;">
                    "${tutor.quote}"
                </em>
            </div>
            ` : ''}
            <div class="detail-item">
                <span class="detail-label">Type:</span> ${courseTypeLabel}
            </div>
            <div class="detail-item">
                <span class="detail-label">Gender:</span> ${tutor.gender || 'Not specified'}
            </div>
            <div class="detail-item">
                <span class="detail-label">Courses:</span> ${tutor.courses.join(', ')}
            </div>
            <div class="detail-item">
                <span class="detail-label">Grades:</span> ${gradeInfo}
            </div>
            <div class="detail-item">
                <span class="detail-label">Experience:</span> ${tutor.experience} years
            </div>
            <div class="detail-item">
                <span class="detail-label">Location:</span> ${tutor.location}
            </div>
            <div class="detail-item">
                <span class="detail-label">Teaches at:</span> ${tutor.teaches_at || 'Independent'}
            </div>
            <div class="detail-item">
                <span class="detail-label">Method:</span> ${tutor.learning_method}
            </div>
            <div class="detail-item">
                <span class="detail-label">Price:</span> <strong>${tutor.price} ETB/hr</strong>
            </div>
            ${tutor.bio ? `
            <div class="detail-item" style="margin-top: 10px;">
                <span class="detail-label">Bio:</span>
                <p style="margin-top: 4px; font-size: 0.875rem; line-height: 1.4; color: #4b5563;">
                    ${tutor.bio}
                </p>
            </div>
            ` : ''}
        </div>
        <a href="../view-profile-tier-1/view-tutor.html?id=${tutor.id}" class="view-tutor-btn">View Full Profile</a>
    `;

    return card;
}

    // Render tutor cards
    function renderTutorCards(tutors) {
        tutorCardsContainer.innerHTML = '';

        if (tutors.length === 0) {
            document.getElementById('noResults').classList.remove('hidden');
        } else {
            document.getElementById('noResults').classList.add('hidden');
            tutors.forEach((tutor, index) => {
                tutorCardsContainer.appendChild(generateTutorCard(tutor, index));
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
                const tutorId = btn.dataset.id;
                // Add API call to toggle favorite
                btn.classList.toggle('active');
                const svg = btn.querySelector('svg');
                svg.setAttribute('fill', btn.classList.contains('active') ? 'currentColor' : 'none');
            });
        });

        // Save buttons
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const tutorId = btn.dataset.id;
                // Add API call to toggle save
                btn.classList.toggle('active');
                const svg = btn.querySelector('svg');
                svg.setAttribute('fill', btn.classList.contains('active') ? 'currentColor' : 'none');
            });
        });
    }

    // Filter Functionality
    const searchBar = document.getElementById('searchBar');
    const courseTypeSelect = document.getElementById('courseTypeSelect');
    const gradeSelect = document.getElementById('gradeSelect');
    const genderCheckboxes = document.querySelectorAll('input[name="gender"]');
    const learningMethodSelect = document.querySelector('select[name="learningMethod"]');
    const minRatingInput = document.querySelector('input[name="minRating"]');
    const maxRatingInput = document.querySelector('input[name="maxRating"]');
    const minPriceInput = document.querySelector('input[name="minPrice"]');
    const maxPriceInput = document.querySelector('input[name="maxPrice"]');
    const clearFiltersBtn = document.getElementById('clearFilters');


    // Add pagination rendering
    function renderPagination() {
        // Remove existing pagination if any
        const existingPagination = document.querySelector('.pagination-container');
        if (existingPagination) {
            existingPagination.remove();
        }

        if (totalPages <= 1) return; // Don't show pagination for single page

        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container flex justify-center items-center space-x-2 mt-8 mb-4';

        // Build pagination HTML
        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button 
                onclick="window.fetchTutorsPage(${currentPage - 1})" 
                class="px-3 py-1 bg-blue-500 text-white rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}"
                ${currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `
                <button onclick="window.fetchTutorsPage(1)" class="px-3 py-1 border rounded hover:bg-gray-100">1</button>
                ${startPage > 2 ? '<span class="px-2">...</span>' : ''}
            `;
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button 
                    onclick="window.fetchTutorsPage(${i})" 
                    class="px-3 py-1 border rounded ${i === currentPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            paginationHTML += `
                ${endPage < totalPages - 1 ? '<span class="px-2">...</span>' : ''}
                <button onclick="window.fetchTutorsPage(${totalPages})" class="px-3 py-1 border rounded hover:bg-gray-100">${totalPages}</button>
            `;
        }

        // Next button
        paginationHTML += `
            <button 
                onclick="window.fetchTutorsPage(${currentPage + 1})" 
                class="px-3 py-1 bg-blue-500 text-white rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}"
                ${currentPage === totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;

        // Info text
        paginationHTML += `
            <span class="ml-4 text-gray-600">
                Page ${currentPage} of ${totalPages} (${totalTutors} tutors)
            </span>
        `;

        paginationContainer.innerHTML = paginationHTML;
        document.getElementById('tutorCards').after(paginationContainer);
    }

    // Make fetchTutors available globally for pagination
    window.fetchTutorsPage = fetchTutors;



    // Update applyFilters to work with API
    async function applyFilters() {
        const filters = {
            search: searchBar?.value || undefined,
            course_type: courseTypeSelect?.value || undefined,
            learning_method: learningMethodSelect?.value || undefined,
            min_price: minPriceInput?.value || undefined,
            max_price: maxPriceInput?.value || undefined,
            min_rating: minRatingInput?.value || undefined,
            page: 1,  // Reset to first page when filtering
            limit: 20
        };

        // Remove undefined values
        Object.keys(filters).forEach(key =>
            filters[key] === undefined && delete filters[key]
        );

        try {
            showLoadingState();
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${API_BASE_URL}/tutors?${queryParams}`);

            if (!response.ok) throw new Error('Failed to fetch filtered tutors');

            const data = await response.json();

            // Handle paginated response
            if (data.tutors) {
                tutorsData = data.tutors;
                currentPage = data.page;
                totalPages = data.total_pages;
                totalTutors = data.total;
            } else if (Array.isArray(data)) {
                tutorsData = data;
                currentPage = 1;
                totalPages = 1;
                totalTutors = data.length;
            }

            filteredTutors = tutorsData;
            renderTutorCards(filteredTutors);
            renderPagination();
        } catch (error) {
            console.error('Filter error:', error);
            showNotification('Failed to apply filters', 'error');
        } finally {
            hideLoadingState();
        }
    }


    // Update showLoadingState
    function showLoadingState() {
        tutorCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p class="mt-4 text-gray-600">Loading tutors...</p>
            </div>
        `;
    }

    function hideLoadingState() {
        // This is now empty as rendering is handled elsewhere
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

    // Add event listeners for filters
    searchBar?.addEventListener('input', debouncedSearch);
    courseTypeSelect?.addEventListener('change', applyFilters);
    gradeSelect?.addEventListener('change', applyFilters);
    genderCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    learningMethodSelect?.addEventListener('change', applyFilters);
    minRatingInput?.addEventListener('input', debouncedSearch);
    maxRatingInput?.addEventListener('input', debouncedSearch);
    minPriceInput?.addEventListener('input', debouncedSearch);
    maxPriceInput?.addEventListener('input', debouncedSearch);

    // Update the clear filters function
    clearFiltersBtn?.addEventListener('click', () => {
        searchBar.value = '';
        courseTypeSelect.value = '';
        gradeSelect.value = '';
        genderCheckboxes.forEach(cb => cb.checked = false);
        learningMethodSelect.value = '';
        minRatingInput.value = '';
        maxRatingInput.value = '';
        minPriceInput.value = '';
        maxPriceInput.value = '';

        // Fetch fresh data from API instead of using local data
        fetchTutors(1); // Reset to page 1 with no filters
    });


    async function fetchTutors(page = 1) {
        try {
            console.log('Fetching tutors from:', `${API_BASE_URL}/tutors?page=${page}&limit=20`);
            showLoadingState();
            const response = await fetch(`${API_BASE_URL}/tutors?page=${page}&limit=20`);
            console.log('Response status:', response.status);

            if (!response.ok) throw new Error('Failed to fetch tutors');

            const data = await response.json();
            console.log('Data received:', data);

            // Handle paginated response structure
            if (data.tutors) {
                // Paginated response
                tutorsData = data.tutors;
                currentPage = data.page;
                totalPages = data.total_pages;
                totalTutors = data.total;
            } else if (Array.isArray(data)) {
                // Non-paginated response (fallback)
                tutorsData = data;
                currentPage = 1;
                totalPages = 1;
                totalTutors = data.length;
            }

            filteredTutors = tutorsData;
            renderTutorCards(filteredTutors);  // THIS LINE IS PROBABLY MISSING
            renderPagination();
        } catch (error) {
            console.error('Error fetching tutors:', error);
            showNotification('Failed to load tutors. Please try again later.', 'error');
        } finally {
            hideLoadingState();
        }
    }


    // Add connection retry logic
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

    // Notification function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50`;

        if (type === 'success') {
            notification.className += ' bg-green-500 text-white';
        } else if (type === 'error') {
            notification.className += ' bg-red-500 text-white';
        } else {
            notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Add WebSocket support (optional but recommended)
    function initWebSocket() {
        try {
            const ws = new WebSocket('ws://localhost:8000/ws/tutors/client_' + Date.now());

            ws.onopen = () => {
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'tutor_update') {
                    showNotification('New tutors available! Refreshing...', 'info');
                    fetchTutors(currentPage); // Refresh current page
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                // Reconnect after 5 seconds
                setTimeout(initWebSocket, 5000);
            };
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
        }
    }

    // Initialize page
    fetchTutors();
    initWebSocket(); // Add WebSocket connection
    console.log('✨ Astegni Find Tutors - Initialized');
});