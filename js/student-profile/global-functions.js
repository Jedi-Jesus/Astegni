// ============================================
// STUDENT PROFILE GLOBAL FUNCTIONS
// Functions accessible from HTML onclick handlers
// ============================================

// Store original profile data for comparison
let originalStudentData = {};
let pendingStudentChanges = null;

// Open Edit Profile Modal
function openEditProfileModal() {
    // Get profile from state
    let profile = StudentProfileState?.getStudentProfile();

    // Fallback to StudentProfileDataLoader if state is empty
    if (!profile && typeof StudentProfileDataLoader !== 'undefined') {
        profile = StudentProfileDataLoader.profileData;
        console.log('Using profile data from StudentProfileDataLoader:', profile);
    }

    if (profile) {
        // Store original data
        originalStudentData = {
            first_name: profile.first_name || '',
            father_name: profile.father_name || '',
            grandfather_name: profile.grandfather_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            gender: profile.gender || '',
            subjects: profile.subjects || []
        };

        // Populate name fields
        const editFirstName = document.getElementById('editFirstName');
        const editFatherName = document.getElementById('editFatherName');
        const editGrandFatherName = document.getElementById('editGrandFatherName');

        if (editFirstName) editFirstName.value = profile.first_name || '';
        if (editFatherName) editFatherName.value = profile.father_name || '';
        if (editGrandFatherName) editGrandFatherName.value = profile.grandfather_name || '';

        // Populate username and gender
        const username = document.getElementById('editUsername');
        const gender = document.getElementById('editGender');
        if (username) username.value = profile.username || '';
        if (gender) gender.value = profile.gender || '';

        // Populate email and phone
        const editEmail = document.getElementById('editEmail');
        const editPhone = document.getElementById('editPhone');
        if (editEmail) editEmail.value = profile.email || '';
        if (editPhone) editPhone.value = profile.phone || '';

        // Populate grade level
        const gradeLevel = document.getElementById('editGradeLevel');
        if (gradeLevel) gradeLevel.value = profile.grade_level || '';

        // Populate bio and quote
        const bio = document.getElementById('editBio');
        const quote = document.getElementById('editQuote');
        if (bio) bio.value = profile.bio || '';
        if (quote) quote.value = profile.quote || '';

        // Populate location
        const location = document.getElementById('editLocation');
        if (location) location.value = profile.location || '';

        // Populate subjects (as comma-separated or array)
        const subjectsInput = document.getElementById('editSubjects');
        if (subjectsInput) {
            if (Array.isArray(profile.subjects)) {
                subjectsInput.value = profile.subjects.join(', ');
            } else {
                subjectsInput.value = profile.subjects || '';
            }
        }

        // Populate preferred languages
        const languages = document.getElementById('editLanguages');
        if (languages) {
            if (Array.isArray(profile.preferred_languages)) {
                languages.value = profile.preferred_languages.join(', ');
            } else {
                languages.value = profile.preferred_languages || '';
            }
        }
    } else {
        console.error('❌ Profile data not available for edit modal');
        alert('Profile data not loaded. Please refresh the page.');
        return;
    }

    // Open modal
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
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

// Save Student Profile
async function saveStudentProfile() {
    try {
        const form = document.getElementById('editStudentProfileForm');
        if (!form) return;

        // Gather all form data
        const profileData = {
            first_name: document.getElementById('editFirstName')?.value,
            father_name: document.getElementById('editFatherName')?.value,
            grandfather_name: document.getElementById('editGrandFatherName')?.value,
            username: document.getElementById('editUsername')?.value,
            gender: document.getElementById('editGender')?.value,
            email: document.getElementById('editEmail')?.value,
            phone: document.getElementById('editPhone')?.value,
            grade_level: document.getElementById('editGradeLevel')?.value,
            bio: document.getElementById('editBio')?.value,
            quote: document.getElementById('editQuote')?.value,
            location: document.getElementById('editLocation')?.value
        };

        // Get subjects as array
        const subjectsInput = document.getElementById('editSubjects')?.value;
        if (subjectsInput) {
            profileData.subjects = subjectsInput.split(',').map(s => s.trim()).filter(s => s);
        }

        // Get preferred languages as array
        const languagesInput = document.getElementById('editLanguages')?.value;
        if (languagesInput) {
            profileData.preferred_languages = languagesInput.split(',').map(l => l.trim()).filter(l => l);
        }

        // Save via handler
        if (typeof StudentProfileEditHandler !== 'undefined') {
            await StudentProfileEditHandler.saveProfile(profileData);
        } else {
            console.error('StudentProfileEditHandler not available');
            alert('Failed to save profile - handler not available');
        }

    } catch (error) {
        console.error('Error in saveStudentProfile:', error);
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
        const dimensionsId = type === 'cover' ? 'coverDimensions' : 'profileDimensions';

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

        // Get image dimensions
        const img = new Image();
        img.onload = function() {
            const dimensionsEl = document.getElementById(dimensionsId);
            if (dimensionsEl) {
                dimensionsEl.textContent = `${img.width} x ${img.height}px`;
            }
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);

    // Store file for upload
    if (type === 'cover' && typeof StudentImageUploadHandler !== 'undefined') {
        StudentImageUploadHandler.currentUploads.coverPhoto = file;
    } else if (type === 'profile' && typeof StudentImageUploadHandler !== 'undefined') {
        StudentImageUploadHandler.currentUploads.profilePicture = file;
    }
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
    if (typeof StudentImageUploadHandler === 'undefined') {
        console.error('StudentImageUploadHandler not available');
        return;
    }

    if (type === 'cover') {
        if (!StudentImageUploadHandler.currentUploads.coverPhoto) {
            alert('Please select a cover photo first');
            return;
        }

        const progressEl = document.getElementById('coverProgress');
        if (progressEl) progressEl.style.display = 'block';

        animateUploadProgress(type, async () => {
            await StudentImageUploadHandler.uploadCoverPhoto();
        });
    } else if (type === 'profile') {
        if (!StudentImageUploadHandler.currentUploads.profilePicture) {
            alert('Please select a profile picture first');
            return;
        }

        const progressEl = document.getElementById('profileProgress');
        if (progressEl) progressEl.style.display = 'block';

        animateUploadProgress(type, async () => {
            await StudentImageUploadHandler.uploadProfilePicture();
        });
    }
}

// Animate Upload Progress
function animateUploadProgress(type, uploadCallback) {
    const progressFillId = type === 'cover' ? 'coverProgressFill' : 'profileProgressFill';
    const progressTextId = type === 'cover' ? 'coverProgressText' : 'profileProgressText';

    const progressFill = document.getElementById(progressFillId);
    const progressText = document.getElementById(progressTextId);

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;

        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = `Uploading... ${Math.round(progress)}%`;

        if (progress >= 90) {
            clearInterval(interval);
            uploadCallback().then(() => {
                if (progressFill) progressFill.style.width = '100%';
                if (progressText) progressText.textContent = 'Upload complete!';

                setTimeout(() => {
                    const progressContainer = document.getElementById(type + 'Progress');
                    if (progressContainer) progressContainer.style.display = 'none';
                }, 1000);
            });
        }
    }, 200);
}

// Reset Upload
function resetUpload(type) {
    const inputId = type === 'cover' ? 'coverInput' : 'profileInput';
    const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';
    const imageId = type === 'cover' ? 'coverPreviewImage' : 'profilePreviewImage';

    const input = document.getElementById(inputId);
    if (input) input.value = '';

    const preview = document.getElementById(previewId);
    if (preview) preview.style.display = 'none';

    const image = document.getElementById(imageId);
    if (image) image.src = '';

    // Clear stored file
    if (type === 'cover' && typeof StudentImageUploadHandler !== 'undefined') {
        StudentImageUploadHandler.currentUploads.coverPhoto = null;
    } else if (type === 'profile' && typeof StudentImageUploadHandler !== 'undefined') {
        StudentImageUploadHandler.currentUploads.profilePicture = null;
    }
}

// Share Profile
function shareProfile() {
    const profileUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: 'Check out my Astegni Student Profile',
            text: 'I\'m a student on Astegni. Check out my profile!',
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

// Export all functions to window
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveStudentProfile = saveStudentProfile;
window.openCoverUploadModal = openCoverUploadModal;
window.closeCoverUploadModal = closeCoverUploadModal;
window.openProfileUploadModal = openProfileUploadModal;
window.closeProfileUploadModal = closeProfileUploadModal;
window.handleImageSelect = handleImageSelect;
window.uploadImage = uploadImage;
window.resetUpload = resetUpload;
window.shareProfile = shareProfile;

// ============================================
// PARENT PORTAL FUNCTIONS
// ============================================

function openInviteParentModal() {
    const modal = document.getElementById('inviteParentModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Reset to step 1
        if (typeof parentPortalManager !== 'undefined') {
            parentPortalManager.showStep(1);
            // Clear search
            const searchInput = document.getElementById('parent-search-input');
            if (searchInput) searchInput.value = '';
            parentPortalManager.renderSearchPlaceholder();
        }
    }
}

function closeInviteParentModal() {
    const modal = document.getElementById('inviteParentModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Reset forms
        document.getElementById('inviteExistingParentForm')?.reset();
        document.getElementById('inviteNewParentForm')?.reset();
    }
}

window.openInviteParentModal = openInviteParentModal;
window.closeInviteParentModal = closeInviteParentModal;

// ============================================
// STUDENT REQUEST TYPE FILTER FUNCTIONS
// ============================================

let currentStudentRequestType = 'courses';
let currentStudentRequestStatus = 'all';

/**
 * Filter student requests by type (courses, schools, tutors, parenting)
 */
function filterStudentRequestType(type) {
    currentStudentRequestType = type;

    // Update active state on cards
    const cards = document.querySelectorAll('#my-requests-panel .request-type-card');
    cards.forEach(card => {
        if (card.getAttribute('data-type') === type) {
            card.classList.add('active');
            card.style.borderColor = 'var(--primary-color)';
            card.style.background = 'rgba(139, 92, 246, 0.05)';
        } else {
            card.classList.remove('active');
            card.style.borderColor = 'var(--border-color)';
            card.style.background = 'var(--card-bg)';
        }
    });

    // Show status tabs for all types
    const statusTabs = document.querySelector('#my-requests-panel .status-tabs');
    if (statusTabs) statusTabs.style.display = 'flex';

    // Load the appropriate content based on type
    if (type === 'courses') {
        loadStudentCourseRequests();
    } else if (type === 'schools') {
        loadStudentSchoolRequests();
    } else if (type === 'tutors') {
        loadStudentTutorRequests();
    } else if (type === 'parenting') {
        loadStudentParentingInvitations();
    }
}

/**
 * Filter student requests by status
 */
function filterStudentRequestStatus(status) {
    currentStudentRequestStatus = status;

    // Update active state on tabs
    const tabs = document.querySelectorAll('#my-requests-panel .status-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-status') === status) {
            tab.classList.add('active');
            tab.style.color = 'var(--primary-color)';
            tab.style.fontWeight = '600';
            tab.style.borderBottom = '2px solid var(--primary-color)';
        } else {
            tab.classList.remove('active');
            tab.style.color = 'var(--text-secondary)';
            tab.style.fontWeight = '400';
            tab.style.borderBottom = 'none';
        }
    });

    // Reload content based on current type and status
    filterStudentRequestType(currentStudentRequestType);
}

/**
 * Load parenting invitations - ONLY received invitations (for students who are also parents)
 * Sent invitations are already shown in Parent Portal panel
 */
async function loadStudentParentingInvitations() {
    const container = document.getElementById('student-requests-list');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading parenting invitations...</p>
            </div>
        `;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view parenting invitations</p>
                </div>
            `;
            return;
        }

        // Fetch ONLY received invitations (as parent) - sent invitations are in Parent Portal
        const response = await fetch('http://localhost:8000/api/parent/pending-invitations', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false })); // Gracefully handle if user is not a parent

        let receivedInvitations = [];

        if (response.ok) {
            const data = await response.json();
            receivedInvitations = data.invitations || [];
        }

        // Update count badge - only pending received invitations
        const pendingCount = receivedInvitations.filter(inv => inv.status === 'pending').length;

        const countBadge = document.getElementById('student-parenting-invitation-count');
        if (countBadge) {
            if (pendingCount > 0) {
                countBadge.textContent = pendingCount;
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }

        // If no received invitations
        if (receivedInvitations.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-user-friends text-3xl mb-3"></i>
                    <p>No parenting invitations received</p>
                    <p class="text-sm mt-2">You'll see invitations here when other students invite you as their parent</p>
                </div>
            `;
            return;
        }

        // Render received invitations
        container.innerHTML = `
            <div class="mb-8">
                <h3 class="text-lg font-bold mb-4" style="color: var(--heading);">
                    <i class="fas fa-inbox text-green-500 mr-2"></i>
                    Invitations Received (${receivedInvitations.length})
                </h3>
                <p class="text-sm text-gray-500 mb-4">Students inviting you as their parent</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${receivedInvitations.map(inv => renderReceivedParentingInvitationCard(inv)).join('')}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading parenting invitations:', error);
        container.innerHTML = `
            <div class="card p-6 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load parenting invitations</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a parenting invitation card (student view - shows invitations they sent)
 */
function renderStudentParentingInvitationCard(invitation) {
    const parentInitial = (invitation.parent_name || 'P').charAt(0).toUpperCase();
    const createdDate = new Date(invitation.created_at);
    const timeAgo = getTimeAgo(createdDate);

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (invitation.status === 'pending') {
        statusBadge = '<span style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>';
        statusColor = '#FFA500';
    } else if (invitation.status === 'accepted') {
        statusBadge = '<span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Accepted</span>';
        statusColor = '#10B981';
    } else {
        statusBadge = '<span style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';
        statusColor = '#EF4444';
    }

    // Contact info (for new users)
    let contactInfo = '';
    if (invitation.is_new_user) {
        if (invitation.parent_email) {
            contactInfo = `<p class="text-xs" style="color: var(--text-secondary);"><i class="fas fa-envelope"></i> ${invitation.parent_email}</p>`;
        } else if (invitation.parent_phone) {
            contactInfo = `<p class="text-xs" style="color: var(--text-secondary);"><i class="fas fa-phone"></i> ${invitation.parent_phone}</p>`;
        }
    }

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <!-- Parent Avatar (Initial) -->
                    <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">
                        ${parentInitial}
                    </div>
                    <div>
                        <h4 class="font-bold text-lg" style="color: var(--heading);">
                            ${invitation.parent_name || 'Pending User'}
                        </h4>
                        ${contactInfo}
                    </div>
                </div>
                ${statusBadge}
            </div>

            <div class="mb-3 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); border: 1px solid rgba(139, 92, 246, 0.2);">
                <p class="text-sm" style="color: var(--text-secondary);">Relationship</p>
                <p class="font-semibold" style="color: #8B5CF6;">${invitation.relationship_type || 'Parent'}</p>
            </div>

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Sent ${timeAgo}</span>
                ${invitation.is_new_user ? '<span class="text-purple-500"><i class="fas fa-user-plus"></i> New User</span>' : ''}
            </div>

            ${invitation.status === 'pending' && invitation.is_new_user ? `
                <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-color);">
                    <p class="text-xs text-gray-500 mb-2">Awaiting login with temporary password</p>
                    <button onclick="resendParentInvitation(${invitation.id})" class="btn-secondary w-full" style="padding: 6px 12px; font-size: 0.75rem;">
                        <i class="fas fa-paper-plane"></i> Resend Invitation
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }

    return 'Just now';
}

/**
 * Resend parent invitation (for new users who haven't logged in yet)
 */
async function resendParentInvitation(invitationId) {
    alert('Resend invitation feature coming soon! For now, please share the temporary password directly with the parent.');
}

/**
 * Render a received parenting invitation card (for students who are also parents)
 * Shows invitations from other students who want this user to be their parent
 */
function renderReceivedParentingInvitationCard(invitation) {
    const studentInitial = (invitation.student_name || 'S').charAt(0).toUpperCase();
    const createdDate = new Date(invitation.created_at);
    const timeAgo = getTimeAgo(createdDate);

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (invitation.status === 'pending') {
        statusBadge = '<span style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>';
        statusColor = '#FFA500';
    } else if (invitation.status === 'accepted') {
        statusBadge = '<span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Accepted</span>';
        statusColor = '#10B981';
    } else {
        statusBadge = '<span style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';
        statusColor = '#EF4444';
    }

    // Action buttons for pending invitations
    let actionButtons = '';
    if (invitation.status === 'pending') {
        actionButtons = `
            <div class="mt-3 pt-3 flex gap-2" style="border-top: 1px solid var(--border-color);">
                <button onclick="acceptStudentParentInvitation(${invitation.id})" class="flex-1 py-2 px-4 rounded-lg text-white font-medium" style="background: linear-gradient(135deg, #10B981, #059669);">
                    <i class="fas fa-check mr-1"></i> Accept
                </button>
                <button onclick="rejectStudentParentInvitation(${invitation.id})" class="flex-1 py-2 px-4 rounded-lg text-white font-medium" style="background: linear-gradient(135deg, #EF4444, #DC2626);">
                    <i class="fas fa-times mr-1"></i> Reject
                </button>
            </div>
        `;
    }

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <!-- Student Avatar (Initial) -->
                    <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #10B981, #059669); color: white; font-size: 1.25rem; font-weight: bold;">
                        ${studentInitial}
                    </div>
                    <div>
                        <h4 class="font-bold text-lg" style="color: var(--heading);">
                            ${invitation.student_name || 'Student'}
                        </h4>
                        <p class="text-xs" style="color: var(--text-secondary);">
                            <i class="fas fa-user-graduate"></i> Student
                        </p>
                    </div>
                </div>
                ${statusBadge}
            </div>

            <div class="mb-3 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border: 1px solid rgba(16, 185, 129, 0.2);">
                <p class="text-sm" style="color: var(--text-secondary);">Wants you as their</p>
                <p class="font-semibold" style="color: #10B981;">${invitation.relationship_type || 'Parent'}</p>
            </div>

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Received ${timeAgo}</span>
            </div>

            ${actionButtons}
        </div>
    `;
}

/**
 * Accept a parenting invitation (for students who are also parents)
 */
async function acceptStudentParentInvitation(invitationId) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to accept invitations');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/parent/invitation/${invitationId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to accept invitation');
        }

        alert('Invitation accepted! You are now connected as this student\'s parent.');
        loadStudentParentingInvitations(); // Refresh the list

    } catch (error) {
        console.error('Error accepting invitation:', error);
        alert('Failed to accept invitation: ' + error.message);
    }
}

/**
 * Reject a parenting invitation (for students who are also parents)
 */
async function rejectStudentParentInvitation(invitationId) {
    if (!confirm('Are you sure you want to reject this parenting invitation?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to reject invitations');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/parent/invitation/${invitationId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to reject invitation');
        }

        alert('Invitation rejected.');
        loadStudentParentingInvitations(); // Refresh the list

    } catch (error) {
        console.error('Error rejecting invitation:', error);
        alert('Failed to reject invitation: ' + error.message);
    }
}

// ============================================
// COURSE REQUESTS LOADING FUNCTION
// ============================================

/**
 * Load course requests from API
 * Reads from courses table where uploader_id = current user
 */
async function loadStudentCourseRequests() {
    const container = document.getElementById('student-requests-list');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading course requests...</p>
            </div>
        `;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your course requests</p>
                </div>
            `;
            return;
        }

        // Build API URL with status filter
        let apiUrl = 'http://localhost:8000/api/student/my-course-requests';
        if (currentStudentRequestStatus && currentStudentRequestStatus !== 'all') {
            apiUrl += `?status=${currentStudentRequestStatus}`;
        }

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch course requests');
        }

        const courses = await response.json();
        console.log('[Course Requests] Loaded:', courses.length, 'courses');

        // Update count badge
        updateRequestCountBadge('courses', courses.length);

        if (courses.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-book text-3xl mb-3"></i>
                    <p>No course requests found</p>
                    <p class="text-sm mt-2">Courses you upload for verification will appear here</p>
                </div>
            `;
            return;
        }

        // Render course cards
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${courses.map(course => renderCourseRequestCard(course)).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading course requests:', error);
        container.innerHTML = `
            <div class="card p-6 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load course requests</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a course request card
 */
function renderCourseRequestCard(course) {
    const createdDate = course.created_at ? new Date(course.created_at) : null;
    const timeAgo = createdDate ? getTimeAgo(createdDate) : 'Unknown';

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (course.status === 'pending') {
        statusBadge = '<span style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>';
        statusColor = '#FFA500';
    } else if (course.status === 'verified') {
        statusBadge = '<span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Verified</span>';
        statusColor = '#10B981';
    } else if (course.status === 'rejected') {
        statusBadge = '<span style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';
        statusColor = '#EF4444';
    }

    // Thumbnail or placeholder
    const thumbnail = course.thumbnail || 'system_images/course-placeholder.jpg';

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="relative mb-3">
                <img src="${thumbnail}" alt="${course.course_name}"
                     class="w-full h-32 object-cover rounded-lg"
                     onerror="this.src='system_images/course-placeholder.jpg'">
                <div class="absolute top-2 right-2">${statusBadge}</div>
            </div>

            <h4 class="font-bold text-lg mb-2" style="color: var(--heading);">
                ${course.course_name || 'Untitled Course'}
            </h4>

            <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 rounded text-xs" style="background: rgba(139, 92, 246, 0.1); color: #8B5CF6;">
                    ${course.course_category || 'Uncategorized'}
                </span>
                ${course.course_level ? `
                    <span class="px-2 py-1 rounded text-xs" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
                        ${course.course_level}
                    </span>
                ` : ''}
            </div>

            ${course.course_description ? `
                <p class="text-sm mb-3" style="color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${course.course_description}
                </p>
            ` : ''}

            ${course.status === 'rejected' && course.status_reason ? `
                <div class="p-2 rounded mb-3" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
                    <p class="text-xs" style="color: #EF4444;">
                        <i class="fas fa-info-circle mr-1"></i> ${course.status_reason}
                    </p>
                </div>
            ` : ''}

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Submitted ${timeAgo}</span>
            </div>
        </div>
    `;
}

// ============================================
// SCHOOL REQUESTS LOADING FUNCTION
// ============================================

/**
 * Load school requests from API
 * Reads from schools table where requester_id = current user
 */
async function loadStudentSchoolRequests() {
    const container = document.getElementById('student-requests-list');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading school requests...</p>
            </div>
        `;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your school requests</p>
                </div>
            `;
            return;
        }

        // Build API URL with status filter
        let apiUrl = 'http://localhost:8000/api/student/my-school-requests';
        if (currentStudentRequestStatus && currentStudentRequestStatus !== 'all') {
            apiUrl += `?status=${currentStudentRequestStatus}`;
        }

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch school requests');
        }

        const schools = await response.json();
        console.log('[School Requests] Loaded:', schools.length, 'schools');

        // Update count badge
        updateRequestCountBadge('schools', schools.length);

        if (schools.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-school text-3xl mb-3"></i>
                    <p>No school requests found</p>
                    <p class="text-sm mt-2">Schools you register for verification will appear here</p>
                </div>
            `;
            return;
        }

        // Render school cards
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${schools.map(school => renderSchoolRequestCard(school)).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading school requests:', error);
        container.innerHTML = `
            <div class="card p-6 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load school requests</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a school request card
 */
function renderSchoolRequestCard(school) {
    const createdDate = school.created_at ? new Date(school.created_at) : null;
    const timeAgo = createdDate ? getTimeAgo(createdDate) : 'Unknown';

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (school.status === 'pending') {
        statusBadge = '<span style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>';
        statusColor = '#FFA500';
    } else if (school.status === 'verified') {
        statusBadge = '<span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Verified</span>';
        statusColor = '#10B981';
    } else if (school.status === 'rejected') {
        statusBadge = '<span style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';
        statusColor = '#EF4444';
    } else if (school.status === 'suspended') {
        statusBadge = '<span style="background: #6B7280; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Suspended</span>';
        statusColor = '#6B7280';
    }

    // Location display
    const location = Array.isArray(school.location) ? school.location.join(', ') : (school.location || 'Location not specified');

    // Level display
    const level = Array.isArray(school.level) ? school.level.join(', ') : (school.level || '');

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div style="width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3B82F6, #1D4ED8); color: white; font-size: 1.5rem;">
                        <i class="fas fa-school"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-lg" style="color: var(--heading);">
                            ${school.name || 'Unnamed School'}
                        </h4>
                        <p class="text-xs" style="color: var(--text-secondary);">
                            ${school.type || 'School'}
                        </p>
                    </div>
                </div>
                ${statusBadge}
            </div>

            ${level ? `
                <div class="mb-3 p-2 rounded-lg" style="background: rgba(59, 130, 246, 0.1);">
                    <p class="text-sm" style="color: var(--text-secondary);">Levels</p>
                    <p class="font-medium" style="color: #3B82F6;">${level}</p>
                </div>
            ` : ''}

            <div class="mb-3">
                <p class="text-sm flex items-center gap-2" style="color: var(--text-secondary);">
                    <i class="fas fa-map-marker-alt text-red-500"></i>
                    ${location}
                </p>
            </div>

            ${school.status === 'rejected' && school.status_reason ? `
                <div class="p-2 rounded mb-3" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
                    <p class="text-xs" style="color: #EF4444;">
                        <i class="fas fa-info-circle mr-1"></i> ${school.status_reason}
                    </p>
                </div>
            ` : ''}

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Submitted ${timeAgo}</span>
            </div>
        </div>
    `;
}

// ============================================
// TUTOR REQUESTS LOADING FUNCTION
// ============================================

/**
 * Load tutor session requests from API
 * Reads from requested_sessions table where requester = current user
 */
async function loadStudentTutorRequests() {
    const container = document.getElementById('student-requests-list');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading tutor requests...</p>
            </div>
        `;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your tutor requests</p>
                </div>
            `;
            return;
        }

        const response = await fetch('http://localhost:8000/api/session-requests/my-requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch tutor requests');
        }

        let tutorRequests = await response.json();
        console.log('[Tutor Requests] Loaded:', tutorRequests.length, 'requests');

        // Filter by status if not 'all'
        if (currentStudentRequestStatus && currentStudentRequestStatus !== 'all') {
            tutorRequests = tutorRequests.filter(req => req.status === currentStudentRequestStatus);
        }

        // Update count badge
        updateRequestCountBadge('tutors', tutorRequests.length);

        if (tutorRequests.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-chalkboard-teacher text-3xl mb-3"></i>
                    <p>No tutor requests found</p>
                    <p class="text-sm mt-2">Session requests you send to tutors will appear here</p>
                </div>
            `;
            return;
        }

        // Render tutor request cards
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${tutorRequests.map(req => renderTutorRequestCard(req)).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading tutor requests:', error);
        container.innerHTML = `
            <div class="card p-6 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load tutor requests</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a tutor request card
 */
function renderTutorRequestCard(request) {
    const createdDate = request.created_at ? new Date(request.created_at) : null;
    const timeAgo = createdDate ? getTimeAgo(createdDate) : 'Unknown';

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (request.status === 'pending') {
        statusBadge = '<span style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>';
        statusColor = '#FFA500';
    } else if (request.status === 'accepted') {
        statusBadge = '<span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Accepted</span>';
        statusColor = '#10B981';
    } else if (request.status === 'rejected') {
        statusBadge = '<span style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';
        statusColor = '#EF4444';
    }

    // Tutor info
    const tutorName = request.requester_name || 'Unknown Tutor';
    const tutorInitial = tutorName.charAt(0).toUpperCase();
    const tutorImage = request.requester_profile_picture;

    return `
        <div class="card p-4" style="border: 2px solid ${statusColor}; border-radius: 12px;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    ${tutorImage ? `
                        <img src="${tutorImage}" alt="${tutorName}"
                             class="w-12 h-12 rounded-full object-cover"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="width: 48px; height: 48px; border-radius: 50%; display: none; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">
                            ${tutorInitial}
                        </div>
                    ` : `
                        <div style="width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">
                            ${tutorInitial}
                        </div>
                    `}
                    <div>
                        <h4 class="font-bold" style="color: var(--heading);">
                            ${tutorName}
                        </h4>
                        <p class="text-xs" style="color: var(--text-secondary);">
                            <i class="fas fa-chalkboard-teacher"></i> Tutor
                        </p>
                    </div>
                </div>
                ${statusBadge}
            </div>

            ${request.package_name ? `
                <div class="mb-3 p-2 rounded-lg" style="background: rgba(139, 92, 246, 0.1);">
                    <p class="text-sm" style="color: var(--text-secondary);">Package</p>
                    <p class="font-medium" style="color: #8B5CF6;">${request.package_name}</p>
                </div>
            ` : ''}

            ${request.message ? `
                <p class="text-sm mb-3" style="color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    "${request.message}"
                </p>
            ` : ''}

            ${request.status === 'rejected' && request.rejected_reason ? `
                <div class="p-2 rounded mb-3" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
                    <p class="text-xs" style="color: #EF4444;">
                        <i class="fas fa-info-circle mr-1"></i> ${request.rejected_reason}
                    </p>
                </div>
            ` : ''}

            <div class="flex items-center justify-between text-xs" style="color: var(--text-secondary);">
                <span><i class="fas fa-clock"></i> Sent ${timeAgo}</span>
                ${request.status === 'accepted' ? `
                    <a href="view-profiles/view-tutor.html?id=${request.tutor_id}"
                       class="text-purple-500 hover:underline">
                        <i class="fas fa-external-link-alt"></i> View Tutor
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update request count badge on type cards
 */
function updateRequestCountBadge(type, count) {
    const badgeId = `student-${type}-request-count`;
    const badge = document.getElementById(badgeId);
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

/**
 * Load all request counts for badges
 */
async function loadStudentRequestCounts() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch('http://localhost:8000/api/student/my-requests/counts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const counts = await response.json();
        console.log('[Request Counts]', counts);

        // Update badges with total counts
        updateRequestCountBadge('courses', counts.courses?.total || 0);
        updateRequestCountBadge('schools', counts.schools?.total || 0);
        updateRequestCountBadge('tutors', counts.tutors?.total || 0);
        updateRequestCountBadge('parenting', counts.parenting?.total || 0);

    } catch (error) {
        console.error('Error loading request counts:', error);
    }
}

// Export functions
window.filterStudentRequestType = filterStudentRequestType;
window.filterStudentRequestStatus = filterStudentRequestStatus;
window.loadStudentParentingInvitations = loadStudentParentingInvitations;
window.resendParentInvitation = resendParentInvitation;
window.renderReceivedParentingInvitationCard = renderReceivedParentingInvitationCard;
window.acceptStudentParentInvitation = acceptStudentParentInvitation;
window.rejectStudentParentInvitation = rejectStudentParentInvitation;
window.loadStudentCourseRequests = loadStudentCourseRequests;
window.loadStudentSchoolRequests = loadStudentSchoolRequests;
window.loadStudentTutorRequests = loadStudentTutorRequests;
window.loadStudentRequestCounts = loadStudentRequestCounts;


// ============================================
// SCHEDULE PANEL FUNCTIONS
// ============================================

/**
 * Load student schedules from the database
 * @param {string} statusFilter - Optional status filter (all, active, completed, cancelled)
 * @param {string} typeFilter - Optional type filter (all, one-time, recurring, class)
 */
async function loadStudentSchedules(statusFilter = 'all', typeFilter = 'all') {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            console.error('[Schedule] No token available');
            renderScheduleEmptyState('Please log in to view your schedules');
            return;
        }

        console.log(`[Schedule] Loading schedules - status: ${statusFilter}, type: ${typeFilter}`);

        // Show loading state
        const calendarContainer = document.getElementById('schedule-calendar');
        if (calendarContainer) {
            calendarContainer.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p class="text-gray-600 dark:text-gray-400">Loading your schedules...</p>
                    </div>
                </div>
            `;
        }

        // Build URL with filters
        let url = 'http://localhost:8000/api/student/my-schedules';
        const params = new URLSearchParams();
        if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
        if (typeFilter && typeFilter !== 'all') params.append('schedule_type', typeFilter);
        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const schedules = await response.json();
        console.log(`[Schedule] Loaded ${schedules.length} schedules`);

        // Render schedules
        renderScheduleList(schedules);

    } catch (error) {
        console.error('[Schedule] Error loading schedules:', error);
        renderScheduleEmptyState('Failed to load schedules. Please try again.');
    }
}

/**
 * Render schedule list
 * @param {Array} schedules - Array of schedule objects
 */
function renderScheduleList(schedules) {
    const calendarContainer = document.getElementById('schedule-calendar');
    if (!calendarContainer) return;

    if (!schedules || schedules.length === 0) {
        renderScheduleEmptyState('No schedules found. Click "+ Schedule Session" to create one.');
        return;
    }

    // Group schedules by status
    const activeSchedules = schedules.filter(s => s.status === 'active');
    const completedSchedules = schedules.filter(s => s.status === 'completed');
    const cancelledSchedules = schedules.filter(s => s.status === 'cancelled');

    let html = `
        <!-- Schedule Filters -->
        <div class="flex flex-wrap gap-4 mb-6">
            <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                <select id="schedule-status-filter" onchange="filterSchedules()" class="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
                <select id="schedule-type-filter" onchange="filterSchedules()" class="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">All Types</option>
                    <option value="one-time">One-time</option>
                    <option value="recurring">Recurring</option>
                    <option value="class">Class</option>
                </select>
            </div>
            <div class="ml-auto text-sm text-gray-500">
                <span class="font-semibold">${schedules.length}</span> total schedules
            </div>
        </div>

        <!-- Schedule Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="schedules-grid">
    `;

    // Render all schedules
    schedules.forEach(schedule => {
        html += renderScheduleCard(schedule);
    });

    html += `</div>`;

    calendarContainer.innerHTML = html;
}

/**
 * Render a single schedule card
 * @param {Object} schedule - Schedule object
 */
function renderScheduleCard(schedule) {
    const statusColors = {
        'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    const priorityColors = {
        'low': 'border-l-gray-400',
        'normal': 'border-l-blue-500',
        'high': 'border-l-orange-500',
        'urgent': 'border-l-red-500'
    };

    const typeIcons = {
        'one-time': '📅',
        'recurring': '🔄',
        'class': '📚'
    };

    const statusColor = statusColors[schedule.status] || statusColors.active;
    const priorityColor = priorityColors[schedule.priority_level] || priorityColors.normal;
    const typeIcon = typeIcons[schedule.schedule_type] || '📅';

    // Format time display
    let timeDisplay = '';
    if (schedule.start_time) {
        timeDisplay = schedule.start_time;
        if (schedule.end_time) {
            timeDisplay += ` - ${schedule.end_time}`;
        }
    }

    // Format days display
    let daysDisplay = '';
    if (schedule.days && schedule.days.length > 0) {
        daysDisplay = schedule.days.join(', ');
    }

    // Format specific dates display
    let datesDisplay = '';
    if (schedule.specific_dates && schedule.specific_dates.length > 0) {
        datesDisplay = schedule.specific_dates.slice(0, 3).join(', ');
        if (schedule.specific_dates.length > 3) {
            datesDisplay += ` +${schedule.specific_dates.length - 3} more`;
        }
    }

    return `
        <div class="schedule-card card p-4 border-l-4 ${priorityColor} hover:shadow-lg transition-shadow cursor-pointer"
             onclick="openScheduleDetailModal(${schedule.id})" data-schedule-id="${schedule.id}">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${typeIcon}</span>
                    <h4 class="font-semibold text-gray-900 dark:text-white line-clamp-1">${schedule.title}</h4>
                </div>
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor}">${schedule.status}</span>
            </div>

            ${schedule.description ? `
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">${schedule.description}</p>
            ` : ''}

            <div class="space-y-2 text-sm">
                ${timeDisplay ? `
                    <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>🕐</span>
                        <span>${timeDisplay}</span>
                    </div>
                ` : ''}

                ${daysDisplay ? `
                    <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>📆</span>
                        <span>${daysDisplay}</span>
                    </div>
                ` : ''}

                ${datesDisplay ? `
                    <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>📌</span>
                        <span>${datesDisplay}</span>
                    </div>
                ` : ''}

                ${schedule.alarm_enabled ? `
                    <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>🔔</span>
                        <span>${schedule.alarm_before_minutes} min before</span>
                    </div>
                ` : ''}
            </div>

            <div class="flex items-center justify-between mt-4 pt-3 border-t dark:border-gray-700">
                <span class="text-xs text-gray-500">${schedule.schedule_type}</span>
                <div class="flex gap-2">
                    ${schedule.status === 'active' ? `
                        <button onclick="event.stopPropagation(); markScheduleComplete(${schedule.id})"
                                class="text-green-600 hover:text-green-800 text-sm" title="Mark Complete">
                            ✓
                        </button>
                    ` : ''}
                    <button onclick="event.stopPropagation(); openEditScheduleModal(${schedule.id})"
                            class="text-blue-600 hover:text-blue-800 text-sm" title="Edit">
                        ✏️
                    </button>
                    <button onclick="event.stopPropagation(); confirmDeleteSchedule(${schedule.id})"
                            class="text-red-600 hover:text-red-800 text-sm" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render empty state for schedule panel
 * @param {string} message - Message to display
 */
function renderScheduleEmptyState(message) {
    const calendarContainer = document.getElementById('schedule-calendar');
    if (calendarContainer) {
        calendarContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="text-6xl mb-4">📅</div>
                <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Schedules Yet</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md">${message}</p>
                <button onclick="openCreateScheduleModal()" class="btn-primary px-6 py-2">
                    + Create Your First Schedule
                </button>
            </div>
        `;
    }
}

/**
 * Filter schedules by status and type
 */
function filterSchedules() {
    const statusFilter = document.getElementById('schedule-status-filter')?.value || 'all';
    const typeFilter = document.getElementById('schedule-type-filter')?.value || 'all';
    loadStudentSchedules(statusFilter, typeFilter);
}

/**
 * Mark a schedule as complete
 * @param {number} scheduleId - ID of the schedule to complete
 */
async function markScheduleComplete(scheduleId) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`http://localhost:8000/api/student/schedules/${scheduleId}/status?status=completed`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            console.log('[Schedule] Marked as complete:', scheduleId);
            loadStudentSchedules(); // Refresh list
        } else {
            throw new Error('Failed to update status');
        }
    } catch (error) {
        console.error('[Schedule] Error marking complete:', error);
        alert('Failed to update schedule status');
    }
}

/**
 * Confirm and delete a schedule
 * @param {number} scheduleId - ID of the schedule to delete
 */
async function confirmDeleteSchedule(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`http://localhost:8000/api/student/schedules/${scheduleId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            console.log('[Schedule] Deleted schedule:', scheduleId);
            loadStudentSchedules(); // Refresh list
        } else {
            throw new Error('Failed to delete schedule');
        }
    } catch (error) {
        console.error('[Schedule] Error deleting:', error);
        alert('Failed to delete schedule');
    }
}

/**
 * Open create schedule modal
 */
function openCreateScheduleModal() {
    console.log('[Schedule Modal] Opening create schedule modal');

    const modal = document.getElementById('scheduleModal');
    if (!modal) {
        console.error('[Schedule Modal] scheduleModal not found in DOM');
        // Try loading it via ModalLoader if available
        if (typeof ModalLoader !== 'undefined') {
            ModalLoader.load('scheduleModal').then(() => {
                setTimeout(() => openCreateScheduleModal(), 100);
            });
        } else {
            openComingSoonModal('Create Schedule');
        }
        return;
    }

    // Reset form for create mode
    const form = document.getElementById('scheduleForm');
    if (form) form.reset();

    // Clear editing ID (indicates create mode)
    const editingIdField = document.getElementById('editing-schedule-id');
    if (editingIdField) editingIdField.value = '';

    // Update modal title
    const titleEl = document.getElementById('schedule-modal-title');
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-calendar-plus"></i> Create Study Schedule';

    // Update submit button text
    const submitBtn = document.getElementById('schedule-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Schedule';

    // Set default values
    const yearFromInput = document.getElementById('schedule-year-from');
    if (yearFromInput) yearFromInput.value = new Date().getFullYear();

    // Reset priority slider
    const prioritySlider = document.getElementById('schedule-priority');
    if (prioritySlider) {
        prioritySlider.value = 3;
        if (typeof updatePriorityLabel === 'function') {
            updatePriorityLabel(3);
        }
    }

    // Reset specific dates array and UI
    if (typeof resetSpecificDates === 'function') {
        resetSpecificDates();
    }

    // Ensure recurring schedule type is selected by default and toggle sections
    const recurringRadio = document.querySelector('input[name="schedule-type"][value="recurring"]');
    if (recurringRadio) {
        recurringRadio.checked = true;
    }
    if (typeof toggleScheduleType === 'function') {
        toggleScheduleType();
    }

    // Show the modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Open edit schedule modal
 * @param {number} scheduleId - ID of the schedule to edit
 */
async function openEditScheduleModal(scheduleId) {
    console.log('[Schedule Modal] Opening edit schedule modal for ID:', scheduleId);

    const modal = document.getElementById('scheduleModal');
    if (!modal) {
        console.error('[Schedule Modal] scheduleModal not found in DOM');
        openComingSoonModal('Edit Schedule');
        return;
    }

    try {
        // Fetch schedule details
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/student/my-schedules/${scheduleId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch schedule details');

        const schedule = await response.json();

        // Populate form with schedule data
        populateScheduleForm(schedule);

        // Set editing ID
        const editingIdField = document.getElementById('editing-schedule-id');
        if (editingIdField) editingIdField.value = scheduleId;

        // Update modal title
        const titleEl = document.getElementById('schedule-modal-title');
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-calendar-edit"></i> Edit Schedule';

        // Update submit button text
        const submitBtn = document.getElementById('schedule-submit-btn');
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';

        // Show the modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error('[Schedule Modal] Error loading schedule:', error);
        alert('Failed to load schedule details');
    }
}

/**
 * Populate schedule form with data
 * @param {Object} schedule - Schedule data object
 */
function populateScheduleForm(schedule) {
    // Title and description
    const titleInput = document.getElementById('schedule-title');
    const descInput = document.getElementById('schedule-description');
    if (titleInput) titleInput.value = schedule.title || '';
    if (descInput) descInput.value = schedule.description || '';

    // Priority
    const prioritySlider = document.getElementById('schedule-priority');
    if (prioritySlider && schedule.priority) {
        prioritySlider.value = schedule.priority;
        if (typeof updatePriorityLabel === 'function') {
            updatePriorityLabel(schedule.priority);
        }
    }

    // Time
    const startTimeInput = document.getElementById('schedule-start-time');
    const endTimeInput = document.getElementById('schedule-end-time');
    if (startTimeInput && schedule.start_time) startTimeInput.value = schedule.start_time;
    if (endTimeInput && schedule.end_time) endTimeInput.value = schedule.end_time;

    // Notes
    const notesInput = document.getElementById('schedule-notes');
    if (notesInput) notesInput.value = schedule.notes || '';

    // Is featured
    const featuredCheckbox = document.getElementById('schedule-is-featured');
    if (featuredCheckbox) featuredCheckbox.checked = schedule.is_featured || false;
}

/**
 * Close schedule modal
 */
function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

/**
 * Save schedule (create or update)
 */
async function saveSchedule() {
    console.log('[Schedule Modal] Saving schedule...');

    const editingId = document.getElementById('editing-schedule-id')?.value;
    const isEditing = editingId && editingId !== '';

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to create schedules');
            return;
        }

        // Get form values
        const title = document.getElementById('schedule-title')?.value?.trim();
        const description = document.getElementById('schedule-description')?.value || '';
        const priority = parseInt(document.getElementById('schedule-priority')?.value) || 3;
        const startTime = document.getElementById('schedule-start-time')?.value || null;
        const endTime = document.getElementById('schedule-end-time')?.value || null;
        const notes = document.getElementById('schedule-notes')?.value || '';
        const isFeatured = document.getElementById('schedule-is-featured')?.checked || false;

        // Get year value from schedule-year-from (this is the primary year)
        const yearFrom = document.getElementById('schedule-year-from')?.value;
        const yearTo = document.getElementById('schedule-year-to')?.value;
        const year = yearFrom ? parseInt(yearFrom) : new Date().getFullYear();

        // Validation
        if (!title) {
            alert('Please enter a schedule title');
            return;
        }
        if (!startTime || !endTime) {
            alert('Please specify start and end times');
            return;
        }

        // Map priority number to priority level name
        const priorityMap = {
            1: 'low',
            2: 'normal',
            3: 'important',
            4: 'very_important',
            5: 'critical'
        };

        // Gather form data matching backend ScheduleCreateRequest model
        const scheduleData = {
            title: title,
            description: description,
            schedule_type: 'recurring',  // Default, will be overwritten below
            year: year,
            start_time: startTime,
            end_time: endTime,
            notes: notes,
            priority_level: priorityMap[priority] || 'normal',
            alarm_enabled: document.getElementById('enable-alarm')?.checked || false,
            alarm_before_minutes: parseInt(document.getElementById('alarm-before')?.value) || 15,
            notification_browser: document.querySelector('input[name="notification-browser"]')?.checked || true,
            notification_sound: document.querySelector('input[name="notification-sound"]')?.checked || true
        };

        // Get schedule type (recurring or specific)
        const scheduleTypeRadio = document.querySelector('input[name="schedule-type"]:checked');
        const scheduleType = scheduleTypeRadio?.value || 'recurring';
        scheduleData.schedule_type = scheduleType;

        if (scheduleType === 'recurring') {
            // Get months
            const months = Array.from(document.querySelectorAll('input[name="schedule-month"]:checked'))
                .map(cb => cb.value);
            scheduleData.months = months;

            // Get days
            const days = Array.from(document.querySelectorAll('input[name="schedule-day"]:checked'))
                .map(cb => cb.value);
            scheduleData.days = days;

            // Validation for recurring
            if (months.length === 0) {
                alert('Please select at least one month');
                return;
            }
            if (days.length === 0) {
                alert('Please select at least one day');
                return;
            }
        } else {
            // Specific dates - use the selectedSpecificDates array
            scheduleData.specific_dates = selectedSpecificDates || [];
            scheduleData.schedule_type = 'specific';

            if (scheduleData.specific_dates.length === 0) {
                alert('Please add at least one specific date');
                return;
            }
        }

        console.log('[Schedule Modal] Schedule data:', scheduleData);

        // Send to backend
        const url = isEditing
            ? `http://localhost:8000/api/student/schedules/${editingId}`
            : 'http://localhost:8000/api/student/schedules';

        const response = await fetch(url, {
            method: isEditing ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scheduleData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save schedule');
        }

        const result = await response.json();
        console.log('[Schedule Modal] Schedule saved successfully:', result);

        // Close modal
        closeScheduleModal();

        // Refresh schedules list
        loadStudentSchedules();

        // Load updated counts
        loadSchedulePanelCounts();

        // Show success message
        alert(isEditing ? 'Schedule updated successfully!' : 'Schedule created successfully!');

    } catch (error) {
        console.error('[Schedule Modal] Error saving schedule:', error);
        alert(error.message || 'Failed to save schedule');
    }
}

/**
 * Toggle schedule type (recurring vs specific dates)
 */
function toggleScheduleType() {
    const recurringSection = document.getElementById('recurring-schedule-section');
    const specificSection = document.getElementById('specific-dates-section');
    const selectedType = document.querySelector('input[name="schedule-type"]:checked')?.value;

    if (selectedType === 'recurring') {
        if (recurringSection) recurringSection.style.display = 'block';
        if (specificSection) specificSection.style.display = 'none';
    } else {
        if (recurringSection) recurringSection.style.display = 'none';
        if (specificSection) specificSection.style.display = 'block';
    }
}

/**
 * Update priority label based on slider value
 */
function updatePriorityLabel(value) {
    const label = document.getElementById('priority-label');
    if (!label) return;

    const priorities = {
        1: { text: 'Low', bg: '#10B981' },
        2: { text: 'Normal', bg: '#3B82F6' },
        3: { text: 'Important', bg: '#F59E0B' },
        4: { text: 'Very Important', bg: '#EF4444' },
        5: { text: 'Highly Critical', bg: '#DC2626' }
    };

    const priority = priorities[value] || priorities[3];
    label.textContent = priority.text;
    label.style.background = priority.bg;
}

/**
 * Toggle alarm settings visibility
 */
function toggleAlarmSettings() {
    const details = document.getElementById('alarm-settings-details');
    const checkbox = document.getElementById('enable-alarm');

    if (details && checkbox) {
        details.style.display = checkbox.checked ? 'block' : 'none';
    }
}

/**
 * Open schedule detail modal
 * @param {number} scheduleId - ID of the schedule to view
 */
function openScheduleDetailModal(scheduleId) {
    // For now, open edit modal which shows details
    openEditScheduleModal(scheduleId);
}

// ============================================
// SPECIFIC DATES MANAGEMENT (for "specific" schedule type)
// ============================================

// Track selected specific dates for specific schedule type
let selectedSpecificDates = [];
let lastFromDate = null;
let additionalDateRangeCounter = 0;

/**
 * Handle From Date change - add single date immediately
 */
function handleFromDateChange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');
    const fromDate = fromDateInput?.value;

    if (!fromDate) {
        lastFromDate = null;
        return;
    }

    // Add the single "From Date" immediately
    if (!selectedSpecificDates.includes(fromDate)) {
        selectedSpecificDates.push(fromDate);
        lastFromDate = fromDate;

        // Update UI
        updateSelectedDatesList();

        // Show feedback
        console.log('[Schedule] Added 1 date to schedule');
    } else {
        console.log('[Schedule] This date is already added');
        lastFromDate = fromDate;
    }

    // Clear "To Date" field for fresh input
    if (toDateInput) toDateInput.value = '';
}

/**
 * Handle To Date change - expand to date range
 */
function handleToDateChange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');
    const fromDate = fromDateInput?.value;
    const toDate = toDateInput?.value;

    if (!fromDate || !toDate) {
        return;
    }

    // Validate date range
    if (fromDate > toDate) {
        alert('To Date must be after or equal to From Date');
        toDateInput.value = '';
        return;
    }

    // Add all dates between fromDate and toDate (excluding fromDate since it's already added)
    let currentDateStr = fromDate;
    const nextDay = new Date(fromDate + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    currentDateStr = nextDay.toISOString().split('T')[0];

    let addedCount = 0;

    while (currentDateStr <= toDate) {
        // Only add if not already in the list
        if (!selectedSpecificDates.includes(currentDateStr)) {
            selectedSpecificDates.push(currentDateStr);
            addedCount++;
        }

        // Move to next day
        const [year, month, day] = currentDateStr.split('-').map(Number);
        const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
        currentDateStr = nextDate.toISOString().split('T')[0];
    }

    // Update UI
    updateSelectedDatesList();

    // Show feedback
    if (addedCount > 0) {
        const totalDates = addedCount + 1; // +1 for the fromDate already added
        console.log(`[Schedule] Expanded to ${totalDates} dates (${fromDate} to ${toDate})`);
    }

    // Clear both inputs for next entry
    fromDateInput.value = '';
    toDateInput.value = '';
    lastFromDate = null;
}

/**
 * Add another date range input pair
 */
function addAnotherDateRange() {
    additionalDateRangeCounter++;
    const container = document.getElementById('additional-date-ranges');
    if (!container) return;

    const dateRangeHtml = `
        <div class="additional-date-range mb-3" id="date-range-${additionalDateRangeCounter}" style="padding: 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="form-label" style="margin: 0; font-weight: 600;">
                    <i class="fas fa-calendar-week"></i> Additional Date/Range #${additionalDateRangeCounter}
                </label>
                <button type="button" class="btn-danger" onclick="removeAdditionalDateRange(${additionalDateRangeCounter})"
                    style="padding: 4px 12px; font-size: 0.875rem;">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="font-size: 0.875rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                        From Date <span style="color: var(--error-color); font-size: 0.875rem;">*</span>
                    </label>
                    <input type="date" id="additional-date-from-${additionalDateRangeCounter}" class="form-input" onchange="handleAdditionalFromDateChange(${additionalDateRangeCounter})">
                </div>
                <div>
                    <label style="font-size: 0.875rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                        To Date <span style="font-size: 0.7rem; font-style: italic;">(Optional)</span>
                    </label>
                    <input type="date" id="additional-date-to-${additionalDateRangeCounter}" class="form-input" onchange="handleAdditionalToDateChange(${additionalDateRangeCounter})">
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', dateRangeHtml);
    console.log('[Schedule] Additional date range input added');
}

/**
 * Remove additional date range input
 */
function removeAdditionalDateRange(id) {
    const element = document.getElementById(`date-range-${id}`);
    if (element) {
        element.remove();
        console.log('[Schedule] Date range input removed');
    }
}

/**
 * Handle additional From Date change - add single date immediately
 */
function handleAdditionalFromDateChange(id) {
    const fromDateInput = document.getElementById(`additional-date-from-${id}`);
    const toDateInput = document.getElementById(`additional-date-to-${id}`);
    const fromDate = fromDateInput?.value;

    if (!fromDate) {
        return;
    }

    // Add the single "From Date" immediately
    if (!selectedSpecificDates.includes(fromDate)) {
        selectedSpecificDates.push(fromDate);

        // Update UI
        updateSelectedDatesList();
        console.log('[Schedule] Added 1 date to schedule');
    } else {
        console.log('[Schedule] This date is already added');
    }

    // Clear "To Date" field for fresh input
    if (toDateInput) toDateInput.value = '';
}

/**
 * Handle additional To Date change - expand to date range
 */
function handleAdditionalToDateChange(id) {
    const fromDateInput = document.getElementById(`additional-date-from-${id}`);
    const toDateInput = document.getElementById(`additional-date-to-${id}`);
    const fromDate = fromDateInput?.value;
    const toDate = toDateInput?.value;

    if (!fromDate || !toDate) {
        return;
    }

    // Validate date range
    if (fromDate > toDate) {
        alert('To Date must be after or equal to From Date');
        toDateInput.value = '';
        return;
    }

    // Add all dates between fromDate and toDate (excluding fromDate since it's already added)
    let currentDateStr = fromDate;
    const nextDay = new Date(fromDate + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    currentDateStr = nextDay.toISOString().split('T')[0];

    let addedCount = 0;

    while (currentDateStr <= toDate) {
        // Only add if not already in the list
        if (!selectedSpecificDates.includes(currentDateStr)) {
            selectedSpecificDates.push(currentDateStr);
            addedCount++;
        }

        // Move to next day
        const [year, month, day] = currentDateStr.split('-').map(Number);
        const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
        currentDateStr = nextDate.toISOString().split('T')[0];
    }

    // Update UI
    updateSelectedDatesList();

    // Show feedback
    if (addedCount > 0) {
        const totalDates = addedCount + 1;
        console.log(`[Schedule] Expanded to ${totalDates} dates (${fromDate} to ${toDate})`);
    }

    // Clear both inputs for next entry
    fromDateInput.value = '';
    toDateInput.value = '';
}

/**
 * Remove specific date from the list
 */
function removeSpecificDate(date) {
    selectedSpecificDates = selectedSpecificDates.filter(d => d !== date);
    updateSelectedDatesList();
}

/**
 * Update the selected dates list UI
 */
function updateSelectedDatesList() {
    console.log('[Schedule] updateSelectedDatesList called');
    console.log('[Schedule] Current selectedSpecificDates:', selectedSpecificDates);

    const container = document.getElementById('selected-dates-list');
    if (!container) {
        console.error('[Schedule] selected-dates-list container not found!');
        return;
    }

    if (selectedSpecificDates.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size: 0.9rem;">No dates selected yet</p>';
        return;
    }

    // Sort dates
    const sortedDates = [...selectedSpecificDates].sort();

    container.innerHTML = sortedDates.map(date => {
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="selected-date-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 6px;">
                <span><i class="fas fa-calendar-day"></i> ${formattedDate}</span>
                <button type="button" class="remove-date-btn" onclick="removeSpecificDate('${date}')" style="background: none; border: none; color: var(--error-color); cursor: pointer; padding: 4px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    console.log('[Schedule] Selected dates list updated successfully');
}

/**
 * Reset specific dates state (call when opening create modal)
 */
function resetSpecificDates() {
    selectedSpecificDates = [];
    lastFromDate = null;
    additionalDateRangeCounter = 0;

    // Clear additional date ranges container
    const additionalContainer = document.getElementById('additional-date-ranges');
    if (additionalContainer) {
        additionalContainer.innerHTML = '';
    }

    // Update UI
    updateSelectedDatesList();
}

// Export specific dates functions
window.handleFromDateChange = handleFromDateChange;
window.handleToDateChange = handleToDateChange;
window.addAnotherDateRange = addAnotherDateRange;
window.removeAdditionalDateRange = removeAdditionalDateRange;
window.handleAdditionalFromDateChange = handleAdditionalFromDateChange;
window.handleAdditionalToDateChange = handleAdditionalToDateChange;
window.removeSpecificDate = removeSpecificDate;
window.updateSelectedDatesList = updateSelectedDatesList;
window.resetSpecificDates = resetSpecificDates;

// Export schedule functions
window.loadStudentSchedules = loadStudentSchedules;
window.renderScheduleList = renderScheduleList;
window.renderScheduleCard = renderScheduleCard;
window.filterSchedules = filterSchedules;
window.markScheduleComplete = markScheduleComplete;
window.confirmDeleteSchedule = confirmDeleteSchedule;
window.openCreateScheduleModal = openCreateScheduleModal;
window.openEditScheduleModal = openEditScheduleModal;
window.openScheduleDetailModal = openScheduleDetailModal;
window.closeScheduleModal = closeScheduleModal;
window.saveSchedule = saveSchedule;
window.toggleScheduleType = toggleScheduleType;
window.updatePriorityLabel = updatePriorityLabel;
window.toggleAlarmSettings = toggleAlarmSettings;
window.populateScheduleForm = populateScheduleForm;


// ============================================
// SCHEDULE PANEL SECTION SWITCHING
// ============================================

/**
 * Switch between schedule panel sections (schedules or sessions)
 * Cards always remain visible - just toggle which section is shown below them
 * @param {string} section - 'schedules' or 'sessions'
 */
function switchScheduleSection(section) {
    console.log(`[Schedule Panel] Switching to section: ${section}`);

    const schedulesSection = document.getElementById('schedules-section');
    const sessionsSection = document.getElementById('sessions-section');

    // Update active state on cards
    const allCards = document.querySelectorAll('.schedule-type-card');
    allCards.forEach(card => {
        card.classList.remove('active');
        if (card.dataset.section === section) {
            card.classList.add('active');
        }
    });

    // Toggle between schedules and sessions sections
    if (section === 'schedules') {
        if (schedulesSection) schedulesSection.classList.remove('hidden');
        if (sessionsSection) sessionsSection.classList.add('hidden');
        // Load schedules data
        loadStudentSchedules();
    } else if (section === 'sessions') {
        if (schedulesSection) schedulesSection.classList.add('hidden');
        if (sessionsSection) sessionsSection.classList.remove('hidden');
        // Load sessions data
        loadStudentSessions();
    }
}

/**
 * Load counts for schedule panel cards
 */
async function loadSchedulePanelCounts() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch('http://localhost:8000/api/student/schedule-panel/counts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const counts = await response.json();
        console.log('[Schedule Panel] Counts:', counts);

        // Update badge counts
        const schedulesCountEl = document.getElementById('student-schedules-count');
        const sessionsCountEl = document.getElementById('student-sessions-count');

        if (schedulesCountEl) schedulesCountEl.textContent = counts.schedules || 0;
        if (sessionsCountEl) sessionsCountEl.textContent = counts.sessions || 0;

    } catch (error) {
        console.error('[Schedule Panel] Error loading counts:', error);
    }
}

/**
 * Initialize schedule panel (called when panel is shown)
 */
function initializeSchedulePanel() {
    console.log('[Schedule Panel] Initializing...');
    // Load counts for the cards
    loadSchedulePanelCounts();
    // Default to showing schedules section (My Schedules card is active by default)
    switchScheduleSection('schedules');
}

// Track current schedule status filter
let currentScheduleStatusFilter = 'all';

/**
 * Filter schedules/sessions by status
 * @param {string} status - 'all', 'pending', 'active', 'completed'
 */
function filterScheduleStatus(status) {
    console.log(`[Schedule Panel] Filtering by status: ${status}`);
    currentScheduleStatusFilter = status;

    // Update tab active state
    const tabs = document.querySelectorAll('#schedule-status-tabs .status-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.status === status) {
            tab.classList.add('active');
        }
    });

    // Check which section is visible and reload with filter
    const schedulesSection = document.getElementById('schedules-section');
    const sessionsSection = document.getElementById('sessions-section');

    if (schedulesSection && !schedulesSection.classList.contains('hidden')) {
        loadStudentSchedules(status);
    } else if (sessionsSection && !sessionsSection.classList.contains('hidden')) {
        loadStudentSessions(status);
    }
}

// Export filter function
window.filterScheduleStatus = filterScheduleStatus;


// ============================================
// SESSION LOADING FUNCTIONS
// ============================================

/**
 * Load student tutoring sessions from the database
 * @param {string} statusFilter - Optional status filter (all, scheduled, in_progress, completed, cancelled)
 */
async function loadStudentSessions(statusFilter = 'all') {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            console.error('[Sessions] No token available');
            renderSessionsEmptyState('Please log in to view your sessions');
            return;
        }

        console.log(`[Sessions] Loading sessions - status: ${statusFilter}`);

        // Show loading state
        const sessionsContainer = document.getElementById('sessions-list');
        if (sessionsContainer) {
            sessionsContainer.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                        <p class="text-gray-600 dark:text-gray-400">Loading your sessions...</p>
                    </div>
                </div>
            `;
        }

        // Build URL with filters
        let url = 'http://localhost:8000/api/student/my-sessions';
        if (statusFilter && statusFilter !== 'all') {
            url += `?status=${statusFilter}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const sessions = await response.json();
        console.log(`[Sessions] Loaded ${sessions.length} sessions`);

        // Render sessions
        renderSessionsList(sessions);

    } catch (error) {
        console.error('[Sessions] Error loading sessions:', error);
        renderSessionsEmptyState('Failed to load sessions. Please try again.');
    }
}

/**
 * Render sessions list with filters
 * @param {Array} sessions - Array of session objects
 */
function renderSessionsList(sessions) {
    const sessionsContainer = document.getElementById('sessions-list');
    if (!sessionsContainer) return;

    if (!sessions || sessions.length === 0) {
        renderSessionsEmptyState('No tutoring sessions found. Sessions scheduled by your tutors will appear here.');
        return;
    }

    let html = `
        <!-- Session Filters -->
        <div class="flex flex-wrap gap-4 mb-6">
            <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                <select id="session-status-filter" onchange="filterSessions()" class="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div class="ml-auto text-sm text-gray-500">
                <span class="font-semibold">${sessions.length}</span> total sessions
            </div>
        </div>

        <!-- Sessions Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="sessions-grid">
    `;

    // Render all sessions
    sessions.forEach(session => {
        html += renderSessionCard(session);
    });

    html += `</div>`;

    sessionsContainer.innerHTML = html;
}

/**
 * Render a single session card
 * @param {Object} session - Session object
 */
function renderSessionCard(session) {
    const statusColors = {
        'scheduled': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    const modeIcons = {
        'online': '💻',
        'in-person': '🏫',
        'hybrid': '🔄'
    };

    const statusColor = statusColors[session.status] || statusColors.scheduled;
    const modeIcon = modeIcons[session.session_mode] || '📚';

    // Format date display
    let dateDisplay = 'Date not set';
    if (session.session_date) {
        const date = new Date(session.session_date);
        dateDisplay = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    // Format time display
    let timeDisplay = '';
    if (session.start_time) {
        timeDisplay = session.start_time;
        if (session.end_time) {
            timeDisplay += ` - ${session.end_time}`;
        }
    }

    // Course names display
    const coursesDisplay = session.course_names && session.course_names.length > 0
        ? session.course_names.join(', ')
        : 'General Session';

    // Tutor initial for avatar fallback
    const tutorInitial = session.tutor_name ? session.tutor_name.charAt(0).toUpperCase() : 'T';

    return `
        <div class="session-card card p-4 hover:shadow-lg transition-shadow cursor-pointer" data-session-id="${session.id}">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    ${session.tutor_profile_picture ? `
                        <img src="${session.tutor_profile_picture}" alt="${session.tutor_name}"
                             class="w-10 h-10 rounded-full object-cover"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="width: 40px; height: 40px; border-radius: 50%; display: none; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-weight: bold;">
                            ${tutorInitial}
                        </div>
                    ` : `
                        <div style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-weight: bold;">
                            ${tutorInitial}
                        </div>
                    `}
                    <div>
                        <h4 class="font-semibold text-gray-900 dark:text-white">${session.tutor_name || 'Unknown Tutor'}</h4>
                        <p class="text-xs text-gray-500">${session.package_name || 'Package'}</p>
                    </div>
                </div>
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor}">${session.status}</span>
            </div>

            <div class="mb-3">
                <p class="text-sm font-medium text-purple-600 dark:text-purple-400 line-clamp-1">${coursesDisplay}</p>
            </div>

            <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>📅</span>
                    <span>${dateDisplay}</span>
                </div>

                ${timeDisplay ? `
                    <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>🕐</span>
                        <span>${timeDisplay}</span>
                    </div>
                ` : ''}

                <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>${modeIcon}</span>
                    <span>${session.session_mode || 'online'}</span>
                    ${session.location ? `<span class="text-xs">• ${session.location}</span>` : ''}
                </div>

                ${session.duration ? `
                    <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>⏱️</span>
                        <span>${session.duration} min</span>
                    </div>
                ` : ''}
            </div>

            ${session.status === 'scheduled' && session.whiteboard_id ? `
                <div class="mt-4 pt-3 border-t dark:border-gray-700">
                    <button onclick="event.stopPropagation(); joinSessionWhiteboard(${session.whiteboard_id})"
                            class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium">
                        <i class="fas fa-chalkboard mr-2"></i>Join Whiteboard
                    </button>
                </div>
            ` : ''}

            ${session.status === 'in_progress' ? `
                <div class="mt-4 pt-3 border-t dark:border-gray-700">
                    <button onclick="event.stopPropagation(); joinSessionWhiteboard(${session.whiteboard_id || 0})"
                            class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
                        <i class="fas fa-play mr-2"></i>Join Session
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render empty state for sessions
 * @param {string} message - Message to display
 */
function renderSessionsEmptyState(message) {
    const sessionsContainer = document.getElementById('sessions-list');
    if (sessionsContainer) {
        sessionsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="text-6xl mb-4">👨‍🏫</div>
                <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Sessions Yet</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md">${message}</p>
                <a href="branch/find-tutors.html" class="btn-primary px-6 py-2">
                    <i class="fas fa-search mr-2"></i>Find Tutors
                </a>
            </div>
        `;
    }
}

/**
 * Filter sessions by status
 */
function filterSessions() {
    const statusFilter = document.getElementById('session-status-filter')?.value || 'all';
    loadStudentSessions(statusFilter);
}

/**
 * Join session whiteboard
 * @param {number} whiteboardId - Whiteboard session ID
 */
function joinSessionWhiteboard(whiteboardId) {
    if (whiteboardId) {
        // Open whiteboard with specific session
        if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
            whiteboardManager.openWhiteboard(whiteboardId);
        } else {
            console.error('Whiteboard manager not loaded');
            openComingSoonModal('Join Whiteboard');
        }
    } else {
        alert('Whiteboard not available for this session');
    }
}

// Export session functions
window.switchScheduleSection = switchScheduleSection;
window.loadSchedulePanelCounts = loadSchedulePanelCounts;
window.initializeSchedulePanel = initializeSchedulePanel;
window.loadStudentSessions = loadStudentSessions;
window.renderSessionsList = renderSessionsList;
window.renderSessionCard = renderSessionCard;
window.filterSessions = filterSessions;
window.joinSessionWhiteboard = joinSessionWhiteboard;

// ============================================
// LEARNING TOOLS PANEL FUNCTIONS
// Digital Whiteboard and Coursework
// ============================================

/**
 * Open Digital Whiteboard for Student
 * Students can view their scheduled sessions with tutors
 */
function openStudentWhiteboard() {
    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        // Open whiteboard - it will show sessions available to the student
        whiteboardManager.openWhiteboard();
    } else {
        console.error('Whiteboard manager not loaded');
        openComingSoonModal('Digital Whiteboard');
    }
}

/**
 * Open Coursework for Student
 * Students can view and complete coursework assigned by tutors
 */
function openStudentCoursework() {
    if (typeof courseworkManager !== 'undefined' && courseworkManager) {
        // Open the coursework modal - shows coursework assigned to the student
        courseworkManager.openMainModal();
    } else {
        console.error('Coursework manager not loaded');
        openComingSoonModal('Coursework');
    }
}

// Export learning tools functions
window.openStudentWhiteboard = openStudentWhiteboard;
window.openStudentCoursework = openStudentCoursework;
