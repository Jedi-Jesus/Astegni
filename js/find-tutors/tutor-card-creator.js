// ============================================
// TUTOR CARD CREATION MODULE
// ============================================

const TutorCardCreator = {
    createTutorCard(tutor) {
        // Ensure tutor has required properties with defaults
        // Handle both naming conventions:
        // - Ethiopian: first_name + father_name (+ grandfather_name)
        // - International: first_name + last_name
        let tutorName;
        if (tutor.full_name) {
            // If full_name is already provided, use it
            tutorName = tutor.full_name;
        } else if (tutor.last_name) {
            // International naming: first_name + last_name
            tutorName = `${tutor.first_name || 'Unknown'} ${tutor.last_name}`.trim();
        } else {
            // Ethiopian naming: first_name + father_name
            tutorName = `${tutor.first_name || 'Unknown'} ${tutor.father_name || 'Tutor'}`.trim();
        }

        const firstName = tutor.first_name || tutorName.split(' ')[0];
        const profilePicture = tutor.profile_picture || this.getDefaultAvatar(firstName);
        const bio = tutor.bio || 'Experienced educator dedicated to helping students succeed.';

        // Use ACTUAL rating from database (show 0 if no reviews, don't default to 4.0)
        const rating = tutor.rating !== undefined && tutor.rating !== null
            ? parseFloat(tutor.rating)
            : 0.0;  // Show 0 stars if no reviews instead of fake 4.0

        // Use ACTUAL price from database
        const price = tutor.price || 0;

        // Use logged-in user's currency symbol (based on their GPS-detected location)
        // Falls back to 'Br' (Ethiopian Birr) if user hasn't set location yet
        const currencySymbol = CurrencyManager.getSymbol();

        const location = tutor.location || 'Not specified';

        // Use ACTUAL gender from database
        const gender = tutor.gender || 'Not specified';

        // Use ACTUAL data from credentials table where is_current=true
        const teachesAt = tutor.teaches_at || 'Not provided';

        // Experience is now a count of experience credentials from the credentials table
        const experienceCount = tutor.experience || 0;
        const totalExperience = experienceCount > 0 ? `${experienceCount} credential${experienceCount > 1 ? 's' : ''}` : 'New tutor';
        const education = tutor.education_level || '';
        const specialization = tutor.specialization || '';

        // Use ACTUAL languages from database
        const languages = Array.isArray(tutor.languages) && tutor.languages.length > 0
                         ? tutor.languages.join(', ')
                         : 'Not specified';

        // Use ACTUAL grades from database
        const gradeLevel = Array.isArray(tutor.grades) && tutor.grades.length > 0
                          ? tutor.grades.join(', ')
                          : 'Not specified';

        // Use ACTUAL sessionFormat from database
        const sessionFormat = tutor.sessionFormat || 'Not specified';

        // Use ACTUAL courses from database (not subjects_expertise which was removed)
        let subjects = Array.isArray(tutor.courses) && tutor.courses.length > 0
            ? tutor.courses.slice(0, 3).join(', ')
            : 'Various subjects';

        // Try to extract from bio if no subjects found
        if (subjects === 'Various subjects' && tutor.bio && tutor.bio.includes('Specialized in')) {
            const bioSubjects = tutor.bio.split('Specialized in')[1]?.split('.')[0]?.split(',') || [];
            const extractedSubjects = bioSubjects.map(s => s.trim()).filter(s => s);
            if (extractedSubjects.length > 0) {
                subjects = extractedSubjects.slice(0, 3).join(', ');
            }
        }

        // Check if tutor is in favorites/saved/connected
        const isFavorited = this.isInLocalStorage('favoriteTutors', tutor.id);
        const isSaved = this.isInLocalStorage('savedTutors', tutor.id);
        const isConnected = tutor.is_connected || this.isInLocalStorage('connectedTutors', tutor.id);
        const isPending = tutor.connection_pending || false;
        const isIncoming = tutor.connection_incoming || false;
        const connectionId = tutor.connection_id || null;

        // Generate rating stars
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        const starsHTML = '★'.repeat(fullStars) +
                         (hasHalfStar ? '☆' : '') +
                         '☆'.repeat(emptyStars);

        // Use ACTUAL quote from database
        const quote = tutor.quote || "Dedicated to student success";

        // Create category breakdown based on overall rating
        // Use actual breakdown if available from tutor, otherwise use 0 (no reviews)
        // The 4-factor rating system: Subject Matter, Communication, Discipline, Punctuality
        const ratingBreakdown = {
            subject_matter: tutor.subject_matter_rating ?? tutor.subject_matter ?? rating,
            communication_skills: tutor.communication_skills_rating ?? tutor.communication_skills ?? rating,
            discipline: tutor.discipline_rating ?? tutor.discipline ?? rating,
            punctuality: tutor.punctuality_rating ?? tutor.punctuality ?? rating
        };

        // Add subtle premium styling without badge
        const premiumClass = tutor.is_premium ? 'ring-2 ring-yellow-400/30 shadow-xl' : '';

        return `
            <article class="tutor-card group relative ${premiumClass}"
                     data-gender="${gender}"
                     data-location="${location}"
                     data-rating="${rating}">

                <!-- Header Section - Stacked Layout -->
                <div class="tutor-header">
                    <!-- Row 1: Avatar + Action Buttons -->
                    <div class="tutor-avatar-row">
                        <div class="tutor-avatar-container">
                            <img src="${profilePicture}"
                                 alt="${tutorName}"
                                 class="tutor-avatar"
                                 onerror="this.src='${this.getDefaultAvatar(firstName)}'">
                        </div>
                        <div class="tutor-actions-top">
                            <button class="favorite-btn ${isFavorited ? 'active' : ''}"
                                    data-id="${tutor.id}"
                                    onclick="toggleFavorite(${tutor.id})"
                                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                                <svg class="w-5 h-5" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                </svg>
                            </button>
                            <button class="save-btn ${isSaved ? 'active' : ''}"
                                    data-id="${tutor.id}"
                                    onclick="toggleSave(${tutor.id})"
                                    title="${isSaved ? 'Remove from saved' : 'Save for later'}">
                                <svg class="w-5 h-5" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Row 2: Name -->
                    <h3 class="tutor-name" onclick="viewTutorProfile(${tutor.id})">
                        ${tutorName} ${education && education !== 'Certified Educator' ? `<span class="tutor-education">(${education})</span>` : ''}
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
                                <!-- Interactive Rating Tooltip -->
                                <div class="rating-breakdown-tooltip">
                                    <div class="rating-tooltip-header">
                                        <h4>Rating Breakdown</h4>
                                    </div>
                                    <div class="rating-bars">
                                        ${this.createRatingBar('Subject Understanding', ratingBreakdown.subject_matter)}
                                        ${this.createRatingBar('Communication', ratingBreakdown.communication_skills)}
                                        ${this.createRatingBar('Discipline', ratingBreakdown.discipline)}
                                        ${this.createRatingBar('Punctuality', ratingBreakdown.punctuality)}
                                    </div>
                                    <div class="tooltip-arrow"></div>
                                </div>
                            </div>
                            <span class="rating-number">${rating}</span>
                            <span class="rating-count">(${tutor.rating_count || 0})</span>
                        </div>
                        <span class="verified-badge">
                            <svg class="icon-sm" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            Verified
                        </span>
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

                <!-- Meta Info (visible in list view) -->
                <div class="tutor-meta-info-list">
                    <span class="meta-info-item">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        ${gender}
                    </span>
                    <span class="meta-info-separator">•</span>
                    <span class="meta-info-item">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        ${location}
                    </span>
                    <span class="meta-info-separator">•</span>
                    <span class="meta-info-item">
                        <span class="stars-small">${starsHTML}</span>
                        <span class="rating-small">${rating}</span>
                    </span>
                </div>

                <!-- Content Section -->
                <div class="tutor-content p-6 space-y-4">
                    <!-- Subjects -->
                    <div class="subjects-section">
                        <h4 class="detail-label">
                            <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            Subjects
                        </h4>
                        <p class="detail-value">${subjects}</p>
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

                    <!-- Additional Details Row (Total Experience, Session Format, Currently Teaches At) -->
                    <div class="additional-details">
                        <!-- Total Experience -->
                        <div class="detail-item">
                            <svg class="detail-icon text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span class="detail-label">Total Experience:</span>
                            <span class="detail-value">${totalExperience}</span>
                        </div>

                        <!-- Session Format -->
                        <div class="detail-item">
                            <svg class="detail-icon text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span class="detail-label">Session Format:</span>
                            <span class="detail-value">${sessionFormat}</span>
                        </div>

                        <!-- Currently Teaches At -->
                        <div class="detail-item tutor-teaches-at">
                            <svg class="detail-icon text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            <span class="detail-label">Currently Teaches At:</span>
                            <span class="detail-value">${teachesAt}</span>
                        </div>
                    </div>

                    <!-- Specialization (if available) -->
                    ${specialization ? `
                    <div class="specialization-section">
                        <h4 class="detail-label">
                            <svg class="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            Specialization
                        </h4>
                        <p class="detail-item">${specialization}</p>
                    </div>
                    ` : ''}

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
                            onclick="messageTutor(${tutor.id})">
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            Message
                        </span>
                    </button>
                    ${isConnected ? `
                    <button class="connected-btn flex-1" disabled>
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Connected
                        </span>
                    </button>
                    ` : isIncoming ? `
                    <button class="accept-btn flex-1"
                            onclick="acceptConnectionRequest(${connectionId}, '${tutorName.replace(/'/g, "\\'")}')"
                            data-connection-id="${connectionId}">
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Accept Request
                        </span>
                    </button>
                    ` : isPending ? `
                    <button class="pending-btn flex-1" disabled>
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Pending
                        </span>
                    </button>
                    ` : `
                    <button class="connect-btn flex-1"
                            onclick="connectWithTutor(${tutor.id}, '${tutorName.replace(/'/g, "\\'")}')"
                            data-tutor-id="${tutor.id}">
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                            </svg>
                            Connect
                        </span>
                    </button>
                    `}
                </div>
            </article>
        `;
    },


    getDefaultAvatar(firstName) {
        const avatars = [
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
        ];
        return avatars[firstName.charCodeAt(0) % avatars.length];
    },

    getRandomQuote() {
        const quotes = [
            "Education is the key that opens the door to endless possibilities",
            "Learning never exhausts the mind - Leonardo da Vinci",
            "The beautiful thing about learning is nobody can take it away from you",
            "Education is not preparation for life; education is life itself",
            "Knowledge is power, but enthusiasm pulls the switch",
            "Every student can learn, just not on the same day or in the same way",
            "The best teachers are those who show you where to look but don't tell you what to see"
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    },

    isInLocalStorage(key, tutorId) {
        try {
            const items = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(items) && items.includes(tutorId);
        } catch (e) {
            return false;
        }
    },

    createRatingBar(label, value) {
        // Handle undefined, null, or string values
        const numValue = parseFloat(value) || 0;
        const percentage = (Math.max(0, Math.min(5, numValue)) / 5) * 100;
        const formattedValue = numValue.toFixed(1);

        return `
            <div class="rating-bar-item flex items-center justify-between text-xs">
                <span class="rating-bar-label text-gray-600 dark:text-gray-400 min-w-20">${label}</span>
                <div class="rating-bar-container flex-1 mx-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div class="rating-bar-fill h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                         style="width: ${percentage}%"></div>
                </div>
                <span class="rating-bar-value text-gray-700 dark:text-gray-300 font-medium min-w-8">${formattedValue}</span>
            </div>
        `;
    }
};