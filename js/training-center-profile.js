// Training Center Profile JavaScript - Complete Enhanced Version

// Global Variables
let currentContentPanel = 'dashboard';
let isFollowersView = true;
let isSidebarOpen = true;

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeSidebar();
    initializeContentPanels();
    initializeFAB();
    initializeModals();
    initializeFollowersModal();
    initializeScheduleSync();
    loadDashboardContent();
    initializeEventListeners();
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Sidebar Management
function toggleSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    const mainContainer = document.querySelector('.main-container');
    
    isSidebarOpen = !isSidebarOpen;
    
    if (isSidebarOpen) {
        sidebar.classList.remove('closed');
        mainContainer.classList.add('with-sidebar');
        mainContainer.classList.remove('sidebar-closed');
    } else {
        sidebar.classList.add('closed');
        mainContainer.classList.remove('with-sidebar');
        mainContainer.classList.add('sidebar-closed');
    }
}

function initializeSidebar() {
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    
    sidebarButtons.forEach(button => {
        button.addEventListener('click', function() {
            const contentType = this.getAttribute('data-content');
            
            // Update active button
            sidebarButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Switch content
            switchContent(contentType);
        });
    });
}

// Content Panel Management
function initializeContentPanels() {
    // Set dashboard as default active panel
    document.getElementById('dashboard-content').classList.add('active');
}

function switchContent(contentType) {
    // Hide all content panels
    const allPanels = document.querySelectorAll('.sidebar-content-panel');
    allPanels.forEach(panel => panel.classList.remove('active'));
    
    // Show selected content panel
    const selectedPanel = document.getElementById(`${contentType}-content`);
    if (selectedPanel) {
        selectedPanel.classList.add('active');
        
        // Load dynamic content if needed
        loadContentIfNeeded(contentType);
    }
    
    currentContentPanel = contentType;
}

function loadContentIfNeeded(contentType) {
    switch(contentType) {
        case 'classes':
            loadClasses();
            break;
        case 'community':
            loadCommunityGroups();
            break;
        case 'podcasts':
            loadPodcasts();
            break;
        case 'videos':
            loadVideos();
            break;
        case 'blog':
            loadBlogPosts();
            break;
        case 'comments':
            loadComments();
            break;
    }
}

// Load Dashboard Content
function loadDashboardContent() {
    // Content is already in HTML, just ensure it's visible
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.classList.add('active');
    }
}

// Dynamic Content Loading Functions
function loadClasses() {
    const classesGrid = document.querySelector('#classes-content .classes-grid');
    if (!classesGrid || classesGrid.children.length > 0) return;
    
    const classesHTML = `
        <div class="class-card hover-lift">
            <div class="class-banner">
                <img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400" alt="Class">
                <span class="class-category">Videography</span>
            </div>
            <div class="class-content">
                <h3>Advanced Cinematography</h3>
                <div class="instructor-info">
                    <img src="https://via.placeholder.com/30" alt="Instructor" class="instructor-avatar">
                    <span>Prof. David Martinez</span>
                </div>
                <p class="class-description">Master the art of visual storytelling through advanced camera techniques.</p>
                <div class="class-meta">
                    <span>👥 45 Students</span>
                    <span>⏱️ 3h/week</span>
                    <span>📅 Mon, Wed, Fri</span>
                </div>
                <div class="class-actions">
                    <button class="btn-view">View Details</button>
                </div>
            </div>
        </div>
    `;
    
    classesGrid.innerHTML = classesHTML;
}

function loadCommunityGroups() {
    const groupsGrid = document.querySelector('#community-content .groups-grid');
    if (!groupsGrid || groupsGrid.children.length > 0) return;
    
    const groupsHTML = `
        <div class="group-card hover-lift">
            <div class="group-header">
                <div class="group-icon">🎥</div>
                <h3>Film Enthusiasts</h3>
                <span class="member-count">234 members</span>
            </div>
            <p>A community for passionate filmmakers to share ideas and collaborate</p>
            <div class="group-members">
                <img src="https://via.placeholder.com/30" alt="Member">
                <img src="https://via.placeholder.com/30" alt="Member">
                <img src="https://via.placeholder.com/30" alt="Member">
                <span class="more-members">+231</span>
            </div>
            <button class="btn-secondary">Join Group</button>
        </div>
    `;
    
    groupsGrid.innerHTML = groupsHTML;
}

function loadPodcasts() {
    const podcastGrid = document.querySelector('#podcasts-content .podcast-grid');
    if (!podcastGrid || podcastGrid.children.length > 0) return;
    
    const podcastsHTML = `
        <div class="podcast-card hover-lift">
            <div class="podcast-cover">
                <img src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400" alt="Podcast">
                <div class="podcast-play-overlay">
                    <button class="play-btn">▶️</button>
                </div>
            </div>
            <div class="podcast-info">
                <h3>The Creative Process</h3>
                <p class="podcast-author">By Prof. David Martinez</p>
                <p class="podcast-description">Exploring the minds of successful filmmakers.</p>
                <div class="podcast-meta">
                    <span>🎧 45 Episodes</span>
                    <span>⏱️ 30-45 min</span>
                    <span>📅 Weekly</span>
                </div>
            </div>
        </div>
    `;
    
    podcastGrid.innerHTML = podcastsHTML;
}

function loadVideos() {
    const videosGrid = document.querySelector('#videos-content .videos-grid');
    if (!videosGrid || videosGrid.children.length > 0) return;
    
    const videosHTML = `
        <div class="video-card hover-lift">
            <div class="video-thumbnail">
                <img src="https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400" alt="Video">
                <span class="video-duration">12:45</span>
                <div class="video-play-overlay">
                    <button class="play-btn">▶️</button>
                </div>
            </div>
            <div class="video-info">
                <h3>Introduction to Film Lighting</h3>
                <p class="video-author">Prof. David Martinez</p>
                <div class="video-stats">
                    <span>👁️ 2.3k views</span>
                    <span>👍 234</span>
                    <span>📅 2 days ago</span>
                </div>
            </div>
        </div>
    `;
    
    videosGrid.innerHTML = videosHTML;
}

function loadBlogPosts() {
    const blogGrid = document.querySelector('#blog-content .blog-grid');
    if (!blogGrid || blogGrid.children.length > 0) return;
    
    const blogHTML = `
        <div class="blog-card hover-lift">
            <div class="blog-image">
                <img src="https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=400" alt="Blog">
                <span class="blog-category">Industry News</span>
            </div>
            <div class="blog-content">
                <h3>The Future of Film Education in 2025</h3>
                <p class="blog-excerpt">Exploring how technology and AI are reshaping filmmaking education...</p>
                <div class="blog-meta">
                    <div class="blog-author">
                        <img src="https://via.placeholder.com/30" alt="Author">
                        <span>Prof. David Martinez</span>
                    </div>
                    <span class="blog-date">Dec 10, 2024</span>
                </div>
                <div class="blog-stats">
                    <span>📖 5 min read</span>
                    <span>💬 23 comments</span>
                    <span>❤️ 145 likes</span>
                </div>
            </div>
        </div>
    `;
    
    blogGrid.innerHTML = blogHTML;
}

function loadComments() {
    const commentsSection = document.querySelector('#comments-content .comments-section');
    if (!commentsSection || commentsSection.children.length > 0) return;
    
    const commentsHTML = `
        <div class="comment-thread">
            <div class="comment-main">
                <img src="https://via.placeholder.com/40" alt="User" class="comment-avatar">
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">John Smith</span>
                        <span class="comment-date">2 days ago</span>
                    </div>
                    <div class="comment-text">
                        Amazing learning experience! The instructors are world-class and the curriculum is comprehensive.
                    </div>
                    <div class="comment-actions">
                        <button class="comment-action-btn">👍 12</button>
                        <button class="comment-action-btn">Reply</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="comment-thread">
            <div class="comment-main">
                <img src="https://via.placeholder.com/40" alt="User" class="comment-avatar">
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">Emily Davis</span>
                        <span class="comment-date">1 week ago</span>
                    </div>
                    <div class="comment-text">
                        Best decision I made for my career. The hands-on approach and industry connections are invaluable.
                    </div>
                    <div class="comment-actions">
                        <button class="comment-action-btn">👍 8</button>
                        <button class="comment-action-btn">Reply</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    commentsSection.innerHTML = commentsHTML;
}

// FAB (Floating Action Button)
function initializeFAB() {
    const fab = document.getElementById('main-fab');
    if (!fab) return;
    
    let isMenuOpen = false;
    
    fab.addEventListener('click', function() {
        isMenuOpen = !isMenuOpen;
        const fabMenu = document.querySelector('.fab-menu');
        
        if (isMenuOpen) {
            fabMenu.style.opacity = '1';
            fabMenu.style.visibility = 'visible';
            fabMenu.style.transform = 'translateY(-10px)';
            this.querySelector('.fab-icon').style.transform = 'rotate(45deg)';
        } else {
            fabMenu.style.opacity = '0';
            fabMenu.style.visibility = 'hidden';
            fabMenu.style.transform = 'translateY(20px)';
            this.querySelector('.fab-icon').style.transform = 'rotate(0deg)';
        }
    });
}

// Modal Functions
function initializeModals() {
    // Close modals on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
        modal.classList.remove('show');
    });
    document.body.style.overflow = '';
}

// Edit Profile Modal
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}


// ... continuing training-center-profile.js

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function saveProfile() {
    const companyName = document.getElementById('companyName').value;
    const quote = document.getElementById('centerQuote').value;
    const aboutUs = document.getElementById('aboutUs').value;
    
    // Update UI
    document.getElementById('centerName').textContent = companyName;
    document.getElementById('profileQuote').textContent = quote;
    document.getElementById('aboutText').textContent = aboutUs;
    
    // Update locations
    const locationInputs = document.querySelectorAll('#locationsContainer .form-input');
    const locations = Array.from(locationInputs).map(input => input.value).filter(val => val);
    document.getElementById('locationText').textContent = locations.join(' | ');
    
    showNotification('Profile updated successfully!', 'success');
    closeEditProfileModal();
}

function addLocation() {
    const container = document.getElementById('locationsContainer');
    const locationItem = document.createElement('div');
    locationItem.className = 'location-item';
    locationItem.innerHTML = `
        <input type="text" class="form-input" placeholder="Enter location">
        <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
    `;
    container.appendChild(locationItem);
}

function removeLocation(button) {
    const item = button.parentElement;
    item.remove();
}

function addSocialMedia() {
    const container = document.getElementById('socialMediaContainer');
    const socialItem = document.createElement('div');
    socialItem.className = 'social-item';
    socialItem.innerHTML = `
        <select class="form-select">
            <option value="facebook">Facebook</option>
            <option value="twitter">Twitter/X</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="telegram">Telegram</option>
            <option value="website">Website</option>
        </select>
        <input type="text" class="form-input" placeholder="URL or username">
        <button type="button" class="btn-remove" onclick="removeSocial(this)">×</button>
    `;
    container.appendChild(socialItem);
}

function removeSocial(button) {
    const item = button.parentElement;
    item.remove();
}

// Schedule Modal
function openScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function saveSchedule() {
    const eventTitle = document.getElementById('eventTitle').value;
    const eventType = document.getElementById('eventType').value;
    const startDateTime = document.getElementById('startDateTime').value;
    const endDateTime = document.getElementById('endDateTime').value;
    const eventLocation = document.getElementById('eventLocation').value;
    
    if (!eventTitle || !startDateTime || !endDateTime) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Update next session in profile header
    const nextSessionText = document.getElementById('nextSessionText');
    if (nextSessionText) {
        const startDate = new Date(startDateTime);
        const formattedDate = startDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            hour: 'numeric', 
            minute: 'numeric' 
        });
        nextSessionText.innerHTML = `<strong class="gradient-text">Next Event:</strong> ${eventTitle} - ${formattedDate} - ${eventLocation}`;
    }
    
    // Update upcoming events widget
    const eventsList = document.getElementById('upcomingEventsList');
    if (eventsList) {
        const newEvent = document.createElement('div');
        newEvent.className = 'event-item';
        const eventDate = new Date(startDateTime);
        newEvent.innerHTML = `
            <div class="event-date">
                <span class="date-day">${eventDate.getDate()}</span>
                <span class="date-month">${eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
            </div>
            <div class="event-details">
                <h4>${eventTitle}</h4>
                <p>${eventLocation}</p>
                <span class="event-time">🕐 ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}</span>
            </div>
        `;
        eventsList.insertBefore(newEvent, eventsList.firstChild);
    }
    
    showNotification('Schedule saved successfully!', 'success');
    closeScheduleModal();
    document.getElementById('scheduleForm').reset();
}

function syncGoogleCalendar() {
    showNotification('Connecting to Google Calendar...', 'info');
    
    setTimeout(() => {
        showNotification('Successfully connected to Google Calendar!', 'success');
        const btn = event.target.closest('.sync-btn');
        btn.innerHTML = `
            <span class="sync-icon">✓</span>
            <span>Google Calendar Connected</span>
        `;
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
        btn.style.borderColor = '#22c55e';
    }, 2000);
}

function syncOutlookCalendar() {
    showNotification('Connecting to Outlook Calendar...', 'info');
    
    setTimeout(() => {
        showNotification('Successfully connected to Outlook Calendar!', 'success');
        const btn = event.target.closest('.sync-btn');
        btn.innerHTML = `
            <span class="sync-icon">✓</span>
            <span>Outlook Calendar Connected</span>
        `;
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
        btn.style.borderColor = '#22c55e';
    }, 2000);
}

// Followers Modal
function initializeFollowersModal() {
    const followersModal = document.getElementById('followersModal');
    if (!followersModal) return;
    
    const tabs = followersModal.querySelectorAll('.followers-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabType = this.getAttribute('data-tab');
            isFollowersView = tabType === 'followers';
            loadFollowersList(tabType);
        });
    });
    
    // Search functionality
    const searchInput = followersModal.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterFollowers(e.target.value);
        });
    }
    
    // Filter buttons
    const filterBtns = followersModal.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyFollowerFilter(this.textContent);
        });
    });
}

function openFollowersModal(type) {
    const modal = document.getElementById('followersModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Set active tab based on type
        const tabs = modal.querySelectorAll('.followers-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === type) {
                tab.classList.add('active');
            }
        });
        
        // Update modal title
        const modalTitle = document.getElementById('followersModalTitle');
        if (modalTitle) {
            modalTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
        }
        
        // Load appropriate list
        loadFollowersList(type);
    }
}

function closeFollowersModal() {
    const modal = document.getElementById('followersModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function loadFollowersList(type) {
    const followersList = document.querySelector('.followers-list');
    if (!followersList) return;
    
    const mockUsers = [
        { name: 'John Smith', bio: 'Film enthusiast and content creator', avatar: 'https://via.placeholder.com/50', isOnline: true },
        { name: 'Emily Davis', bio: 'Professional photographer', avatar: 'https://via.placeholder.com/50', isOnline: false },
        { name: 'Michael Johnson', bio: 'Video editor and animator', avatar: 'https://via.placeholder.com/50', isOnline: true },
        { name: 'Sarah Williams', bio: 'Documentary filmmaker', avatar: 'https://via.placeholder.com/50', isOnline: false },
        { name: 'David Brown', bio: 'Cinematographer', avatar: 'https://via.placeholder.com/50', isOnline: true }
    ];
    
    let html = '';
    mockUsers.forEach(user => {
        html += `
            <div class="follower-item">
                <img src="${user.avatar}" alt="${user.name}" class="follower-avatar">
                <div class="follower-info">
                    <div class="follower-name">${user.name} ${user.isOnline ? '<span style="color: #10b981;">●</span>' : ''}</div>
                    <div class="follower-bio">${user.bio}</div>
                </div>
                <button class="follow-btn">${type === 'followers' ? 'Follow Back' : 'Following'}</button>
            </div>
        `;
    });
    
    followersList.innerHTML = html;
}

function filterFollowers(searchTerm) {
    const followerItems = document.querySelectorAll('.follower-item');
    followerItems.forEach(item => {
        const name = item.querySelector('.follower-name').textContent.toLowerCase();
        const bio = item.querySelector('.follower-bio').textContent.toLowerCase();
        
        if (name.includes(searchTerm.toLowerCase()) || bio.includes(searchTerm.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function applyFollowerFilter(filter) {
    const followerItems = document.querySelectorAll('.follower-item');
    followerItems.forEach(item => {
        if (filter === 'Online') {
            const isOnline = item.innerHTML.includes('color: #10b981;');
            item.style.display = isOnline ? 'flex' : 'none';
        } else if (filter === 'Live') {
            // For demo purposes, show random items
            item.style.display = Math.random() > 0.5 ? 'flex' : 'none';
        } else {
            item.style.display = 'flex';
        }
    });
}

// Upload Video Modal
function openUploadVideoModal() {
    const modal = document.getElementById('uploadVideoModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeUploadVideoModal() {
    const modal = document.getElementById('uploadVideoModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function previewThumbnail(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('thumbnailPreview');
            const img = preview.querySelector('img');
            const placeholder = preview.querySelector('.upload-placeholder');
            
            img.src = e.target.result;
            img.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function uploadVideo() {
    showNotification('Video upload started...', 'info');
    
    setTimeout(() => {
        showNotification('Video uploaded successfully!', 'success');
        closeUploadVideoModal();
    }, 2000);
}

// Create Blog Modal
function openCreateBlogModal() {
    const modal = document.getElementById('createBlogModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeCreateBlogModal() {
    const modal = document.getElementById('createBlogModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function publishBlog() {
    showNotification('Blog post published successfully!', 'success');
    closeCreateBlogModal();
}

// Ad Analytics Modal
function openAdAnalyticsModal() {
    const modal = document.getElementById('adAnalyticsModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeAdAnalyticsModal() {
    const modal = document.getElementById('adAnalyticsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function startAdvertising() {
    showNotification('Redirecting to advertising signup...', 'info');
    closeAdAnalyticsModal();
}

// Comments Modal
function openCommentsModal() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeCommentsModal() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Other Action Functions
function openJobModal() {
    showNotification('Job posting modal would open here', 'info');
}

function openClassModal() {
    showNotification('Class creation modal would open here', 'info');
}

function openMyClassesModal() {
    showNotification('My classes modal would open here', 'info');
}

function createGroup() {
    showNotification('Group creation modal would open here', 'info');
}

function createPodcast() {
    showNotification('Podcast creation modal would open here', 'info');
}

function goLive() {
    showNotification('Preparing live stream...', 'info');
}

function navigateToNews(category) {
    showNotification(`Navigating to ${category} news...`, 'info');
}

function navigateToMarket() {
    showNotification('Opening market dashboard...', 'info');
}

function changeNews(direction) {
    // News carousel functionality
    showNotification('News carousel updated', 'info');
}

function goToNews(index) {
    // Go to specific news item
    showNotification(`Showing news item ${index + 1}`, 'info');
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 300px;
    `;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    notification.innerHTML = `
        <span style="font-size: 1.5rem">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize Schedule Sync
function initializeScheduleSync() {
    // This would connect to actual calendar APIs in production
    console.log('Schedule sync initialized');
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Thumbnail upload click
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    if (thumbnailPreview) {
        thumbnailPreview.addEventListener('click', () => {
            document.getElementById('thumbnailInput').click();
        });
    }
    
    // Close FAB menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.fab-container')) {
            const fabMenu = document.querySelector('.fab-menu');
            const fabIcon = document.querySelector('.fab-icon');
            if (fabMenu) {
                fabMenu.style.opacity = '0';
                fabMenu.style.visibility = 'hidden';
                fabMenu.style.transform = 'translateY(20px)';
            }
            if (fabIcon) {
                fabIcon.style.transform = 'rotate(0deg)';
            }
        }
    });
}

// Export functions for external use
window.trainingCenterProfile = {
    showNotification,
    openEditProfileModal,
    closeEditProfileModal,
    openScheduleModal,
    closeScheduleModal,
    openAdAnalyticsModal,
    closeAdAnalyticsModal,
    openCommentsModal,
    closeCommentsModal,
    openFollowersModal,
    closeFollowersModal,
    openUploadVideoModal,
    closeUploadVideoModal,
    openCreateBlogModal,
    closeCreateBlogModal,
    saveProfile,
    saveSchedule,
    startAdvertising,
    createBlog: openCreateBlogModal,
    uploadMedia: openUploadVideoModal,
    createPodcast,
    goLive,
    createGroup,
    openJobModal,
    openClassModal,
    openMyClassesModal,
    syncGoogleCalendar,
    syncOutlookCalendar,
    navigateToNews,
    navigateToMarket,
    changeNews,
    goToNews,
    addLocation,
    removeLocation,
    addSocialMedia,
    removeSocial,
    publishBlog,
    uploadVideo,
    previewThumbnail,
    toggleSidebar,
    toggleTheme,
    openUploadPodcastModal: () => showNotification('Upload podcast modal would open here', 'info'),
    openPlaylistModal: () => showNotification('Playlist modal would open here', 'info')
};

// FAB Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const fabContainer = document.querySelector('.fab-container');
    const fab = document.getElementById('main-fab');
    
    fab.addEventListener('click', function() {
        fabContainer.classList.toggle('active');
        fab.classList.toggle('active');
    });
    
    // Close FAB menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!fabContainer.contains(e.target)) {
            fabContainer.classList.remove('active');
            fab.classList.remove('active');
        }
    });
});

// Modal Functions
function openConnectModal() {
    // Create or open connect modal
    console.log('Opening Connect Modal');
    // Add your connect modal logic here
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function() {
        this.closest('.modal').classList.remove('show');
    });
});

