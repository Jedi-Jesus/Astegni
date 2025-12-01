// ============================================
// TUTOR PROFILE API SERVICE
// Handles all API calls for tutor profile
// ============================================

const TutorProfileAPI = {
    baseURL: 'https://api.astegni.com',

    // Helper method to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    // Authentication
    async getCurrentUser() {
        try {
            // Use AuthManager's authenticatedFetch for automatic token refresh
            const response = await window.AuthManager.authenticatedFetch(`${this.baseURL}/api/me`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching current user:', error);
            return null;
        }
    },

    // Get tutor profile
    async getTutorProfile() {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/profile`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                // Log detailed error information
                const errorText = await response.text();
                console.error('Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                if (response.status === 404) {
                    console.warn('Tutor profile not found - may need to be created');
                    return null; // No profile exists yet
                }
                if (response.status === 403) {
                    console.error('User is not authorized as a tutor');
                    return null;
                }
                if (response.status === 422) {
                    console.error('Validation error or missing authentication token');
                    return null;
                }
                throw new Error(`Failed to fetch tutor profile: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching tutor profile:', error);
            return null;
        }
    },

    // Update tutor profile
    async updateTutorProfile(profileData) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/profile`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                throw new Error('Failed to update tutor profile');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating tutor profile:', error);
            throw error;
        }
    },

    // Get tutor's videos
    async getTutorVideos() {
        try {
            const response = await fetch(`${this.baseURL}/api/videos?tutor=me`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch videos');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching videos:', error);
            return [];
        }
    },

    // Get tutor's blog posts
    async getBlogPosts(filter = 'all') {
        try {
            const response = await fetch(`${this.baseURL}/api/blog/posts?author=me&filter=${filter}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch blog posts');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching blog posts:', error);
            return [];
        }
    },

    // Create blog post
    async createBlogPost(blogData) {
        try {
            const response = await fetch(`${this.baseURL}/api/blog/posts`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(blogData)
            });

            if (!response.ok) {
                throw new Error('Failed to create blog post');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating blog post:', error);
            throw error;
        }
    },

    // Upload profile picture
    async uploadProfilePicture(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseURL}/api/upload/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload profile picture');
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
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseURL}/api/upload/cover-image`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload cover photo');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            throw error;
        }
    },

    // Upload video
    async uploadVideo(formData) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseURL}/api/upload/video`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload video');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading video:', error);
            throw error;
        }
    },

    // Get connections/students
    async getConnections(filter = 'all') {
        try {
            const response = await fetch(`${this.baseURL}/api/connections?filter=${filter}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch connections');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching connections:', error);
            return [];
        }
    },

    // Get session requests
    async getSessionRequests() {
        try {
            const response = await fetch(`${this.baseURL}/api/sessions/requests`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch session requests');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching session requests:', error);
            return [];
        }
    },

    // Get confirmed students
    async getConfirmedStudents() {
        try {
            const response = await fetch(`${this.baseURL}/api/students/confirmed`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch confirmed students');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching confirmed students:', error);
            return [];
        }
    },

    // Get playlists
    async getPlaylists() {
        try {
            const response = await fetch(`${this.baseURL}/api/playlists?author=me`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch playlists');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching playlists:', error);
            return [];
        }
    },

    // ============================================
    // NEW ENDPOINTS FOR ENHANCED TUTOR PROFILE
    // ============================================

    // Get complete tutor profile with all data
    async getCompleteTutorProfile(tutorId) {
        try {
            // If no tutorId, get current user's profile
            if (!tutorId) {
                return await this.getTutorProfile();
            }

            const response = await fetch(`${this.baseURL}/api/tutor/${tutorId}/profile-complete`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch complete tutor profile');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching complete tutor profile:', error);
            return null;
        }
    },

    // Get tutor reviews
    async getTutorReviews(tutorId, limit = 10, offset = 0) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/${tutorId}/reviews?limit=${limit}&offset=${offset}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tutor reviews');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching tutor reviews:', error);
            return [];
        }
    },

    // Get tutor activities
    async getTutorActivities(tutorId, limit = 20, offset = 0) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/${tutorId}/activities?limit=${limit}&offset=${offset}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tutor activities');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching tutor activities:', error);
            return [];
        }
    },

    // Get tutor schedule
    async getTutorSchedule(tutorId) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/${tutorId}/schedule`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tutor schedule');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching tutor schedule:', error);
            return [];
        }
    },

    // Get today's schedule
    async getTodaySchedule(tutorId) {
        try {
            // If no tutorId provided, get from current user's profile
            if (!tutorId) {
                const profile = await this.getTutorProfile();
                if (!profile || !profile.id) {
                    return [];
                }
                tutorId = profile.id;
            }

            const response = await fetch(`${this.baseURL}/api/tutor/${tutorId}/schedule`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch today schedule');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching today schedule:', error);
            return [];
        }
    },

    // Get dashboard stats (authenticated tutor only)
    async getDashboardStats() {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/dashboard/stats`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return null;
        }
    },

    // Update tutor profile (extended version with hero section)
    async updateTutorProfileExtended(profileData) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/profile`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                throw new Error('Failed to update tutor profile');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating tutor profile:', error);
            throw error;
        }
    },

    // Upload story (image or video)
    async uploadStory(file, caption = '') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (caption) {
                formData.append('caption', caption);
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseURL}/api/upload/story`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Story upload error:', errorText);
                throw new Error('Failed to upload story');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading story:', error);
            throw error;
        }
    },

    // Get tutor stories
    async getTutorStories(limit = 20, offset = 0) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/stories?limit=${limit}&offset=${offset}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tutor stories');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching tutor stories:', error);
            return [];
        }
    },

    // Delete story
    async deleteStory(storyId) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/stories/${storyId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete story');
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting story:', error);
            throw error;
        }
    },

    // ============================================
    // PACKAGE MANAGEMENT API ENDPOINTS
    // ============================================

    // Get all packages for current tutor
    async getPackages() {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/packages`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch packages');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching packages:', error);
            return [];
        }
    },

    // Create a new package
    async createPackage(packageData) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/packages`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(packageData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Package creation error:', errorText);
                throw new Error('Failed to create package');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating package:', error);
            throw error;
        }
    },

    // Update an existing package
    async updatePackage(packageId, packageData) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/packages/${packageId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(packageData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Package update error:', errorText);
                throw new Error('Failed to update package');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating package:', error);
            throw error;
        }
    },

    // Delete a package
    async deletePackage(packageId) {
        try {
            const response = await fetch(`${this.baseURL}/api/tutor/packages/${packageId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete package');
            }

            return true;
        } catch (error) {
            console.error('Error deleting package:', error);
            throw error;
        }
    }
};
