// ============================================
// STUDENT PROFILE API SERVICE
// Handles all API calls for student profile
// ============================================

const StudentProfileAPI = {
    baseURL: 'https://api.astegni.com',

    // Get auth token from localStorage
    getAuthToken() {
        return localStorage.getItem('token');
    },

    // Get current logged-in user
    async getCurrentUser() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    },

    // Get student profile (own profile or specific student)
    async getStudentProfile(studentId = null) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            // If studentId is provided, get that student's profile, otherwise get own profile
            const url = studentId
                ? `${this.baseURL}/api/student/${studentId}`
                : `${this.baseURL}/api/student/profile`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting student profile:', error);
            throw error;
        }
    },

    // Update student profile
    async updateStudentProfile(profileData) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/student/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating student profile:', error);
            throw error;
        }
    },

    // Upload profile picture
    async uploadProfilePicture(file) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseURL}/api/upload/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            throw error;
        }
    },

    // Upload cover photo
    async uploadCoverPhoto(file) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseURL}/api/upload/cover-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            throw error;
        }
    },

    // Get enrolled courses for My Courses panel
    async getEnrolledCourses(status = null) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            let url = `${this.baseURL}/api/student/courses`;
            if (status && status !== 'all') {
                url += `?status=${encodeURIComponent(status)}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching enrolled courses:', error);
            throw error;
        }
    }
};
