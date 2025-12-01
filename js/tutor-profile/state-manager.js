// ============================================
// TUTOR PROFILE STATE MANAGER
// Centralized state management for tutor profile
// ============================================

const TutorProfileState = {
    // User and profile data
    currentUser: null,
    tutorProfile: null,
    currentToken: null,

    // Session and student data
    requestedSessions: [],
    confirmedStudents: [],
    connections: [],

    // Content data
    allVideos: [],
    blogPosts: [],
    playlists: [],

    // UI state
    currentModalContext: null,
    activeFilter: 'all',
    activeSection: 'overview',

    // School database for autocomplete
    schoolDatabase: [
        { name: "Addis Ababa University", location: "Addis Ababa", type: "university" },
        { name: "Jimma University", location: "Jimma", type: "university" },
        { name: "Bahir Dar University", location: "Bahir Dar", type: "university" },
        { name: "Hawassa University", location: "Hawassa", type: "university" },
        { name: "Mekelle University", location: "Mekelle", type: "university" },
        { name: "Arba Minch University", location: "Arba Minch", type: "university" },
        { name: "Gondar University", location: "Gondar", type: "university" },
        { name: "Haramaya University", location: "Haramaya", type: "university" },
        { name: "Adama Science and Technology University", location: "Adama", type: "university" },
        { name: "Dilla University", location: "Dilla", type: "university" },
        { name: "Wollo University", location: "Dessie", type: "university" },
        { name: "Debre Markos University", location: "Debre Markos", type: "university" },
        { name: "Adigrat University", location: "Adigrat", type: "university" },
        { name: "Mizan Tepi University", location: "Mizan Teferi", type: "university" },
        { name: "Samara University", location: "Samara", type: "university" },
        { name: "Bule Hora University", location: "Bule Hora", type: "university" },
        { name: "Wachemo University", location: "Hossana", type: "university" },
        { name: "Ethiopian Civil Service University", location: "Addis Ababa", type: "university" },
        { name: "Defense University", location: "Addis Ababa", type: "university" },
        { name: "St. Mary's University", location: "Addis Ababa", type: "private" },
        { name: "Unity University", location: "Addis Ababa", type: "private" },
        { name: "Admas University", location: "Addis Ababa", type: "private" },
        { name: "Rift Valley University", location: "Addis Ababa", type: "private" }
    ],

    // Getters
    getCurrentUser() {
        return this.currentUser;
    },

    getTutorProfile() {
        return this.tutorProfile;
    },

    getToken() {
        if (!this.currentToken) {
            this.currentToken = localStorage.getItem('token');
        }
        return this.currentToken;
    },

    // Setters
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    },

    setTutorProfile(profile) {
        this.tutorProfile = profile;
        if (profile) {
            localStorage.setItem('tutorProfile', JSON.stringify(profile));
        } else {
            localStorage.removeItem('tutorProfile');
        }
    },

    setToken(token) {
        this.currentToken = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    },

    setRequestedSessions(sessions) {
        this.requestedSessions = sessions || [];
    },

    setConfirmedStudents(students) {
        this.confirmedStudents = students || [];
    },

    setConnections(connections) {
        this.connections = connections || [];
    },

    setVideos(videos) {
        this.allVideos = videos || [];
    },

    setBlogPosts(posts) {
        this.blogPosts = posts || [];
    },

    setPlaylists(playlists) {
        this.playlists = playlists || [];
    },

    setModalContext(context) {
        this.currentModalContext = context;
    },

    setActiveFilter(filter) {
        this.activeFilter = filter;
    },

    setActiveSection(section) {
        this.activeSection = section;
    },

    // Data operations
    addCertification(cert) {
        if (!this.tutorProfile) return;
        if (!this.tutorProfile.certifications) {
            this.tutorProfile.certifications = [];
        }
        this.tutorProfile.certifications.push(cert);
    },

    updateCertification(id, updatedCert) {
        if (!this.tutorProfile?.certifications) return;
        const index = this.tutorProfile.certifications.findIndex(c => c.id === id);
        if (index !== -1) {
            this.tutorProfile.certifications[index] = { ...this.tutorProfile.certifications[index], ...updatedCert };
        }
    },

    deleteCertification(id) {
        if (!this.tutorProfile?.certifications) return;
        this.tutorProfile.certifications = this.tutorProfile.certifications.filter(c => c.id !== id);
    },

    addExperience(exp) {
        if (!this.tutorProfile) return;
        if (!this.tutorProfile.experiences) {
            this.tutorProfile.experiences = [];
        }
        this.tutorProfile.experiences.push(exp);
    },

    updateExperience(id, updatedExp) {
        if (!this.tutorProfile?.experiences) return;
        const index = this.tutorProfile.experiences.findIndex(e => e.id === id);
        if (index !== -1) {
            this.tutorProfile.experiences[index] = { ...this.tutorProfile.experiences[index], ...updatedExp };
        }
    },

    deleteExperience(id) {
        if (!this.tutorProfile?.experiences) return;
        this.tutorProfile.experiences = this.tutorProfile.experiences.filter(e => e.id !== id);
    },

    addAchievement(achievement) {
        if (!this.tutorProfile) return;
        if (!this.tutorProfile.achievements) {
            this.tutorProfile.achievements = [];
        }
        this.tutorProfile.achievements.push(achievement);
    },

    updateAchievement(id, updatedAchievement) {
        if (!this.tutorProfile?.achievements) return;
        const index = this.tutorProfile.achievements.findIndex(a => a.id === id);
        if (index !== -1) {
            this.tutorProfile.achievements[index] = { ...this.tutorProfile.achievements[index], ...updatedAchievement };
        }
    },

    deleteAchievement(id) {
        if (!this.tutorProfile?.achievements) return;
        this.tutorProfile.achievements = this.tutorProfile.achievements.filter(a => a.id !== id);
    },

    // Search schools
    searchSchools(query) {
        if (!query) return this.schoolDatabase;

        const lowerQuery = query.toLowerCase();
        return this.schoolDatabase.filter(school =>
            school.name.toLowerCase().includes(lowerQuery) ||
            school.location.toLowerCase().includes(lowerQuery)
        );
    },

    // Reset state
    reset() {
        this.currentUser = null;
        this.tutorProfile = null;
        this.currentToken = null;
        this.requestedSessions = [];
        this.confirmedStudents = [];
        this.connections = [];
        this.allVideos = [];
        this.blogPosts = [];
        this.playlists = [];
        this.currentModalContext = null;
        this.activeFilter = 'all';
        this.activeSection = 'overview';

        // Clear localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('tutorProfile');
        localStorage.removeItem('token');
    },

    // Load from localStorage
    loadFromStorage() {
        try {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
            }

            const storedProfile = localStorage.getItem('tutorProfile');
            if (storedProfile) {
                this.tutorProfile = JSON.parse(storedProfile);
            }

            this.currentToken = localStorage.getItem('token');
        } catch (error) {
            console.error('Error loading state from storage:', error);
        }
    }
};
