/**
 * View Request Modal
 * Displays session request details when clicked from chat
 */

// Current request data being viewed
let currentViewedRequest = null;

/**
 * Generate initials from a name (first letter of first name and father name)
 * @param {string} name - Full name
 * @returns {string} - Two letter initials
 */
function generateInitials(name) {
    if (!name || typeof name !== 'string') return '??';

    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 0) return '??';

    // Get first letter of first name
    const firstInitial = parts[0].charAt(0).toUpperCase();

    // Get first letter of second name (father name) if available
    const secondInitial = parts.length > 1 ? parts[1].charAt(0).toUpperCase() : '';

    return firstInitial + secondInitial;
}

/**
 * Generate a consistent color based on name
 * @param {string} name - Full name
 * @returns {string} - HSL color string
 */
function generateAvatarColor(name) {
    if (!name) return 'hsl(200, 70%, 50%)';

    // Generate a hash from the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use hash to generate a hue (0-360)
    const hue = Math.abs(hash % 360);

    return `hsl(${hue}, 65%, 50%)`;
}

/**
 * Set avatar with initials fallback
 * @param {HTMLElement} container - The avatar container element
 * @param {HTMLImageElement} imgElement - The image element
 * @param {string} avatarUrl - The avatar URL
 * @param {string} name - The person's name for generating initials
 */
function setAvatarWithInitialsFallback(container, imgElement, avatarUrl, name) {
    if (!container || !imgElement) return;

    // Remove any existing initials div
    const existingInitials = container.querySelector('.initials-avatar');
    if (existingInitials) {
        existingInitials.remove();
    }

    // Show image element
    imgElement.style.display = 'block';

    if (avatarUrl && avatarUrl.trim() && !avatarUrl.includes('default-avatar')) {
        imgElement.src = avatarUrl;
        imgElement.onerror = function() {
            // On error, hide image and show initials
            this.style.display = 'none';
            showInitialsAvatar(container, name);
        };
    } else {
        // No valid URL, show initials directly
        imgElement.style.display = 'none';
        showInitialsAvatar(container, name);
    }
}

/**
 * Create and show initials avatar
 * @param {HTMLElement} container - The avatar container
 * @param {string} name - The person's name
 */
function showInitialsAvatar(container, name) {
    if (!container) return;

    // Remove any existing initials
    const existing = container.querySelector('.initials-avatar');
    if (existing) existing.remove();

    const initials = generateInitials(name);
    const color = generateAvatarColor(name);

    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'initials-avatar tutor-avatar';
    initialsDiv.textContent = initials;
    initialsDiv.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${color};
        color: white;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
        border: 2px solid #f59e0b;
        box-sizing: border-box;
    `;

    container.appendChild(initialsDiv);
}

/**
 * Open the view request modal with the given request data
 * @param {Object} requestData - The session request data from the chat message
 */
async function openViewRequestModal(requestData) {
    console.log('[ViewRequestModal] Opening with data:', requestData);
    console.log('[ViewRequestModal] requestData type:', typeof requestData);
    console.log('[ViewRequestModal] package_details:', requestData?.package_details);
    console.log('[ViewRequestModal] media_metadata:', requestData?.media_metadata);
    console.log('[ViewRequestModal] requested_to_id:', requestData?.requested_to_id);
    console.log('[ViewRequestModal] requested_to_name:', requestData?.requested_to_name);
    currentViewedRequest = requestData;

    const modal = document.getElementById('view-request-modal');
    if (!modal) {
        console.error('[ViewRequestModal] Modal element not found');
        return;
    }

    // Check if requestData is valid
    if (!requestData || typeof requestData !== 'object') {
        console.error('[ViewRequestModal] Invalid requestData:', requestData);
        return;
    }

    // Parse metadata if needed
    const metadata = typeof requestData.media_metadata === 'string'
        ? JSON.parse(requestData.media_metadata)
        : (requestData.media_metadata || {});

    const pkg = requestData.package_details || {};
    let requestStatus = requestData.session_request_status || {};

    // Fetch the latest status from the API to ensure we have the current state
    const sessionRequestId = metadata.session_request_id;
    if (sessionRequestId) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (token) {
                const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/session-requests/tutor/${sessionRequestId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const latestData = await response.json();
                    console.log('[ViewRequestModal] Fetched latest status:', latestData.status);
                    // Update the status with the latest from API
                    requestStatus = { status: latestData.status };
                    // Also update metadata status for consistency
                    metadata.status = latestData.status;
                    // Update currentViewedRequest with latest data
                    currentViewedRequest.session_request_status = requestStatus;
                } else {
                    console.log('[ViewRequestModal] Could not fetch latest status, using cached data');
                }
            }
        } catch (error) {
            console.log('[ViewRequestModal] Error fetching latest status:', error.message);
            // Continue with cached data if API call fails
        }
    }

    console.log('[ViewRequestModal] Parsed - metadata:', metadata, 'pkg:', pkg, 'status:', requestStatus);

    // Check if package has been deleted
    const isPackageDeleted = !pkg.id && !pkg.name;

    // Update status badge
    const status = requestStatus.status || metadata.status || 'pending';
    if (isPackageDeleted) {
        updateStatusBadge('deleted');
    } else {
        updateStatusBadge(status);
    }

    // Package name and description
    const packageName = document.getElementById('view-request-package-name');
    const packageDesc = document.getElementById('view-request-package-desc');
    if (packageName) {
        if (isPackageDeleted) {
            packageName.textContent = 'Package Unavailable';
            packageName.style.color = '#6b7280';
        } else {
            packageName.textContent = pkg.name || 'Tutoring Package';
            packageName.style.color = '';
        }
    }
    if (packageDesc) {
        if (isPackageDeleted) {
            packageDesc.textContent = 'This package has been deleted by the tutor.';
            packageDesc.style.display = 'block';
            packageDesc.style.color = '#9ca3af';
            packageDesc.style.fontStyle = 'italic';
        } else if (pkg.description) {
            packageDesc.textContent = pkg.description;
            packageDesc.style.display = 'block';
            packageDesc.style.color = '';
            packageDesc.style.fontStyle = '';
        } else {
            packageDesc.style.display = 'none';
        }
    }

    // Tutor info
    const tutorAvatarContainer = document.getElementById('view-request-tutor-avatar-container');
    const tutorAvatar = document.getElementById('view-request-tutor-avatar');
    const tutorName = document.getElementById('view-request-tutor-name');
    const tutorDisplayName = pkg.tutor?.name || 'Tutor';

    if (tutorName && pkg.tutor) {
        tutorName.textContent = tutorDisplayName;
    }

    if (tutorAvatarContainer && tutorAvatar && pkg.tutor) {
        setAvatarWithInitialsFallback(tutorAvatarContainer, tutorAvatar, pkg.tutor.avatar, tutorDisplayName);
    }

    // Student info (who the session is for - from requested_to_id)
    const studentSection = document.getElementById('view-request-student-section');
    const studentAvatarContainer = document.getElementById('view-request-student-avatar-container');
    const studentAvatar = document.getElementById('view-request-student-avatar');
    const studentNameEl = document.getElementById('view-request-student-name');

    // Get student info from requestData (from API response)
    const requestedToName = requestData.requested_to_name;
    const requestedToId = requestData.requested_to_id;
    const requestedToAvatarUrl = requestData.requested_to_avatar;
    const studentDisplayName = requestedToName || `Student #${requestedToId}`;

    if (studentSection) {
        if (requestedToName || requestedToId) {
            // Show student section
            studentSection.style.display = 'block';
            if (studentNameEl) {
                studentNameEl.textContent = studentDisplayName;
            }
            if (studentAvatarContainer && studentAvatar) {
                setAvatarWithInitialsFallback(studentAvatarContainer, studentAvatar, requestedToAvatarUrl, studentDisplayName);
            }
        } else {
            // Hide student section if no student info
            studentSection.style.display = 'none';
        }
    }

    // Grade Level
    const gradeSection = document.getElementById('view-request-grade-section');
    const gradeContainer = document.getElementById('view-request-grade');
    if (gradeContainer) {
        if (pkg.grade_level) {
            gradeContainer.textContent = pkg.grade_level;
            if (gradeSection) gradeSection.style.display = 'block';
        } else {
            if (gradeSection) gradeSection.style.display = 'none';
        }
    }

    // Courses
    const coursesSection = document.getElementById('view-request-courses-section');
    const coursesContainer = document.getElementById('view-request-courses');
    const courses = pkg.courses || [];
    if (coursesContainer) {
        if (courses.length > 0) {
            coursesContainer.innerHTML = courses.map(course => {
                const name = typeof course === 'object' ? (course.name || course.course_name) : course;
                return `<span class="course-tag">${escapeHtml(name)}</span>`;
            }).join('');
            if (coursesSection) coursesSection.style.display = 'block';
        } else {
            if (coursesSection) coursesSection.style.display = 'none';
        }
    }

    // Session format - handle comma-separated string like "online, in-person"
    const formatSection = document.getElementById('view-request-format-section');
    const formatContainer = document.getElementById('view-request-format');
    let sessionFormats = pkg.session_format || [];
    if (typeof sessionFormats === 'string') {
        const formatLower = sessionFormats.toLowerCase().trim();
        if (formatLower === 'both' || formatLower.includes(',')) {
            // Split by comma and clean up each format
            sessionFormats = sessionFormats.split(',').map(f => f.trim()).filter(f => f);
        } else {
            sessionFormats = [sessionFormats.trim()];
        }
    }
    if (formatContainer) {
        if (sessionFormats.length > 0) {
            formatContainer.innerHTML = sessionFormats.map(format => {
                const icon = format.toLowerCase() === 'online' ? 'fa-laptop' : 'fa-users';
                return `<span class="format-tag"><i class="fas ${icon}"></i>${escapeHtml(format)}</span>`;
            }).join('');
            if (formatSection) formatSection.style.display = 'block';
        } else {
            if (formatSection) formatSection.style.display = 'none';
        }
    }

    // Requested schedule - use metadata first, fallback to package schedule
    const scheduleSection = document.getElementById('view-request-schedule-section');
    const scheduleContainer = document.getElementById('view-request-schedule');
    if (scheduleContainer) {
        let scheduleHtml = '';

        // Determine schedule type and days - prefer user's requested schedule, fallback to package
        const scheduleType = metadata.schedule_type || pkg.schedule_type;
        const scheduleDays = (metadata.days && metadata.days.length > 0) ? metadata.days : pkg.schedule_days;
        const scheduleMonths = metadata.months;
        const specificDates = metadata.specific_dates;

        if (scheduleType === 'recurring') {
            if (scheduleDays && scheduleDays.length > 0) {
                // Clean up day names (remove leading spaces)
                const cleanDays = scheduleDays.map(d => typeof d === 'string' ? d.trim() : d);
                scheduleHtml += `<div class="schedule-row"><i class="fas fa-calendar-week"></i>${cleanDays.join(', ')}</div>`;
            }
            if (scheduleMonths && scheduleMonths.length > 0) {
                const monthsDisplay = scheduleMonths.slice(0, 3).join(', ') + (scheduleMonths.length > 3 ? '...' : '');
                scheduleHtml += `<div class="schedule-row"><i class="fas fa-calendar"></i>${monthsDisplay}</div>`;
            }
        } else if (scheduleType === 'specific_dates' && specificDates) {
            const dates = Array.isArray(specificDates)
                ? specificDates.slice(0, 3).join(', ') + (specificDates.length > 3 ? '...' : '')
                : specificDates;
            scheduleHtml += `<div class="schedule-row"><i class="fas fa-calendar-day"></i>${dates}</div>`;
        }

        if (scheduleHtml) {
            scheduleContainer.innerHTML = scheduleHtml;
            if (scheduleSection) scheduleSection.style.display = 'block';
        } else {
            if (scheduleSection) scheduleSection.style.display = 'none';
        }
    }

    // Time - use metadata first, fallback to package time
    const timeSection = document.getElementById('view-request-time-section');
    const timeContainer = document.getElementById('view-request-time');
    if (timeContainer) {
        // Get times from metadata or package, format them to HH:MM
        let startTime = metadata.start_time || pkg.start_time;
        let endTime = metadata.end_time || pkg.end_time;

        // Format time to remove seconds if present (e.g., "09:00:00" -> "09:00")
        if (startTime && startTime.length > 5) startTime = startTime.substring(0, 5);
        if (endTime && endTime.length > 5) endTime = endTime.substring(0, 5);

        if (startTime && endTime) {
            timeContainer.textContent = `${startTime} - ${endTime}`;
            if (timeSection) timeSection.style.display = 'block';
        } else {
            if (timeSection) timeSection.style.display = 'none';
        }
    }

    // Pricing
    const priceContainer = document.getElementById('view-request-price');
    const paymentFreqContainer = document.getElementById('view-request-payment-freq');
    const discountsContainer = document.getElementById('view-request-discounts');
    if (priceContainer) {
        const price = pkg.hourly_rate || pkg.session_price || 0;
        priceContainer.textContent = Math.round(price);
    }
    // Payment frequency
    if (paymentFreqContainer) {
        if (pkg.payment_frequency) {
            const freqMap = {
                '2-weeks': 'Bi-weekly Payment',
                'monthly': 'Monthly Payment',
                'weekly': 'Weekly Payment'
            };
            paymentFreqContainer.textContent = freqMap[pkg.payment_frequency] || pkg.payment_frequency;
        } else {
            paymentFreqContainer.textContent = '';
        }
    }
    if (discountsContainer) {
        const discounts = [];
        if (pkg.discount_3_month > 0) discounts.push({ period: '3 Mo', discount: pkg.discount_3_month });
        if (pkg.discount_6_month > 0) discounts.push({ period: '6 Mo', discount: pkg.discount_6_month });
        if (pkg.yearly_discount > 0) discounts.push({ period: 'Year', discount: pkg.yearly_discount });

        if (discounts.length > 0) {
            discountsContainer.innerHTML = discounts.map(d =>
                `<span class="discount-tag">${d.period}: ${d.discount}% off</span>`
            ).join('');
        } else {
            discountsContainer.innerHTML = '';
        }
    }

    // Counter-Offer (show only if student/parent proposed a different price)
    const counterOfferSection = document.getElementById('view-request-counter-offer-section');
    const counterOfferPriceEl = document.getElementById('view-request-counter-offer-price');
    const listedPriceEl = document.getElementById('view-request-listed-price');

    // Get counter-offer from metadata (from chat message) or from requestData (from API)
    const counterOfferPrice = metadata.counter_offer_price || requestData.counter_offer_price;
    const listedPrice = pkg.hourly_rate || pkg.session_price || 0;

    if (counterOfferSection) {
        if (counterOfferPrice && counterOfferPrice > 0) {
            // Show counter-offer section
            counterOfferSection.style.display = 'block';
            if (counterOfferPriceEl) {
                counterOfferPriceEl.textContent = Math.round(counterOfferPrice);
            }
            if (listedPriceEl) {
                listedPriceEl.textContent = Math.round(listedPrice);
            }
        } else {
            // Hide counter-offer section if no counter-offer
            counterOfferSection.style.display = 'none';
        }
    }

    // Request meta info
    const requesterEl = document.getElementById('view-request-requester');
    const dateEl = document.getElementById('view-request-date');
    if (requesterEl) {
        const requesterType = metadata.requester_type || 'Student';
        const senderName = requestData.sender_name;
        // Show sender name if available, with type in parentheses
        if (senderName && senderName !== 'You') {
            requesterEl.textContent = `${senderName} (${requesterType.charAt(0).toUpperCase() + requesterType.slice(1)})`;
        } else {
            requesterEl.textContent = requesterType.charAt(0).toUpperCase() + requesterType.slice(1);
        }
    }
    if (dateEl) {
        const date = requestData.created_at || requestData.time;
        if (date) {
            dateEl.textContent = formatRequestDate(date);
        } else {
            dateEl.textContent = '-';
        }
    }

    // Show/hide action buttons based on user role, status, and package availability
    const actionsFooter = document.getElementById('view-request-actions');
    if (actionsFooter) {
        // Don't show actions if package is deleted
        if (isPackageDeleted) {
            actionsFooter.style.display = 'none';
        } else {
            // Detect if user is a tutor - check multiple sources
            const activeRole = window.currentRole ||
                              window.activeRole ||
                              localStorage.getItem('userRole') ||
                              localStorage.getItem('active_role') ||
                              localStorage.getItem('currentRole') ||
                              localStorage.getItem('activeRole') || '';

            // Also detect from page context - if on tutor-profile.html, user is a tutor
            const isOnTutorProfile = window.location.pathname.includes('tutor-profile');
            const isTutor = activeRole.toLowerCase() === 'tutor' || isOnTutorProfile;

            const isPending = status === 'pending';
            console.log('[ViewRequestModal] Role detection:', { activeRole, isOnTutorProfile, isTutor, isPending });
            actionsFooter.style.display = (isTutor && isPending) ? 'flex' : 'none';
        }
    }

    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Update the status badge
 */
function updateStatusBadge(status) {
    const badge = document.getElementById('view-request-status');
    if (!badge) return;

    badge.className = 'request-status-badge ' + status;

    const statusConfig = {
        pending: { icon: 'fa-clock', label: 'Pending Review' },
        accepted: { icon: 'fa-check-circle', label: 'Accepted' },
        rejected: { icon: 'fa-times-circle', label: 'Declined' },
        deleted: { icon: 'fa-trash-alt', label: 'Package Deleted' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    badge.innerHTML = `<i class="fas ${config.icon}"></i><span>${config.label}</span>`;
}

/**
 * Format the request date
 */
function formatRequestDate(dateStr) {
    if (!dateStr) return '-';

    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'long' }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        }
    } catch (e) {
        return dateStr;
    }
}

/**
 * Close the view request modal
 */
function closeViewRequestModal() {
    const modal = document.getElementById('view-request-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    currentViewedRequest = null;
}

/**
 * Accept the session request
 */
async function acceptSessionRequest() {
    if (!currentViewedRequest) return;

    const metadata = typeof currentViewedRequest.media_metadata === 'string'
        ? JSON.parse(currentViewedRequest.media_metadata)
        : (currentViewedRequest.media_metadata || {});

    const sessionRequestId = metadata.session_request_id;
    if (!sessionRequestId) {
        console.error('[ViewRequestModal] No session_request_id found');
        alert('Unable to accept request: Missing request ID');
        return;
    }

    if (!confirm('Are you sure you want to accept this session request?')) {
        return;
    }

    console.log('[ViewRequestModal] Accepting session request:', sessionRequestId);

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to accept requests');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/session-requests/tutor/${sessionRequestId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'accepted' })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to accept request');
        }

        // Update the status badge
        updateStatusBadge('accepted');

        // Hide action buttons
        const actionsFooter = document.getElementById('view-request-actions');
        if (actionsFooter) {
            actionsFooter.style.display = 'none';
        }

        // Show success message
        alert('✅ Session request accepted! The student has been added to your students list.');

        // Close modal after a short delay
        setTimeout(() => {
            closeViewRequestModal();
            // Refresh the requests list if SessionRequestManager is available
            if (typeof SessionRequestManager !== 'undefined' && typeof SessionRequestManager.loadRequests === 'function') {
                SessionRequestManager.loadRequests('pending');
            }
        }, 500);

    } catch (error) {
        console.error('[ViewRequestModal] Error accepting request:', error);
        alert('❌ Failed to accept request: ' + error.message);
    }
}

/**
 * Reject the session request
 */
async function rejectSessionRequest() {
    if (!currentViewedRequest) return;

    const metadata = typeof currentViewedRequest.media_metadata === 'string'
        ? JSON.parse(currentViewedRequest.media_metadata)
        : (currentViewedRequest.media_metadata || {});

    const sessionRequestId = metadata.session_request_id;
    if (!sessionRequestId) {
        console.error('[ViewRequestModal] No session_request_id found');
        alert('Unable to decline request: Missing request ID');
        return;
    }

    // Prompt for rejection reason
    const rejectedReason = prompt('Please provide a reason for declining this request (optional):');

    // User clicked cancel on prompt
    if (rejectedReason === null) {
        return;
    }

    if (!confirm('Are you sure you want to decline this session request?')) {
        return;
    }

    console.log('[ViewRequestModal] Rejecting session request:', sessionRequestId);

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to decline requests');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/session-requests/tutor/${sessionRequestId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'rejected',
                rejected_reason: rejectedReason || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to decline request');
        }

        // Update the status badge
        updateStatusBadge('rejected');

        // Hide action buttons
        const actionsFooter = document.getElementById('view-request-actions');
        if (actionsFooter) {
            actionsFooter.style.display = 'none';
        }

        // Show success message
        alert('Request has been declined.');

        // Close modal after a short delay
        setTimeout(() => {
            closeViewRequestModal();
            // Refresh the requests list if SessionRequestManager is available
            if (typeof SessionRequestManager !== 'undefined' && typeof SessionRequestManager.loadRequests === 'function') {
                SessionRequestManager.loadRequests('pending');
            }
        }, 500);

    } catch (error) {
        console.error('[ViewRequestModal] Error declining request:', error);
        alert('❌ Failed to decline request: ' + error.message);
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('view-request-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeViewRequestModal();
        }
    }
});

// Close modal on backdrop click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('view-request-modal');
    if (modal && e.target === modal) {
        closeViewRequestModal();
    }
});

// Export for global access
window.openViewRequestModal = openViewRequestModal;
window.closeViewRequestModal = closeViewRequestModal;
window.acceptSessionRequest = acceptSessionRequest;
window.rejectSessionRequest = rejectSessionRequest;
