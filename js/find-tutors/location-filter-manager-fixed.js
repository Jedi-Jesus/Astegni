/**
 * Location Filter Manager - FIXED VERSION
 * Dynamically populates location filter based on user's location hierarchy
 *
 * User location format: "Neighborhood, Sub-city, City, Country"
 * Example: "Megenagna, Yeka, Addis Ababa, Ethiopia"
 *
 * FIXES:
 * 1. More robust retry logic with exponential backoff
 * 2. Multiple event listeners for user data loading
 * 3. Direct API call fallback if localStorage is empty
 * 4. Better logging for debugging
 */

const LocationFilterManager = {
    initialized: false,
    retryCount: 0,
    maxRetries: 5,

    /**
     * Parse user's location string into hierarchical parts
     * @param {string} locationString - Full location string from user profile
     * @returns {object} Parsed location hierarchy
     */
    parseLocation(locationString) {
        if (!locationString) {
            return {
                country: null,
                city: null,
                subCity: null,
                neighborhood: null,
                parts: []
            };
        }

        // Split by comma and trim whitespace
        const parts = locationString.split(',').map(part => part.trim()).filter(part => part);

        // Assume format: [Neighborhood, Sub-city, City, Country] (most specific to least specific)
        // But handle cases where some parts might be missing
        const result = {
            country: null,
            city: null,
            subCity: null,
            neighborhood: null,
            parts: parts
        };

        if (parts.length >= 4) {
            // Full address: Neighborhood, Sub-city, City, Country
            result.neighborhood = parts[0];
            result.subCity = parts[1];
            result.city = parts[2];
            result.country = parts[3];
        } else if (parts.length === 3) {
            // Missing one level - assume no sub-city: Neighborhood, City, Country
            result.neighborhood = parts[0];
            result.city = parts[1];
            result.country = parts[2];
        } else if (parts.length === 2) {
            // City and Country only
            result.city = parts[0];
            result.country = parts[1];
        } else if (parts.length === 1) {
            // Country only
            result.country = parts[0];
        }

        return result;
    },

    /**
     * Initialize the location filter dropdown based on user's location
     */
    async init() {
        if (this.initialized) {
            console.log('[LocationFilter] Already initialized, skipping');
            return;
        }

        console.log('='.repeat(60));
        console.log('[LocationFilter] 🔍 INITIALIZING LOCATION FILTER');
        console.log('[LocationFilter] Retry count:', this.retryCount);
        console.log('='.repeat(60));

        // Get user location from all possible sources
        const userLocation = await this.getUserLocation();
        console.log('[LocationFilter] 📍 Final user location:', userLocation);

        if (!userLocation) {
            console.log('[LocationFilter] ❌ No user location found');

            // Retry with exponential backoff if we haven't exceeded max retries
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000); // Max 5 seconds
                console.log(`[LocationFilter] 🔄 Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
                setTimeout(() => this.init(), delay);
                return;
            }

            console.log('[LocationFilter] ⚠️ Max retries reached, showing default filter');
            this.showDefaultFilter();
            this.initialized = true;
            return;
        }

        // Parse location hierarchy
        const location = this.parseLocation(userLocation);
        console.log('[LocationFilter] 📊 Parsed location breakdown:');
        console.log('  - Country:', location.country);
        console.log('  - City:', location.city);
        console.log('  - Sub-city:', location.subCity);
        console.log('  - Neighborhood:', location.neighborhood);
        console.log('  - Parts array:', location.parts);

        // Populate dropdown with hierarchical options
        this.populateLocationFilter(location);
        this.initialized = true;
        console.log('[LocationFilter] ✅ Initialization complete');
        console.log('='.repeat(60));
    },

    /**
     * Get user's location from all possible sources with fallbacks
     * Priority: localStorage → window.user → window.authManager → API call
     */
    async getUserLocation() {
        console.log('[LocationFilter] 🔍 Searching for user location...');

        try {
            // SOURCE 1: Try localStorage first
            const userStr = localStorage.getItem('currentUser');
            console.log('[LocationFilter] localStorage currentUser:', userStr ? 'EXISTS' : 'NOT FOUND');

            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    console.log('[LocationFilter] Parsed user from localStorage:', {
                        id: user.id,
                        location: user.location,
                        first_name: user.first_name
                    });

                    if (user.location && user.location.trim()) {
                        console.log('[LocationFilter] ✅ Location found in localStorage:', user.location);
                        return user.location;
                    }
                } catch (e) {
                    console.error('[LocationFilter] Error parsing user from localStorage:', e);
                }
            }

            // SOURCE 2: Check window.user (from app.js)
            console.log('[LocationFilter] window.user:', window.user ? 'EXISTS' : 'NOT FOUND');
            if (window.user && window.user.location && window.user.location.trim()) {
                console.log('[LocationFilter] ✅ Location found in window.user:', window.user.location);
                return window.user.location;
            }

            // SOURCE 3: Check authManager instance
            if (window.authManager && window.authManager.user) {
                console.log('[LocationFilter] authManager.user:', 'EXISTS');
                console.log('[LocationFilter] authManager.user.location:', window.authManager.user.location);

                if (window.authManager.user.location && window.authManager.user.location.trim()) {
                    console.log('[LocationFilter] ✅ Location found in authManager:', window.authManager.user.location);
                    return window.authManager.user.location;
                }
            }

            // SOURCE 4: Direct API call as last resort (only if user is logged in)
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (token) {
                console.log('[LocationFilter] 🌐 User logged in but no location in memory, fetching from API...');
                const location = await this.fetchLocationFromAPI(token);
                if (location) {
                    console.log('[LocationFilter] ✅ Location fetched from API:', location);
                    return location;
                }
            } else {
                console.log('[LocationFilter] ⚠️ No token found, user not logged in');
            }

            console.log('[LocationFilter] ❌ No location found in any source');
            return null;

        } catch (error) {
            console.error('[LocationFilter] Error getting user location:', error);
            return null;
        }
    },

    /**
     * Fetch user location directly from API
     * @param {string} token - Access token
     * @returns {Promise<string|null>} User location or null
     */
    async fetchLocationFromAPI(token) {
        try {
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
            console.log('[LocationFilter] Fetching from:', `${API_BASE_URL}/api/me`);

            const response = await fetch(`${API_BASE_URL}/api/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[LocationFilter] API call failed:', response.status, response.statusText);
                return null;
            }

            const userData = await response.json();
            console.log('[LocationFilter] API response received:', {
                id: userData.id,
                location: userData.location,
                first_name: userData.first_name
            });

            // Update localStorage with fresh data
            if (userData.location) {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const updatedUser = { ...currentUser, ...userData };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                console.log('[LocationFilter] Updated localStorage with fresh location data');
            }

            return userData.location || null;

        } catch (error) {
            console.error('[LocationFilter] Error fetching from API:', error);
            return null;
        }
    },

    /**
     * Populate location filter dropdown with hierarchical options
     * @param {object} location - Parsed location hierarchy
     */
    populateLocationFilter(location) {
        console.log('[LocationFilter] 🏗️ Building dropdown options...');

        const select = document.getElementById('locationFilter');
        const hint = document.getElementById('locationFilterHint');

        if (!select) {
            console.error('[LocationFilter] ❌ Location filter dropdown not found in DOM!');
            return;
        }

        console.log('[LocationFilter] ✅ Dropdown element found');

        // Clear existing options (except "All Locations")
        select.innerHTML = '<option value="">All Locations</option>';
        console.log('[LocationFilter] Cleared existing options');

        // Build options from least specific to most specific
        const options = [];

        console.log('[LocationFilter] Checking location parts:');
        console.log('  - Has country?', !!location.country);
        console.log('  - Has city?', !!location.city);
        console.log('  - Has subCity?', !!location.subCity);
        console.log('  - Has neighborhood?', !!location.neighborhood);

        if (location.country) {
            const opt = {
                value: location.country,
                label: `In ${location.country} (Country)`,
                level: 'country'
            };
            options.push(opt);
            console.log('[LocationFilter] ✅ Added country option:', opt);
        }

        if (location.city) {
            const opt = {
                value: `${location.city}, ${location.country || ''}`.trim().replace(/,$/, ''),
                label: `In ${location.city} (City)`,
                level: 'city'
            };
            options.push(opt);
            console.log('[LocationFilter] ✅ Added city option:', opt);
        }

        if (location.subCity) {
            const opt = {
                value: `${location.subCity}, ${location.city}, ${location.country}`.replace(/,\s*,/g, ',').trim(),
                label: `In ${location.subCity} (Sub-city/District)`,
                level: 'subCity'
            };
            options.push(opt);
            console.log('[LocationFilter] ✅ Added sub-city option:', opt);
        }

        if (location.neighborhood) {
            const fullLocation = [location.neighborhood, location.subCity, location.city, location.country]
                .filter(Boolean)
                .join(', ');
            const opt = {
                value: fullLocation,
                label: `In ${location.neighborhood} (Neighborhood)`,
                level: 'neighborhood'
            };
            options.push(opt);
            console.log('[LocationFilter] ✅ Added neighborhood option:', opt);
        }

        console.log('[LocationFilter] 📋 Total options created:', options.length);

        // Add options to dropdown
        options.forEach((option, index) => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            optionElement.dataset.level = option.level;
            select.appendChild(optionElement);
            console.log(`[LocationFilter] Added option ${index + 1}:`, option.label);
        });

        // Show hint with user's full location
        if (hint && location.parts.length > 0) {
            hint.textContent = `Your location: ${location.parts.join(', ')}`;
            hint.style.display = 'block';
            console.log('[LocationFilter] ✅ Hint displayed:', hint.textContent);
        }

        console.log('[LocationFilter] 🎉 Populated dropdown with', options.length, 'options');
        console.log('[LocationFilter] Final dropdown HTML:', select.innerHTML);
    },

    /**
     * Show default filter when user is not logged in or has no location
     */
    showDefaultFilter() {
        const select = document.getElementById('locationFilter');
        const hint = document.getElementById('locationFilterHint');

        if (select) {
            select.innerHTML = `
                <option value="">All Locations</option>
                <option value="Ethiopia">Ethiopia</option>
            `;
            console.log('[LocationFilter] Showed default filter');
        }

        if (hint) {
            hint.style.display = 'none';
        }
    },

    /**
     * Manual refresh - can be called from console for debugging
     */
    refresh() {
        console.log('[LocationFilter] Manual refresh triggered');
        this.initialized = false;
        this.retryCount = 0;
        this.init();
    }
};

// ============================================
// INITIALIZATION STRATEGIES
// ============================================

/**
 * Initialize with multiple strategies to ensure user data is loaded
 */
async function initializeLocationFilter() {
    console.log('[LocationFilter] 🚀 Starting initialization...');
    await LocationFilterManager.init();
}

// Strategy 1: Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[LocationFilter] DOMContentLoaded event fired');
        setTimeout(initializeLocationFilter, 500); // Increased delay to 500ms
    });
} else {
    console.log('[LocationFilter] DOM already loaded');
    setTimeout(initializeLocationFilter, 500);
}

// Strategy 2: Re-initialize when localStorage changes (user logs in)
window.addEventListener('storage', (e) => {
    if (e.key === 'currentUser' && !LocationFilterManager.initialized) {
        console.log('[LocationFilter] localStorage currentUser changed, re-initializing...');
        setTimeout(() => LocationFilterManager.init(), 200);
    }
});

// Strategy 3: Listen for custom user loaded event (dispatched by auth.js)
document.addEventListener('userDataLoaded', (event) => {
    console.log('[LocationFilter] userDataLoaded event received');
    if (event.detail && event.detail.location) {
        console.log('[LocationFilter] Location found in event:', event.detail.location);
    }
    if (!LocationFilterManager.initialized) {
        LocationFilterManager.init();
    }
});

// Strategy 4: Listen for login success event (if it exists)
document.addEventListener('loginSuccess', () => {
    console.log('[LocationFilter] loginSuccess event received');
    if (!LocationFilterManager.initialized) {
        setTimeout(() => LocationFilterManager.init(), 500);
    }
});

// Strategy 5: Check periodically for first 10 seconds (aggressive retry)
let checkCount = 0;
const maxChecks = 10;
const checkInterval = setInterval(() => {
    checkCount++;

    if (LocationFilterManager.initialized) {
        console.log('[LocationFilter] Already initialized, stopping periodic checks');
        clearInterval(checkInterval);
        return;
    }

    if (checkCount >= maxChecks) {
        console.log('[LocationFilter] Max periodic checks reached, stopping');
        clearInterval(checkInterval);
        return;
    }

    console.log(`[LocationFilter] Periodic check ${checkCount}/${maxChecks}`);
    LocationFilterManager.init();
}, 1000);

// Expose globally so it can be manually refreshed
window.LocationFilterManager = LocationFilterManager;

console.log('[LocationFilter] 📝 Module loaded. Use LocationFilterManager.refresh() to manually reload');
