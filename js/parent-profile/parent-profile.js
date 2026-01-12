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

document.addEventListener('DOMContentLoaded', async function() {
    console.log('[ParentProfile] DOM Content Loaded'); // Debug log

    try {
        // ============================================
        // AUTHENTICATION CHECK
        // ============================================
        // Check if AuthManager is loaded
        if (typeof AuthManager === 'undefined' || typeof window.AuthManager === 'undefined') {
            console.error('❌ AuthManager not loaded! Redirecting to login...');
            alert('Authentication manager not loaded. Please refresh the page.');
            window.location.href = '../index.html';
            return;
        }

        // Wait for AuthManager to restore session
        await window.AuthManager.restoreSession();

        // Check if user is authenticated
        if (!window.AuthManager.isAuthenticated()) {
            console.warn('⚠️ User not authenticated. Redirecting to login...');
            alert('Please log in to access your parent profile.');
            window.location.href = '../index.html';
            return;
        }

        // Check if user has parent role
        const userRole = window.AuthManager.getUserRole();
        const user = window.AuthManager.getUser();

        // DEBUG: Log detailed role information
        console.log('🔍 [ParentProfile] Role Check Debug:', {
            userRole: userRole,
            user_active_role: user?.active_role,
            user_role: user?.role,
            user_roles: user?.roles,
            localStorage_userRole: localStorage.getItem('userRole')
        });

        // More defensive role check - handle undefined, null, and string "undefined"
        const normalizedRole = userRole && userRole !== 'undefined' && userRole !== 'null' ? userRole : null;

        if (normalizedRole !== 'parent') {
            console.warn(`⚠️ [ParentProfile] User role is '${normalizedRole}', not 'parent'. Redirecting...`);
            alert(`This page is for parents only. You are logged in as: ${normalizedRole || 'unknown'}\n\nPlease switch to your parent role or log in with a parent account.`);
            window.location.href = '../index.html';
            return;
        }

        console.log('✅ [ParentProfile] Authentication verified for parent role');

        // ============================================
        // INITIALIZE APP
        // ============================================
        // NOTE: Sidebar navigation is now handled by side-panel-navigation.js
        // No need to initialize SidebarManager here

        initializeApp();
        setupEventListeners();
        loadUserProfile();
        // Initialize ChildrenManager to load children from database
        ChildrenManager.init();
        loadUpcomingSessions();
        checkNotifications();

        // AUTO-LOAD PARENTING INVITATIONS: Load parenting invitations automatically on page load
        // This ensures pending invitations are fetched when parent profile loads
        console.log('[ParentProfile] Auto-loading parenting invitations...');
        if (typeof loadParentingInvitations === 'function') {
            loadParentingInvitations();
            console.log('[ParentProfile] ✅ Parenting invitations auto-load initiated (global function)');
        } else if (typeof ParentRequestsManager !== 'undefined' && ParentRequestsManager.loadParentingInvitations) {
            ParentRequestsManager.loadParentingInvitations();
            console.log('[ParentProfile] ✅ Parenting invitations auto-load initiated (ParentRequestsManager)');
        } else {
            console.warn('[ParentProfile] ⚠️ No parenting invitation loader found - invitations will not auto-load');
        }
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

// Load connection stats from database
async function loadConnectionStats() {
    try {
        const stats = await ParentProfileAPI.getConnectionStats();
        console.log('[ParentProfile] Connection stats:', stats);

        // Update all connections count elements (profile section + modal)
        const connectionsCount = stats.total_connections || 0;
        document.querySelectorAll('#connections-count, #connections-total-count').forEach(el => {
            el.textContent = connectionsCount;
        });

        // Update all requests count elements (profile section + modal)
        const requestsCount = stats.incoming_requests || 0;
        document.querySelectorAll('#requests-count').forEach(el => {
            el.textContent = requestsCount;
        });

        // Update sent/received request counts
        const sentCount = stats.outgoing_requests || 0;
        document.querySelectorAll('#sent-requests-count').forEach(el => {
            el.textContent = sentCount;
        });

        document.querySelectorAll('#received-requests-count').forEach(el => {
            el.textContent = requestsCount;
        });

    } catch (error) {
        console.error('[ParentProfile] Error loading connection stats:', error);
        // Set to 0 on error
        document.querySelectorAll('#connections-count, #connections-total-count').forEach(el => {
            el.textContent = '0';
        });
        document.querySelectorAll('#requests-count, #sent-requests-count, #received-requests-count').forEach(el => {
            el.textContent = '0';
        });
    }
}

async function loadUserProfile() {
    try {
        // Load profile from API
        const profile = await ParentProfileAPI.getParentProfile();
        console.log('[ParentProfile] Loaded profile:', profile);

        if (profile) {
            // Store profile data globally for edit modal
            window.parentProfileData = profile;

            // Update profile name - Use full name from users table
            const profileNameEl = document.getElementById('parentName');
            if (profileNameEl) {
                const displayName = profile.name || `${profile.first_name || ''} ${profile.father_name || ''}`.trim() || 'Parent Name';
                profileNameEl.textContent = displayName;
            }

            // Update username
            const usernameEl = document.getElementById('parentUsername');
            if (usernameEl) {
                if (profile.username) {
                    usernameEl.textContent = `@${profile.username}`;
                    usernameEl.style.display = 'block';
                } else {
                    usernameEl.style.display = 'none';
                }
            }

            // Update verification badge
            const verificationBadge = document.getElementById('verification-badge');
            if (verificationBadge) {
                if (profile.is_verified) {
                    verificationBadge.style.display = 'inline-flex';
                    verificationBadge.innerHTML = '✔ Verified Parent';
                } else {
                    verificationBadge.style.display = 'none';
                }
            }

            // Update profile avatar
            const profileAvatar = document.getElementById('profile-avatar');
            if (profileAvatar && profile.profile_picture) {
                profileAvatar.src = profile.profile_picture;
            }

            // Update cover image
            const coverImg = document.getElementById('cover-img');
            if (coverImg && profile.cover_image) {
                coverImg.src = profile.cover_image;
            }

            // Update rating
            const ratingValue = document.getElementById('parent-rating');
            if (ratingValue) {
                const rating = profile.rating || 0;
                ratingValue.textContent = rating.toFixed(1);
            }

            // Update rating stars
            const ratingStars = document.getElementById('rating-stars');
            if (ratingStars) {
                const rating = profile.rating || 0;
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating - fullStars >= 0.5;
                let starsHtml = '';
                for (let i = 0; i < 5; i++) {
                    if (i < fullStars) {
                        starsHtml += '★';
                    } else if (i === fullStars && hasHalfStar) {
                        starsHtml += '★';
                    } else {
                        starsHtml += '☆';
                    }
                }
                ratingStars.textContent = starsHtml;
            }

            // Update rating count
            const ratingCount = document.getElementById('rating-count');
            if (ratingCount) {
                const count = profile.rating_count || 0;
                ratingCount.textContent = `(${count} review${count !== 1 ? 's' : ''})`;
            }

            // Update location
            const locationEl = document.getElementById('parent-location');
            if (locationEl) {
                locationEl.textContent = profile.location || 'Location not set';
            }

            // Update email
            const emailEl = document.getElementById('parent-email');
            if (emailEl) {
                emailEl.textContent = profile.email || 'Email not set';
            }

            // Update phone
            const phoneEl = document.getElementById('parent-phone');
            if (phoneEl) {
                phoneEl.textContent = profile.phone || 'Phone not set';
            }

            // Update relationship type
            const relationshipEl = document.getElementById('parent-relationship');
            if (relationshipEl) {
                relationshipEl.textContent = profile.relationship_type || 'Parent';
            }

            // Update quote
            const quoteEl = document.getElementById('parent-quote');
            if (quoteEl) {
                quoteEl.textContent = profile.quote ? `"${profile.quote}"` : '"Education is the key to unlocking my children\'s potential."';
            }

            // Update bio
            const bioEl = document.getElementById('parent-bio');
            if (bioEl) {
                bioEl.textContent = profile.bio || 'Dedicated to supporting my children\'s educational journey.';
            }

            // Load connection stats from database
            loadConnectionStats();

            // Update stats
            const statChildrenEl = document.getElementById('stat-children');
            if (statChildrenEl) {
                statChildrenEl.textContent = profile.total_children || 0;
            }

            // Update occupation if exists
            const occupationEl = document.getElementById('parent-occupation');
            if (occupationEl) {
                occupationEl.textContent = profile.occupation || 'Not specified';
            }

            // Update rating tooltip metrics if they exist
            updateRatingTooltip(profile);

            // Initialize reviews manager to load reviews from database
            if (profile.id) {
                ParentReviewsManager.init(profile.id);
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        // Continue anyway - page will show with default/empty values

        // Show error state for reviews since profile failed to load
        ParentReviewsManager.showDashboardError('Unable to load profile');
        ParentReviewsManager.showRatingsError('Unable to load profile');
    }
}

// Helper function to update rating tooltip
function updateRatingTooltip(profile) {
    // This would update the rating breakdown tooltip if review stats are available
    // For now, we'll load them asynchronously if parent profile id is available
    if (profile.id) {
        ParentProfileAPI.getParentReviewStats(profile.id)
            .then(stats => {
                // Update tooltip metrics
                const tooltipMetrics = document.querySelectorAll('.rating-tooltip .rating-metric');
                if (tooltipMetrics.length >= 4 && stats) {
                    // Engagement with tutor
                    const metric1 = tooltipMetrics[0];
                    if (metric1) {
                        const score1 = metric1.querySelector('.metric-score');
                        const fill1 = metric1.querySelector('.metric-fill');
                        if (score1) score1.textContent = (stats.engagement_with_tutor_avg || 0).toFixed(1);
                        if (fill1) fill1.style.width = `${((stats.engagement_with_tutor_avg || 0) / 5) * 100}%`;
                    }
                    // Engagement with child
                    const metric2 = tooltipMetrics[1];
                    if (metric2) {
                        const score2 = metric2.querySelector('.metric-score');
                        const fill2 = metric2.querySelector('.metric-fill');
                        if (score2) score2.textContent = (stats.engagement_with_child_avg || 0).toFixed(1);
                        if (fill2) fill2.style.width = `${((stats.engagement_with_child_avg || 0) / 5) * 100}%`;
                    }
                    // Responsiveness
                    const metric3 = tooltipMetrics[2];
                    if (metric3) {
                        const score3 = metric3.querySelector('.metric-score');
                        const fill3 = metric3.querySelector('.metric-fill');
                        if (score3) score3.textContent = (stats.responsiveness_avg || 0).toFixed(1);
                        if (fill3) fill3.style.width = `${((stats.responsiveness_avg || 0) / 5) * 100}%`;
                    }
                    // Payment consistency
                    const metric4 = tooltipMetrics[3];
                    if (metric4) {
                        const score4 = metric4.querySelector('.metric-score');
                        const fill4 = metric4.querySelector('.metric-fill');
                        if (score4) score4.textContent = (stats.payment_consistency_avg || 0).toFixed(1);
                        if (fill4) fill4.style.width = `${((stats.payment_consistency_avg || 0) / 5) * 100}%`;
                    }
                }
            })
            .catch(err => console.log('Could not load review stats:', err));
    }
}

// Note: Edit profile modal functions are defined in parent-profile.html
// They use ParentProfileAPI.updateParentProfile() to save to database

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
    console.log('[showNotification]', type, message);
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
let currentParentParentingDirection = 'received'; // 'received' or 'sent'
let parentParentingReceivedInvitations = [];
let parentParentingSentInvitations = [];

/**
 * Filter parent requests by type (courses, schools, tutors, parenting, coparenting)
 */
function filterParentRequestType(type) {
    console.log('[filterParentRequestType] Called with type:', type);
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

    // Show/hide parenting direction tabs
    const parentingDirectionTabs = document.getElementById('parent-parenting-direction-tabs');
    console.log('[filterParentRequestType] parentingDirectionTabs element:', parentingDirectionTabs);

    // Get status tabs element
    const statusTabs = document.querySelector('#my-requests-panel .status-tabs');
    console.log('[filterParentRequestType] statusTabs element:', statusTabs);

    if (type === 'parenting') {
        // Show parenting direction tabs
        if (parentingDirectionTabs) {
            parentingDirectionTabs.classList.remove('hidden');
            parentingDirectionTabs.style.display = 'block';
            console.log('[filterParentRequestType] Showing parenting direction tabs');
        }
        // Hide status tabs for parenting
        if (statusTabs) {
            statusTabs.style.display = 'none';
            console.log('[filterParentRequestType] Hiding status tabs');
        }
        loadParentParentingInvitations();
    } else if (type === 'coparenting') {
        // Hide parenting direction tabs
        if (parentingDirectionTabs) {
            parentingDirectionTabs.classList.add('hidden');
            parentingDirectionTabs.style.display = 'none';
        }
        // Hide status tabs for co-parenting
        if (statusTabs) statusTabs.style.display = 'none';

        loadCoParentingInvitations();
    } else {
        // Hide parenting direction tabs for other types
        if (parentingDirectionTabs) {
            parentingDirectionTabs.classList.add('hidden');
            parentingDirectionTabs.style.display = 'none';
        }
        // Show status tabs for other types
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
 * Load parenting invitations for this parent - Both received and sent invitations
 * Shows tabs for switching between received (students inviting you) and sent (you inviting others)
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

        // Fetch received invitations (students inviting you as parent)
        const receivedResponse = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/pending-invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false }));

        // Fetch sent invitations (you inviting others as your child's parent - co-parent invitations you sent)
        // Parents can send invitations to students to add them as children
        const sentResponse = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/sent-invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false }));

        parentParentingReceivedInvitations = [];
        parentParentingSentInvitations = [];

        if (receivedResponse.ok) {
            const data = await receivedResponse.json();
            parentParentingReceivedInvitations = data.invitations || [];
        }

        if (sentResponse.ok) {
            const data = await sentResponse.json();
            parentParentingSentInvitations = data.invitations || [];
        }

        // Update count badges
        updateParentParentingCountBadges();

        // Render based on current direction
        renderParentParentingInvitationsContent();

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
 * Update count badges for received and sent parenting invitations
 */
function updateParentParentingCountBadges() {
    // Update received count badge
    const receivedCountBadge = document.getElementById('parent-parenting-received-count');
    const pendingReceivedCount = parentParentingReceivedInvitations.filter(inv => inv.status === 'pending').length;
    if (receivedCountBadge) {
        if (pendingReceivedCount > 0) {
            receivedCountBadge.textContent = pendingReceivedCount;
            receivedCountBadge.classList.remove('hidden');
        } else {
            receivedCountBadge.classList.add('hidden');
        }
    }

    // Update sent count badge
    const sentCountBadge = document.getElementById('parent-parenting-sent-count');
    const pendingSentCount = parentParentingSentInvitations.filter(inv => inv.status === 'pending').length;
    if (sentCountBadge) {
        if (pendingSentCount > 0) {
            sentCountBadge.textContent = pendingSentCount;
            sentCountBadge.classList.remove('hidden');
        } else {
            sentCountBadge.classList.add('hidden');
        }
    }

    // Update main parenting card badge (total pending)
    const mainBadge = document.getElementById('parent-parenting-invitation-count');
    const totalPending = pendingReceivedCount + pendingSentCount;
    if (mainBadge) {
        if (totalPending > 0) {
            mainBadge.textContent = totalPending;
            mainBadge.classList.remove('hidden');
        } else {
            mainBadge.classList.add('hidden');
        }
    }
}

/**
 * Switch between received and sent parenting invitations
 */
function switchParentParentingDirection(direction) {
    currentParentParentingDirection = direction;

    // Update tab active states
    const receivedTab = document.getElementById('parent-parenting-received-tab');
    const sentTab = document.getElementById('parent-parenting-sent-tab');

    if (receivedTab) {
        if (direction === 'received') {
            receivedTab.style.color = 'var(--button-bg)';
            receivedTab.style.borderBottomColor = 'var(--button-bg)';
        } else {
            receivedTab.style.color = 'var(--text-muted)';
            receivedTab.style.borderBottomColor = 'transparent';
        }
    }

    if (sentTab) {
        if (direction === 'sent') {
            sentTab.style.color = 'var(--button-bg)';
            sentTab.style.borderBottomColor = 'var(--button-bg)';
        } else {
            sentTab.style.color = 'var(--text-muted)';
            sentTab.style.borderBottomColor = 'transparent';
        }
    }

    // Render content for selected direction
    renderParentParentingInvitationsContent();
}

/**
 * Render parenting invitations content based on current direction
 */
function renderParentParentingInvitationsContent() {
    const container = document.getElementById('parent-requests-list');
    if (!container) return;

    if (currentParentParentingDirection === 'received') {
        // Show received invitations
        if (parentParentingReceivedInvitations.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-3 opacity-50"></i>
                    <p class="font-semibold">No invitations received</p>
                    <p class="text-sm mt-2">You'll see invitations here when students invite you to be their parent</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="mb-4">
                <p class="text-sm text-gray-500 mb-4">Students inviting you to be their parent/guardian</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${parentParentingReceivedInvitations.map(inv => renderParentInvitationCard(inv)).join('')}
                </div>
            </div>
        `;
    } else {
        // Show sent invitations
        if (parentParentingSentInvitations.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-paper-plane text-4xl mb-3 opacity-50"></i>
                    <p class="font-semibold">No invitations sent</p>
                    <p class="text-sm mt-2">Go to <strong>My Children</strong> panel to invite students to link with you</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="mb-4">
                <p class="text-sm text-gray-500 mb-4">Invitations you've sent to students to link with you</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${parentParentingSentInvitations.map(inv => renderParentSentInvitationCard(inv)).join('')}
                </div>
            </div>
        `;
    }
}

/**
 * Render a sent parenting invitation card (parent view - invitations they sent to students)
 */
function renderParentSentInvitationCard(invitation) {
    // Use invitee_* fields from API (backend naming) or fallback to invited_* (frontend naming)
    const studentName = invitation.invitee_name || invitation.invited_name || invitation.student_name || 'Unknown Student';
    const studentUsername = invitation.invitee_username || invitation.invited_username || null;
    const profilePic = invitation.invitee_profile_picture || invitation.invited_profile_picture || null;
    const studentInitial = (studentName || 'S').charAt(0).toUpperCase();

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

    // Profile picture HTML
    const profilePicHtml = profilePic
        ? `<img src="${profilePic}" alt="${studentName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #8B5CF6;" onerror="this.outerHTML='<div style=\\'width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;\\'>${studentInitial}</div>'">`
        : `<div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">${studentInitial}</div>`;

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    ${profilePicHtml}
                    <div>
                        <h4 class="font-bold text-lg" style="color: var(--heading);">
                            ${studentName}
                        </h4>
                        ${studentUsername ? `<p class="text-xs text-gray-500 mb-1">@${studentUsername}</p>` : ''}
                        <p class="text-xs" style="color: var(--text-secondary);">
                            <i class="fas fa-user-graduate"></i> Student
                        </p>
                    </div>
                </div>
                ${statusBadge}
            </div>

            <div class="mb-3 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); border: 1px solid rgba(139, 92, 246, 0.2);">
                <p class="text-sm" style="color: var(--text-secondary);">Invited as your</p>
                <p class="font-semibold" style="color: #8B5CF6;">${invitation.relationship_type || 'Child'}</p>
            </div>

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Sent ${timeAgo}</span>
            </div>

            ${invitation.status === 'pending' ? `
                <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-color);">
                    <button onclick="cancelParentSentInvitation(${invitation.id})" class="w-full py-2 px-4 rounded-lg text-white font-medium" style="background: linear-gradient(135deg, #EF4444, #DC2626);">
                        <i class="fas fa-times mr-1"></i> Cancel Invitation
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Cancel a sent parenting invitation
 */
async function cancelParentSentInvitation(invitationId) {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to cancel invitations', 'error');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/invitation/${invitationId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to cancel invitation');
        }

        showNotification('Invitation cancelled.', 'info');
        loadParentParentingInvitations();

    } catch (error) {
        console.error('Error cancelling invitation:', error);
        showNotification('Failed to cancel invitation: ' + error.message, 'error');
    }
}

/**
 * Render a parenting invitation card (parent view - shows invitations they received from students/others)
 * UPDATED: Now uses inviter_name, inviter_username, inviter_profile_picture from API
 */
function renderParentInvitationCard(invitation) {
    // Use inviter fields (new API) with fallback to student fields (old API)
    const inviterName = invitation.inviter_name || invitation.student_name || 'Unknown User';
    const inviterUsername = invitation.inviter_username || null;
    const inviterType = invitation.inviter_type || 'student';
    const profilePic = invitation.inviter_profile_picture || invitation.student_profile_picture || null;

    // Determine profile URL based on inviter type
    const profileUrl = inviterType === 'student'
        ? `../view-profiles/view-student.html?id=${invitation.inviter_user_id}`
        : inviterType === 'parent'
        ? `../view-profiles/view-parent.html?id=${invitation.inviter_user_id}`
        : `../view-profiles/view-tutor.html?id=${invitation.inviter_user_id}`;

    const createdDate = new Date(invitation.created_at);
    const timeAgo = getParentTimeAgo(createdDate);
    const inviterInitial = (inviterName || 'U').charAt(0).toUpperCase();

    // Inviter type badge
    const inviterTypeBadge = inviterType === 'student' ? 'Student' :
                             inviterType === 'parent' ? 'Parent' :
                             inviterType === 'tutor' ? 'Tutor' : inviterType;

    return `
        <div class="card p-4" style="border: 2px solid var(--border-color); border-radius: 12px;">
            <div class="flex items-start gap-3 mb-4">
                <!-- Inviter Avatar -->
                ${profilePic ? `
                    <img src="${profilePic}" alt="${inviterName}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                         style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #8B5CF6;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; display: none; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">
                        ${inviterInitial}
                    </div>
                ` : `
                    <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">
                        ${inviterInitial}
                    </div>
                `}
                <div class="flex-1">
                    <h4 class="font-bold text-lg">
                        <a href="${profileUrl}" class="hover:text-purple-600 hover:underline" style="color: var(--heading);">
                            ${inviterName}
                        </a>
                    </h4>
                    ${inviterUsername ? `<p class="text-xs" style="color: var(--text-secondary);">@${inviterUsername}</p>` : ''}
                    <p class="text-sm" style="color: var(--text-secondary);">
                        ${invitation.grade_level || ''} ${invitation.studying_at ? '@ ' + invitation.studying_at : ''}
                    </p>
                    <span style="display: inline-block; background: #E0E7FF; color: #4F46E5; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 600; margin-top: 4px;">
                        ${inviterTypeBadge}
                    </span>
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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/respond-invitation/${invitationId}?accept=true`, {
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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/respond-invitation/${invitationId}?accept=false`, {
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

        // Fetch co-parent invitations using the universal pending-invitations endpoint
        // This endpoint returns ALL invitations where the user is invited (regardless of type)
        const receivedResponse = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/pending-invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let sentInvitations = [];
        let receivedInvitations = [];

        if (receivedResponse.ok) {
            const receivedData = await receivedResponse.json();
            receivedInvitations = receivedData.invitations || [];
        }

        // Note: Sent invitations would need a separate endpoint (not currently available in backend)
        // For now, we only show received co-parent invitations

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

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/coparent-invitation/${invitationId}/accept`, {
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

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/coparent-invitation/${invitationId}/reject`, {
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
window.showNotification = showNotification;
window.filterParentRequestType = filterParentRequestType;
window.filterParentRequestStatus = filterParentRequestStatus;
window.loadParentParentingInvitations = loadParentParentingInvitations;
window.switchParentParentingDirection = switchParentParentingDirection;
window.updateParentParentingCountBadges = updateParentParentingCountBadges;
window.renderParentParentingInvitationsContent = renderParentParentingInvitationsContent;
window.renderParentSentInvitationCard = renderParentSentInvitationCard;
window.cancelParentSentInvitation = cancelParentSentInvitation;
window.acceptParentInvitation = acceptParentInvitation;
window.rejectParentInvitation = rejectParentInvitation;
window.loadCoParentingInvitations = loadCoParentingInvitations;
window.acceptCoParentInvitation = acceptCoParentInvitation;
window.rejectCoParentInvitation = rejectCoParentInvitation;
window.resendCoParentInvitation = resendCoParentInvitation;

// ============================================
// PARENT REVIEWS MANAGER
// Handles loading and displaying reviews from parent_reviews table
// ============================================

const ParentReviewsManager = {
    // Store all reviews for filtering
    allReviews: [],
    currentFilter: 'all',
    parentId: null,

    /**
     * Initialize the reviews manager
     * @param {number} parentId - The parent's profile ID
     */
    async init(parentId) {
        this.parentId = parentId;
        if (!parentId) {
            console.log('[ParentReviewsManager] No parent ID provided, skipping review load');
            return;
        }

        // Load reviews for both dashboard and ratings panel
        await this.loadAllReviews();
    },

    /**
     * Load all reviews from the API
     */
    async loadAllReviews() {
        try {
            const reviews = await ParentProfileAPI.getParentReviews(this.parentId);
            this.allReviews = reviews.reviews || reviews || [];

            // Update both dashboard and ratings panel
            this.renderDashboardReviews();
            this.renderRatingsReviews();
            this.updateFilterCounts();
        } catch (error) {
            console.error('[ParentReviewsManager] Error loading reviews:', error);
            this.showDashboardError(error.message);
            this.showRatingsError(error.message);
        }
    },

    /**
     * Render reviews in the dashboard panel (shows only 3 most recent)
     */
    renderDashboardReviews() {
        const container = document.getElementById('dashboard-reviews-container');
        const emptyState = document.getElementById('dashboard-reviews-empty');

        if (!container) return;

        // Hide empty state by default
        if (emptyState) emptyState.classList.add('hidden');

        // Check for empty reviews
        if (!this.allReviews || this.allReviews.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        // Get only the 3 most recent reviews for dashboard
        const recentReviews = this.allReviews.slice(0, 3);

        // Render review cards
        container.innerHTML = recentReviews.map(review => this.createReviewCard(review, 'compact')).join('');
    },

    /**
     * Show error state for dashboard reviews
     */
    showDashboardError(errorMessage) {
        const container = document.getElementById('dashboard-reviews-container');
        const emptyState = document.getElementById('dashboard-reviews-empty');

        if (!container) return;
        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-2">⚠️</div>
                <h4 class="font-semibold text-red-600 mb-1">Failed to load reviews</h4>
                <p class="text-sm text-gray-500 mb-4">${errorMessage || 'An error occurred while loading reviews'}</p>
                <button onclick="ParentReviewsManager.retryLoadReviews()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                    <i class="fas fa-redo mr-2"></i>Try Again
                </button>
            </div>
        `;
    },

    /**
     * Render reviews in the ratings panel (shows all with filtering)
     */
    renderRatingsReviews(filterStar = 'all') {
        const container = document.getElementById('ratings-reviews-container');
        const emptyState = document.getElementById('ratings-reviews-empty');

        if (!container) return;

        // Hide empty state by default
        if (emptyState) emptyState.classList.add('hidden');

        // Filter reviews by star rating if needed
        let filteredReviews = this.allReviews;
        if (filterStar !== 'all') {
            const starValue = parseInt(filterStar);
            filteredReviews = this.allReviews.filter(review => {
                const avgRating = this.calculateAverageRating(review);
                return Math.floor(avgRating) === starValue;
            });
        }

        // Check for empty reviews
        if (!filteredReviews || filteredReviews.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.classList.remove('hidden');
                // Update empty state message based on filter
                const emptyTitle = emptyState.querySelector('h3');
                const emptyDesc = emptyState.querySelector('p');
                if (filterStar !== 'all') {
                    if (emptyTitle) emptyTitle.textContent = `No ${filterStar}-star reviews`;
                    if (emptyDesc) emptyDesc.textContent = 'Try selecting a different star rating';
                } else {
                    if (emptyTitle) emptyTitle.textContent = 'No reviews yet';
                    if (emptyDesc) emptyDesc.textContent = 'Reviews from tutors will appear here';
                }
            }
            return;
        }

        // Render review cards
        container.innerHTML = filteredReviews.map(review => this.createReviewCard(review, 'full')).join('');
    },

    /**
     * Show error state for ratings panel reviews
     */
    showRatingsError(errorMessage) {
        const container = document.getElementById('ratings-reviews-container');
        const emptyState = document.getElementById('ratings-reviews-empty');

        if (!container) return;
        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-circle text-6xl text-red-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-red-600 mb-2">Failed to load reviews</h3>
                <p class="text-gray-500 mb-4">${errorMessage || 'An error occurred while loading reviews'}</p>
                <button onclick="ParentReviewsManager.retryLoadReviews()" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    <i class="fas fa-redo mr-2"></i>Try Again
                </button>
            </div>
        `;
    },

    /**
     * Create a review card HTML
     * @param {object} review - Review data from parent_reviews table
     * @param {string} mode - 'compact' for dashboard, 'full' for ratings panel
     *
     * API Response Fields:
     * - id, parent_id, reviewer_id, user_role
     * - rating, title, review_text
     * - engagement_with_tutor_rating, engagement_with_child_rating
     * - responsiveness_rating, payment_consistency_rating
     * - is_verified, helpful_count, is_featured
     * - created_at, updated_at
     * - reviewer_name (if joined), reviewer_profile_picture (if joined)
     */
    createReviewCard(review, mode = 'compact') {
        const avgRating = this.calculateAverageRating(review);
        const starsHtml = this.createStarsHtml(avgRating);
        const timeAgo = this.formatTimeAgo(review.created_at);

        // Get reviewer name - API might provide reviewer_name or we use a default based on role
        const reviewerName = review.reviewer_name || review.tutor_name || `${review.user_role || 'Tutor'}`;
        const reviewerInitial = (reviewerName || 'T').charAt(0).toUpperCase();
        const reviewerPicture = review.reviewer_profile_picture || review.tutor_profile_picture;

        // Get review text - API uses review_text, but support comment for backward compatibility
        const reviewText = review.review_text || review.comment || '';

        if (mode === 'compact') {
            return `
                <div class="flex items-start gap-4 p-4 rounded-lg border hover:shadow-md transition-shadow" style="background: var(--bg-secondary); border-color: var(--border-color);">
                    <div class="flex-shrink-0">
                        ${reviewerPicture
                            ? `<img src="${reviewerPicture}" alt="${reviewerName}" class="w-10 h-10 rounded-full object-cover">`
                            : `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">${reviewerInitial}</div>`
                        }
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="font-semibold truncate" style="color: var(--heading);">${reviewerName}</h4>
                            <span class="text-xs" style="color: var(--text-secondary);">${timeAgo}</span>
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-yellow-500 text-sm">${starsHtml}</span>
                            <span class="text-xs" style="color: var(--text-secondary);">(${avgRating.toFixed(1)})</span>
                        </div>
                        <p class="text-sm line-clamp-2" style="color: var(--text);">${reviewText || 'No comment provided'}</p>
                    </div>
                </div>
            `;
        } else {
            // Full mode for ratings panel - show all rating categories
            return `
                <div class="review-card p-6 mb-4 transition-all" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px;">
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0">
                            ${reviewerPicture
                                ? `<img src="${reviewerPicture}" alt="${reviewerName}" class="w-14 h-14 rounded-full object-cover border-2" style="border-color: rgba(139, 92, 246, 0.3);">`
                                : `<div class="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">${reviewerInitial}</div>`
                            }
                        </div>
                        <div class="flex-1">
                            <div class="flex items-start justify-between mb-2">
                                <div>
                                    <h4 class="font-bold text-lg" style="color: var(--heading);">${reviewerName}</h4>
                                    <p class="text-sm" style="color: var(--text-secondary);">
                                        ${review.title ? review.title : (review.user_role === 'tutor' ? 'Tutor' : 'Reviewer')}
                                    </p>
                                </div>
                                <div class="text-right">
                                    <div class="flex items-center gap-1">
                                        <span class="text-yellow-500 text-lg">${starsHtml}</span>
                                        <span class="text-sm font-semibold" style="color: var(--heading);">${avgRating.toFixed(1)}</span>
                                    </div>
                                    <span class="text-xs" style="color: var(--text-secondary);">${timeAgo}</span>
                                </div>
                            </div>

                            <!-- Rating breakdown -->
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 rounded-lg" style="background: var(--bg-secondary);">
                                <div class="text-center">
                                    <div class="text-xs mb-1" style="color: var(--text-secondary);">Engagement w/ Tutor</div>
                                    <div class="font-semibold text-purple-600">${(review.engagement_with_tutor_rating || 0).toFixed(1)}</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-xs mb-1" style="color: var(--text-secondary);">Engagement w/ Child</div>
                                    <div class="font-semibold text-blue-600">${(review.engagement_with_child_rating || 0).toFixed(1)}</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-xs mb-1" style="color: var(--text-secondary);">Responsiveness</div>
                                    <div class="font-semibold text-green-600">${(review.responsiveness_rating || 0).toFixed(1)}</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-xs mb-1" style="color: var(--text-secondary);">Payment</div>
                                    <div class="font-semibold text-orange-600">${(review.payment_consistency_rating || 0).toFixed(1)}</div>
                                </div>
                            </div>

                            <!-- Comment -->
                            ${reviewText ? `
                                <div style="color: var(--text);">
                                    <p class="leading-relaxed">"${reviewText}"</p>
                                </div>
                            ` : `
                                <p class="italic" style="color: var(--text-secondary);">No comment provided</p>
                            `}

                            ${review.is_verified ? `
                                <div class="mt-3 flex items-center gap-2 text-sm text-green-600">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Verified Review</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Calculate the average rating from the 4 rating categories
     * Uses the API field names: *_rating suffix
     */
    calculateAverageRating(review) {
        // Handle both API field names (*_rating) and simplified names
        const ratings = [
            review.engagement_with_tutor_rating || review.engagement_with_tutor || 0,
            review.engagement_with_child_rating || review.engagement_with_child || 0,
            review.responsiveness_rating || review.responsiveness || 0,
            review.payment_consistency_rating || review.payment_consistency || 0
        ];
        const validRatings = ratings.filter(r => r > 0);
        if (validRatings.length === 0) return review.rating || 0; // Fall back to overall rating
        return validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
    },

    /**
     * Create stars HTML from rating
     */
    createStarsHtml(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating - fullStars >= 0.5;
        let html = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                html += '★';
            } else if (i === fullStars && hasHalfStar) {
                html += '★';
            } else {
                html += '☆';
            }
        }
        return html;
    },

    /**
     * Format timestamp to "time ago" string
     */
    formatTimeAgo(dateString) {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    },

    /**
     * Update the filter tab counts based on actual reviews
     */
    updateFilterCounts() {
        const filterTabs = document.querySelectorAll('.star-filter-tab');

        // Count reviews by star rating
        const counts = { all: this.allReviews.length, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        this.allReviews.forEach(review => {
            const avgRating = Math.floor(this.calculateAverageRating(review));
            if (avgRating >= 1 && avgRating <= 5) {
                counts[avgRating]++;
            }
        });

        // Update tab counts
        filterTabs.forEach(tab => {
            const filter = tab.getAttribute('data-filter');
            const countSpan = tab.querySelector('.tab-count');
            if (countSpan && counts[filter] !== undefined) {
                countSpan.textContent = `(${counts[filter]})`;
            }
        });
    },

    /**
     * Filter reviews by star rating (called from filter tabs)
     */
    filterByStars(starRating) {
        this.currentFilter = starRating;

        // Update active tab styling
        const filterTabs = document.querySelectorAll('.star-filter-tab');
        filterTabs.forEach(tab => {
            const filter = tab.getAttribute('data-filter');
            if (filter === starRating.toString()) {
                tab.classList.add('active');
                tab.style.borderColor = 'var(--primary-color, #8B5CF6)';
                tab.style.background = 'rgba(139, 92, 246, 0.1)';
            } else {
                tab.classList.remove('active');
                tab.style.borderColor = 'var(--border-color, #e5e7eb)';
                tab.style.background = 'transparent';
            }
        });

        // Re-render with filter
        this.renderRatingsReviews(starRating);
    },

    /**
     * Retry loading reviews (called from error state buttons)
     */
    async retryLoadReviews() {
        // Show loading state
        const dashboardContainer = document.getElementById('dashboard-reviews-container');
        const ratingsContainer = document.getElementById('ratings-reviews-container');

        if (dashboardContainer) {
            dashboardContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p class="text-gray-500 text-sm">Loading reviews...</p>
                </div>
            `;
        }

        if (ratingsContainer) {
            ratingsContainer.innerHTML = `
                <div class="text-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p class="text-gray-500">Loading reviews...</p>
                </div>
            `;
        }

        // Retry loading
        await this.loadAllReviews();
    }
};

// Make manager available globally
window.ParentReviewsManager = ParentReviewsManager;

// Setup filter tab click handlers when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup star filter tabs for ratings panel
    const filterTabs = document.querySelectorAll('.star-filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            ParentReviewsManager.filterByStars(filter);
        });
    });
});

// ============================================
// CHILDREN MANAGER
// Handles loading and displaying children from student_profiles table
// ============================================

const ChildrenManager = {
    // Store all children data
    allChildren: [],
    isLoading: false,

    /**
     * Initialize the children manager
     */
    async init() {
        console.log('[ChildrenManager] Initializing...');
        await this.loadChildren();
    },

    /**
     * Load all children from the API
     */
    async loadChildren() {
        const container = document.getElementById('children-cards-container');
        const emptyState = document.getElementById('children-empty-state');
        const loadingState = document.getElementById('children-loading-state');

        if (!container) {
            console.log('[ChildrenManager] Container not found');
            return;
        }

        try {
            this.isLoading = true;

            // Show loading state
            if (loadingState) loadingState.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            container.innerHTML = '';

            // Fetch children from API
            const data = await ParentProfileAPI.getChildren();
            this.allChildren = data.children || [];

            console.log('[ChildrenManager] Loaded children:', this.allChildren);

            // Hide loading state
            if (loadingState) loadingState.classList.add('hidden');

            // Check for empty
            if (this.allChildren.length === 0) {
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }

            // Render children cards
            this.renderChildren(container);

            // Update children count in header stats
            this.updateChildrenCount();

        } catch (error) {
            console.error('[ChildrenManager] Error loading children:', error);
            if (loadingState) loadingState.classList.add('hidden');
            this.showError(container, error.message);
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Render children cards to container
     */
    renderChildren(container) {
        container.innerHTML = this.allChildren.map(child => this.createChildCard(child)).join('');
    },

    /**
     * Create a child card HTML - Matches tutor-profile's student card design
     * @param {object} child - Child data from API
     */
    createChildCard(child) {
        const name = child.name || 'Unknown';
        // Use UI Avatars as default if no profile picture - prevents 404 errors
        const profilePicture = child.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff&size=128`;
        const gradeLevel = child.grade_level || 'Grade not set';
        const studyingAt = child.studying_at || '';

        // Calculate days since profile was created
        const createdDate = child.created_at ? new Date(child.created_at) : new Date();
        const daysOnPlatform = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));

        // Mock data for now (will be real in future with session tracking)
        const totalAssignments = Math.floor(Math.random() * 8) + 3;
        const completedAssignments = Math.floor(totalAssignments * (Math.random() * 0.3 + 0.6));
        const progress = Math.floor(Math.random() * 30) + 60;
        const attendance = Math.floor(Math.random() * 20) + 80;
        const improvement = Math.floor(Math.random() * 30) + 10;

        // Progress bar color based on percentage
        const getProgressColor = (percent) => {
            if (percent >= 80) return 'var(--success)';
            if (percent >= 60) return 'var(--primary-color)';
            return 'var(--error)';
        };

        const studentUrl = `../view-profiles/view-student.html?id=${child.id}`;

        return `
            <div class="card" style="padding: 1.5rem; border-radius: 12px; background: var(--card-bg); border: 1px solid var(--border-color); transition: var(--transition); box-shadow: var(--shadow-sm);" data-child-id="${child.id}" data-user-id="${child.user_id}">
                <!-- Child Header -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <img src="${profilePicture}"
                        alt="${name}"
                        onerror="if(!this.dataset.fallbackApplied){this.dataset.fallbackApplied='true';this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff&size=128'}"
                        style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color); box-shadow: var(--shadow-sm);">
                    <div style="flex: 1;">
                        <h4 style="font-weight: 700; font-size: 1.125rem; margin: 0 0 0.25rem 0; color: var(--heading);">
                            <a href="${studentUrl}" style="color: inherit; text-decoration: none; cursor: pointer; transition: var(--transition-fast);"
                               onmouseover="this.style.color='var(--primary-color)'"
                               onmouseout="this.style.color='var(--heading)'">
                                ${name}
                            </a>
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-graduation-cap" style="color: var(--primary-color);"></i>
                                ${gradeLevel}
                            </span>
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-calendar-alt" style="color: var(--primary-color);"></i>
                                ${daysOnPlatform} days
                            </span>
                        </div>
                    </div>
                </div>

                <!-- School & Interests Info -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">School</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">${studyingAt || 'Not specified'}</p>
                    </div>
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Assignments</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">${completedAssignments}/${totalAssignments} Completed</p>
                    </div>
                </div>

                <!-- Stats Grid (Attendance & Improvement) -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
                    <div style="text-align: center; padding: 0.75rem; background: var(--activity-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.25rem;">${attendance}%</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Attendance</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: var(--activity-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success); margin-bottom: 0.25rem;">+${improvement}%</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Improvement</div>
                    </div>
                </div>

                <!-- Overall Progress Section -->
                <div style="margin-bottom: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Overall Progress</span>
                        <span style="font-size: 0.875rem; font-weight: 700; color: ${getProgressColor(progress)};">${progress}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--activity-bg); border-radius: 999px; overflow: hidden; border: 1px solid var(--border-color);">
                        <div style="height: 100%; width: ${progress}%; background: ${getProgressColor(progress)}; border-radius: 999px; transition: width 0.5s ease;"></div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 0.5rem;">
                    <button
                        onclick="ChildrenManager.openChildDetails(${child.id})"
                        class="btn-primary"
                        style="flex: 1; padding: 0.625rem; font-size: 0.875rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600;">
                        <i class="fas fa-chart-line"></i> View Details
                    </button>
                    <button
                        onclick="ChildrenManager.messageChild(${child.user_id}, '${name.replace(/'/g, "\\'")}', '${profilePicture.replace(/'/g, "\\'")}')"
                        class="btn-secondary"
                        style="padding: 0.625rem 1rem; font-size: 0.875rem; border-radius: 8px;"
                        title="Message ${name}">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Message child - opens chat modal with child as target
     * @param {number} userId - Child's user ID
     * @param {string} name - Child's name
     * @param {string} profilePicture - Child's profile picture URL
     */
    messageChild(userId, name, profilePicture) {
        // Open chat modal with child's data
        if (typeof openChatModal === 'function' || typeof ChatModalManager !== 'undefined') {
            const targetUser = {
                user_id: userId,
                id: userId,
                full_name: name,
                name: name,
                profile_picture: profilePicture,
                avatar: profilePicture,
                profile_type: 'student',
                role: 'student'
            };

            console.log('[ChildrenManager] Opening chat with child:', targetUser);

            // Use ChatModalManager if available
            if (typeof ChatModalManager !== 'undefined' && ChatModalManager.open) {
                ChatModalManager.open(targetUser);
            } else if (typeof openChatModal === 'function') {
                openChatModal(targetUser);
            }
        } else {
            console.error('[ChildrenManager] Chat modal not available');
            showNotification('Chat feature is loading. Please try again.', 'info');
        }
    },

    /**
     * Show error state
     */
    showError(container, errorMessage) {
        const emptyState = document.getElementById('children-empty-state');
        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = `
            <div class="children-error-state">
                <div class="error-icon">⚠️</div>
                <h3 class="error-title">Failed to load children</h3>
                <p class="error-message">${errorMessage || 'An error occurred while loading your children'}</p>
                <button class="btn-primary" onclick="ChildrenManager.retryLoad()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    },

    /**
     * Retry loading children
     */
    async retryLoad() {
        await this.loadChildren();
    },

    /**
     * Update children count in various places
     */
    updateChildrenCount() {
        const count = this.allChildren.length;

        // Update stat in profile header
        const statChildrenEl = document.getElementById('stat-children');
        if (statChildrenEl) {
            statChildrenEl.textContent = count;
        }

        // Update connections count
        const connectionsCount = document.getElementById('connections-count');
        if (connectionsCount) {
            connectionsCount.textContent = count;
        }

        // Update children count badge (matches tutor-profile's student count badge)
        const badge = document.getElementById('children-count-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = `${count} child${count !== 1 ? 'ren' : ''}`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    /**
     * Open child details modal - loads and displays student-details-modal
     */
    async openChildDetails(childId) {
        const child = this.allChildren.find(c => c.id === childId);
        if (!child) {
            showNotification('Child not found', 'error');
            return;
        }

        console.log('[ChildrenManager] Opening child details modal for:', child);

        // Ensure modal is loaded first
        if (!document.getElementById('studentDetailsModal')) {
            console.log('[ChildrenManager] Student details modal not found, loading...');
            await this.loadStudentDetailsModal();
        }

        // Open modal
        const modal = document.getElementById('studentDetailsModal');
        if (!modal) {
            console.error('[ChildrenManager] Failed to load student details modal');
            // Fallback to view page
            window.location.href = `../view-profiles/view-student.html?id=${child.user_id}`;
            return;
        }

        // Show modal
        modal.style.display = 'flex';
        modal.classList.add('active');

        // Populate modal with child data
        this.populateStudentDetailsModal(child);
    },

    /**
     * Load student details modal HTML from common-modals
     */
    async loadStudentDetailsModal() {
        try {
            const response = await fetch('../modals/common-modals/student-details-modal.html');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // Get or create modal container
            let container = document.getElementById('modal-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'modal-container';
                document.body.appendChild(container);
            }

            // Check if modal already exists
            if (!document.getElementById('studentDetailsModal')) {
                container.insertAdjacentHTML('beforeend', html);
                console.log('[ChildrenManager] Loaded student details modal');
            }
        } catch (error) {
            console.error('[ChildrenManager] Failed to load student details modal:', error);
        }
    },

    /**
     * Populate the student details modal with child data
     */
    populateStudentDetailsModal(child) {
        // Set context to parent-profile (hide Parent section, show Tutor section)
        if (typeof window.setStudentDetailsModalContext === 'function') {
            window.setStudentDetailsModalContext('parent-profile');
        }

        // Store current student for review system
        window.currentStudentForReview = {
            student_profile_id: child.id,  // child.id is student_profile.id
            student_name: child.name || 'Student'
        };
        window.currentStudentDetails = child;

        // Update header
        const studentNameEl = document.getElementById('studentName');
        if (studentNameEl) {
            studentNameEl.textContent = child.name || 'Unknown Student';
        }

        // Update profile picture
        const profilePicEl = document.getElementById('studentProfilePicture');
        if (profilePicEl) {
            const defaultPic = child.gender === 'Female'
                ? '/uploads/system_images/system_profile_pictures/girl-user-image.jpg'
                : '/uploads/system_images/system_profile_pictures/boy-user-image.jpg';
            profilePicEl.src = child.profile_picture || defaultPic;
        }

        // Update subtitle (grade level and stream)
        const headerSubtitle = document.querySelector('#studentDetailsModal .modal-header p');
        if (headerSubtitle) {
            const gradeLevel = child.grade_level || 'Grade not set';
            const stream = child.stream || '';
            headerSubtitle.textContent = stream ? `${gradeLevel} • ${stream}` : gradeLevel;
        }

        // Update stats
        const attendance = Math.floor(Math.random() * 20) + 80;
        const improvement = Math.floor(Math.random() * 30) + 10;
        const progress = Math.floor(Math.random() * 30) + 60;

        const statOverallProgress = document.getElementById('stat-overall-progress');
        const statAttendance = document.getElementById('stat-attendance');
        const statImprovement = document.getElementById('stat-improvement');

        if (statOverallProgress) statOverallProgress.textContent = `${progress}%`;
        if (statAttendance) statAttendance.textContent = `${attendance}%`;
        if (statImprovement) statImprovement.textContent = `+${improvement}%`;

        // Update achievements list
        const achievementsList = document.getElementById('achievements-list');
        if (achievementsList) {
            achievementsList.innerHTML = `
                <li><i class="fas fa-trophy text-yellow-500"></i> Completed 5 assignments on time</li>
                <li><i class="fas fa-star text-blue-500"></i> Improved math score by 15%</li>
                <li><i class="fas fa-medal text-green-500"></i> Perfect attendance for 2 weeks</li>
            `;
        }

        // Load tutor information (visible since we're from parent-profile)
        const studentProfileId = child.id;  // child.id is student_profile.id
        if (typeof window.loadTutorInformation === 'function') {
            console.log('[ChildrenManager] Loading tutor info for student_profile_id:', studentProfileId);
            window.loadTutorInformation(studentProfileId);
        }

        // Load student reviews
        if (typeof window.loadStudentReviews === 'function') {
            console.log('[ChildrenManager] Loading reviews for student_profile_id:', studentProfileId);
            window.loadStudentReviews(studentProfileId);
        }

        // Load packages for this student
        if (typeof window.loadStudentPackages === 'function') {
            console.log('[ChildrenManager] Loading packages for student_profile_id:', studentProfileId);
            window.loadStudentPackages(studentProfileId);
        }

        // Load whiteboard sessions for this student
        if (typeof window.loadStudentWhiteboardSessions === 'function') {
            console.log('[ChildrenManager] Loading whiteboard sessions for student_profile_id:', studentProfileId);
            window.loadStudentWhiteboardSessions(studentProfileId);
        }

        // Load tutoring sessions for this student
        if (typeof window.loadStudentSessions === 'function') {
            console.log('[ChildrenManager] Loading sessions for student_profile_id:', studentProfileId);
            window.loadStudentSessions(studentProfileId);
        }

        // Load coursework for this student
        if (typeof window.loadStudentCoursework === 'function') {
            console.log('[ChildrenManager] Loading coursework for student_profile_id:', studentProfileId);
            window.loadStudentCoursework(studentProfileId);
        }

        // Initialize section switching and sidebar toggle
        this.initModalSections();
    },

    /**
     * Initialize modal section switching and sidebar toggle
     */
    initModalSections() {
        // Ensure first section is active
        const firstSection = document.querySelector('#studentDetailsModal .content-section');
        if (firstSection) {
            // Deactivate all sections
            document.querySelectorAll('#studentDetailsModal .content-section').forEach(s => s.classList.remove('active'));
            // Activate first
            firstSection.classList.add('active');
        }

        // Ensure first sidebar item is active
        const firstMenuItem = document.querySelector('#studentDetailsModal .sidebar-menu-item:not(.sidebar-toggle-item)');
        if (firstMenuItem) {
            document.querySelectorAll('#studentDetailsModal .sidebar-menu-item').forEach(m => m.classList.remove('active'));
            firstMenuItem.classList.add('active');
        }
    },

    /**
     * Navigate to student profile
     */
    viewStudentProfile(userId) {
        window.location.href = `../view-profiles/view-student.html?id=${userId}`;
    },

    /**
     * Search/filter children - Matches tutor-profile's student search
     */
    searchChildren(searchTerm) {
        const container = document.getElementById('children-cards-container');
        if (!container) return;

        const term = searchTerm?.toLowerCase().trim() || '';

        if (!term) {
            // Show all children if search is empty
            this.renderChildren(container);
            return;
        }

        const filtered = this.allChildren.filter(child => {
            const name = (child.name || '').toLowerCase();
            const grade = (child.grade_level || '').toLowerCase();
            const school = (child.studying_at || '').toLowerCase();
            const location = (child.location || '').toLowerCase();
            const email = (child.email || '').toLowerCase();

            return name.includes(term) ||
                   grade.includes(term) ||
                   school.includes(term) ||
                   location.includes(term) ||
                   email.includes(term);
        });

        console.log(`[ChildrenManager] Search "${term}" found ${filtered.length} children`);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-gray-500">
                    <i class="fas fa-search text-3xl mb-3"></i>
                    <p>No children found matching your search</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(child => this.createChildCard(child)).join('');
    }
};

// Make ChildrenManager available globally
window.ChildrenManager = ChildrenManager;

// ============================================
// STUDENT DETAILS MODAL HELPER FUNCTIONS
// These are used by onclick handlers in student-details-modal.html
// ============================================

/**
 * Close student details modal
 */
function closeStudentDetailsModal() {
    const modal = document.getElementById('studentDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

/**
 * Switch section in student details modal
 */
function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('#studentDetailsModal .content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update sidebar active state
    document.querySelectorAll('#studentDetailsModal .sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Find and activate the clicked menu item
    const clickedItem = document.querySelector(`#studentDetailsModal .sidebar-menu-item[onclick="switchSection('${sectionId}')"]`);
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
}

/**
 * Toggle student modal sidebar (collapse/expand)
 */
function toggleStudentModalSidebar() {
    const sidebar = document.getElementById('studentModalSidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

/**
 * Filter assignments by status
 */
function filterAssignments(status) {
    const cards = document.querySelectorAll('#studentDetailsModal .assignment-card');
    const tabs = document.querySelectorAll('#studentDetailsModal .assignment-tab');

    // Update active tab
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.borderBottomColor = 'transparent';
        tab.style.color = 'var(--text-muted)';
    });

    const activeTab = document.querySelector(`#studentDetailsModal .assignment-tab[data-filter="${status}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.borderBottomColor = 'var(--button-bg)';
        activeTab.style.color = 'var(--text)';
    }

    // Filter cards
    cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        if (status === 'all' || cardStatus === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Generate report for student
 */
function generateReport() {
    showNotification('Generating report... This feature is coming soon!', 'info');
}

/**
 * Export student data
 */
function exportData() {
    showNotification('Exporting data... This feature is coming soon!', 'info');
}

/**
 * Share progress with parent
 */
function shareWithParent() {
    showNotification('Sharing with parent... This feature is coming soon!', 'info');
}

/**
 * Download receipt
 */
function downloadReceipt(receiptId) {
    showNotification(`Downloading receipt #${receiptId}... This feature is coming soon!`, 'info');
}

/**
 * Send payment reminder
 */
function sendPaymentReminder() {
    showNotification('Payment reminder sent!', 'success');
}

/**
 * View assignment
 */
function viewAssignment(assignmentId) {
    showNotification(`Viewing assignment #${assignmentId}... This feature is coming soon!`, 'info');
}

/**
 * Grade assignment
 */
function gradeAssignment(assignmentId) {
    showNotification(`Grading assignment #${assignmentId}... This feature is coming soon!`, 'info');
}

/**
 * Send reminder for assignment
 */
function sendReminder(assignmentId) {
    showNotification(`Reminder sent for assignment #${assignmentId}!`, 'success');
}

/**
 * Follow up on overdue assignment
 */
function followUp(assignmentId) {
    showNotification(`Following up on assignment #${assignmentId}... This feature is coming soon!`, 'info');
}

/**
 * Add new assignment
 */
function addNewAssignment() {
    showNotification('Add assignment feature coming soon!', 'info');
}

/**
 * Change attendance month
 */
function changeAttendanceMonth(month) {
    console.log('Changing attendance month to:', month);
    showNotification(`Loading attendance for ${month}...`, 'info');
}

// Make helper functions available globally
window.closeStudentDetailsModal = closeStudentDetailsModal;
window.switchSection = switchSection;
window.toggleStudentModalSidebar = toggleStudentModalSidebar;
window.filterAssignments = filterAssignments;
window.generateReport = generateReport;
window.exportData = exportData;
window.shareWithParent = shareWithParent;
window.downloadReceipt = downloadReceipt;
window.sendPaymentReminder = sendPaymentReminder;
window.viewAssignment = viewAssignment;
window.gradeAssignment = gradeAssignment;
window.sendReminder = sendReminder;
window.followUp = followUp;
window.addNewAssignment = addNewAssignment;
window.changeAttendanceMonth = changeAttendanceMonth;