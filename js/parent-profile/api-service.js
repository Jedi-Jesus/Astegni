// ============================================
// PARENT PROFILE API SERVICE
// Handles all API calls for parent profile
// ============================================

const ParentProfileAPI = {
    baseURL: 'http://localhost:8000',

    // Get auth token from localStorage
    getAuthToken() {
        // Check both 'token' and 'access_token' for compatibility
        return localStorage.getItem('token') || localStorage.getItem('access_token');
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

    // Get parent profile (own profile)
    async getParentProfile() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/parent/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const parentProfile = await response.json();

            // Also get user info for name, email, phone
            const userResponse = await fetch(`${this.baseURL}/api/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                // Merge user data with parent profile
                parentProfile.first_name = userData.first_name;
                parentProfile.father_name = userData.father_name;
                parentProfile.grandfather_name = userData.grandfather_name;
                parentProfile.email = userData.email;
                parentProfile.phone = userData.phone;
                parentProfile.gender = userData.gender;
                parentProfile.name = `${userData.first_name || ''} ${userData.father_name || ''} ${userData.grandfather_name || ''}`.trim();
            }

            return parentProfile;
        } catch (error) {
            console.error('Error getting parent profile:', error);
            throw error;
        }
    },

    // Get parent by ID (public view)
    async getParentById(parentId, byUserId = false) {
        try {
            const url = byUserId
                ? `${this.baseURL}/api/parent/${parentId}?by_user_id=true`
                : `${this.baseURL}/api/parent/${parentId}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting parent by ID:', error);
            throw error;
        }
    },

    // Update parent profile
    async updateParentProfile(profileData) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/parent/profile`, {
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
            console.error('Error updating parent profile:', error);
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

    // Get children
    async getChildren() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/parent/children`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting children:', error);
            throw error;
        }
    },

    // Get co-parents
    async getCoparents() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/parent/coparents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting co-parents:', error);
            throw error;
        }
    },

    // Get parent reviews
    async getParentReviews(parentId, skip = 0, limit = 20) {
        try {
            const response = await fetch(`${this.baseURL}/api/parent/${parentId}/reviews?skip=${skip}&limit=${limit}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting parent reviews:', error);
            throw error;
        }
    },

    // Get parent review stats
    async getParentReviewStats(parentId) {
        try {
            const response = await fetch(`${this.baseURL}/api/parent/reviews/stats/${parentId}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting parent review stats:', error);
            throw error;
        }
    },

    // Get tutors for parent's children (from enrolled_students)
    async getTutors() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/parent/tutors`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting tutors:', error);
            throw error;
        }
    },

    // Get connection stats (connections and requests count)
    async getConnectionStats() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            // Get active role from JWT token (e.g., 'parent')
            let activeRole = 'parent';
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                activeRole = payload.role || 'parent';
            } catch (e) {
                console.warn('Could not parse role from token, defaulting to parent');
            }

            // Pass role parameter to filter stats by profile_id instead of user_id
            const response = await fetch(`${this.baseURL}/api/connections/stats?role=${activeRole}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting connection stats:', error);
            throw error;
        }
    }
};

// Make it available globally
window.ParentProfileAPI = ParentProfileAPI;
