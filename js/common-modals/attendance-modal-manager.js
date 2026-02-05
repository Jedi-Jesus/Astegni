/**
 * Attendance Modal Manager
 * Handles attendance suggestion and manual marking modals
 */

let currentSessionId = null;
let attendanceSuggestionData = null;
let selectedTutorStatus = null;
let selectedStudentStatus = null;

/**
 * Open attendance suggestion modal and fetch AI suggestion
 * @param {number} sessionId - Session ID to get attendance for
 */
async function openAttendanceSuggestionModal(sessionId) {
    currentSessionId = sessionId;

    // Show modal
    const modal = document.getElementById('attendance-suggestion-modal');
    if (!modal) {
        console.error('Attendance suggestion modal not found');
        return;
    }

    modal.style.display = 'flex';

    // Show loading state
    document.getElementById('attendance-loading').style.display = 'block';
    document.getElementById('attendance-no-data').style.display = 'none';
    document.getElementById('attendance-suggestion-content').style.display = 'none';
    document.getElementById('apply-suggestion-btn').style.display = 'none';
    document.getElementById('manual-override-btn').style.display = 'none';

    // Fetch attendance suggestion
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to view attendance suggestions');
            closeAttendanceSuggestionModal();
            return;
        }

        const response = await fetch(
            `${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions/${sessionId}/attendance-suggestion`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch attendance suggestion');
        }

        const data = await response.json();
        attendanceSuggestionData = data;

        // Hide loading
        document.getElementById('attendance-loading').style.display = 'none';

        // Check if whiteboard data exists
        if (!data.has_whiteboard) {
            document.getElementById('attendance-no-data').style.display = 'block';
            return;
        }

        // Display suggestion
        displayAttendanceSuggestion(data);

    } catch (error) {
        console.error('Error fetching attendance suggestion:', error);
        document.getElementById('attendance-loading').style.display = 'none';
        alert('Failed to load attendance suggestion. Please try again.');
        closeAttendanceSuggestionModal();
    }
}

/**
 * Display attendance suggestion data in the modal
 */
function displayAttendanceSuggestion(data) {
    // Show content
    document.getElementById('attendance-suggestion-content').style.display = 'block';
    document.getElementById('apply-suggestion-btn').style.display = 'inline-flex';
    document.getElementById('manual-override-btn').style.display = 'inline-flex';

    // Overall recommendation banner
    const banner = document.getElementById('attendance-recommendation-banner');
    const bannerText = document.getElementById('attendance-recommendation-text');
    bannerText.textContent = data.overall_recommendation;

    // Determine banner color based on confidence
    if (data.tutor_confidence === 'high' && data.student_confidence === 'high') {
        banner.className = 'alert success';
    } else if (data.tutor_confidence === 'low' || data.student_confidence === 'low') {
        banner.className = 'alert warning';
    } else {
        banner.className = 'alert info';
    }

    // Tutor attendance
    displayAttendanceCard('tutor', {
        status: data.tutor_status_suggestion,
        confidence: data.tutor_confidence,
        metrics: data.tutor_metrics
    });

    // Student attendance
    displayAttendanceCard('student', {
        status: data.student_status_suggestion,
        confidence: data.student_confidence,
        metrics: data.student_metrics
    });
}

/**
 * Display individual attendance card (tutor or student)
 */
function displayAttendanceCard(type, data) {
    // Status badge
    const badgeEl = document.getElementById(`${type}-status-badge`);
    const statusClass = data.status === 'present' ? 'present' :
                       data.status === 'late' ? 'late' : 'absent';
    badgeEl.innerHTML = `<span class="attendance-status-badge ${statusClass}">${data.status}</span>`;

    // Metrics
    if (data.metrics.connected) {
        const latenessMin = data.metrics.lateness_minutes || 0;
        document.getElementById(`${type}-lateness`).innerHTML =
            latenessMin === 0 ? '<span style="color: #10B981;">On Time</span>' :
            latenessMin < 5 ? `<span style="color: #10B981;">${latenessMin} min</span>` :
            latenessMin < 15 ? `<span style="color: #F59E0B;">${latenessMin} min</span>` :
            `<span style="color: #EF4444;">${latenessMin} min</span>`;

        const engagement = data.metrics.engagement_percentage || 0;
        document.getElementById(`${type}-engagement`).innerHTML =
            engagement >= 70 ? `<span style="color: #10B981;">${engagement}%</span>` :
            engagement >= 40 ? `<span style="color: #F59E0B;">${engagement}%</span>` :
            `<span style="color: #EF4444;">${engagement}%</span>`;

        const activeMin = data.metrics.active_minutes || 0;
        document.getElementById(`${type}-active-time`).textContent = `${activeMin} min`;
    } else {
        document.getElementById(`${type}-lateness`).innerHTML = '<span style="color: #9CA3AF;">N/A</span>';
        document.getElementById(`${type}-engagement`).innerHTML = '<span style="color: #9CA3AF;">N/A</span>';
        document.getElementById(`${type}-active-time`).innerHTML = '<span style="color: #9CA3AF;">N/A</span>';
    }

    // Confidence indicator
    const confidenceEl = document.getElementById(`${type}-confidence`);
    const confidenceIcon = data.confidence === 'high' ? 'fa-check-circle' :
                          data.confidence === 'medium' ? 'fa-exclamation-circle' :
                          'fa-times-circle';
    const confidenceColor = data.confidence === 'high' ? '#10B981' :
                           data.confidence === 'medium' ? '#F59E0B' :
                           '#EF4444';

    confidenceEl.innerHTML = `
        <i class="fas ${confidenceIcon}" style="color: ${confidenceColor}; margin-right: 8px;"></i>
        <strong>Confidence:</strong> ${data.confidence.toUpperCase()}
        ${data.metrics.reason ? ` - ${data.metrics.reason}` : ''}
    `;
}

/**
 * Apply the AI attendance suggestion
 */
async function applyAttendanceSuggestion() {
    if (!currentSessionId || !attendanceSuggestionData) {
        alert('No attendance suggestion available');
        return;
    }

    const btn = document.getElementById('apply-suggestion-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to mark attendance');
            return;
        }

        const response = await fetch(
            `${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions/${currentSessionId}/attendance`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    use_suggestion: true
                })
            }
        );

        if (!response.ok) {
            throw new Error('Failed to apply attendance suggestion');
        }

        const result = await response.json();
        console.log('✅ Attendance applied:', result);

        alert('Attendance marked successfully!');
        closeAttendanceSuggestionModal();

        // Reload sessions if function exists
        if (typeof loadSessions === 'function') {
            loadSessions();
        }

    } catch (error) {
        console.error('Error applying attendance suggestion:', error);
        alert('Failed to apply attendance. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Apply Suggestion';
    }
}

/**
 * Close attendance suggestion modal
 */
function closeAttendanceSuggestionModal() {
    const modal = document.getElementById('attendance-suggestion-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentSessionId = null;
    attendanceSuggestionData = null;
}

/**
 * Open manual attendance marking modal
 */
function openManualAttendanceModal(sessionId = null) {
    // Close suggestion modal if open
    closeAttendanceSuggestionModal();

    // Set session ID (use from suggestion modal if not provided)
    if (sessionId) {
        currentSessionId = sessionId;
    }

    if (!currentSessionId) {
        alert('No session selected');
        return;
    }

    // Show modal
    const modal = document.getElementById('mark-attendance-modal');
    if (!modal) {
        console.error('Mark attendance modal not found');
        return;
    }

    modal.style.display = 'flex';

    // Reset form
    selectedTutorStatus = null;
    selectedStudentStatus = null;
    document.getElementById('attendance-notes').value = '';
    document.querySelectorAll('.attendance-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

/**
 * Select attendance status (tutor or student)
 */
function selectAttendanceStatus(type, status, button) {
    if (type === 'tutor') {
        selectedTutorStatus = status;
        // Remove selected class from all tutor buttons
        document.querySelectorAll('.attendance-option-btn[data-type="tutor"]').forEach(btn => {
            btn.classList.remove('selected');
        });
    } else {
        selectedStudentStatus = status;
        // Remove selected class from all student buttons
        document.querySelectorAll('.attendance-option-btn[data-type="student"]').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    // Add selected class to clicked button
    button.classList.add('selected');
}

/**
 * Submit manual attendance
 */
async function submitManualAttendance() {
    if (!selectedTutorStatus && !selectedStudentStatus) {
        alert('Please select attendance status for at least one person');
        return;
    }

    const btn = document.getElementById('submit-attendance-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to mark attendance');
            return;
        }

        const notes = document.getElementById('attendance-notes').value.trim();

        const body = {
            use_suggestion: false
        };

        if (selectedTutorStatus) {
            body.tutor_attendance_status = selectedTutorStatus;
        }
        if (selectedStudentStatus) {
            body.student_attendance_status = selectedStudentStatus;
        }
        if (notes) {
            body.attendance_notes = notes;
        }

        const response = await fetch(
            `${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions/${currentSessionId}/attendance`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            throw new Error('Failed to mark attendance');
        }

        const result = await response.json();
        console.log('✅ Attendance marked:', result);

        alert('Attendance marked successfully!');
        closeMarkAttendanceModal();

        // Reload sessions if function exists
        if (typeof loadSessions === 'function') {
            loadSessions();
        }

    } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Failed to mark attendance. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Attendance';
    }
}

/**
 * Close manual attendance modal
 */
function closeMarkAttendanceModal() {
    const modal = document.getElementById('mark-attendance-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    selectedTutorStatus = null;
    selectedStudentStatus = null;
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'attendance-suggestion-modal') {
        closeAttendanceSuggestionModal();
    }
    if (e.target.id === 'mark-attendance-modal') {
        closeMarkAttendanceModal();
    }
});

console.log('✅ Attendance Modal Manager loaded');
