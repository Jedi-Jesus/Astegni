// ============================================
// PRICING & FEATURES MANAGEMENT
// Handles CPI pricing, subscription pricing, and affiliate settings
// ============================================

// API Configuration - use global config set by api-config.js
function getApiBaseUrl() {
    return window.API_BASE_URL || window.ADMIN_API_CONFIG?.API_BASE_URL || 'http://localhost:8000';
}

// Get auth token - check all possible keys used in admin pages
function getAuthToken() {
    return localStorage.getItem('adminToken') ||
           localStorage.getItem('admin_access_token') ||
           localStorage.getItem('access_token') ||
           localStorage.getItem('token');
}

// ============================================
// CPI (COST PER IMPRESSION) PRICING MANAGEMENT
// ============================================

// Global CPI settings object
// Note: "All" audience and "International" location use the baseRate (no premium)
// Region exclusion premiums now use JSONB format: {"ET": {"addis-ababa": 1.0, ...}, "KE": {...}}
let cpiSettings = {
    baseRate: 0,
    audiencePremiums: {
        tutor: 0,
        student: 0,
        parent: 0,
        advertiser: 0,
        user: 0
    },
    locationPremiums: {
        national: 0
    },
    regionExclusionPremiums: {},  // JSONB format by country code
    placementPremiums: {
        placeholder: 0,
        widget: 0,
        popup: 0,
        insession: 0
    }
};

// Country regions configuration (loaded from backend)
let countryRegions = {};

// Currently selected country for region exclusion premiums
let currentSelectedCountry = 'ET';

// Store detected currency based on GPS location
let cpiDetectedCurrency = 'ETB';

// Format country label for display
function formatCountryLabel(country) {
    if (country === 'all') return 'Global (All Countries)';

    const countries = {
        'ET': 'Ethiopia', 'CM': 'Cameroon', 'KE': 'Kenya', 'NG': 'Nigeria', 'GH': 'Ghana',
        'ZA': 'South Africa', 'EG': 'Egypt', 'TZ': 'Tanzania', 'UG': 'Uganda', 'MA': 'Morocco',
        'DZ': 'Algeria', 'TN': 'Tunisia', 'RW': 'Rwanda', 'SN': 'Senegal', 'CI': 'Ivory Coast',
        'MX': 'Mexico', 'US': 'United States', 'CA': 'Canada', 'BR': 'Brazil', 'AR': 'Argentina',
        'CO': 'Colombia', 'CL': 'Chile', 'PE': 'Peru',
        'GB': 'United Kingdom', 'DE': 'Germany', 'FR': 'France', 'ES': 'Spain', 'IT': 'Italy',
        'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria', 'PL': 'Poland',
        'CN': 'China', 'IN': 'India', 'JP': 'Japan', 'KR': 'South Korea', 'SG': 'Singapore',
        'MY': 'Malaysia', 'TH': 'Thailand', 'VN': 'Vietnam', 'PH': 'Philippines', 'ID': 'Indonesia',
        'SA': 'Saudi Arabia', 'AE': 'United Arab Emirates', 'IL': 'Israel', 'TR': 'Turkey',
        'AU': 'Australia', 'NZ': 'New Zealand'
    };

    return countries[country] || country;
}

// Map country names to ISO codes
function getCountryCode(countryName) {
    const countryNameToCode = {
        'Ethiopia': 'ET', 'Cameroon': 'CM', 'Kenya': 'KE', 'Nigeria': 'NG', 'Ghana': 'GH',
        'South Africa': 'ZA', 'Egypt': 'EG', 'Tanzania': 'TZ', 'Uganda': 'UG', 'Morocco': 'MA',
        'Algeria': 'DZ', 'Tunisia': 'TN', 'Rwanda': 'RW', 'Senegal': 'SN',
        'Ivory Coast': 'CI', 'Côte d\'Ivoire': 'CI',
        'Mexico': 'MX', 'United States': 'US', 'United States of America': 'US', 'Canada': 'CA',
        'Brazil': 'BR', 'Argentina': 'AR', 'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE',
        'United Kingdom': 'GB', 'Germany': 'DE', 'France': 'FR', 'Spain': 'ES', 'Italy': 'IT',
        'Netherlands': 'NL', 'Belgium': 'BE', 'Switzerland': 'CH', 'Austria': 'AT', 'Poland': 'PL',
        'China': 'CN', 'India': 'IN', 'Japan': 'JP', 'South Korea': 'KR', 'Singapore': 'SG',
        'Malaysia': 'MY', 'Thailand': 'TH', 'Vietnam': 'VN', 'Philippines': 'PH', 'Indonesia': 'ID',
        'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', 'UAE': 'AE',
        'Israel': 'IL', 'Turkey': 'TR',
        'Australia': 'AU', 'New Zealand': 'NZ'
    };

    return countryNameToCode[countryName] || null;
}

// Map country codes to currencies
function getCurrencyForCountry(countryCode) {
    const countryToCurrency = {
        // Africa (15 countries)
        'ET': 'ETB',  // Ethiopia - Ethiopian Birr
        'KE': 'KES',  // Kenya - Kenyan Shilling
        'NG': 'NGN',  // Nigeria - Nigerian Naira
        'ZA': 'ZAR',  // South Africa - South African Rand
        'EG': 'EGP',  // Egypt - Egyptian Pound
        'GH': 'GHS',  // Ghana - Ghanaian Cedi
        'TZ': 'TZS',  // Tanzania - Tanzanian Shilling
        'UG': 'UGX',  // Uganda - Ugandan Shilling
        'MA': 'MAD',  // Morocco - Moroccan Dirham
        'DZ': 'DZD',  // Algeria - Algerian Dinar
        'TN': 'TND',  // Tunisia - Tunisian Dinar
        'RW': 'RWF',  // Rwanda - Rwandan Franc
        'SN': 'XOF',  // Senegal - West African CFA Franc
        'CI': 'XOF',  // Ivory Coast - West African CFA Franc
        'CM': 'XAF',  // Cameroon - Central African CFA Franc

        // Americas (8 countries)
        'US': 'USD',  // United States - US Dollar
        'CA': 'CAD',  // Canada - Canadian Dollar
        'MX': 'MXN',  // Mexico - Mexican Peso
        'BR': 'BRL',  // Brazil - Brazilian Real
        'AR': 'ARS',  // Argentina - Argentine Peso
        'CO': 'COP',  // Colombia - Colombian Peso
        'CL': 'CLP',  // Chile - Chilean Peso
        'PE': 'PEN',  // Peru - Peruvian Sol

        // Europe (11 countries)
        'GB': 'GBP',  // United Kingdom - British Pound
        'CH': 'CHF',  // Switzerland - Swiss Franc
        'PL': 'PLN',  // Poland - Polish Zloty
        // Euro countries
        'DE': 'EUR',  // Germany - Euro
        'FR': 'EUR',  // France - Euro
        'ES': 'EUR',  // Spain - Euro
        'IT': 'EUR',  // Italy - Euro
        'NL': 'EUR',  // Netherlands - Euro
        'BE': 'EUR',  // Belgium - Euro
        'AT': 'EUR',  // Austria - Euro
        'TR': 'TRY',  // Turkey - Turkish Lira

        // Asia (10 countries)
        'CN': 'CNY',  // China - Chinese Yuan
        'IN': 'INR',  // India - Indian Rupee
        'JP': 'JPY',  // Japan - Japanese Yen
        'KR': 'KRW',  // South Korea - South Korean Won
        'SG': 'SGD',  // Singapore - Singapore Dollar
        'MY': 'MYR',  // Malaysia - Malaysian Ringgit
        'TH': 'THB',  // Thailand - Thai Baht
        'VN': 'VND',  // Vietnam - Vietnamese Dong
        'PH': 'PHP',  // Philippines - Philippine Peso
        'ID': 'IDR',  // Indonesia - Indonesian Rupiah

        // Middle East (4 countries)
        'SA': 'SAR',  // Saudi Arabia - Saudi Riyal
        'AE': 'AED',  // UAE - UAE Dirham
        'IL': 'ILS',  // Israel - Israeli Shekel

        // Oceania (2 countries)
        'AU': 'AUD',  // Australia - Australian Dollar
        'NZ': 'NZD',  // New Zealand - New Zealand Dollar

        // Default
        'all': 'USD'  // Global - US Dollar as default
    };

    return countryToCurrency[countryCode] || 'USD';
}

// Detect country from GPS for CPI settings
async function detectCpiCountryFromGPS() {
    const countryField = document.getElementById('cpi-country');
    const countryDisplay = document.getElementById('cpi-country-display');
    const countryStatusDiv = document.getElementById('cpi-country-status');

    if (!countryField || !countryDisplay) {
        console.error('[GPS-CPI] Country field or display not found');
        return;
    }

    try {
        countryDisplay.innerHTML = '<i class="fas fa-spinner fa-spin mr-2 text-blue-500"></i>Detecting location...';
        if (countryStatusDiv) {
            countryStatusDiv.innerHTML = '<span class="text-blue-600"><i class="fas fa-spinner fa-spin mr-1"></i>Detecting your GPS location...</span>';
        }

        if (!navigator.geolocation) {
            console.warn('[GPS-CPI] Geolocation not supported, defaulting to Global');
            countryField.value = 'all';
            countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';
            if (countryStatusDiv) {
                countryStatusDiv.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle mr-1"></i>GPS not available. Using global pricing.</span>';
            }
            return;
        }

        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            });
        });

        const { latitude, longitude } = position.coords;
        console.log(`[GPS-CPI] Coordinates: ${latitude}, ${longitude}`);

        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'Astegni-Admin-CPI-Settings-Manager/1.0'
            }
        });

        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }

        const data = await response.json();
        console.log('[GPS-CPI] Geocoding data:', data);

        if (data && data.address) {
            const countryName = data.address.country;
            let countryCode = data.address.country_code ? data.address.country_code.toUpperCase() : null;

            console.log(`[GPS-CPI] Country detected: ${countryName} (${countryCode})`);

            if (!countryCode && countryName) {
                countryCode = getCountryCode(countryName);
            }

            if (countryCode) {
                countryField.value = countryCode;
                countryDisplay.innerHTML = `<i class="fas fa-map-marker-alt mr-2 text-green-500"></i>${countryName}`;

                // Set currency based on country
                cpiDetectedCurrency = getCurrencyForCountry(countryCode);
                console.log(`[GPS-CPI] Currency set to: ${cpiDetectedCurrency} for ${countryName}`);

                if (countryStatusDiv) {
                    countryStatusDiv.innerHTML = `<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Detected: ${countryName} (${cpiDetectedCurrency})</span>`;
                }

                console.log(`[GPS-CPI] Country set to: ${countryName} (${countryCode})`);
            } else {
                countryField.value = 'all';
                countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';

                if (countryStatusDiv) {
                    countryStatusDiv.innerHTML = `<span class="text-yellow-600"><i class="fas fa-exclamation-triangle mr-1"></i>Could not determine country code. Using global pricing.</span>`;
                }
            }
        } else {
            countryField.value = 'all';
            countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';

            if (countryStatusDiv) {
                countryStatusDiv.innerHTML = `<span class="text-yellow-600"><i class="fas fa-exclamation-triangle mr-1"></i>Could not determine country. Using global pricing.</span>`;
            }
        }

    } catch (error) {
        console.error('[GPS-CPI] Error detecting country:', error);

        countryField.value = 'all';
        countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';

        if (countryStatusDiv) {
            if (error.code === 1) {
                countryStatusDiv.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-circle mr-1"></i>Location permission denied. Using global pricing.</span>';
            } else if (error.code === 2) {
                countryStatusDiv.innerHTML = '<span class="text-yellow-500"><i class="fas fa-exclamation-triangle mr-1"></i>Location unavailable. Using global pricing.</span>';
            } else if (error.code === 3) {
                countryStatusDiv.innerHTML = '<span class="text-yellow-500"><i class="fas fa-clock mr-1"></i>Location timeout. Using global pricing.</span>';
            } else {
                countryStatusDiv.innerHTML = '<span class="text-gray-500"><i class="fas fa-map-marker-alt mr-1"></i>Location unavailable. Using global pricing.</span>';
            }
        }
    }
}

// Open CPI Settings Modal
async function openCpiSettingsModal() {
    const modal = document.getElementById('cpi-settings-modal');
    if (modal) {
        // Load current settings into form
        loadCpiSettingsToForm();
        modal.classList.remove('hidden');
        // Calculate initial preview
        calculateCpiPreview();

        // Auto-detect country from GPS ONLY if no existing country is set
        // (i.e., when creating new settings for the first time)
        const existingCountry = cpiSettings.country;
        if (!existingCountry || existingCountry === '') {
            detectCpiCountryFromGPS().catch(err => {
                console.warn('[GPS-CPI] Auto-detection failed:', err);
            });
        }
    }
}

// Close CPI Settings Modal
function closeCpiSettingsModal() {
    const modal = document.getElementById('cpi-settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Load CPI Settings from database into form
async function loadCpiSettings() {
    console.log('Loading CPI settings from database...');

    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('No auth token found');
            return;
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/cpi-settings`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
                cpiSettings = data.settings;
                console.log('CPI settings loaded:', cpiSettings);
            }
            // Store country regions configuration
            if (data.countryRegions) {
                countryRegions = data.countryRegions;
                console.log('Country regions loaded:', Object.keys(countryRegions));
            }
            renderCpiRatesGrid();
        } else {
            console.log('No CPI settings found, using defaults');
            renderCpiRatesGrid();
        }
    } catch (error) {
        console.error('Error loading CPI settings:', error);
        renderCpiRatesGrid();
    }
}

// Load CPI settings into form fields
function loadCpiSettingsToForm() {
    // Base rate (applies to "All" audience and "International" location)
    const baseRateEl = document.getElementById('cpi-base-rate');
    if (baseRateEl) baseRateEl.value = cpiSettings.baseRate || '';

    // Set country (hidden field and display) - no GPS detection when loading existing data
    const countryCode = cpiSettings.country || 'all';
    const countryField = document.getElementById('cpi-country');
    const countryDisplay = document.getElementById('cpi-country-display');
    if (countryField) {
        countryField.value = countryCode;
    }
    if (countryDisplay) {
        countryDisplay.innerHTML = `<i class="fas fa-map-marker-alt mr-2 text-gray-500"></i>${formatCountryLabel(countryCode)}`;
    }

    // Set currency based on existing settings currency or derive from country
    cpiDetectedCurrency = cpiSettings.currency || getCurrencyForCountry(countryCode);

    // Audience premiums (Tutor, Student, Parent, Advertiser, User - "All" uses base rate)
    const tutorEl = document.getElementById('cpi-tutor-premium');
    const studentEl = document.getElementById('cpi-student-premium');
    const parentEl = document.getElementById('cpi-parent-premium');
    const advertiserEl = document.getElementById('cpi-advertiser-premium');
    const userEl = document.getElementById('cpi-user-premium');
    if (tutorEl) tutorEl.value = cpiSettings.audiencePremiums?.tutor || '';
    if (studentEl) studentEl.value = cpiSettings.audiencePremiums?.student || '';
    if (parentEl) parentEl.value = cpiSettings.audiencePremiums?.parent || '';
    if (advertiserEl) advertiserEl.value = cpiSettings.audiencePremiums?.advertiser || '';
    if (userEl) userEl.value = cpiSettings.audiencePremiums?.user || '';

    // Location premiums (National only - "International" uses base rate)
    const nationalEl = document.getElementById('cpi-national-premium');
    if (nationalEl) nationalEl.value = cpiSettings.locationPremiums?.national || '';

    // Determine which location type to show based on existing settings
    const locationTypeEl = document.getElementById('cpi-location-type');
    const hasRegionPremiums = cpiSettings.regionExclusionPremiums &&
                              Object.keys(cpiSettings.regionExclusionPremiums).length > 0 &&
                              Object.values(cpiSettings.regionExclusionPremiums).some(regions =>
                                  Object.values(regions).some(val => val > 0)
                              );
    const hasNationalPremium = cpiSettings.locationPremiums?.national > 0;

    if (locationTypeEl) {
        if (hasRegionPremiums) {
            locationTypeEl.value = 'regional';
        } else if (hasNationalPremium) {
            locationTypeEl.value = 'national';
        } else {
            locationTypeEl.value = 'global';
        }
        // Trigger the change handler to show/hide sections
        onCpiLocationTypeChange();
    }

    // Region exclusion premiums (dynamic, country-agnostic)
    // Render regions for the current country (only visible when regional is selected)
    renderRegionsForCountry(currentSelectedCountry);

    // Placement premiums (Ad Placeholder, Widget, Whiteboard Pop-up, Whiteboard In-Session)
    const placeholderEl = document.getElementById('cpi-placeholder-premium');
    const widgetEl = document.getElementById('cpi-widget-premium');
    const popupEl = document.getElementById('cpi-popup-premium');
    const insessionEl = document.getElementById('cpi-insession-premium');
    if (placeholderEl) placeholderEl.value = cpiSettings.placementPremiums?.placeholder || '';
    if (widgetEl) widgetEl.value = cpiSettings.placementPremiums?.widget || '';
    if (popupEl) popupEl.value = cpiSettings.placementPremiums?.popup || '';
    if (insessionEl) insessionEl.value = cpiSettings.placementPremiums?.insession || '';
}

// Render regions for a specific country (dynamic UI generation)
function renderRegionsForCountry(countryCode) {
    const container = document.getElementById('cpi-regions-container');
    if (!container) return;

    // Get regions for this country
    const countryData = countryRegions[countryCode];
    if (!countryData || !countryData.regions) {
        container.innerHTML = `
            <div class="col-span-2 text-center py-4 text-gray-500">
                <i class="fas fa-exclamation-triangle mr-2 text-amber-500"></i>
                No regions configured for this country
            </div>
        `;
        return;
    }

    // Get premiums for this country
    const countryPremiums = cpiSettings.regionExclusionPremiums?.[countryCode] || {};

    // Generate HTML for each region
    let html = '';
    countryData.regions.forEach(region => {
        const premium = countryPremiums[region.id] || 0;
        html += `
            <div class="p-3 bg-white rounded-lg border">
                <div class="flex items-center justify-between mb-2">
                    <label class="flex items-center gap-2">
                        <i class="fas ${region.icon} text-orange-500"></i>
                        <span class="font-semibold text-sm">${region.name}</span>
                    </label>
                </div>
                <input type="number"
                       id="cpi-region-${region.id}-premium"
                       data-country="${countryCode}"
                       data-region="${region.id}"
                       class="w-full px-3 py-2 border rounded-lg text-sm cpi-region-input"
                       placeholder="e.g., 1.00"
                       min="0"
                       step="0.01"
                       value="${premium || ''}"
                       oninput="calculateCpiPreview()">
            </div>
        `;
    });

    container.innerHTML = html;
    console.log(`Rendered ${countryData.regions.length} regions for ${countryCode}`);
}

// Handle country selector change
function onCpiCountryChange() {
    const selector = document.getElementById('cpi-region-country-selector');
    if (!selector) return;

    // Save current country's premiums before switching
    saveCurrentCountryPremiums();

    // Switch to new country
    currentSelectedCountry = selector.value;
    console.log('Switched to country:', currentSelectedCountry);

    // Render new country's regions
    renderRegionsForCountry(currentSelectedCountry);
}

// Handle location type change (Global/National/Regional)
function onCpiLocationTypeChange() {
    const selector = document.getElementById('cpi-location-type');
    if (!selector) return;

    const locationType = selector.value;
    console.log('Location type changed to:', locationType);

    // Get section elements
    const globalInfo = document.getElementById('cpi-global-info');
    const nationalSection = document.getElementById('cpi-national-section');
    const regionalSection = document.getElementById('cpi-regional-section');

    // Hide all sections first
    if (globalInfo) globalInfo.classList.add('hidden');
    if (nationalSection) nationalSection.classList.add('hidden');
    if (regionalSection) regionalSection.classList.add('hidden');

    // Show appropriate section based on selection
    if (locationType === 'global') {
        if (globalInfo) globalInfo.classList.remove('hidden');
    } else if (locationType === 'national') {
        if (nationalSection) nationalSection.classList.remove('hidden');
    } else if (locationType === 'regional') {
        if (regionalSection) regionalSection.classList.remove('hidden');
        // Render regions for the current country when regional is selected
        renderRegionsForCountry(currentSelectedCountry);
    }

    // Recalculate CPI preview
    calculateCpiPreview();
}

// Save current country's region premiums to cpiSettings
function saveCurrentCountryPremiums() {
    const inputs = document.querySelectorAll('.cpi-region-input');
    if (!inputs.length) return;

    inputs.forEach(input => {
        const countryCode = input.dataset.country;
        const regionId = input.dataset.region;
        const value = parseFloat(input.value) || 0;

        if (!cpiSettings.regionExclusionPremiums[countryCode]) {
            cpiSettings.regionExclusionPremiums[countryCode] = {};
        }
        cpiSettings.regionExclusionPremiums[countryCode][regionId] = value;
    });
}

// Calculate CPI Preview based on selected scenario
function calculateCpiPreview() {
    // Get values from form
    // Base rate applies to "All" audience and "International" location (no targeting)
    const baseRate = parseFloat(document.getElementById('cpi-base-rate')?.value) || 0;
    const tutorPremium = parseFloat(document.getElementById('cpi-tutor-premium')?.value) || 0;
    const studentPremium = parseFloat(document.getElementById('cpi-student-premium')?.value) || 0;
    const parentPremium = parseFloat(document.getElementById('cpi-parent-premium')?.value) || 0;
    const advertiserPremium = parseFloat(document.getElementById('cpi-advertiser-premium')?.value) || 0;
    const userPremium = parseFloat(document.getElementById('cpi-user-premium')?.value) || 0;
    const nationalPremium = parseFloat(document.getElementById('cpi-national-premium')?.value) || 0;
    const placeholderPremium = parseFloat(document.getElementById('cpi-placeholder-premium')?.value) || 0;
    const widgetPremium = parseFloat(document.getElementById('cpi-widget-premium')?.value) || 0;
    const popupPremium = parseFloat(document.getElementById('cpi-popup-premium')?.value) || 0;
    const insessionPremium = parseFloat(document.getElementById('cpi-insession-premium')?.value) || 0;

    // Get selected scenario
    const selectedAudience = document.getElementById('cpi-preview-audience')?.value || 'none';
    const selectedLocation = document.getElementById('cpi-preview-location')?.value || 'none';
    const selectedPlacement = document.getElementById('cpi-preview-placement')?.value || 'none';

    // Calculate audience exclusion premium (excluding audiences = more specific = higher cost)
    let audiencePremium = 0;
    let audienceLabel = '';
    if (selectedAudience === 'tutor') {
        audiencePremium = tutorPremium;
        audienceLabel = 'Exclude Tutor';
    } else if (selectedAudience === 'student') {
        audiencePremium = studentPremium;
        audienceLabel = 'Exclude Student';
    } else if (selectedAudience === 'parent') {
        audiencePremium = parentPremium;
        audienceLabel = 'Exclude Parent';
    } else if (selectedAudience === 'advertiser') {
        audiencePremium = advertiserPremium;
        audienceLabel = 'Exclude Advertiser';
    } else if (selectedAudience === 'user') {
        audiencePremium = userPremium;
        audienceLabel = 'Exclude User';
    }

    // Calculate location premium
    // - Global/none: No premium (base rate only)
    // - National: Add national premium
    // - Regional: Add national premium + region exclusion premiums
    let locationPremium = 0;
    let locationLabel = '';
    let regionExclusionPremium = 0;
    let regionLabel = '';

    if (selectedLocation === 'national') {
        locationPremium = nationalPremium;
        locationLabel = 'National Premium';
    } else if (selectedLocation === 'regional') {
        // Regional = National Premium + Region Exclusion Premiums
        locationPremium = nationalPremium;
        locationLabel = 'National Premium (included in Regional)';

        // Calculate sample region exclusion (use first region from current country as sample)
        const countryPremiums = cpiSettings.regionExclusionPremiums?.[currentSelectedCountry] || {};
        const regionValues = Object.values(countryPremiums);
        if (regionValues.length > 0) {
            // Use the first non-zero region premium as a sample
            regionExclusionPremium = regionValues.find(v => v > 0) || regionValues[0] || 0;
            regionLabel = `Sample Region Exclusion (${currentSelectedCountry})`;
        }
    }

    // Calculate placement exclusion premium (excluding placements = more specific = higher cost)
    let placementPremium = 0;
    let placementLabel = '';
    if (selectedPlacement === 'placeholder') {
        placementPremium = placeholderPremium;
        placementLabel = 'Exclude Placeholder';
    } else if (selectedPlacement === 'widget') {
        placementPremium = widgetPremium;
        placementLabel = 'Exclude Widget';
    } else if (selectedPlacement === 'popup') {
        placementPremium = popupPremium;
        placementLabel = 'Exclude WB Pop-up';
    } else if (selectedPlacement === 'insession') {
        placementPremium = insessionPremium;
        placementLabel = 'Exclude WB In-Session';
    }

    // Calculate total CPI
    // Formula for Regional: Base + National + Region Exclusion
    const totalCpi = baseRate + audiencePremium + locationPremium + regionExclusionPremium + placementPremium;

    // Update preview display
    const formatPrice = (price) => price.toFixed(3);

    // Base rate
    const baseEl = document.getElementById('cpi-preview-base');
    if (baseEl) baseEl.textContent = `${formatPrice(baseRate)} ${cpiDetectedCurrency}`;

    // Audience row
    const audienceRow = document.getElementById('cpi-preview-audience-row');
    const audienceLabelEl = document.getElementById('cpi-preview-audience-label');
    const audienceValueEl = document.getElementById('cpi-preview-audience-value');
    if (audienceRow) {
        if (selectedAudience !== 'none' && audiencePremium > 0) {
            audienceRow.classList.remove('hidden');
            if (audienceLabelEl) audienceLabelEl.textContent = audienceLabel;
            if (audienceValueEl) audienceValueEl.textContent = `+${formatPrice(audiencePremium)} ${cpiDetectedCurrency}`;
        } else {
            audienceRow.classList.add('hidden');
        }
    }

    // Location row (shows National premium - also included in Regional)
    const locationRow = document.getElementById('cpi-preview-location-row');
    const locationLabelEl = document.getElementById('cpi-preview-location-label');
    const locationValueEl = document.getElementById('cpi-preview-location-value');
    if (locationRow) {
        if ((selectedLocation === 'national' || selectedLocation === 'regional') && locationPremium > 0) {
            locationRow.classList.remove('hidden');
            if (locationLabelEl) locationLabelEl.textContent = locationLabel;
            if (locationValueEl) locationValueEl.textContent = `+${formatPrice(locationPremium)} ${cpiDetectedCurrency}`;
        } else {
            locationRow.classList.add('hidden');
        }
    }

    // Region Exclusion row (only shows for regional targeting)
    const regionRow = document.getElementById('cpi-preview-region-row');
    const regionLabelEl = document.getElementById('cpi-preview-region-label');
    const regionValueEl = document.getElementById('cpi-preview-region-value');
    if (regionRow) {
        if (selectedLocation === 'regional' && regionExclusionPremium > 0) {
            regionRow.classList.remove('hidden');
            if (regionLabelEl) regionLabelEl.textContent = regionLabel;
            if (regionValueEl) regionValueEl.textContent = `+${formatPrice(regionExclusionPremium)} ${cpiDetectedCurrency}`;
        } else {
            regionRow.classList.add('hidden');
        }
    }

    // Placement row
    const placementRow = document.getElementById('cpi-preview-placement-row');
    const placementLabelEl = document.getElementById('cpi-preview-placement-label');
    const placementValueEl = document.getElementById('cpi-preview-placement-value');
    if (placementRow) {
        if (selectedPlacement !== 'none' && placementPremium > 0) {
            placementRow.classList.remove('hidden');
            if (placementLabelEl) placementLabelEl.textContent = placementLabel;
            if (placementValueEl) placementValueEl.textContent = `+${formatPrice(placementPremium)} ${cpiDetectedCurrency}`;
        } else {
            placementRow.classList.add('hidden');
        }
    }

    // Total CPI
    const totalEl = document.getElementById('cpi-preview-total');
    if (totalEl) totalEl.textContent = `${formatPrice(totalCpi)} ${cpiDetectedCurrency}`;

    // Example calculations
    const example1k = document.getElementById('cpi-example-1k');
    const example10k = document.getElementById('cpi-example-10k');
    const example100k = document.getElementById('cpi-example-100k');
    if (example1k) example1k.textContent = `${(totalCpi * 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${cpiDetectedCurrency}`;
    if (example10k) example10k.textContent = `${(totalCpi * 10000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${cpiDetectedCurrency}`;
    if (example100k) example100k.textContent = `${(totalCpi * 100000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${cpiDetectedCurrency}`;

    return { baseRate, audiencePremium, locationPremium, regionExclusionPremium, totalCpi };
}

// Save CPI Settings
async function saveCpiSettings(event) {
    event.preventDefault();

    // Get values from form
    // Base rate covers "All" audience and "International" location (no targeting)
    const baseRate = parseFloat(document.getElementById('cpi-base-rate')?.value) || 0;
    const country = document.getElementById('cpi-country')?.value || 'all';
    const tutorPremium = parseFloat(document.getElementById('cpi-tutor-premium')?.value) || 0;
    const studentPremium = parseFloat(document.getElementById('cpi-student-premium')?.value) || 0;
    const parentPremium = parseFloat(document.getElementById('cpi-parent-premium')?.value) || 0;
    const advertiserPremium = parseFloat(document.getElementById('cpi-advertiser-premium')?.value) || 0;
    const userPremium = parseFloat(document.getElementById('cpi-user-premium')?.value) || 0;
    const nationalPremium = parseFloat(document.getElementById('cpi-national-premium')?.value) || 0;

    // Save current country's region premiums before collecting all
    saveCurrentCountryPremiums();

    const placeholderPremium = parseFloat(document.getElementById('cpi-placeholder-premium')?.value) || 0;
    const widgetPremium = parseFloat(document.getElementById('cpi-widget-premium')?.value) || 0;
    const popupPremium = parseFloat(document.getElementById('cpi-popup-premium')?.value) || 0;
    const insessionPremium = parseFloat(document.getElementById('cpi-insession-premium')?.value) || 0;

    if (baseRate <= 0) {
        alert('Please enter a valid base CPI rate');
        return;
    }

    // Update local settings object with JSONB region premiums format
    cpiSettings = {
        baseRate,
        country,
        currency: cpiDetectedCurrency,  // Auto-detected currency based on GPS location
        audiencePremiums: {
            tutor: tutorPremium,
            student: studentPremium,
            parent: parentPremium,
            advertiser: advertiserPremium,
            user: userPremium
        },
        locationPremiums: {
            national: nationalPremium
        },
        regionExclusionPremiums: cpiSettings.regionExclusionPremiums || {},  // Keep JSONB format
        placementPremiums: {
            placeholder: placeholderPremium,
            widget: widgetPremium,
            popup: popupPremium,
            insession: insessionPremium
        }
    };

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/cpi-settings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cpiSettings)
        });

        if (!response.ok) {
            throw new Error('Failed to save CPI settings');
        }

        const result = await response.json();
        console.log('CPI settings saved:', result);

        // Update the grid display
        renderCpiRatesGrid();

        // Close modal
        closeCpiSettingsModal();

        alert('CPI settings saved successfully!');

    } catch (error) {
        console.error('Error saving CPI settings:', error);
        // Still update local display even if API fails
        renderCpiRatesGrid();
        closeCpiSettingsModal();
        alert('CPI settings saved locally. (API save may have failed)');
    }
}

// Render CPI Rates Grid
function renderCpiRatesGrid() {
    const grid = document.getElementById('cpi-rates-grid');
    if (!grid) return;

    const currency = cpiSettings.currency || 'ETB';  // Read currency from settings
    const formatPrice = (price) => price.toFixed(3);

    grid.innerHTML = `
        <!-- Base CPI Card -->
        <div class="border-2 border-orange-300 rounded-lg p-4 bg-white hover:shadow-lg transition-all">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-coins text-orange-600"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Base CPI</h4>
                    <p class="text-xs text-gray-500">All + International</p>
                </div>
            </div>
            <div class="text-2xl font-bold text-orange-600 mb-2">
                ${formatPrice(cpiSettings.baseRate || 0)} <span class="text-sm font-normal text-gray-500">${currency}</span>
            </div>
            <p class="text-xs text-gray-500">Per impression (no targeting)</p>
        </div>

        <!-- Audience Exclusion Card -->
        <div class="border-2 border-blue-300 rounded-lg p-4 bg-white hover:shadow-lg transition-all">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-users text-blue-600"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Audience Exclusion</h4>
                    <p class="text-xs text-gray-500">Added when excluded</p>
                </div>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-chalkboard-teacher text-blue-500"></i> Tutor
                    </span>
                    <span class="font-semibold text-blue-600">+${formatPrice(cpiSettings.audiencePremiums?.tutor || 0)} ${currency}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-user-graduate text-green-500"></i> Student
                    </span>
                    <span class="font-semibold text-green-600">+${formatPrice(cpiSettings.audiencePremiums?.student || 0)} ${currency}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-user-friends text-yellow-500"></i> Parent
                    </span>
                    <span class="font-semibold text-yellow-600">+${formatPrice(cpiSettings.audiencePremiums?.parent || 0)} ${currency}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-bullhorn text-purple-500"></i> Advertiser
                    </span>
                    <span class="font-semibold text-purple-600">+${formatPrice(cpiSettings.audiencePremiums?.advertiser || 0)} ${currency}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-user text-gray-500"></i> User
                    </span>
                    <span class="font-semibold text-gray-600">+${formatPrice(cpiSettings.audiencePremiums?.user || 0)} ${currency}</span>
                </div>
            </div>
        </div>

        <!-- Location Targeting Card -->
        <div class="border-2 border-green-300 rounded-lg p-4 bg-white hover:shadow-lg transition-all">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-map-marker-alt text-green-600"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Location Premium</h4>
                    <p class="text-xs text-gray-500">Added to base CPI</p>
                </div>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-flag text-blue-500"></i> National
                    </span>
                    <span class="font-semibold text-blue-600">+${formatPrice(cpiSettings.locationPremiums?.national || 0)} ${currency}</span>
                </div>
            </div>
        </div>

        <!-- Region Exclusion Premiums Card (Dynamic) -->
        <div class="border-2 border-orange-300 rounded-lg p-4 bg-white hover:shadow-lg transition-all">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-map-marked-alt text-orange-600"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Region Exclusion</h4>
                    <p class="text-xs text-gray-500">${Object.keys(cpiSettings.regionExclusionPremiums || {}).length} countries configured</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-1 text-xs">
                ${renderRegionPremiumsPreview()}
            </div>
        </div>

        <!-- Placement Exclusion Premiums Card -->
        <div class="border-2 border-purple-300 rounded-lg p-4 bg-white hover:shadow-lg transition-all">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-ad text-purple-600"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Placement Exclusion</h4>
                    <p class="text-xs text-gray-500">Charged when unchecked</p>
                </div>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-minus-circle text-gray-400 text-xs"></i> Placeholder
                    </span>
                    <span class="font-semibold text-gray-600">+${formatPrice(cpiSettings.placementPremiums?.placeholder || 0)} ${currency}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-minus-circle text-blue-400 text-xs"></i> Widget
                    </span>
                    <span class="font-semibold text-blue-600">+${formatPrice(cpiSettings.placementPremiums?.widget || 0)} ${currency}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-minus-circle text-orange-400 text-xs"></i> WB Pop-up
                    </span>
                    <span class="font-semibold text-orange-600">+${formatPrice(cpiSettings.placementPremiums?.popup || 0)} ${currency}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1">
                        <i class="fas fa-minus-circle text-red-400 text-xs"></i> WB In-Session
                    </span>
                    <span class="font-semibold text-red-600">+${formatPrice(cpiSettings.placementPremiums?.insession || 0)} ${currency}</span>
                </div>
            </div>
        </div>
    `;
}

// Helper function to render region premiums preview in the grid
function renderRegionPremiumsPreview() {
    const formatPrice = (price) => price.toFixed(2);
    const regionPremiums = cpiSettings.regionExclusionPremiums || {};
    let html = '';
    let count = 0;
    const maxDisplay = 6; // Show first 6 regions across all countries

    // Iterate through countries
    for (const [countryCode, regions] of Object.entries(regionPremiums)) {
        const countryData = countryRegions[countryCode];
        if (!countryData) continue;

        // Get region names from countryRegions config
        for (const [regionId, premium] of Object.entries(regions)) {
            if (count >= maxDisplay) break;

            const regionInfo = countryData.regions?.find(r => r.id === regionId);
            const regionName = regionInfo?.name || regionId;
            const shortName = regionName.length > 10 ? regionName.substring(0, 8) + '...' : regionName;

            html += `
                <div class="flex justify-between items-center">
                    <span title="${regionName} (${countryCode})">${shortName}</span>
                    <span class="font-semibold text-orange-600">+${formatPrice(premium || 0)}</span>
                </div>
            `;
            count++;
        }
        if (count >= maxDisplay) break;
    }

    // If no regions configured yet
    if (count === 0) {
        html = `
            <div class="col-span-2 text-center text-gray-400">
                <i class="fas fa-info-circle mr-1"></i>
                No regions configured
            </div>
        `;
    }

    return html;
}

// ============================================
// LEGACY BRAND PACKAGE MANAGEMENT (DEPRECATED)
// Kept for backward compatibility
// ============================================

// Global array to track brand packages
let brandPackages = [];
let packageCounter = 0;

// Store the base package info for discount calculations
let brandBasePackage = null;

// Period definitions for pricing calculations
const PRICING_PERIODS = {
    daily: { days: 1, label: 'Daily' },
    monthly: { days: 30, label: 'Monthly' },
    quarterly: { days: 90, label: '3 Months' },
    biannual: { days: 180, label: '6 Months' },
    yearly: { days: 365, label: 'Yearly' }
};

// Find the base package from loaded packages
function findBrandBasePackage() {
    // Look for package marked as base, or the first package (usually Monthly)
    const basePackage = brandPackages.find(p => p.isBase === true);
    if (basePackage) {
        return basePackage;
    }
    // Fallback: find package with "monthly" in name (case-insensitive)
    const monthlyPackage = brandPackages.find(p =>
        p.name && p.name.toLowerCase().includes('monthly')
    );
    if (monthlyPackage) {
        return monthlyPackage;
    }
    // Last fallback: return first package if any
    return brandPackages.length > 0 ? brandPackages[0] : null;
}

// Toggle base package checkbox handler
function toggleBrandBasePackage() {
    const isBase = document.getElementById('campaign-is-base-package')?.checked || false;
    const discountSection = document.getElementById('brand-discount-preview-section');
    const baseNotice = document.getElementById('brand-is-base-notice');

    if (isBase) {
        // This is the base package - hide discount calculator, show base notice
        if (discountSection) discountSection.classList.add('hidden');
        if (baseNotice) baseNotice.classList.remove('hidden');
    } else {
        // Not base package - show discount calculator, hide base notice
        if (discountSection) discountSection.classList.remove('hidden');
        if (baseNotice) baseNotice.classList.add('hidden');
    }

    // Recalculate preview
    calculateBrandPackagePreview();
}

// Calculate Brand Package Preview with cross-package discount
function calculateBrandPackagePreview() {
    const dailyPrice = parseFloat(document.getElementById('campaign-package-daily-price')?.value) || 0;
    const isBase = document.getElementById('campaign-is-base-package')?.checked || false;

    // Calculate monthly total
    const monthlyTotal = dailyPrice * 30;

    // Update preview elements
    const formatPrice = (price) => dailyPrice > 0 ? `${Math.round(price).toLocaleString()} ETB` : '-- ETB';

    // Daily price display
    const dailyPriceEl = document.getElementById('brand-preview-daily-price');
    if (dailyPriceEl) dailyPriceEl.textContent = formatPrice(dailyPrice);

    // Monthly total display
    const monthlyPriceEl = document.getElementById('brand-preview-monthly-price');
    if (monthlyPriceEl) monthlyPriceEl.textContent = formatPrice(monthlyTotal);

    // Update this package rate display
    const thisRateEl = document.getElementById('brand-this-rate-display');
    if (thisRateEl) thisRateEl.textContent = dailyPrice > 0 ? `${dailyPrice.toLocaleString()} ETB/day` : '-- ETB/day';

    // Calculate discount compared to base package
    if (!isBase && brandBasePackage && brandBasePackage.dailyPrice > 0) {
        const baseRate = brandBasePackage.dailyPrice;
        const discount = ((baseRate - dailyPrice) / baseRate) * 100;

        // Update base rate display
        const baseRateEl = document.getElementById('brand-base-rate-display');
        if (baseRateEl) baseRateEl.textContent = `${baseRate.toLocaleString()} ETB/day`;

        // Update calculated discount
        const discountEl = document.getElementById('brand-calculated-discount');
        if (discountEl) {
            if (dailyPrice > 0 && discount >= 0) {
                discountEl.textContent = `${discount.toFixed(1)}%`;
                discountEl.className = 'text-2xl font-bold ' + (discount > 0 ? 'text-green-600' : 'text-gray-500');
            } else if (discount < 0) {
                // This package is MORE expensive than base
                discountEl.textContent = `+${Math.abs(discount).toFixed(1)}%`;
                discountEl.className = 'text-2xl font-bold text-red-600';
            } else {
                discountEl.textContent = '--%';
                discountEl.className = 'text-2xl font-bold text-gray-400';
            }
        }
    } else if (isBase) {
        // This is the base package
        const baseRateEl = document.getElementById('brand-base-rate-display');
        if (baseRateEl) baseRateEl.textContent = dailyPrice > 0 ? `${dailyPrice.toLocaleString()} ETB/day` : '-- ETB/day';

        const discountEl = document.getElementById('brand-calculated-discount');
        if (discountEl) {
            discountEl.textContent = '0%';
            discountEl.className = 'text-2xl font-bold text-gray-500';
        }
    } else {
        // No base package set
        const baseRateEl = document.getElementById('brand-base-rate-display');
        if (baseRateEl) baseRateEl.textContent = 'No base set';

        const discountEl = document.getElementById('brand-calculated-discount');
        if (discountEl) {
            discountEl.textContent = '--%';
            discountEl.className = 'text-2xl font-bold text-gray-400';
        }
    }

    return {
        dailyPrice,
        monthlyTotal,
        isBase,
        calculatedDiscount: !isBase && brandBasePackage ?
            ((brandBasePackage.dailyPrice - dailyPrice) / brandBasePackage.dailyPrice) * 100 : 0
    };
}

// Backward compatibility - keep old function name
function calculatePeriodPrices() {
    return calculateBrandPackagePreview();
}

// Load Brand Packages from Database
async function loadBrandPackages() {
    console.log('📦 Loading brand packages from database...');

    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('⚠ No auth token found');
            return;
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/brand-packages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.packages && Array.isArray(data.packages)) {
            // Map database format to UI format
            // Note: API returns single 'discount' field (not discount_3_months, discount_6_months, discount_yearly)
            brandPackages = data.packages.map(pkg => ({
                id: pkg.id || pkg.package_id,
                name: pkg.name || pkg.package_name || pkg.package_title,
                dailyPrice: pkg.daily_price || pkg.price_per_day || pkg.package_price || 0,
                durationDays: pkg.duration_days || 30,
                isBase: pkg.is_base_package || pkg.is_base || pkg.isBase || false,
                calculatedDiscount: pkg.discount || pkg.calculated_discount || pkg.calculatedDiscount || 0,
                label: pkg.label || 'none',
                currency: pkg.currency || 'ETB',
                includes: Array.isArray(pkg.features) ? pkg.features : (pkg.includes || [])
            }));

            // Find and store the base package
            brandBasePackage = findBrandBasePackage();
            console.log(`✅ Loaded ${brandPackages.length} packages from database`);
            console.log(`📍 Base package: ${brandBasePackage ? brandBasePackage.name : 'None'}`);
            renderBrandPackages();
        } else {
            console.warn('⚠ No packages found or invalid response format');
            brandPackages = [];
            renderBrandPackages();
        }
    } catch (error) {
        console.error('❌ Error loading brand packages from database:', error);
        brandPackages = [];
        renderBrandPackages();
    }
}

// Open Add Brand Package Modal
function openAddBrandPackageModal() {
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        // Reset form
        document.getElementById('campaign-package-form').reset();
        document.getElementById('campaign-package-id').value = '';
        document.getElementById('campaign-modal-title').innerHTML = '<i class="fas fa-bullhorn mr-2"></i>Add Brand Package';

        // Reset daily price
        const dailyPriceEl = document.getElementById('campaign-package-daily-price');
        if (dailyPriceEl) dailyPriceEl.value = '';

        // Reset duration days to default 30
        const durationDaysEl = document.getElementById('campaign-package-duration-days');
        if (durationDaysEl) durationDaysEl.value = '30';

        // Reset base package checkbox
        const isBaseCheckbox = document.getElementById('campaign-is-base-package');
        if (isBaseCheckbox) isBaseCheckbox.checked = false;

        // Show/hide discount section based on whether there's a base package
        const discountSection = document.getElementById('brand-discount-preview-section');
        const baseNotice = document.getElementById('brand-is-base-notice');
        const currentBaseInfo = document.getElementById('brand-current-base-info');

        if (discountSection) discountSection.classList.remove('hidden');
        if (baseNotice) baseNotice.classList.add('hidden');

        // Show current base package info if one exists
        if (brandBasePackage && currentBaseInfo) {
            currentBaseInfo.classList.remove('hidden');
            const baseNameEl = document.getElementById('brand-current-base-name');
            const basePriceEl = document.getElementById('brand-current-base-price');
            if (baseNameEl) baseNameEl.textContent = brandBasePackage.name;
            if (basePriceEl) basePriceEl.textContent = brandBasePackage.dailyPrice.toLocaleString();
        } else if (currentBaseInfo) {
            currentBaseInfo.classList.add('hidden');
        }

        // Reset calculated prices display (preview panel)
        calculateBrandPackagePreview();

        // Clear package includes
        document.getElementById('package-includes-container').innerHTML = '';
        document.getElementById('includes-empty-state').style.display = 'block';

        modal.classList.remove('hidden');
    }
}

// Close Brand Package Modal
function closeBrandPackageModal() {
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Add Package Include Feature
function addPackageInclude() {
    const container = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');

    if (!container) return;

    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Create unique ID for this feature
    const featureId = 'feature-' + Date.now();

    // Create feature input row
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex items-center gap-2';
    featureDiv.id = featureId;
    featureDiv.innerHTML = `
        <input type="text"
            class="flex-1 px-3 py-2 border rounded-lg text-sm"
            placeholder="e.g., Unlimited Impressions, Priority Placement"
            data-feature-input>
        <button type="button"
            onclick="removePackageInclude('${featureId}')"
            class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-1 text-sm">
            <i class="fas fa-trash"></i>
            Remove
        </button>
    `;

    container.appendChild(featureDiv);

    // Focus the new input
    const input = featureDiv.querySelector('input');
    if (input) input.focus();
}

// Remove Package Include Feature
function removePackageInclude(featureId) {
    const feature = document.getElementById(featureId);
    if (feature) {
        feature.remove();

        // Show empty state if no features left
        const container = document.getElementById('package-includes-container');
        const emptyState = document.getElementById('includes-empty-state');
        if (container && container.children.length === 0 && emptyState) {
            emptyState.style.display = 'block';
        }
    }
}

// Save Brand Package
async function saveBrandPackage(event) {
    event.preventDefault();

    // Get form values
    const packageId = document.getElementById('campaign-package-id').value;
    const name = document.getElementById('campaign-package-name').value.trim();
    const dailyPrice = parseFloat(document.getElementById('campaign-package-daily-price').value);
    const durationDays = parseInt(document.getElementById('campaign-package-duration-days')?.value) || 30;

    // Get base package flag
    const isBase = document.getElementById('campaign-is-base-package')?.checked || false;

    // Calculate discount based on base package (if not base)
    let calculatedDiscount = 0;
    if (!isBase && brandBasePackage && brandBasePackage.dailyPrice > 0) {
        calculatedDiscount = ((brandBasePackage.dailyPrice - dailyPrice) / brandBasePackage.dailyPrice) * 100;
        calculatedDiscount = Math.max(0, calculatedDiscount); // Don't allow negative discounts
    }

    // Get selected label
    const selectedLabel = document.querySelector('input[name="campaign-package-label"]:checked');
    const label = selectedLabel ? selectedLabel.value : 'none';

    // Get package includes
    const includeInputs = document.querySelectorAll('#package-includes-container [data-feature-input]');
    const includes = Array.from(includeInputs)
        .map(input => input.value.trim())
        .filter(val => val.length > 0);

    // Validate
    if (!name || dailyPrice === null || isNaN(dailyPrice) || dailyPrice <= 0) {
        alert('Please fill in package name and daily price');
        return;
    }

    // Create package object for API with standardized schema
    // Uses single 'discount' field (discount_3_months, discount_6_months, discount_yearly were removed)
    const packageData = {
        package_title: name,
        package_price: dailyPrice,
        duration_days: durationDays,
        is_base_package: isBase,
        label,
        features: includes,
        // Single discount field - auto-calculated from base package
        discount: calculatedDiscount
    };

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        let response;
        if (packageId) {
            // Update existing package
            response = await fetch(`${apiUrl}/api/admin/brand-packages/${packageId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            });
        } else {
            // Create new package
            response = await fetch(`${apiUrl}/api/admin/brand-packages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            });
        }

        if (!response.ok) {
            throw new Error('Failed to save package');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save package');
        }

        console.log('✅ Brand package saved to database:', result);

        // Reload packages from database
        await loadBrandPackages();

        // Close modal
        closeBrandPackageModal();

        alert('Brand package saved successfully!');

    } catch (error) {
        console.error('❌ Error saving brand package:', error);
        alert('Failed to save brand package. Please try again.');
    }
}

// Render Brand Packages
function renderBrandPackages() {
    const grid = document.getElementById('brand-packages-grid');
    if (!grid) return;

    if (brandPackages.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <i class="fas fa-box-open text-5xl mb-4"></i>
                <p class="text-lg">No brand packages yet</p>
                <p class="text-sm">Click "Add Package" to create your first package</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = brandPackages.map(pkg => {
        const dailyPrice = pkg.dailyPrice || 0;
        const monthlyTotal = dailyPrice * 30;

        // Calculate discount vs base package
        let discountBadge = '';
        if (pkg.isBase) {
            discountBadge = '<span class="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">BASE</span>';
        } else if (brandBasePackage && brandBasePackage.dailyPrice > 0) {
            const discount = ((brandBasePackage.dailyPrice - dailyPrice) / brandBasePackage.dailyPrice) * 100;
            if (discount > 0) {
                discountBadge = `<span class="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">${discount.toFixed(0)}% OFF</span>`;
            } else if (discount < 0) {
                discountBadge = `<span class="px-2 py-0.5 bg-red-400 text-white text-xs font-bold rounded">+${Math.abs(discount).toFixed(0)}%</span>`;
            }
        }

        // Popular label badge
        let popularBadge = '';
        if (pkg.label === 'popular') {
            popularBadge = '<span class="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">POPULAR</span>';
        } else if (pkg.label === 'most-popular') {
            popularBadge = '<span class="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded">MOST POPULAR</span>';
        }

        // Includes list
        const includesList = pkg.includes && pkg.includes.length > 0
            ? pkg.includes.map(inc => `
                <div class="flex items-start gap-2 text-xs">
                    <i class="fas fa-check text-green-500 mt-0.5"></i>
                    <span>${inc}</span>
                </div>
            `).join('')
            : '<p class="text-xs text-gray-400 italic">No features listed</p>';

        // Format price with commas
        const formatPrice = (price) => price.toLocaleString();

        return `
            <div class="brand-package-card border-2 rounded-lg p-4 hover:shadow-lg transition-all cursor-move relative ${pkg.isBase ? 'border-orange-400 bg-orange-50/30' : ''}"
                draggable="true"
                data-package-id="${pkg.id}"
                ondragstart="window.handleDragStart(event)"
                ondragend="window.handleDragEnd(event)"
                ondragover="window.handleDragOver(event)"
                ondrop="window.handleDrop(event)">

                <!-- Badges (Top Right) -->
                <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    ${discountBadge}
                    ${popularBadge}
                </div>

                <div class="mb-3">
                    <h4 class="text-lg font-bold mb-1">${pkg.name}</h4>
                    ${pkg.description ? `<p class="text-xs text-gray-600">${pkg.description}</p>` : ''}
                </div>

                <!-- Daily Price (Main) -->
                <div class="mb-3 p-3 ${pkg.isBase ? 'bg-orange-100 border-orange-300' : 'bg-orange-50 border-orange-200'} rounded-lg border">
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-orange-600">${formatPrice(dailyPrice)}</span>
                        <span class="text-sm text-gray-600">ETB/day</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        Monthly: ${formatPrice(monthlyTotal)} ETB
                    </div>
                </div>

                <!-- Includes -->
                <div class="mb-4 pt-3 border-t">
                    <p class="text-xs font-semibold text-gray-700 mb-2">Package Includes:</p>
                    <div class="space-y-1">
                        ${includesList}
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); window.editBrandPackage(${pkg.id})"
                        class="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="event.stopPropagation(); window.deleteBrandPackage(${pkg.id})"
                        class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Edit Brand Package
function editBrandPackage(packageId) {
    // Convert to number for comparison (in case it comes as string from HTML)
    const pkgId = typeof packageId === 'string' ? parseInt(packageId) : packageId;
    const pkg = brandPackages.find(p => p.id == pkgId); // Use loose equality to handle type mismatches
    if (!pkg) {
        console.error('Package not found with ID:', packageId);
        return;
    }

    // Populate form
    document.getElementById('campaign-package-id').value = pkg.id;
    document.getElementById('campaign-package-name').value = pkg.name;

    // Set daily price
    const dailyPriceEl = document.getElementById('campaign-package-daily-price');
    if (dailyPriceEl) dailyPriceEl.value = pkg.dailyPrice || '';

    // Set duration days
    const durationDaysEl = document.getElementById('campaign-package-duration-days');
    if (durationDaysEl) durationDaysEl.value = pkg.durationDays || 30;

    // Set base package checkbox
    const isBaseCheckbox = document.getElementById('campaign-is-base-package');
    if (isBaseCheckbox) isBaseCheckbox.checked = pkg.isBase || false;

    // Show/hide discount section based on whether this is base package
    const discountSection = document.getElementById('brand-discount-preview-section');
    const baseNotice = document.getElementById('brand-is-base-notice');
    const currentBaseInfo = document.getElementById('brand-current-base-info');

    if (pkg.isBase) {
        if (discountSection) discountSection.classList.add('hidden');
        if (baseNotice) baseNotice.classList.remove('hidden');
        if (currentBaseInfo) currentBaseInfo.classList.add('hidden');
    } else {
        if (discountSection) discountSection.classList.remove('hidden');
        if (baseNotice) baseNotice.classList.add('hidden');

        // Show current base package info
        if (brandBasePackage && currentBaseInfo) {
            currentBaseInfo.classList.remove('hidden');
            const baseNameEl = document.getElementById('brand-current-base-name');
            const basePriceEl = document.getElementById('brand-current-base-price');
            if (baseNameEl) baseNameEl.textContent = brandBasePackage.name;
            if (basePriceEl) basePriceEl.textContent = brandBasePackage.dailyPrice.toLocaleString();
        } else if (currentBaseInfo) {
            currentBaseInfo.classList.add('hidden');
        }
    }

    // Update calculated prices display (preview panel)
    calculateBrandPackagePreview();

    // Set label radio button
    const labelValue = pkg.label || 'none';
    const labelRadio = document.querySelector(`input[name="campaign-package-label"][value="${labelValue}"]`);
    if (labelRadio) {
        labelRadio.checked = true;
    } else {
        // Fallback to 'none' if label value is invalid
        const noneRadio = document.querySelector(`input[name="campaign-package-label"][value="none"]`);
        if (noneRadio) noneRadio.checked = true;
    }

    // Populate includes
    const container = document.getElementById('package-includes-container');
    const emptyState = document.getElementById('includes-empty-state');
    container.innerHTML = '';

    if (pkg.includes && pkg.includes.length > 0) {
        emptyState.style.display = 'none';
        pkg.includes.forEach(feature => {
            const featureId = 'feature-' + Date.now() + Math.random();
            const featureDiv = document.createElement('div');
            featureDiv.className = 'flex items-center gap-2';
            featureDiv.id = featureId;
            featureDiv.innerHTML = `
                <input type="text"
                    class="flex-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g., Unlimited Impressions"
                    data-feature-input
                    value="${feature}">
                <button type="button"
                    onclick="removePackageInclude('${featureId}')"
                    class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-1 text-sm">
                    <i class="fas fa-trash"></i>
                    Remove
                </button>
            `;
            container.appendChild(featureDiv);
        });
    } else {
        emptyState.style.display = 'block';
    }

    // Update modal title
    document.getElementById('campaign-modal-title').innerHTML = '<i class="fas fa-bullhorn mr-2"></i>Edit Brand Package';

    // Open modal directly (don't call openAddBrandPackageModal as it resets the title)
    const modal = document.getElementById('campaign-package-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Delete Brand Package
async function deleteBrandPackage(packageId) {
    // Convert to number for comparison (in case it comes as string from HTML)
    const pkgId = typeof packageId === 'string' ? parseInt(packageId) : packageId;
    const pkg = brandPackages.find(p => p.id == pkgId); // Use loose equality to handle type mismatches
    if (!pkg) {
        console.error('Package not found with ID:', packageId);
        return;
    }

    if (!confirm(`Are you sure you want to delete "${pkg.name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/admin/brand-packages/${packageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete package');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to delete package');
        }

        console.log('✅ Brand package deleted from database');

        // Reload packages from database
        await loadBrandPackages();

        alert('Package deleted successfully!');

    } catch (error) {
        console.error('❌ Error deleting brand package:', error);
        alert('Failed to delete brand package. Please try again.');
    }
}

// ============================================
// DRAG AND DROP FOR BRAND PACKAGES
// ============================================

let draggedElement = null;

function handleDragStart(event) {
    draggedElement = event.currentTarget;
    event.currentTarget.style.opacity = '0.4';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.currentTarget.innerHTML);
}

function handleDragEnd(event) {
    event.currentTarget.style.opacity = '1';

    // Remove all drag over styles
    document.querySelectorAll('.brand-package-card').forEach(card => {
        card.classList.remove('border-blue-500', 'bg-blue-50');
    });
}

function handleDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }

    event.dataTransfer.dropEffect = 'move';

    // Add visual feedback
    const target = event.currentTarget;
    if (target !== draggedElement) {
        target.classList.add('border-blue-500', 'bg-blue-50');
    }

    return false;
}

function handleDrop(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }

    const dropTarget = event.currentTarget;

    if (draggedElement !== dropTarget) {
        // Get package IDs
        const draggedId = draggedElement.dataset.packageId;
        const targetId = dropTarget.dataset.packageId;

        // Find indices
        const draggedIndex = brandPackages.findIndex(p => p.id === draggedId);
        const targetIndex = brandPackages.findIndex(p => p.id === targetId);

        // Swap positions in array
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const temp = brandPackages[draggedIndex];
            brandPackages[draggedIndex] = brandPackages[targetIndex];
            brandPackages[targetIndex] = temp;

            // Re-render
            renderBrandPackages();
        }
    }

    return false;
}

// ============================================
// SUBSCRIPTION PRICING WITH LIVE CALCULATIONS
// ============================================

// Calculate Live Pricing for Subscriptions
function calculateLivePricing() {
    // Get base prices
    const basicBase = parseFloat(document.getElementById('basic-base-price')?.value) || 0;
    const premiumBase = parseFloat(document.getElementById('premium-base-price')?.value) || 0;

    // Define periods
    const periods = [
        { suffix: '1m', months: 1 },
        { suffix: '3m', months: 3 },
        { suffix: '6m', months: 6 },
        { suffix: '9m', months: 9 },
        { suffix: '12m', months: 12 }
    ];

    // Calculate for each period
    periods.forEach(period => {
        // Basic tier
        const basicDiscount = parseFloat(document.getElementById(`basic-discount-${period.suffix}`)?.value) || 0;
        const basicTotal = basicBase * period.months;
        const basicFinal = basicTotal * (1 - basicDiscount / 100);
        const basicPriceElement = document.getElementById(`basic-price-${period.suffix}`);
        if (basicPriceElement) {
            basicPriceElement.textContent = basicBase > 0
                ? `${basicFinal.toFixed(2)} ETB (${(basicFinal / period.months).toFixed(2)} ETB/month)`
                : '--';
        }

        // Premium tier
        const premiumDiscount = parseFloat(document.getElementById(`premium-discount-${period.suffix}`)?.value) || 0;
        const premiumTotal = premiumBase * period.months;
        const premiumFinal = premiumTotal * (1 - premiumDiscount / 100);
        const premiumPriceElement = document.getElementById(`premium-price-${period.suffix}`);
        if (premiumPriceElement) {
            premiumPriceElement.textContent = premiumBase > 0
                ? `${premiumFinal.toFixed(2)} ETB (${(premiumFinal / period.months).toFixed(2)} ETB/month)`
                : '--';
        }
    });
}

// Save Subscription Pricing
async function saveSubscriptionPricing() {
    const basicBase = parseFloat(document.getElementById('basic-base-price')?.value) || 0;
    const premiumBase = parseFloat(document.getElementById('premium-base-price')?.value) || 0;

    if (basicBase <= 0 || premiumBase <= 0) {
        alert('Please enter valid base prices for both tiers');
        return;
    }

    // Get all discount values
    const periods = ['1m', '3m', '6m', '9m', '12m'];
    const discounts = {
        basic: {},
        premium: {}
    };

    periods.forEach(period => {
        discounts.basic[period] = parseFloat(document.getElementById(`basic-discount-${period}`)?.value) || 0;
        discounts.premium[period] = parseFloat(document.getElementById(`premium-discount-${period}`)?.value) || 0;
    });

    // Get features
    const basicFeatures = getFeaturesList('basic-tier-features-container');
    const premiumFeatures = getFeaturesList('premium-tier-features-container');

    const pricingData = {
        basic: {
            basePrice: basicBase,
            discounts: discounts.basic,
            features: basicFeatures
        },
        premium: {
            basePrice: premiumBase,
            discounts: discounts.premium,
            features: premiumFeatures
        }
    };

    console.log('Subscription pricing to save:', pricingData);

    // Build detailed alert message
    let alertMessage = 'Subscription pricing saved!\n\n';
    alertMessage += `Basic Tier:\n`;
    alertMessage += `- Base Price: ${basicBase} ETB/month\n`;
    alertMessage += `- Features: ${basicFeatures.length > 0 ? basicFeatures.length + ' features added' : 'No features added'}\n\n`;
    alertMessage += `Premium Tier:\n`;
    alertMessage += `- Base Price: ${premiumBase} ETB/month\n`;
    alertMessage += `- Features: ${premiumFeatures.length > 0 ? premiumFeatures.length + ' features added' : 'No features added'}\n\n`;
    alertMessage += '(In production, this would save to database)';

    alert(alertMessage);

    // TODO: Send to backend
    // await fetch(`${window.API_BASE_URL}/api/admin/system/subscription-pricing`, {...})
}

// ============================================
// SUBSCRIPTION TIER FEATURES
// ============================================

// Add Basic Tier Feature
function addBasicTierFeature() {
    addTierFeature('basic-tier-features-container', 'basic-features-empty-state', 'bg-blue-500', 'bg-blue-600');
}

// Add Premium Tier Feature
function addPremiumTierFeature() {
    addTierFeature('premium-tier-features-container', 'premium-features-empty-state', 'bg-purple-500', 'bg-purple-600');
}

// Generic function to add tier feature
function addTierFeature(containerId, emptyStateId, btnColor, btnHoverColor) {
    const container = document.getElementById(containerId);
    const emptyState = document.getElementById(emptyStateId);

    if (!container) return;

    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Create unique ID
    const featureId = 'tier-feature-' + Date.now();

    // Create feature input
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex items-center gap-2';
    featureDiv.id = featureId;
    featureDiv.innerHTML = `
        <i class="fas fa-check-circle text-green-500"></i>
        <input type="text"
            class="flex-1 px-2 py-1.5 border rounded text-sm"
            placeholder="e.g., 100 GB Storage, Priority Support"
            data-tier-feature-input>
        <button type="button"
            onclick="removeTierFeature('${featureId}', '${emptyStateId}')"
            class="px-2 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(featureDiv);

    // Focus the new input
    const input = featureDiv.querySelector('input');
    if (input) input.focus();
}

// Remove Tier Feature
function removeTierFeature(featureId, emptyStateId) {
    const feature = document.getElementById(featureId);
    if (feature) {
        const container = feature.parentElement;
        feature.remove();

        // Show empty state if no features left
        const emptyState = document.getElementById(emptyStateId);
        if (container && container.children.length === 0 && emptyState) {
            emptyState.style.display = 'block';
        }
    }
}

// Get features list from container
function getFeaturesList(containerId) {
    const inputs = document.querySelectorAll(`#${containerId} [data-tier-feature-input]`);
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(val => val.length > 0);
}

// ============================================
// AFFILIATE MANAGEMENT WITH LIVE CALCULATIONS
// ============================================

// Calculate Affiliate Commission Examples
function calculateAffiliateExamples() {
    // Get base prices (from subscription section)
    const basicBase = parseFloat(document.getElementById('basic-base-price')?.value) || 0;
    const premiumBase = parseFloat(document.getElementById('premium-base-price')?.value) || 0;

    // Get selected period from dropdown
    const periodSelect = document.getElementById('affiliate-calc-period');
    const selectedPeriod = periodSelect ? periodSelect.value : '6m';

    // Get discount for selected period
    const basicDiscount = parseFloat(document.getElementById(`basic-discount-${selectedPeriod}`)?.value) || 0;
    const premiumDiscount = parseFloat(document.getElementById(`premium-discount-${selectedPeriod}`)?.value) || 0;

    // Get number of months for selected period
    const periodMonths = {
        '1m': 1,
        '3m': 3,
        '6m': 6,
        '9m': 9,
        '12m': 12
    };
    const months = periodMonths[selectedPeriod] || 6;

    // Calculate discounted final prices (what customer actually pays)
    const basicTotal = basicBase * months;
    const premiumTotal = premiumBase * months;
    const basicFinalPrice = basicTotal * (1 - basicDiscount / 100);
    const premiumFinalPrice = premiumTotal * (1 - premiumDiscount / 100);

    // Get affiliate commission rates
    const directBasic = parseFloat(document.getElementById('direct-basic-commission')?.value) || 0;
    const directPremium = parseFloat(document.getElementById('direct-premium-commission')?.value) || 0;
    const indirectBasic = parseFloat(document.getElementById('indirect-basic-commission')?.value) || 0;
    const indirectPremium = parseFloat(document.getElementById('indirect-premium-commission')?.value) || 0;

    // Calculate commissions based on FINAL DISCOUNTED PRICE
    const directBasicCommission = (basicFinalPrice * directBasic / 100).toFixed(2);
    const directPremiumCommission = (premiumFinalPrice * directPremium / 100).toFixed(2);
    const indirectBasicCommission = (basicFinalPrice * indirectBasic / 100).toFixed(2);
    const indirectPremiumCommission = (premiumFinalPrice * indirectPremium / 100).toFixed(2);

    // Period labels
    const periodLabels = {
        '1m': '1 Month',
        '3m': '3 Months',
        '6m': '6 Months',
        '9m': '9 Months',
        '12m': '1 Year'
    };
    const periodLabel = periodLabels[selectedPeriod];

    // Update live calculator display
    const directBasicCalc = document.getElementById('direct-basic-calc');
    const directPremiumCalc = document.getElementById('direct-premium-calc');
    const indirectBasicCalc = document.getElementById('indirect-basic-calc');
    const indirectPremiumCalc = document.getElementById('indirect-premium-calc');

    // Update detail displays
    const directBasicDetail = document.getElementById('direct-basic-calc-detail');
    const directPremiumDetail = document.getElementById('direct-premium-calc-detail');
    const indirectBasicDetail = document.getElementById('indirect-basic-calc-detail');
    const indirectPremiumDetail = document.getElementById('indirect-premium-calc-detail');

    if (directBasicCalc) {
        directBasicCalc.textContent = basicBase > 0 && directBasic > 0
            ? `${directBasicCommission} ETB`
            : '-- ETB';
    }
    if (directBasicDetail) {
        directBasicDetail.textContent = basicBase > 0 && directBasic > 0
            ? `${directBasic}% of ${basicFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    if (directPremiumCalc) {
        directPremiumCalc.textContent = premiumBase > 0 && directPremium > 0
            ? `${directPremiumCommission} ETB`
            : '-- ETB';
    }
    if (directPremiumDetail) {
        directPremiumDetail.textContent = premiumBase > 0 && directPremium > 0
            ? `${directPremium}% of ${premiumFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    if (indirectBasicCalc) {
        indirectBasicCalc.textContent = basicBase > 0 && indirectBasic > 0
            ? `${indirectBasicCommission} ETB`
            : '-- ETB';
    }
    if (indirectBasicDetail) {
        indirectBasicDetail.textContent = basicBase > 0 && indirectBasic > 0
            ? `${indirectBasic}% of ${basicFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    if (indirectPremiumCalc) {
        indirectPremiumCalc.textContent = premiumBase > 0 && indirectPremium > 0
            ? `${indirectPremiumCommission} ETB`
            : '-- ETB';
    }
    if (indirectPremiumDetail) {
        indirectPremiumDetail.textContent = premiumBase > 0 && indirectPremium > 0
            ? `${indirectPremium}% of ${premiumFinalPrice.toFixed(2)} ETB (${periodLabel})`
            : '--';
    }

    console.log('Affiliate Commission Examples (After Discount):');
    console.log(`Period: ${periodLabel}`);
    console.log(`Direct - Basic: ${directBasicCommission} ETB (${directBasic}% of ${basicFinalPrice.toFixed(2)} ETB after ${basicDiscount}% discount)`);
    console.log(`Direct - Premium: ${directPremiumCommission} ETB (${directPremium}% of ${premiumFinalPrice.toFixed(2)} ETB after ${premiumDiscount}% discount)`);
    console.log(`Indirect - Basic: ${indirectBasicCommission} ETB (${indirectBasic}% of ${basicFinalPrice.toFixed(2)} ETB after ${basicDiscount}% discount)`);
    console.log(`Indirect - Premium: ${indirectPremiumCommission} ETB (${indirectPremium}% of ${premiumFinalPrice.toFixed(2)} ETB after ${premiumDiscount}% discount)`);

    return {
        direct: { basic: directBasicCommission, premium: directPremiumCommission },
        indirect: { basic: indirectBasicCommission, premium: indirectPremiumCommission }
    };
}

// Save Affiliate Settings
async function saveAffiliateSettings() {
    const affiliateData = {
        direct: {
            basicCommission: parseFloat(document.getElementById('direct-basic-commission')?.value) || 0,
            premiumCommission: parseFloat(document.getElementById('direct-premium-commission')?.value) || 0,
            duration: parseInt(document.getElementById('direct-duration')?.value) || 12
        },
        indirect: {
            basicCommission: parseFloat(document.getElementById('indirect-basic-commission')?.value) || 0,
            premiumCommission: parseFloat(document.getElementById('indirect-premium-commission')?.value) || 0,
            duration: parseInt(document.getElementById('indirect-duration')?.value) || 6
        },
        settings: {
            minimumPayout: parseFloat(document.getElementById('minimum-payout')?.value) || 100,
            payoutSchedule: document.getElementById('payout-schedule')?.value || 'monthly',
            enableAffiliateProgram: document.getElementById('enable-affiliate-program')?.checked || false
        }
    };

    console.log('Affiliate settings to save:', affiliateData);

    // Calculate and show examples
    const examples = calculateAffiliateExamples();

    alert(`Affiliate settings saved!\n\nCommission Examples:\nDirect Basic: ${examples.direct.basic} ETB\nDirect Premium: ${examples.direct.premium} ETB\nIndirect Basic: ${examples.indirect.basic} ETB\nIndirect Premium: ${examples.indirect.premium} ETB\n\nMinimum Payout: ${affiliateData.settings.minimumPayout} ETB\nPayout Schedule: ${affiliateData.settings.payoutSchedule}`);

    // TODO: Send to backend
    // await fetch(`${window.API_BASE_URL}/api/admin/system/affiliate-settings`, {...})
}

// ============================================
// PAYMENT GATEWAY MANAGEMENT
// ============================================

// Array to store additional payment gateways
let additionalGateways = [];
let gatewayCounter = 0;

// Open Add Payment Gateway Modal
function openAddPaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        // Reset form
        document.getElementById('payment-gateway-form').reset();
        document.getElementById('gateway-enabled').checked = true;
        modal.classList.remove('hidden');
    }
}

// Close Payment Gateway Modal
function closePaymentGatewayModal() {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save Payment Gateway
function savePaymentGateway(event) {
    event.preventDefault();

    // Get form values
    const name = document.getElementById('gateway-name').value.trim();
    const merchantId = document.getElementById('gateway-merchant-id').value.trim();
    const apiKey = document.getElementById('gateway-api-key').value.trim();
    const additionalInfo = document.getElementById('gateway-additional-info').value.trim();
    const enabled = document.getElementById('gateway-enabled').checked;

    if (!name) {
        alert('Please enter a gateway name');
        return;
    }

    // Create gateway object
    const gateway = {
        id: ++gatewayCounter,
        name,
        merchantId,
        apiKey,
        additionalInfo,
        enabled
    };

    // Add to array
    additionalGateways.push(gateway);

    console.log('Payment gateway added:', gateway);

    // Render the gateway
    renderAdditionalGateways();

    // Close modal
    closePaymentGatewayModal();

    alert(`Payment gateway "${name}" added successfully!`);
}

// Render Additional Payment Gateways
function renderAdditionalGateways() {
    const container = document.getElementById('additional-gateways-container');
    if (!container) return;

    if (additionalGateways.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = additionalGateways.map(gateway => `
        <div class="border rounded-lg p-4" data-gateway-id="${gateway.id}">
            <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold">${gateway.name}</h4>
                <div class="flex items-center gap-3">
                    <label class="flex items-center gap-2">
                        <input type="checkbox"
                            ${gateway.enabled ? 'checked' : ''}
                            onchange="toggleGateway(${gateway.id})"
                            class="w-4 h-4">
                        <span class="text-sm">Enabled</span>
                    </label>
                    <button onclick="removeGateway(${gateway.id})"
                        class="text-red-500 hover:text-red-700 text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${gateway.merchantId ? `
                    <div>
                        <label class="block mb-1 text-xs text-gray-600">Merchant/Account ID</label>
                        <input type="text" value="${gateway.merchantId}"
                            onchange="updateGatewayField(${gateway.id}, 'merchantId', this.value)"
                            class="w-full p-2 border rounded-lg text-sm">
                    </div>
                ` : ''}
                ${gateway.apiKey ? `
                    <div>
                        <label class="block mb-1 text-xs text-gray-600">API Key</label>
                        <input type="password" value="${gateway.apiKey}"
                            onchange="updateGatewayField(${gateway.id}, 'apiKey', this.value)"
                            class="w-full p-2 border rounded-lg text-sm">
                    </div>
                ` : ''}
            </div>
            ${gateway.additionalInfo ? `
                <div class="mt-3">
                    <label class="block mb-1 text-xs text-gray-600">Additional Info</label>
                    <textarea
                        onchange="updateGatewayField(${gateway.id}, 'additionalInfo', this.value)"
                        class="w-full p-2 border rounded-lg text-sm" rows="2">${gateway.additionalInfo}</textarea>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Toggle Gateway Enabled/Disabled
function toggleGateway(gatewayId) {
    const gateway = additionalGateways.find(g => g.id === gatewayId);
    if (gateway) {
        gateway.enabled = !gateway.enabled;
        console.log(`Gateway "${gateway.name}" ${gateway.enabled ? 'enabled' : 'disabled'}`);
    }
}

// Update Gateway Field
function updateGatewayField(gatewayId, field, value) {
    const gateway = additionalGateways.find(g => g.id === gatewayId);
    if (gateway) {
        gateway[field] = value;
        console.log(`Gateway "${gateway.name}" ${field} updated:`, value);
    }
}

// Remove Gateway
function removeGateway(gatewayId) {
    const gateway = additionalGateways.find(g => g.id === gatewayId);
    if (!gateway) return;

    if (!confirm(`Remove payment gateway "${gateway.name}"?`)) {
        return;
    }

    additionalGateways = additionalGateways.filter(g => g.id !== gatewayId);
    renderAdditionalGateways();
    console.log(`Gateway "${gateway.name}" removed`);
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

// CPI Pricing Functions (NEW!)
window.openCpiSettingsModal = openCpiSettingsModal;
window.closeCpiSettingsModal = closeCpiSettingsModal;
window.loadCpiSettings = loadCpiSettings;
window.saveCpiSettings = saveCpiSettings;
window.calculateCpiPreview = calculateCpiPreview;
window.renderCpiRatesGrid = renderCpiRatesGrid;
window.onCpiLocationTypeChange = onCpiLocationTypeChange;
window.onCpiCountryChange = onCpiCountryChange;
window.renderRegionsForCountry = renderRegionsForCountry;

// Brand Package Functions (legacy - kept for backward compatibility)
window.loadBrandPackages = loadBrandPackages;
window.openAddBrandPackageModal = openAddBrandPackageModal;
window.closeBrandPackageModal = closeBrandPackageModal;
window.addPackageInclude = addPackageInclude;
window.removePackageInclude = removePackageInclude;
window.saveBrandPackage = saveBrandPackage;
window.editBrandPackage = editBrandPackage;
window.deleteBrandPackage = deleteBrandPackage;
window.renderBrandPackages = renderBrandPackages;
window.calculatePeriodPrices = calculatePeriodPrices;
window.calculateBrandPackagePreview = calculateBrandPackagePreview;
window.toggleBrandBasePackage = toggleBrandBasePackage;
window.findBrandBasePackage = findBrandBasePackage;

// Backward compatibility aliases (old Campaign names -> new Brand functions)
window.loadCampaignPackagesFromDB = loadBrandPackages;
window.closeCampaignPackageModal = closeBrandPackageModal;
window.saveCampaignPackage = saveBrandPackage;
window.editCampaignPackage = editBrandPackage;
window.deleteCampaignPackage = deleteBrandPackage;
window.renderCampaignPackages = renderBrandPackages;

// Drag and Drop Functions
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;

// Subscription Pricing Functions
window.calculateLivePricing = calculateLivePricing;
window.saveSubscriptionPricing = saveSubscriptionPricing;
window.addBasicTierFeature = addBasicTierFeature;
window.addPremiumTierFeature = addPremiumTierFeature;
window.removeTierFeature = removeTierFeature;

// Affiliate Functions
window.calculateAffiliateExamples = calculateAffiliateExamples;
window.saveAffiliateSettings = saveAffiliateSettings;

// Payment Gateway Functions
window.openAddPaymentGatewayModal = openAddPaymentGatewayModal;
window.closePaymentGatewayModal = closePaymentGatewayModal;
window.savePaymentGateway = savePaymentGateway;
window.toggleGateway = toggleGateway;
window.updateGatewayField = updateGatewayField;
window.removeGateway = removeGateway;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Pricing & Features Manager loaded');

    // Load CPI settings and render grid if section exists
    if (document.getElementById('cpi-rates-grid')) {
        loadCpiSettings();
    }

    // Legacy: Load brand packages from database if grid exists
    if (document.getElementById('brand-packages-grid')) {
        loadBrandPackages();
    }

    // Add input listeners for live pricing calculation
    const pricingInputs = document.querySelectorAll('#basic-base-price, #premium-base-price, [id^="basic-discount-"], [id^="premium-discount-"]');
    pricingInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                calculateLivePricing();
                calculateAffiliateExamples(); // Also update affiliate calculations when prices change
            });
        }
    });

    // Add input listeners for affiliate calculations
    const affiliateInputs = document.querySelectorAll('[id^="direct-"][id$="-commission"], [id^="indirect-"][id$="-commission"]');
    affiliateInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', calculateAffiliateExamples);
        }
    });

    // Add listener for period selector in affiliate calculator
    const periodSelect = document.getElementById('affiliate-calc-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', calculateAffiliateExamples);
    }

    // Auto-load commission calculator on page load
    // Use setTimeout to ensure all values are loaded first
    setTimeout(() => {
        if (document.getElementById('affiliate-calc-period')) {
            console.log('🔄 Auto-loading commission calculator...');
            calculateAffiliateExamples();
            console.log('✅ Commission calculator loaded automatically');
        }
    }, 300);
});

console.log('✅ pricing-features-manager.js loaded successfully (CPI Pricing)');
