// parent-profile.js - Enhanced JavaScript for Parent Profile Page

// ===========================
// Global Variables
// ===========================

let currentUser = {
    id: 1,
    name: 'Mulugeta Alemu',
    email: 'mulugeta@example.com',
    phone: '+251912345679',
    location: 'Addis Ababa, Ethiopia',
    verified: true,
    profilePicture: 'https://via.placeholder.com/150',
    coverPicture: 'https://via.placeholder.com/1920x400',
    rating: 4.8,
    bio: 'Passionate about my children\'s education and their future success.',
    gender: 'male' // Add gender for share image selection
};

let children = {
    1: {
        id: 1,
        name: 'Abebe Kebede',
        gender: 'Male',
        age: 12,
        grade: 6,
        profilePicture: 'https://via.placeholder.com/150',
        courses: ['Math', 'Physics', 'Chemistry'],
        progress: 75,
        nextSession: '2025-01-15 14:00',
        tutor: 'Amanuel Tesfaye'
    },
    2: {
        id: 2,
        name: 'Selam Tesfaye',
        gender: 'Female',
        age: 14,
        grade: 8,
        profilePicture: 'https://via.placeholder.com/150',
        courses: ['Biology', 'Chemistry', 'English'],
        progress: 82,
        nextSession: '2025-01-16 10:00',
        tutor: 'Kebede Worku'
    },
    3: {
        id: 3,
        name: 'Yonas Alemu',
        gender: 'Male',
        age: 10,
        grade: 4,
        profilePicture: 'https://via.placeholder.com/150',
        courses: ['Math', 'English'],
        progress: 68,
        nextSession: '2025-01-17 15:00',
        tutor: 'Sara Tadesse'
    }
};

let sessions = [];
let notifications = 3;
let chartInstance = null;

// ===========================
// Sidebar Manager Class
// ===========================
// NOTE: Sidebar navigation is now handled by side-panel-navigation.js
// This section is kept for backward compatibility but does nothing

// ===========================
// Initialization
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[ParentProfile] DOM Content Loaded'); // Debug log

    try {
        // NOTE: Sidebar navigation is now handled by side-panel-navigation.js
        // No need to initialize SidebarManager here

        initializeApp();
        setupEventListeners();
        loadUserProfile();
        loadChildren();
        loadUpcomingSessions();
        checkNotifications();
    } catch (error) {
        console.error('[ParentProfile] Initialization error:', error);
    } finally {
        // Always hide loading overlay
        hideLoadingOverlay();
    }
});

function initializeApp() {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize animations
    initializeAnimations();
}

function hideLoadingOverlay() {
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }, 500);
}

// ===========================
// Event Listeners
// ===========================

function setupEventListeners() {
    // Navigation
    setupNavigationListeners();
    
    // Sidebar
    setupSidebarListeners();
    
    // Theme toggle
    setupThemeToggle();
    
    // Profile dropdown
    setupProfileDropdown();
    
    // Mobile menu
    setupMobileMenu();
    
    // Forms
    setupFormListeners();
    
    // Search
    setupSearchListeners();
    
    // Window resize
    setupResizeListener();
}

function setupNavigationListeners() {
    // Sidebar is handled by sidebar-manager.js - no need to duplicate listeners
    // The sidebar-manager.js already sets up hamburger, overlay, and close button handlers
}

function setupSidebarListeners() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!this.classList.contains('sidebar-parent')) {
                // Remove active class from all links
                sidebarLinks.forEach(l => l.classList.remove('active'));

                // Add active class to clicked link
                this.classList.add('active');
            }
        });
    });
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

function setupProfileDropdown() {
    const dropdownBtn = document.getElementById('profile-dropdown-btn');
    const dropdown = document.getElementById('profile-dropdown');
    
    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });
    }
}

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });
    }
}

function setupFormListeners() {
    // Prevent form submission on enter
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    });
    
    // Add input validation
    const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateInput(input);
        });
    });
}

function setupSearchListeners() {
    const searchInput = document.getElementById('child-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchChildren(e.target.value);
        }, 300));
    }
}

function setupResizeListener() {
    let resizeTimer;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Close mobile menu on resize to desktop
            if (window.innerWidth > 768) {
                document.getElementById('mobile-menu')?.classList.remove('show');
                // Sidebar resize is handled by sidebar-manager.js
            }
        }, 250);
    });
}

// ===========================
// Panel Switching Functions
// ===========================
// NOTE: Panel switching is now handled by side-panel-navigation.js
// The window.switchPanel function is defined there

// ===========================
// User Profile Functions
// ===========================

async function loadUserProfile() {
    try {
        // Load profile from API
        const profile = await ParentProfileAPI.getParentProfile();

        if (profile) {
            // Update profile name - Use username from parent_profiles table (role-specific username)
            const profileNameEl = document.getElementById('parentName');
            if (profileNameEl) {
                // Use username from parent_profiles table, ensure it's on one line
                const displayName = profile.username ? String(profile.username).replace(/[\n\r]/g, ' ').trim() : (profile.name || 'Parent Name');
                profileNameEl.textContent = displayName;
            }

            // Update verification badge
            const verificationBadge = document.getElementById('verification-badge');
            if (verificationBadge) {
                verificationBadge.style.display = profile.is_verified ? 'block' : 'none';
            }

            // Update profile images
            if (profile.profile_picture) {
                const profileAvatars = document.querySelectorAll('.profile-avatar, .profile-avatar-large');
                profileAvatars.forEach(avatar => {
                    avatar.src = profile.profile_picture;
                });
            }

            // Update cover image
            if (profile.cover_image) {
                const coverImages = document.querySelectorAll('.cover-image');
                coverImages.forEach(cover => {
                    cover.src = profile.cover_image;
                });
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        // Continue anyway - page will show with default/empty values
    }
}

function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    
    // Populate form fields
    document.getElementById('edit-name').value = currentUser.name;
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-phone').value = currentUser.phone;
    document.getElementById('edit-location').value = currentUser.location;
    document.getElementById('edit-bio').value = currentUser.bio;
    
    showModal(modal);
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    hideModal(modal);
}

function saveProfile() {
    // Get form values
    currentUser.name = document.getElementById('edit-name').value;
    currentUser.email = document.getElementById('edit-email').value;
    currentUser.phone = document.getElementById('edit-phone').value;
    currentUser.location = document.getElementById('edit-location').value;
    currentUser.bio = document.getElementById('edit-bio').value;
    
    // Update UI
    loadUserProfile();
    
    // Show success message
    showNotification('Profile updated successfully!', 'success');
    
    // Close modal
    closeEditProfileModal();
}

// ===========================
// Share Modal Functions
// ===========================

function openShareModal() {
    const modal = document.getElementById('share-modal');
    const shareImage = document.getElementById('share-image');
    
    // Select image based on user gender
    const imagePath = currentUser.gender === 'female' 
        ? '../pictures/share_woman.png' 
        : '../pictures/share_man.png';
    
    shareImage.src = imagePath;
    
    showModal(modal);
}

function closeShareModal() {
    const modal = document.getElementById('share-modal');
    hideModal(modal);
}

function copyShareLink() {
    // Generate a share link (you can customize this)
    const shareLink = window.location.origin + '/profile/' + currentUser.id;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareLink).then(() => {
        showNotification('Link copied to clipboard!', 'success');
        
        // Change button text temporarily
        const copyBtn = document.querySelector('.copy-link-btn');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        showNotification('Failed to copy link', 'error');
    });
}



// Improved handleNavLinkClick function for coming soon features
window.handleNavLinkClick = function(e, link) {
    // Define coming soon features
    const comingSoonFeatures = ['news', 'store', 'find-jobs'];
    
    // Check if it's a coming soon feature
    if (comingSoonFeatures.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        openComingSoonModal(link);
        return false;
    }
    
    // Existing protected pages logic
    if (APP_STATE.isLoggedIn) return true;
    
    const protectedPages = ['find-tutors', 'reels'];
    if (protectedPages.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        showToast(`Please login to access ${link.replace("-", " ")}`, "warning");
        openModal("login-modal");
        return false;
    }
    
    return true;
};


// ===========================
// Children Functions
// ===========================

function loadChildren() {
    const childrenGrid = document.getElementById('children-grid');
    
    if (!childrenGrid) return;
    
    childrenGrid.innerHTML = '';
    
    Object.values(children).forEach(child => {
        const childCard = createChildCard(child);
        childrenGrid.appendChild(childCard);
    });
}

function createChildCard(child) {
    const card = document.createElement('div');
    card.className = 'child-card';
    card.onclick = () => openChildDetails(child.id);
    
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (child.progress / 100) * circumference;
    
    // Calculate additional stats
    const totalSessions = child.courses.length * 4; // Example: 4 sessions per course
    const completedSessions = Math.floor(totalSessions * (child.progress / 100));
    
    card.innerHTML = `
        <div class="child-avatar-container">
            <img src="${child.profilePicture}" alt="${child.name}" class="child-avatar">
            <div class="child-status-indicator">✓</div>
        </div>
        <h4 class="child-name">${child.name}</h4>
        <p class="child-grade">Grade ${child.grade}</p>
        <div class="child-progress">
            <svg width="120" height="120" viewBox="0 0 120 120">
                <defs>
                    <linearGradient id="progress-gradient-${child.id}" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:var(--button-bg);stop-opacity:1" />
                        <stop offset="100%" style="stop-color:var(--button-hover);stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle class="progress-circle-bg" cx="60" cy="60" r="45"></circle>
                <circle class="progress-circle-fill" cx="60" cy="60" r="45"
                    stroke="url(#progress-gradient-${child.id})"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}">
                </circle>
            </svg>
            <div class="progress-text">${child.progress}%</div>
        </div>
        <div class="child-quick-stats">
            <div class="child-stat-item">
                <span class="child-stat-number">${child.courses.length}</span>
                <span class="child-stat-label">Courses</span>
            </div>
            <div class="child-stat-item">
                <span class="child-stat-number">${completedSessions}</span>
                <span class="child-stat-label">Sessions</span>
            </div>
            <div class="child-stat-item">
                <span class="child-stat-number">${child.age}</span>
                <span class="child-stat-label">Age</span>
            </div>
        </div>
        <button class="child-action-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
            View Details
        </button>
    `;
    
    return card;
}

function searchChildren(searchTerm = '') {
    const childrenGrid = document.getElementById('children-grid');
    
    if (!childrenGrid) return;
    
    childrenGrid.innerHTML = '';
    
    const filteredChildren = Object.values(children).filter(child => {
        const searchLower = searchTerm.toLowerCase();
        return child.name.toLowerCase().includes(searchLower) ||
               child.courses.some(course => course.toLowerCase().includes(searchLower));
    });
    
    if (filteredChildren.length === 0) {
        childrenGrid.innerHTML = '<p class="no-results">No children found matching your search.</p>';
        return;
    }
    
    filteredChildren.forEach(child => {
        const childCard = createChildCard(child);
        childrenGrid.appendChild(childCard);
    });
}

function openRegisterChildModal() {
    const modal = document.getElementById('register-child-modal');
    
    // Reset form
    document.getElementById('child-name').value = '';
    document.getElementById('child-gender').value = 'Male';
    document.getElementById('child-age').value = '';
    document.getElementById('child-grade').value = '';
    document.getElementById('child-courses').value = '';
    document.getElementById('child-payment-method').value = '';
    document.getElementById('child-account-number').value = '';
    
    showModal(modal);
}

function closeRegisterChildModal() {
    const modal = document.getElementById('register-child-modal');
    hideModal(modal);
}

function registerChild() {
    // Get form values
    const name = document.getElementById('child-name').value;
    const gender = document.getElementById('child-gender').value;
    const age = document.getElementById('child-age').value;
    const grade = document.getElementById('child-grade').value;
    const courses = document.getElementById('child-courses').value.split(',').map(c => c.trim());
    const paymentMethod = document.getElementById('child-payment-method').value;
    const accountNumber = document.getElementById('child-account-number').value;
    
    // Validate
    if (!name || !age || !grade || !courses.length || !paymentMethod || !accountNumber) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Create new child
    const newId = Object.keys(children).length + 1;
    children[newId] = {
        id: newId,
        name,
        gender,
        age: parseInt(age),
        grade: parseInt(grade),
        profilePicture: 'https://via.placeholder.com/150',
        courses,
        progress: 0,
        nextSession: null,
        tutor: null
    };
    
    // Reload children
    loadChildren();
    
    // Show success message
    showNotification(`${name} has been registered successfully!`, 'success');
    
    // Close modal
    closeRegisterChildModal();
}

function openChildDetails(childId) {
    const child = children[childId];
    if (!child) return;
    
    const modal = document.getElementById('child-details-modal');
    
    // Populate modal header
    document.getElementById('child-modal-avatar').src = child.profilePicture;
    document.getElementById('child-modal-avatar').alt = child.name;
    document.getElementById('child-modal-name').textContent = child.name;
    document.getElementById('child-modal-grade').textContent = `Grade ${child.grade} • ${child.gender}`;
    
    // Populate stats
    document.getElementById('child-modal-age').textContent = `${child.age} years`;
    document.getElementById('child-modal-progress').textContent = `${child.progress}%`;
    document.getElementById('child-modal-courses-count').textContent = child.courses.length;
    document.getElementById('child-modal-next-session').textContent = child.nextSession ? 
        new Date(child.nextSession).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'Not scheduled';
    
    // Populate courses
    const coursesContainer = document.getElementById('child-modal-courses');
    coursesContainer.innerHTML = '';
    
    const courseIcons = {
        'Math': '📐',
        'Physics': '⚛️',
        'Chemistry': '🧪',
        'Biology': '🧬',
        'English': '📚',
        'History': '📜',
        'Geography': '🌍'
    };
    
    child.courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-icon">${courseIcons[course] || '📖'}</div>
            <div class="course-name">${course}</div>
        `;
        coursesContainer.appendChild(courseCard);
    });
    
    // Populate upcoming sessions
    const sessionsContainer = document.getElementById('child-modal-sessions');
    sessionsContainer.innerHTML = '';
    
    // Sample sessions for the child
    const childSessions = [
        {
            subject: child.courses[0],
            tutor: child.tutor,
            date: 'Today',
            time: '2:00 PM - 3:30 PM'
        },
        {
            subject: child.courses[1] || child.courses[0],
            tutor: child.tutor,
            date: 'Tomorrow',
            time: '4:00 PM - 5:30 PM'
        },
        {
            subject: child.courses[2] || child.courses[0],
            tutor: child.tutor,
            date: 'Jan 20',
            time: '3:00 PM - 4:30 PM'
        }
    ];
    
    childSessions.forEach(session => {
        const sessionCard = document.createElement('div');
        sessionCard.className = 'session-item-card';
        sessionCard.innerHTML = `
            <div class="session-icon">${courseIcons[session.subject] || '📖'}</div>
            <div class="session-details">
                <div class="session-subject">${session.subject}</div>
                <div class="session-tutor">with ${session.tutor}</div>
            </div>
            <div class="session-time-info">
                <div class="session-date">${session.date}</div>
                <div class="session-time">${session.time}</div>
            </div>
        `;
        sessionsContainer.appendChild(sessionCard);
    });
    
    // Initialize or update progress chart
    initializeChildProgressChart(child);
    
    // Show modal
    showModal(modal);
}

function closeChildDetailsModal() {
    const modal = document.getElementById('child-details-modal');
    hideModal(modal);
    
    // Destroy chart instance if exists
    if (window.childChartInstance) {
        window.childChartInstance.destroy();
        window.childChartInstance = null;
    }
}

function editChildDetails() {
    // Close child details modal
    closeChildDetailsModal();
    
    // Open edit modal (you can implement this)
    showNotification('Edit child details functionality coming soon!', 'info');
}

function initializeChildProgressChart(child) {
    const ctx = document.getElementById('child-progress-chart');
    if (!ctx) return;
    
    // Destroy existing chart if any
    if (window.childChartInstance) {
        window.childChartInstance.destroy();
    }
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Sample progress data for the child
    const progressData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: child.courses.map((course, index) => ({
            label: course,
            data: [
                65 + Math.random() * 20,
                70 + Math.random() * 20,
                75 + Math.random() * 15,
                72 + Math.random() * 18,
                78 + Math.random() * 12,
                child.progress + Math.random() * 10
            ],
            borderColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4],
            backgroundColor: ['rgba(59, 130, 246, 0.1)', 'rgba(16, 185, 129, 0.1)', 'rgba(245, 158, 11, 0.1)', 'rgba(139, 92, 246, 0.1)'][index % 4],
            tension: 0.4
        }))
    };
    
    window.childChartInstance = new Chart(ctx, {
        type: 'line',
        data: progressData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#e5e5e5' : '#1a1a1a',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDarkMode ? '#e5e5e5' : '#1a1a1a',
                    bodyColor: isDarkMode ? '#e5e5e5' : '#1a1a1a',
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

// ===========================
// Upcoming Sessions Functions
// ===========================

function loadUpcomingSessions() {
    // Sample upcoming sessions data
    const upcomingSessions = [
        {
            child: 'Abebe Kebede',
            subject: 'Math',
            tutor: 'Amanuel Tesfaye',
            time: 'Today at 2:00 PM'
        },
        {
            child: 'Selam Tesfaye',
            subject: 'Physics',
            tutor: 'Kebede Worku',
            time: 'Tomorrow at 10:00 AM'
        },
        {
            child: 'Yonas Alemu',
            subject: 'Chemistry',
            tutor: 'Sara Tadesse',
            time: 'Jan 17 at 3:00 PM'
        }
    ];
    
    const sessionsTrack = document.getElementById('sessions-track');
    if (!sessionsTrack) return;
    
    sessionsTrack.innerHTML = '';
    
    // Create sessions for carousel (duplicate for smooth loop)
    const allSessions = [...upcomingSessions, ...upcomingSessions];
    
    allSessions.forEach((session, index) => {
        const sessionAlert = document.createElement('div');
        sessionAlert.className = 'session-alert';
        
        sessionAlert.innerHTML = `
            <span class="alert-icon">⏰</span>
            <div class="alert-content">
                <strong>${index < upcomingSessions.length && index === 0 ? 'Next Session:' : 'Upcoming:'}</strong> 
                ${session.subject} with ${session.tutor} - ${session.time}
            </div>
        `;
        
        sessionsTrack.appendChild(sessionAlert);
    });
}

// ===========================
// Modal Functions
// ===========================

function showModal(modal) {
    if (!modal) return;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Trap focus
    trapFocus(modal);
}

function hideModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // Restore focus
    restoreFocus();
}

function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    modal.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
        
        if (e.key === 'Escape') {
            hideModal(modal);
        }
    });
    
    firstElement.focus();
}

function restoreFocus() {
    // Restore focus to the element that triggered the modal
    const triggerElement = document.activeElement;
    if (triggerElement) {
        triggerElement.focus();
    }
}

// ===========================
// Notification Functions
// ===========================

function checkNotifications() {
    const notificationDot = document.getElementById('notification-dot');
    
    if (notificationDot && notifications > 0) {
        notificationDot.textContent = notifications;
        notificationDot.style.display = 'block';
    }
}

function openNotificationModal() {
    showNotification('Opening notifications...', 'info');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===========================
// Utility Functions
// ===========================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function validateInput(input) {
    if (input.hasAttribute('required') && !input.value.trim()) {
        input.classList.add('error');
        return false;
    }
    
    if (input.type === 'email' && input.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
            input.classList.add('error');
            return false;
        }
    }
    
    if (input.type === 'tel' && input.value) {
        const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        if (!phoneRegex.test(input.value)) {
            input.classList.add('error');
            return false;
        }
    }
    
    input.classList.remove('error');
    return true;
}

function initializeTooltips() {
    // Initialize any tooltips
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
            tooltip.style.left = rect.left + (rect.width - tooltip.offsetWidth) / 2 + 'px';
        });
        
        element.addEventListener('mouseleave', function() {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    });
}

function initializeAnimations() {
    // Intersection Observer for animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animatedElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, {
            threshold: 0.1
        });
        
        animatedElements.forEach(element => {
            observer.observe(element);
        });
    }
}

function openNotesModal() {
    showNotification('Notes functionality coming soon!', 'info');
}

function openManageFinancesModal() {
    showNotification('Finance management coming soon!', 'info');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../index.html';
    }
}

// ===========================
// Animation Styles
// ===========================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .error {
        border-color: #ef4444 !important;
    }
    
    .tooltip {
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        z-index: 10000;
        pointer-events: none;
    }
`;
document.head.appendChild(style);

// ============================================
// PARENT REQUEST TYPE FILTER FUNCTIONS
// ============================================

let currentParentRequestType = 'courses';
let currentParentRequestStatus = 'all';

/**
 * Filter parent requests by type (courses, schools, tutors, parenting, coparenting)
 */
function filterParentRequestType(type) {
    currentParentRequestType = type;

    // Update active state on cards
    const cards = document.querySelectorAll('#my-requests-panel .request-type-card');
    cards.forEach(card => {
        if (card.getAttribute('data-type') === type) {
            card.classList.add('active');
            card.style.borderColor = 'var(--primary-color)';
            card.style.background = 'rgba(139, 92, 246, 0.05)';
        } else {
            card.classList.remove('active');
            card.style.borderColor = 'var(--border-color)';
            card.style.background = 'var(--card-bg)';
        }
    });

    // Load the appropriate content
    if (type === 'parenting') {
        // Hide status tabs for parenting
        const statusTabs = document.querySelector('#my-requests-panel .status-tabs');
        if (statusTabs) statusTabs.style.display = 'none';

        loadParentParentingInvitations();
    } else if (type === 'coparenting') {
        // Hide status tabs for co-parenting
        const statusTabs = document.querySelector('#my-requests-panel .status-tabs');
        if (statusTabs) statusTabs.style.display = 'none';

        loadCoParentingInvitations();
    } else {
        // Show status tabs for other types
        const statusTabs = document.querySelector('#my-requests-panel .status-tabs');
        if (statusTabs) statusTabs.style.display = 'flex';

        // Load placeholder content for other types
        const container = document.getElementById('parent-requests-list');
        if (container) {
            if (type === 'courses') {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-book text-3xl mb-3"></i>
                        <p>Course requests for your children coming soon!</p>
                        <p class="text-sm mt-2">Request enrollment in courses for your children</p>
                    </div>
                `;
            } else if (type === 'schools') {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-school text-3xl mb-3"></i>
                        <p>School requests coming soon!</p>
                        <p class="text-sm mt-2">Request enrollment in schools for your children</p>
                    </div>
                `;
            } else if (type === 'tutors') {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-chalkboard-teacher text-3xl mb-3"></i>
                        <p>Tutor session requests coming soon!</p>
                        <p class="text-sm mt-2">Request tutoring sessions for your children</p>
                    </div>
                `;
            }
        }
    }
}

/**
 * Filter parent requests by status
 */
function filterParentRequestStatus(status) {
    currentParentRequestStatus = status;

    // Update active state on tabs
    const tabs = document.querySelectorAll('#my-requests-panel .status-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-status') === status) {
            tab.classList.add('active');
            tab.style.color = 'var(--primary-color)';
            tab.style.fontWeight = '600';
            tab.style.borderBottom = '2px solid var(--primary-color)';
        } else {
            tab.classList.remove('active');
            tab.style.color = 'var(--text-secondary)';
            tab.style.fontWeight = '400';
            tab.style.borderBottom = 'none';
        }
    });
}

/**
 * Load parenting invitations for this parent (invitations RECEIVED from students)
 */
async function loadParentParentingInvitations() {
    const container = document.getElementById('parent-requests-list');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading parenting invitations...</p>
            </div>
        `;

        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view parenting invitations</p>
                </div>
            `;
            return;
        }

        const response = await fetch('https://api.astegni.com/api/parent/pending-invitations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-info-circle text-3xl mb-3"></i>
                        <p>No parenting invitations</p>
                        <p class="text-sm mt-2">You'll see invitations here when students invite you to be their parent</p>
                    </div>
                `;
                return;
            }
            throw new Error('Failed to load parenting invitations');
        }

        const data = await response.json();
        const invitations = data.invitations || [];

        // Update count badge
        const countBadge = document.getElementById('parent-parenting-invitation-count');
        if (countBadge) {
            if (invitations.length > 0) {
                countBadge.textContent = invitations.length;
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }

        if (invitations.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-user-friends text-3xl mb-3"></i>
                    <p>No pending parenting invitations</p>
                    <p class="text-sm mt-2">You'll see invitations here when students invite you to be their parent</p>
                </div>
            `;
            return;
        }

        // Render invitations as cards
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${invitations.map(inv => renderParentInvitationCard(inv)).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading parenting invitations:', error);
        container.innerHTML = `
            <div class="card p-6 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load parenting invitations</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a parenting invitation card (parent view - shows invitations they received from students)
 */
function renderParentInvitationCard(invitation) {
    const studentUrl = `../view-profiles/view-student.html?id=${invitation.student_user_id}`;
    const createdDate = new Date(invitation.created_at);
    const timeAgo = getParentTimeAgo(createdDate);
    const studentInitial = (invitation.student_name || 'S').charAt(0).toUpperCase();

    return `
        <div class="card p-4" style="border: 2px solid var(--border-color); border-radius: 12px;">
            <div class="flex items-start gap-3 mb-4">
                <!-- Student Avatar (Initial) -->
                <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">
                    ${studentInitial}
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-lg">
                        <a href="${studentUrl}" class="hover:text-purple-600 hover:underline" style="color: var(--heading);">
                            ${invitation.student_name || 'Unknown Student'}
                        </a>
                    </h4>
                    <p class="text-sm" style="color: var(--text-secondary);">
                        ${invitation.grade_level || ''} ${invitation.studying_at ? '@ ' + invitation.studying_at : ''}
                    </p>
                </div>
            </div>

            <div class="mb-4 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); border: 1px solid rgba(139, 92, 246, 0.2);">
                <p class="text-sm" style="color: var(--text-secondary);">Relationship Type</p>
                <p class="font-semibold" style="color: #8B5CF6;">${invitation.relationship_type || 'Parent'}</p>
            </div>

            <p class="text-xs mb-4" style="color: var(--text-secondary);">
                <i class="fas fa-clock"></i> Requested ${timeAgo}
            </p>

            <div class="flex gap-2">
                <button
                    onclick="acceptParentInvitation(${invitation.id})"
                    class="flex-1 btn-primary"
                    style="padding: 8px 12px; border-radius: 8px; font-size: 0.875rem;">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button
                    onclick="rejectParentInvitation(${invitation.id})"
                    style="flex: 1; padding: 8px 12px; border-radius: 8px; font-size: 0.875rem; background: #EF4444; color: white; border: none; cursor: pointer;">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>
    `;
}

/**
 * Accept a parenting invitation
 */
async function acceptParentInvitation(invitationId) {
    if (!confirm('Are you sure you want to accept this parenting invitation? You will become this student\'s linked parent.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://api.astegni.com/api/parent/respond-invitation/${invitationId}?accept=true`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to accept invitation');
        }

        showNotification('Invitation accepted! You are now linked as this student\'s parent.', 'success');
        loadParentParentingInvitations();

    } catch (error) {
        console.error('Error accepting invitation:', error);
        showNotification('Failed to accept invitation. Please try again.', 'error');
    }
}

/**
 * Reject a parenting invitation
 */
async function rejectParentInvitation(invitationId) {
    if (!confirm('Are you sure you want to reject this parenting invitation?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://api.astegni.com/api/parent/respond-invitation/${invitationId}?accept=false`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to reject invitation');
        }

        showNotification('Invitation rejected.', 'info');
        loadParentParentingInvitations();

    } catch (error) {
        console.error('Error rejecting invitation:', error);
        showNotification('Failed to reject invitation. Please try again.', 'error');
    }
}

/**
 * Get time ago string for parent profile
 */
function getParentTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }

    return 'Just now';
}

// ============================================
// CO-PARENTING INVITATIONS FUNCTIONS
// ============================================

/**
 * Load co-parenting invitations - BOTH sent AND received
 */
async function loadCoParentingInvitations() {
    const container = document.getElementById('parent-requests-list');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading co-parenting invitations...</p>
            </div>
        `;

        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view co-parenting invitations</p>
                </div>
            `;
            return;
        }

        // Fetch BOTH sent and received co-parent invitations
        const [sentResponse, receivedResponse] = await Promise.all([
            fetch('https://api.astegni.com/api/parent/coparent-invitations-sent', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('https://api.astegni.com/api/parent/coparent-invitations-received', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        let sentInvitations = [];
        let receivedInvitations = [];

        if (sentResponse.ok) {
            const sentData = await sentResponse.json();
            sentInvitations = sentData.invitations || [];
        }

        if (receivedResponse.ok) {
            const receivedData = await receivedResponse.json();
            receivedInvitations = receivedData.invitations || [];
        }

        // Update count badge
        const pendingSentCount = sentInvitations.filter(inv => inv.status === 'pending').length;
        const pendingReceivedCount = receivedInvitations.filter(inv => inv.status === 'pending').length;
        const totalPendingCount = pendingSentCount + pendingReceivedCount;

        const countBadge = document.getElementById('parent-coparenting-invitation-count');
        if (countBadge) {
            if (totalPendingCount > 0) {
                countBadge.textContent = totalPendingCount;
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }

        // If no invitations at all
        if (sentInvitations.length === 0 && receivedInvitations.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-user-friends text-3xl mb-3"></i>
                    <p>No co-parenting invitations yet</p>
                    <p class="text-sm mt-2">Go to Co-Parents panel to invite someone to share parenting</p>
                    <button onclick="switchToPanel('co-parents')" class="btn-primary mt-4">
                        <i class="fas fa-users"></i> Open Co-Parents Panel
                    </button>
                </div>
            `;
            return;
        }

        // Render both sections
        let html = '';

        // Section 1: Received Invitations - with Accept/Reject buttons
        if (receivedInvitations.length > 0) {
            html += `
                <div class="mb-8">
                    <h3 class="text-lg font-bold mb-4" style="color: var(--heading);">
                        <i class="fas fa-inbox text-green-500 mr-2"></i>
                        Invitations Received (${receivedInvitations.length})
                    </h3>
                    <p class="text-sm text-gray-500 mb-4">Parents inviting you to be a co-parent</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${receivedInvitations.map(inv => renderReceivedCoParentInvitationCard(inv)).join('')}
                    </div>
                </div>
            `;
        }

        // Section 2: Sent Invitations
        if (sentInvitations.length > 0) {
            html += `
                <div class="mb-8">
                    <h3 class="text-lg font-bold mb-4" style="color: var(--heading);">
                        <i class="fas fa-paper-plane text-blue-500 mr-2"></i>
                        Invitations Sent (${sentInvitations.length})
                    </h3>
                    <p class="text-sm text-gray-500 mb-4">Co-parents you've invited</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${sentInvitations.map(inv => renderSentCoParentInvitationCard(inv)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading co-parenting invitations:', error);
        container.innerHTML = `
            <div class="card p-6 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load co-parenting invitations</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a received co-parent invitation card
 */
function renderReceivedCoParentInvitationCard(invitation) {
    const inviterInitial = (invitation.inviter_name || 'P').charAt(0).toUpperCase();
    const createdDate = new Date(invitation.created_at);
    const timeAgo = getParentTimeAgo(createdDate);

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (invitation.status === 'pending') {
        statusBadge = '<span style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>';
        statusColor = '#FFA500';
    } else if (invitation.status === 'accepted') {
        statusBadge = '<span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Accepted</span>';
        statusColor = '#10B981';
    } else {
        statusBadge = '<span style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';
        statusColor = '#EF4444';
    }

    // Action buttons for pending invitations
    let actionButtons = '';
    if (invitation.status === 'pending') {
        actionButtons = `
            <div class="mt-3 pt-3 flex gap-2" style="border-top: 1px solid var(--border-color);">
                <button onclick="acceptCoParentInvitation(${invitation.id})" class="flex-1 py-2 px-4 rounded-lg text-white font-medium" style="background: linear-gradient(135deg, #10B981, #059669);">
                    <i class="fas fa-check mr-1"></i> Accept
                </button>
                <button onclick="rejectCoParentInvitation(${invitation.id})" class="flex-1 py-2 px-4 rounded-lg text-white font-medium" style="background: linear-gradient(135deg, #EF4444, #DC2626);">
                    <i class="fas fa-times mr-1"></i> Reject
                </button>
            </div>
        `;
    }

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <!-- Inviter Avatar (Initial) -->
                    <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #10B981, #059669); color: white; font-size: 1.25rem; font-weight: bold;">
                        ${inviterInitial}
                    </div>
                    <div>
                        <h4 class="font-bold text-lg" style="color: var(--heading);">
                            ${invitation.inviter_name || 'Parent'}
                        </h4>
                        <p class="text-xs" style="color: var(--text-secondary);">
                            <i class="fas fa-user"></i> Parent
                        </p>
                    </div>
                </div>
                ${statusBadge}
            </div>

            <div class="mb-3 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border: 1px solid rgba(16, 185, 129, 0.2);">
                <p class="text-sm" style="color: var(--text-secondary);">Wants you as their</p>
                <p class="font-semibold" style="color: #10B981;">${invitation.relationship_type || 'Co-Parent'}</p>
            </div>

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Received ${timeAgo}</span>
            </div>

            ${actionButtons}
        </div>
    `;
}

/**
 * Render a sent co-parent invitation card
 */
function renderSentCoParentInvitationCard(invitation) {
    const inviteeInitial = (invitation.invitee_name || 'P').charAt(0).toUpperCase();
    const createdDate = new Date(invitation.created_at);
    const timeAgo = getParentTimeAgo(createdDate);

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (invitation.status === 'pending') {
        statusBadge = '<span style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>';
        statusColor = '#FFA500';
    } else if (invitation.status === 'accepted') {
        statusBadge = '<span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Accepted</span>';
        statusColor = '#10B981';
    } else {
        statusBadge = '<span style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';
        statusColor = '#EF4444';
    }

    // Contact info (for new users)
    let contactInfo = '';
    if (invitation.is_new_user) {
        if (invitation.invitee_email) {
            contactInfo = `<p class="text-xs" style="color: var(--text-secondary);"><i class="fas fa-envelope"></i> ${invitation.invitee_email}</p>`;
        } else if (invitation.invitee_phone) {
            contactInfo = `<p class="text-xs" style="color: var(--text-secondary);"><i class="fas fa-phone"></i> ${invitation.invitee_phone}</p>`;
        }
    }

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <!-- Invitee Avatar (Initial) -->
                    <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; font-size: 1.25rem; font-weight: bold;">
                        ${inviteeInitial}
                    </div>
                    <div>
                        <h4 class="font-bold text-lg" style="color: var(--heading);">
                            ${invitation.invitee_name || 'Pending User'}
                        </h4>
                        ${contactInfo}
                    </div>
                </div>
                ${statusBadge}
            </div>

            <div class="mb-3 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1)); border: 1px solid rgba(59, 130, 246, 0.2);">
                <p class="text-sm" style="color: var(--text-secondary);">Relationship</p>
                <p class="font-semibold" style="color: #3B82F6;">${invitation.relationship_type || 'Co-Parent'}</p>
            </div>

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Sent ${timeAgo}</span>
                ${invitation.is_new_user ? '<span class="text-blue-500"><i class="fas fa-user-plus"></i> New User</span>' : ''}
            </div>

            ${invitation.status === 'pending' && invitation.is_new_user ? `
                <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-color);">
                    <p class="text-xs text-gray-500 mb-2">Awaiting login with temporary password</p>
                    <button onclick="resendCoParentInvitation(${invitation.id})" class="btn-secondary w-full" style="padding: 6px 12px; font-size: 0.75rem;">
                        <i class="fas fa-paper-plane"></i> Resend Invitation
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Accept a co-parent invitation
 */
async function acceptCoParentInvitation(invitationId) {
    if (!confirm('Are you sure you want to accept this co-parent invitation? You will share parenting access to their children.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to accept invitations', 'error');
            return;
        }

        const response = await fetch(`https://api.astegni.com/api/parent/coparent-invitation/${invitationId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to accept invitation');
        }

        showNotification('Co-parent invitation accepted! You now have access to the shared children.', 'success');
        loadCoParentingInvitations(); // Refresh the list

    } catch (error) {
        console.error('Error accepting co-parent invitation:', error);
        showNotification('Failed to accept invitation: ' + error.message, 'error');
    }
}

/**
 * Reject a co-parent invitation
 */
async function rejectCoParentInvitation(invitationId) {
    if (!confirm('Are you sure you want to reject this co-parent invitation?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to reject invitations', 'error');
            return;
        }

        const response = await fetch(`https://api.astegni.com/api/parent/coparent-invitation/${invitationId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to reject invitation');
        }

        showNotification('Co-parent invitation rejected.', 'info');
        loadCoParentingInvitations(); // Refresh the list

    } catch (error) {
        console.error('Error rejecting co-parent invitation:', error);
        showNotification('Failed to reject invitation: ' + error.message, 'error');
    }
}

/**
 * Resend co-parent invitation
 */
async function resendCoParentInvitation(invitationId) {
    showNotification('Resend invitation feature coming soon! For now, please share the temporary password directly with the co-parent.', 'info');
}

// Export functions to window
window.filterParentRequestType = filterParentRequestType;
window.filterParentRequestStatus = filterParentRequestStatus;
window.loadParentParentingInvitations = loadParentParentingInvitations;
window.acceptParentInvitation = acceptParentInvitation;
window.rejectParentInvitation = rejectParentInvitation;
window.loadCoParentingInvitations = loadCoParentingInvitations;
window.acceptCoParentInvitation = acceptCoParentInvitation;
window.rejectCoParentInvitation = rejectCoParentInvitation;
window.resendCoParentInvitation = resendCoParentInvitation;