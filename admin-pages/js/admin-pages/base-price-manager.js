/**
 * Base Price Manager
 * Handles CRUD operations for new tutor starting price rules
 */

// API Configuration - use global config set by api-config.js
function getApiBaseUrl() {
    return window.API_BASE_URL || window.ADMIN_API_CONFIG?.API_BASE_URL || 'http://localhost:8001';
}

// Get admin token from localStorage - use global helper if available
function getAdminToken() {
    // Use global getAuthToken if available (from auth-helpers.js)
    if (typeof window.getAuthToken === 'function') {
        return window.getAuthToken();
    }
    // Fallback to local implementation
    return localStorage.getItem('admin_access_token') ||
           localStorage.getItem('adminToken') ||
           localStorage.getItem('access_token') ||
           localStorage.getItem('token');
}

// Store detected currency based on GPS location
let basePriceDetectedCurrency = 'ETB';

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

// Load all base price rules on page load
async function loadBasePriceRules() {
    try {
        const token = getAdminToken();
        if (!token) {
            console.error('No admin access token found');
            return;
        }

        const response = await fetch(`${getApiBaseUrl()}/api/admin/base-price-rules`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rules = await response.json();
        displayBasePriceRules(rules);

    } catch (error) {
        console.error('Error loading base price rules:', error);
        showBasePriceError('Failed to load base price rules. Please try again.');
    }
}

// Display base price rules in grid
function displayBasePriceRules(rules) {
    const grid = document.getElementById('base-price-rules-grid');
    if (!grid) return;

    if (!rules || rules.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <i class="fas fa-tag text-6xl mb-4"></i>
                <p class="text-lg font-medium">No pricing rules configured yet</p>
                <p class="text-sm">Click "Add Price Rule" to create your first starting price rule</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = rules.map(rule => createBasePriceCard(rule)).join('');
}

// Create individual base price rule card
function createBasePriceCard(rule) {
    const statusBadge = rule.is_active
        ? '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Active</span>'
        : '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">Inactive</span>';

    const priorityBadge = rule.priority === 1
        ? '<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">High Priority</span>'
        : rule.priority === 2
        ? '<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Medium</span>'
        : '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">Low</span>';

    const countryLabel = formatCountryLabel(rule.country || 'all');
    const subjectLabel = rule.subject_category === 'all' ? 'All Subjects' : formatSubjectLabel(rule.subject_category);
    const formatLabel = rule.session_format === 'all' ? 'All Formats' : rule.session_format;
    const currency = rule.currency || 'ETB';  // Read currency from database

    // Format grade level range with University and Certification
    const minGrade = rule.min_grade_level || 1;
    const maxGrade = rule.max_grade_level || 14;

    // Helper function to format individual level
    const formatLevel = (level) => {
        if (level === 13) return 'University';
        if (level === 14) return 'Certification';
        return `Grade ${level}`;
    };

    let gradeLevelLabel;
    if (minGrade === 1 && maxGrade === 14) {
        gradeLevelLabel = 'All Levels (K-12, University, Certification)';
    } else if (minGrade === 1 && maxGrade === 12) {
        gradeLevelLabel = 'K-12 Only';
    } else if (minGrade === 13 && maxGrade === 14) {
        gradeLevelLabel = 'University & Certification';
    } else if (minGrade === maxGrade) {
        gradeLevelLabel = formatLevel(minGrade);
    } else {
        gradeLevelLabel = `${formatLevel(minGrade)} - ${formatLevel(maxGrade)}`;
    }

    return `
        <div class="bg-white border-2 ${rule.is_active ? 'border-teal-200' : 'border-gray-200'} rounded-xl p-5 hover:shadow-lg transition-all">
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h4 class="font-bold text-lg text-gray-800 mb-1">${escapeHtml(rule.rule_name)}</h4>
                    <div class="flex flex-wrap gap-2 mb-2">
                        ${statusBadge}
                        ${priorityBadge}
                    </div>
                </div>
            </div>

            <!-- Rule Details -->
            <div class="space-y-3 mb-4">
                <div class="flex items-center gap-2 text-sm">
                    <i class="fas fa-globe text-teal-600 w-5"></i>
                    <span class="text-gray-600">Country:</span>
                    <span class="font-semibold text-gray-800">${countryLabel}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <i class="fas fa-graduation-cap text-teal-600 w-5"></i>
                    <span class="text-gray-600">Subject:</span>
                    <span class="font-semibold text-gray-800">${subjectLabel}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <i class="fas fa-laptop-house text-teal-600 w-5"></i>
                    <span class="text-gray-600">Format:</span>
                    <span class="font-semibold text-gray-800">${formatLabel}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <i class="fas fa-layer-group text-teal-600 w-5"></i>
                    <span class="text-gray-600">Grade Level:</span>
                    <span class="font-semibold text-gray-800">${gradeLevelLabel}</span>
                </div>
            </div>

            <!-- Price Display -->
            <div class="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 mb-4 border border-teal-200">
                <div class="text-center">
                    <div class="text-3xl font-bold text-teal-700 mb-1">${rule.base_price_per_hour} ${currency}</div>
                    <div class="text-xs text-gray-600">per hour</div>
                </div>
                ${rule.credential_bonus > 0 || rule.experience_bonus_per_year > 0 ? `
                    <div class="mt-3 pt-3 border-t border-teal-200 space-y-2">
                        ${rule.credential_bonus > 0 ? `
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-gray-600"><i class="fas fa-certificate text-cyan-600 mr-1"></i>Credential Bonus:</span>
                                <span class="font-semibold text-cyan-700">+${rule.credential_bonus} ${currency}/credential</span>
                            </div>
                        ` : ''}
                        ${rule.experience_bonus_per_year > 0 ? `
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-gray-600"><i class="fas fa-briefcase text-purple-600 mr-1"></i>Experience Bonus:</span>
                                <span class="font-semibold text-purple-700">+${rule.experience_bonus_per_year} ${currency}/year</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
                <button onclick="editBasePriceRule(${rule.id})"
                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    <i class="fas fa-edit mr-1"></i>Edit
                </button>
                <button onclick="deleteBasePriceRule(${rule.id})"
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Format subject label for display
function formatSubjectLabel(subject) {
    const labels = {
        'mathematics': 'Mathematics',
        'science': 'Science',
        'languages': 'Languages',
        'social_studies': 'Social Studies',
        'computer_science': 'Computer Science & IT',
        'arts': 'Arts & Music',
        'business': 'Business & Economics',
        'other': 'Other Subjects'
    };
    return labels[subject] || subject;
}

// Format country label for display
function formatCountryLabel(country) {
    if (country === 'all') return 'Global (All Countries)';

    const countries = {
        // Africa
        'ET': 'Ethiopia',
        'CM': 'Cameroon',
        'KE': 'Kenya',
        'NG': 'Nigeria',
        'GH': 'Ghana',
        'ZA': 'South Africa',
        'EG': 'Egypt',
        'TZ': 'Tanzania',
        'UG': 'Uganda',
        'MA': 'Morocco',
        'DZ': 'Algeria',
        'TN': 'Tunisia',
        'RW': 'Rwanda',
        'SN': 'Senegal',
        'CI': 'Ivory Coast',

        // Americas
        'MX': 'Mexico',
        'US': 'United States',
        'CA': 'Canada',
        'BR': 'Brazil',
        'AR': 'Argentina',
        'CO': 'Colombia',
        'CL': 'Chile',
        'PE': 'Peru',

        // Europe
        'GB': 'United Kingdom',
        'DE': 'Germany',
        'FR': 'France',
        'ES': 'Spain',
        'IT': 'Italy',
        'NL': 'Netherlands',
        'BE': 'Belgium',
        'CH': 'Switzerland',
        'AT': 'Austria',
        'PL': 'Poland',

        // Asia
        'CN': 'China',
        'IN': 'India',
        'JP': 'Japan',
        'KR': 'South Korea',
        'SG': 'Singapore',
        'MY': 'Malaysia',
        'TH': 'Thailand',
        'VN': 'Vietnam',
        'PH': 'Philippines',
        'ID': 'Indonesia',

        // Middle East
        'SA': 'Saudi Arabia',
        'AE': 'United Arab Emirates',
        'IL': 'Israel',
        'TR': 'Turkey',

        // Oceania
        'AU': 'Australia',
        'NZ': 'New Zealand'
    };

    return countries[country] || country; // Return code if name not found
}

// Map country names to ISO codes (comprehensive list)
function getCountryCode(countryName) {
    // Comprehensive country name to ISO code mapping
    const countryNameToCode = {
        // Africa
        'Ethiopia': 'ET',
        'Cameroon': 'CM',
        'Kenya': 'KE',
        'Nigeria': 'NG',
        'Ghana': 'GH',
        'South Africa': 'ZA',
        'Egypt': 'EG',
        'Tanzania': 'TZ',
        'Uganda': 'UG',
        'Morocco': 'MA',
        'Algeria': 'DZ',
        'Tunisia': 'TN',
        'Rwanda': 'RW',
        'Senegal': 'SN',
        'Ivory Coast': 'CI',
        'Côte d\'Ivoire': 'CI',

        // Americas
        'Mexico': 'MX',
        'United States': 'US',
        'United States of America': 'US',
        'Canada': 'CA',
        'Brazil': 'BR',
        'Argentina': 'AR',
        'Colombia': 'CO',
        'Chile': 'CL',
        'Peru': 'PE',

        // Europe
        'United Kingdom': 'GB',
        'Germany': 'DE',
        'France': 'FR',
        'Spain': 'ES',
        'Italy': 'IT',
        'Netherlands': 'NL',
        'Belgium': 'BE',
        'Switzerland': 'CH',
        'Austria': 'AT',
        'Poland': 'PL',

        // Asia
        'China': 'CN',
        'India': 'IN',
        'Japan': 'JP',
        'South Korea': 'KR',
        'Singapore': 'SG',
        'Malaysia': 'MY',
        'Thailand': 'TH',
        'Vietnam': 'VN',
        'Philippines': 'PH',
        'Indonesia': 'ID',

        // Middle East
        'Saudi Arabia': 'SA',
        'United Arab Emirates': 'AE',
        'UAE': 'AE',
        'Israel': 'IL',
        'Turkey': 'TR',

        // Oceania
        'Australia': 'AU',
        'New Zealand': 'NZ'
    };

    return countryNameToCode[countryName] || null;
}

// Detect country from GPS
async function detectCountryFromGPS() {
    const countryField = document.getElementById('base-price-country');
    const countryDisplay = document.getElementById('base-price-country-display');
    const countryStatusDiv = document.getElementById('country-detection-status');

    if (!countryField || !countryDisplay) {
        console.error('Country field or display not found');
        return;
    }

    try {
        // Show loading state
        countryDisplay.innerHTML = '<i class="fas fa-spinner fa-spin mr-2 text-blue-500"></i>Detecting location...';
        if (countryStatusDiv) {
            countryStatusDiv.innerHTML = '<span class="text-blue-600"><i class="fas fa-spinner fa-spin mr-1"></i>Detecting your GPS location...</span>';
        }

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            console.warn('[GPS] Geolocation not supported, defaulting to Global');
            countryField.value = 'all';
            countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';
            if (countryStatusDiv) {
                countryStatusDiv.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle mr-1"></i>GPS not available. Using global pricing.</span>';
            }
            return;
        }

        // Get GPS position
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000  // 5 minutes cache
            });
        });

        const { latitude, longitude } = position.coords;
        console.log(`[GPS] Coordinates: ${latitude}, ${longitude}`);

        // Reverse geocode to get country
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'Astegni-Admin-Base-Price-Manager/1.0'
            }
        });

        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }

        const data = await response.json();
        console.log('[GPS] Geocoding data:', data);

        if (data && data.address) {
            const countryName = data.address.country;
            // Nominatim provides country_code (ISO) directly - use it!
            let countryCode = data.address.country_code ? data.address.country_code.toUpperCase() : null;

            console.log(`[GPS] Country detected: ${countryName} (${countryCode})`);

            // If we don't have the code from Nominatim, try our mapping
            if (!countryCode && countryName) {
                countryCode = getCountryCode(countryName);
            }

            if (countryCode) {
                // Set the hidden field and display
                countryField.value = countryCode;
                countryDisplay.innerHTML = `<i class="fas fa-map-marker-alt mr-2 text-green-500"></i>${countryName}`;

                // Set currency based on country
                basePriceDetectedCurrency = getCurrencyForCountry(countryCode);
                console.log(`[GPS] Currency set to: ${basePriceDetectedCurrency} for ${countryName}`);

                // Show success message
                if (countryStatusDiv) {
                    countryStatusDiv.innerHTML = `<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Detected: ${countryName} (${basePriceDetectedCurrency})</span>`;
                }

                console.log(`[GPS] Country set to: ${countryName} (${countryCode})`);
            } else {
                // Couldn't get country code
                console.warn('[GPS] Country detected but could not get country code');
                countryField.value = 'all';
                countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';

                if (countryStatusDiv) {
                    countryStatusDiv.innerHTML = `<span class="text-yellow-600"><i class="fas fa-exclamation-triangle mr-1"></i>Could not determine country code. Using global pricing.</span>`;
                }
            }
        } else {
            // GPS worked but no country found
            console.warn('[GPS] Location detected but country unavailable');
            countryField.value = 'all';
            countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';

            if (countryStatusDiv) {
                countryStatusDiv.innerHTML = '<span class="text-yellow-600"><i class="fas fa-exclamation-triangle mr-1"></i>Could not determine country. Using global pricing.</span>';
            }
        }

    } catch (error) {
        console.error('[GPS] Error detecting country:', error);

        // Default to 'all' on error
        countryField.value = 'all';
        countryDisplay.innerHTML = '<i class="fas fa-globe mr-2 text-gray-500"></i>Global (All Countries)';

        if (countryStatusDiv) {
            if (error.code === 1) {
                // Permission denied
                countryStatusDiv.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-circle mr-1"></i>Location permission denied. Using global pricing.</span>';
            } else if (error.code === 2) {
                // Position unavailable
                countryStatusDiv.innerHTML = '<span class="text-yellow-500"><i class="fas fa-exclamation-triangle mr-1"></i>Location unavailable. Using global pricing.</span>';
            } else if (error.code === 3) {
                // Timeout
                countryStatusDiv.innerHTML = '<span class="text-yellow-500"><i class="fas fa-clock mr-1"></i>Location timeout. Using global pricing.</span>';
            } else {
                // Other error
                countryStatusDiv.innerHTML = '<span class="text-gray-500"><i class="fas fa-map-marker-alt mr-1"></i>Location unavailable. Using global pricing.</span>';
            }
        }
    }
}

// Open modal for adding a new rule
async function openAddBasePriceModal() {
    const modal = document.getElementById('base-price-modal');
    if (!modal) {
        console.error('Base price modal not found');
        return;
    }

    // Reset form
    document.getElementById('base-price-form').reset();
    document.getElementById('base-price-rule-id').value = '';
    document.getElementById('base-price-modal-title').innerHTML = '<i class="fas fa-tag mr-2"></i>Add Starting Price Rule';

    // Set defaults
    document.getElementById('base-price-country').value = 'all';
    document.getElementById('base-price-active').checked = true;
    document.getElementById('base-price-priority').value = '2';
    document.getElementById('base-price-credential-bonus').value = '0';
    document.getElementById('base-price-experience-bonus').value = '0';
    document.getElementById('base-price-min-grade').value = '1';
    document.getElementById('base-price-max-grade').value = '14';

    // Clear preview
    updateBasePricePreview();

    // Show modal
    modal.classList.remove('hidden');

    // Auto-detect country from GPS (non-blocking)
    detectCountryFromGPS().catch(err => {
        console.warn('[GPS] Auto-detection failed:', err);
    });
}

// Open modal for editing existing rule
async function editBasePriceRule(ruleId) {
    try {
        const token = getAdminToken();
        const response = await fetch(`${getApiBaseUrl()}/api/admin/base-price-rules/${ruleId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch rule details');

        const rule = await response.json();

        // Populate form
        document.getElementById('base-price-rule-id').value = rule.id;
        document.getElementById('base-price-rule-name').value = rule.rule_name;

        // Set country (hidden field and display)
        const countryCode = rule.country || 'all';
        document.getElementById('base-price-country').value = countryCode;
        const countryDisplay = document.getElementById('base-price-country-display');
        if (countryDisplay) {
            countryDisplay.innerHTML = `<i class="fas fa-map-marker-alt mr-2 text-gray-500"></i>${formatCountryLabel(countryCode)}`;
        }

        // Set currency based on existing rule's currency or derive from country
        basePriceDetectedCurrency = rule.currency || getCurrencyForCountry(countryCode);

        document.getElementById('base-price-subject').value = rule.subject_category;
        document.getElementById('base-price-format').value = rule.session_format;
        document.getElementById('base-price-min-grade').value = rule.min_grade_level || 1;
        document.getElementById('base-price-max-grade').value = rule.max_grade_level || 14;
        document.getElementById('base-price-amount').value = rule.base_price_per_hour;
        document.getElementById('base-price-credential-bonus').value = rule.credential_bonus || 0;
        document.getElementById('base-price-experience-bonus').value = rule.experience_bonus_per_year || 0;
        document.getElementById('base-price-priority').value = rule.priority;
        document.getElementById('base-price-active').checked = rule.is_active;

        // Update modal title
        document.getElementById('base-price-modal-title').innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Starting Price Rule';

        // Update preview
        updateBasePricePreview();

        // Show modal
        document.getElementById('base-price-modal').classList.remove('hidden');

    } catch (error) {
        console.error('Error loading rule for edit:', error);
        showBasePriceError('Failed to load rule details. Please try again.');
    }
}

// Close modal
function closeBasePriceModal() {
    const modal = document.getElementById('base-price-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('base-price-form').reset();
    }
}

// Save base price rule (create or update)
async function saveBasePriceRule(event) {
    event.preventDefault();

    const ruleId = document.getElementById('base-price-rule-id').value;
    const isEdit = !!ruleId;

    const minGrade = parseInt(document.getElementById('base-price-min-grade').value);
    const maxGrade = parseInt(document.getElementById('base-price-max-grade').value);

    // Validate grade level range
    if (minGrade > maxGrade) {
        showBasePriceError(`Minimum grade level (${minGrade}) cannot be greater than maximum grade level (${maxGrade})`);
        return;
    }

    const ruleData = {
        rule_name: document.getElementById('base-price-rule-name').value.trim(),
        country: document.getElementById('base-price-country').value,
        subject_category: document.getElementById('base-price-subject').value,
        session_format: document.getElementById('base-price-format').value,
        min_grade_level: minGrade,
        max_grade_level: maxGrade,
        base_price_per_hour: parseFloat(document.getElementById('base-price-amount').value),
        currency: basePriceDetectedCurrency,  // Auto-detected currency based on GPS location
        credential_bonus: parseFloat(document.getElementById('base-price-credential-bonus').value) || 0,
        experience_bonus_per_year: parseFloat(document.getElementById('base-price-experience-bonus').value) || 0,
        priority: parseInt(document.getElementById('base-price-priority').value),
        is_active: document.getElementById('base-price-active').checked
    };

    try {
        const token = getAdminToken();
        const url = isEdit
            ? `${getApiBaseUrl()}/api/admin/base-price-rules/${ruleId}`
            : `${getApiBaseUrl()}/api/admin/base-price-rules`;

        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ruleData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save rule');
        }

        await response.json();

        // Close modal and reload rules
        closeBasePriceModal();
        await loadBasePriceRules();

        // Show success message
        showBasePriceSuccess(isEdit ? 'Rule updated successfully!' : 'Rule created successfully!');

    } catch (error) {
        console.error('Error saving base price rule:', error);
        showBasePriceError(error.message || 'Failed to save rule. Please try again.');
    }
}

// Delete base price rule
async function deleteBasePriceRule(ruleId) {
    if (!confirm('Are you sure you want to delete this pricing rule? This action cannot be undone.')) {
        return;
    }

    try {
        const token = getAdminToken();
        const response = await fetch(`${getApiBaseUrl()}/api/admin/base-price-rules/${ruleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete rule');
        }

        // Reload rules
        await loadBasePriceRules();
        showBasePriceSuccess('Rule deleted successfully!');

    } catch (error) {
        console.error('Error deleting rule:', error);
        showBasePriceError('Failed to delete rule. Please try again.');
    }
}

// Update price preview in modal
function updateBasePricePreview() {
    const basePrice = parseFloat(document.getElementById('base-price-amount').value) || 0;
    const credentialBonus = parseFloat(document.getElementById('base-price-credential-bonus').value) || 0;
    const experienceBonus = parseFloat(document.getElementById('base-price-experience-bonus').value) || 0;

    // Update base price
    document.getElementById('preview-base-price').textContent = basePrice > 0 ? `${basePrice} ${basePriceDetectedCurrency}` : `-- ${basePriceDetectedCurrency}`;

    // Update credential bonus preview (base + credentials)
    document.getElementById('preview-1-credential').textContent = basePrice > 0 ? `${basePrice + credentialBonus} ${basePriceDetectedCurrency}/hr` : `-- ${basePriceDetectedCurrency}/hr`;
    document.getElementById('preview-2-credentials').textContent = basePrice > 0 ? `${basePrice + (credentialBonus * 2)} ${basePriceDetectedCurrency}/hr` : `-- ${basePriceDetectedCurrency}/hr`;
    document.getElementById('preview-3-credentials').textContent = basePrice > 0 ? `${basePrice + (credentialBonus * 3)} ${basePriceDetectedCurrency}/hr` : `-- ${basePriceDetectedCurrency}/hr`;

    // Update experience bonus preview (base + experience × years)
    document.getElementById('preview-1-year').textContent = basePrice > 0 ? `${basePrice + (experienceBonus * 1)} ${basePriceDetectedCurrency}/hr` : `-- ${basePriceDetectedCurrency}/hr`;
    document.getElementById('preview-3-years').textContent = basePrice > 0 ? `${basePrice + (experienceBonus * 3)} ${basePriceDetectedCurrency}/hr` : `-- ${basePriceDetectedCurrency}/hr`;
    document.getElementById('preview-5-years').textContent = basePrice > 0 ? `${basePrice + (experienceBonus * 5)} ${basePriceDetectedCurrency}/hr` : `-- ${basePriceDetectedCurrency}/hr`;
}

// Show success message
function showBasePriceSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

// Show error message
function showBasePriceError(message) {
    // You can implement a toast notification here
    alert(message);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to window for HTML onclick handlers
window.loadBasePriceRules = loadBasePriceRules;
window.openAddBasePriceModal = openAddBasePriceModal;
window.editBasePriceRule = editBasePriceRule;
window.closeBasePriceModal = closeBasePriceModal;
window.saveBasePriceRule = saveBasePriceRule;
window.deleteBasePriceRule = deleteBasePriceRule;
window.updateBasePricePreview = updateBasePricePreview;

// Auto-load rules when pricing panel is opened
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the pricing panel
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('panel') === 'pricing') {
        loadBasePriceRules();
    }
});

console.log('✅ Base Price Manager loaded');
