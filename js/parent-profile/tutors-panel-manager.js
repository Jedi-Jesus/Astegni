// ============================================
// TUTORS PANEL MANAGER
// Handles loading and rendering tutors for parent's children
// Data comes from enrolled_students table
// ============================================

const TutorsPanelManager = {
    tutors: [],
    isLoading: false,
    isInitialized: false,
    container: null,

    // Initialize the tutors panel
    async init() {
        // Prevent multiple initializations
        if (this.isInitialized || this.isLoading) {
            console.log('[TutorsPanelManager] Already initialized or loading, skipping...');
            return;
        }

        console.log('[TutorsPanelManager] Initializing...');
        this.container = document.querySelector('#tutors-panel .tutors-grid');
        if (!this.container) {
            console.error('[TutorsPanelManager] Tutors grid container not found');
            return;
        }

        // Show loading state
        this.showLoading();

        // Load tutors
        await this.loadTutors();

        // Mark as initialized
        this.isInitialized = true;
    },

    // Show loading state
    showLoading() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="loading-state" style="grid-column: 1 / -1; text-center; padding: 3rem;">
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-4xl mb-4" style="color: var(--button-bg);"></i>
                    <p class="text-lg">Loading tutors...</p>
                </div>
            </div>
        `;
    },

    // Load tutors from API
    async loadTutors() {
        this.isLoading = true;
        try {
            const response = await ParentProfileAPI.getTutors();
            console.log('[TutorsPanelManager] Tutors response:', response);

            this.tutors = response.tutors || [];

            if (this.tutors.length === 0) {
                this.showEmptyState(response.message);
            } else {
                this.renderTutors();
            }
        } catch (error) {
            console.error('[TutorsPanelManager] Error loading tutors:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    },

    // Show empty state
    showEmptyState(message = null) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div class="card p-8 text-center">
                    <div class="text-6xl mb-4">👨‍🏫</div>
                    <h3 class="text-xl font-bold mb-2">No Tutors Found</h3>
                    <p class="text-gray-600 mb-4">${message || "Your children haven't enrolled with any tutors yet."}</p>
                    <a href="../branch/find-tutors.html" class="btn-primary inline-flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        Find Tutors
                    </a>
                </div>
            </div>
        `;
    },

    // Show error state
    showErrorState(errorMessage) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div class="card p-8 text-center border-red-200 bg-red-50">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h3 class="text-xl font-bold mb-2 text-red-600">Error Loading Tutors</h3>
                    <p class="text-gray-600 mb-4">${errorMessage || 'Unable to load tutors. Please try again.'}</p>
                    <button onclick="TutorsPanelManager.loadTutors()" class="btn-primary">
                        <i class="fas fa-redo mr-2"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    },

    // Generate star rating HTML
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '★';
        }
        if (hasHalfStar && fullStars < 5) {
            stars += '☆';
        }
        for (let i = stars.length; i < 5; i++) {
            stars += '☆';
        }

        return stars;
    },

    // Create tutor card HTML
    createTutorCard(tutor) {
        const profilePic = tutor.profile_picture || 'https://via.placeholder.com/150?text=No+Photo';
        const rating = tutor.rating ? tutor.rating.toFixed(1) : '0.0';
        const ratingStars = this.generateStars(tutor.rating || 0);
        // package_name can be used to infer subject if not directly available
        const packageName = tutor.package_name || 'Not specified';
        const languages = Array.isArray(tutor.languages) ? tutor.languages.join(', ') : (tutor.languages || 'Not specified');
        const gradeLevel = tutor.grade_level || 'All levels';
        const price = tutor.hourly_rate ? `ETB ${tutor.hourly_rate}/hr` : 'Contact for price';
        const verifiedBadge = tutor.is_verified ? `
            <span class="verified-badge inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                Verified
            </span>
        ` : '';

        // Show which children are enrolled with this tutor
        const studentsInfo = tutor.students && tutor.students.length > 0
            ? tutor.students.map(s => `<span class="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full mr-1 mb-1">${s.student_name}</span>`).join('')
            : '<span class="text-gray-500 text-xs">No enrolled children</span>';

        return `
            <article class="tutor-card group relative">
                <!-- Header Section -->
                <div class="tutor-card-header">
                    <!-- Profile Picture -->
                    <div class="tutor-avatar-container relative">
                        <img src="${profilePic}"
                             alt="${tutor.name}"
                             class="tutor-avatar w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-600 shadow-lg group-hover:scale-110 transition-transform duration-300"
                             onerror="this.src='https://via.placeholder.com/150?text=No+Photo'">
                    </div>

                    <!-- Name and Details -->
                    <div class="tutor-info mt-4">
                        <div class="mb-2">
                            <h3 class="tutor-name" onclick="viewTutorProfile(${tutor.id})">
                                ${tutor.name} ${tutor.expertise_badge ? `<span class="detail-label">(${tutor.expertise_badge})</span>` : ''}
                            </h3>
                            <div class="flex items-center gap-3 mt-1">
                                <span class="detail-label">
                                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                    ${tutor.gender || 'Not specified'}
                                </span>
                                ${verifiedBadge}
                            </div>
                        </div>

                        <!-- Location -->
                        <div class="tutor-location detail-item detail-location">
                            <svg class="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            ${tutor.location || 'Location not specified'}
                        </div>

                        <!-- Rating Section -->
                        <div class="tutor-rating-section relative group">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="rating-display flex items-center">
                                    <div class="stars text-yellow-500 text-lg font-bold mr-2">${ratingStars}</div>
                                    <span class="rating-number">${rating}</span>
                                    <span class="rating-count">(${tutor.rating_count || 0})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quote Section -->
                ${tutor.quote ? `
                <div class="tutor-quote">
                    <div class="flex items-start">
                        <svg class="w-5 h-5 mr-3 mt-1 text-purple-500 dark:text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clip-rule="evenodd"></path>
                        </svg>
                        <em>"${tutor.quote}"</em>
                    </div>
                </div>
                ` : ''}

                <!-- Content Section -->
                <div class="tutor-content p-6 space-y-4">
                    <!-- Enrolled Children Section -->
                    <div class="enrolled-children-section mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 class="detail-label mb-2">
                            <svg class="w-4 h-4 mr-2 text-blue-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                            </svg>
                            Teaching Your Children
                        </h4>
                        <div class="flex flex-wrap">${studentsInfo}</div>
                    </div>

                    <!-- Package Info -->
                    <div class="package-section">
                        <h4 class="detail-label">
                            <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            Package
                        </h4>
                        <p class="detail-value">${packageName}</p>
                    </div>

                    <!-- Details Grid -->
                    <div class="tutor-details-grid grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div class="detail-item">
                            <svg class="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <div>
                                <span class="detail-label">Session Format</span>
                                <span class="detail-value">${tutor.session_format || 'Flexible'}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <svg class="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                            </svg>
                            <div>
                                <span class="detail-label">Grade Level</span>
                                <span class="detail-value">${gradeLevel}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <svg class="w-4 h-4 mr-2 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                            </svg>
                            <div>
                                <span class="detail-label">Languages</span>
                                <span class="detail-value">${languages}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bio -->
                    ${tutor.bio ? `
                    <div class="bio-section">
                        <h4 class="detail-label">
                            <svg class="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            About
                        </h4>
                        <p class="detail-value">${tutor.bio}</p>
                    </div>
                    ` : ''}
                </div>

                <!-- Price Section -->
                <div class="price-section">
                    <div class="tutor-price">
                        <div class="text-center">
                            <div class="price-amount">${price}</div>
                            <div class="price-period">per session</div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="tutor-actions px-6 pb-6 flex flex-col sm:flex-row gap-3">
                    <button class="view-profile-btn flex-1" onclick="viewTutorProfile(${tutor.id})">
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            View Profile
                        </span>
                    </button>
                    <button class="chat-btn flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                            onclick="startChatWithTutor(${tutor.id}, '${tutor.name.replace(/'/g, "\\'")}', '${(profilePic || '').replace(/'/g, "\\'")}')">
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            Message
                        </span>
                    </button>
                </div>
            </article>
        `;
    },

    // Render all tutors
    renderTutors() {
        if (!this.container) return;

        const tutorsHtml = this.tutors.map(tutor => this.createTutorCard(tutor)).join('');
        this.container.innerHTML = tutorsHtml;

        console.log(`[TutorsPanelManager] Rendered ${this.tutors.length} tutor cards`);
    },

    // Refresh tutors
    async refresh() {
        await this.loadTutors();
    }
};

// Make it available globally
window.TutorsPanelManager = TutorsPanelManager;

// Auto-initialize when DOM is ready if tutors-panel exists
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the parent profile page with tutors panel
    const tutorsPanel = document.getElementById('tutors-panel');
    if (tutorsPanel) {
        // Initialize when the panel becomes visible (panel switching)
        const observer = new MutationObserver((mutations) => {
            // Only process if not already initialized
            if (TutorsPanelManager.isInitialized) return;

            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!tutorsPanel.classList.contains('hidden')) {
                        TutorsPanelManager.init();
                        break; // Only need to init once
                    }
                }
            }
        });

        observer.observe(tutorsPanel, { attributes: true });

        // Also initialize if panel is already visible on page load
        if (!tutorsPanel.classList.contains('hidden')) {
            TutorsPanelManager.init();
        }
    }
});

/**
 * Start chat with a tutor - opens chat modal with tutor as target
 * @param {number} tutorId - Tutor's profile ID
 * @param {string} tutorName - Tutor's name
 * @param {string} profilePicture - Tutor's profile picture URL
 */
function startChatWithTutor(tutorId, tutorName, profilePicture) {
    // Open chat modal with tutor's data
    if (typeof openChatModal === 'function' || typeof ChatModalManager !== 'undefined') {
        const targetUser = {
            user_id: tutorId,
            id: tutorId,
            profile_id: tutorId,
            full_name: tutorName,
            name: tutorName,
            profile_picture: profilePicture || '',
            avatar: profilePicture || '',
            profile_type: 'tutor',
            role: 'tutor'
        };

        console.log('[TutorsPanelManager] Opening chat with tutor:', targetUser);

        // Use ChatModalManager if available
        if (typeof ChatModalManager !== 'undefined' && ChatModalManager.open) {
            ChatModalManager.open(targetUser);
        } else if (typeof openChatModal === 'function') {
            openChatModal(targetUser);
        }
    } else {
        console.error('[TutorsPanelManager] Chat modal not available');
        if (typeof showNotification === 'function') {
            showNotification('Chat feature is loading. Please try again.', 'info');
        } else {
            alert('Chat feature is loading. Please try again.');
        }
    }
}

// Make startChatWithTutor available globally
window.startChatWithTutor = startChatWithTutor;
