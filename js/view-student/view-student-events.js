/**
 * View Student Events Manager
 * Dynamically loads and displays student events
 */

// Event type colors mapping
const EVENT_TYPE_COLORS = {
    'Workshop': { gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)' },
    'Competition': { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', border: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)' },
    'Social': { gradient: 'linear-gradient(135deg, #ec4899, #db2777)', border: '#ec4899', bg: 'rgba(236, 72, 153, 0.05)' },
    'Seminar': { gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.05)' },
    'Conference': { gradient: 'linear-gradient(135deg, #10b981, #059669)', border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' },
    'Meetup': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
    'default': { gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', border: '#6b7280', bg: 'rgba(107, 114, 128, 0.05)' }
};

/**
 * Fetch student events from API
 */
async function fetchStudentEvents(studentId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return [];
        }

        console.log(`🔍 Fetching events for student ID: ${studentId}`);
        const response = await fetch(`${API_BASE_URL}/api/student/${studentId}/events`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Events API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Events API error:', errorData);
            throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        console.log('✅ Events API success:', data);
        return data.events || [];
    } catch (error) {
        console.error('Error fetching student events:', error);
        return [];
    }
}

/**
 * Format date and time for events
 */
function formatEventDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatEventTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get time until event
 */
function getTimeUntilEvent(startDateString) {
    const now = new Date();
    const start = new Date(startDateString);
    const diff = start - now;

    if (diff < 0) {
        return 'Event started';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
        return `In ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        return 'Starting soon';
    }
}

/**
 * Get event type color
 */
function getEventTypeColor(type) {
    return EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS['default'];
}

/**
 * Render a single event card
 */
function renderEventCard(event) {
    const colors = getEventTypeColor(event.type);
    const registeredBadge = event.is_registered ? '<span class="event-registered-badge">Registered</span>' : '';
    const creatorBadge = event.is_creator ? '<span class="event-creator-badge">Organizer</span>' : '';
    const availabilityPercentage = event.available_seats ? Math.round((event.registered_count / event.available_seats) * 100) : 0;
    const spotsLeft = event.available_seats ? event.available_seats - event.registered_count : '∞';

    // Format subjects array
    const subjects = Array.isArray(event.subjects) ? event.subjects : [];
    const subjectsHTML = subjects.slice(0, 2).map(subject =>
        `<span class="event-subject-tag">${subject}</span>`
    ).join('');
    const moreSubjects = subjects.length > 2 ? `<span class="event-subject-tag">+${subjects.length - 2}</span>` : '';

    // Format grade levels
    const gradeLevels = Array.isArray(event.grade_levels) ? event.grade_levels : [];
    const gradeLevelsHTML = gradeLevels.length > 0 ? gradeLevels.slice(0, 2).join(', ') : 'All Grades';

    // Determine if event is full
    const isFull = event.available_seats && event.registered_count >= event.available_seats;

    return `
        <div class="event-card" data-event-id="${event.id}">
            <div class="event-card-header">
                ${event.event_picture ?
                    `<img src="${event.event_picture}" alt="${event.title}" class="event-card-image" />` :
                    `<div class="event-card-placeholder" style="background: ${colors.gradient};">
                        <i class="fas fa-calendar-alt"></i>
                    </div>`
                }
                <div class="event-card-badges">
                    ${registeredBadge}
                    ${creatorBadge}
                </div>
                <div class="event-time-badge">
                    ${getTimeUntilEvent(event.start_datetime)}
                </div>
            </div>

            <div class="event-card-content">
                <div class="event-card-type" style="color: ${colors.border}; background: ${colors.bg}; border-left: 3px solid ${colors.border};">
                    <i class="fas fa-bookmark"></i>
                    ${event.type}
                </div>

                <h3 class="event-card-title">${event.title}</h3>

                <p class="event-card-description">${event.description.substring(0, 120)}${event.description.length > 120 ? '...' : ''}</p>

                <div class="event-subjects">
                    ${subjectsHTML}
                    ${moreSubjects}
                </div>

                <div class="event-datetime">
                    <div class="event-datetime-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatEventDate(event.start_datetime)}</span>
                    </div>
                    <div class="event-datetime-item">
                        <i class="fas fa-clock"></i>
                        <span>${formatEventTime(event.start_datetime)} - ${formatEventTime(event.end_datetime)}</span>
                    </div>
                </div>

                <div class="event-stats">
                    <div class="event-stat-item">
                        <i class="fas fa-users"></i>
                        <span>${event.registered_count} / ${event.available_seats || '∞'} registered</span>
                    </div>
                    <div class="event-stat-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>${gradeLevelsHTML}</span>
                    </div>
                </div>

                ${event.available_seats ? `
                    <div class="event-progress">
                        <div class="event-progress-bar">
                            <div class="event-progress-fill" style="width: ${availabilityPercentage}%; background: ${colors.gradient};"></div>
                        </div>
                        <span class="event-progress-text">${spotsLeft} spots left</span>
                    </div>
                ` : ''}

                <div class="event-info">
                    <div class="event-info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${event.location}</span>
                    </div>
                    ${event.is_online ? `
                        <div class="event-info-item event-online">
                            <i class="fas fa-video"></i>
                            <span>Online Event</span>
                        </div>
                    ` : ''}
                    ${event.price > 0 ? `
                        <div class="event-info-item event-fee">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>${event.price} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
                        </div>
                    ` : `
                        <div class="event-info-item event-free">
                            <i class="fas fa-check-circle"></i>
                            <span>Free Event</span>
                        </div>
                    `}
                </div>

                <div class="event-card-actions">
                    <button class="event-view-btn" onclick="viewEventDetails(${event.id})">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                    ${!event.is_registered && !isFull ? `
                        <button class="event-register-btn" onclick="registerForEvent(${event.id})">
                            <i class="fas fa-user-plus"></i>
                            Register
                        </button>
                    ` : event.is_registered ? `
                        <button class="event-registered-btn" disabled>
                            <i class="fas fa-check"></i>
                            Registered
                        </button>
                    ` : `
                        <button class="event-full-btn" disabled>
                            <i class="fas fa-times"></i>
                            Event Full
                        </button>
                    `}
                </div>

                <div class="event-card-footer">
                    <span class="event-date">Created ${formatEventDate(event.created_at)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load and display events
 */
async function loadStudentEvents(studentId) {
    const eventsPanel = document.getElementById('events-panel');
    if (!eventsPanel) return;

    const eventsContent = eventsPanel.querySelector('.events-content');
    if (!eventsContent) {
        console.error('Events content container not found');
        return;
    }

    // Show loading state
    eventsContent.innerHTML = '<div class="events-loading"><i class="fas fa-spinner fa-spin"></i> Loading events...</div>';

    try {
        const events = await fetchStudentEvents(studentId);
        console.log('📊 Fetched events data:', events);

        if (!events || events.length === 0) {
            eventsContent.innerHTML = `
                <div class="events-empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>No Events Yet</h3>
                    <p>This student hasn't registered for or created any events yet.</p>
                </div>
            `;
            return;
        }

        // Render events in grid
        const cardsHTML = events.map(event => renderEventCard(event)).join('');
        console.log('🎨 Rendering events cards HTML length:', cardsHTML.length);
        console.log('🎨 First event card preview:', cardsHTML.substring(0, 200));

        eventsContent.innerHTML = `
            <div class="events-grid">
                ${cardsHTML}
            </div>
        `;

        console.log('✅ Events cards rendered to DOM');

    } catch (error) {
        console.error('Error loading events:', error);
        eventsContent.innerHTML = `
            <div class="events-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load events. Please try again.</p>
            </div>
        `;
    }
}

/**
 * View event details (placeholder function)
 */
function viewEventDetails(eventId) {
    console.log('Viewing event details for event ID:', eventId);
    // TODO: Implement event details modal or navigation
    alert(`Event details functionality coming soon! Event ID: ${eventId}`);
}

/**
 * Register for an event
 */
async function registerForEvent(eventId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to register for an event');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Successfully registered for the event!');
            // Reload events to update UI
            const urlParams = new URLSearchParams(window.location.search);
            const studentId = urlParams.get('id');
            if (studentId) {
                loadStudentEvents(studentId);
            }
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to register for event');
        }
    } catch (error) {
        console.error('Error registering for event:', error);
        alert('Failed to register for event. Please try again.');
    }
}

// Make functions globally available
window.viewEventDetails = viewEventDetails;
window.registerForEvent = registerForEvent;
window.loadStudentEvents = loadStudentEvents;
