// ============================================
// ADVERTISER PROFILE EDIT HANDLER
// Handles profile editing and form submission
// ============================================

const AdvertiserProfileEditHandler = {
    originalData: {},

    // Save advertiser profile
    async saveAdvertiserProfile(profileData) {
        try {
            console.log('💾 Saving advertiser profile to database:', profileData);

            // Update via API
            const response = await AdvertiserProfileAPI.updateAdvertiserProfile(profileData);

            console.log('✅ Profile save response:', response);

            if (response && (response.message || response.id)) {
                console.log('🔄 Reloading profile from database...');

                // Reload profile data to show latest changes FROM DATABASE
                await AdvertiserProfileDataLoader.loadCompleteProfile();

                console.log('✅ Profile header updated with latest data from database');

                // Show success message
                if (typeof notifications !== 'undefined') {
                    notifications.show('Profile updated successfully!', 'success');
                } else {
                    alert('Profile updated successfully!');
                }

                // Close modal
                if (typeof closeModal === 'function') {
                    closeModal('edit-profile-modal');
                }

                return true;
            }

            throw new Error('Invalid response from server');

        } catch (error) {
            console.error('❌ Error saving advertiser profile:', error);
            if (typeof notifications !== 'undefined') {
                notifications.show('Failed to save profile: ' + error.message, 'error');
            } else {
                alert('Failed to save profile: ' + error.message);
            }
            return false;
        }
    }
};

// Replace the old saveProfile function
window.saveAdvertiserProfile = async function() {
    // Use correct camelCase IDs that match the HTML
    const companyName = document.getElementById('editCompanyName')?.value;
    const email = document.getElementById('editEmail')?.value;
    const phone = document.getElementById('editPhone')?.value;
    const location = document.getElementById('editLocation')?.value;
    const industry = document.getElementById('editIndustry')?.value;
    const bio = document.getElementById('editBio')?.value;
    const quote = document.getElementById('editQuote')?.value;

    // Collect profile data
    const profileData = {};

    if (companyName) profileData.company_name = companyName;
    if (location) profileData.location = location;
    if (industry) profileData.industry = industry;
    if (bio) profileData.bio = bio;
    if (quote) profileData.quote = quote;

    // Note: email and phone would update the user table, not advertiser profile
    // For now, we'll skip those or handle separately

    // Save profile
    await AdvertiserProfileEditHandler.saveAdvertiserProfile(profileData);
};
