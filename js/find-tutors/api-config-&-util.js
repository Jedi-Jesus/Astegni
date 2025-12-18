// ============================================
// API CONFIGURATION & UTILITIES
// ============================================

// Set global API base URL for compatibility with other modules
window.API_BASE_URL = 'http://localhost:8000/api';

const FindTutorsAPI = {
    baseUrl: window.API_BASE_URL,

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Get current user's ID from localStorage or JWT token
    getCurrentUserId() {
        // Try to get from stored user data
        const possibleKeys = ['userData', 'user', 'currentUser', 'userProfile', 'authUser'];
        for (const key of possibleKeys) {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.user_id) return parsed.user_id;
                    if (parsed && parsed.id) return parsed.id;
                } catch (e) {}
            }
        }

        // Try to get from JWT token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token) {
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    // JWT token has 'sub' field for user_id
                    if (payload.sub) return parseInt(payload.sub);
                    if (payload.user_id) return parseInt(payload.user_id);
                }
            } catch (e) {}
        }

        return null;
    },

    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: { ...this.getHeaders(), ...options.headers }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async getTutors(params = {}) {
        // Map frontend filter names to backend parameter names
        const backendParams = {};

        if (params.search) backendParams.search = params.search;
        if (params.subject) backendParams.subject = params.subject;
        if (params.gender) backendParams.gender = params.gender;
        if (params.courseType) backendParams.courseType = params.courseType;
        if (params.gradeLevel) backendParams.gradeLevel = params.gradeLevel;
        if (params.sessionFormat) backendParams.sessionFormat = params.sessionFormat;
        if (params.minPrice) backendParams.min_price = params.minPrice;
        if (params.maxPrice) backendParams.max_price = params.maxPrice;
        if (params.minRating) backendParams.min_rating = params.minRating;
        if (params.maxRating) backendParams.max_rating = params.maxRating;
        if (params.sortBy) backendParams.sort_by = params.sortBy;
        if (params.favorite) backendParams.favorite = params.favorite;
        if (params.saved) backendParams.saved = params.saved;
        if (params.searchHistory) backendParams.searchHistory = params.searchHistory;
        if (params.page) backendParams.page = params.page;
        if (params.limit) backendParams.limit = params.limit;

        // Send search history IDs to backend for smart ranking
        const searchHistoryIds = PreferencesManager.getSearchHistoryTutorIds();
        if (searchHistoryIds.length > 0) {
            backendParams.search_history_ids = searchHistoryIds.join(',');
        }

        // Exclude current user from results (tutor should not see their own card)
        const currentUserId = this.getCurrentUserId();
        if (currentUserId) {
            backendParams.exclude_user_id = currentUserId;
        }

        const queryString = new URLSearchParams(backendParams).toString();
        console.log('API call params:', backendParams);

        try {
            const response = await this.fetch(`/tutors?${queryString}`);
            // Normalize tutor data to handle redundant fields
            if (response.tutors && Array.isArray(response.tutors)) {
                response.tutors = response.tutors.map(tutor => this.normalizeTutorForFiltering({...tutor}));

                // Fetch connection status for all tutors if user is logged in
                const token = localStorage.getItem('access_token') || localStorage.getItem('token');
                if (token && response.tutors.length > 0) {
                    const connectionStatuses = await this.getConnectionStatusBatch(
                        response.tutors.map(t => t.id),
                        'tutor'
                    );

                    // Merge connection status into tutor objects
                    response.tutors = response.tutors.map(tutor => {
                        const connStatus = connectionStatuses[tutor.id];
                        if (connStatus) {
                            tutor.is_connected = connStatus.is_connected;
                            tutor.connection_status = connStatus.status;
                            tutor.connection_pending = connStatus.status === 'pending' && connStatus.direction === 'outgoing';
                            tutor.connection_incoming = connStatus.status === 'pending' && connStatus.direction === 'incoming';
                            tutor.connection_id = connStatus.connection_id;
                        }
                        return tutor;
                    });
                }
            }
            return response;
        } catch (error) {
            // Fallback to sample data if API is not available or search fails
            console.warn('API not available or search failed, using sample data:', error.message);
            return this.getSampleTutors(params);
        }
    },

    // Get connection status for multiple profile IDs (batch)
    async getConnectionStatusBatch(profileIds, targetType = 'tutor') {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token || !profileIds || profileIds.length === 0) {
            return {};
        }

        try {
            const response = await fetch(`${this.baseUrl}/connections/check-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    target_profile_ids: profileIds,
                    target_type: targetType
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.connections || {};
            }
        } catch (error) {
            console.warn('Failed to fetch connection statuses:', error.message);
        }

        return {};
    },

    // Helper function to normalize redundant fields
    normalizeTutorForFiltering(tutor) {
        // Backend now only sends sessionFormat, ensure it exists
        if (!tutor.sessionFormat) {
            tutor.sessionFormat = 'Online';  // Default to Online
        }

        // Consolidate redundant course type fields
        if (!tutor.courseType && tutor.course_type) {
            tutor.courseType = tutor.course_type;
            delete tutor.course_type;
        }

        // Consolidate redundant grade fields
        if (!tutor.gradeLevel && tutor.grade_level) {
            tutor.gradeLevel = tutor.grade_level;
            delete tutor.grade_level;
        }

        return tutor;
    },

    getSampleTutors(params = {}) {
        // Sample Ethiopian tutors data for testing
        const sampleTutors = [
            {
                id: 1,
                first_name: "Abebe",
                father_name: "Tadesse",
                email: "abebe.tadesse@email.com",
                phone: "+251911234567",
                location: "Addis Ababa",
                bio: "Experienced Mathematics tutor with 8 years of teaching experience",
                subjects: ["Mathematics", "Physics"],
                gender: "Male",
                courseType: "Academic",
                teachesAt: "Addis Ababa University",
                sessionFormat: "In-person",
                gradeLevel: "University Level",
                languages: ["English", "Amharic"],
                rating: 4.8,
                hourly_rate: 350,
                age: 32,
                experience: 8,
                profile_complete: true,
                is_active: true
            },
            {
                id: 2,
                first_name: "Hanan",
                father_name: "Mohammed",
                email: "hanan.mohammed@email.com",
                phone: "+251922345678",
                location: "Dire Dawa",
                bio: "Professional English language instructor specializing in IELTS preparation",
                subjects: ["English", "Literature"],
                gender: "Female",
                courseType: "Professional",
                teachesAt: "Ethiopian High School",
                sessionFormat: "Online",
                gradeLevel: "Grade 10-12",
                languages: ["English", "Amharic", "Oromo"],
                rating: 4.6,
                hourly_rate: 280,
                age: 28,
                experience: 5,
                profile_complete: true,
                is_active: true
            },
            {
                id: 3,
                first_name: "Dawit",
                father_name: "Kebede",
                email: "dawit.kebede@email.com",
                phone: "+251933456789",
                location: "Bahir Dar",
                bio: "Chemistry and Biology tutor with university teaching background",
                subjects: ["Chemistry", "Biology"],
                gender: "Male",
                courseType: "Academic",
                teachesAt: "Bahir Dar University",
                sessionFormat: "Hybrid",
                languages: ["English", "Amharic"],
                rating: 4.9,
                hourly_rate: 420,
                age: 35,
                experience: 12,
                profile_complete: true,
                is_active: true
            },
            {
                id: 4,
                first_name: "Meron",
                father_name: "Assefa",
                email: "meron.assefa@email.com",
                phone: "+251944567890",
                location: "Hawassa",
                bio: "Computer Science and Programming mentor",
                subjects: ["Computer Science", "Programming"],
                gender: "Female",
                courseType: "Academic & Professional",
                teachesAt: "Hawassa University",
                sessionFormat: "Online",
                gradeLevel: "University Level",
                languages: ["English", "Amharic", "Gurage"],
                rating: 4.7,
                hourly_rate: 380,
                age: 29,
                experience: 6,
                profile_complete: true,
                is_active: true
            },
            {
                id: 5,
                first_name: "Solomon",
                father_name: "Girma",
                email: "solomon.girma@email.com",
                phone: "+251955678901",
                location: "Mekelle",
                bio: "Mathematics and Economics tutor for high school and university students",
                subjects: ["Mathematics", "Economics"],
                gender: "Male",
                courseType: "Academic",
                teachesAt: "Mekelle University",
                languages: ["English", "Amharic"],
                rating: 2.8,
                hourly_rate: 120,
                age: 26,
                experience: 3,
                profile_complete: true,
                is_active: true
            },
            {
                id: 6,
                first_name: "Tigist",
                father_name: "Haile",
                email: "tigist.haile@email.com",
                phone: "+251966789012",
                location: "Jimma",
                bio: "History and Geography specialist with research background",
                subjects: ["History", "Geography"],
                gender: "Female",
                courseType: "Academic & Professional",
                teachesAt: "Jimma University",
                sessionFormat: "Online",
                gradeLevel: "University Level",
                languages: ["English", "Amharic", "Oromo"],
                rating: 3.4,
                hourly_rate: 180,
                age: 31,
                experience: 7,
                profile_complete: true,
                is_active: true
            },
            {
                id: 7,
                first_name: "Rahel",
                father_name: "Mengistu",
                email: "rahel.mengistu@email.com",
                phone: "+251977890123",
                location: "Adama",
                bio: "Professional English and French language tutor with certification",
                subjects: ["English", "French", "Literature"],
                gender: "Female",
                courseType: "Professional",
                teachesAt: "Language Institute",
                languages: ["English", "French", "Amharic"],
                rating: 4.5,
                hourly_rate: 250,
                age: 27,
                experience: 4,
                profile_complete: true,
                is_active: true
            },
            {
                id: 8,
                first_name: "Yohannes",
                father_name: "Tekle",
                email: "yohannes.tekle@email.com",
                phone: "+251988901234",
                location: "Gondar",
                bio: "High school Mathematics and Physics teacher",
                subjects: ["Mathematics", "Physics"],
                gender: "Male",
                courseType: "Academic",
                teachesAt: "Gondar High School",
                languages: ["English", "Amharic"],
                rating: 4.2,
                hourly_rate: 200,
                age: 33,
                experience: 9,
                profile_complete: true,
                is_active: true
            },
            {
                id: 9,
                first_name: "Selamawit",
                father_name: "Desta",
                email: "selamawit.desta@email.com",
                phone: "+251999012345",
                location: "Dessie",
                bio: "Elementary grade teacher specializing in early childhood education for Grade 1-4 students",
                subjects: ["Elementary Math", "Science", "Reading"],
                gender: "Female",
                courseType: "Academic",
                teachesAt: "Dessie Elementary School",
                sessionFormat: "In-person",
                gradeLevel: "University Level",
                languages: ["English", "Amharic"],
                rating: 4.6,
                hourly_rate: 150,
                age: 25,
                experience: 3,
                profile_complete: true,
                is_active: true
            },
            {
                id: 10,
                first_name: "Alemayehu",
                father_name: "Worku",
                email: "alemayehu.worku@email.com",
                phone: "+251910123456",
                location: "Arba Minch",
                bio: "University-level Statistics and Data Science instructor",
                subjects: ["Statistics", "Data Science", "Mathematics"],
                gender: "Male",
                courseType: "Both Academic and Professional",
                teachesAt: "Arba Minch University",
                languages: ["English", "Amharic"],
                rating: 4.9,
                hourly_rate: 450,
                age: 38,
                experience: 14,
                profile_complete: true,
                is_active: true
            },
            {
                id: 11,
                first_name: "Kalkidan",
                father_name: "Mulugeta",
                email: "kalkidan.mulugeta@email.com",
                phone: "+251921234567",
                location: "Addis Ababa, Bole",
                bio: "Middle school teacher specializing in Grade 7-8 Mathematics and Science",
                subjects: ["Mathematics", "Science", "Physics"],
                gender: "Female",
                courseType: "Academic",
                teachesAt: "Bole Middle School",
                languages: ["English", "Amharic"],
                rating: 4.3,
                hourly_rate: 220,
                age: 30,
                experience: 8,
                profile_complete: true,
                is_active: true
            },
            {
                id: 12,
                first_name: "Biniyam",
                father_name: "Getahun",
                email: "biniyam.getahun@email.com",
                phone: "+251932345678",
                location: "Addis Ababa, Kirkos",
                bio: "KG and preschool educator with early childhood development expertise",
                subjects: ["Early Learning", "Basic Math", "Reading Readiness"],
                gender: "Male",
                courseType: "Academic",
                teachesAt: "Kirkos Kindergarten Center",
                languages: ["English", "Amharic"],
                rating: 4.7,
                hourly_rate: 180,
                age: 28,
                experience: 6,
                profile_complete: true,
                is_active: true
            },
            {
                id: 13,
                first_name: "Hiwot",
                father_name: "Bekele",
                email: "hiwot.bekele@email.com",
                phone: "+251943456789",
                location: "Addis Ababa, Yeka",
                bio: "Grade 11-12 Chemistry and Biology teacher preparing students for university entrance",
                subjects: ["Chemistry", "Biology", "University Prep"],
                gender: "Female",
                courseType: "Academic",
                teachesAt: "Yeka Secondary School",
                languages: ["English", "Amharic"],
                rating: 4.8,
                hourly_rate: 320,
                age: 34,
                experience: 11,
                profile_complete: true,
                is_active: true
            }
        ];

        // Apply filters to sample data WITH field normalization
        let filteredTutors = sampleTutors.map(tutor => this.normalizeTutorForFiltering({...tutor}));

        // SOPHISTICATED SEARCH - Only tutors, courses/subjects, schools/institutions, languages
        if (params.search && params.search.trim()) {
            const searchTerms = params.search.toLowerCase().trim().split(/\s+/);

            filteredTutors = filteredTutors.filter(tutor => {
                // 1. TUTOR NAMES - First name, last name, full name
                const firstName = (tutor.first_name || '').toLowerCase();
                const fatherName = (tutor.father_name || '').toLowerCase();
                const fullName = `${firstName} ${fatherName}`.trim();

                // 2. COURSES/SUBJECTS - What they teach
                const subjects = Array.isArray(tutor.subjects)
                    ? tutor.subjects.map(s => s.toLowerCase())
                    : [];
                const subjectsExpertise = Array.isArray(tutor.subjects_expertise)
                    ? tutor.subjects_expertise.map(s => s.toLowerCase())
                    : [];
                const allSubjects = [...subjects, ...subjectsExpertise].join(' ');

                // 3. SCHOOLS/INSTITUTIONS - Where they teach
                const teachesAt = (tutor.teachesAt || tutor.teaches_at || tutor.institution || '').toLowerCase();

                // 4. LANGUAGES - What languages they speak
                let languages = '';
                if (Array.isArray(tutor.languages)) {
                    languages = tutor.languages.join(' ').toLowerCase();
                } else if (Array.isArray(tutor.languages_spoken)) {
                    languages = tutor.languages_spoken.join(' ').toLowerCase();
                } else if (typeof tutor.languages === 'string') {
                    languages = tutor.languages.toLowerCase();
                } else if (typeof tutor.languages_spoken === 'string') {
                    languages = tutor.languages_spoken.toLowerCase();
                }

                // Create searchable content (ONLY the allowed fields)
                const searchableContent = [
                    firstName,
                    fatherName,
                    fullName,
                    allSubjects,
                    teachesAt,
                    languages
                ].join(' ').toLowerCase();

                // Check if ALL search terms are found (AND logic for multiple terms)
                return searchTerms.every(term => {
                    const termLower = term.toLowerCase();

                    // Check in all searchable content
                    if (searchableContent.includes(termLower)) return true;

                    // Check specific fields with better matching
                    if (firstName.startsWith(termLower) || fatherName.startsWith(termLower)) return true;

                    // Check subjects with partial matching
                    if (subjects.some(subject => subject.includes(termLower))) return true;
                    if (subjectsExpertise.some(subject => subject.includes(termLower))) return true;

                    // Check teaches at
                    if (teachesAt.includes(termLower)) return true;

                    // Check languages more thoroughly
                    if (Array.isArray(tutor.languages)) {
                        if (tutor.languages.some(lang => lang.toLowerCase().includes(termLower))) return true;
                    }
                    if (languages.includes(termLower)) return true;

                    // Check courses field if it exists
                    if (Array.isArray(tutor.courses)) {
                        if (tutor.courses.some(course => course.toLowerCase().includes(termLower))) return true;
                    }

                    return false;
                });
            });
        }

        // ENHANCED GENDER FILTER - Multiple selection support
        if (params.gender && params.gender.trim()) {
            const selectedGenders = params.gender.split(',')
                .map(g => g.trim().toLowerCase())
                .filter(g => g); // Remove empty strings

            filteredTutors = filteredTutors.filter(tutor => {
                const tutorGender = (tutor.gender || '').toLowerCase();
                return selectedGenders.includes(tutorGender);
            });
        }

        // SOPHISTICATED LOCATION FILTER - City, region, and proximity matching
        if (params.location && params.location.trim()) {
            const locationTerms = params.location.toLowerCase().trim().split(/\s+/);

            filteredTutors = filteredTutors.filter(tutor => {
                const tutorLocation = (tutor.location || '').toLowerCase();

                // Check if any location term matches
                return locationTerms.some(term => tutorLocation.includes(term)) ||
                       // Handle special cases
                       (locationTerms.includes('addis') && tutorLocation.includes('addis ababa')) ||
                       (locationTerms.includes('online') && tutorLocation.includes('remote')) ||
                       (locationTerms.includes('remote') && tutorLocation.includes('online'));
            });
        }

        // ADVANCED PRICE RANGE FILTER - Handles currency and formatting
        if (params.minPrice || params.maxPrice) {
            filteredTutors = filteredTutors.filter(tutor => {
                let price = 0;

                // Extract numeric price from various formats
                if (tutor.hourly_rate) {
                    price = parseFloat(tutor.hourly_rate.toString().replace(/[^\d.]/g, ''));
                } else if (tutor.price) {
                    price = parseFloat(tutor.price.toString().replace(/[^\d.]/g, ''));
                }

                const minPrice = params.minPrice ? parseFloat(params.minPrice) : 0;
                const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : Infinity;

                return price >= minPrice && price <= maxPrice;
            });
        }

        // SOPHISTICATED RATING FILTER - Range and quality matching
        if (params.minRating || params.maxRating) {
            filteredTutors = filteredTutors.filter(tutor => {
                const rating = parseFloat(tutor.rating || 0);
                const minRating = params.minRating ? parseFloat(params.minRating) : 0;
                const maxRating = params.maxRating ? parseFloat(params.maxRating) : 5;

                return rating >= minRating && rating <= maxRating;
            });
        }

        // ENHANCED SUBJECT/COURSE FILTER
        if (params.subject && params.subject.trim()) {
            const subjectTerms = params.subject.toLowerCase().trim().split(/\s+/);

            filteredTutors = filteredTutors.filter(tutor => {
                const subjects = Array.isArray(tutor.subjects)
                    ? tutor.subjects.map(s => s.toLowerCase()).join(' ')
                    : '';
                const subjectsExpertise = Array.isArray(tutor.subjects_expertise)
                    ? tutor.subjects_expertise.map(s => s.toLowerCase()).join(' ')
                    : '';
                const allSubjects = `${subjects} ${subjectsExpertise}`.toLowerCase();

                return subjectTerms.every(term => allSubjects.includes(term));
            });
        }

        // PERFECT COURSE TYPE FILTERING - Strict matching with fallback
        if (params.courseType && params.courseType.trim()) {
            const selectedCourseType = params.courseType.trim();
            console.log('Filtering by course type:', selectedCourseType);

            filteredTutors = filteredTutors.filter(tutor => {
                // Check multiple possible fields
                const tutorCourseType = tutor.courseType || tutor.course_type || tutor.teaching_type || '';

                console.log(`Tutor ${tutor.first_name}: course type = ${tutorCourseType}`);

                // Exact matching
                if (selectedCourseType === 'Academic') {
                    return tutorCourseType === 'Academic' || tutorCourseType.includes('Academic');
                } else if (selectedCourseType === 'Professional') {
                    return tutorCourseType === 'Professional' || tutorCourseType.includes('Professional');
                } else if (selectedCourseType === 'Academic & Professional') {
                    return tutorCourseType === 'Academic & Professional' ||
                           tutorCourseType === 'Both' ||
                           tutorCourseType.includes('Both');
                }

                // Exact match fallback
                return tutorCourseType === selectedCourseType;
            });
        }

        // SESSION FORMAT FILTERING - Now using normalized sessionFormat field only
        if (params.sessionFormat && params.sessionFormat.trim()) {
            const selectedFormat = params.sessionFormat.trim();
            console.log('Filtering by session format:', selectedFormat);

            filteredTutors = filteredTutors.filter(tutor => {
                // Use only the normalized sessionFormat field
                const tutorFormat = tutor.sessionFormat || '';

                console.log(`Checking ${tutor.first_name}: format = "${tutorFormat}" vs selected = "${selectedFormat}"`);

                // EXACT MATCH ONLY
                if (!tutorFormat) return false;

                // Check if tutor has the selected format
                if (selectedFormat === 'Online') {
                    return tutorFormat === 'Online' || tutorFormat.includes('Online');
                } else if (selectedFormat === 'In-person') {
                    return tutorFormat === 'In-person' || tutorFormat.includes('In-person');
                } else if (selectedFormat === 'Self-paced') {
                    return tutorFormat === 'Self-paced' || tutorFormat.includes('Self-paced');
                } else if (selectedFormat === 'Hybrid') {
                    return tutorFormat === 'Hybrid' || tutorFormat.includes('Hybrid');
                }

                return false; // No match
            });

            console.log(`Filtered to ${filteredTutors.length} tutors`);
        }

        // INTELLIGENT GRADE LEVEL FILTERING - Comprehensive matching
        if (params.gradeLevel && params.gradeLevel.trim()) {
            const selectedGradeLevel = params.gradeLevel.trim();
            console.log('Filtering by grade level:', selectedGradeLevel);

            filteredTutors = filteredTutors.filter(tutor => {
                // Check multiple possible fields
                let tutorGrades = tutor.gradeLevel || tutor.grade_level || tutor.grades || '';

                // If grades is an array, convert to string
                if (Array.isArray(tutorGrades)) {
                    tutorGrades = tutorGrades.join(', ');
                }

                tutorGrades = tutorGrades.toString();
                console.log(`Tutor ${tutor.first_name}: grades = ${tutorGrades}`);

                // Smart logic: tutors with "All Grade Levels" appear in any specific filter
                if (tutorGrades.toLowerCase().includes('all grade') ||
                    tutorGrades.toLowerCase().includes('all levels')) {
                    return true;
                }

                // If user selects "All Grade Levels", show only tutors that teach all levels
                if (selectedGradeLevel === 'All Grade Levels') {
                    return tutorGrades.toLowerCase().includes('all grade') ||
                           tutorGrades.toLowerCase().includes('all levels');
                }

                // Check for grade level matches
                if (selectedGradeLevel === 'Grade 1-6') {
                    return tutorGrades.includes('Grade 1-6') ||
                           tutorGrades.includes('Elementary') ||
                           tutorGrades.includes('Primary') ||
                           /Grade [1-6]/.test(tutorGrades);
                } else if (selectedGradeLevel === 'Grade 7-9') {
                    return tutorGrades.includes('Grade 7-9') ||
                           tutorGrades.includes('Middle') ||
                           tutorGrades.includes('Junior') ||
                           /Grade [7-9]/.test(tutorGrades);
                } else if (selectedGradeLevel === 'Grade 10-12') {
                    return tutorGrades.includes('Grade 10-12') ||
                           tutorGrades.includes('High School') ||
                           tutorGrades.includes('Secondary') ||
                           /Grade 1[0-2]/.test(tutorGrades);
                } else if (selectedGradeLevel === 'University Level') {
                    return tutorGrades.includes('University') ||
                           tutorGrades.includes('College') ||
                           tutorGrades.includes('Higher Education') ||
                           tutorGrades.includes('Undergraduate') ||
                           tutorGrades.includes('Graduate');
                }

                // Exact match fallback
                return tutorGrades.includes(selectedGradeLevel);
            });
        }

        // ADVANCED PREFERENCE FILTERING - Favorites, Saved, Search History
        if (params.favorite === true || params.favorite === 'true' || params.favorite === 1) {
            const favoriteTutors = PreferencesManager.getFavorites();
            console.log('Filtering by favorites:', favoriteTutors);
            if (favoriteTutors.length > 0) {
                filteredTutors = filteredTutors.filter(tutor =>
                    favoriteTutors.includes(tutor.id)
                );
            } else {
                // No favorites, return empty
                filteredTutors = [];
            }
        }

        if (params.saved === true || params.saved === 'true' || params.saved === 1) {
            const savedTutors = PreferencesManager.getSaved();
            console.log('Filtering by saved:', savedTutors);
            if (savedTutors.length > 0) {
                filteredTutors = filteredTutors.filter(tutor =>
                    savedTutors.includes(tutor.id)
                );
            } else {
                // No saved tutors, return empty
                filteredTutors = [];
            }
        }

        if (params.searchHistory === true || params.searchHistory === 'true' || params.searchHistory === 1) {
            const historyTutorIds = PreferencesManager.getSearchHistoryTutorIds();
            console.log('Filtering by search history:', historyTutorIds);
            if (historyTutorIds.length > 0) {
                filteredTutors = filteredTutors.filter(tutor =>
                    historyTutorIds.includes(tutor.id)
                );
            } else {
                // No search history, return empty
                filteredTutors = [];
            }
        }

        // SOPHISTICATED SORTING - Multiple sort options
        if (params.sortBy) {
            switch (params.sortBy.toLowerCase()) {
                case 'rating':
                case 'rating_desc':
                    filteredTutors.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
                    break;
                case 'rating_asc':
                    filteredTutors.sort((a, b) => parseFloat(a.rating || 0) - parseFloat(b.rating || 0));
                    break;
                case 'price':
                case 'price_asc':
                    filteredTutors.sort((a, b) => {
                        const priceA = parseFloat((a.hourly_rate || a.price || 0).toString().replace(/[^\d.]/g, ''));
                        const priceB = parseFloat((b.hourly_rate || b.price || 0).toString().replace(/[^\d.]/g, ''));
                        return priceA - priceB;
                    });
                    break;
                case 'price_desc':
                    filteredTutors.sort((a, b) => {
                        const priceA = parseFloat((a.hourly_rate || a.price || 0).toString().replace(/[^\d.]/g, ''));
                        const priceB = parseFloat((b.hourly_rate || b.price || 0).toString().replace(/[^\d.]/g, ''));
                        return priceB - priceA;
                    });
                    break;
                case 'experience':
                case 'experience_desc':
                    filteredTutors.sort((a, b) => {
                        const expA = parseInt(a.experience || a.experience_years || a.years_of_experience || 0);
                        const expB = parseInt(b.experience || b.experience_years || b.years_of_experience || 0);
                        return expB - expA;
                    });
                    break;
                case 'experience_asc':
                    filteredTutors.sort((a, b) => {
                        const expA = parseInt(a.experience || a.experience_years || a.years_of_experience || 0);
                        const expB = parseInt(b.experience || b.experience_years || b.years_of_experience || 0);
                        return expA - expB;
                    });
                    break;
                case 'name':
                case 'name_asc':
                    filteredTutors.sort((a, b) => {
                        const nameA = `${a.first_name || ''} ${a.father_name || ''}`.trim().toLowerCase();
                        const nameB = `${b.first_name || ''} ${b.father_name || ''}`.trim().toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                    break;
                case 'name_desc':
                    filteredTutors.sort((a, b) => {
                        const nameA = `${a.first_name || ''} ${a.father_name || ''}`.trim().toLowerCase();
                        const nameB = `${b.first_name || ''} ${b.father_name || ''}`.trim().toLowerCase();
                        return nameB.localeCompare(nameA);
                    });
                    break;
                case 'newest':
                    filteredTutors.sort((a, b) => (b.id || 0) - (a.id || 0));
                    break;
                case 'oldest':
                    filteredTutors.sort((a, b) => (a.id || 0) - (b.id || 0));
                    break;
                default:
                    // Default sort by rating descending
                    filteredTutors.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
            }
        } else {
            // Default sort by rating if no sort specified
            filteredTutors.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
        }

        // Pagination
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 12;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedTutors = filteredTutors.slice(startIndex, endIndex);
        const totalTutors = filteredTutors.length;
        const totalPages = Math.ceil(totalTutors / limit);

        return {
            tutors: paginatedTutors,
            total: totalTutors,
            pages: totalPages,
            current_page: page,
            per_page: limit
        };
    },

    matchesGradeLevel(searchTerm, tutor) {
        // Grade level matching logic
        const gradeKeywords = {
            'elementary': ['elementary', 'grade 1', 'grade 2', 'grade 3', 'grade 4', 'grade 5', 'grade 6', 'primary'],
            'middle': ['middle', 'grade 7', 'grade 8', 'junior'],
            'high school': ['high school', 'grade 9', 'grade 10', 'grade 11', 'grade 12', 'secondary'],
            'university': ['university', 'college', 'undergraduate', 'graduate', 'phd', 'masters'],
            'kindergarten': ['kg', 'kindergarten', 'preschool'],
            'freshman': ['freshman', 'first year'],
            'sophomore': ['sophomore', 'second year'],
            'junior': ['junior', 'third year'],
            'senior': ['senior', 'fourth year', 'gc']
        };

        // Check if search term matches any grade level keywords
        for (const [level, keywords] of Object.entries(gradeKeywords)) {
            if (keywords.some(keyword => searchTerm.includes(keyword))) {
                // Check if tutor teaches at appropriate level
                const tutorInfo = `${tutor.teachesAt} ${tutor.bio}`.toLowerCase();

                if (level === 'elementary' && (tutorInfo.includes('elementary') || tutorInfo.includes('primary'))) {
                    return true;
                }
                if (level === 'middle' && tutorInfo.includes('middle')) {
                    return true;
                }
                if (level === 'high school' && (tutorInfo.includes('high school') || tutorInfo.includes('secondary'))) {
                    return true;
                }
                if (level === 'university' && (tutorInfo.includes('university') || tutorInfo.includes('college'))) {
                    return true;
                }
                if (level === 'kindergarten' && (tutorInfo.includes('kg') || tutorInfo.includes('kindergarten'))) {
                    return true;
                }
            }
        }

        // Also check direct matches in teachesAt field
        return tutor.teachesAt.toLowerCase().includes(searchTerm);
    },

    async getTutor(tutorId) {
        return this.fetch(`/tutor/${tutorId}`);
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================

const FindTutorsState = {
    tutors: [],
    filteredTutors: [],
    currentPage: 1,
    totalPages: 1,
    totalTutors: 0,
    itemsPerPage: 12,
    loading: false,
    filters: {
        search: '',
        subject: '',
        gradeLevel: '',
        courseType: '',
        gender: '',
        sessionFormat: '',
        minRating: '',
        maxRating: '',
        minPrice: '',
        maxPrice: '',
        nearMe: '',
        favorite: '',
        saved: '',
        searchHistory: '',
        sortBy: 'rating'
    },

    updateFilter(key, value) {
        this.filters[key] = value;
        this.currentPage = 1; // Reset to first page on filter change
    },

    getDefaultSortBy() {
        // Default to 'smart' for intelligent ranking
        // Only use explicit sorting when user selects from dropdown
        return 'smart';
    },

    reset() {
        this.currentPage = 1;
        this.filters = {
            search: '',
            subject: '',
            gradeLevel: '',
            courseType: '',
            gender: '',
            sessionFormat: '',
            minRating: '',
            maxRating: '',
            minPrice: '',
            maxPrice: '',
            nearMe: '',
            favorite: '',
            saved: '',
            searchHistory: '',
            sortBy: 'smart'  // Default to smart ranking
        };
    }
};
