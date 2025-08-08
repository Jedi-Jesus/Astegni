document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded - Initializing...');

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        }
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            const icon = themeToggle.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
            console.log('Theme changed to:', newTheme);
        });
    }

    // HAMBURGER MENU & SIDEBAR - ENHANCED
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarClose = document.getElementById('sidebar-close');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            console.log('Hamburger clicked');
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            hamburger.classList.add('active');
            document.body.classList.add('sidebar-open');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            console.log('Sidebar close clicked');
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            console.log('Overlay clicked');
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        });
    }

    // Sidebar submenu
    document.querySelectorAll('.sidebar-parent').forEach(parent => {
        parent.addEventListener('click', (e) => {
            e.preventDefault();
            parent.parentElement.classList.toggle('active');
        });
    });

    // NOTIFICATION ICON - FIXED
    const notificationIcon = document.querySelector('.notification-icon');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', () => {
            console.log('Notification clicked');
            showNotification('You have 3 new notifications!', 'info');
        });
    }

    // EDIT ICONS - FIXED
    const coverEdit = document.querySelector('.cover-edit');
    const profileEdit = document.querySelector('.profile-edit');

    if (coverEdit) {
        coverEdit.addEventListener('click', () => {
            console.log('Cover edit clicked');
            const modal = document.querySelector('.cover-upload-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        });
    }

    if (profileEdit) {
        profileEdit.addEventListener('click', () => {
            console.log('Profile edit clicked');
            const modal = document.querySelector('.profile-upload-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        });
    }

    // MAIN BUTTON HANDLERS - FIXED
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const sessionsBtn = document.querySelector('.sessions-btn');
    const contactParentBtn = document.querySelector('.contact-parent-btn');
    const certificationsBtn = document.querySelector('.certifications-btn');
    const addCourseBtn = document.querySelector('.add-course-btn');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            console.log('Edit profile clicked');
            const modal = document.querySelector('.edit-profile-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        });
    }

    if (sessionsBtn) {
        sessionsBtn.addEventListener('click', () => {
            console.log('Sessions clicked');
            const modal = document.querySelector('.sessions-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
                populateSessions('all');
            }
        });
    }

    if (contactParentBtn) {
        contactParentBtn.addEventListener('click', () => {
            console.log('Contact parent clicked');
            const modal = document.querySelector('.parent-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        });
    }

    if (certificationsBtn) {
        certificationsBtn.addEventListener('click', () => {
            console.log('Certifications clicked');
            const modal = document.querySelector('.certifications-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        });
    }

    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', () => {
            console.log('Add course clicked');
            const modal = document.querySelector('.add-course-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        });
    }

    // CLOSE MODAL HANDLERS - FIXED
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            console.log('Close button clicked');
            const modal = closeBtn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
    });

    document.querySelectorAll('.cancel-btn').forEach(cancelBtn => {
        cancelBtn.addEventListener('click', () => {
            console.log('Cancel button clicked');
            const modal = cancelBtn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
    });

    // Close modal on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
    });

    // My Courses Modal - Sidebar Link
    const myCoursesLink = document.querySelector('[data-action="my-courses"]');
    if (myCoursesLink) {
        myCoursesLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('My courses clicked');
            // Close sidebar
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.classList.remove('sidebar-open');
            // Open modal
            showMyCourses();
        });
    }

    // Mock Data
    const courses = [
        {
            id: 1,
            title: 'Advanced Mathematics',
            cover: 'math-cover.jpg',
            description: 'Master calculus, algebra, and geometry with expert guidance',
            tutor: { name: 'Jane Smith', avatar: 'jane-avatar.jpg' },
            progress: 85,
            duration: '3 months',
            nextSession: 'Today, 2:44 PM',
            videos: 24
        },
        {
            id: 2,
            title: 'Physics Fundamentals',
            cover: 'physics-cover.jpg',
            description: 'Explore mechanics, thermodynamics, and electromagnetic theory',
            tutor: { name: 'John Brown', avatar: 'john-avatar.jpg' },
            progress: 70,
            duration: '4 months',
            nextSession: 'Tomorrow, 10:00 AM',
            videos: 18
        },
        {
            id: 3,
            title: 'Chemistry Excellence',
            cover: 'chemistry-cover.jpg',
            description: 'From organic to inorganic chemistry, master all concepts',
            tutor: { name: 'Alice Johnson', avatar: 'alice-avatar.jpg' },
            progress: 92,
            duration: '2 months',
            nextSession: 'Friday, 3:00 PM',
            videos: 15
        }
    ];

    // Show My Courses
    function showMyCourses() {
        const modal = document.getElementById('my-courses-modal');
        if (!modal) return;
        
        const coursesGrid = modal.querySelector('.courses-grid');
        if (coursesGrid) {
            coursesGrid.innerHTML = courses.map((course, index) => `
                <div class="course-card" style="animation-delay: ${index * 0.1}s">
                    <div class="course-cover">
                        <img src="${course.cover}" alt="${course.title}" onerror="this.style.display='none'">
                        <span class="course-duration">${course.duration}</span>
                    </div>
                    <div class="course-content">
                        <h3 class="course-title">${course.title}</h3>
                        <p class="course-description">${course.description}</p>
                        <div class="course-tutor">
                            <img src="${course.tutor.avatar}" alt="${course.tutor.name}" class="tutor-avatar-small" onerror="this.src='placeholder-profile.jpg'">
                            <span>${course.tutor.name}</span>
                        </div>
                        <div class="course-progress-bar">
                            <div class="course-progress-fill" style="width: ${course.progress}%"></div>
                        </div>
                        <div class="course-meta">
                            <span>${course.progress}% Complete</span>
                            <span>📹 ${course.videos} videos</span>
                        </div>
                        <div class="course-meta">
                            <span>⏰ ${course.nextSession}</span>
                        </div>
                        <div class="course-actions">
                            <button class="btn btn-primary" onclick="resumeCourse(${course.id})">Resume</button>
                            <button class="btn btn-secondary" onclick="chatWithTutor('${course.tutor.name}')">Chat</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    // Mock Data with course details
    const tutors = [
        {
            id: 1,
            name: 'Jane Smith',
            avatar: 'jane-avatar.jpg',
            subjects: ['Math', 'Physics'],
            method: 'Online',
            progress: 85,
            rating: 4.8,
            students: 45,
            courseProgress: {
                'Math': 90,
                'Physics': 80
            }
        },
        {
            id: 2,
            name: 'John Brown',
            avatar: 'john-avatar.jpg',
            subjects: ['Chemistry', 'Biology'],
            method: 'In-Person',
            progress: 78,
            rating: 4.5,
            students: 32,
            courseProgress: {
                'Chemistry': 75,
                'Biology': 82
            }
        },
        {
            id: 3,
            name: 'Alice Johnson',
            avatar: 'alice-avatar.jpg',
            subjects: ['English', 'Literature'],
            method: 'Online',
            progress: 92,
            rating: 4.9,
            students: 58,
            courseProgress: {
                'English': 95,
                'Literature': 88
            }
        }
    ];

    // Populate Tutors Table with circular progress
    function populateTutors(filteredTutors = tutors) {
        const tutorsBody = document.getElementById('tutors-tbody');
        if (!tutorsBody) return;
        
        tutorsBody.innerHTML = filteredTutors.map((tutor, index) => {
            // Generate tooltip content
            const tooltipContent = Object.entries(tutor.courseProgress).map(([course, progress]) => `
                <div class="progress-tooltip-item">
                    <span>${course}</span>
                    <div class="progress-bar-tooltip">
                        <div class="progress-bar-tooltip-fill" style="width: ${progress}%"></div>
                    </div>
                    <span>${progress}%</span>
                </div>
            `).join('');

            return `
                <tr style="animation: fadeInUp ${0.3 + index * 0.1}s ease-out">
                    <td>
                        <div class="tutor-name-cell">
                            <img src="${tutor.avatar}" alt="${tutor.name}" class="tutor-avatar-small" onerror="this.src='placeholder-profile.jpg'">
                            <span>${tutor.name}</span>
                        </div>
                    </td>
                    <td>${tutor.subjects.join(', ')}</td>
                    <td>
                        <span class="method-badge">${tutor.method}</span>
                    </td>
                    <td>
                        <div class="progress-cell">
                            <div class="progress-circle-wrapper">
                                <div class="progress-circle" style="--progress: ${tutor.progress}">
                                    <span class="progress-circle-value">${tutor.progress}%</span>
                                </div>
                                <div class="progress-tooltip">
                                    ${tooltipContent}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-primary view-tutor-btn" data-tutor-id="${tutor.id}">View Details</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners for View buttons
        document.querySelectorAll('.view-tutor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tutorId = e.target.getAttribute('data-tutor-id');
                showTutorDetails(tutorId);
            });
        });
    }

    // Show tutor details in modal
    function showTutorDetails(tutorId) {
        const tutor = tutors.find(t => t.id == tutorId);
        if (!tutor) return;

        const modal = document.getElementById('tutor-details-modal');
        if (!modal) return;

        const content = modal.querySelector('.tutor-details-content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <img src="${tutor.avatar}" alt="${tutor.name}" style="width: 120px; height: 120px; border-radius: 50%; margin-bottom: 1rem;" onerror="this.src='placeholder-profile.jpg'">
                    <h3 style="color: var(--heading); margin-bottom: 0.5rem;">${tutor.name}</h3>
                    <p style="color: var(--text); margin-bottom: 1rem;">⭐ ${tutor.rating} Rating • 👥 ${tutor.students} Students</p>
                    <div style="margin: 2rem 0;">
                        <h4 style="color: var(--heading); margin-bottom: 1rem;">Subjects & Progress</h4>
                        ${Object.entries(tutor.courseProgress).map(([course, progress]) => `
                            <div style="margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <span>${course}</span>
                                    <span>${progress}%</span>
                                </div>
                                <div style="height: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; overflow: hidden;">
                                    <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--button-bg), var(--button-hover)); border-radius: 5px;"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn-primary" onclick="scheduleMeeting(${tutor.id})">Schedule Meeting</button>
                        <button class="btn btn-secondary" onclick="sendMessage(${tutor.id})">Send Message</button>
                    </div>
                </div>
            `;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    window.showTutorDetails = showTutorDetails;
    window.scheduleMeeting = function(tutorId) {
        showNotification('Opening scheduling...', 'info');
    };
    window.sendMessage = function(tutorId) {
        showNotification('Opening messages...', 'info');
    };

    populateTutors();

    // Search functionality
    const tutorSearch = document.getElementById('tutor-search');
    if (tutorSearch) {
        tutorSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = tutors.filter(tutor => 
                tutor.name.toLowerCase().includes(query) ||
                tutor.subjects.some(subject => subject.toLowerCase().includes(query))
            );
            populateTutors(filtered);
        });
    }

    // Sessions data
    const sessions = [
        {
            date: '2025-08-07',
            time: '14:44',
            tutor: 'Jane Smith',
            subject: 'Math',
            duration: '1 hour',
            status: 'upcoming'
        },
        {
            date: '2025-08-08',
            time: '10:00',
            tutor: 'John Brown',
            subject: 'Chemistry',
            duration: '1.5 hours',
            status: 'upcoming'
        },
        {
            date: '2025-08-06',
            time: '15:00',
            tutor: 'Alice Johnson',
            subject: 'English',
            duration: '1 hour',
            status: 'completed'
        }
    ];

    // Populate sessions
    function populateSessions(filter = 'all') {
        const sessionsList = document.querySelector('.sessions-list');
        if (!sessionsList) return;
        
        const filteredSessions = filter === 'all' ? sessions :
            sessions.filter(s => filter === 'upcoming' ? s.status === 'upcoming' : s.status === 'completed');

        sessionsList.innerHTML = filteredSessions.map(session => `
            <div class="session-card">
                <div class="session-date">
                    <span class="session-day">${new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span class="session-date-num">${new Date(session.date).getDate()}</span>
                </div>
                <div class="session-info">
                    <h4>${session.subject} with ${session.tutor}</h4>
                    <p>⏰ ${session.time} • ⏱️ ${session.duration}</p>
                </div>
                <div class="session-actions">
                    ${session.status === 'upcoming' ? 
                        `<button class="btn btn-primary">Join Session</button>` :
                        `<span class="session-badge completed">Completed</span>`
                    }
                </div>
            </div>
        `).join('');
    }

    // Session filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.textContent.toLowerCase();
            populateSessions(filter);
        });
    });

    // Course search
    const courseSearchInput = document.getElementById('course-search');
    const courseResult = document.getElementById('course-result');
    const availableCourses = [
        'Algebra', 'Geometry', 'Calculus', 'Statistics',
        'Physics', 'Chemistry', 'Biology', 'Earth Science',
        'English', 'Literature', 'History', 'Geography',
        'Computer Science', 'Economics', 'Psychology', 'Philosophy'
    ];

    if (courseSearchInput && courseResult) {
        function searchCourses() {
            const query = courseSearchInput.value.trim().toLowerCase();
            
            if (!query) {
                courseResult.innerHTML = `
                    <div class="search-prompt">
                        <p>Type a course name to search</p>
                    </div>
                `;
                return;
            }

            const matches = availableCourses.filter(course => 
                course.toLowerCase().includes(query)
            );

            if (matches.length > 0) {
                courseResult.innerHTML = `
                    <div class="course-matches">
                        <h4>Available Courses:</h4>
                        ${matches.map(course => `
                            <div class="course-option">
                                <span>${course}</span>
                                <button class="btn btn-primary btn-small" onclick="addCourse('${course}')">
                                    Add Course
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                courseResult.innerHTML = `
                    <div class="no-matches">
                        <p>No courses found for "${query}"</p>
                        <button class="btn btn-secondary" onclick="requestCourse('${query}')">
                            Request This Course
                        </button>
                    </div>
                `;
            }
        }

        courseSearchInput.addEventListener('input', searchCourses);
        searchCourses();
    }

    // Image upload handlers
    const coverUploadInput = document.querySelector('.cover-upload-input');
    const profileUploadInput = document.querySelector('.profile-upload-input');

    if (coverUploadInput) {
        coverUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.querySelector('.cover-preview-img');
                    if (preview) preview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (profileUploadInput) {
        profileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.querySelector('.profile-preview-img');
                    if (preview) preview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Form submissions
    const coverUploadForm = document.querySelector('.cover-upload-modal form');
    const profileUploadForm = document.querySelector('.profile-upload-modal form');

    if (coverUploadForm) {
        coverUploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const preview = document.querySelector('.cover-preview-img');
            const coverImg = document.querySelector('.cover-img');
            if (preview && coverImg) {
                coverImg.src = preview.src;
            }
            const modal = document.querySelector('.cover-upload-modal');
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
            showNotification('Cover photo updated!', 'success');
        });
    }

    if (profileUploadForm) {
        profileUploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const preview = document.querySelector('.profile-preview-img');
            const profileImg = document.querySelector('.profile-img');
            const navProfileImg = document.querySelector('.nav-profile-img');
            if (preview && profileImg) {
                profileImg.src = preview.src;
                if (navProfileImg) navProfileImg.src = preview.src;
            }
            const modal = document.querySelector('.profile-upload-modal');
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
            showNotification('Profile picture updated!', 'success');
        });
    }

    // Notification system
    function showNotification(message, type = 'info') {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 5000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <span>${message}</span>
            <span style="cursor: pointer; font-size: 1.2rem;" onclick="this.parentElement.remove()">&times;</span>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Global functions
    window.resumeCourse = function(courseId) {
        console.log(`Resuming course ${courseId}`);
        showNotification('Resuming course...', 'info');
    };

    window.chatWithTutor = function(tutorName) {
        console.log(`Opening chat with ${tutorName}`);
        showNotification(`Opening chat with ${tutorName}`, 'info');
    };

    window.viewTutorDetails = function(tutorId) {
        console.log(`Viewing tutor ${tutorId} details`);
        const tutor = tutors.find(t => t.id == tutorId);
        if (tutor) {
            showNotification(`Viewing ${tutor.name}'s profile`, 'info');
        }
    };

    window.addCourse = function(courseName) {
        console.log(`Adding course: ${courseName}`);
        showNotification(`Course "${courseName}" has been added!`, 'success');
        const modal = document.querySelector('.add-course-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    };

    window.requestCourse = function(courseName) {
        console.log(`Requesting course: ${courseName}`);
        showNotification(`Course request for "${courseName}" submitted!`, 'success');
        const modal = document.querySelector('.add-course-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    };

    // Adjust sidebars when footer is in view
    function adjustSidebarsForFooter() {
        const footer = document.querySelector('.footer');
        const sidebar = document.getElementById('sidebar');
        const rightSidebar = document.getElementById('right-sidebar');
        
        if (!footer) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Footer is visible
                    if (sidebar) sidebar.style.bottom = '60px';
                    if (rightSidebar) rightSidebar.style.bottom = '60px';
                } else {
                    // Footer is not visible
                    if (sidebar) sidebar.style.bottom = '0';
                    if (rightSidebar) rightSidebar.style.bottom = '0';
                }
            });
        }, {
            threshold: 0.1
        });
        
        observer.observe(footer);
    }
    
    adjustSidebarsForFooter();

    console.log('All systems initialized successfully! ✅');
});