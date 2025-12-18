
//    <!-- Edit Profile Modal JavaScript (Languages, Locations) -->
        // Global arrays for dynamic fields
        let languagesList = [];
        let locationsList = [];
        let socialLinksList = [];
        let heroTitlesList = [];

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
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="telegram">Telegram</option>
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
                const endpoint = (window.API_BASE_URL || 'http://localhost:8000')/api/tutor/profile;
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
            const quote = document.getElementById('profileQuote')?.value?.trim();
            const aboutUs = document.getElementById('aboutUs')?.value?.trim();
            const heroTitles = getHeroTitles();
            const heroSubtitle = document.getElementById('heroSubtitle')?.value?.trim();
            const socialLinks = getSocialLinks();

            // Prepare update data based on user role
            const updateData = {
                username: username,  // Saves to tutor_profiles.username (NOT users.username)
                languages: languages,
                location: location,  // Saves to tutor_profiles.location
                quote: quote,
                bio: aboutUs,  // FIXED: Backend expects bio, not about
                hero_titles: heroTitles,  // Array of hero titles
                hero_subtitle: heroSubtitle,
                social_links: socialLinks  // Saves to tutor_profiles.social_links (JSONB)
            };

            try {
                // ALWAYS use tutor endpoint since this is tutor-profile.html
                const endpoint = (window.API_BASE_URL || 'http://localhost:8000')/api/tutor/profile;
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

                // Reload page to reflect changes
                window.location.reload();
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('❌ Failed to update profile. Please try again.');
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
        window.addLanguage = addLanguage;
        window.removeLanguage = removeLanguage;
        window.addLocation = addLocation;
        window.removeLocation = removeLocation;
        window.addSocialLink = addSocialLink;
        window.removeSocialLink = removeSocialLink;
        window.addHeroTitle = addHeroTitle;
        window.removeHeroTitle = removeHeroTitle;
        window.saveEditProfile = saveEditProfile;
        window.saveProfile = saveProfile;

        console.log('✅ Edit Profile Modal: JavaScript loaded');
