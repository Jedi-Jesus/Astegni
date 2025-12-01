// school-api.js - API functions for school management

const API_BASE_URL = 'https://api.astegni.com';

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
     * Get all requested schools
     */
    static async getRequestedSchools() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/requested`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch requested schools');
            return await response.json();
        } catch (error) {
            console.error('Error fetching requested schools:', error);
            throw error;
        }
    }

    /**
     * Get all verified schools
     */
    static async getVerifiedSchools() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/verified`, {
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
     * Get all rejected schools
     */
    static async getRejectedSchools() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/rejected`, {
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
     * Get all suspended schools
     */
    static async getSuspendedSchools() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/suspended`, {
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
     * Get a specific school by ID and table
     */
    static async getSchool(schoolId, table) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/${table}/${schoolId}`, {
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
     * Create a new school request
     */
    static async createSchoolRequest(schoolData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/request`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(schoolData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create school request');
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating school request:', error);
            throw error;
        }
    }

    /**
     * Approve a school request
     */
    static async approveSchool(requestId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/approve/${requestId}`, {
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
     * Reject a school request
     */
    static async rejectSchool(requestId, reason) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/reject/${requestId}`, {
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
     * Reject a verified school (move from verified to rejected)
     */
    static async rejectVerifiedSchool(schoolId, reason) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/reject-verified/${schoolId}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ reason })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to reject verified school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error rejecting verified school:', error);
            throw error;
        }
    }

    /**
     * Update a verified school
     */
    static async updateSchool(schoolId, updateData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/verified/${schoolId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating school:', error);
            throw error;
        }
    }

    /**
     * Suspend a verified school
     */
    static async suspendSchool(schoolId, reason) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/suspend/${schoolId}`, {
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
     * Reconsider a verified school (move back to requested)
     */
    static async reconsiderVerifiedSchool(schoolId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/reconsider-verified/${schoolId}`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to reconsider verified school');
            }
            return await response.json();
        } catch (error) {
            console.error('Error reconsidering verified school:', error);
            throw error;
        }
    }

    /**
     * Reconsider a rejected school
     */
    static async reconsiderSchool(rejectedId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/reconsider/${rejectedId}`, {
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
     * Reinstate a suspended school
     */
    static async reinstateSchool(suspendedId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/reinstate/${suspendedId}`, {
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
     * Delete a school permanently
     */
    static async deleteSchool(schoolId, table) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/${schoolId}?table=${table}`, {
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
}

// Export for use in other files
window.SchoolAPI = SchoolAPI;
