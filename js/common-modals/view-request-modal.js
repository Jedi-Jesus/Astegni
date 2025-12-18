/**
 * View Request Modal
 * Displays session request details when clicked from chat
 */

// Current request data being viewed
let currentViewedRequest = null;

/**
 * Open the view request modal with the given request data
 * @param {Object} requestData - The session request data from the chat message
 */
function openViewRequestModal(requestData) {
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
    const requestStatus = requestData.session_request_status || {};

    console.log('[ViewRequestModal] Parsed - metadata:', metadata, 'pkg:', pkg, 'status:', requestStatus);

    // Update status badge
    const status = requestStatus.status || metadata.status || 'pending';
    updateStatusBadge(status);

    // Package name and description
    const packageName = document.getElementById('view-request-package-name');
    const packageDesc = document.getElementById('view-request-package-desc');
    if (packageName) packageName.textContent = pkg.name || 'Tutoring Package';
    if (packageDesc) {
        if (pkg.description) {
            packageDesc.textContent = pkg.description;
            packageDesc.style.display = 'block';
        } else {
            packageDesc.style.display = 'none';
        }
    }

    // Tutor info
    const tutorAvatar = document.getElementById('view-request-tutor-avatar');
    const tutorName = document.getElementById('view-request-tutor-name');
    if (tutorAvatar && pkg.tutor) {
        tutorAvatar.src = pkg.tutor.avatar || '/system_images/default-avatar.svg';
        tutorAvatar.onerror = function() { this.src = '/system_images/default-avatar.svg'; };
    }
    if (tutorName && pkg.tutor) {
        tutorName.textContent = pkg.tutor.name || 'Tutor';
    }

    // Student info (who the session is for - from requested_to_id)
    const studentSection = document.getElementById('view-request-student-section');
    const studentAvatar = document.getElementById('view-request-student-avatar');
    const studentNameEl = document.getElementById('view-request-student-name');

    // Get student info from requestData (from API response)
    const requestedToName = requestData.requested_to_name;
    const requestedToId = requestData.requested_to_id;
    const requestedToAvatarUrl = requestData.requested_to_avatar;

    if (studentSection) {
        if (requestedToName || requestedToId) {
            // Show student section
            studentSection.style.display = 'block';
            if (studentNameEl) {
                studentNameEl.textContent = requestedToName || `Student #${requestedToId}`;
            }
            if (studentAvatar) {
                studentAvatar.src = requestedToAvatarUrl || '/system_images/default-avatar.svg';
                studentAvatar.onerror = function() { this.src = '/system_images/default-avatar.svg'; };
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

    // Request meta info
    const requesterEl = document.getElementById('view-request-requester');
    const dateEl = document.getElementById('view-request-date');
    if (requesterEl) {
        const requesterType = metadata.requester_type || 'Student';
        requesterEl.textContent = requesterType.charAt(0).toUpperCase() + requesterType.slice(1);
    }
    if (dateEl) {
        const date = requestData.created_at || requestData.time;
        if (date) {
            dateEl.textContent = formatRequestDate(date);
        } else {
            dateEl.textContent = '-';
        }
    }

    // Show/hide action buttons based on user role and status
    const actionsFooter = document.getElementById('view-request-actions');
    if (actionsFooter) {
        // Only show actions if user is the tutor and status is pending
        const isTutor = window.currentRole === 'tutor' || window.activeRole === 'tutor';
        const isPending = status === 'pending';
        actionsFooter.style.display = (isTutor && isPending) ? 'flex' : 'none';
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
        rejected: { icon: 'fa-times-circle', label: 'Declined' }
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
 * Accept the session request (placeholder - implement actual API call)
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

    console.log('[ViewRequestModal] Accepting session request:', sessionRequestId);

    // TODO: Implement actual API call to accept the request
    // For now, just show a message
    alert('Accept functionality will be implemented - Request ID: ' + sessionRequestId);
}

/**
 * Reject the session request (placeholder - implement actual API call)
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

    console.log('[ViewRequestModal] Rejecting session request:', sessionRequestId);

    // TODO: Implement actual API call to reject the request
    // For now, just show a message
    alert('Decline functionality will be implemented - Request ID: ' + sessionRequestId);
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
