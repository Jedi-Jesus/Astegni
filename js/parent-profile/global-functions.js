// ============================================
// GLOBAL FUNCTIONS FOR PARENT PROFILE PAGE
// ============================================

// Store loaded tutor data for actions
let loadedTutorsData = [];

// Load Tutor Information for Student
async function loadTutorInformation(studentProfileId) {
    const container = document.getElementById('tutor-cards-container');
    const loadingEl = document.getElementById('tutor-loading');
    const noTutorsState = document.getElementById('no-tutors-state');

    if (!container) return;

    // Show loading
    if (loadingEl) loadingEl.style.display = 'block';
    if (noTutorsState) noTutorsState.style.display = 'none';

    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No access token found');
        }

        const response = await fetch(`http://localhost:8000/api/student/${studentProfileId}/tutors`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch tutor information');

        const data = await response.json();
        const tutors = data.tutors || [];

        console.log('[loadTutorInformation] Tutors for student:', tutors);

        // Hide loading
        if (loadingEl) loadingEl.style.display = 'none';

        if (tutors.length === 0) {
            // No tutors enrolled
            container.innerHTML = '';
            if (noTutorsState) noTutorsState.style.display = 'block';
            return;
        }

        // Store for actions
        loadedTutorsData = tutors;

        // Render tutor cards
        container.innerHTML = tutors.map((tutor, index) => createTutorCard(tutor, index)).join('');

    } catch (error) {
        console.error('[loadTutorInformation] Error:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Failed to load tutor information</p>
            </div>
        `;
    }
}

// Create Tutor Card HTML (Matching find-tutors exact style)
function createTutorCard(tutor, index) {
    // Handle tutor name
    const name = tutor.name || tutor.username || 'Tutor';
    const firstName = name.split(' ')[0];

    // Get default avatar based on gender
    const getDefaultAvatar = (name) => {
        if (tutor.gender?.toLowerCase() === 'female') {
            return '/uploads/system_images/system_profile_pictures/girl-user-image.jpg';
        }
        return '/uploads/system_images/system_profile_pictures/boy-user-image.jpg';
    };

    const profilePic = tutor.profile_picture || getDefaultAvatar(firstName);
    const bio = tutor.bio || 'Experienced educator dedicated to helping students succeed.';

    // Use ACTUAL rating from database
    const ratingValue = tutor.rating !== undefined && tutor.rating !== null ? parseFloat(tutor.rating) : 0.0;
    const rating = ratingValue.toFixed(1);

    // Currency symbol
    const currencySymbol = window.CurrencyManager ? CurrencyManager.getSymbol() : 'Br';
    const price = tutor.hourly_rate || 0;

    const location = tutor.location || 'Not specified';
    const gender = tutor.gender || 'Not specified';

    // Get languages
    const languages = Array.isArray(tutor.languages) && tutor.languages.length > 0
                     ? tutor.languages.join(', ')
                     : 'Not specified';

    // Get grade level
    const gradeLevel = tutor.grade_level || 'Not specified';

    // Session format
    const sessionFormat = tutor.session_format || 'Not specified';

    // Package name
    const packageName = tutor.package_name || 'Standard Package';

    // Generate rating stars
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    const starsHTML = '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);

    const quote = tutor.quote || "Dedicated to student success";

    // Show which children are enrolled with this tutor (this is parent-specific)
    const studentsInfo = tutor.students && tutor.students.length > 0
        ? tutor.students.map(s => `<span class="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full mr-1 mb-1">${s.student_name}</span>`).join('')
        : '<span class="text-gray-500 text-xs">No enrolled children</span>';

    return `
        <article class="tutor-card group relative"
                 data-gender="${gender}"
                 data-location="${location}"
                 data-rating="${ratingValue}">

            <!-- Header Section - Stacked Layout (EXACTLY like find-tutors) -->
            <div class="tutor-header">
                <!-- Row 1: Avatar -->
                <div class="tutor-avatar-row">
                    <div class="tutor-avatar-container">
                        <img src="${profilePic}"
                             alt="${name}"
                             class="tutor-avatar"
                             onerror="this.src='${getDefaultAvatar(firstName)}'">
                    </div>
                </div>

                <!-- Row 2: Name -->
                <h3 class="tutor-name" onclick="viewTutorProfile(${tutor.id})">
                    ${name}
                </h3>

                <!-- Row 3: Gender & Location -->
                <div class="tutor-meta-row">
                    <span class="tutor-gender">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        ${gender}
                    </span>
                    <span class="tutor-location">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        ${location}
                    </span>
                </div>

                <!-- Row 4: Rating & Verified -->
                <div class="tutor-rating-row">
                    <div class="tutor-rating">
                        <div class="stars-tooltip-wrapper">
                            <div class="stars">${starsHTML}</div>
                        </div>
                        <span class="rating-number">${rating}</span>
                        <span class="rating-count">(${tutor.rating_count || 0})</span>
                    </div>
                    ${tutor.is_verified ? `
                    <span class="verified-badge">
                        <svg class="icon-sm" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Verified
                    </span>
                    ` : ''}
                </div>
            </div>

            <!-- Inspirational Quote Section (Full Width) -->
            <div class="tutor-quote">
                <div class="flex items-start">
                    <svg class="w-5 h-5 mr-3 mt-1 text-purple-500 dark:text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clip-rule="evenodd"></path>
                    </svg>
                    <em>
                        "${quote}"
                    </em>
                </div>
            </div>

            <!-- Content Section -->
            <div class="tutor-content p-6 space-y-4">
                <!-- Enrolled Children Section (PARENT-SPECIFIC) -->
                <div class="enrolled-children-section">
                    <h4 class="detail-label">
                        <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                        </svg>
                        Teaching Your Children
                    </h4>
                    <div class="flex flex-wrap mt-2">${studentsInfo}</div>
                </div>

                <!-- Package -->
                <div class="subjects-section">
                    <h4 class="detail-label">
                        <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                        Package
                    </h4>
                    <p class="detail-value">${packageName}</p>
                </div>

                <!-- Tutor Details Grid (Languages + Grade Level in same row) -->
                <div class="tutor-details-grid">
                    <!-- Languages -->
                    <div class="detail-item">
                        <svg class="w-4 h-4 mr-2 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                        </svg>
                        <div>
                            <span class="detail-label">Languages</span>
                            <span class="detail-value">${languages}</span>
                        </div>
                    </div>

                    <!-- Grade Level (in same row with Languages) -->
                    <div class="detail-item">
                        <svg class="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                        </svg>
                        <div>
                            <span class="detail-label">Grade Level</span>
                            <span class="detail-value">${gradeLevel}</span>
                        </div>
                    </div>
                </div>

                <!-- Additional Details Row (Session Format) -->
                <div class="additional-details">
                    <!-- Session Format -->
                    <div class="detail-item">
                        <svg class="detail-icon text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <span class="detail-label">Session Format:</span>
                        <span class="detail-value">${sessionFormat}</span>
                    </div>
                </div>

                <!-- Bio -->
                <div class="bio-section">
                    <h4 class="detail-label">
                        <svg class="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        About
                    </h4>
                    <p class="detail-value">${bio}</p>
                </div>
            </div>

            <!-- Price Section -->
            <div class="price-section">
                <div class="tutor-price">
                    <div class="text-center">
                        <div class="price-amount">
                            ${currencySymbol}${price}
                        </div>
                        <div class="price-period">per session</div>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="tutor-actions px-6 pb-6 flex flex-row gap-3">
                <button class="message-btn flex-1"
                        onclick="messageTutor(${tutor.id}, '${name.replace(/'/g, "\\'")}')">
                    <span class="flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        Message
                    </span>
                </button>
                <button class="view-profile-btn flex-1"
                        onclick="viewTutorProfile(${tutor.id})">
                    <span class="flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        View Profile
                    </span>
                </button>
            </div>
        </article>
    `;
}

// Tutor action functions
function viewTutorProfile(userId) {
    console.log('[viewTutorProfile] Opening tutor profile:', userId);
    window.open(`/view-profiles/view-tutor.html?user_id=${userId}`, '_blank');
}

function callTutor(phone) {
    if (phone && phone !== 'Not provided') {
        window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');
    } else {
        alert('Phone number not available');
    }
}

function emailTutor(email) {
    if (email && email !== 'Not provided') {
        window.open(`mailto:${email}`, '_self');
    } else {
        alert('Email address not available');
    }
}

function messageTutor(tutorProfileId, tutorName) {
    console.log('[messageTutor] Opening chat with tutor profile_id:', tutorProfileId, 'name:', tutorName);

    // Create user object with profile_id and profile_type for chat modal
    const tutorUser = {
        profile_id: tutorProfileId,
        profile_type: 'tutor',
        name: tutorName,
        full_name: tutorName,
        role: 'tutor'
    };

    // Use ChatModalManager.open with targetUser
    if (typeof window.ChatModalManager !== 'undefined' && typeof window.ChatModalManager.open === 'function') {
        window.ChatModalManager.open(tutorUser);
    } else if (typeof openChatModal === 'function') {
        openChatModal(tutorUser);
    } else {
        alert('Chat feature coming soon!');
    }
}

// Profile and Cover Upload Modal Functions
function openCoverUploadModal() {
    // Open universal upload modal with cover type pre-selected
    const modal = document.getElementById('storyUploadModal');
    const uploadTypeSelect = document.getElementById('uploadType');

    if (modal && uploadTypeSelect) {
        // Initialize parent upload modal (hide story option)
        if (typeof initializeParentUploadModal === 'function') {
            initializeParentUploadModal();
        }

        // Set upload type to cover
        uploadTypeSelect.value = 'cover';

        // Trigger the type change to update UI
        if (typeof handleUploadTypeChange === 'function') {
            handleUploadTypeChange();
        }

        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function openProfileUploadModal() {
    // Open universal upload modal with profile type pre-selected
    const modal = document.getElementById('storyUploadModal');
    const uploadTypeSelect = document.getElementById('uploadType');

    if (modal && uploadTypeSelect) {
        // Initialize parent upload modal (hide story option)
        if (typeof initializeParentUploadModal === 'function') {
            initializeParentUploadModal();
        }

        // Set upload type to profile
        uploadTypeSelect.value = 'profile';

        // Trigger the type change to update UI
        if (typeof handleUploadTypeChange === 'function') {
            handleUploadTypeChange();
        }

        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeCoverUploadModal() {
    const modal = document.getElementById('storyUploadModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function closeProfileUploadModal() {
    const modal = document.getElementById('storyUploadModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Make tutor functions available globally
window.loadTutorInformation = loadTutorInformation;
window.viewTutorProfile = viewTutorProfile;
window.callTutor = callTutor;
window.emailTutor = emailTutor;
window.messageTutor = messageTutor;
window.openCoverUploadModal = openCoverUploadModal;
window.openProfileUploadModal = openProfileUploadModal;
window.closeCoverUploadModal = closeCoverUploadModal;
window.closeProfileUploadModal = closeProfileUploadModal;

// Note: shareProfile() is provided by share-profile-manager.js
// which is loaded after this file in parent-profile.html
