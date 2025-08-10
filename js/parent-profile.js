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
// Initialization
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded'); // Debug log
    
    try {
        initializeApp();
        setupEventListeners();
        loadUserProfile();
        loadChildren();
        loadUpcomingSessions();
        checkNotifications();
    } catch (error) {
        console.error('Initialization error:', error);
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
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarClose = document.getElementById('sidebar-close');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            sidebar.classList.toggle('show');
            sidebarOverlay.classList.toggle('show');
        });
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            closeSidebar();
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            closeSidebar();
        });
    }
}

function closeSidebar() {
    document.getElementById('hamburger').classList.remove('active');
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebar-overlay').classList.remove('show');
}

function setupSidebarListeners() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!this.classList.contains('sidebar-parent')) {
                e.preventDefault();
                
                // Remove active class from all links
                sidebarLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Close sidebar on mobile
                if (window.innerWidth < 768) {
                    closeSidebar();
                }
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
                closeSidebar();
            }
        }, 250);
    });
}

// ===========================
// User Profile Functions
// ===========================

function loadUserProfile() {
    // Update profile elements
    document.getElementById('profile-name').textContent = currentUser.name;
    
    // Update verification badge
    const verificationBadge = document.getElementById('verification-badge');
    if (verificationBadge) {
        verificationBadge.style.display = currentUser.verified ? 'block' : 'none';
    }
    
    // Update profile images
    const profileAvatars = document.querySelectorAll('.profile-avatar, .profile-avatar-large');
    profileAvatars.forEach(avatar => {
        avatar.src = currentUser.profilePicture;
    });
    
    const coverImages = document.querySelectorAll('.cover-image');
    coverImages.forEach(cover => {
        cover.src = currentUser.coverPicture;
    });
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