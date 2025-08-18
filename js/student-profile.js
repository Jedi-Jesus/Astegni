/**
 * QUANTUM STUDENT PROFILE - ENHANCED JAVASCRIPT
 * Neural Interactions & Dimensional Effects
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Quantum Learning Platform...');

    // ============================================
    // QUANTUM THEME SYSTEM
    // ============================================
    class ThemeManager {
        constructor() {
            this.theme = localStorage.getItem('theme') || 'dark';
            this.init();
        }

        init() {
            document.body.setAttribute('data-theme', this.theme);
            this.updateThemeIcon();
            this.attachListeners();
        }

        updateThemeIcon() {
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                const icon = themeToggle.querySelector('.theme-icon');
                if (icon) {
                    icon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
                }
            }
        }

        toggle() {
            this.theme = this.theme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', this.theme);
            localStorage.setItem('theme', this.theme);
            this.updateThemeIcon();
            this.animateThemeChange();
        }

        animateThemeChange() {
            document.body.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                document.body.style.transition = '';
            }, 500);
        }

        attachListeners() {
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => this.toggle());
            }
        }
    }

    // ============================================
    // SIDEBAR MANAGER
    // ============================================
    class SidebarManager {
        constructor() {
            this.sidebar = document.querySelector('.sidebar-container');
            this.overlay = document.getElementById('sidebar-overlay');
            this.hamburger = document.getElementById('hamburger');
            this.closeBtn = document.getElementById('sidebar-close');
            this.isOpen = false;
            this.init();
        }

        init() {
            if (!this.sidebar || !this.overlay) return;
            this.attachListeners();
            this.initSubmenuHandlers();
        }

        open() {
            if (!this.sidebar || !this.overlay) return;
            this.isOpen = true;
            this.sidebar.classList.add('active');
            this.overlay.classList.add('active');
            if (this.hamburger) this.hamburger.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        close() {
            if (!this.sidebar || !this.overlay) return;
            this.isOpen = false;
            this.sidebar.classList.remove('active');
            this.overlay.classList.remove('active');
            if (this.hamburger) this.hamburger.classList.remove('active');
            document.body.style.overflow = '';
        }

        toggle() {
            this.isOpen ? this.close() : this.open();
        }

        attachListeners() {
            if (this.hamburger) {
                this.hamburger.addEventListener('click', () => this.open());
            }

            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', () => this.close());
            }

            if (this.overlay) {
                this.overlay.addEventListener('click', () => this.close());
            }

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }

        initSubmenuHandlers() {
            document.querySelectorAll('.sidebar-parent').forEach(parent => {
                parent.addEventListener('click', (e) => {
                    e.preventDefault();
                    const submenu = parent.parentElement;
                    submenu.classList.toggle('active');
                    
                    // Animate arrow rotation
                    const arrow = parent.querySelector('.sidebar-arrow');
                    if (arrow) {
                        arrow.style.transform = submenu.classList.contains('active') 
                            ? 'rotate(180deg)' 
                            : 'rotate(0)';
                    }
                });
            });
        }
    }

    // ============================================
    // MODAL MANAGER
    // ============================================
    class ModalManager {
        constructor() {
            this.modals = new Map();
            this.activeModal = null;
            this.init();
        }

        init() {
            this.registerModals();
            this.attachGlobalListeners();
        }

        registerModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                const modalName = modal.className.split(' ').find(c => c.includes('-modal'));
                if (modalName) {
                    this.modals.set(modalName, modal);
                }
            });
        }

        open(modalName, data = null) {
            const modal = this.modals.get(modalName);
            if (!modal) {
                console.warn(`Modal ${modalName} not found`);
                return;
            }

            // Close any active modal
            if (this.activeModal) {
                this.close(this.activeModal);
            }

            modal.classList.add('active');
            modal.style.display = 'flex';
            this.activeModal = modalName;
            document.body.style.overflow = 'hidden';

            // Populate modal with data if provided
            if (data) {
                this.populateModal(modalName, data);
            }

            // Animate modal entrance
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
            });
        }

        close(modalName = null) {
            const modal = modalName ? this.modals.get(modalName) : 
                         this.activeModal ? this.modals.get(this.activeModal) : null;
            
            if (!modal) return;

            modal.classList.remove('active');
            modal.style.opacity = '0';
            
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.opacity = '';
            }, 300);

            this.activeModal = null;
            document.body.style.overflow = '';
        }

        populateModal(modalName, data) {
            // Handle specific modal population
            switch(modalName) {
                case 'tutor-details-modal':
                    this.populateTutorDetails(data);
                    break;
                case 'my-courses-modal':
                    this.populateCourses(data);
                    break;
                case 'sessions-modal':
                    this.populateSessions(data);
                    break;
            }
        }

        populateTutorDetails(tutor) {
            const modal = this.modals.get('tutor-details-modal');
            if (!modal) return;

            const content = modal.querySelector('.tutor-details-content');
            if (!content) return;

            content.innerHTML = `
                <div class="tutor-details-wrapper">
                    <div class="tutor-header">
                        <div class="tutor-avatar-large">
                            <img src="${tutor.avatar}" alt="${tutor.name}" 
                                 onerror="this.src='placeholder-profile.jpg'">
                            <div class="avatar-ring"></div>
                        </div>
                        <h3 class="quantum-heading">${tutor.name}</h3>
                        <div class="tutor-badges">
                            <span class="badge ethereal-glass">⭐ ${tutor.rating}</span>
                            <span class="badge ethereal-glass">👥 ${tutor.students} Students</span>
                            <span class="badge ethereal-glass">📚 ${tutor.subjects.length} Subjects</span>
                        </div>
                    </div>
                    
                    <div class="tutor-progress-section">
                        <h4 class="gradient-text">Course Progress</h4>
                        ${Object.entries(tutor.courseProgress).map(([course, progress]) => `
                            <div class="progress-item">
                                <div class="progress-header">
                                    <span>${course}</span>
                                    <span class="gradient-text">${progress}%</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar-fill quantum-gradient" 
                                         style="width: ${progress}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="tutor-actions">
                        <button class="btn-quantum" onclick="app.scheduleMeeting(${tutor.id})">
                            <span class="btn-icon">📅</span>
                            Schedule Meeting
                        </button>
                        <button class="btn-quantum" onclick="app.sendMessage(${tutor.id})">
                            <span class="btn-icon">💬</span>
                            Send Message
                        </button>
                    </div>
                </div>
            `;
        }

        populateCourses(courses) {
            const modal = this.modals.get('my-courses-modal');
            if (!modal) return;

            const grid = modal.querySelector('.courses-grid');
            if (!grid) return;

            grid.innerHTML = courses.map((course, index) => `
                <div class="course-card card-dimensional" style="animation-delay: ${index * 0.1}s">
                    <div class="course-cover enhanced-cover">
                        <div class="quantum-aurora"></div>
                        <img src="${course.cover}" alt="${course.title}" 
                             onerror="this.style.display='none'">
                        <span class="course-duration badge">${course.duration}</span>
                    </div>
                    <div class="course-content">
                        <h3 class="course-title quantum-heading">${course.title}</h3>
                        <p class="course-description">${course.description}</p>
                        
                        <div class="course-tutor">
                            <img src="${course.tutor.avatar}" alt="${course.tutor.name}" 
                                 class="tutor-avatar-small" 
                                 onerror="this.src='placeholder-profile.jpg'">
                            <span class="neural-text" data-text="${course.tutor.name}">
                                ${course.tutor.name}
                            </span>
                        </div>
                        
                        <div class="course-progress-wrapper">
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill quantum-gradient" 
                                     style="width: ${course.progress}%"></div>
                            </div>
                            <div class="progress-info">
                                <span>${course.progress}% Complete</span>
                                <span>📹 ${course.videos} videos</span>
                            </div>
                        </div>
                        
                        <div class="course-next-session ethereal-glass">
                            <span class="gradient-text">⏰ ${course.nextSession}</span>
                        </div>
                        
                        <div class="course-actions">
                            <button class="btn-quantum" onclick="app.resumeCourse(${course.id})">
                                Resume
                            </button>
                            <button class="btn-quantum" onclick="app.chatWithTutor('${course.tutor.name}')">
                                Chat
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        populateSessions(sessions) {
            const modal = this.modals.get('sessions-modal');
            if (!modal) return;

            const list = modal.querySelector('.sessions-list');
            if (!list) return;

            list.innerHTML = sessions.map((session, index) => `
                <div class="session-card ethereal-glass" style="animation-delay: ${index * 0.1}s">
                    <div class="session-date gradient-text">
                        <span class="session-day">
                            ${new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span class="session-date-num">
                            ${new Date(session.date).getDate()}
                        </span>
                    </div>
                    <div class="session-info">
                        <h4 class="quantum-heading">${session.subject}</h4>
                        <p class="neural-text" data-text="with ${session.tutor}">
                            with ${session.tutor}
                        </p>
                        <div class="session-meta">
                            <span>⏰ ${session.time}</span>
                            <span>⏱️ ${session.duration}</span>
                        </div>
                    </div>
                    <div class="session-actions">
                        ${session.status === 'upcoming' ? 
                            `<button class="btn-quantum glow-quantum">Join Session</button>` :
                            `<span class="badge verified">✓ Completed</span>`
                        }
                    </div>
                </div>
            `).join('');
        }

        attachGlobalListeners() {
            // Close buttons
            document.querySelectorAll('.modal .close').forEach(closeBtn => {
                closeBtn.addEventListener('click', () => this.close());
            });

            // Cancel buttons
            document.querySelectorAll('.modal .cancel-btn').forEach(cancelBtn => {
                cancelBtn.addEventListener('click', () => this.close());
            });

            // Background click
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.close();
                    }
                });
            });

            // Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.activeModal) {
                    this.close();
                }
            });
        }
    }

    // ============================================
    // NOTIFICATION SYSTEM
    // ============================================
    class NotificationSystem {
        constructor() {
            this.container = null;
            this.init();
        }

        init() {
            this.createContainer();
        }

        createContainer() {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 90px;
                right: 20px;
                z-index: 6000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }

        show(message, type = 'info', duration = 5000) {
            const notification = document.createElement('div');
            notification.className = `notification ${type} ethereal-glass glow-quantum`;
            notification.style.cssText = `
                background: ${this.getTypeColor(type)};
                backdrop-filter: blur(20px);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                min-width: 320px;
                animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: all;
                cursor: pointer;
                transition: all 0.3s ease;
            `;

            const icon = this.getTypeIcon(type);
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.5rem;">${icon}</span>
                    <span>${message}</span>
                </div>
                <span style="font-size: 1.2rem; opacity: 0.8;">&times;</span>
            `;

            notification.addEventListener('click', () => this.remove(notification));
            this.container.appendChild(notification);

            if (duration > 0) {
                setTimeout(() => this.remove(notification), duration);
            }
        }

        remove(notification) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }

        getTypeColor(type) {
            const colors = {
                success: 'linear-gradient(135deg, #10b981, #059669)',
                error: 'linear-gradient(135deg, #ef4444, #dc2626)',
                warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
                info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
            };
            return colors[type] || colors.info;
        }

        getTypeIcon(type) {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            return icons[type] || icons.info;
        }
    }

    // ============================================
    // DATA MANAGER
    // ============================================
    class DataManager {
        constructor() {
            this.tutors = [
                {
                    id: 1,
                    name: 'Jane Smith',
                    avatar: 'jane-avatar.jpg',
                    subjects: ['Mathematics', 'Physics'],
                    method: 'Online',
                    progress: 85,
                    rating: 4.8,
                    students: 45,
                    courseProgress: {
                        'Mathematics': 90,
                        'Physics': 80
                    }
                },
                {
                    id: 2,
                    name: 'John Brown',
                    avatar: 'john-avatar.jpg',
                    subjects: ['Chemistry', 'Biology'],
                    method: 'Hybrid',
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

            this.courses = [
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

            this.sessions = [
                {
                    date: '2025-08-12',
                    time: '14:44',
                    tutor: 'Jane Smith',
                    subject: 'Mathematics',
                    duration: '1 hour',
                    status: 'upcoming'
                },
                {
                    date: '2025-08-13',
                    time: '10:00',
                    tutor: 'John Brown',
                    subject: 'Chemistry',
                    duration: '1.5 hours',
                    status: 'upcoming'
                },
                {
                    date: '2025-08-11',
                    time: '15:00',
                    tutor: 'Alice Johnson',
                    subject: 'English',
                    duration: '1 hour',
                    status: 'completed'
                }
            ];
        }

        getTutor(id) {
            return this.tutors.find(t => t.id === parseInt(id));
        }

        searchTutors(query) {
            const searchTerm = query.toLowerCase();
            return this.tutors.filter(tutor => 
                tutor.name.toLowerCase().includes(searchTerm) ||
                tutor.subjects.some(subject => subject.toLowerCase().includes(searchTerm))
            );
        }

        filterSessions(filter) {
            if (filter === 'all') return this.sessions;
            return this.sessions.filter(s => s.status === filter);
        }
    }

    // ============================================
    // TABLE MANAGER
    // ============================================
    class TableManager {
        constructor(dataManager) {
            this.dataManager = dataManager;
            this.init();
        }

        init() {
            this.populateTutorsTable();
            this.attachSearchHandler();
        }

        populateTutorsTable(tutors = null) {
            const tbody = document.getElementById('tutors-tbody');
            if (!tbody) return;

            const data = tutors || this.dataManager.tutors;
            
            tbody.innerHTML = data.map((tutor, index) => `
                <tr style="animation: fadeInUp ${0.3 + index * 0.1}s ease-out">
                    <td>
                        <div class="tutor-name-cell">
                            <img src="${tutor.avatar}" alt="${tutor.name}" 
                                 class="tutor-avatar-small" 
                                 onerror="this.src='placeholder-profile.jpg'">
                            <span class="neural-text" data-text="${tutor.name}">
                                ${tutor.name}
                            </span>
                        </div>
                    </td>
                    <td>${tutor.subjects.join(', ')}</td>
                    <td>
                        <span class="method-badge ethereal-glass glow-quantum">
                            ${tutor.method}
                        </span>
                    </td>
                    <td>
                        <div class="progress-cell">
                            <div class="circular-progress-mini">
                                <svg viewBox="0 0 36 36" width="50" height="50">
                                    <defs>
                                        <linearGradient id="progress-${tutor.id}">
                                            <stop offset="0%" stop-color="#FFD700" />
                                            <stop offset="100%" stop-color="#FFA500" />
                                        </linearGradient>
                                    </defs>
                                    <path class="circle-bg"
                                        d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path class="circle"
                                        stroke="url(#progress-${tutor.id})"
                                        stroke-dasharray="${tutor.progress}, 100"
                                        d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <text x="18" y="20.35" class="percentage">
                                        ${tutor.progress}%
                                    </text>
                                </svg>
                            </div>
                        </div>
                    </td>
                    <td>
                        <button class="btn-quantum view-tutor-btn" 
                                data-tutor-id="${tutor.id}">
                            View Details
                        </button>
                    </td>
                </tr>
            `).join('');

            this.attachViewHandlers();
        }

        attachViewHandlers() {
            document.querySelectorAll('.view-tutor-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tutorId = e.target.getAttribute('data-tutor-id');
                    const tutor = this.dataManager.getTutor(tutorId);
                    if (tutor) {
                        app.modalManager.open('tutor-details-modal', tutor);
                    }
                });
            });
        }

        attachSearchHandler() {
            const searchInput = document.getElementById('tutor-search');
            if (!searchInput) return;

            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const query = e.target.value.trim();
                    const results = query ? 
                        this.dataManager.searchTutors(query) : 
                        this.dataManager.tutors;
                    this.populateTutorsTable(results);
                }, 300);
            });

            // Add keyboard shortcut (Cmd/Ctrl + K)
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    searchInput.focus();
                }
            });
        }
    }

    // ============================================
    // MAIN APPLICATION
    // ============================================
    class QuantumLearningApp {
        constructor() {
            this.themeManager = new ThemeManager();
            this.sidebarManager = new SidebarManager();
            this.modalManager = new ModalManager();
            this.notificationSystem = new NotificationSystem();
            this.dataManager = new DataManager();
            this.tableManager = new TableManager(this.dataManager);
            this.rightSidebarManager = new RightSidebarManager();
            this.widgetsManager = new WidgetsManager();
            
            this.init();
        }

        init() {
            this.attachButtonHandlers();
            this.attachSidebarLinks();
            this.initializeAnimations();
            this.setupGlobalFunctions();
            
            console.log('✨ Quantum Learning Platform Initialized Successfully!');
        }

        attachButtonHandlers() {
            // Profile buttons
            const buttons = {
                '.edit-profile-btn': () => this.modalManager.open('edit-profile-modal'),
                '.sessions-btn': () => {
                    const sessions = this.dataManager.sessions;
                    this.modalManager.open('sessions-modal', sessions);
                },
                '.contact-parent-btn': () => this.modalManager.open('parent-modal'),
                '.certifications-btn': () => this.modalManager.open('certifications-modal'),
                '.add-course-btn': () => this.modalManager.open('add-course-modal'),
                '.cover-edit': () => this.modalManager.open('cover-upload-modal'),
                '.profile-edit': () => this.modalManager.open('profile-upload-modal')
            };

            Object.entries(buttons).forEach(([selector, handler]) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.addEventListener('click', handler);
                }
            });

            // Notification icon
            const notificationIcon = document.querySelector('.notification-icon');
            if (notificationIcon) {
                notificationIcon.addEventListener('click', () => {
                    this.notificationSystem.show('You have 3 new notifications!', 'info');
                });
            }
        }

        attachSidebarLinks() {
            const myCoursesLink = document.querySelector('[data-action="my-courses"]');
            if (myCoursesLink) {
                myCoursesLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.sidebarManager.close();
                    this.modalManager.open('my-courses-modal', this.dataManager.courses);
                });
            }
        }

        initializeAnimations() {
            // Add intersection observer for scroll animations
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -100px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, observerOptions);

            // Observe all cards and widgets
            document.querySelectorAll('.card-dimensional, .widget-modern, .stat-card').forEach(el => {
                observer.observe(el);
            });
        }

        setupGlobalFunctions() {
            // Expose functions for inline handlers
            window.app = this;
        }

        // Public methods for inline handlers
        resumeCourse(courseId) {
            this.notificationSystem.show(`Resuming course ${courseId}...`, 'info');
        }

        chatWithTutor(tutorName) {
            this.notificationSystem.show(`Opening chat with ${tutorName}...`, 'info');
        }

        scheduleMeeting(tutorId) {
            const tutor = this.dataManager.getTutor(tutorId);
            if (tutor) {
                this.notificationSystem.show(`Scheduling meeting with ${tutor.name}...`, 'success');
            }
        }

        sendMessage(tutorId) {
            const tutor = this.dataManager.getTutor(tutorId);
            if (tutor) {
                this.notificationSystem.show(`Opening message to ${tutor.name}...`, 'info');
            }
        }

        addCourse(courseName) {
            this.notificationSystem.show(`Course "${courseName}" has been added!`, 'success');
            this.modalManager.close();
        }

        requestCourse(courseName) {
            this.notificationSystem.show(`Course request for "${courseName}" submitted!`, 'success');
            this.modalManager.close();
        }
    }

    // ============================================
    // ANIMATIONS STYLESHEET
    // ============================================
    const animationStyles = `
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
        
        @keyframes fadeInUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .animate-in {
            animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .circular-progress-mini svg {
            transform: rotate(-90deg);
        }
        
        .circular-progress-mini .circle-bg {
            fill: none;
            stroke: rgba(255, 255, 255, 0.1);
            stroke-width: 3;
        }
        
        .circular-progress-mini .circle {
            fill: none;
            stroke-width: 3;
            stroke-linecap: round;
            transition: stroke-dasharray 1s ease;
        }
        
        .circular-progress-mini .percentage {
            fill: #FFD700;
            font-size: 0.5em;
            text-anchor: middle;
            font-weight: 700;
        }
    `;

    // Inject animation styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = animationStyles;
    document.head.appendChild(styleSheet);

    // Initialize the application
    const app = new QuantumLearningApp();
});




// ============================================
// RIGHT SIDEBAR FOOTER ANIMATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const rightSidebar = document.querySelector('.right-sidebar');
    const footer = document.querySelector('.footer');
    const navbar = document.querySelector('.navbar');
    
    if (!rightSidebar || !footer) return;
    
    // Get navbar height
    const navbarHeight = navbar ? navbar.offsetHeight : 80;
    
    // Function to calculate and update sidebar position
    function updateSidebarPosition() {
        // Get window and footer dimensions
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY;
        const footerRect = footer.getBoundingClientRect();
        const footerTop = footerRect.top;
        
        // Calculate how much of the footer is visible
        const footerVisibleHeight = Math.max(0, windowHeight - footerTop);
        
        // Calculate sidebar bottom position
        // Add extra padding (20px) for better visual spacing
        const sidebarBottom = footerVisibleHeight + 20;
        
        // Apply smooth animation to sidebar
        rightSidebar.style.transition = 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        rightSidebar.style.bottom = `${sidebarBottom}px`;
        
        // Adjust max-height to account for both navbar and footer
        const availableHeight = windowHeight - navbarHeight - footerVisibleHeight - 40; // 40px for padding
        rightSidebar.style.maxHeight = `${availableHeight}px`;
        
        // Optional: Add a class when footer is in view for additional styling
        if (footerVisibleHeight > 0) {
            rightSidebar.classList.add('footer-visible');
        } else {
            rightSidebar.classList.remove('footer-visible');
        }
    }
    
    // Throttle function for better performance
    function throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function(...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    // Create throttled version of update function
    const throttledUpdate = throttle(updateSidebarPosition, 16); // ~60fps
    
    // Add scroll event listener
    window.addEventListener('scroll', throttledUpdate);
    
    // Add resize event listener
    window.addEventListener('resize', throttledUpdate);
    
    // Initial position calculation
    updateSidebarPosition();
    
    // Recalculate on content changes (useful for dynamic content)
    const observer = new MutationObserver(throttledUpdate);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
    
    // Optional: Smooth scroll behavior when clicking sidebar items
    const sidebarLinks = rightSidebar.querySelectorAll('a, button');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Small delay to ensure smooth animation
            setTimeout(updateSidebarPosition, 100);
        });
    });
});

// ============================================
// INTERSECTION OBSERVER ALTERNATIVE (More Performant)
// ============================================

// Alternative implementation using Intersection Observer for better performance
document.addEventListener('DOMContentLoaded', function() {
    const rightSidebar = document.querySelector('.right-sidebar');
    const footer = document.querySelector('.footer');
    const navbar = document.querySelector('.navbar');
    
    if (!rightSidebar || !footer) return;
    
    const navbarHeight = navbar ? navbar.offsetHeight : 80;
    
    // Create Intersection Observer
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: Array.from({length: 101}, (_, i) => i / 100) // 0, 0.01, 0.02, ..., 1
    };
    
    const footerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.target === footer) {
                const footerVisibleRatio = entry.intersectionRatio;
                const footerHeight = footer.offsetHeight;
                const footerVisibleHeight = footerHeight * footerVisibleRatio;
                
                // Calculate sidebar bottom with smooth easing
                const sidebarBottom = footerVisibleHeight + 20;
                
                // Apply with smooth transition
                rightSidebar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                rightSidebar.style.bottom = `${sidebarBottom}px`;
                
                // Adjust max-height
                const windowHeight = window.innerHeight;
                const availableHeight = windowHeight - navbarHeight - footerVisibleHeight - 40;
                rightSidebar.style.maxHeight = `${availableHeight}px`;
                
                // Add visual feedback class
                if (footerVisibleRatio > 0) {
                    rightSidebar.classList.add('footer-visible');
                    // Optional: Reduce opacity slightly when footer is very visible
                    if (footerVisibleRatio > 0.5) {
                        rightSidebar.style.opacity = 0.95;
                    }
                } else {
                    rightSidebar.classList.remove('footer-visible');
                    rightSidebar.style.opacity = 1;
                }
            }
        });
    }, observerOptions);
    
    // Start observing the footer
    footerObserver.observe(footer);
});


// Enhanced version with velocity detection for smoother animations
(function() {
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let animationFrame = null;
    
    function updateScrollVelocity() {
        const currentScrollY = window.scrollY;
        scrollVelocity = currentScrollY - lastScrollY;
        lastScrollY = currentScrollY;
        
        const rightSidebar = document.querySelector('.right-sidebar');
        if (!rightSidebar) return;
        
        // Add different transition speeds based on scroll velocity
        const absVelocity = Math.abs(scrollVelocity);
        if (absVelocity > 50) {
            // Fast scrolling - quicker animation
            rightSidebar.style.transitionDuration = '0.15s';
        } else if (absVelocity > 20) {
            // Medium scrolling
            rightSidebar.style.transitionDuration = '0.25s';
        } else {
            // Slow scrolling - smooth animation
            rightSidebar.style.transitionDuration = '0.3s';
        }
        
        animationFrame = requestAnimationFrame(updateScrollVelocity);
    }
    
    // Start monitoring on scroll
    window.addEventListener('scroll', () => {
        if (!animationFrame) {
            animationFrame = requestAnimationFrame(updateScrollVelocity);
        }
    }, { passive: true });
    
    // Stop monitoring when scroll ends
    let scrollEndTimer;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
            
            // Reset to default transition
            const rightSidebar = document.querySelector('.right-sidebar');
            if (rightSidebar) {
                rightSidebar.style.transitionDuration = '0.3s';
            }
        }, 150);
    }, { passive: true });
})();
