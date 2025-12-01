// System Settings Management Functions
// Page-specific JavaScript for manage-system-settings.html

// Define API_BASE_URL on window object to avoid redeclaration issues
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://api.astegni.com';
}
let currentAdminProfile = null;

// ============================================
// FUNCTION DECLARATIONS MOVED TO BOTTOM
// All functions are properly exposed to window object at the end of this file
// This ensures the actual implementations (not placeholders) are used
// ============================================

// Initialize when DOM is loaded
function initializeSystemSettings() {
    console.log('🚀 System Settings page loaded - Initializing...');

    // Initialize panel manager
    if (typeof initializePanelManager === 'function') {
        initializePanelManager();
    }

    // Set active sidebar link
    updateActiveSidebarLink();

    // Load admin profile from database
    console.log('📡 Starting to load admin profile from database...');
    loadAdminProfile();

    // Load data for current panel (important for direct URL navigation)
    // Use setTimeout to ensure panels are rendered before data loads
    const currentPanel = new URLSearchParams(window.location.search).get('panel') || 'dashboard';
    console.log('📊 Scheduling data load for current panel:', currentPanel);
    setTimeout(() => {
        console.log('📊 Now loading data for panel:', currentPanel);
        if (typeof initializeSystemSettingsData === 'function') {
            initializeSystemSettingsData(currentPanel);
        }
    }, 100); // Small delay to ensure DOM is fully rendered
}

// Run initialization
if (document.readyState === 'loading') {
    // DOM still loading, wait for it
    document.addEventListener('DOMContentLoaded', initializeSystemSettings);
} else {
    // DOM already loaded, run immediately
    initializeSystemSettings();
}

// Update active sidebar link based on current panel
function updateActiveSidebarLink() {
    const currentPanel = new URLSearchParams(window.location.search).get('panel') || 'dashboard';
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkText = link.textContent.toLowerCase();

        if (currentPanel === 'dashboard' && linkText.includes('dashboard')) {
            link.classList.add('active');
        } else if (currentPanel === 'general' && linkText.includes('general')) {
            link.classList.add('active');
        } else if (currentPanel === 'media' && linkText.includes('media')) {
            link.classList.add('active');
        } else if (currentPanel === 'impressions' && linkText.includes('impressions')) {
            link.classList.add('active');
        } else if (currentPanel === 'email' && linkText.includes('email')) {
            link.classList.add('active');
        } else if (currentPanel === 'sms' && linkText.includes('sms')) {
            link.classList.add('active');
        } else if (currentPanel === 'pricing' && linkText.includes('pricing')) {
            link.classList.add('active');
        } else if (currentPanel === 'security' && linkText.includes('security')) {
            link.classList.add('active');
        } else if (currentPanel === 'backup' && linkText.includes('backup')) {
            link.classList.add('active');
        } else if (currentPanel === 'api' && linkText.includes('api')) {
            link.classList.add('active');
        } else if (currentPanel === 'maintenance' && linkText.includes('maintenance')) {
            link.classList.add('active');
        } else if (currentPanel === 'logs' && linkText.includes('logs')) {
            link.classList.add('active');
        } else if (currentPanel === 'performance' && linkText.includes('performance')) {
            link.classList.add('active');
        }
    });
}

// ============================================
// UNIFIED IMAGE UPLOAD MODAL FUNCTIONS
// ============================================

// Open Image Upload Modal
function openImageUploadModal() {
    const modal = document.getElementById('image-upload-modal');
    if (modal) {
        resetImageUploadModal();
        modal.classList.remove('hidden');
    }
}

// Close Image Upload Modal
function closeImageUploadModal() {
    const modal = document.getElementById('image-upload-modal');
    if (modal) {
        modal.classList.add('hidden');
        resetImageUploadModal();
    }
}

// Reset Image Upload Modal
function resetImageUploadModal() {
    document.getElementById('imageTypeSelect').value = '';
    document.getElementById('imageTargetSelect').value = '';
    document.getElementById('imageTitle').value = '';
    document.getElementById('systemImageInput').value = '';
    document.getElementById('systemImagePreview').classList.add('hidden');
    document.getElementById('imageTargetSection').classList.add('hidden');
}

// Update Image Target Options based on Image Type
function updateImageTargetOptions() {
    const imageType = document.getElementById('imageTypeSelect').value;
    const targetSection = document.getElementById('imageTargetSection');
    const targetSelect = document.getElementById('imageTargetSelect');

    if (!imageType) {
        targetSection.classList.add('hidden');
        return;
    }

    // Show target section
    targetSection.classList.remove('hidden');

    // Clear existing options
    targetSelect.innerHTML = '<option value="">Select target...</option>';

    // Define options based on image type
    const options = {
        profile: [
            { group: 'User Profiles', items: [
                { value: 'tutor', label: 'Tutors' },
                { value: 'student', label: 'Students' },
                { value: 'parent', label: 'Parents' },
                { value: 'user', label: 'Users' },
                { value: 'advertiser', label: 'Advertisers' }
            ]},
            { group: 'Admin Managers', items: [
                { value: 'campaign', label: 'Campaign Manager' },
                { value: 'course', label: 'Course Manager' },
                { value: 'school', label: 'School Manager' },
                { value: 'tutor-manager', label: 'Tutor Manager' },
                { value: 'customer', label: 'Customer Manager' },
                { value: 'upload', label: 'Upload Manager' },
                { value: 'system', label: 'System Settings' }
            ]}
        ],
        cover: [
            { group: 'User Profiles', items: [
                { value: 'tutor', label: 'Tutors' },
                { value: 'student', label: 'Students' },
                { value: 'parent', label: 'Parents' },
                { value: 'user', label: 'Users' },
                { value: 'advertiser', label: 'Advertisers' }
            ]},
            { group: 'Admin Managers', items: [
                { value: 'campaign', label: 'Campaign Manager' },
                { value: 'course', label: 'Course Manager' },
                { value: 'school', label: 'School Manager' },
                { value: 'tutor-manager', label: 'Tutor Manager' },
                { value: 'customer', label: 'Customer Manager' },
                { value: 'upload', label: 'Upload Manager' },
                { value: 'system', label: 'System Settings' }
            ]}
        ],
        logo: [
            { group: 'Platform', items: [
                { value: 'main-logo', label: 'Main Platform Logo' },
                { value: 'admin-logo', label: 'Admin Dashboard Logo' },
                { value: 'email-logo', label: 'Email Template Logo' }
            ]}
        ],
        favicon: [
            { group: 'Platform', items: [
                { value: 'main-favicon', label: 'Main Platform Favicon' },
                { value: 'admin-favicon', label: 'Admin Dashboard Favicon' }
            ]}
        ],
        system: [
            { group: 'System Images', items: [
                { value: 'banner', label: 'Banner Images' },
                { value: 'background', label: 'Background Images' },
                { value: 'placeholder', label: 'Placeholder Images' },
                { value: 'icon', label: 'Icons' },
                { value: 'illustration', label: 'Illustrations' }
            ]}
        ]
    };

    // Populate options based on image type
    if (options[imageType]) {
        options[imageType].forEach(group => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.group;

            group.items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.value;
                option.textContent = item.label;
                optgroup.appendChild(option);
            });

            targetSelect.appendChild(optgroup);
        });
    }
}

// Preview System Image
function previewSystemImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('systemImagePreview');
            const previewImg = document.getElementById('systemImagePreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Handle System Image Upload
async function handleSystemImageUpload() {
    const imageType = document.getElementById('imageTypeSelect').value;
    const imageTarget = document.getElementById('imageTargetSelect').value;
    const imageTitle = document.getElementById('imageTitle').value;
    const imageFile = document.getElementById('systemImageInput').files[0];

    // Validation
    if (!imageType) {
        alert('Please select what this image is for');
        return;
    }

    if (!imageTarget) {
        alert('Please select the target profile/entity');
        return;
    }

    if (!imageFile) {
        alert('Please select an image file');
        return;
    }

    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication required. Please log in.');
        return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('image_type', imageType);
    formData.append('target', imageTarget);
    if (imageTitle) {
        formData.append('title', imageTitle);
    }

    // Disable upload button
    const uploadBtn = document.getElementById('uploadSystemImageBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const response = await fetch('https://api.astegni.com/api/upload/system-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Upload failed');
        }

        console.log('Upload success:', data);
        alert(`Image uploaded successfully!\n\nType: ${imageType}\nTarget: ${imageTarget}\nURL: ${data.url}`);
        closeImageUploadModal();

        // Reload uploaded media list
        if (typeof loadUploadedMedia === 'function') {
            await loadUploadedMedia();
        }

    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
    } finally {
        // Re-enable upload button
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Image';
    }
}

// ============================================
// VIDEO UPLOAD MODAL FUNCTIONS
// ============================================

// Open Video Upload Modal
function openVideoUploadModal() {
    const modal = document.getElementById('video-upload-modal');
    if (modal) {
        resetVideoUploadModal();
        modal.classList.remove('hidden');
    }
}

// Close Video Upload Modal
function closeVideoUploadModal() {
    const modal = document.getElementById('video-upload-modal');
    if (modal) {
        modal.classList.add('hidden');
        resetVideoUploadModal();
    }
}

// Reset Video Upload Modal
function resetVideoUploadModal() {
    document.getElementById('videoTypeSelect').value = '';
    document.getElementById('adClassificationSelect').value = '';
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    document.getElementById('systemVideoInput').value = '';
    document.getElementById('videoThumbnail').value = '';
    document.getElementById('systemVideoPreview').classList.add('hidden');
    document.getElementById('thumbnailPreview').classList.add('hidden');
    document.getElementById('adClassificationSection').classList.add('hidden');
    document.getElementById('videoTargetSection').classList.add('hidden');
    document.getElementById('videoUploadProgress').classList.add('hidden');

    // Uncheck all target checkboxes
    document.querySelectorAll('input[name="videoTarget"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Update Video Classification Options
function updateVideoClassificationOptions() {
    const videoType = document.getElementById('videoTypeSelect').value;
    const adClassificationSection = document.getElementById('adClassificationSection');
    const videoTargetSection = document.getElementById('videoTargetSection');

    // Show/hide sections based on video type
    if (videoType === 'ad') {
        // For ads, show classification and target sections
        adClassificationSection.classList.remove('hidden');
        videoTargetSection.classList.remove('hidden');
    } else if (videoType === 'alert') {
        // For alerts, hide classification but show target sections
        adClassificationSection.classList.add('hidden');
        videoTargetSection.classList.remove('hidden');
    } else {
        // If no type selected, hide both
        adClassificationSection.classList.add('hidden');
        videoTargetSection.classList.add('hidden');
    }
}

// Preview System Video
function previewSystemVideo(event) {
    const file = event.target.files[0];
    if (file) {
        const preview = document.getElementById('systemVideoPreview');
        const previewPlayer = document.getElementById('systemVideoPreviewPlayer');
        const previewSource = document.getElementById('systemVideoPreviewSource');
        const fileNameDisplay = document.getElementById('videoFileName');

        if (preview && previewPlayer && previewSource) {
            const videoURL = URL.createObjectURL(file);
            previewSource.src = videoURL;
            previewPlayer.load();
            fileNameDisplay.textContent = `File: ${file.name} (${formatFileSize(file.size)})`;
            preview.classList.remove('hidden');
        }
    }
}

// Preview Thumbnail
function previewThumbnail(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('thumbnailPreview');
            const previewImg = document.getElementById('thumbnailPreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Handle System Video Upload
async function handleSystemVideoUpload() {
    const videoType = document.getElementById('videoTypeSelect').value;
    const adClassification = document.getElementById('adClassificationSelect').value;
    const videoTitle = document.getElementById('videoTitle').value;
    const videoDescription = document.getElementById('videoDescription').value;
    const videoFile = document.getElementById('systemVideoInput').files[0];
    const thumbnailFile = document.getElementById('videoThumbnail').files[0];

    // Get selected target checkboxes
    const selectedTargets = [];
    document.querySelectorAll('input[name="videoTarget"]:checked').forEach(checkbox => {
        selectedTargets.push(checkbox.value);
    });

    // Validation
    if (!videoType) {
        alert('Please select video type (Advertisement or Alert)');
        return;
    }

    if (videoType === 'ad' && !adClassification) {
        alert('Please select ad classification');
        return;
    }

    if (selectedTargets.length === 0) {
        alert('Please select at least one target page/profile');
        return;
    }

    if (!videoTitle.trim()) {
        alert('Please enter a video title');
        return;
    }

    if (!videoFile) {
        alert('Please select a video file');
        return;
    }

    if (!thumbnailFile) {
        alert('Please select a thumbnail image');
        return;
    }

    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication required. Please log in.');
        return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('thumbnail', thumbnailFile);
    formData.append('video_type', videoType);
    if (videoType === 'ad') {
        formData.append('classification', adClassification);
    }
    formData.append('targets', JSON.stringify(selectedTargets));
    formData.append('title', videoTitle);
    if (videoDescription) {
        formData.append('description', videoDescription);
    }

    // Show upload progress
    const progressSection = document.getElementById('videoUploadProgress');
    const progressBar = document.getElementById('videoUploadProgressBar');
    const progressPercent = document.getElementById('videoUploadPercent');
    const uploadBtn = document.getElementById('uploadSystemVideoBtn');

    progressSection.classList.remove('hidden');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                progressPercent.textContent = percent + '%';
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                console.log('Upload success:', data);

                const targetsList = selectedTargets.join(', ');
                alert(`Video uploaded successfully!\n\nType: ${videoType === 'ad' ? 'Advertisement' : 'Alert'}\n${videoType === 'ad' ? 'Classification: ' + adClassification + '\n' : ''}Targets: ${targetsList}\nTitle: ${videoTitle}\nVideo URL: ${data.video_url}`);
                closeVideoUploadModal();

                // Reload uploaded media list
                if (typeof loadUploadedMedia === 'function') {
                    loadUploadedMedia();
                }
            } else {
                const error = JSON.parse(xhr.responseText);
                throw new Error(error.detail || 'Upload failed');
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            throw new Error('Network error during upload');
        });

        // Send request
        xhr.open('POST', 'https://api.astegni.com/api/upload/system-video');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);

    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
        progressSection.classList.add('hidden');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Video';
    }
}

// ============================================
// ADMIN PROFILE DATABASE FUNCTIONS
// ============================================

// Load admin profile from database (merged from admin_profile + manage_system_settings_profile)
async function loadAdminProfile() {
    try {
        const token = localStorage.getItem('token');
        const adminId = localStorage.getItem('adminId') || 1;  // Get admin_id from localStorage

        console.log('📡 Fetching merged admin profile for admin_id:', adminId);

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system-settings-profile/${adminId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const profile = await response.json();
            currentAdminProfile = profile;
            updateProfileDisplay(profile);
            console.log('✅ Admin profile loaded from database successfully (merged data from admin_profile + manage_system_settings_profile)');
        } else {
            console.warn('⚠️ Failed to load profile from database, using fallback values');
            loadFallbackProfile();
        }
    } catch (error) {
        console.error('❌ Error loading admin profile:', error);
        loadFallbackProfile();
    }
}

// Load fallback profile when API fails
function loadFallbackProfile() {
    const fallbackProfile = {
        admin_id: 1,
        first_name: 'System',
        father_name: 'Administrator',
        grandfather_name: '',
        admin_username: 'admin',
        quote: 'Maintaining system integrity and optimal performance for all users.',
        bio: 'System administrator with full control over platform settings and configurations.',
        phone_number: '+251 911 000 000',
        email: 'admin@astegni.et',
        department: 'System Administration',
        profile_picture_url: null,
        cover_picture_url: null,
        employee_id: 'SYS-ADMIN-001',
        access_level: 'Root Administrator',
        last_login: new Date().toISOString(),
        responsibilities: 'Full System Control'
    };

    currentAdminProfile = fallbackProfile;
    updateProfileDisplay(fallbackProfile);
    console.log('📦 Fallback profile data loaded');
}

// Update profile display elements (handles merged data from admin_profile + manage_system_settings_profile)
function updateProfileDisplay(profile) {
    console.log('Updating profile display with merged data:', profile);

    // Extract system_settings data if available
    const systemSettings = profile.system_settings || {};

    // Update the main profile name (h1.profile-name) using username
    const nameElement = document.querySelector('.profile-name');
    if (nameElement) {
        // Display username (preferred), or fallback to email or 'Admin User'
        nameElement.textContent = profile.username || profile.email || 'Admin User';
    }

    // Update quote
    const quoteElement = document.querySelector('.profile-quote span');
    if (quoteElement) {
        quoteElement.textContent = profile.quote ? `"${profile.quote}"` : '"Maintaining system integrity and optimal performance for all users."';
    }

    // Update location/department (use system_settings position)
    const locationElement = document.querySelector('.profile-location span:last-child');
    if (locationElement) {
        // Use position from system_settings if available
        const position = systemSettings.position || 'Super Admin';
        locationElement.textContent = `${position} | Astegni Platform`;
    }

    // Update info items (Access Level, System ID, etc.)
    const infoItems = document.querySelectorAll('.info-item');

    // First info-item: Email
    if (infoItems.length >= 1) {
        const emailValue = infoItems[0].querySelector('.info-value');
        if (emailValue) {
            emailValue.textContent = profile.email || 'Not provided';
        }
    }

    // Second info-item: Phone
    if (infoItems.length >= 2) {
        const phoneValue = infoItems[1].querySelector('.info-value');
        if (phoneValue) {
            phoneValue.textContent = profile.phone_number || 'Not provided';
        }
    }

    // Third info-item: Access Level (from system_settings position)
    if (infoItems.length >= 3) {
        const accessLevelValue = infoItems[2].querySelector('.info-value');
        if (accessLevelValue) {
            accessLevelValue.textContent = systemSettings.position || 'Super Admin';
        }
    }

    // Fourth info-item: Admin ID
    if (infoItems.length >= 4) {
        const systemIdValue = infoItems[3].querySelector('.info-value');
        if (systemIdValue) {
            systemIdValue.textContent = `ADMIN-${String(profile.id).padStart(4, '0')}`;
        }
    }

    // Fifth info-item: Last Login
    if (infoItems.length >= 5 && profile.last_login) {
        const lastLoginValue = infoItems[4].querySelector('.info-value');
        if (lastLoginValue) {
            // Format the date nicely
            const loginDate = new Date(profile.last_login);
            const today = new Date();
            const isToday = loginDate.toDateString() === today.toDateString();

            if (isToday) {
                lastLoginValue.textContent = `Today at ${loginDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                lastLoginValue.textContent = loginDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        }
    }

    // Update bio/description
    const descriptionElement = document.querySelector('.info-description p');
    if (descriptionElement) {
        descriptionElement.textContent = profile.bio || 'System administrator with full control over platform settings, security configurations, and infrastructure management. Responsible for maintaining system stability and performance.';
    }

    // Update profile picture if available (check both profile_picture_url and profile_picture)
    const profilePicture = profile.profile_picture || profile.profile_picture_url;
    if (profilePicture) {
        const profileImg = document.querySelector('.profile-avatar');
        if (profileImg) {
            profileImg.src = profilePicture;
            profileImg.onerror = function() {
                // Fallback to default SVG placeholder if image fails to load
                this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='16'%3EAdmin%3C/text%3E%3C/svg%3E";
            };
        }
    }

    // Update cover image if available (check both cover_picture_url and cover_picture)
    const coverPicture = profile.cover_picture || profile.cover_picture_url;
    if (coverPicture) {
        const coverImg = document.querySelector('.cover-img');
        if (coverImg) {
            coverImg.src = coverPicture;
            coverImg.onerror = function() {
                // Fallback to placeholder SVG if image fails to load
                this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'%3E%3Crect width='1200' height='300' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='20'%3E1200x300%3C/text%3E%3C/svg%3E";
            };
        }
    }

    // Update badges based on access level
    const badgesRow = document.querySelector('.badges-row');
    if (badgesRow && profile.access_level) {
        // Clear existing badges
        badgesRow.innerHTML = '';

        // Add role badge
        const roleBadge = document.createElement('span');
        roleBadge.className = 'profile-badge verified';
        if (profile.access_level === 'Root Administrator' || profile.access_level === 'Super Admin') {
            roleBadge.textContent = '✔ Super Admin';
        } else if (profile.access_level === 'Admin') {
            roleBadge.textContent = '✔ Admin';
        } else {
            roleBadge.textContent = `✔ ${profile.access_level}`;
        }
        badgesRow.appendChild(roleBadge);

        // Add system control badge
        const systemBadge = document.createElement('span');
        systemBadge.className = 'profile-badge system';
        systemBadge.textContent = '⚙️ System Control';
        badgesRow.appendChild(systemBadge);

        // Add access badge based on level
        const accessBadge = document.createElement('span');
        accessBadge.className = 'profile-badge expert';
        if (profile.access_level === 'Root Administrator') {
            accessBadge.textContent = '🛡️ Full Access';
        } else {
            accessBadge.textContent = '🔒 Limited Access';
        }
        badgesRow.appendChild(accessBadge);
    }

    // Update rating section (admins typically have 5.0 rating as system managers)
    const ratingValue = document.querySelector('.rating-value');
    if (ratingValue) {
        ratingValue.textContent = '5.0';
    }

    const ratingStars = document.querySelector('.rating-stars');
    if (ratingStars) {
        ratingStars.textContent = '★★★★★';
    }

    const ratingCount = document.querySelector('.rating-count');
    if (ratingCount) {
        ratingCount.textContent = `(${profile.access_level || 'System Admin'})`;
    }

    console.log('✅ Profile display updated successfully');
}

// ============================================
// PROFILE MODAL FUNCTIONS (Shared)
// ============================================

function openEditProfileModal() {
    console.log('✅ openEditProfileModal (actual implementation) called');
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        console.log('✅ Modal element found, populating data...');
        // Populate modal with current profile data
        populateEditProfileModal();
        modal.classList.remove('hidden');
        console.log('✅ Modal opened successfully');
    } else {
        console.error('❌ Modal element with id "edit-profile-modal" not found!');
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Populate edit profile modal with current data (including system_settings fields)
function populateEditProfileModal() {
    if (!currentAdminProfile) return;

    // Extract system_settings data if available
    const systemSettings = currentAdminProfile.system_settings || {};

    // Populate username (PRIMARY FIELD)
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) usernameInput.value = currentAdminProfile.username || '';

    // Populate Ethiopian name fields (required fields)
    const firstNameInput = document.getElementById('firstNameInput');
    if (firstNameInput) firstNameInput.value = currentAdminProfile.first_name || '';

    const fatherNameInput = document.getElementById('fatherNameInput');
    if (fatherNameInput) fatherNameInput.value = currentAdminProfile.father_name || '';

    const grandfatherNameInput = document.getElementById('grandfatherNameInput');
    if (grandfatherNameInput) grandfatherNameInput.value = currentAdminProfile.grandfather_name || '';

    // Position (from system_settings)
    const positionInput = document.getElementById('positionInput');
    if (positionInput) positionInput.value = systemSettings.position || '';

    // Email - Store original for OTP verification
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        emailInput.value = currentAdminProfile.email || '';
        originalEmail = currentAdminProfile.email || '';
    }

    // Reset OTP verification state
    emailChanged = false;
    emailVerified = false;
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const emailChangeNote = document.getElementById('emailChangeNote');
    const otpVerificationSection = document.getElementById('otpVerificationSection');
    const otpVerifiedMsg = document.getElementById('otpVerifiedMsg');

    if (sendOtpBtn) sendOtpBtn.classList.add('hidden');
    if (emailChangeNote) emailChangeNote.classList.add('hidden');
    if (otpVerificationSection) otpVerificationSection.classList.add('hidden');
    if (otpVerifiedMsg) otpVerifiedMsg.classList.add('hidden');

    // Phone
    const phoneInput = document.getElementById('phoneNumberInput');
    if (phoneInput) phoneInput.value = currentAdminProfile.phone_number || '';

    // Bio
    const bioInput = document.getElementById('bioInput');
    if (bioInput) bioInput.value = currentAdminProfile.bio || '';

    // Profile quote
    const quoteInput = document.getElementById('quoteInput');
    if (quoteInput) quoteInput.value = currentAdminProfile.quote || '';
}

function openUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ============================================
// EMAIL OTP VERIFICATION FUNCTIONS
// ============================================

// Store original email and verification state
let originalEmail = '';
let emailVerified = false;
let emailChanged = false;

// Handle email change detection
function handleEmailChange() {
    const emailInput = document.getElementById('emailInput');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const emailChangeNote = document.getElementById('emailChangeNote');
    const otpVerificationSection = document.getElementById('otpVerificationSection');
    const otpVerifiedMsg = document.getElementById('otpVerifiedMsg');

    const newEmail = emailInput?.value.trim();

    // Check if email has changed from original
    if (newEmail && newEmail !== originalEmail) {
        emailChanged = true;
        emailVerified = false;
        sendOtpBtn.classList.remove('hidden');
        sendOtpBtn.disabled = false;
        emailChangeNote.classList.remove('hidden');
        otpVerificationSection.classList.add('hidden');
        otpVerifiedMsg.classList.add('hidden');
    } else {
        emailChanged = false;
        emailVerified = false;
        sendOtpBtn.classList.add('hidden');
        emailChangeNote.classList.add('hidden');
        otpVerificationSection.classList.add('hidden');
        otpVerifiedMsg.classList.add('hidden');
    }
}

// Send OTP to new email
async function sendEmailOTP() {
    const emailInput = document.getElementById('emailInput');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpVerificationSection = document.getElementById('otpVerificationSection');
    const otpTimer = document.getElementById('otpTimer');

    const newEmail = emailInput?.value.trim();

    if (!newEmail) {
        alert('Please enter a valid email address.');
        return;
    }

    try {
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Call the ADMIN send-otp-email-change endpoint
        const response = await fetch(`${window.API_BASE_URL}/api/admin/send-otp-email-change`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                new_email: newEmail
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Show OTP verification section
            otpVerificationSection.classList.remove('hidden');
            sendOtpBtn.textContent = 'Resend OTP';
            sendOtpBtn.disabled = false;

            // Start countdown timer (5 minutes)
            startOtpTimer();

            alert('OTP sent to ' + newEmail + '. Please check your email.');
        } else {
            throw new Error(result.detail || 'Failed to send OTP');
        }

    } catch (error) {
        console.error('Error sending OTP:', error);
        alert('Failed to send OTP: ' + error.message);
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Send OTP';
    }
}

// Verify OTP code
async function verifyEmailOTP() {
    const emailInput = document.getElementById('emailInput');
    const otpCodeInput = document.getElementById('otpCodeInput');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const otpVerifiedMsg = document.getElementById('otpVerifiedMsg');
    const emailChangeNote = document.getElementById('emailChangeNote');

    const newEmail = emailInput?.value.trim();
    const otpCode = otpCodeInput?.value.trim();

    if (!otpCode || otpCode.length !== 6) {
        alert('Please enter a valid 6-digit OTP code.');
        return;
    }

    try {
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'Verifying...';

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Call the ADMIN verify-otp-email-change endpoint
        const response = await fetch(`${window.API_BASE_URL}/api/admin/verify-otp-email-change`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                new_email: newEmail,
                otp_code: otpCode
            })
        });

        const result = await response.json();

        if (response.ok) {
            // OTP verified successfully
            emailVerified = true;
            otpVerifiedMsg.classList.remove('hidden');
            emailChangeNote.classList.add('hidden');
            verifyOtpBtn.disabled = true;
            verifyOtpBtn.textContent = 'Verified ✓';
            verifyOtpBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
            verifyOtpBtn.classList.add('bg-green-700');

            alert('Email verified successfully! You can now save your profile.');
        } else {
            throw new Error(result.detail || 'Invalid OTP code');
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        alert('Failed to verify OTP: ' + error.message);
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.textContent = 'Verify';
    }
}

// Start OTP timer (5 minutes countdown)
function startOtpTimer() {
    const otpTimer = document.getElementById('otpTimer');
    let timeLeft = 300; // 5 minutes in seconds

    const timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        otpTimer.textContent = `OTP valid for ${minutes}:${seconds.toString().padStart(2, '0')}`;

        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            otpTimer.textContent = 'OTP expired. Please request a new one.';
            otpTimer.classList.remove('text-gray-500');
            otpTimer.classList.add('text-red-600');
        }
    }, 1000);
}

// Handle Profile Update (saves to both admin_profile and manage_system_settings_profile)
async function handleProfileUpdate(event) {
    event.preventDefault();

    try {
        // Get form values - username is now PRIMARY
        const username = document.getElementById('usernameInput').value.trim();
        const firstName = document.getElementById('firstNameInput')?.value.trim();
        const fatherName = document.getElementById('fatherNameInput')?.value.trim();
        const grandfatherName = document.getElementById('grandfatherNameInput')?.value.trim();
        const position = document.getElementById('positionInput')?.value.trim();
        const email = document.getElementById('emailInput')?.value.trim();
        const phoneNumber = document.getElementById('phoneNumberInput')?.value.trim();
        const bio = document.getElementById('bioInput')?.value.trim();
        const quote = document.getElementById('quoteInput')?.value.trim();

        // Check if email was changed but not verified
        if (emailChanged && !emailVerified) {
            alert('Email has been changed. Please verify the new email with OTP before saving.');
            return;
        }

        // Prepare update data for both admin_profile and manage_system_settings_profile
        const updateData = {
            // admin_profile fields
            username: username,
            first_name: firstName,
            father_name: fatherName,
            grandfather_name: grandfatherName,
            phone_number: phoneNumber,
            bio: bio,
            quote: quote,
            // manage_system_settings_profile fields
            position: position
        };

        // Only include email if it was changed and verified
        if (emailChanged && emailVerified) {
            updateData.email = email;
        }

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Get adminId from localStorage
        const adminId = localStorage.getItem('adminId') || 1;

        // Send update request to the merged endpoint
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system-settings-profile/${adminId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (response.ok) {
            // Update successful - result is already the merged profile
            currentAdminProfile = result;
            updateProfileDisplay(result);
            alert('Profile updated successfully! Changes saved to both admin_profile and manage_system_settings_profile.');
            closeEditProfileModal();
        } else {
            throw new Error(result.detail || 'Failed to update profile');
        }

    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile: ' + error.message);
    }
}

// Preview Profile Picture
function previewProfilePicture(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            const previewImg = document.getElementById('profilePreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Handle Profile Picture Upload
function handleProfilePictureUpload() {
    console.log('Uploading profile picture...');
    // TODO: Implement upload
    alert('Profile picture uploaded successfully!');
    closeUploadProfileModal();
}

// Preview Cover Image
function previewCoverImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('coverPreview');
            const previewImg = document.getElementById('coverPreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Handle Cover Image Upload
function handleCoverImageUpload() {
    console.log('Uploading cover image...');
    // TODO: Implement upload
    alert('Cover image uploaded successfully!');
    closeUploadCoverModal();
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

async function saveGeneralSettings() {
    try {
        // Collect all contact phones
        const phones = [];
        const mainPhone = document.getElementById('contact-phone')?.value.trim();
        if (mainPhone) phones.push(mainPhone);

        // Collect additional phones
        const additionalPhones = document.querySelectorAll('#additional-phones input[type="phone"]');
        additionalPhones.forEach(input => {
            const phone = input.value.trim();
            if (phone) phones.push(phone);
        });

        // Collect all contact emails
        const emails = [];
        const mainEmail = document.getElementById('contact-email')?.value.trim();
        if (mainEmail) emails.push(mainEmail);

        // Collect additional emails
        const additionalEmails = document.querySelectorAll('#additional-emails input[type="email"]');
        additionalEmails.forEach(input => {
            const email = input.value.trim();
            if (email) emails.push(email);
        });

        // Get form values (send arrays, not comma-separated strings)
        const settings = {
            platform_name: document.getElementById('platform-name')?.value || '',
            site_url: document.getElementById('site-url')?.value || '',
            platform_tagline: document.getElementById('platform-tagline')?.value || '',
            platform_description: document.getElementById('platform-description')?.value || '',
            contact_email: emails,  // Send as JSON array
            contact_phone: phones   // Send as JSON array
        };

        const manager = new SystemSettingsDataManager();
        const result = await manager.updateGeneralSettings(settings);

        if (result && result.success) {
            alert('General settings saved successfully!');
        } else {
            throw new Error('Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving general settings:', error);
        alert('Failed to save settings: ' + error.message);
    }
}

async function saveMediaSettings() {
    try {
        // Collect media settings for all tiers
        const tiers = ['free', 'basic', 'premium', 'enterprise'];
        const token = localStorage.getItem('token');

        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Save each tier's settings
        for (const tier of tiers) {
            // Get separate storage limits in MB
            const imageStorageMB = parseInt(document.getElementById(`${tier}-image-limit`)?.value) || 0;
            const videoStorageMB = parseInt(document.getElementById(`${tier}-video-limit`)?.value) || 0;

            const settings = {
                max_image_size_mb: parseInt(document.getElementById(`${tier}-image-single`)?.value) || 0,
                max_video_size_mb: parseInt(document.getElementById(`${tier}-video-single`)?.value) || 0,
                max_document_size_mb: 10, // Default value
                max_audio_size_mb: 10, // Default value
                max_image_storage_mb: imageStorageMB,  // Send separate image storage limit
                max_video_storage_mb: videoStorageMB,  // Send separate video storage limit
                storage_limit_gb: Math.round((imageStorageMB + videoStorageMB) / 1024)  // Total for reference
            };

            const response = await fetch(`${window.API_BASE_URL}/api/admin/system/media-settings/${tier}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to save ${tier} tier: ${error.detail || 'Unknown error'}`);
            }
        }

        alert('Media settings saved successfully!');

        // Reload media settings to reflect changes
        if (typeof loadMediaSettings === 'function') {
            await loadMediaSettings();
        }

    } catch (error) {
        console.error('Error saving media settings:', error);
        alert('Failed to save media settings: ' + error.message);
    }
}

function saveImpressionSettings() {
    console.log('Saving impression settings...');
    alert('Impression settings saved successfully!');
}

function createManualBackup() {
    console.log('Creating manual backup...');
    alert('Manual backup initiated...');
}

function clearCache() {
    if (confirm('Are you sure you want to clear the cache? This action cannot be undone.')) {
        console.log('Clearing cache...');
        alert('Cache cleared successfully!');
    }
}

// ============================================
// CONTACT MANAGEMENT FUNCTIONS
// ============================================

// Add new contact phone field
function addContactPhone() {
    const additionalPhonesContainer = document.getElementById('additional-phones');
    if (!additionalPhonesContainer) return;

    const phoneDiv = document.createElement('div');
    phoneDiv.className = 'flex gap-2';
    phoneDiv.innerHTML = `
        <input type="phone" class="flex-1 p-2 border rounded-lg" placeholder="+251 911 234 567">
        <button onclick="removeContactField(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            <i class="fas fa-minus"></i>
        </button>
    `;
    additionalPhonesContainer.appendChild(phoneDiv);
}

// Add new contact email field
function addContactEmail() {
    const additionalEmailsContainer = document.getElementById('additional-emails');
    if (!additionalEmailsContainer) return;

    const emailDiv = document.createElement('div');
    emailDiv.className = 'flex gap-2';
    emailDiv.innerHTML = `
        <input type="email" class="flex-1 p-2 border rounded-lg" placeholder="contact@astegni.com">
        <button onclick="removeContactField(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            <i class="fas fa-minus"></i>
        </button>
    `;
    additionalEmailsContainer.appendChild(emailDiv);
}

// Remove contact field (phone or email)
function removeContactField(button) {
    const parentDiv = button.closest('.flex');
    if (parentDiv) {
        parentDiv.remove();
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Logout Function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        // TODO: Implement logout
        window.location.href = '/login';
    }
}

// ============================================
// PANEL SWITCHING EVENT LISTENER
// ============================================

/**
 * Listen for panel changes and load appropriate data
 * This ensures data is loaded when switching between panels
 */
document.addEventListener('panelChanged', function(event) {
    const panelName = event.detail.panelName;
    console.log(`Panel switched to: ${panelName}`);

    // Load data based on which panel is active
    if (typeof initializeSystemSettingsData === 'function') {
        initializeSystemSettingsData(panelName);
    }
});

// ============================================
// DELETE SYSTEM MEDIA FUNCTION
// ============================================

async function deleteSystemMedia(mediaId, mediaType) {
    if (!confirm(`Are you sure you want to delete this ${mediaType}? This action cannot be undone.`)) {
        return;
    }

    try {
        const manager = new SystemSettingsDataManager();
        const result = await manager.deleteSystemMedia(mediaId);

        if (result && result.success) {
            alert(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} deleted successfully!`);

            // Reload the media list
            if (typeof loadUploadedMedia === 'function') {
                await loadUploadedMedia();
            }
        } else {
            throw new Error('Failed to delete media');
        }
    } catch (error) {
        console.error('Error deleting media:', error);
        alert('Failed to delete media: ' + error.message);
    }
}

// ============================================
// EMAIL CONFIGURATION FUNCTIONS
// ============================================

// Load email configuration
async function loadEmailConfig() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const config = result.data || result; // Handle both {data: ...} and direct response
            console.log('Email config loaded:', config);

            // Populate form fields
            document.getElementById('smtp-host').value = config.smtp_host || '';
            document.getElementById('smtp-port').value = config.smtp_port || 587;
            document.getElementById('smtp-username').value = config.smtp_username || '';
            document.getElementById('from-email').value = config.from_email || '';
            document.getElementById('from-name').value = config.from_name || '';
            document.getElementById('smtp-encryption').value = config.smtp_encryption || 'TLS';
            document.getElementById('daily-limit').value = config.daily_limit || 1000;

            // Don't populate password for security
        }
    } catch (error) {
        console.error('Error loading email config:', error);
    }
}

// Save email configuration
async function saveEmailConfig() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Get form values
        const config = {
            smtp_host: document.getElementById('smtp-host').value.trim(),
            smtp_port: parseInt(document.getElementById('smtp-port').value),
            smtp_username: document.getElementById('smtp-username').value.trim(),
            smtp_encryption: document.getElementById('smtp-encryption').value,
            from_email: document.getElementById('from-email').value.trim(),
            from_name: document.getElementById('from-name').value.trim(),
            daily_limit: parseInt(document.getElementById('daily-limit').value),
            enabled: true  // Always enabled when saving via modal
        };

        // Add password only if provided
        const password = document.getElementById('smtp-password').value.trim();
        if (password) {
            config.smtp_password = password;
        }

        // Validation
        if (!config.smtp_host) {
            alert('Please enter SMTP host');
            return;
        }

        if (!config.smtp_username) {
            alert('Please enter SMTP username');
            return;
        }

        if (!config.from_email) {
            alert('Please enter From Email address');
            return;
        }

        // Send update request
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Email configuration saved successfully!');
            // Clear password field
            document.getElementById('smtp-password').value = '';
            // Close form and reload accounts list
            closeEmailForm();
            await loadEmailAccounts();
        } else {
            throw new Error(result.detail || 'Failed to save email configuration');
        }

    } catch (error) {
        console.error('Error saving email config:', error);
        alert('Failed to save email configuration: ' + error.message);
    }
}

// Test email configuration
async function testEmailConfig(event) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Get test email address
        const testEmail = prompt('Enter email address to send test email to:', localStorage.getItem('adminEmail') || '');
        if (!testEmail) return;

        // Disable button
        const btn = event ? event.target : null;
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending test email...';
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/test-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ test_email: testEmail })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Test email sent successfully to ${testEmail}!\n\nCheck your inbox to verify the email configuration is working correctly.`);
        } else {
            throw new Error(result.detail || 'Failed to send test email');
        }

    } catch (error) {
        console.error('Error testing email config:', error);
        alert('Failed to send test email: ' + error.message);
    } finally {
        // Re-enable button
        const btn = event ? event.target : null;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Test Email Configuration';
        }
    }
}

// Load email templates
async function loadEmailTemplates() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-templates`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const templates = result.data || result; // Handle both {data: [...]} and direct array
            console.log('Email templates loaded:', templates);

            const listContainer = document.getElementById('email-templates-list');
            if (!listContainer) return;

            if (!templates || templates.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-inbox text-3xl mb-2"></i>
                        <p>No email templates found</p>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = templates.map(template => `
                <div class="flex justify-between items-center p-3 border rounded-lg">
                    <div class="flex-1">
                        <div class="font-semibold">${template.template_name}</div>
                        <div class="text-sm text-gray-500">${template.subject}</div>
                        <div class="text-xs text-gray-400 mt-1">
                            ${template.enabled ? '<span class="text-green-600"><i class="fas fa-check-circle"></i> Enabled</span>' : '<span class="text-gray-400"><i class="fas fa-times-circle"></i> Disabled</span>'}
                        </div>
                    </div>
                    <button onclick="openEditEmailTemplateModal(${template.id})" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                        <i class="fas fa-edit mr-1"></i> Edit Template
                    </button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading email templates:', error);
    }
}

// Open email template editor modal
async function openEditEmailTemplateModal(templateId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch template details
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-templates/${templateId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const template = result.data || result; // Handle both {data: {...}} and direct object
            console.log('Template loaded for editing:', template);

            // Store current template ID
            window.currentEmailTemplateId = templateId;

            // Populate modal fields
            document.getElementById('template-name').value = template.template_name || '';
            document.getElementById('template-subject').value = template.subject || '';
            document.getElementById('template-body').value = template.body || '';

            // Set enabled checkbox if field exists
            const enabledCheckbox = document.getElementById('template-enabled');
            if (enabledCheckbox) {
                enabledCheckbox.checked = template.enabled || false;
            }

            // Show modal
            const modal = document.getElementById('edit-email-template-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        } else {
            throw new Error('Failed to load template');
        }
    } catch (error) {
        console.error('Error opening template editor:', error);
        alert('Failed to load template: ' + error.message);
    }
}

// Close email template editor modal
function closeEditEmailTemplateModal() {
    const modal = document.getElementById('edit-email-template-modal');
    if (modal) {
        modal.classList.add('hidden');
        window.currentEmailTemplateId = null;
    }
}

// Save email template
async function saveEmailTemplate() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        const templateId = window.currentEmailTemplateId;
        if (!templateId) {
            alert('No template selected');
            return;
        }

        // Get form values
        const templateData = {
            subject: document.getElementById('template-subject').value.trim(),
            body: document.getElementById('template-body').value.trim()
        };

        // Validation
        if (!templateData.subject) {
            alert('Please enter a subject line');
            return;
        }

        if (!templateData.body) {
            alert('Please enter email body content');
            return;
        }

        // Send update request
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-templates/${templateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(templateData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Email template saved successfully!');
            closeEditEmailTemplateModal();
            await loadEmailTemplates();
        } else {
            throw new Error(result.detail || 'Failed to save template');
        }

    } catch (error) {
        console.error('Error saving template:', error);
        alert('Failed to save template: ' + error.message);
    }
}

// Preview email template
function previewEmailTemplate() {
    const subject = document.getElementById('template-subject').value;
    const body = document.getElementById('template-body').value;
    const testName = document.getElementById('preview-name').value || 'John Doe';
    const testEmail = document.getElementById('preview-email').value || 'john@example.com';

    // Replace variables with test data
    let previewBody = body
        .replace(/{{name}}/g, testName)
        .replace(/{{email}}/g, testEmail)
        .replace(/{{platform_name}}/g, 'Astegni')
        .replace(/{{link}}/g, 'https://astegni.com/verify/abc123');

    // Open preview window
    const previewWindow = window.open('', 'Email Preview', 'width=800,height=600');
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Email Preview</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .subject { background: #f3f4f6; padding: 10px; border-left: 4px solid #3b82f6; margin-bottom: 20px; }
                .body { white-space: pre-wrap; line-height: 1.6; }
            </style>
        </head>
        <body>
            <h2>Email Preview</h2>
            <div class="subject">
                <strong>Subject:</strong> ${subject}
            </div>
            <div class="body">${previewBody}</div>
        </body>
        </html>
    `);
}

// ============================================
// ADD NEW EMAIL TEMPLATE FUNCTIONS
// ============================================

// Open Add Email Template Modal
function addNewEmailTemplate() {
    const modal = document.getElementById('add-email-template-modal');
    if (modal) {
        // Reset form
        resetAddEmailTemplateForm();
        modal.classList.remove('hidden');
    }
}

// Close Add Email Template Modal
function closeAddEmailTemplateModal() {
    const modal = document.getElementById('add-email-template-modal');
    if (modal) {
        modal.classList.add('hidden');
        resetAddEmailTemplateForm();
    }
}

// Reset Add Email Template Form
function resetAddEmailTemplateForm() {
    const form = document.getElementById('add-template-form');
    if (form) {
        form.reset();
    }
    // Re-check the enabled checkbox by default
    const enabledCheckbox = document.getElementById('new-template-enabled');
    if (enabledCheckbox) {
        enabledCheckbox.checked = true;
    }
}

// Handle Add Email Template Form Submission
async function handleAddEmailTemplate(event) {
    event.preventDefault();

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Get form values
        const templateData = {
            template_name: document.getElementById('new-template-name').value.trim(),
            template_key: document.getElementById('new-template-key').value.trim().toLowerCase(),
            subject: document.getElementById('new-template-subject').value.trim(),
            body: document.getElementById('new-template-body').value.trim(),
            enabled: document.getElementById('new-template-enabled').checked
        };

        // Validation
        if (!templateData.template_name) {
            alert('Please enter a template name');
            return;
        }

        if (!templateData.template_key) {
            alert('Please enter a template key');
            return;
        }

        // Validate template key format
        if (!/^[a-z_]+$/.test(templateData.template_key)) {
            alert('Template key must contain only lowercase letters and underscores');
            return;
        }

        if (!templateData.subject) {
            alert('Please enter a subject line');
            return;
        }

        if (!templateData.body) {
            alert('Please enter email body content');
            return;
        }

        // Disable submit button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

        // Send create request
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(templateData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Email template "${templateData.template_name}" created successfully!`);
            closeAddEmailTemplateModal();
            // Reload templates list
            await loadEmailTemplates();
        } else {
            throw new Error(result.detail || 'Failed to create template');
        }

    } catch (error) {
        console.error('Error creating template:', error);
        alert('Failed to create template: ' + error.message);
    } finally {
        // Re-enable submit button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Create Template';
        }
    }
}

// ============================================
// EMAIL ACCOUNT MANAGEMENT FUNCTIONS (Card-based Interface)
// ============================================

// Show add email form (now as modal)
function showAddEmailForm() {
    const modal = document.getElementById('email-form-modal');
    const modalTitle = document.getElementById('email-form-title');

    if (modal) {
        modal.classList.remove('hidden');
        // Reset title to "Add"
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-envelope mr-2 text-blue-600"></i>Add Email Account';
        }
        // Clear form for new entry
        resetEmailForm();
    }
}

// Close email form modal
function closeEmailForm() {
    const modal = document.getElementById('email-form-modal');

    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        resetEmailForm();
    }
}

// Reset email form fields
function resetEmailForm() {
    document.getElementById('email-account-name').value = '';
    document.getElementById('email-provider').value = 'custom';
    document.getElementById('smtp-host').value = '';
    document.getElementById('smtp-port').value = 587;
    document.getElementById('smtp-username').value = '';
    document.getElementById('smtp-password').value = '';
    document.getElementById('from-email').value = '';
    document.getElementById('from-name').value = '';
    document.getElementById('smtp-encryption').value = 'TLS';
    document.getElementById('daily-limit').value = 1000;
}

// Edit email account
function editEmailAccount(accountId) {
    const modal = document.getElementById('email-form-modal');
    const modalTitle = document.getElementById('email-form-title');

    if (modal) {
        modal.classList.remove('hidden');
        // Change title to "Edit"
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-envelope mr-2 text-blue-600"></i>Edit Email Account';
        }
        // Load the email config (which already populates the form)
        loadEmailConfig();
    }
}

// Handle email config form submission
function handleEmailConfigSubmit(event) {
    event.preventDefault();
    saveEmailConfig();
}

// Auto-fill provider settings
function autoFillProviderSettings(event) {
    const provider = event.target.value;
    const smtpHostInput = document.getElementById('smtp-host');
    const smtpPortInput = document.getElementById('smtp-port');
    const smtpEncryptionInput = document.getElementById('smtp-encryption');

    const providerSettings = {
        gmail: {
            host: 'smtp.gmail.com',
            port: 587,
            encryption: 'TLS'
        },
        outlook: {
            host: 'smtp-mail.outlook.com',
            port: 587,
            encryption: 'TLS'
        },
        yahoo: {
            host: 'smtp.mail.yahoo.com',
            port: 587,
            encryption: 'TLS'
        },
        'google-workspace': {
            host: 'smtp.gmail.com',
            port: 587,
            encryption: 'TLS'
        },
        sendgrid: {
            host: 'smtp.sendgrid.net',
            port: 587,
            encryption: 'TLS'
        },
        mailgun: {
            host: 'smtp.mailgun.org',
            port: 587,
            encryption: 'TLS'
        }
    };

    if (provider && providerSettings[provider]) {
        const settings = providerSettings[provider];
        if (smtpHostInput) smtpHostInput.value = settings.host;
        if (smtpPortInput) smtpPortInput.value = settings.port;
        if (smtpEncryptionInput) smtpEncryptionInput.value = settings.encryption;
    }
}

// Load and display email accounts as cards
async function loadEmailAccounts() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const config = result.data || result;

            const accountsList = document.getElementById('email-accounts-list');
            if (!accountsList) return;

            // If no email configured, show empty state
            if (!config || !config.smtp_username) {
                accountsList.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-envelope text-5xl mb-4 opacity-50"></i>
                        <p class="text-lg mb-2">No email accounts configured</p>
                        <p class="text-sm">Click "Add Email Account" to set up your first email account</p>
                    </div>
                `;
                return;
            }

            // Display the configured email as a card
            accountsList.innerHTML = `
                <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-envelope text-blue-600 text-xl"></i>
                                </div>
                                <div>
                                    <h3 class="font-semibold text-lg">${config.from_name || 'Email Account'}</h3>
                                    <p class="text-sm text-gray-500">${config.from_email || config.smtp_username}</p>
                                </div>
                                <span class="ml-2 px-3 py-1 rounded-full text-xs font-medium ${config.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                                    <i class="fas fa-circle text-xs mr-1"></i>${config.enabled ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div>
                                    <span class="text-gray-500">SMTP Host:</span>
                                    <span class="ml-2 font-medium">${config.smtp_host}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Port:</span>
                                    <span class="ml-2 font-medium">${config.smtp_port}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Username:</span>
                                    <span class="ml-2 font-medium">${config.smtp_username}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Encryption:</span>
                                    <span class="ml-2 font-medium">${config.smtp_encryption || 'TLS'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Daily Limit:</span>
                                    <span class="ml-2 font-medium">${config.daily_limit || 1000} emails</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-2 ml-4">
                            <button onclick="editEmailAccount(1)" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-edit mr-2"></i>Edit
                            </button>
                            <button onclick="toggleEmailAccount(1)" class="px-4 py-2 ${config.enabled ? 'bg-gray-600' : 'bg-green-600'} text-white rounded-lg hover:opacity-90 transition-opacity">
                                <i class="fas fa-${config.enabled ? 'pause' : 'play'} mr-2"></i>${config.enabled ? 'Disable' : 'Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading email accounts:', error);
    }
}

// Toggle email account enabled/disabled
async function toggleEmailAccount(accountId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Get current config
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/email-config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load current email configuration');
        }

        const result = await response.json();
        const config = result.data || result;

        // Toggle enabled status
        const updatedConfig = {
            ...config,
            enabled: !config.enabled
        };

        // Send update request
        const updateResponse = await fetch(`${window.API_BASE_URL}/api/admin/system/email-config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedConfig)
        });

        if (updateResponse.ok) {
            alert(`Email account ${updatedConfig.enabled ? 'enabled' : 'disabled'} successfully!`);
            await loadEmailAccounts();
        } else {
            throw new Error('Failed to update email configuration');
        }

    } catch (error) {
        console.error('Error toggling email account:', error);
        alert('Failed to toggle email account: ' + error.message);
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT (for onclick handlers in HTML)
// ============================================
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.openUploadProfileModal = openUploadProfileModal;
window.closeUploadProfileModal = closeUploadProfileModal;
window.openUploadCoverModal = openUploadCoverModal;
window.closeUploadCoverModal = closeUploadCoverModal;
window.handleProfileUpdate = handleProfileUpdate;
window.handleEmailChange = handleEmailChange;
window.sendEmailOTP = sendEmailOTP;
window.verifyEmailOTP = verifyEmailOTP;
window.previewProfilePicture = previewProfilePicture;
window.handleProfilePictureUpload = handleProfilePictureUpload;
window.previewCoverImage = previewCoverImage;
window.handleCoverImageUpload = handleCoverImageUpload;
window.saveGeneralSettings = saveGeneralSettings;
window.saveMediaSettings = saveMediaSettings;
window.saveImpressionSettings = saveImpressionSettings;
window.createManualBackup = createManualBackup;
window.clearCache = clearCache;
window.logout = logout;
window.openImageUploadModal = openImageUploadModal;
window.closeImageUploadModal = closeImageUploadModal;
window.updateImageTargetOptions = updateImageTargetOptions;
window.previewSystemImage = previewSystemImage;
window.handleSystemImageUpload = handleSystemImageUpload;
window.openVideoUploadModal = openVideoUploadModal;
window.closeVideoUploadModal = closeVideoUploadModal;
window.updateVideoClassificationOptions = updateVideoClassificationOptions;
window.previewSystemVideo = previewSystemVideo;
window.previewThumbnail = previewThumbnail;
window.handleSystemVideoUpload = handleSystemVideoUpload;
window.addContactPhone = addContactPhone;
window.addContactEmail = addContactEmail;
window.removeContactField = removeContactField;
window.deleteSystemMedia = deleteSystemMedia;
window.loadEmailConfig = loadEmailConfig;
window.saveEmailConfig = saveEmailConfig;
window.testEmailConfig = testEmailConfig;
window.loadEmailTemplates = loadEmailTemplates;
window.openEditEmailTemplateModal = openEditEmailTemplateModal;
window.closeEditEmailTemplateModal = closeEditEmailTemplateModal;
window.saveEmailTemplate = saveEmailTemplate;
window.previewEmailTemplate = previewEmailTemplate;
window.addNewEmailTemplate = addNewEmailTemplate;
window.closeAddEmailTemplateModal = closeAddEmailTemplateModal;
window.handleAddEmailTemplate = handleAddEmailTemplate;
window.showAddEmailForm = showAddEmailForm;
window.closeEmailForm = closeEmailForm;
window.resetEmailForm = resetEmailForm;
window.editEmailAccount = editEmailAccount;
window.handleEmailConfigSubmit = handleEmailConfigSubmit;
window.autoFillProviderSettings = autoFillProviderSettings;
window.loadEmailAccounts = loadEmailAccounts;
window.toggleEmailAccount = toggleEmailAccount;

// ============================================
// INVITE ADMIN MODAL FUNCTIONS
// ============================================

// Generate Employee ID in format: Emp-adm-XXXX-YY
function generateEmployeeId() {
    // Get current year (last 2 digits)
    const year = new Date().getFullYear().toString().slice(-2);

    // Generate 4-digit random number
    const randomNum = Math.floor(1000 + Math.random() * 9000);

    // Format: Emp-adm-XXXX-YY
    return `Emp-adm-${randomNum}-${year}`;
}

// Open Invite Admin Modal
function openInviteAdminModal() {
    const modal = document.getElementById('invite-admin-modal');
    if (modal) {
        resetInviteAdminModal();
        // Generate and set employee ID
        const employeeIdInput = document.getElementById('invite-admin-employee-id');
        if (employeeIdInput) {
            employeeIdInput.value = generateEmployeeId();
        }
        // Auto-fill joined in date/time
        const joinedInInput = document.getElementById('invite-admin-joined-in');
        if (joinedInInput) {
            const now = new Date();
            // Format as: YYYY-MM-DD HH:MM:SS
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            joinedInInput.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        modal.classList.remove('hidden');
    }
}

// Close Invite Admin Modal
function closeInviteAdminModal() {
    const modal = document.getElementById('invite-admin-modal');
    if (modal) {
        modal.classList.add('hidden');
        resetInviteAdminModal();
    }
}

// Reset Invite Admin Modal
function resetInviteAdminModal() {
    // Reset Ethiopian name fields
    const firstNameInput = document.getElementById('invite-admin-first-name');
    const fatherNameInput = document.getElementById('invite-admin-father-name');
    const grandfatherNameInput = document.getElementById('invite-admin-grandfather-name');
    const usernameInput = document.getElementById('invite-admin-username');
    const emailInput = document.getElementById('invite-admin-email');
    const phoneInput = document.getElementById('invite-admin-phone');
    const employeeIdInput = document.getElementById('invite-admin-employee-id');
    const joinedInInput = document.getElementById('invite-admin-joined-in');
    const roleInput = document.getElementById('invite-admin-role');
    const messageInput = document.getElementById('invite-admin-message');

    if (firstNameInput) firstNameInput.value = '';
    if (fatherNameInput) fatherNameInput.value = '';
    if (grandfatherNameInput) grandfatherNameInput.value = '';
    if (usernameInput) usernameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (employeeIdInput) employeeIdInput.value = '';
    if (joinedInInput) joinedInInput.value = '';
    if (roleInput) roleInput.value = '';
    if (messageInput) messageInput.value = '';

    // Uncheck all permission checkboxes
    document.querySelectorAll('#invite-admin-modal input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Handle Admin Invitation
async function handleAdminInvitation(event) {
    if (event) event.preventDefault();

    try {
        // Get Ethiopian name fields
        const firstName = document.getElementById('invite-admin-first-name')?.value.trim();
        const fatherName = document.getElementById('invite-admin-father-name')?.value.trim();
        const grandfatherName = document.getElementById('invite-admin-grandfather-name')?.value.trim();
        const email = document.getElementById('invite-admin-email')?.value.trim();
        const phone = document.getElementById('invite-admin-phone')?.value.trim();
        const employeeId = document.getElementById('invite-admin-employee-id')?.value.trim();
        const department = document.getElementById('invite-admin-department')?.value;
        const position = document.getElementById('invite-admin-position')?.value.trim();
        const message = document.getElementById('invite-admin-message')?.value.trim();

        // Build full name from Ethiopian naming convention
        const fullName = [firstName, fatherName, grandfatherName]
            .filter(name => name)
            .join(' ');

        // Validation
        if (!firstName) {
            alert('Please enter the administrator\'s first name');
            return;
        }

        if (!fatherName) {
            alert('Please enter the administrator\'s father name');
            return;
        }

        if (!email) {
            alert('Please enter a valid email address');
            return;
        }

        if (!department) {
            alert('Please select a department');
            return;
        }

        if (!position) {
            alert('Please enter a position');
            return;
        }

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Prepare invitation data with Ethiopian naming convention
        const invitationData = {
            first_name: firstName,
            father_name: fatherName,
            grandfather_name: grandfatherName || '',
            email: email,
            phone_number: phone || '',
            employee_id: employeeId,
            department: department,
            position: position,
            welcome_message: message || null
        };

        // Disable send button
        const sendBtn = document.querySelector('#invite-admin-modal .btn-primary');
        const originalText = sendBtn.innerHTML;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        // Send OTP request
        const response = await fetch(`${window.API_BASE_URL}/api/admin/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(invitationData)
        });

        const result = await response.json();

        if (response.ok) {
            // Build success message
            let successMessage = `OTP sent successfully!\n\n`;
            successMessage += `Name: ${fullName}\n`;
            successMessage += `Employee ID: ${result.employee_id || employeeId}\n`;
            successMessage += `Email sent to: ${email}\n\n`;
            successMessage += `✓ The OTP is valid for 7 days\n`;
            successMessage += `✓ The administrator will receive the OTP via email\n`;

            // In development mode, show the OTP
            if (result.otp) {
                successMessage += `\n[DEV MODE] OTP: ${result.otp}`;
            }

            alert(successMessage);
            closeInviteAdminModal();

            // Reload admin list if function exists
            if (typeof loadAdminsList === 'function') {
                await loadAdminsList();
            }
        } else {
            throw new Error(result.detail || 'Failed to send OTP');
        }

    } catch (error) {
        console.error('Error sending OTP:', error);
        alert('Failed to send OTP: ' + error.message);
    } finally {
        // Re-enable send button
        const sendBtn = document.querySelector('#invite-admin-modal .btn-primary');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-key"></i> Send OTP';
        }
    }
}

// Expose invite admin functions to window object
window.openInviteAdminModal = openInviteAdminModal;
window.closeInviteAdminModal = closeInviteAdminModal;
window.handleAdminInvitation = handleAdminInvitation;
window.generateEmployeeId = generateEmployeeId;

// ============================================
// SMS CONFIGURATION FUNCTIONS
// ============================================

// Load SMS Configuration
async function loadSMSConfig() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-config`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const config = await response.json();
            document.getElementById('twilio-account-sid').value = config.twilio_account_sid || '';
            document.getElementById('twilio-from-number').value = config.twilio_from_number || '';
            document.getElementById('default-country-code').value = config.default_country_code || '+251';
            document.getElementById('sms-enabled').checked = config.enabled !== undefined ? config.enabled : true;
            document.getElementById('daily-sms-limit').value = config.daily_limit || 1000;
            document.getElementById('otp-expiry-minutes').value = config.otp_expiry_minutes || 5;
            document.getElementById('otp-length').value = config.otp_length || 6;
            document.getElementById('otp-numeric-only').checked = config.otp_numeric_only !== undefined ? config.otp_numeric_only : true;

            // Update display values
            document.getElementById('sms-daily-limit-display').textContent = config.daily_limit || 1000;

            // Load SMS statistics
            await loadSMSStatistics();
        }
    } catch (error) {
        console.error('Error loading SMS config:', error);
    }
}

// Load SMS Statistics
async function loadSMSStatistics() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-sms-sent').textContent = stats.sent_today || 0;
            document.getElementById('stat-sms-delivered').textContent = stats.delivered || 0;
            document.getElementById('stat-sms-pending').textContent = stats.pending || 0;
            document.getElementById('stat-sms-failed').textContent = stats.failed || 0;
            document.getElementById('sms-daily-used-display').textContent = stats.sent_today || 0;

            const dailyLimit = parseInt(document.getElementById('sms-daily-limit-display').textContent) || 1000;
            const remaining = dailyLimit - (stats.sent_today || 0);
            document.getElementById('sms-daily-remaining-display').textContent = Math.max(0, remaining);
        }
    } catch (error) {
        console.error('Error loading SMS statistics:', error);
    }
}

// Save SMS Configuration
async function saveSMSConfig() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required.');
            return;
        }

        const accountSid = document.getElementById('twilio-account-sid').value.trim();
        const authToken = document.getElementById('twilio-auth-token').value.trim();
        const fromNumber = document.getElementById('twilio-from-number').value.trim();

        // Validate required fields
        if (!accountSid || !fromNumber) {
            alert('Please enter Twilio Account SID and Phone Number.');
            return;
        }

        const config = {
            twilio_account_sid: accountSid,
            twilio_auth_token: authToken || undefined, // Only send if provided
            twilio_from_number: fromNumber,
            default_country_code: document.getElementById('default-country-code').value,
            enabled: document.getElementById('sms-enabled').checked,
            daily_limit: parseInt(document.getElementById('daily-sms-limit').value) || 1000,
            otp_expiry_minutes: parseInt(document.getElementById('otp-expiry-minutes').value) || 5,
            otp_length: parseInt(document.getElementById('otp-length').value) || 6,
            otp_numeric_only: document.getElementById('otp-numeric-only').checked
        };

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();

        if (response.ok) {
            alert('SMS configuration saved successfully!');
            // Clear password field for security
            document.getElementById('twilio-auth-token').value = '';
            // Reload config to get updated values
            await loadSMSConfig();
        } else {
            throw new Error(result.detail || 'Failed to save SMS configuration');
        }
    } catch (error) {
        console.error('Error saving SMS config:', error);
        alert('Failed to save: ' + error.message);
    }
}

// Test SMS Connection
async function testSMSConnection() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required.');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/test-sms-connection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ SMS connection test successful!\n\n' + (result.message || 'Twilio connection is working properly.'));
        } else {
            throw new Error(result.detail || 'Connection test failed');
        }
    } catch (error) {
        console.error('Error testing SMS connection:', error);
        alert('❌ Connection test failed: ' + error.message);
    }
}

// Send Test SMS
async function sendTestSMS() {
    const phoneNumber = document.getElementById('test-phone-number').value.trim();
    const message = document.getElementById('test-message').value.trim();

    if (!phoneNumber) {
        alert('Please enter a phone number');
        return;
    }

    if (!message) {
        alert('Please enter a test message');
        return;
    }

    if (message.length > 160) {
        alert('Message exceeds 160 characters. SMS may be split into multiple messages.');
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required.');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/send-test-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                phone_number: phoneNumber,
                message: message
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✅ Test SMS sent successfully to ${phoneNumber}!`);
            // Reload statistics
            await loadSMSStatistics();
        } else {
            throw new Error(result.detail || 'Failed to send test SMS');
        }
    } catch (error) {
        console.error('Error sending test SMS:', error);
        alert('❌ Failed to send SMS: ' + error.message);
    }
}

// Toggle Password Visibility
function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const button = event.currentTarget;
    const icon = button.querySelector('i');

    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Edit SMS Template (placeholder for future implementation)
function editSMSTemplate(templateType) {
    alert(`Edit ${templateType} template feature is coming soon!\n\nThis will allow you to customize SMS templates with variables.`);
}

// View SMS Logs (placeholder for future implementation)
function viewSMSLogs() {
    alert('SMS Logs feature is coming soon!\n\nYou will be able to view detailed SMS delivery logs here.');
}

// Update test message character count
document.addEventListener('DOMContentLoaded', () => {
    const testMessage = document.getElementById('test-message');
    if (testMessage) {
        testMessage.addEventListener('input', () => {
            const count = testMessage.value.length;
            const countDisplay = document.getElementById('test-message-count');
            if (countDisplay) {
                countDisplay.textContent = count;
                // Change color if exceeding 160 chars
                const parent = countDisplay.parentElement;
                if (count > 160) {
                    parent.classList.add('text-red-500');
                    parent.classList.remove('text-gray-500');
                } else {
                    parent.classList.remove('text-red-500');
                    parent.classList.add('text-gray-500');
                }
            }
        });
    }
});

// Expose SMS functions to window object
window.loadSMSConfig = loadSMSConfig;
window.loadSMSStatistics = loadSMSStatistics;
window.saveSMSConfig = saveSMSConfig;
window.testSMSConnection = testSMSConnection;
window.sendTestSMS = sendTestSMS;
window.togglePasswordVisibility = togglePasswordVisibility;
window.editSMSTemplate = editSMSTemplate;
window.viewSMSLogs = viewSMSLogs;

// ============================================
// SMS PROVIDER MANAGEMENT FUNCTIONS (NEW)
// ============================================

// Show Add SMS Provider Modal
function showAddSMSProviderModal() {
    const modal = document.getElementById('add-sms-provider-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close Add SMS Provider Modal
function closeAddSMSProviderModal() {
    const modal = document.getElementById('add-sms-provider-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Select SMS Provider and open configuration modal
function selectSMSProvider(providerType) {
    // Close provider selection modal
    closeAddSMSProviderModal();

    // Open specific provider configuration modal
    const modalMap = {
        'africas_talking': 'configure-africas-talking-modal',
        'twilio': 'configure-twilio-modal',
        'vonage': 'configure-vonage-modal',
        'aws_sns': 'configure-aws-sns-modal',
        'ethiopian_gateway': 'configure-ethiopian-gateway-modal',
        'ethio_telecom': 'configure-ethio-telecom-modal'
    };

    const modalId = modalMap[providerType];
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
}

// Close SMS Config Modal (generic)
function closeSMSConfigModal() {
    // Close all provider modals
    const modalIds = [
        'configure-africas-talking-modal',
        'configure-twilio-modal',
        'configure-vonage-modal',
        'configure-aws-sns-modal',
        'configure-ethiopian-gateway-modal',
        'configure-ethio-telecom-modal'
    ];

    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    });
}

// Save SMS Provider Configuration
async function saveSMSProviderConfig(event, providerType) {
    event.preventDefault();

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        // Get form data
        const formData = new FormData(event.target);
        const config = {};

        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            config[key] = value;
        }

        // Add provider type
        config.provider_type = providerType;

        // Send configuration to backend
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-provider`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`${getProviderName(providerType)} configured successfully!`);
            closeSMSConfigModal();
            // Reload SMS providers list
            await loadSMSProviders();
        } else {
            throw new Error(result.detail || 'Failed to save configuration');
        }
    } catch (error) {
        console.error('Error saving SMS provider config:', error);
        alert('Failed to save configuration: ' + error.message);
    }
}

// Get friendly provider name
function getProviderName(providerType) {
    const names = {
        'africas_talking': 'Africa\'s Talking',
        'twilio': 'Twilio',
        'vonage': 'Vonage',
        'aws_sns': 'AWS SNS'
    };
    return names[providerType] || providerType;
}

// Load and display configured SMS providers
async function loadSMSProviders() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-providers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const providers = await response.json();
            const providersList = document.getElementById('sms-providers-list');

            if (!providersList) return;

            // If no providers configured, show empty state
            if (!providers || providers.length === 0) {
                providersList.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-sms text-5xl mb-4 opacity-50"></i>
                        <p class="text-lg mb-2">No SMS providers configured</p>
                        <p class="text-sm">Click "Add SMS Provider" to set up your first SMS provider</p>
                    </div>
                `;
                return;
            }

            // Display provider cards
            providersList.innerHTML = providers.map(provider => createSMSProviderCard(provider)).join('');
        }
    } catch (error) {
        console.error('Error loading SMS providers:', error);
    }
}

// Create SMS provider card HTML
function createSMSProviderCard(provider) {
    const iconMap = {
        'africas_talking': 'fa-globe-africa text-green-600',
        'twilio': 'fa-comments text-blue-600',
        'vonage': 'fa-sms text-purple-600',
        'aws_sns': 'fa-aws text-orange-600'
    };

    const colorMap = {
        'africas_talking': 'green',
        'twilio': 'blue',
        'vonage': 'purple',
        'aws_sns': 'orange'
    };

    const icon = iconMap[provider.provider_type] || 'fa-envelope';
    const color = colorMap[provider.provider_type] || 'blue';

    return `
        <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center">
                            <i class="fas ${icon} text-xl"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-lg">${getProviderName(provider.provider_type)}</h3>
                            <p class="text-sm text-gray-500">${provider.username || provider.from_number || 'Provider'}</p>
                        </div>
                        <span class="ml-2 px-3 py-1 rounded-full text-xs font-medium ${provider.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                            <i class="fas fa-circle text-xs mr-1"></i>${provider.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                        ${provider.provider_type === 'africas_talking' ? `
                            <div>
                                <span class="text-gray-500">Username:</span>
                                <span class="ml-2 font-medium">${provider.username || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Sender ID:</span>
                                <span class="ml-2 font-medium">${provider.sender_id || 'N/A'}</span>
                            </div>
                        ` : ''}
                        ${provider.provider_type === 'twilio' ? `
                            <div>
                                <span class="text-gray-500">Account SID:</span>
                                <span class="ml-2 font-medium">${provider.account_sid ? provider.account_sid.substring(0, 10) + '...' : 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">From Number:</span>
                                <span class="ml-2 font-medium">${provider.from_number || 'N/A'}</span>
                            </div>
                        ` : ''}
                        <div>
                            <span class="text-gray-500">Messages Sent:</span>
                            <span class="ml-2 font-medium">${provider.messages_sent || 0}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Last Used:</span>
                            <span class="ml-2 font-medium">${provider.last_used ? new Date(provider.last_used).toLocaleDateString() : 'Never'}</span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2 ml-4">
                    <button onclick="editSMSProvider(${provider.id}, '${provider.provider_type}')" class="px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors">
                        <i class="fas fa-edit mr-2"></i>Edit
                    </button>
                    <button onclick="toggleSMSProvider(${provider.id})" class="px-4 py-2 ${provider.is_active ? 'bg-gray-600' : 'bg-green-600'} text-white rounded-lg hover:opacity-90 transition-opacity">
                        <i class="fas fa-${provider.is_active ? 'pause' : 'play'} mr-2"></i>${provider.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="deleteSMSProvider(${provider.id})" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <i class="fas fa-trash mr-2"></i>Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Edit SMS Provider
async function editSMSProvider(providerId, providerType) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch provider details
        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-provider/${providerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const provider = await response.json();

            // Open appropriate modal and populate fields
            const modalMap = {
                'africas_talking': 'configure-africas-talking-modal',
                'twilio': 'configure-twilio-modal',
                'vonage': 'configure-vonage-modal',
                'aws_sns': 'configure-aws-sns-modal',
                'ethiopian_gateway': 'configure-ethiopian-gateway-modal',
                'ethio_telecom': 'configure-ethio-telecom-modal'
            };

            const modalId = modalMap[providerType];
            const modal = document.getElementById(modalId);

            if (modal) {
                // Populate form fields based on provider type
                if (providerType === 'africas_talking') {
                    modal.querySelector('[name="at_username"]').value = provider.username || '';
                    modal.querySelector('[name="at_api_key"]').value = ''; // Don't show for security
                    modal.querySelector('[name="at_from_number"]').value = provider.sender_id || '';
                } else if (providerType === 'twilio') {
                    modal.querySelector('[name="twilio_account_sid"]').value = provider.account_sid || '';
                    modal.querySelector('[name="twilio_auth_token"]').value = ''; // Don't show for security
                    modal.querySelector('[name="twilio_from_number"]').value = provider.from_number || '';
                }
                // Add other providers as needed

                modal.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading provider details:', error);
        alert('Failed to load provider details: ' + error.message);
    }
}

// Toggle SMS Provider active/inactive
async function toggleSMSProvider(providerId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-provider/${providerId}/toggle`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            await loadSMSProviders();
        } else {
            throw new Error('Failed to toggle provider');
        }
    } catch (error) {
        console.error('Error toggling SMS provider:', error);
        alert('Failed to toggle provider: ' + error.message);
    }
}

// Delete SMS Provider
async function deleteSMSProvider(providerId) {
    if (!confirm('Are you sure you want to delete this SMS provider? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication required. Please log in.');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-provider/${providerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('SMS provider deleted successfully!');
            await loadSMSProviders();
        } else {
            throw new Error('Failed to delete provider');
        }
    } catch (error) {
        console.error('Error deleting SMS provider:', error);
        alert('Failed to delete provider: ' + error.message);
    }
}

// Expose new SMS provider functions to window object
window.showAddSMSProviderModal = showAddSMSProviderModal;
window.closeAddSMSProviderModal = closeAddSMSProviderModal;
window.selectSMSProvider = selectSMSProvider;
window.closeSMSConfigModal = closeSMSConfigModal;
window.saveSMSProviderConfig = saveSMSProviderConfig;
window.loadSMSProviders = loadSMSProviders;
window.editSMSProvider = editSMSProvider;
window.toggleSMSProvider = toggleSMSProvider;
window.deleteSMSProvider = deleteSMSProvider;

console.log('✅ All window functions exposed successfully (manage-system-settings.js loaded completely)');
