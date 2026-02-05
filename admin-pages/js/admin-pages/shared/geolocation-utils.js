/**
 * Geolocation Utilities for Astegni Admin Pages
 * Provides GPS location detection and reverse geocoding functionality
 *
 * Usage:
 * 1. Include this script in your HTML
 * 2. Call handleAllowLocationChange(checkbox) when allow_location checkbox changes
 * 3. Call detectCurrentLocation() to get user's current location
 *
 * Location Detection:
 * - Uses Browser Geolocation API (GPS, WiFi positioning, cell towers)
 * - Detects PHYSICAL location (NOT affected by VPN)
 * - Requires user permission in browser
 *
 * Dependencies: None (uses browser Geolocation API and free Nominatim API)
 */

// =============================================
// GEOLOCATION CONFIGURATION
// =============================================

const GeoConfig = {
    // Geolocation options - Force fresh location (no cache)
    // Uses GPS/WiFi/Cell towers - NOT affected by VPN
    geoOptions: {
        enableHighAccuracy: true,  // Force GPS over WiFi/Cell when available
        timeout: 15000,            // 15 seconds timeout
        maximumAge: 0              // NEVER use cached position, always get fresh GPS reading
    },
    // Free reverse geocoding API (OpenStreetMap Nominatim)
    // This converts GPS coordinates to human-readable address
    nominatimUrl: 'https://nominatim.openstreetmap.org/reverse',
    // Free IP geolocation APIs (FALLBACK ONLY - affected by VPN)
    // Only used when GPS fails
    ipGeoApis: [
        'https://ipapi.co/json/',
        'https://ipwho.is/'
    ],
    // User agent for Nominatim (required by their policy)
    userAgent: 'Astegni-Admin-Panel/1.0'
};

// =============================================
// MAIN FUNCTIONS
// =============================================

/**
 * Handle allow_location checkbox change
 * When checked, automatically detects and populates user's current location
 * @param {HTMLInputElement} checkbox - The allow_location checkbox element
 */
window.handleAllowLocationChange = function(checkbox) {
    const detectBtn = document.getElementById('detectLocationBtn');
    const statusDiv = document.getElementById('locationStatus');

    if (checkbox.checked) {
        // Show detect button
        if (detectBtn) {
            detectBtn.classList.remove('hidden');
        }
        // Automatically detect location when checkbox is checked
        detectCurrentLocation();
    } else {
        // Hide detect button when unchecked
        if (detectBtn) {
            detectBtn.classList.add('hidden');
        }
        // Clear status when unchecked
        if (statusDiv) {
            statusDiv.classList.add('hidden');
            statusDiv.textContent = '';
        }
    }
};

/**
 * Detect user's current location using GPS (Browser Geolocation API)
 * PRIMARY: GPS/WiFi/Cell towers (NOT affected by VPN) - detects PHYSICAL location
 * FALLBACK: IP geolocation (affected by VPN) - only used when GPS fails
 */
window.detectCurrentLocation = async function() {
    const statusDiv = document.getElementById('locationStatus');
    const detectBtn = document.getElementById('detectLocationBtn');

    // Show loading state
    showLocationStatus('Detecting your physical location via GPS...', 'loading');
    if (detectBtn) {
        detectBtn.disabled = true;
        detectBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Detecting...';
    }

    try {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            console.warn('[Geolocation] Browser geolocation not supported, using IP fallback');
            await fallbackToIPLocation();
            return;
        }

        console.log('[Geolocation] Requesting GPS position (physical location)...');

        // Get current position using GPS/WiFi/Cell towers (NOT affected by VPN)
        const position = await getCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;

        console.log(`[Geolocation] GPS coordinates: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
        showLocationStatus(`Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} - Getting address...`, 'loading');

        // Reverse geocode to get readable address
        const address = await reverseGeocode(latitude, longitude);

        if (address) {
            addDetectedLocation(address);
            showLocationStatus(`Physical location detected: ${address}`, 'success');
        } else {
            // If geocoding fails, add coordinates as location
            const coordLocation = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            addDetectedLocation(coordLocation);
            showLocationStatus(`Location detected (coordinates): ${coordLocation}`, 'success');
        }

    } catch (error) {
        console.error('[Geolocation] GPS error:', error);
        console.log('[Geolocation] Attempting IP-based fallback...');

        // Try IP-based fallback when GPS fails
        await fallbackToIPLocation();
    } finally {
        // Reset button state
        if (detectBtn) {
            detectBtn.disabled = false;
            detectBtn.innerHTML = '<i class="fas fa-location-arrow mr-1"></i> Detect Location';
        }
    }
};

/**
 * Fallback to IP-based location when GPS fails
 * Note: This may be affected by VPN
 */
async function fallbackToIPLocation() {
    showLocationStatus('GPS unavailable, trying IP-based location...', 'loading');

    const ipLocation = await getLocationByIP();

    if (ipLocation) {
        addDetectedLocation(ipLocation);
        showLocationStatus(`Location detected via IP: ${ipLocation} (may differ if using VPN)`, 'success');
    } else {
        showLocationStatus('Failed to detect location. Please enter manually.', 'error');
    }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get current position as a Promise
 * @returns {Promise<GeolocationPosition>}
 */
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, GeoConfig.geoOptions);
    });
}

/**
 * Get location based on IP address (FALLBACK - affected by VPN)
 * Tries multiple free IP geolocation APIs with fallback
 * @returns {Promise<string|null>}
 */
async function getLocationByIP() {
    console.log('[Geolocation] Falling back to IP-based location (may be affected by VPN)...');

    for (const apiUrl of GeoConfig.ipGeoApis) {
        try {
            console.log(`[Geolocation] Trying IP API: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`[Geolocation] API ${apiUrl} returned status ${response.status}`);
                continue;
            }

            const data = await response.json();
            console.log('[Geolocation] IP-API response:', data);

            // Parse response based on API format
            const location = parseIPGeoResponse(data);
            if (location) {
                return location;
            }
        } catch (error) {
            console.warn(`[Geolocation] API ${apiUrl} failed:`, error.message);
            continue;
        }
    }

    console.error('[Geolocation] All IP geolocation APIs failed');
    return null;
}

/**
 * Parse IP geolocation response from different API formats
 * @param {Object} data - Response data from IP geolocation API
 * @returns {string|null}
 */
function parseIPGeoResponse(data) {
    const parts = [];

    // ipapi.co format
    if (data.city) parts.push(data.city);
    if (data.region) parts.push(data.region);
    else if (data.region_name) parts.push(data.region_name);
    else if (data.regionName) parts.push(data.regionName);

    if (data.country_name) parts.push(data.country_name);
    else if (data.country) parts.push(data.country);

    // If we got at least city and country, return it
    if (parts.length >= 2) {
        return parts.join(', ');
    }

    // Fallback: try to get any location info
    if (data.country_name || data.country) {
        return data.country_name || data.country;
    }

    return null;
}

/**
 * Reverse geocode coordinates to get readable address
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string|null>}
 */
async function reverseGeocode(latitude, longitude) {
    try {
        const url = `${GeoConfig.nominatimUrl}?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': GeoConfig.userAgent
            }
        });

        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }

        const data = await response.json();

        if (data && data.address) {
            // Build a readable address from the response
            return formatAddress(data.address, data.display_name);
        }

        return null;
    } catch (error) {
        console.error('[Geolocation] Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Format address from Nominatim response
 * @param {Object} address - Address components from Nominatim
 * @param {string} displayName - Full display name from Nominatim
 * @returns {string}
 */
function formatAddress(address, displayName) {
    console.log('[Geolocation] Raw address data:', address);

    // Try to build a concise address
    const parts = [];

    // Add neighborhood/suburb/subcity if available (most specific)
    if (address.neighbourhood) {
        parts.push(address.neighbourhood);
        console.log('[Geolocation] Added neighbourhood:', address.neighbourhood);
    } else if (address.suburb) {
        parts.push(address.suburb);
        console.log('[Geolocation] Added suburb:', address.suburb);
    } else if (address.quarter) {
        parts.push(address.quarter);
        console.log('[Geolocation] Added quarter:', address.quarter);
    }

    // Add city subcity (Ethiopian specific)
    if (address.city_district) {
        parts.push(address.city_district);
        console.log('[Geolocation] Added city_district:', address.city_district);
    }

    // Add city/town (main city)
    if (address.city) {
        parts.push(address.city);
        console.log('[Geolocation] Added city:', address.city);
    } else if (address.town) {
        parts.push(address.town);
        console.log('[Geolocation] Added town:', address.town);
    } else if (address.village) {
        parts.push(address.village);
        console.log('[Geolocation] Added village:', address.village);
    } else if (address.municipality) {
        parts.push(address.municipality);
        console.log('[Geolocation] Added municipality:', address.municipality);
    } else if (address.county) {
        parts.push(address.county);
        console.log('[Geolocation] Added county:', address.county);
    }

    // Add state/region (optional for clarity)
    if (address.state && parts.length > 0) {
        // Only add state if we already have other location info
        // and if state is different from city (avoid duplication)
        const cityName = address.city || address.town || address.village || '';
        if (address.state !== cityName) {
            parts.push(address.state);
            console.log('[Geolocation] Added state:', address.state);
        }
    }

    // Add country (always include if available)
    if (address.country) {
        parts.push(address.country);
        console.log('[Geolocation] Added country:', address.country);
    }

    console.log('[Geolocation] Final parts array:', parts);

    // If we got at least one meaningful part, use them
    if (parts.length >= 1) {
        const result = parts.join(', ');
        console.log('[Geolocation] Formatted address:', result);
        return result;
    }

    // Fallback to display_name but truncate if too long
    if (displayName) {
        console.log('[Geolocation] Using display_name fallback:', displayName);
        if (displayName.length > 150) {
            return displayName.substring(0, 150) + '...';
        }
        return displayName;
    }

    console.warn('[Geolocation] No address data available');
    return 'Unknown location';
}

/**
 * Add detected location to the locations list
 * Uses the addLocationField function from array-field-utils.js
 * @param {string} location
 */
function addDetectedLocation(location) {
    if (typeof addLocationField === 'function') {
        // Check if this location already exists
        const existingLocations = typeof getLocations === 'function' ? getLocations() : [];

        if (!existingLocations.includes(location)) {
            addLocationField(location);
            console.log(`[Geolocation] Added location: ${location}`);
        } else {
            console.log(`[Geolocation] Location already exists: ${location}`);
        }
    } else {
        console.warn('[Geolocation] addLocationField function not available');
    }
}

/**
 * Show location status message
 * @param {string} message
 * @param {string} type - 'loading', 'success', 'error'
 */
function showLocationStatus(message, type) {
    const statusDiv = document.getElementById('locationStatus');
    if (!statusDiv) return;

    statusDiv.classList.remove('hidden', 'text-gray-500', 'text-green-600', 'text-red-600');

    switch (type) {
        case 'loading':
            statusDiv.classList.add('text-gray-500');
            statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> ${message}`;
            break;
        case 'success':
            statusDiv.classList.add('text-green-600');
            statusDiv.innerHTML = `<i class="fas fa-check-circle mr-1"></i> ${message}`;
            break;
        case 'error':
            statusDiv.classList.add('text-red-600');
            statusDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> ${message}`;
            break;
        default:
            statusDiv.textContent = message;
    }
}

/**
 * Get user-friendly error message for geolocation errors
 * @param {Error|GeolocationPositionError} error
 * @returns {string}
 */
function getGeolocationErrorMessage(error) {
    if (error.code) {
        switch (error.code) {
            case 1: // PERMISSION_DENIED
                return 'Location access denied. Please allow location access in your browser settings.';
            case 2: // POSITION_UNAVAILABLE
                return 'Location unavailable. Please check your device\'s location settings.';
            case 3: // TIMEOUT
                return 'Location request timed out. Please try again.';
            default:
                return 'Failed to detect location. Please try again.';
        }
    }
    return error.message || 'Failed to detect location. Please try again.';
}

/**
 * Initialize geolocation UI based on current checkbox state
 * Call this when the modal opens
 */
window.initGeolocationUI = function() {
    const allowLocationCheckbox = document.getElementById('editAllowLocation');
    if (allowLocationCheckbox) {
        handleAllowLocationChange(allowLocationCheckbox);
    }
};

// Log that the utility is loaded
console.log('[Geolocation Utils] Loaded successfully');
