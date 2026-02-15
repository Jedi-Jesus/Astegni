/**
 * Storage Manager
 * Handles storage quota validation and usage tracking
 */

const StorageManager = {
    /**
     * API base URL
     */
    baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'
        : 'https://api.astegni.com',

    /**
     * Get auth headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`
        };
    },

    /**
     * Get user's storage usage
     * @returns {Promise<Object>} Storage usage data
     */
    async getStorageUsage() {
        try {
            const response = await fetch(`${this.baseURL}/api/storage/usage`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch storage usage');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching storage usage:', error);
            throw error;
        }
    },

    /**
     * Validate file before upload
     * @param {number} fileSizeMB - File size in megabytes
     * @param {string} fileType - File type ('image', 'video', 'document', 'audio')
     * @returns {Promise<Object>} Validation result
     */
    async validateFileUpload(fileSizeMB, fileType) {
        try {
            const response = await fetch(`${this.baseURL}/api/storage/validate?file_size_mb=${fileSizeMB}&file_type=${fileType}`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to validate file upload');
            }

            return await response.json();
        } catch (error) {
            console.error('Error validating file upload:', error);
            throw error;
        }
    },

    /**
     * Get storage limits for current user
     * @returns {Promise<Object>} Storage limits
     */
    async getStorageLimits() {
        try {
            const response = await fetch(`${this.baseURL}/api/storage/limits`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch storage limits');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching storage limits:', error);
            throw error;
        }
    },

    /**
     * Get storage breakdown by media type
     * @returns {Promise<Object>} Storage breakdown
     */
    async getStorageBreakdown() {
        try {
            const response = await fetch(`${this.baseURL}/api/storage/breakdown`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch storage breakdown');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching storage breakdown:', error);
            throw error;
        }
    },

    /**
     * Validate file before upload (client-side)
     * @param {File} file - File object
     * @param {string} fileType - File type ('image', 'video', 'document', 'audio')
     * @returns {Promise<{isAllowed: boolean, message: string}>}
     */
    async validateFile(file, fileType) {
        // Convert file size to MB
        const fileSizeMB = file.size / (1024 * 1024);

        console.log(`🔍 Validating ${fileType} upload:`, {
            fileName: file.name,
            fileSizeMB: fileSizeMB.toFixed(2),
            fileType: fileType
        });

        try {
            // Call backend validation API
            const result = await this.validateFileUpload(fileSizeMB, fileType);

            if (!result.is_allowed) {
                console.warn('❌ Upload not allowed:', result.error_message);
                return {
                    isAllowed: false,
                    message: result.error_message,
                    remainingMB: result.remaining_storage_mb,
                    usagePercentage: result.usage_percentage
                };
            }

            console.log('✅ Upload allowed', {
                remainingMB: result.remaining_storage_mb,
                usagePercentage: result.usage_percentage
            });

            return {
                isAllowed: true,
                message: 'Upload allowed',
                remainingMB: result.remaining_storage_mb,
                usagePercentage: result.usage_percentage
            };
        } catch (error) {
            console.error('Error validating file:', error);
            // In case of error, allow upload (fail-open)
            return {
                isAllowed: true,
                message: 'Validation unavailable, proceeding with upload',
                error: error.message
            };
        }
    },

    /**
     * Show storage usage indicator in UI
     * @param {string} containerId - ID of container element
     */
    async showStorageIndicator(containerId) {
        try {
            const data = await this.getStorageUsage();
            const container = document.getElementById(containerId);

            if (!container) {
                console.warn(`Container #${containerId} not found`);
                return;
            }

            const usagePercentage = data.summary.usage_percentage;
            const usedGB = data.summary.total_used_gb;
            const limitGB = data.summary.storage_limit_gb;

            // Determine color based on usage
            let barColor = '#10b981'; // Green
            if (usagePercentage > 80) {
                barColor = '#ef4444'; // Red
            } else if (usagePercentage > 60) {
                barColor = '#f59e0b'; // Orange
            }

            container.innerHTML = `
                <div style="padding: 1rem; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">
                            💾 Storage Usage
                        </span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">
                            ${usedGB} GB / ${limitGB} GB
                        </span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${usagePercentage}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
                    </div>
                    <p style="margin: 0.5rem 0 0; font-size: 0.75rem; color: var(--text-muted);">
                        ${data.summary.remaining_gb} GB remaining (${usagePercentage.toFixed(1)}% used)
                    </p>
                </div>
            `;
        } catch (error) {
            console.error('Error showing storage indicator:', error);
        }
    },

    /**
     * Show storage error notification
     * @param {string} message - Error message
     */
    showStorageError(message) {
        // Check if notification function exists
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else if (typeof TutorProfileUI !== 'undefined' && typeof TutorProfileUI.showNotification === 'function') {
            TutorProfileUI.showNotification(message, 'error');
        } else {
            alert(message);
        }
    },

    /**
     * Format bytes to human-readable size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size (e.g., "2.5 MB")
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Make globally accessible
window.StorageManager = StorageManager;

console.log('✅ Storage Manager loaded');
