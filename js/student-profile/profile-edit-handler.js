// ============================================
// STUDENT PROFILE EDIT HANDLER
// Handles profile editing and form submission
// ============================================

const StudentProfileEditHandler = {
    originalData: {},

    // Save student profile
    async saveProfile(profileData) {
        try {
            console.log('Saving student profile:', profileData);

            // Update via API
            const response = await StudentProfileAPI.updateStudentProfile(profileData);

            if (response && (response.message || response.id)) {
                // Update state
                if (typeof StudentProfileState !== 'undefined') {
                    Object.keys(profileData).forEach(key => {
                        StudentProfileState.updateField(key, profileData[key]);
                    });
                }

                // Reload profile data to show latest changes
                await StudentProfileDataLoader.loadCompleteProfile();

                // Refresh localStorage.currentUser so country_code is up-to-date for KYC
                if (typeof authManager !== 'undefined' && typeof authManager.fetchUserData === 'function') {
                    try { await authManager.fetchUserData(); } catch (e) { console.warn('[ProfileEditHandler] fetchUserData failed:', e); }
                }

                // Show success message
                if (typeof StudentProfileUI !== 'undefined') {
                    StudentProfileUI.showNotification('Profile updated successfully!', 'success');
                } else {
                    alert('Profile updated successfully!');
                }

                // Close modal
                if (typeof closeEditProfileModal === 'function') {
                    closeEditProfileModal();
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('Error saving student profile:', error);
            if (typeof StudentProfileUI !== 'undefined') {
                StudentProfileUI.showNotification('Failed to save profile: ' + error.message, 'error');
            } else {
                alert('Failed to save profile: ' + error.message);
            }
            return false;
        }
    }
};
