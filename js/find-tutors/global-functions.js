// ============================================
// GLOBAL FUNCTIONS (for HTML onclick handlers)
// ============================================

window.viewTutorProfile = function(tutorId) {
    // Track search history when viewing a tutor
    const searchTerm = document.getElementById('searchBar')?.value?.trim();
    if (searchTerm) {
        PreferencesManager.addTutorViewToHistory(searchTerm, tutorId);
    }

    // Navigate to tutor profile page in new tab
    const url = `../view-profiles/view-tutor.html?id=${tutorId}`;
    window.open(url, '_blank');
}

window.connectWithTutor = function(tutorId, tutorName) {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
        // Open login modal or redirect to login
        if (window.openAuthModal) {
            window.openAuthModal('login');
        } else {
            alert('Please log in to connect with tutors');
        }
        return;
    }

    // Show connection confirmation
    const confirmed = confirm(`Would you like to connect with ${tutorName || 'this tutor'}? This will send them a connection request.`);
    if (!confirmed) return;

    // Make API call to create connection
    fetch('/api/connections/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            tutor_id: tutorId,
            message: `Hi ${tutorName || 'there'}, I would like to connect with you for tutoring services.`
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Connection request sent to ${tutorName || 'tutor'} successfully!`);
        } else {
            alert(data.message || 'Failed to send connection request');
        }
    })
    .catch(error => {
        console.error('Error connecting with tutor:', error);
        alert('Error sending connection request. Please try again.');
    });
};

window.changePage = function(page) {
    if (page >= 1 && page <= FindTutorsState.totalPages && page !== FindTutorsState.currentPage) {
        FindTutorsState.currentPage = page;
        FindTutorsController.loadTutors();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.toggleFavorite = function(tutorId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please log in to add favorites');
        return;
    }

    const button = document.querySelector(`[data-id="${tutorId}"].favorite-btn`);
    const isActive = button.classList.contains('text-yellow-500');

    // Toggle UI immediately for better UX
    if (isActive) {
        button.classList.remove('text-yellow-500');
        button.classList.add('text-gray-400');
        button.querySelector('svg').setAttribute('fill', 'none');
        button.title = 'Add to favorites';
    } else {
        button.classList.remove('text-gray-400');
        button.classList.add('text-yellow-500');
        button.querySelector('svg').setAttribute('fill', 'currentColor');
        button.title = 'Remove from favorites';
    }

    // Update localStorage
    const favorites = JSON.parse(localStorage.getItem('favoriteTutors') || '[]');
    if (isActive) {
        const index = favorites.indexOf(tutorId);
        if (index > -1) favorites.splice(index, 1);
    } else {
        if (!favorites.includes(tutorId)) favorites.push(tutorId);
    }
    localStorage.setItem('favoriteTutors', JSON.stringify(favorites));

    // Trigger filter update if favorites filter is active
    if (document.querySelector('input[name="favorite"]:checked')) {
        FindTutorsController.loadTutors();
    }
};

window.toggleSave = function(tutorId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please log in to save tutors');
        return;
    }

    const button = document.querySelector(`[data-id="${tutorId}"].save-btn`);
    const isActive = button.classList.contains('text-blue-500');

    // Toggle UI immediately for better UX
    if (isActive) {
        button.classList.remove('text-blue-500');
        button.classList.add('text-gray-400');
        button.querySelector('svg').setAttribute('fill', 'none');
        button.title = 'Save for later';
    } else {
        button.classList.remove('text-gray-400');
        button.classList.add('text-blue-500');
        button.querySelector('svg').setAttribute('fill', 'currentColor');
        button.title = 'Remove from saved';
    }

    // Update localStorage
    const saved = JSON.parse(localStorage.getItem('savedTutors') || '[]');
    if (isActive) {
        const index = saved.indexOf(tutorId);
        if (index > -1) saved.splice(index, 1);
    } else {
        if (!saved.includes(tutorId)) saved.push(tutorId);
    }
    localStorage.setItem('savedTutors', JSON.stringify(saved));

    // Trigger filter update if saved filter is active
    if (document.querySelector('input[name="saved"]:checked')) {
        FindTutorsController.loadTutors();
    }
};

window.requestCourse = function() {
    const searchTerm = document.getElementById('searchBar')?.value || '';
    const message = searchTerm
        ? `I'm looking for a course related to "${searchTerm}". Please help me find suitable tutors or training programs.`
        : `I'm looking for a specific course. Please help me find suitable tutors or training programs.`;

    // Could integrate with a contact form or support system
    if (confirm(`${message}\n\nWould you like to be contacted by our team?`)) {
        showNotification('Course request submitted! Our team will contact you soon.', 'success');
        // Here you could make an API call to submit the request
        // submitRequest('course', { searchTerm, message });
    }
};

window.requestSchool = function() {
    const searchTerm = document.getElementById('searchBar')?.value || '';
    const message = searchTerm
        ? `I'm looking for a school or training center related to "${searchTerm}". Please help me find suitable institutions.`
        : `I'm looking for a specific school or training center. Please help me find suitable institutions.`;

    // Could integrate with a contact form or support system
    if (confirm(`${message}\n\nWould you like to be contacted by our team?`)) {
        showNotification('School request submitted! Our team will contact you soon.', 'success');
        // Here you could make an API call to submit the request
        // submitRequest('school', { searchTerm, message });
    }
};
