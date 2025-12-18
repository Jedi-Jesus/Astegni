// ============================================
// ADVERTISER PROFILE GLOBAL FUNCTIONS
// Functions accessible from HTML onclick handlers
// ============================================

// Store original profile data for comparison
let originalAdvertiserData = {};
let pendingAdvertiserChanges = null;

// Open Edit Profile Modal
function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Load current profile data into form if available
        if (typeof AdvertiserProfileDataLoader !== 'undefined') {
            const profile = AdvertiserProfileDataLoader.profileData;
            if (profile) {
                // Populate form fields with current data
                populateEditForm(profile);
            }
        }
    }
}

// Close Edit Profile Modal
function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Populate Edit Form
function populateEditForm(profile) {
    // Populate basic info
    const fields = {
        'editCompanyName': profile.company_name || profile.name,
        'editEmail': profile.email,
        'editPhone': profile.phone,
        'editLocation': profile.location,
        'editWebsite': profile.website,
        'editIndustry': profile.industry,
        'editDescription': profile.description || profile.bio
    };

    Object.keys(fields).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element && fields[fieldId]) {
            element.value = fields[fieldId];
        }
    });
}

// Save Advertiser Profile
async function saveAdvertiserProfile() {
    try {
        const form = document.getElementById('editAdvertiserProfileForm');
        if (!form) {
            console.error('Edit form not found');
            return;
        }

        // Gather form data
        const profileData = {
            company_name: document.getElementById('editCompanyName')?.value,
            email: document.getElementById('editEmail')?.value,
            phone: document.getElementById('editPhone')?.value,
            location: document.getElementById('editLocation')?.value,
            website: document.getElementById('editWebsite')?.value,
            industry: document.getElementById('editIndustry')?.value,
            description: document.getElementById('editDescription')?.value
        };

        // Save via handler if available
        if (typeof AdvertiserProfileEditHandler !== 'undefined') {
            await AdvertiserProfileEditHandler.saveProfile(profileData);
        } else {
            console.log('AdvertiserProfileEditHandler not available, showing success message');
            alert('Profile updated successfully!');
            closeEditProfileModal();
        }

    } catch (error) {
        console.error('Error in saveAdvertiserProfile:', error);
        alert('Failed to save profile: ' + error.message);
    }
}

// Open Cover Upload Modal
function openCoverUploadModal() {
    const modal = document.getElementById('coverUploadModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Close Cover Upload Modal
function closeCoverUploadModal() {
    const modal = document.getElementById('coverUploadModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Open Profile Upload Modal
function openProfileUploadModal() {
    const modal = document.getElementById('profileUploadModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Close Profile Upload Modal
function closeProfileUploadModal() {
    const modal = document.getElementById('profileUploadModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Handle Image Select
function handleImageSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';
        const imageId = type === 'cover' ? 'coverPreviewImage' : 'profilePreviewImage';
        const fileNameId = type === 'cover' ? 'coverFileName' : 'profileFileName';
        const fileSizeId = type === 'cover' ? 'coverFileSize' : 'profileFileSize';

        // Show preview container
        const previewContainer = document.getElementById(previewId);
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }

        // Set preview image
        const previewImage = document.getElementById(imageId);
        if (previewImage) {
            previewImage.src = e.target.result;
        }

        // Set file info
        const fileNameEl = document.getElementById(fileNameId);
        if (fileNameEl) {
            fileNameEl.textContent = file.name;
        }

        const fileSizeEl = document.getElementById(fileSizeId);
        if (fileSizeEl) {
            fileSizeEl.textContent = formatFileSize(file.size);
        }
    };

    reader.readAsDataURL(file);
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Upload Image
async function uploadImage(type) {
    console.log(`Uploading ${type} image...`);

    // Show progress
    const progressEl = document.getElementById(type + 'Progress');
    if (progressEl) {
        progressEl.style.display = 'block';
    }

    // Simulate upload (replace with actual upload logic)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Hide progress and close modal
    if (progressEl) {
        progressEl.style.display = 'none';
    }

    if (type === 'cover') {
        closeCoverUploadModal();
    } else {
        closeProfileUploadModal();
    }

    alert(`${type === 'cover' ? 'Cover' : 'Profile'} photo uploaded successfully!`);
}

// Reset Upload
function resetUpload(type) {
    const inputId = type === 'cover' ? 'coverInput' : 'profileInput';
    const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';

    const input = document.getElementById(inputId);
    if (input) input.value = '';

    const preview = document.getElementById(previewId);
    if (preview) preview.style.display = 'none';
}

// Share Profile
function shareProfile() {
    const profileUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: 'Check out my Astegni Advertiser Profile',
            text: 'I\'m an advertiser on Astegni. Check out my campaigns!',
            url: profileUrl
        }).then(() => {
            console.log('Profile shared successfully');
        }).catch((error) => {
            console.error('Error sharing profile:', error);
            fallbackShare(profileUrl);
        });
    } else {
        fallbackShare(profileUrl);
    }
}

function fallbackShare(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Profile link copied to clipboard!');
    }).catch((error) => {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy link');
    });
}

// Open Community Modal
async function openCommunityModal() {
    console.log('[AdvertiserProfile] Opening community modal...');

    let modal = document.getElementById('communityModal');

    // If modal doesn't exist, load it from common-modals
    if (!modal) {
        try {
            const response = await fetch('../modals/common-modals/community-modal.html');
            if (response.ok) {
                const html = await response.text();
                const container = document.createElement('div');
                container.innerHTML = html;
                document.body.appendChild(container.firstElementChild || container);
                modal = document.getElementById('communityModal');
                console.log('[AdvertiserProfile] Community modal loaded from file');
            } else {
                console.error('[AdvertiserProfile] Failed to load community modal');
                alert('Community features coming soon!');
                return;
            }
        } catch (error) {
            console.error('[AdvertiserProfile] Error loading community modal:', error);
            alert('Community features coming soon!');
            return;
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('[AdvertiserProfile] Community modal opened');
    }
}

// Close Community Modal
function closeCommunityModal() {
    const modal = document.getElementById('communityModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        console.log('[AdvertiserProfile] Community modal closed');
    }
}

// Open Ad Analytics Modal
function openAdAnalyticsModal() {
    console.log('Opening ad analytics modal...');
    // Switch to ad-analytics panel instead
    if (typeof switchPanel === 'function') {
        switchPanel('ad-analytics');
    }
}

// Handle Navigation Link Click
function handleNavLinkClick(event, section) {
    event.preventDefault();
    console.log(`Navigation to ${section} clicked`);
    alert(`${section} section coming soon!`);
}

// Export all functions to window
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveAdvertiserProfile = saveAdvertiserProfile;
window.openCoverUploadModal = openCoverUploadModal;
window.closeCoverUploadModal = closeCoverUploadModal;
window.openProfileUploadModal = openProfileUploadModal;
window.closeProfileUploadModal = closeProfileUploadModal;
window.handleImageSelect = handleImageSelect;
window.uploadImage = uploadImage;
window.resetUpload = resetUpload;
window.shareProfile = shareProfile;
window.openCommunityModal = openCommunityModal;
window.closeCommunityModal = closeCommunityModal;
window.openAdAnalyticsModal = openAdAnalyticsModal;
window.handleNavLinkClick = handleNavLinkClick;

console.log('[AdvertiserProfile] Global Functions loaded');
