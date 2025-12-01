/**
 * Events and Clubs Manager
 * Handles creation, editing, and management of events and clubs
 */

// API_BASE_URL is already defined globally in package-manager-clean.js

// ============================================
// IMAGE UPLOAD PREVIEW HANDLERS
// ============================================

// Event picture preview
document.addEventListener('DOMContentLoaded', () => {
    const eventPictureInput = document.getElementById('event-picture');
    const eventPicturePreview = document.getElementById('event-picture-preview');
    const eventUploadPlaceholder = document.querySelector('#event-image-upload .upload-placeholder');

    if (eventPictureInput) {
        eventPictureInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    eventPicturePreview.src = e.target.result;
                    eventPicturePreview.classList.remove('hidden');
                    if (eventUploadPlaceholder) {
                        eventUploadPlaceholder.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Club picture preview
    const clubPictureInput = document.getElementById('club-picture');
    const clubPicturePreview = document.getElementById('club-picture-preview');
    const clubUploadPlaceholder = document.querySelector('#club-image-upload .upload-placeholder');

    if (clubPictureInput) {
        clubPictureInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    clubPicturePreview.src = e.target.result;
                    clubPicturePreview.classList.remove('hidden');
                    if (clubUploadPlaceholder) {
                        clubUploadPlaceholder.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Club paid membership toggle
    const clubIsPaid = document.getElementById('club-is-paid');
    const membershipFeeGroup = document.getElementById('membership-fee-group');

    if (clubIsPaid && membershipFeeGroup) {
        clubIsPaid.addEventListener('change', (e) => {
            if (e.target.checked) {
                membershipFeeGroup.style.display = 'block';
                document.getElementById('club-membership-fee').required = true;
            } else {
                membershipFeeGroup.style.display = 'none';
                document.getElementById('club-membership-fee').required = false;
            }
        });
    }
});

// ============================================
// FORM SUBMISSION HANDLERS
// ============================================

// Create Event Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const createEventForm = document.getElementById('create-event-form');

    if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                // Show loading state
                const submitBtn = createEventForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating...';

                // Get form values
                const eventPictureFile = document.getElementById('event-picture').files[0];
                const title = document.getElementById('event-title').value;
                const type = document.getElementById('event-type').value;
                const description = document.getElementById('event-description').value;
                const location = document.getElementById('event-location').value;
                const isOnline = document.getElementById('event-is-online').checked;
                const startDatetime = document.getElementById('event-start-datetime').value;
                const endDatetime = document.getElementById('event-end-datetime').value;
                const availableSeats = parseInt(document.getElementById('event-seats').value);
                const price = parseFloat(document.getElementById('event-price').value) || 0;
                const subjectsInput = document.getElementById('event-subjects').value;
                const gradeLevelsInput = document.getElementById('event-grade-levels').value;
                const requirements = document.getElementById('event-requirements').value;

                // Parse comma-separated values
                const subjects = subjectsInput ? subjectsInput.split(',').map(s => s.trim()).filter(s => s) : [];
                const gradeLevels = gradeLevelsInput ? gradeLevelsInput.split(',').map(g => g.trim()).filter(g => g) : [];

                // Upload image if provided
                let eventPictureUrl = null;
                if (eventPictureFile) {
                    eventPictureUrl = await uploadImage(eventPictureFile, 'event');
                }

                // Prepare event data
                const eventData = {
                    event_picture: eventPictureUrl,
                    title,
                    type,
                    description,
                    location,
                    is_online: isOnline,
                    start_datetime: startDatetime,
                    end_datetime: endDatetime,
                    available_seats: availableSeats,
                    price,
                    subjects,
                    grade_levels: gradeLevels,
                    requirements: requirements || null
                };

                // Get auth token
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Please log in to create events');
                }

                // Create event via API
                const response = await fetch(`${API_BASE_URL}/api/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(eventData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to create event');
                }

                const result = await response.json();

                // Show success notification
                showNotification('Event created successfully!', 'success');

                // Reset form
                createEventForm.reset();
                document.getElementById('event-picture-preview').classList.add('hidden');
                document.querySelector('#event-image-upload .upload-placeholder').style.display = 'block';

                // Close modal
                closeModal('create-event-modal');

                // Reload events
                loadEventsSection();

            } catch (error) {
                console.error('Error creating event:', error);
                showNotification(error.message || 'Failed to create event', 'error');
            } finally {
                // Reset button
                const submitBtn = createEventForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Event';
            }
        });
    }
});

// Create Club Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const createClubForm = document.getElementById('create-club-form');

    if (createClubForm) {
        createClubForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                // Show loading state
                const submitBtn = createClubForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating...';

                // Get form values
                const clubPictureFile = document.getElementById('club-picture').files[0];
                const title = document.getElementById('club-title').value;
                const category = document.getElementById('club-category').value;
                const description = document.getElementById('club-description').value;
                const memberLimit = parseInt(document.getElementById('club-member-limit').value);
                const membershipType = document.querySelector('input[name="membership-type"]:checked').value;
                const isPaid = document.getElementById('club-is-paid').checked;
                const membershipFee = isPaid ? parseFloat(document.getElementById('club-membership-fee').value) || 0 : 0;
                const subjectsInput = document.getElementById('club-subjects').value;
                const meetingSchedule = document.getElementById('club-meeting-schedule').value;
                const meetingLocation = document.getElementById('club-meeting-location').value;
                const rules = document.getElementById('club-rules').value;

                // Parse comma-separated values
                const subjects = subjectsInput ? subjectsInput.split(',').map(s => s.trim()).filter(s => s) : [];

                // Upload image if provided
                let clubPictureUrl = null;
                if (clubPictureFile) {
                    clubPictureUrl = await uploadImage(clubPictureFile, 'club');
                }

                // Prepare club data
                const clubData = {
                    club_picture: clubPictureUrl,
                    title,
                    category,
                    description,
                    member_limit: memberLimit,
                    membership_type: membershipType,
                    is_paid: isPaid,
                    membership_fee: membershipFee,
                    subjects,
                    meeting_schedule: meetingSchedule || null,
                    meeting_location: meetingLocation || null,
                    rules: rules || null
                };

                // Get auth token
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Please log in to create clubs');
                }

                // Create club via API
                const response = await fetch(`${API_BASE_URL}/api/clubs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(clubData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to create club');
                }

                const result = await response.json();

                // Show success notification
                showNotification('Club created successfully!', 'success');

                // Reset form
                createClubForm.reset();
                document.getElementById('club-picture-preview').classList.add('hidden');
                document.querySelector('#club-image-upload .upload-placeholder').style.display = 'block';
                document.getElementById('membership-fee-group').style.display = 'none';

                // Close modal
                closeModal('create-club-modal');

                // Reload clubs
                loadClubsSection();

            } catch (error) {
                console.error('Error creating club:', error);
                showNotification(error.message || 'Failed to create club', 'error');
            } finally {
                // Reset button
                const submitBtn = createClubForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Club';
            }
        });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Upload image to Backblaze B2
 */
async function uploadImage(file, type) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload image');
        }

        const result = await response.json();
        return result.url || result.file_url;
    } catch (error) {
        console.error('Image upload error:', error);
        throw error;
    }
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Check if TutorProfileUI exists (from other modules)
    if (typeof TutorProfileUI !== 'undefined' && TutorProfileUI.showNotification) {
        TutorProfileUI.showNotification(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Export functions to window for global access
window.uploadEventClubImage = uploadImage;
window.showEventClubNotification = showNotification;
