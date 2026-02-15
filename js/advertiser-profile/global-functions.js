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

// NOTE: saveAdvertiserProfile() is defined in profile-edit-handler.js
// Do not duplicate it here - it will be exported to window automatically

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
// DEPRECATED: Old shareProfile() function removed
// Now using shareProfile() from js/common-modals/share-profile-manager.js
// which provides full referral system with modal, social sharing, and tracking

// Old functions commented out:
// function shareProfile() {
//     const profileUrl = window.location.href;
//     if (navigator.share) {
//         navigator.share({
//             title: 'Check out my Astegni Advertiser Profile',
//             text: 'I\'m an advertiser on Astegni. Check out my campaigns!',
//             url: profileUrl
//         }).then(() => {
//             console.log('Profile shared successfully');
//         }).catch((error) => {
//             console.error('Error sharing profile:', error);
//             fallbackShare(profileUrl);
//         });
//     } else {
//         fallbackShare(profileUrl);
//     }
// }
//
// function fallbackShare(url) {
//     navigator.clipboard.writeText(url).then(() => {
//         alert('Profile link copied to clipboard!');
//     }).catch((error) => {
//         console.error('Error copying to clipboard:', error);
//         alert('Failed to copy link');
//     });
// }

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

// Open Ad Analytics Modal - NOW OPENS COMING SOON MODAL
function openAdAnalyticsModal() {
    console.log('Opening coming soon modal for Advertising...');
    // Open coming soon modal instead
    if (typeof openComingSoonModal === 'function') {
        openComingSoonModal('Advertising');
    } else {
        console.error('openComingSoonModal function not available');
    }

    // OLD CODE (disabled):
    // Switch to ad-analytics panel instead
    // if (typeof switchPanel === 'function') {
    //     switchPanel('ad-analytics');
    // } else {
    //     console.error('switchPanel function not available');
    // }
}

// Open Verify Company Info Modal
async function openVerifyCompanyInfoModal() {
    console.log('[AdvertiserProfile] Opening verify company info modal...');

    let modal = document.getElementById('verify-company-info-modal');

    // If modal doesn't exist, try to load it
    if (!modal) {
        try {
            const response = await fetch('../modals/common-modals/verify-company-info-modal.html');
            if (response.ok) {
                const html = await response.text();
                let container = document.getElementById('modal-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'modal-container';
                    document.body.appendChild(container);
                }
                container.insertAdjacentHTML('beforeend', html);
                modal = document.getElementById('verify-company-info-modal');
                console.log('[AdvertiserProfile] Verify company info modal loaded from file');
            } else {
                console.error('[AdvertiserProfile] Failed to load verify company info modal');
                alert('Could not load company verification. Please refresh the page.');
                return;
            }
        } catch (error) {
            console.error('[AdvertiserProfile] Error loading verify company info modal:', error);
            alert('Could not load company verification. Please refresh the page.');
            return;
        }
    }

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        console.log('[AdvertiserProfile] Verify company info modal opened');

        // CRITICAL: Initialize modal event listeners (attaches OTP button handlers)
        if (typeof initCompanyVerificationModal === 'function') {
            initCompanyVerificationModal();
            console.log('[AdvertiserProfile] initCompanyVerificationModal() called');
        } else {
            console.error('[AdvertiserProfile] initCompanyVerificationModal not found! OTP buttons will not work.');
        }

        // Wait for DOM to settle before loading data
        // This ensures all nested elements are available
        await new Promise(resolve => setTimeout(resolve, 100));

        // Debug: Check if document preview elements exist
        console.log('[AdvertiserProfile] Checking document preview elements...');
        console.log('[AdvertiserProfile] businessLicensePreview:', !!document.getElementById('businessLicensePreview'));
        console.log('[AdvertiserProfile] tinCertificatePreview:', !!document.getElementById('tinCertificatePreview'));
        console.log('[AdvertiserProfile] companyLogoPreview:', !!document.getElementById('companyLogoPreview'));

        // Load company data (await to ensure it completes)
        if (typeof loadCompanyInfoData === 'function') {
            await loadCompanyInfoData();
            console.log('[AdvertiserProfile] loadCompanyInfoData completed');
        }
        if (typeof updateVerificationStatus === 'function') {
            updateVerificationStatus();
        }
    }
}

// Close Verify Company Info Modal
function closeVerifyCompanyInfoModal() {
    const modal = document.getElementById('verify-company-info-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        console.log('[AdvertiserProfile] Verify company info modal closed');
    }
}

// Handle Navigation Link Click
function handleNavLinkClick(event, section) {
    event.preventDefault();
    console.log(`Navigation to ${section} clicked`);
    alert(`${section} section coming soon!`);
}

// ============================================
// BRANDS PANEL FUNCTIONS
// Wrapper functions for BrandsManager (defined in brands-manager.js)
// ============================================

function filterBrandsByStatus(status) {
    if (typeof BrandsManager !== 'undefined' && typeof BrandsManager.setStatusFilter === 'function') {
        BrandsManager.setStatusFilter(status);
    } else {
        console.warn('[Global Functions] BrandsManager not available yet, queuing filterBrandsByStatus');
        // Wait for BrandsManager to load
        setTimeout(() => filterBrandsByStatus(status), 100);
    }
}

function searchBrandsInput(event) {
    if (typeof BrandsManager !== 'undefined' && typeof BrandsManager.searchBrands === 'function') {
        BrandsManager.searchBrands(event.target.value);
    } else {
        console.warn('[Global Functions] BrandsManager not available yet, queuing searchBrandsInput');
        // Wait for BrandsManager to load
        setTimeout(() => searchBrandsInput(event), 100);
    }
}

// Export all functions to window
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
// NOTE: saveAdvertiserProfile is exported by profile-edit-handler.js - don't override it here
window.openCoverUploadModal = openCoverUploadModal;
window.closeCoverUploadModal = closeCoverUploadModal;
window.openProfileUploadModal = openProfileUploadModal;
window.closeProfileUploadModal = closeProfileUploadModal;
window.handleImageSelect = handleImageSelect;
window.uploadImage = uploadImage;
window.resetUpload = resetUpload;
// window.shareProfile = shareProfile; // REMOVED: Now defined in share-profile-manager.js
window.openCommunityModal = openCommunityModal;
window.closeCommunityModal = closeCommunityModal;
window.openAdAnalyticsModal = openAdAnalyticsModal;
window.openVerifyCompanyInfoModal = openVerifyCompanyInfoModal;
window.closeVerifyCompanyInfoModal = closeVerifyCompanyInfoModal;
window.handleNavLinkClick = handleNavLinkClick;
window.filterBrandsByStatus = filterBrandsByStatus;
window.searchBrandsInput = searchBrandsInput;

console.log('[AdvertiserProfile] Global Functions loaded');
