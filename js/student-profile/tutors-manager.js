/**
 * Student Tutors Manager
 * Manages the "My Tutors" panel in student profile
 * Fetches tutors from enrolled_students table and displays using find-tutors card design
 */

class StudentTutorsManager {
    constructor() {
        this.tutors = [];
        this.filteredTutors = [];
        this.isLoading = false;
        this.searchQuery = '';
        this.searchDebounceTimer = null;
    }

    /**
     * Initialize the tutors manager
     */
    async init() {
        console.log('📚 Initializing Student Tutors Manager...');
        await this.loadTutors();
    }

    /**
     * Load tutors from API (enrolled_students table)
     */
    async loadTutors() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.error('No authentication token found');
                this.showEmptyState('Please log in to view your tutors.');
                return;
            }

            console.log('📡 Fetching enrolled tutors...');
            this.showLoadingState();

            const response = await fetch(`${API_BASE_URL}/api/student/tutors`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error Response:', errorData);
                throw new Error(`Failed to fetch tutors: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            this.tutors = data.tutors || [];
            this.filteredTutors = [...this.tutors];

            console.log(`✅ Loaded ${this.tutors.length} tutors`);

            this.renderTutors();
            this.updateBadgeCount();
            this.updateSearchCount();

        } catch (error) {
            console.error('❌ Error loading tutors:', error);
            this.showEmptyState('Failed to load tutors. Please try again later.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const grid = document.getElementById('tutors-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p class="text-gray-600 dark:text-gray-400">Loading your tutors...</p>
                </div>
            </div>
        `;
    }

    /**
     * Render tutors grid using TutorCardCreator
     */
    renderTutors() {
        const grid = document.getElementById('tutors-grid');
        if (!grid) {
            console.error('Tutors grid element not found');
            return;
        }

        // Clear existing content
        grid.innerHTML = '';

        // Use filtered tutors for display
        const tutorsToDisplay = this.filteredTutors;

        // Check if we have tutors
        if (this.tutors.length === 0) {
            this.showEmptyState();
            return;
        }

        // Check if filtered results are empty (but we have tutors)
        if (tutorsToDisplay.length === 0 && this.searchQuery) {
            this.showNoSearchResults();
            return;
        }

        // Create tutors grid container with find-tutors styling
        const gridContainer = document.createElement('div');
        gridContainer.className = 'tutor-cards-grid';
        gridContainer.id = 'myTutorCards';

        // Render each tutor card using TutorCardCreator
        tutorsToDisplay.forEach((tutor, index) => {
            if (typeof TutorCardCreator !== 'undefined') {
                gridContainer.innerHTML += TutorCardCreator.createTutorCard(tutor, index);
            } else {
                // Fallback if TutorCardCreator is not loaded
                gridContainer.innerHTML += this.createFallbackCard(tutor);
            }
        });

        grid.appendChild(gridContainer);

        // Add enrollment info badges to each card
        this.addEnrollmentBadges();
    }

    /**
     * Search tutors by name, subject, or location
     */
    searchTutors(query) {
        // Debounce search
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, 200);
    }

    /**
     * Perform the actual search
     */
    performSearch(query) {
        this.searchQuery = query.toLowerCase().trim();

        if (!this.searchQuery) {
            // If empty query, show all tutors
            this.filteredTutors = [...this.tutors];
        } else {
            // Filter tutors based on query
            this.filteredTutors = this.tutors.filter(tutor => {
                const fullName = (tutor.full_name || `${tutor.first_name || ''} ${tutor.father_name || ''}`).toLowerCase();
                const courses = Array.isArray(tutor.courses) ? tutor.courses.join(' ').toLowerCase() : '';
                const location = (tutor.location || '').toLowerCase();
                const languages = Array.isArray(tutor.languages) ? tutor.languages.join(' ').toLowerCase() : '';
                const bio = (tutor.bio || '').toLowerCase();
                const packageName = (tutor.package_name || '').toLowerCase();

                return fullName.includes(this.searchQuery) ||
                       courses.includes(this.searchQuery) ||
                       location.includes(this.searchQuery) ||
                       languages.includes(this.searchQuery) ||
                       bio.includes(this.searchQuery) ||
                       packageName.includes(this.searchQuery);
            });
        }

        console.log(`🔍 Search "${this.searchQuery}": found ${this.filteredTutors.length} of ${this.tutors.length} tutors`);

        this.renderTutors();
        this.updateSearchCount();
    }

    /**
     * Update search results count display
     */
    updateSearchCount() {
        const countEl = document.getElementById('tutors-search-count');
        if (!countEl) return;

        if (this.searchQuery) {
            countEl.textContent = `${this.filteredTutors.length} of ${this.tutors.length}`;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    }

    /**
     * Show no search results state
     */
    showNoSearchResults() {
        const grid = document.getElementById('tutors-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="no-results-state text-center py-12">
                <div class="text-6xl mb-4 opacity-50">🔍</div>
                <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">No Tutors Found</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">No tutors match "${this.searchQuery}"</p>
                <button onclick="document.getElementById('tutors-search-input').value = ''; studentTutorsManager.searchTutors('');"
                        class="text-blue-500 hover:text-blue-600 font-medium">
                    Clear search
                </button>
            </div>
        `;
    }

    /**
     * Add enrollment badges to cards showing package name and enrollment date
     */
    addEnrollmentBadges() {
        this.filteredTutors.forEach((tutor, index) => {
            const cards = document.querySelectorAll('#myTutorCards .tutor-card');
            const card = cards[index];
            if (!card) return;

            // Find the test-data-badge and replace it with enrollment info
            const testBadge = card.querySelector('.test-data-badge');
            if (testBadge && tutor.package_name) {
                testBadge.innerHTML = `
                    <div class="flex items-center justify-center gap-4">
                        <span class="flex items-center text-sm font-medium text-blue-800 dark:text-blue-300">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            ${tutor.package_name}
                        </span>
                        ${tutor.enrolled_at ? `
                            <span class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                Enrolled: ${new Date(tutor.enrolled_at).toLocaleDateString()}
                            </span>
                        ` : ''}
                    </div>
                `;
                testBadge.classList.remove('test-data-badge');
                testBadge.classList.add('enrollment-badge');
                testBadge.style.background = 'rgba(59, 130, 246, 0.05)';
            }
        });
    }

    /**
     * Fallback card if TutorCardCreator is not available
     */
    createFallbackCard(tutor) {
        const profilePicture = tutor.profile_picture || '../uploads/system_images/system_profile_pictures/default-avatar.png';
        const subjects = Array.isArray(tutor.courses) ? tutor.courses.slice(0, 3).join(', ') : 'Various subjects';
        const rating = tutor.rating || 0;
        const starsHTML = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        const isConnected = tutor.is_connected || this.isInLocalStorage('connectedTutors', tutor.id);

        return `
            <article class="tutor-card">
                <div class="tutor-card-header">
                    <div class="tutor-avatar-container">
                        <img src="${profilePicture}"
                             alt="${tutor.full_name}"
                             class="tutor-avatar"
                             onerror="this.src='../uploads/system_images/system_profile_pictures/default-avatar.png'">
                    </div>
                    <div class="tutor-info mt-4">
                        <h3 class="tutor-name" onclick="viewTutorProfile(${tutor.id})">${tutor.full_name}</h3>
                        <div class="flex items-center gap-3 mt-1">
                            <span class="detail-label">${tutor.gender || 'N/A'}</span>
                            ${tutor.is_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                        </div>
                        <div class="tutor-location detail-item">${tutor.location || 'Location not specified'}</div>
                        <div class="tutor-rating-section">
                            <div class="flex items-center gap-3">
                                <div class="stars text-yellow-500">${starsHTML}</div>
                                <span class="rating-number">${rating}</span>
                                <span class="rating-count">(${tutor.rating_count || 0})</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${tutor.package_name ? `
                    <div class="enrollment-badge p-2 text-center" style="background: rgba(59, 130, 246, 0.05);">
                        <span class="text-sm font-medium text-blue-800 dark:text-blue-300">📚 ${tutor.package_name}</span>
                        ${tutor.enrolled_at ? `<span class="text-sm text-gray-600 ml-2">• Enrolled: ${new Date(tutor.enrolled_at).toLocaleDateString()}</span>` : ''}
                    </div>
                ` : ''}

                <div class="tutor-content p-6">
                    <div class="subjects-section">
                        <h4 class="detail-label">📚 Subjects</h4>
                        <p class="detail-value">${subjects}</p>
                    </div>

                    <div class="tutor-details-grid grid grid-cols-2 gap-3 text-xs mt-4">
                        <div class="detail-item">
                            <span class="detail-label">Experience:</span>
                            <span class="detail-value">${tutor.experience ? tutor.experience + ' years' : 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Languages:</span>
                            <span class="detail-value">${Array.isArray(tutor.languages) ? tutor.languages.join(', ') : 'N/A'}</span>
                        </div>
                    </div>

                    ${tutor.bio ? `
                        <div class="bio-section mt-4">
                            <h4 class="detail-label">About</h4>
                            <p class="detail-value text-sm">${tutor.bio}</p>
                        </div>
                    ` : ''}
                </div>

                <div class="price-section">
                    <div class="tutor-price text-center">
                        <div class="price-amount">ETB ${tutor.price || 0}</div>
                        <div class="price-period">per session</div>
                    </div>
                </div>

                <div class="tutor-actions px-6 pb-6 flex gap-3">
                    <button class="message-btn flex-1" onclick="messageTutor(${tutor.id})">
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            Message
                        </span>
                    </button>
                    ${!isConnected ? `
                    <button class="connect-btn flex-1" onclick="connectWithTutor(${tutor.id})" data-tutor-id="${tutor.id}">
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                            </svg>
                            Connect
                        </span>
                    </button>
                    ` : `
                    <button class="connected-btn flex-1" disabled>
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Connected
                        </span>
                    </button>
                    `}
                </div>
            </article>
        `;
    }

    /**
     * Check if item is in localStorage array
     */
    isInLocalStorage(key, id) {
        try {
            const items = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(items) && items.includes(id);
        } catch (e) {
            return false;
        }
    }

    /**
     * Show empty state
     */
    showEmptyState(message = null) {
        const grid = document.getElementById('tutors-grid');
        if (!grid) return;

        const displayMessage = message || 'You haven\'t enrolled with any tutors yet. Find a tutor to get started!';

        grid.innerHTML = `
            <div class="empty-state text-center py-16">
                <div class="empty-icon text-8xl mb-6 opacity-50">👨‍🏫</div>
                <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">No Tutors Found</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">${displayMessage}</p>
                <button onclick="window.location.href='../branch/find-tutors.html'"
                        class="btn-primary px-8 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all">
                    Find a Tutor
                </button>
            </div>
        `;
    }

    /**
     * View tutor profile
     */
    viewTutorProfile(tutorId) {
        console.log(`👁️ Viewing tutor profile: ${tutorId}`);
        window.location.href = `../view-profiles/view-tutor.html?id=${tutorId}`;
    }

    /**
     * Message tutor - opens chat modal with tutor
     */
    messageTutor(tutorId) {
        console.log(`💬 Opening chat with tutor: ${tutorId}`);

        // Check if user is authenticated
        const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('access_token');
        if (!token) {
            if (window.openAuthModal) {
                window.openAuthModal('login');
            } else {
                alert('Please log in to message tutors');
            }
            return;
        }

        // Find the tutor in our tutors array
        const tutor = this.tutors.find(t => t.id === tutorId || t.tutor_id === tutorId);
        if (!tutor) {
            console.error('Tutor not found in current list');
            alert('Unable to start chat. Please try again.');
            return;
        }

        // Build the target user object for chat modal
        const targetUser = {
            id: tutor.tutor_user_id || tutor.user_id || tutor.id,
            user_id: tutor.tutor_user_id || tutor.user_id || tutor.id,
            profile_id: tutor.tutor_id || tutor.id,
            full_name: tutor.full_name || `${tutor.first_name || ''} ${tutor.father_name || ''}`.trim(),
            name: tutor.full_name || `${tutor.first_name || ''} ${tutor.father_name || ''}`.trim(),
            profile_picture: tutor.profile_picture || tutor.avatar,
            avatar: tutor.profile_picture || tutor.avatar,
            role: 'tutor',
            profile_type: 'tutor',
            is_online: tutor.is_online || false
        };

        console.log('Target tutor for chat:', targetUser);

        // Open chat modal with the tutor
        if (typeof openChatModal === 'function') {
            openChatModal(targetUser);
            console.log('Chat modal opened for tutor:', targetUser.full_name);
        } else if (typeof ChatModalManager !== 'undefined') {
            if (typeof ChatModalManager.init === 'function' && !ChatModalManager.state?.isOpen) {
                ChatModalManager.init();
            }
            if (typeof ChatModalManager.open === 'function') {
                ChatModalManager.open(targetUser);
                console.log('Chat modal opened via ChatModalManager');
            }
        } else {
            console.error('Chat modal not available');
            alert('Chat feature is not available. Please refresh the page.');
        }
    }

    /**
     * Update badge count in sidebar
     */
    updateBadgeCount() {
        // Update the badge count in the sidebar if exists
        const sidebarBadge = document.querySelector('a[onclick*="my-tutors"] .badge-count');
        if (sidebarBadge) {
            sidebarBadge.textContent = this.tutors.length;
        }

        // Update the panel header count
        const panelHeader = document.querySelector('#my-tutors-panel .panel-header h2');
        if (panelHeader) {
            panelHeader.innerHTML = `👨‍🏫 My Tutors <span class="text-sm font-normal text-gray-500">(${this.tutors.length})</span>`;
        }
    }
}

// Global functions for card button actions
function viewTutorProfile(tutorId) {
    window.location.href = `../view-profiles/view-tutor.html?id=${tutorId}`;
}

function toggleFavorite(tutorId) {
    const key = 'favoriteTutors';
    let favorites = JSON.parse(localStorage.getItem(key) || '[]');
    const index = favorites.indexOf(tutorId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(tutorId);
    }
    localStorage.setItem(key, JSON.stringify(favorites));

    // Update button visual
    const btn = document.querySelector(`.favorite-btn[data-id="${tutorId}"]`);
    if (btn) {
        btn.classList.toggle('text-yellow-500');
        btn.classList.toggle('text-gray-400');
    }
}

function toggleSave(tutorId) {
    const key = 'savedTutors';
    let saved = JSON.parse(localStorage.getItem(key) || '[]');
    const index = saved.indexOf(tutorId);
    if (index > -1) {
        saved.splice(index, 1);
    } else {
        saved.push(tutorId);
    }
    localStorage.setItem(key, JSON.stringify(saved));

    // Update button visual
    const btn = document.querySelector(`.save-btn[data-id="${tutorId}"]`);
    if (btn) {
        btn.classList.toggle('text-blue-500');
        btn.classList.toggle('text-gray-400');
    }
}

function messageTutor(tutorId) {
    console.log(`💬 Opening chat with tutor: ${tutorId}`);

    // Check if user is authenticated
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('access_token');
    if (!token) {
        if (window.openAuthModal) {
            window.openAuthModal('login');
        } else {
            alert('Please log in to message tutors');
        }
        return;
    }

    // Find the tutor in the studentTutorsManager's tutors array
    let tutor = null;
    if (typeof studentTutorsManager !== 'undefined' && studentTutorsManager.tutors) {
        tutor = studentTutorsManager.tutors.find(t => t.id === tutorId || t.tutor_id === tutorId);
    }

    if (!tutor) {
        console.error('Tutor not found in current list');
        alert('Unable to start chat. Please try again.');
        return;
    }

    // Build the target user object for chat modal
    const targetUser = {
        id: tutor.tutor_user_id || tutor.user_id || tutor.id,
        user_id: tutor.tutor_user_id || tutor.user_id || tutor.id,
        profile_id: tutor.tutor_id || tutor.id,
        full_name: tutor.full_name || `${tutor.first_name || ''} ${tutor.father_name || ''}`.trim(),
        name: tutor.full_name || `${tutor.first_name || ''} ${tutor.father_name || ''}`.trim(),
        profile_picture: tutor.profile_picture || tutor.avatar,
        avatar: tutor.profile_picture || tutor.avatar,
        role: 'tutor',
        profile_type: 'tutor',
        is_online: tutor.is_online || false
    };

    console.log('Target tutor for chat:', targetUser);

    // Open chat modal with the tutor
    if (typeof openChatModal === 'function') {
        openChatModal(targetUser);
        console.log('Chat modal opened for tutor:', targetUser.full_name);
    } else if (typeof ChatModalManager !== 'undefined') {
        // Initialize if needed
        if (typeof ChatModalManager.init === 'function' && !ChatModalManager.state?.isOpen) {
            ChatModalManager.init();
        }
        // Open with the tutor
        if (typeof ChatModalManager.open === 'function') {
            ChatModalManager.open(targetUser);
            console.log('Chat modal opened via ChatModalManager');
        }
    } else {
        console.error('Chat modal not available');
        alert('Chat feature is not available. Please refresh the page.');
    }
}

async function connectWithTutor(tutorId) {
    console.log(`🔗 Connecting with tutor: ${tutorId}`);

    const btn = document.querySelector(`.connect-btn[data-tutor-id="${tutorId}"]`);
    if (btn) {
        // Show loading state
        btn.disabled = true;
        btn.innerHTML = `
            <span class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
            </span>
        `;
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to connect with tutors.');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/connections/request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_profile_id: tutorId,
                target_role: 'tutor'
            })
        });

        if (response.ok) {
            // Save to localStorage
            const connected = JSON.parse(localStorage.getItem('connectedTutors') || '[]');
            if (!connected.includes(tutorId)) {
                connected.push(tutorId);
                localStorage.setItem('connectedTutors', JSON.stringify(connected));
            }

            // Update button to show connected state
            if (btn) {
                btn.className = btn.className.replace('connect-btn', 'connected-btn');
                btn.disabled = true;
                btn.innerHTML = `
                    <span class="flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Connected
                    </span>
                `;
            }

            console.log('✅ Connection request sent successfully');
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to connect');
        }
    } catch (error) {
        console.error('❌ Connection error:', error);
        alert(error.message || 'Failed to connect with tutor. Please try again.');

        // Reset button state
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                    </svg>
                    Connect
                </span>
            `;
        }
    }
}

// Create global instance
const studentTutorsManager = new StudentTutorsManager();

// Initialize when panel becomes visible
document.addEventListener('DOMContentLoaded', () => {
    // Check if we have the switchPanel function
    if (typeof window.switchPanel === 'function') {
        const originalSwitchPanel = window.switchPanel;
        window.switchPanel = function(panelName) {
            originalSwitchPanel(panelName);

            // Initialize tutors manager when My Tutors panel is shown
            if (panelName === 'my-tutors') {
                studentTutorsManager.init();
            }
        };
    }

    // Also check if panel is already active on page load
    const myTutorsPanel = document.getElementById('my-tutors-panel');
    if (myTutorsPanel && !myTutorsPanel.classList.contains('hidden')) {
        studentTutorsManager.init();
    }
});
