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

    // Load the appropriate content
    if (type === 'parenting') {
        // Hide status tabs for parenting (student just sees their sent invitations)
        const statusTabs = document.querySelector('#my-requests-panel .status-tabs');
        if (statusTabs) statusTabs.style.display = 'none';

        loadStudentParentingInvitations();
    } else {
        // Show status tabs for other types
        const statusTabs = document.querySelector('#my-requests-panel .status-tabs');
        if (statusTabs) statusTabs.style.display = 'flex';

        // Load placeholder content for other types
        const container = document.getElementById('student-requests-list');
        if (container) {
            if (type === 'courses') {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-book text-3xl mb-3"></i>
                        <p>Course requests coming soon!</p>
                        <p class="text-sm mt-2">Request enrollment in courses from tutors</p>
                    </div>
                `;
            } else if (type === 'schools') {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-school text-3xl mb-3"></i>
                        <p>School requests coming soon!</p>
                        <p class="text-sm mt-2">Request enrollment in schools</p>
                    </div>
                `;
            } else if (type === 'tutors') {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-chalkboard-teacher text-3xl mb-3"></i>
                        <p>Tutor session requests coming soon!</p>
                        <p class="text-sm mt-2">Request tutoring sessions</p>
                    </div>
                `;
            }
        }
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

    // Currently only parenting has data, others are placeholders
    // In the future, reload content based on current type and status
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

        const token = localStorage.getItem('token');
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
        const response = await fetch('https://api.astegni.com/api/parent/pending-invitations', {
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
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to accept invitations');
            return;
        }

        const response = await fetch(`https://api.astegni.com/api/parent/invitation/${invitationId}/accept`, {
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
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to reject invitations');
            return;
        }

        const response = await fetch(`https://api.astegni.com/api/parent/invitation/${invitationId}/reject`, {
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

// Export functions
window.filterStudentRequestType = filterStudentRequestType;
window.filterStudentRequestStatus = filterStudentRequestStatus;
window.loadStudentParentingInvitations = loadStudentParentingInvitations;
window.resendParentInvitation = resendParentInvitation;
window.renderReceivedParentingInvitationCard = renderReceivedParentingInvitationCard;
window.acceptStudentParentInvitation = acceptStudentParentInvitation;
window.rejectStudentParentInvitation = rejectStudentParentInvitation;
