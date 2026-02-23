// ============================================
// ADVERTISER PROFILE EDIT HANDLER
// Handles profile editing and form submission
// ============================================

let socialLinksList = [];

function addSocialLink() {
    const container = document.getElementById('socialMediaContainer');
    if (!container) return;

    const index = socialLinksList.length;
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center mb-2';
    div.innerHTML = `
        <select id="socialPlatform${index}" class="p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary); min-width: 150px;">
            <option value="">Select Platform</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="snapchat">Snapchat</option>
            <option value="facebook">Facebook</option>
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">X</option>
            <option value="youtube">YouTube</option>
            <option value="github">GitHub</option>
            <option value="website">Website</option>
        </select>
        <input type="url"
            id="socialUrl${index}"
            class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
            style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
            placeholder="URL (e.g., https://facebook.com/yourpage)">
        <button type="button"
            class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            onclick="removeSocialLink(${index})">
            🗑️
        </button>
    `;
    container.appendChild(div);
    socialLinksList.push({ platform: '', url: '' });
}

function removeSocialLink(index) {
    const container = document.getElementById('socialMediaContainer');
    if (!container) return;

    const children = Array.from(container.children);
    if (children[index]) {
        children[index].remove();
        socialLinksList.splice(index, 1);
    }
}

function loadSocialLinks(socialLinksData) {
    const container = document.getElementById('socialMediaContainer');
    if (!container) return;

    container.innerHTML = '';
    socialLinksList = [];

    let linksArray = [];
    if (socialLinksData && typeof socialLinksData === 'object') {
        if (Array.isArray(socialLinksData)) {
            linksArray = socialLinksData;
        } else {
            linksArray = Object.entries(socialLinksData)
                .filter(([platform, url]) => url && url.trim() !== '')
                .map(([platform, url]) => ({ platform, url }));
        }
    }

    if (linksArray.length > 0) {
        linksArray.forEach((link, index) => {
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center mb-2';
            div.innerHTML = `
                <select id="socialPlatform${index}" class="p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary); min-width: 150px;">
                    <option value="">Select Platform</option>
                    <option value="tiktok" ${link.platform === 'tiktok' ? 'selected' : ''}>TikTok</option>
                    <option value="instagram" ${link.platform === 'instagram' ? 'selected' : ''}>Instagram</option>
                    <option value="snapchat" ${link.platform === 'snapchat' ? 'selected' : ''}>Snapchat</option>
                    <option value="facebook" ${link.platform === 'facebook' ? 'selected' : ''}>Facebook</option>
                    <option value="telegram" ${link.platform === 'telegram' ? 'selected' : ''}>Telegram</option>
                    <option value="whatsapp" ${link.platform === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
                    <option value="linkedin" ${link.platform === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                    <option value="twitter" ${link.platform === 'twitter' ? 'selected' : ''}>X</option>
                    <option value="youtube" ${link.platform === 'youtube' ? 'selected' : ''}>YouTube</option>
                    <option value="github" ${link.platform === 'github' ? 'selected' : ''}>GitHub</option>
                    <option value="website" ${link.platform === 'website' ? 'selected' : ''}>Website</option>
                </select>
                <input type="url"
                    id="socialUrl${index}"
                    class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
                    placeholder="URL (e.g., https://facebook.com/yourpage)"
                    value="${link.url || ''}">
                <button type="button"
                    class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    onclick="removeSocialLink(${index})">
                    🗑️
                </button>
            `;
            container.appendChild(div);
            socialLinksList.push(link);
        });
    } else {
        addSocialLink();
    }
}

function getSocialLinks() {
    const container = document.getElementById('socialMediaContainer');
    if (!container) return {};

    const platformSelects = container.querySelectorAll('select[id^="socialPlatform"]');
    const urlInputs = container.querySelectorAll('input[id^="socialUrl"]');

    const socialLinks = {};
    platformSelects.forEach((select, index) => {
        const platform = select.value;
        const url = urlInputs[index]?.value.trim();
        if (platform && url) {
            socialLinks[platform] = url;
        }
    });

    return socialLinks;
}

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

                // Refresh localStorage.currentUser so country_code is up-to-date for KYC
                if (typeof authManager !== 'undefined' && typeof authManager.fetchUserData === 'function') {
                    try { await authManager.fetchUserData(); } catch (e) { console.warn('[AdvertiserProfileEditHandler] fetchUserData failed:', e); }
                }

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

    // Get social links from dynamic container
    const socials = getSocialLinks();

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

    // Only include socials if at least one is set
    if (Object.keys(socials).length > 0) {
        profileData.socials = socials;
    }

    // Get display_location checkbox value
    const displayLocationCheckbox = document.getElementById('editDisplayLocation');
    const displayLocation = displayLocationCheckbox?.checked || false;
    profileData.display_location = displayLocation;
    console.log('[Advertiser Save] display_location value:', displayLocation);

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
