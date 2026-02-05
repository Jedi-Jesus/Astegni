/**
 * Admin Credentials Manager
 * Handles credential management (achievements and experience) for admin pages
 * Writes to admin_credentials table in astegni_admin_db
 */

(function() {
    'use strict';

    // Use global API_BASE_URL set by api-config.js
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
    let currentCredentials = [];
    let currentAdminId = null;

    /**
     * Initialize the credentials manager
     */
    function initCredentialsManager() {
        // Get admin ID from page context
        currentAdminId = getAdminIdFromPage();
        console.log('Credentials Manager initialized for admin:', currentAdminId);
    }

    /**
     * Get admin ID from page/authentication
     * Uses global auth helpers if available
     */
    function getAdminIdFromPage() {
        // Use global getCurrentAdminId if available (from auth-helpers.js)
        if (typeof window.getCurrentAdminId === 'function') {
            const adminId = window.getCurrentAdminId();
            if (adminId) {
                return adminId;
            }
        }

        // Fallback: Check if authManager has current user
        if (typeof authManager !== 'undefined' && authManager && authManager.getCurrentUser) {
            const user = authManager.getCurrentUser();
            if (user && user.id) {
                return user.id;
            }
        }

        // Fallback: Check localStorage for currentUser
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.id) {
                    return user.id;
                }
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }

        // Fallback: Try to decode JWT token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                if (payload.sub || payload.user_id || payload.id || payload.admin_id) {
                    return payload.sub || payload.user_id || payload.id || payload.admin_id;
                }
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        // Fallback for testing
        console.warn('Could not find admin ID, using test ID');
        return 1;
    }

    /**
     * Get the current admin's role/department from page context
     */
    function getAdminRole() {
        // Try to detect from page URL or title
        const path = window.location.pathname.toLowerCase();
        if (path.includes('courses')) return 'courses_admin';
        if (path.includes('campaigns')) return 'campaigns_admin';
        if (path.includes('contents')) return 'contents_admin';
        if (path.includes('customers')) return 'customers_admin';
        if (path.includes('schools')) return 'schools_admin';
        if (path.includes('system-settings')) return 'system_settings_admin';
        if (path.includes('tutor')) return 'tutors_admin';
        return 'admin';
    }

    /**
     * Open Add Credential Modal
     */
    window.openAddCredentialModal = function() {
        const modal = document.getElementById('add-credential-modal');
        if (!modal) {
            console.error('Add credential modal not found');
            return;
        }

        // Reset form
        const form = document.getElementById('addCredentialForm');
        if (form) {
            form.reset();
        }

        // Set default date to today
        const dateInput = document.getElementById('credentialDateOfIssue');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        console.log('Add credential modal opened');
    };

    /**
     * Close Add Credential Modal
     */
    window.closeAddCredentialModal = function() {
        const modal = document.getElementById('add-credential-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    };

    /**
     * Handle credential form submission
     */
    window.handleCredentialSubmit = async function(event) {
        event.preventDefault();

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        submitBtn.disabled = true;

        try {
            // Gather form data
            const credentialData = {
                uploader_id: currentAdminId || getAdminIdFromPage(),
                uploader_role: getAdminRole(),
                document_type: document.getElementById('credentialType').value,
                title: document.getElementById('credentialTitle').value.trim(),
                description: document.getElementById('credentialDescription').value.trim(),
                issued_by: document.getElementById('credentialIssuedBy').value.trim(),
                date_of_issue: document.getElementById('credentialDateOfIssue').value || null,
                expiry_date: document.getElementById('credentialExpiryDate').value || null,
                document_url: null, // File upload handled separately
                file_name: null,
                file_type: null,
                file_size: null
            };

            // Handle file upload if present
            const fileInput = document.getElementById('credentialDocument');
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                credentialData.file_name = file.name;
                credentialData.file_type = file.type;
                credentialData.file_size = file.size;
                // TODO: Upload to Backblaze B2 and get URL
                // For now, just store file info
            }

            // Validate required fields
            if (!credentialData.title) {
                showNotification('Please enter a credential title', 'error');
                return;
            }
            if (!credentialData.document_type) {
                showNotification('Please select a credential type', 'error');
                return;
            }

            console.log('Submitting credential:', credentialData);

            // Send to API
            const response = await fetch(`${API_BASE_URL}/api/admin-db/credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentialData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to save credential');
            }

            const savedCredential = await response.json();
            console.log('Credential saved:', savedCredential);

            // Close modal
            closeAddCredentialModal();

            // Show success notification
            showNotification('Credential added successfully!', 'success');

            // Refresh credentials list if function exists
            if (typeof window.loadCredentials === 'function') {
                window.loadCredentials();
            }

        } catch (error) {
            console.error('Error saving credential:', error);
            showNotification(error.message || 'Error saving credential. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    };

    /**
     * Load credentials for the current admin
     */
    window.loadCredentials = async function() {
        const adminId = currentAdminId || getAdminIdFromPage();

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/credentials?admin_id=${adminId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch credentials');
            }

            currentCredentials = await response.json();
            console.log('Loaded credentials:', currentCredentials);

            // Update UI if display function exists
            if (typeof window.displayCredentials === 'function') {
                window.displayCredentials(currentCredentials);
            }

            return currentCredentials;
        } catch (error) {
            console.error('Error loading credentials:', error);
            return [];
        }
    };

    /**
     * Show notification message
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
                       type === 'error' ? 'bg-red-500' :
                       type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${bgColor} text-white transition-all duration-300`;
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Preview uploaded document
     */
    window.previewCredentialDocument = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const preview = document.getElementById('credentialDocumentPreview');
        const previewName = document.getElementById('credentialDocumentName');
        const previewSize = document.getElementById('credentialDocumentSize');

        if (preview && previewName && previewSize) {
            previewName.textContent = file.name;
            previewSize.textContent = formatFileSize(file.size);
            preview.classList.remove('hidden');
        }
    };

    /**
     * Format file size for display
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Remove selected document
     */
    window.removeCredentialDocument = function() {
        const fileInput = document.getElementById('credentialDocument');
        const preview = document.getElementById('credentialDocumentPreview');

        if (fileInput) {
            fileInput.value = '';
        }
        if (preview) {
            preview.classList.add('hidden');
        }
    };

    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAddCredentialModal();
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCredentialsManager);
    } else {
        initCredentialsManager();
    }

    console.log('Admin Credentials Manager loaded');

})();
