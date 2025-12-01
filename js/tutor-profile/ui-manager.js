// ============================================
// TUTOR PROFILE UI MANAGER
// Handles all UI updates and rendering
// ============================================

const TutorProfileUI = {
    // Initialize UI
    init() {
        this.setupSidebarToggle();
    },

    // Setup sidebar toggle - REMOVED (handled by sidebar-fix.js)
    // sidebar-fix.js loads last and takes full control of sidebar behavior
    setupSidebarToggle() {
        // No-op: Sidebar is managed by sidebar-fix.js which loads after this file
        // See tutor-profile.html line 2896
    },

    // Toggle sidebar - REMOVED (handled by sidebar-fix.js)
    // This function is kept for backward compatibility but does nothing
    // The actual sidebar logic is in sidebar-fix.js
    toggleSidebar() {
        // No-op: Sidebar toggle is handled by sidebar-fix.js
        console.warn('TutorProfileUI.toggleSidebar() is deprecated. Sidebar controlled by sidebar-fix.js');
    },

    // Display tutor profile
    displayProfile(profile) {
        if (!profile) return;

        // Update profile header
        this.updateElement('tutor-name', profile.name || 'Tutor Name');
        this.updateElement('tutor-bio', profile.bio || 'No bio provided');
        this.updateElement('tutor-specialization', profile.specialization || 'General');
        this.updateElement('tutor-experience', `${profile.experienceYears || 0} years experience`);
        this.updateElement('tutor-rating', profile.rating || '0.0');
        this.updateElement('tutor-students', profile.totalStudents || 0);
        this.updateElement('tutor-hourly-rate', `${profile.hourlyRate || 0} ETB/hr`);

        // Update profile images
        if (profile.profilePicture) {
            this.updateImage('profile-pic', profile.profilePicture);
            this.updateImage('tutor-avatar', profile.profilePicture);
        }

        if (profile.coverPhoto) {
            this.updateImage('cover-photo', profile.coverPhoto);
        }

        // Update subjects/courses
        if (profile.subjects && profile.subjects.length > 0) {
            this.displayTags('tutor-subjects', profile.subjects, 'subject-tag');
        } else {
            // Display empty state for subjects
            const subjectsContainer = document.getElementById('tutor-subjects');
            if (subjectsContainer) {
                subjectsContainer.innerHTML = `
                    <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                        No subjects listed
                    </div>
                `;
            }
        }

        // Update locations
        if (profile.locations && profile.locations.length > 0) {
            this.displayTags('tutor-locations', profile.locations, 'location-tag');
        }

        // Update teaching methods
        if (profile.teachingMethods && profile.teachingMethods.length > 0) {
            this.displayTags('teaching-methods', profile.teachingMethods, 'method-tag');
        } else {
            // Display empty state for teaching methods
            const methodsContainer = document.getElementById('teaching-methods');
            if (methodsContainer) {
                methodsContainer.innerHTML = `
                    <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                        No method set yet
                    </div>
                `;
            }
        }

        // Update certifications
        this.displayCertifications(profile.certifications || []);

        // Update experiences
        this.displayExperiences(profile.experiences || []);

        // Update achievements
        this.displayAchievements(profile.achievements || []);

        // Update next session
        if (profile.nextSession) {
            this.updateNextSession(profile.nextSession);
        }

        // Update statistics
        this.updateStatistics(profile);
    },

    // Display certifications
    displayCertifications(certifications) {
        const container = document.getElementById('certifications-list');
        if (!container) return;

        if (!certifications || certifications.length === 0) {
            container.innerHTML = '<p class="text-muted">No certifications added yet.</p>';
            return;
        }

        container.innerHTML = certifications.map(cert => `
            <div class="certification-card" data-id="${cert.id}">
                <div class="cert-header">
                    <div>
                        <h4>${cert.title}</h4>
                        <p class="text-muted">${cert.issuer}</p>
                    </div>
                    <div class="cert-actions">
                        <button onclick="editCertification('${cert.id}')" class="btn-icon" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteCertification('${cert.id}')" class="btn-icon" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="cert-date">${this.formatDate(cert.date)}</p>
                ${cert.certificateUrl ? `<a href="${cert.certificateUrl}" target="_blank" class="btn-link">View Certificate</a>` : ''}
            </div>
        `).join('');
    },

    // Display experiences
    displayExperiences(experiences) {
        const container = document.getElementById('experiences-list');
        if (!container) return;

        if (!experiences || experiences.length === 0) {
            container.innerHTML = '<p class="text-muted">No experiences added yet.</p>';
            return;
        }

        container.innerHTML = experiences.map(exp => `
            <div class="experience-card" data-id="${exp.id}">
                <div class="exp-header">
                    <div>
                        <h4>${exp.position}</h4>
                        <p class="text-muted">${exp.institution}</p>
                    </div>
                    <div class="exp-actions">
                        <button onclick="editExperience('${exp.id}')" class="btn-icon" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteExperience('${exp.id}')" class="btn-icon" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="exp-duration">${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}</p>
                <p class="exp-description">${exp.description || ''}</p>
            </div>
        `).join('');
    },

    // Display achievements
    displayAchievements(achievements) {
        const container = document.getElementById('achievements-list');
        if (!container) return;

        if (!achievements || achievements.length === 0) {
            container.innerHTML = '<p class="text-muted">No achievements added yet.</p>';
            return;
        }

        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-card" data-id="${achievement.id}">
                <div class="achievement-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="achievement-content">
                    <h4>${achievement.title}</h4>
                    <p class="text-muted">${achievement.description}</p>
                    <p class="achievement-date">${this.formatDate(achievement.date)}</p>
                </div>
                <div class="achievement-actions">
                    <button onclick="editAchievement('${achievement.id}')" class="btn-icon" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteAchievement('${achievement.id}')" class="btn-icon" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Display requested sessions
    displayRequestedSessions(sessions) {
        const container = document.getElementById('session-requests-list');
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<p class="text-muted">No pending session requests.</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="session-request-card">
                <div class="student-info">
                    <img src="${session.studentAvatar || '../uploads/system_images/system_profile_pictures/student-college-girl.jpg'}"
                         alt="${session.studentName}"
                         class="student-avatar">
                    <div>
                        <h4>${session.studentName}</h4>
                        <p class="text-muted">${session.subject}</p>
                    </div>
                </div>
                <div class="session-details">
                    <p><i class="fas fa-calendar"></i> ${this.formatDate(session.date)}</p>
                    <p><i class="fas fa-clock"></i> ${session.time}</p>
                </div>
                <div class="session-actions">
                    <button onclick="acceptSession('${session.id}')" class="btn btn-success btn-sm">Accept</button>
                    <button onclick="rejectSession('${session.id}')" class="btn btn-danger btn-sm">Reject</button>
                </div>
            </div>
        `).join('');
    },

    // Display confirmed students
    displayConfirmedStudents(students) {
        const container = document.getElementById('confirmed-students-list');
        if (!container) return;

        if (!students || students.length === 0) {
            container.innerHTML = '<p class="text-muted">No confirmed students yet.</p>';
            return;
        }

        container.innerHTML = students.map(student => `
            <div class="student-card">
                <img src="${student.profilePicture || '../uploads/system_images/system_profile_pictures/student-college-girl.jpg'}"
                     alt="${student.name}"
                     class="student-avatar">
                <div class="student-info">
                    <h4><a href="../view-profiles/view-student.html?id=${student.id}" style="color: inherit; text-decoration: none; cursor: pointer;">${student.name}</a></h4>
                    <p class="text-muted">${student.grade || 'N/A'}</p>
                    <p class="student-stats">
                        <span><i class="fas fa-video"></i> ${student.sessionsCompleted || 0} sessions</span>
                    </p>
                </div>
                <div class="student-actions">
                    <button onclick="openStudentDetails('${student.id}');" class="btn-icon" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="contactStudent('${student.id}');" class="btn-icon" title="Message">
                        <i class="fas fa-message"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Display videos
    displayVideos(videos, filter = 'all') {
        const container = document.getElementById('videos-grid');
        if (!container) return;

        // Ensure videos is an array
        const videosArray = Array.isArray(videos) ? videos : (videos?.videos || videos?.data || []);

        let filteredVideos = videosArray;
        if (filter !== 'all') {
            filteredVideos = videosArray.filter(v => v.category === filter);
        }

        if (!filteredVideos || filteredVideos.length === 0) {
            container.innerHTML = '<p class="text-muted">No videos found.</p>';
            return;
        }

        container.innerHTML = filteredVideos.map(video => `
            <div class="video-card">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23cccccc%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%23666666%22 font-family=%22sans-serif%22 font-size=%2218%22 text-anchor=%22middle%22 x=%22200%22 y=%22150%22%3ENo Thumbnail%3C/text%3E%3C/svg%3E'}" alt="${video.title}" onerror="this.style.display='none'">
                    <div class="video-duration">${video.duration || '00:00'}</div>
                    <button class="play-button" onclick="playVideo('${video.id}')">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
                <div class="video-info">
                    <h4>${video.title}</h4>
                    <p class="text-muted">${video.views || 0} views • ${this.getTimeAgo(video.uploadedAt)}</p>
                    <div class="video-stats">
                        <span><i class="fas fa-thumbs-up"></i> ${video.likes || 0}</span>
                        <span><i class="fas fa-comment"></i> ${video.comments || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Display blog posts
    displayBlogPosts(posts, filter = 'all') {
        const container = document.getElementById('blog-posts-list');
        if (!container) return;

        let filteredPosts = posts;
        if (filter !== 'all') {
            filteredPosts = posts.filter(p => p.status === filter);
        }

        if (!filteredPosts || filteredPosts.length === 0) {
            container.innerHTML = '<p class="text-muted">No blog posts found.</p>';
            return;
        }

        container.innerHTML = filteredPosts.map(post => `
            <div class="blog-card">
                ${post.featuredImage ? `
                    <div class="blog-thumbnail">
                        <img src="${post.featuredImage}" alt="${post.title}">
                    </div>
                ` : ''}
                <div class="blog-content">
                    <h3>${post.title}</h3>
                    <p class="blog-excerpt">${post.excerpt || post.content.substring(0, 150)}...</p>
                    <div class="blog-meta">
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(post.publishedAt || post.createdAt)}</span>
                        <span><i class="fas fa-clock"></i> ${this.calculateReadTime(post.content)} min read</span>
                        <span class="blog-status ${post.status}">${post.status}</span>
                    </div>
                    <div class="blog-actions">
                        <button onclick="editBlog('${post.id}')" class="btn btn-sm">Edit</button>
                        <button onclick="viewBlog('${post.id}')" class="btn btn-sm">View</button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Display connections
    displayConnections(connections, filter = 'all') {
        const container = document.getElementById('connections-list');
        if (!container) return;

        let filteredConnections = connections;
        if (filter === 'live') {
            filteredConnections = connections.filter(c => c.isOnline);
        }

        if (!filteredConnections || filteredConnections.length === 0) {
            container.innerHTML = '<p class="text-muted">No connections found.</p>';
            return;
        }

        container.innerHTML = filteredConnections.map(conn => `
            <div class="connection-card">
                <div class="connection-avatar">
                    <img src="${conn.profilePicture || '../uploads/system_images/system_profile_pictures/student-college-girl.jpg'}"
                         alt="${conn.name}">
                    ${conn.isOnline ? '<span class="online-indicator"></span>' : ''}
                </div>
                <div class="connection-info">
                    <h4>${conn.name}</h4>
                    <p class="text-muted">${conn.role || 'Student'}</p>
                </div>
                <div class="connection-actions">
                    <button onclick="viewConnection('${conn.id}')" class="btn-icon" title="View Profile">
                        <i class="fas fa-user"></i>
                    </button>
                    <button onclick="messageConnection('${conn.id}')" class="btn-icon" title="Message">
                        <i class="fas fa-message"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Update next session info
    updateNextSession(session) {
        if (!session) return;

        this.updateElement('next-session-subject', session.subject || 'N/A');
        this.updateElement('next-session-time', this.formatDateTime(session.startTime));
        this.updateElement('next-session-student', session.studentName || 'N/A');
    },

    // Update statistics
    updateStatistics(profile) {
        if (!profile) return;

        this.updateElement('stat-students', profile.totalStudents || 0);
        this.updateElement('stat-sessions', profile.totalSessions || 0);
        this.updateElement('stat-hours', profile.totalHours || 0);
        this.updateElement('stat-rating', profile.rating || '0.0');
        this.updateElement('stat-reviews', profile.totalReviews || 0);
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    // Helper methods
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },

    updateImage(id, src) {
        const img = document.getElementById(id);
        if (img) {
            img.src = src;
        }
    },

    displayTags(containerId, items, className) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Different styling based on container type
        if (containerId === 'tutor-subjects') {
            container.innerHTML = items.map(item =>
                `<span class="${className}" style="padding: 0.4rem 0.875rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 16px; font-size: 0.8125rem; font-weight: 600; color: var(--heading); display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; white-space: nowrap;">${item}</span>`
            ).join('');
        } else if (containerId === 'teaching-methods') {
            // Teaching methods with colored gradients
            const methodColors = {
                'Online': '#3b82f6',
                'In-person': '#10b981',
                'In-Person': '#10b981',
                'Self-paced': '#8b5cf6',
                'Self-Paced': '#8b5cf6'
            };
            container.innerHTML = items.map(item => {
                const color = methodColors[item] || '#6b7280';
                const icon = item.toLowerCase().includes('online') ? '🌐 ' :
                           item.toLowerCase().includes('person') ? '🏫 ' :
                           item.toLowerCase().includes('paced') ? '📖 ' : '';
                return `<span class="${className}" style="padding: 0.4rem 0.875rem; background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); color: white; border-radius: 16px; font-size: 0.8125rem; font-weight: 600; box-shadow: 0 2px 6px ${color}33; transition: all 0.3s ease; display: inline-flex; align-items: center; white-space: nowrap;">${icon}${item}</span>`;
            }).join('');
        } else {
            // Default styling for other tags
            container.innerHTML = items.map(item =>
                `<span class="${className}">${item}</span>`
            ).join('');
        }
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getTimeAgo(dateString) {
        if (!dateString) return 'Recently';

        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, value] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / value);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    },

    calculateReadTime(text) {
        if (!text) return 0;
        const wordsPerMinute = 200;
        const words = text.trim().split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    }
};
