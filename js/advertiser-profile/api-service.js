// ============================================
// ADVERTISER PROFILE API SERVICE
// Handles all API calls for advertiser profile
// ============================================

const AdvertiserProfileAPI = {
    baseURL: window.API_BASE_URL || 'http://localhost:8000',

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

    // Get advertiser profile (own profile or specific advertiser)
    async getAdvertiserProfile(advertiserId = null) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                console.error('[AdvertiserProfileAPI] No auth token found');
                throw new Error('No auth token found');
            }

            // If advertiserId is provided, get that advertiser's profile, otherwise get own profile
            const url = advertiserId
                ? `${this.baseURL}/api/advertiser/${advertiserId}`
                : `${this.baseURL}/api/advertiser/profile`;

            console.log('[AdvertiserProfileAPI] Fetching profile from:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AdvertiserProfileAPI] HTTP error!', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('[AdvertiserProfileAPI] Profile data received:', data);

            // Validate required fields
            if (!data.full_name && !data.first_name) {
                console.warn('[AdvertiserProfileAPI] ⚠ Profile data missing name fields');
            }

            return data;
        } catch (error) {
            console.error('[AdvertiserProfileAPI] Error getting advertiser profile:', error);
            throw error;
        }
    },

    // Update advertiser profile
    async updateAdvertiserProfile(profileData) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/advertiser/profile`, {
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
            console.error('Error updating advertiser profile:', error);
            throw error;
        }
    },

    // Get advertiser analytics
    async getAdvertiserAnalytics() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/advertiser/analytics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting analytics:', error);
            throw error;
        }
    },

    // Get campaigns
    async getCampaigns(status = null, page = 1, limit = 20) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            let url = `${this.baseURL}/api/advertiser/campaigns?page=${page}&limit=${limit}`;
            if (status && status !== 'all') {
                url += `&status=${status}`;
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
            console.error('Error getting campaigns:', error);
            throw error;
        }
    },

    // Create campaign
    async createCampaign(campaignData) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/advertiser/campaigns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(campaignData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating campaign:', error);
            throw error;
        }
    },

    // Update campaign
    async updateCampaign(campaignId, campaignData) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/advertiser/campaigns/${campaignId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(campaignData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating campaign:', error);
            throw error;
        }
    },

    // Delete campaign
    async deleteCampaign(campaignId) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/advertiser/campaigns/${campaignId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting campaign:', error);
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

            // Backend endpoint is /api/upload/cover-image (not cover-photo)
            const response = await fetch(`${this.baseURL}/api/upload/cover-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            throw error;
        }
    },

    // Upload campaign media (image or video) with organized folder structure
    async uploadCampaignMedia(file, brandName, campaignName, adPlacement, campaignId = null, brandId = null) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('brand_name', brandName);
            formData.append('campaign_name', campaignName);
            formData.append('ad_placement', adPlacement);

            // Add campaign_id and brand_id if provided
            if (campaignId) {
                formData.append('campaign_id', campaignId);
            }
            if (brandId) {
                formData.append('brand_id', brandId);
            }

            const response = await fetch(`${this.baseURL}/api/upload/campaign-media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading campaign media:', error);
            throw error;
        }
    },

    // Get campaign media (images and videos)
    async getCampaignMedia(campaignId, mediaType = null, placement = null) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            let url = `${this.baseURL}/api/campaign/${campaignId}/media`;
            const params = new URLSearchParams();

            if (mediaType) {
                params.append('media_type', mediaType);
            }
            if (placement) {
                params.append('placement', placement);
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching campaign media:', error);
            throw error;
        }
    },

    // Delete campaign media
    async deleteCampaignMedia(mediaId) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/campaign/media/${mediaId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting campaign media:', error);
            throw error;
        }
    },

    // Get connections count
    async getConnectionsCount() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${this.baseURL}/api/connections?role=advertiser`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.warn('Connections API returned error, using fallback count of 0');
                return { count: 0 };
            }

            const data = await response.json();
            return { count: Array.isArray(data) ? data.length : 0 };
        } catch (error) {
            console.error('Error getting connections count:', error);
            return { count: 0 }; // Fallback
        }
    }
};
