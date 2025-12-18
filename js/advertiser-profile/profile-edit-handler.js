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
                if (typeof showToast === 'function') {
                    showToast('Profile updated successfully!', 'success');
                } else if (typeof notifications !== 'undefined') {
                    notifications.show('Profile updated successfully!', 'success');
                } else {
                    alert('Profile updated successfully!');
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
    // Get form values - new schema fields
    const username = document.getElementById('editUsername')?.value?.trim();
    const bio = document.getElementById('editBio')?.value?.trim();
    const quote = document.getElementById('editQuote')?.value?.trim();
    const locationInput = document.getElementById('editLocation')?.value?.trim();

    // Get social links
    const socialWebsite = document.getElementById('editSocialWebsite')?.value?.trim();
    const socialFacebook = document.getElementById('editSocialFacebook')?.value?.trim();
    const socialTwitter = document.getElementById('editSocialTwitter')?.value?.trim();
    const socialLinkedin = document.getElementById('editSocialLinkedin')?.value?.trim();
    const socialInstagram = document.getElementById('editSocialInstagram')?.value?.trim();
    const socialYoutube = document.getElementById('editSocialYoutube')?.value?.trim();
    const socialTiktok = document.getElementById('editSocialTiktok')?.value?.trim();

    // Collect profile data - only include non-empty values
    const profileData = {};

    if (username) profileData.username = username;
    if (bio) profileData.bio = bio;
    if (quote) profileData.quote = quote;

    // Parse location from comma-separated string to array
    if (locationInput) {
        profileData.location = locationInput.split(',').map(loc => loc.trim()).filter(loc => loc);
    } else {
        profileData.location = [];
    }

    // Build socials object - only include non-empty URLs
    const socials = {};
    if (socialWebsite) socials.website = socialWebsite;
    if (socialFacebook) socials.facebook = socialFacebook;
    if (socialTwitter) socials.twitter = socialTwitter;
    if (socialLinkedin) socials.linkedin = socialLinkedin;
    if (socialInstagram) socials.instagram = socialInstagram;
    if (socialYoutube) socials.youtube = socialYoutube;
    if (socialTiktok) socials.tiktok = socialTiktok;

    // Only include socials if at least one is set
    if (Object.keys(socials).length > 0) {
        profileData.socials = socials;
    }

    console.log('[AdvertiserProfile] Saving profile with data:', profileData);

    // Save profile
    const success = await AdvertiserProfileEditHandler.saveAdvertiserProfile(profileData);

    // Close modal on success
    if (success) {
        if (typeof closeEditProfileModal === 'function') {
            closeEditProfileModal();
        }
    }
};
