
//    <!-- Edit Profile Modal JavaScript (Languages, Locations) -->
        // Global arrays for dynamic fields
        let languagesList = [];
        let locationsList = [];
        let socialLinksList = [];
        let heroTitlesList = [];
        let hobbiesList = [];

        /**
         * Add a new hero title field
         */
        function addHeroTitle() {
            const container = document.getElementById('heroTitlesContainer');
            if (!container) return;

            const index = heroTitlesList.length;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center mb-2';
            div.innerHTML = `
                <input type="text"
                    id="heroTitle${index}"
                    class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
                    placeholder="Hero Title (e.g., Excellence in Education, Delivered with Passion)">
                <button type="button"
                    class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    onclick="removeHeroTitle(${index})">
                    🗑️
                </button>
            `;
            container.appendChild(div);
            heroTitlesList.push('');
        }

        /**
         * Remove a hero title field
         */
        function removeHeroTitle(index) {
            const container = document.getElementById('heroTitlesContainer');
            if (!container) return;

            const children = Array.from(container.children);
            if (children[index]) {
                children[index].remove();
                heroTitlesList.splice(index, 1);
            }
        }

        /**
         * Load hero titles
         */
        function loadHeroTitles(heroTitlesArray) {
            const container = document.getElementById('heroTitlesContainer');
            if (!container) return;

            container.innerHTML = '';
            heroTitlesList = [];

            if (heroTitlesArray && heroTitlesArray.length > 0) {
                heroTitlesArray.forEach((heroTitle, index) => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2 items-center mb-2';
                    div.innerHTML = `
                        <input type="text"
                            id="heroTitle${index}"
                            class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                            style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
                            placeholder="Hero Title (e.g., Excellence in Education, Delivered with Passion)"
                            value="${heroTitle}">
                        <button type="button"
                            class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            onclick="removeHeroTitle(${index})">
                            🗑️
                        </button>
                    `;
                    container.appendChild(div);
                    heroTitlesList.push(heroTitle);
                });
            } else {
                // Add one empty field by default
                addHeroTitle();
            }
        }

        /**
         * Collect hero titles when saving
         */
        function getHeroTitles() {
            const container = document.getElementById('heroTitlesContainer');
            if (!container) return [];

            const heroTitleInputs = container.querySelectorAll('input[id^="heroTitle"]');
            return Array.from(heroTitleInputs)
                .map(input => input.value.trim())
                .filter(value => value !== '');
        }

        /**
         * Add a new language field
         */
        function addLanguage() {
            const container = document.getElementById('languagesContainer');
            if (!container) return;

            const index = languagesList.length;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center mb-2';
            div.innerHTML = `
                <select id="language${index}" class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
                    <option value="">Select Language</option>
                    <option value="English">English</option>
                    <option value="Amharic">Amharic</option>
                    <option value="Oromo">Oromo</option>
                    <option value="Tigrinya">Tigrinya</option>
                    <option value="Somali">Somali</option>
                    <option value="Gurage">Gurage</option>
                    <option value="French">French</option>
                    <option value="Arabic">Arabic</option>
                </select>
                <button type="button"
                    class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    onclick="removeLanguage(${index})">
                    🗑️
                </button>
            `;
            container.appendChild(div);
            languagesList.push('');
        }

        /**
         * Remove a language field
         */
        function removeLanguage(index) {
            const container = document.getElementById('languagesContainer');
            if (!container) return;

            const children = Array.from(container.children);
            if (children[index]) {
                children[index].remove();
                languagesList.splice(index, 1);
            }
        }

        /**
         * Add a new location field
         */
        function addLocation() {
            const container = document.getElementById('locationsContainer');
            if (!container) return;

            const index = locationsList.length;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center mb-2';
            div.innerHTML = `
                <input type="text"
                    id="location${index}"
                    class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
                    placeholder="Location (e.g., Addis Ababa, Bahir Dar)">
                <button type="button"
                    class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    onclick="removeLocation(${index})">
                    🗑️
                </button>
            `;
            container.appendChild(div);
            locationsList.push('');
        }

        /**
         * Remove a location field
         */
        function removeLocation(index) {
            const container = document.getElementById('locationsContainer');
            if (!container) return;

            const children = Array.from(container.children);
            if (children[index]) {
                children[index].remove();
                locationsList.splice(index, 1);
            }
        }

        /**
         * Add a new social link field
         */
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

        /**
         * Remove a social link field
         */
        function removeSocialLink(index) {
            const container = document.getElementById('socialMediaContainer');
            if (!container) return;

            const children = Array.from(container.children);
            if (children[index]) {
                children[index].remove();
                socialLinksList.splice(index, 1);
            }
        }

        /**
         * Load social links
         */
        function loadSocialLinks(socialLinksData) {
            const container = document.getElementById('socialMediaContainer');
            if (!container) return;

            container.innerHTML = '';
            socialLinksList = [];

            // Handle both object and array formats
            let linksArray = [];
            if (socialLinksData && typeof socialLinksData === 'object') {
                if (Array.isArray(socialLinksData)) {
                    linksArray = socialLinksData;
                } else {
                    // Convert object to array
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
                            <option value="facebook" ${link.platform === 'facebook' ? 'selected' : ''}>Facebook</option>
                            <option value="twitter" ${link.platform === 'twitter' ? 'selected' : ''}>Twitter</option>
                            <option value="linkedin" ${link.platform === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                            <option value="instagram" ${link.platform === 'instagram' ? 'selected' : ''}>Instagram</option>
                            <option value="youtube" ${link.platform === 'youtube' ? 'selected' : ''}>YouTube</option>
                            <option value="telegram" ${link.platform === 'telegram' ? 'selected' : ''}>Telegram</option>
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
                // Add one empty field by default
                addSocialLink();
            }
        }

        /**
         * Collect social links when saving
         */
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

        /**
         * Add a new hobby field
         */
        function addHobby() {
            const container = document.getElementById('hobbiesContainer');
            if (!container) return;

            const index = hobbiesList.length;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center mb-2';
            div.innerHTML = `
                <input type="text"
                    id="hobby${index}"
                    class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
                    placeholder="Hobby (e.g., Reading, Sports)">
                <button type="button"
                    class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    onclick="removeHobby(${index})">
                    🗑️
                </button>
            `;
            container.appendChild(div);
            hobbiesList.push('');
        }

        /**
         * Remove a hobby field
         */
        function removeHobby(index) {
            const container = document.getElementById('hobbiesContainer');
            if (!container) return;

            const children = Array.from(container.children);
            if (children[index]) {
                children[index].remove();
                hobbiesList.splice(index, 1);
            }
        }

        /**
         * Load hobbies
         */
        function loadHobbies(hobbiesArray) {
            const container = document.getElementById('hobbiesContainer');
            if (!container) return;

            container.innerHTML = '';
            hobbiesList = [];

            if (hobbiesArray && hobbiesArray.length > 0) {
                hobbiesArray.forEach((hobby, index) => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2 items-center mb-2';
                    div.innerHTML = `
                        <input type="text"
                            id="hobby${index}"
                            class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                            style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
                            placeholder="Hobby (e.g., Reading, Sports)"
                            value="${hobby}">
                        <button type="button"
                            class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            onclick="removeHobby(${index})">
                            🗑️
                        </button>
                    `;
                    container.appendChild(div);
                    hobbiesList.push(hobby);
                });
            } else {
                // Add one empty field by default
                addHobby();
            }
        }

        /**
         * Collect hobbies when saving
         */
        function getHobbies() {
            const container = document.getElementById('hobbiesContainer');
            if (!container) return [];

            const hobbyInputs = container.querySelectorAll('input[id^="hobby"]');
            return Array.from(hobbyInputs)
                .map(input => input.value.trim())
                .filter(value => value !== '');
        }

        /**
         * Open Edit Profile Modal
         * Now fetches fresh data from database instead of using stale localStorage
         */
        async function openEditProfileModal() {
            console.log('🔵 openEditProfileModal called');
            const modal = document.getElementById('edit-profile-modal');
            console.log('Modal element:', modal);
            if (!modal) {
                alert('Error: Edit Profile Modal not found');
                console.error('❌ Modal element not found!');
                return;
            }

            // Get token and user from localStorage
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const localUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

            if (!token) {
                alert('Please log in first');
                return;
            }

            // Show loading state
            modal.classList.remove('hidden');
            modal.classList.add('active');
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            document.body.style.overflow = 'hidden';

            // Show a loading message (optional - you can add a loading spinner here)
            console.log('📡 Fetching fresh profile data from database...');

            try {
                // ALWAYS use tutor endpoint since this is tutor-profile.html
                const endpoint = `${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/profile`;
                console.log('🔍 Edit Modal: Fetching from TUTOR endpoint:', endpoint);

                // Fetch fresh profile data from database
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch profile data');
                }

                const user = await response.json();
                console.log('✅ Fresh profile data loaded from database:', user);

                // Update localStorage with fresh data
                Object.assign(localUser, user);
                localStorage.setItem('user', JSON.stringify(localUser));

                // Load username
                const usernameInput = document.getElementById('username');
                if (usernameInput) {
                    usernameInput.value = user.username || '';
                }

                // Load languages
                const languages = user.languages || [];
                loadLanguages(languages);

                // Load locations
                const locations = user.locations || user.location ? [user.location] : [];
                loadLocations(locations);

                // Load location (single input field)
                const locationInput = document.getElementById('editLocation');
                if (locationInput) {
                    locationInput.value = user.location || '';
                }

                // Load country_code into hidden field
                const countryCodeInput = document.getElementById('editCountryCode');
                if (countryCodeInput) {
                    countryCodeInput.value = user.country_code || '';
                }

                // Load display_location checkbox (show/hide location on public profile)
                const displayLocationCheckbox = document.getElementById('editDisplayLocation');
                if (displayLocationCheckbox) {
                    displayLocationCheckbox.checked = user.display_location === true;
                    console.log('[Edit Profile] display_location loaded:', user.display_location);
                }

                // Disable GPS checkbox if location exists (require "Change Location" button click to enable)
                const allowLocationCheckbox = document.getElementById('editAllowLocation');
                const changeLocationBtn = document.getElementById('changeLocationBtn');
                if (allowLocationCheckbox && user.location) {
                    allowLocationCheckbox.checked = false;
                    allowLocationCheckbox.disabled = true; // Make unselectable
                    // Show "Change Location" button
                    if (changeLocationBtn) {
                        changeLocationBtn.style.display = 'block';
                    }
                    console.log('[Edit Profile] GPS checkbox disabled (location exists, click Change Location to modify)');
                } else if (allowLocationCheckbox) {
                    allowLocationCheckbox.disabled = false;
                    if (changeLocationBtn) {
                        changeLocationBtn.style.display = 'none';
                    }
                }

                // Load quote
                const quoteInput = document.getElementById('profileQuote');
                if (quoteInput) {
                    quoteInput.value = user.quote || '';
                }

                // Load about us
                const aboutUsInput = document.getElementById('aboutUs');
                if (aboutUsInput) {
                    aboutUsInput.value = user.about || user.bio || '';
                }

                // Load hero titles (array) and subtitle
                const heroTitles = user.hero_titles || [];
                loadHeroTitles(heroTitles);

                const heroSubtitleInput = document.getElementById('heroSubtitle');
                if (heroSubtitleInput) {
                    heroSubtitleInput.value = user.hero_subtitle || '';
                }

                // Load social links
                const socialLinks = user.social_links || {};
                loadSocialLinks(socialLinks);

                // Load hobbies
                const hobbies = user.hobbies || [];
                loadHobbies(hobbies);

                console.log('✅ Edit modal populated with fresh database data');

            } catch (error) {
                console.error('❌ Error fetching profile data:', error);
                alert('Failed to load profile data. Please try again.');

                // Close modal on error
                closeEditProfileModal();
            }
        }

        /**
         * Close Edit Profile Modal
         */
        function closeEditProfileModal() {
            const modal = document.getElementById('edit-profile-modal');
            if (!modal) return;

            modal.classList.add('hidden');
            modal.classList.remove('active');
            modal.style.display = 'none';
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';

            // Restore body overflow
            document.body.style.overflow = '';
        }

        /**
         * Load languages
         */
        function loadLanguages(languagesArray) {
            const container = document.getElementById('languagesContainer');
            if (!container) return;

            container.innerHTML = '';
            languagesList = [];

            if (languagesArray && languagesArray.length > 0) {
                languagesArray.forEach((language, index) => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2 items-center mb-2';
                    div.innerHTML = `
                        <select id="language${index}" class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none" style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);">
                            <option value="">Select Language</option>
                            <option value="English" ${language === 'English' ? 'selected' : ''}>English</option>
                            <option value="Amharic" ${language === 'Amharic' ? 'selected' : ''}>Amharic</option>
                            <option value="Oromo" ${language === 'Oromo' ? 'selected' : ''}>Oromo</option>
                            <option value="Tigrinya" ${language === 'Tigrinya' ? 'selected' : ''}>Tigrinya</option>
                            <option value="Somali" ${language === 'Somali' ? 'selected' : ''}>Somali</option>
                            <option value="Gurage" ${language === 'Gurage' ? 'selected' : ''}>Gurage</option>
                            <option value="French" ${language === 'French' ? 'selected' : ''}>French</option>
                            <option value="Arabic" ${language === 'Arabic' ? 'selected' : ''}>Arabic</option>
                        </select>
                        <button type="button"
                            class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            onclick="removeLanguage(${index})">
                            🗑️
                        </button>
                    `;
                    container.appendChild(div);
                    languagesList.push(language);
                });
            } else {
                addLanguage();
            }
        }

        /**
         * Load locations
         */
        function loadLocations(locationsArray) {
            const container = document.getElementById('locationsContainer');
            if (!container) return;

            container.innerHTML = '';
            locationsList = [];

            if (locationsArray && locationsArray.length > 0) {
                locationsArray.forEach((location, index) => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2 items-center mb-2';
                    div.innerHTML = `
                        <input type="text"
                            id="location${index}"
                            class="flex-1 p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                            style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary);"
                            placeholder="Location (e.g., Addis Ababa, Bahir Dar)"
                            value="${location}">
                        <button type="button"
                            class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            onclick="removeLocation(${index})">
                            🗑️
                        </button>
                    `;
                    container.appendChild(div);
                    locationsList.push(location);
                });
            } else {
                addLocation();
            }
        }

        /**
         * Save Edit Profile Modal
         */
        async function saveEditProfile() {
            const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            if (!token) {
                alert('Please log in first');
                return;
            }

            // Collect all data
            const username = document.getElementById('username')?.value?.trim();
            const languages = Array.from(document.querySelectorAll('select[id^="language"]'))
                .map(select => select.value)
                .filter(value => value !== '');
            const location = document.getElementById('editLocation')?.value?.trim();
            const countryCode = document.getElementById('editCountryCode')?.value?.trim() || null;
            const displayLocation = document.getElementById('editDisplayLocation')?.checked || false;
            const quote = document.getElementById('profileQuote')?.value?.trim();
            const aboutUs = document.getElementById('aboutUs')?.value?.trim();
            const heroTitles = getHeroTitles();
            const heroSubtitle = document.getElementById('heroSubtitle')?.value?.trim();
            const socialLinks = getSocialLinks();
            const hobbies = getHobbies();

            console.log('[Save Profile] display_location value:', displayLocation);

            // Prepare update data based on user role
            const updateData = {
                username: username,  // Saves to tutor_profiles.username (NOT users.username)
                languages: languages,
                location: location,  // Saves to tutor_profiles.location
                country_code: countryCode,  // Saves to users.country_code
                display_location: displayLocation,  // Saves to users.display_location
                quote: quote,
                bio: aboutUs,  // FIXED: Backend expects bio, not about
                hero_titles: heroTitles,  // Array of hero titles
                hero_subtitle: heroSubtitle,
                social_links: socialLinks,  // Saves to tutor_profiles.social_links (JSONB)
                hobbies: hobbies  // Array of hobbies
            };

            try {
                // ALWAYS use tutor endpoint since this is tutor-profile.html
                const endpoint = `${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/profile`;
                console.log('🔍 Save Profile: Using TUTOR endpoint:', endpoint);
                console.log('📤 Sending data to server:', JSON.stringify(updateData, null, 2));

                const response = await fetch(endpoint, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update profile');
                }

                const data = await response.json();
                console.log('Profile updated:', data);

                // Update local storage
                Object.assign(user, updateData);
                localStorage.setItem('user', JSON.stringify(user));

                // Close modal
                closeEditProfileModal();

                alert('✅ Profile updated successfully!');

                // Update UI without reloading (if available)
                if (typeof updateProfileUI === 'function') {
                    updateProfileUI(updateData);
                } else {
                    // Fallback: reload page if update function doesn't exist
                    window.location.reload();
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('❌ Failed to update profile. Please try again.');
            }
        }

        /**
         * Update profile UI without page reload
         * Fetches fresh data from database and reloads the profile display
         * @param {Object} profileData - The updated profile data (not used, just for consistency)
         */
        async function updateProfileUI(profileData) {
            console.log('🔄 Updating profile UI with fresh data from database...');

            try {
                // Use the global profile data loader if available
                if (typeof TutorProfileDataLoader !== 'undefined' && TutorProfileDataLoader.loadCompleteProfile) {
                    console.log('📡 Reloading profile data using TutorProfileDataLoader...');
                    await TutorProfileDataLoader.loadCompleteProfile();
                    console.log('✅ Profile UI updated successfully via data loader');
                } else {
                    // Fallback: manually update key elements
                    console.log('⚠️ TutorProfileDataLoader not available, updating elements manually');

                    // Update hero subtitle
                    if (profileData.hero_subtitle !== undefined) {
                        const heroSubtitleEl = document.getElementById('hero-subtitle');
                        if (heroSubtitleEl) heroSubtitleEl.textContent = profileData.hero_subtitle || '';
                    }

                    // Update bio/about
                    if (profileData.bio !== undefined) {
                        const bioEl = document.getElementById('tutor-bio');
                        if (bioEl) {
                            bioEl.textContent = profileData.bio || 'No bio provided yet.';
                            bioEl.style.color = profileData.bio ? 'var(--text)' : 'var(--text-muted)';
                            bioEl.style.fontStyle = profileData.bio ? 'normal' : 'italic';
                        }
                    }

                    // Update quote
                    if (profileData.quote !== undefined) {
                        const quoteEl = document.getElementById('tutor-quote');
                        if (quoteEl) {
                            quoteEl.textContent = profileData.quote ? `"${profileData.quote}"` : '';
                        }
                    }

                    // Update location
                    if (profileData.location !== undefined) {
                        const locationEl = document.getElementById('tutor-location');
                        if (locationEl && profileData.display_location) {
                            locationEl.textContent = profileData.location || 'Not specified';
                            locationEl.style.color = profileData.location ? 'var(--text)' : 'var(--text-muted)';
                        }
                    }

                    // Update languages (inline)
                    if (profileData.languages !== undefined) {
                        const languagesEl = document.getElementById('tutor-languages-inline');
                        if (languagesEl) {
                            if (profileData.languages && profileData.languages.length > 0) {
                                languagesEl.textContent = profileData.languages.join(', ');
                                languagesEl.style.color = 'var(--text)';
                                languagesEl.style.fontStyle = 'normal';
                            } else {
                                languagesEl.textContent = 'No languages yet';
                                languagesEl.style.color = 'var(--text-muted)';
                                languagesEl.style.fontStyle = 'italic';
                            }
                        }
                    }

                    // Update hobbies
                    if (profileData.hobbies !== undefined) {
                        const hobbiesEl = document.getElementById('tutor-hobbies');
                        if (hobbiesEl) {
                            if (profileData.hobbies && profileData.hobbies.length > 0) {
                                hobbiesEl.textContent = profileData.hobbies.join(', ');
                                hobbiesEl.style.color = 'var(--text)';
                                hobbiesEl.style.fontStyle = 'normal';
                            } else {
                                hobbiesEl.textContent = 'No hobbies yet';
                                hobbiesEl.style.color = 'var(--text-muted)';
                                hobbiesEl.style.fontStyle = 'italic';
                            }
                        }
                    }

                    console.log('✅ Profile UI updated successfully (manual fallback)');
                }
            } catch (error) {
                console.error('❌ Error updating profile UI:', error);
                // Last resort: reload the page
                console.log('⚠️ Falling back to page reload...');
                window.location.reload();
            }
        }

        /**
         * Save Profile (wrapper function called by button)
         */
        function saveProfile() {
            saveEditProfile();
        }

        // Make functions globally available
        window.openEditProfileModal = openEditProfileModal;
        window.closeEditProfileModal = closeEditProfileModal;
        window.updateProfileUI = updateProfileUI;
        window.addLanguage = addLanguage;
        window.removeLanguage = removeLanguage;
        window.addLocation = addLocation;
        // Handle "Change Location" button click
        function handleChangeLocation() {
            const allowLocationCheckbox = document.getElementById('editAllowLocation');
            const changeLocationBtn = document.getElementById('changeLocationBtn');

            if (allowLocationCheckbox) {
                allowLocationCheckbox.disabled = false; // Enable the checkbox
                allowLocationCheckbox.checked = false; // Uncheck it
                console.log('[Edit Profile] GPS checkbox enabled for location change');
            }

            if (changeLocationBtn) {
                changeLocationBtn.style.display = 'none'; // Hide the button
            }
        }

        window.removeLocation = removeLocation;
        window.addSocialLink = addSocialLink;
        window.removeSocialLink = removeSocialLink;
        window.addHeroTitle = addHeroTitle;
        window.removeHeroTitle = removeHeroTitle;
        window.addHobby = addHobby;
        window.removeHobby = removeHobby;
        window.handleChangeLocation = handleChangeLocation;
        window.saveEditProfile = saveEditProfile;
        window.saveProfile = saveProfile;
        window.updateProfileUI = updateProfileUI;

        console.log('✅ Edit Profile Modal: JavaScript loaded');
