// school-api.js - API functions for school management
// Uses /api/admin/schools/* endpoints which read from astegni_user_db.schools table

// Use existing API_BASE_URL if already defined (e.g., from auth.js), otherwise auto-detect
const SCHOOL_API_BASE = (typeof API_BASE_URL !== 'undefined')
    ? API_BASE_URL
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'
        : 'https://api.astegni.com');

class SchoolAPI {
    /**
     * Get authorization headers
     */
    static getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    /**
     * Get all pending schools (status = 'pending')
     */
    static async getRequestedSchools() {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/pending`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch pending schools');
            return await response.json();
        } catch (error) {
            console.error('Error fetching pending schools:', error);
            throw error;
        }
    }

    /**
     * Get all verified schools (status = 'verified')
     */
    static async getVerifiedSchools() {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/verified`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch verified schools');
            return await response.json();
        } catch (error) {
            console.error('Error fetching verified schools:', error);
            throw error;
        }
    }

    /**
     * Get all rejected schools (status = 'rejected')
     */
    static async getRejectedSchools() {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/rejected`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch rejected schools');
            return await response.json();
        } catch (error) {
            console.error('Error fetching rejected schools:', error);
            throw error;
        }
    }

    /**
     * Get all suspended schools (status = 'suspended')
     */
    static async getSuspendedSchools() {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/suspended`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch suspended schools');
            return await response.json();
        } catch (error) {
            console.error('Error fetching suspended schools:', error);
            throw error;
        }
    }

    /**
     * Get school statistics
     */
    static async getSchoolStats() {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/stats`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch school stats');
            return await response.json();
        } catch (error) {
            console.error('Error fetching school stats:', error);
            throw error;
        }
    }

    /**
     * Get a specific school by ID
     */
    static async getSchool(schoolId) {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/${schoolId}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch school');
            return await response.json();
        } catch (error) {
            console.error('Error fetching school:', error);
            throw error;
        }
    }

    /**
     * Approve a pending school (change status to verified)
     */
    static async approveSchool(schoolId) {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/${schoolId}/approve`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to approve school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error approving school:', error);
            throw error;
        }
    }

    /**
     * Reject a school (change status to rejected)
     */
    static async rejectSchool(schoolId, reason) {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/${schoolId}/reject`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ reason })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to reject school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error rejecting school:', error);
            throw error;
        }
    }

    /**
     * Suspend a verified school
     */
    static async suspendSchool(schoolId, reason) {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/${schoolId}/suspend`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ reason })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to suspend school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error suspending school:', error);
            throw error;
        }
    }

    /**
     * Reinstate a suspended school back to verified
     */
    static async reinstateSchool(schoolId) {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/${schoolId}/reinstate`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to reinstate school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error reinstating school:', error);
            throw error;
        }
    }

    /**
     * Reconsider a rejected school (move back to pending)
     */
    static async reconsiderSchool(schoolId) {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/${schoolId}/reconsider`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to reconsider school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error reconsidering school:', error);
            throw error;
        }
    }

    /**
     * Delete a school permanently
     */
    static async deleteSchool(schoolId) {
        try {
            const response = await fetch(`${SCHOOL_API_BASE}/api/admin/schools/${schoolId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting school:', error);
            throw error;
        }
    }

    /**
     * Get admin reviews from admin_db
     */
    static async getAdminReviews(adminId = null, limit = 5) {
        try {
            let url = `${SCHOOL_API_BASE}/api/admin/schools/reviews/recent?limit=${limit}`;
            if (adminId) {
                url += `&admin_id=${adminId}`;
            }
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch admin reviews');
            return await response.json();
        } catch (error) {
            console.error('Error fetching admin reviews:', error);
            throw error;
        }
    }
}

// Export for use in other files
window.SchoolAPI = SchoolAPI;
