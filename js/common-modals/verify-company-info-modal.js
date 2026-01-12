/**
 * Verify Company Info Modal - JavaScript Functions
 * Handles company verification for advertisers
 */

console.log('[verify-company-info-modal.js] ========== SCRIPT LOADING ==========');

// Tab switching
function switchCompanyVerifyTab(tab) {
    // Hide all tab contents
    document.getElementById('companyInfoContent').classList.add('hidden');
    document.getElementById('businessDocsContent').classList.add('hidden');
    document.getElementById('verificationStatusContent').classList.add('hidden');

    // Reset all tab styles
    document.getElementById('companyInfoTab').className = 'modal-tab flex-1 py-3 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 transition-all';
    document.getElementById('businessDocsTab').className = 'modal-tab flex-1 py-3 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 transition-all';
    document.getElementById('verificationStatusTab').className = 'modal-tab flex-1 py-3 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 transition-all';

    // Show selected tab content and style
    if (tab === 'company') {
        document.getElementById('companyInfoContent').classList.remove('hidden');
        document.getElementById('companyInfoTab').className = 'modal-tab flex-1 py-3 px-4 text-sm font-semibold text-emerald-600 border-b-2 border-emerald-600 transition-all';
    } else if (tab === 'documents') {
        document.getElementById('businessDocsContent').classList.remove('hidden');
        document.getElementById('businessDocsTab').className = 'modal-tab flex-1 py-3 px-4 text-sm font-semibold text-emerald-600 border-b-2 border-emerald-600 transition-all';
    } else if (tab === 'status') {
        document.getElementById('verificationStatusContent').classList.remove('hidden');
        document.getElementById('verificationStatusTab').className = 'modal-tab flex-1 py-3 px-4 text-sm font-semibold text-emerald-600 border-b-2 border-emerald-600 transition-all';
        updateVerificationStatus();
    }
}

// Track the verified email to detect changes
let verifiedEmailAddress = null;

// Track all verified emails (array)
let verifiedEmails = [];

// Load company info data from API
async function loadCompanyInfoData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/advertiser/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Populate form fields
            const fields = {
                'modalCompanyName': data.company_name,
                'modalCompanyIndustry': data.industry,
                'modalBusinessRegNo': data.business_reg_no,
                'modalCompanyTIN': data.tin_number,
                'modalCompanyWebsite': data.website,
                'modalCompanyDescription': data.company_description
            };

            // Handle company_email array - load all verified emails
            const companyEmails = data.company_email || [];
            const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');

            // If we have emails from API but none in localStorage, treat them as verified
            if (companyEmails.length > 0) {
                // Check if localStorage has fewer emails than API (emails came from server)
                const storedEmails = companyData.verifiedEmails || [];

                if (storedEmails.length === 0 && companyEmails.length > 0) {
                    // Emails from server are trusted as verified
                    verifiedEmails = [...companyEmails];
                    companyData.verifiedEmails = verifiedEmails;
                    companyData.emailVerified = true;
                    companyData.verifiedEmail = companyEmails[companyEmails.length - 1]; // Last one as "current"
                    localStorage.setItem('companyVerificationData', JSON.stringify(companyData));
                }

                // Render all emails from server in the verified list
                const verifiedList = document.getElementById('verifiedEmailsList');
                if (verifiedList) {
                    verifiedList.innerHTML = ''; // Clear first
                    companyEmails.forEach(email => {
                        renderVerifiedEmailBadge(email);
                    });
                }

                // Keep the input empty for adding new emails
                const emailInput = document.getElementById('modalCompanyEmail');
                if (emailInput) {
                    emailInput.value = '';
                }

                // Update local array
                verifiedEmails = [...companyEmails];
            } else {
                // No emails from API - check localStorage
                if (companyData.emailVerified && companyData.verifiedEmail) {
                    const emailInput = document.getElementById('modalCompanyEmail');
                    if (emailInput) {
                        emailInput.value = companyData.verifiedEmail;
                    }
                    verifiedEmailAddress = companyData.verifiedEmail;
                    showEmailVerified();
                } else {
                    resetEmailVerificationUI();
                }
            }

            // Handle company_phone array - use first phone for the input
            const companyPhones = data.company_phone || [];
            const primaryPhone = companyPhones.length > 0 ? companyPhones[0] : '';

            // Set phone input if exists
            const phoneInput = document.getElementById('modalCompanyPhone');
            if (phoneInput && primaryPhone) {
                phoneInput.value = primaryPhone;
            }

            for (const [id, value] of Object.entries(fields)) {
                const el = document.getElementById(id);
                if (el && value) {
                    el.value = value;
                }
            }

            // Add input listener to detect email changes
            setupEmailChangeListener();

            // Handle location data
            if (data.latitude && data.longitude) {
                const toggle = document.getElementById('modalLocationToggle');
                if (toggle) {
                    toggle.checked = true;
                    document.getElementById('locationDisplay').classList.remove('hidden');
                    document.getElementById('locationText').textContent = data.address || `${data.latitude}, ${data.longitude}`;
                    document.getElementById('modalCompanyLatitude').value = data.latitude;
                    document.getElementById('modalCompanyLongitude').value = data.longitude;
                    document.getElementById('modalCompanyAddress').value = data.address || '';
                }
            }

            // Update verification banner based on status
            updateVerificationBanner(data.verification_status || 'pending');

            // Update document statuses and store URLs
            // Note: reusing companyData variable from above (line 83)
            console.log('[loadCompanyInfoData] ===== LOADING DOCUMENTS =====');
            console.log('[loadCompanyInfoData] business_license_url:', data.business_license_url);
            console.log('[loadCompanyInfoData] tin_certificate_url:', data.tin_certificate_url);
            console.log('[loadCompanyInfoData] company_logo:', data.company_logo);

            if (data.business_license_url) {
                console.log('[loadCompanyInfoData] Processing businessLicense...');
                updateDocStatus('businessLicense', true, data.business_license_url);
                companyData.businessLicense = true;
                companyData.businessLicenseUrl = data.business_license_url;
            }
            if (data.tin_certificate_url) {
                console.log('[loadCompanyInfoData] Processing tinCertificate...');
                updateDocStatus('tinCertificate', true, data.tin_certificate_url);
                companyData.tinCertificate = true;
                companyData.tinCertificateUrl = data.tin_certificate_url;
            }
            if (data.company_logo) {
                console.log('[loadCompanyInfoData] Processing companyLogo...');
                updateDocStatus('companyLogo', true, data.company_logo);
                companyData.companyLogo = true;
                companyData.companyLogoUrl = data.company_logo;
            }

            console.log('[loadCompanyInfoData] ===== DOCUMENTS LOADED =====');
            console.log('[loadCompanyInfoData] Summary - Documents processed:');
            console.log('  - businessLicense:', !!data.business_license_url);
            console.log('  - tinCertificate:', !!data.tin_certificate_url);
            console.log('  - companyLogo:', !!data.company_logo);

            // Final check: Are the preview elements now visible?
            console.log('[loadCompanyInfoData] Preview element visibility check:');
            const blPreview = document.getElementById('businessLicensePreview');
            const tcPreview = document.getElementById('tinCertificatePreview');
            const clPreview = document.getElementById('companyLogoPreview');
            console.log('  - businessLicensePreview hidden:', blPreview?.classList.contains('hidden'));
            console.log('  - tinCertificatePreview hidden:', tcPreview?.classList.contains('hidden'));
            console.log('  - companyLogoPreview hidden:', clPreview?.classList.contains('hidden'));

            // Store updated data
            localStorage.setItem('companyVerificationData', JSON.stringify(companyData));
        }
    } catch (error) {
        console.error('Error loading company info:', error);
    }
}

// Handle location toggle
function handleLocationToggle(checkbox) {
    const locationDisplay = document.getElementById('locationDisplay');
    const locationText = document.getElementById('locationText');

    if (checkbox.checked) {
        locationDisplay.classList.remove('hidden');
        locationText.textContent = 'Fetching location...';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    document.getElementById('modalCompanyLatitude').value = lat;
                    document.getElementById('modalCompanyLongitude').value = lng;

                    // Try to get address from coordinates using reverse geocoding
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        if (response.ok) {
                            const data = await response.json();
                            const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                            locationText.textContent = address;
                            document.getElementById('modalCompanyAddress').value = address;
                        } else {
                            locationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        }
                    } catch (error) {
                        locationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    locationText.textContent = 'Unable to get location. Please enable location access.';
                    checkbox.checked = false;
                    setTimeout(() => {
                        locationDisplay.classList.add('hidden');
                    }, 3000);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            locationText.textContent = 'Geolocation is not supported by your browser.';
            checkbox.checked = false;
            setTimeout(() => {
                locationDisplay.classList.add('hidden');
            }, 3000);
        }
    } else {
        locationDisplay.classList.add('hidden');
        document.getElementById('modalCompanyLatitude').value = '';
        document.getElementById('modalCompanyLongitude').value = '';
        document.getElementById('modalCompanyAddress').value = '';
    }
}

function updateDocStatus(docType, uploaded, url = null) {
    console.log(`[updateDocStatus] docType: ${docType}, uploaded: ${uploaded}, url: ${url ? 'yes' : 'no'}`);

    const statusEl = document.getElementById(`${docType}Status`);
    if (statusEl && uploaded) {
        statusEl.className = 'px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600';
        statusEl.textContent = 'Uploaded';
        console.log(`[updateDocStatus] Status badge updated for: ${docType}`);
    } else if (!statusEl) {
        console.warn(`[updateDocStatus] Status element not found: ${docType}Status`);
    }

    // Show document preview section if URL is provided
    if (url) {
        showUploadedDocumentPreview(docType, url);
    }
}

// Show the uploaded document preview in the document section
function showUploadedDocumentPreview(docType, url) {
    console.log(`[showUploadedDocumentPreview] docType: ${docType}, url: ${url}`);

    const previewElId = `${docType}Preview`;
    const previewEl = document.getElementById(previewElId);
    console.log(`[showUploadedDocumentPreview] Looking for preview element: ${previewElId}, found:`, !!previewEl);

    // Build view button ID - capitalize first letter
    const viewBtnId = `view${docType.charAt(0).toUpperCase() + docType.slice(1)}`;
    const viewBtn = document.getElementById(viewBtnId);
    console.log(`[showUploadedDocumentPreview] Looking for view button: ${viewBtnId}, found:`, !!viewBtn);

    const fileNameElId = `${docType}FileName`;
    const fileNameEl = document.getElementById(fileNameElId);
    console.log(`[showUploadedDocumentPreview] Looking for fileName element: ${fileNameElId}, found:`, !!fileNameEl);

    if (previewEl) {
        previewEl.classList.remove('hidden');
        console.log(`[showUploadedDocumentPreview] Preview element shown for: ${docType}`);

        // Extract filename from URL
        const fileName = url.split('/').pop() || 'document';
        if (fileNameEl) {
            fileNameEl.textContent = decodeURIComponent(fileName);
        }

        // For company logo, show thumbnail image
        if (docType === 'companyLogo') {
            const thumbImg = document.getElementById('companyLogoThumbImg');
            const thumbSvg = thumbImg?.nextElementSibling;
            if (thumbImg) {
                thumbImg.src = url;
                thumbImg.classList.remove('hidden');
                if (thumbSvg) thumbSvg.classList.add('hidden');
            }
        }
    } else {
        console.warn(`[showUploadedDocumentPreview] Preview element NOT found for: ${docType}`);
    }

    // Setup view button
    if (viewBtn) {
        viewBtn.onclick = () => window.open(url, '_blank');
        console.log(`[showUploadedDocumentPreview] View button click handler set for: ${docType}`);
    } else {
        console.warn(`[showUploadedDocumentPreview] View button NOT found for: ${docType}`);
    }
}

function updateVerificationBanner(status) {
    const banner = document.getElementById('companyVerificationBanner');
    if (!banner) return;

    const statusBadge = document.getElementById('company-verification-status');

    if (status === 'verified') {
        banner.className = 'mb-6 p-4 rounded-xl bg-green-50 border border-green-200';
        banner.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <p class="font-semibold text-green-800">Company Verified</p>
                    <p class="text-sm text-green-600">Your company has been verified successfully</p>
                </div>
            </div>
        `;
        if (statusBadge) {
            statusBadge.className = 'mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
            statusBadge.textContent = 'Verified';
        }
    } else if (status === 'in_review') {
        banner.className = 'mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200';
        banner.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <p class="font-semibold text-blue-800">Under Review</p>
                    <p class="text-sm text-blue-600">Your verification request is being reviewed</p>
                </div>
            </div>
        `;
        if (statusBadge) {
            statusBadge.className = 'mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
            statusBadge.textContent = 'Under Review';
        }
    } else if (status === 'rejected') {
        banner.className = 'mb-6 p-4 rounded-xl bg-red-50 border border-red-200';
        banner.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>
                <div>
                    <p class="font-semibold text-red-800">Verification Rejected</p>
                    <p class="text-sm text-red-600">Please review the notes and resubmit</p>
                </div>
            </div>
        `;
        if (statusBadge) {
            statusBadge.className = 'mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
            statusBadge.textContent = 'Rejected';
        }
    }
}

function updateVerificationStatus() {
    // Check localStorage for verification data
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');

    // Update checklist icons
    updateChecklistItem('companyInfo', companyData.infoComplete);
    updateChecklistItem('businessLicense', companyData.businessLicense);
    updateChecklistItem('tinCertificate', companyData.tinCertificate);
    updateChecklistItem('adminReview', companyData.adminReviewed);
}

function updateChecklistItem(item, isComplete) {
    const iconEl = document.getElementById(`${item}CheckIcon`);
    const statusEl = document.getElementById(`${item}CheckStatus`);

    if (!iconEl || !statusEl) return;

    if (isComplete) {
        iconEl.className = 'w-8 h-8 bg-green-100 rounded-full flex items-center justify-center';
        iconEl.innerHTML = '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        statusEl.className = 'text-sm text-green-600 font-medium';
        statusEl.textContent = 'Complete';
    }
}

async function handleCompanyDocUpload(docType, input) {
    const file = input.files[0];
    if (!file) return;

    // Update status badge to show uploading
    const statusEl = document.getElementById(`${docType}Status`);
    if (statusEl) {
        statusEl.className = 'px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-600';
        statusEl.textContent = 'Uploading...';
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to upload documents.');
            return;
        }

        // Map frontend docType to backend document_type
        const docTypeMap = {
            'businessLicense': 'business_license',
            'tinCertificate': 'tin_certificate',
            'companyLogo': 'company_logo',
            'additionalDoc': 'additional_doc'
        };

        const backendDocType = docTypeMap[docType] || docType;

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', backendDocType);

        // Upload to server
        const response = await fetch(`${API_BASE_URL}/api/upload/company-document`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();

            // Update status badge to success
            if (statusEl) {
                statusEl.className = 'px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600';
                statusEl.textContent = 'Uploaded';
            }

            // Show view button with the URL
            const viewBtn = document.getElementById(`view${docType.charAt(0).toUpperCase() + docType.slice(1)}`);
            if (viewBtn) {
                viewBtn.classList.remove('hidden');
                viewBtn.onclick = () => window.open(result.url, '_blank');
            }

            // Store in localStorage
            const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
            companyData[docType] = true;
            companyData[`${docType}Url`] = result.url;
            localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

            console.log(`[OK] ${docType} uploaded successfully:`, result.url);
        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }
    } catch (error) {
        console.error(`Error uploading ${docType}:`, error);

        // Update status badge to error
        if (statusEl) {
            statusEl.className = 'px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600';
            statusEl.textContent = 'Failed';
        }

        alert(`Failed to upload ${docType.replace(/([A-Z])/g, ' $1').trim()}: ${error.message}`);
    }
}

async function saveCompanyInfo(e) {
    if (e) e.preventDefault();

    // Check if at least one email is verified
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
    const allEmails = getAllVerifiedEmails();

    if (allEmails.length === 0) {
        alert('Please verify at least one business email before saving.');
        return;
    }

    // Get phone value
    const phoneValue = document.getElementById('modalCompanyPhone')?.value || '';

    const formData = {
        company_name: document.getElementById('modalCompanyName')?.value || '',
        industry: document.getElementById('modalCompanyIndustry')?.value || '',
        business_reg_no: document.getElementById('modalBusinessRegNo')?.value || '',
        tin_number: document.getElementById('modalCompanyTIN')?.value || '',
        website: document.getElementById('modalCompanyWebsite')?.value || '',
        company_email: allEmails,  // Store all verified emails as JSON array
        company_phone: phoneValue ? [phoneValue] : [],  // Store as JSON array
        address: document.getElementById('modalCompanyAddress')?.value || '',
        latitude: document.getElementById('modalCompanyLatitude')?.value || null,
        longitude: document.getElementById('modalCompanyLongitude')?.value || null,
        company_description: document.getElementById('modalCompanyDescription')?.value || ''
    };

    console.log('[saveCompanyInfo] Saving with emails:', allEmails);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/advertiser/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // Mark company info as complete
            const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
            companyData.infoComplete = true;
            localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

            alert('Company information saved successfully!');
        } else {
            const error = await response.json();
            alert('Error saving company info: ' + (error.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving company info:', error);
        alert('Error saving company information. Please try again.');
    }
}

async function submitCompanyForVerification() {
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');

    if (!companyData.infoComplete) {
        alert('Please complete the Company Info tab first.');
        switchCompanyVerifyTab('company');
        return;
    }

    if (!companyData.tinCertificate) {
        alert('Please upload your TIN Certificate document. This is required.');
        switchCompanyVerifyTab('documents');
        return;
    }

    if (!companyData.companyLogo) {
        alert('Please upload your Company Logo. This is required.');
        switchCompanyVerifyTab('documents');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to submit verification.');
            return;
        }

        // Call backend API to submit for verification
        const response = await fetch(`${API_BASE_URL}/api/advertiser/submit-verification`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();

            // Update localStorage
            companyData.submitted = true;
            companyData.submittedAt = result.submitted_at;
            localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

            alert(result.message);

            // Update the verification banner
            updateVerificationBanner('in_review');

            switchCompanyVerifyTab('status');
        } else {
            const error = await response.json();
            alert('Failed to submit verification: ' + (error.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error submitting verification:', error);
        alert('Error submitting verification. Please try again.');
    }
}

// Setup form submit handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('verifyCompanyInfoForm');
    if (form) {
        form.addEventListener('submit', saveCompanyInfo);
    }
});

// Also setup when modal is loaded dynamically
function initCompanyVerificationModal() {
    console.log('[initCompanyVerificationModal] Called');
    const form = document.getElementById('verifyCompanyInfoForm');
    if (form && !form.hasAttribute('data-initialized')) {
        form.addEventListener('submit', saveCompanyInfo);
        form.setAttribute('data-initialized', 'true');
        console.log('[initCompanyVerificationModal] Form listener attached');
    }

    // Attach event listeners for OTP buttons (prevents race condition with onclick)
    const sendOtpBtn = document.getElementById('sendEmailOtpBtn');
    console.log('[initCompanyVerificationModal] sendOtpBtn found:', !!sendOtpBtn);
    if (sendOtpBtn && !sendOtpBtn.hasAttribute('data-listener-attached')) {
        sendOtpBtn.addEventListener('click', sendCompanyEmailOtp);
        sendOtpBtn.setAttribute('data-listener-attached', 'true');
        console.log('[OK] Send OTP button listener attached');
    } else if (sendOtpBtn) {
        console.log('[initCompanyVerificationModal] Button already has listener');
    }

    const verifyOtpBtn = document.getElementById('verifyEmailOtpBtn');
    if (verifyOtpBtn && !verifyOtpBtn.hasAttribute('data-listener-attached')) {
        verifyOtpBtn.addEventListener('click', verifyCompanyEmailOtp);
        verifyOtpBtn.setAttribute('data-listener-attached', 'true');
        console.log('[OK] Verify OTP button listener attached');
    }

    // Load previously verified emails
    loadVerifiedEmails();
}

// Email OTP Verification Functions
let companyEmailOtpTimer = null;

// Flag to prevent duplicate calls
let isSendingOtp = false;

async function sendCompanyEmailOtp() {
    console.log('[sendCompanyEmailOtp] ========== FUNCTION CALLED ==========');

    // Prevent duplicate calls
    if (isSendingOtp) {
        console.log('[sendCompanyEmailOtp] Already sending OTP - ignoring duplicate call');
        return;
    }
    isSendingOtp = true;

    const emailInput = document.getElementById('modalCompanyEmail');
    console.log('[sendCompanyEmailOtp] Email input element:', emailInput);

    const email = emailInput?.value;
    console.log('[sendCompanyEmailOtp] Email value:', email);

    if (!email) {
        alert('Please enter your business email address first.');
        console.log('[sendCompanyEmailOtp] No email - aborting');
        isSendingOtp = false;
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        console.log('[sendCompanyEmailOtp] Invalid email format - aborting');
        isSendingOtp = false;
        return;
    }

    const sendBtn = document.getElementById('sendEmailOtpBtn');
    console.log('[sendCompanyEmailOtp] Send button:', sendBtn);

    const originalText = sendBtn ? sendBtn.textContent : 'Send OTP';
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
    }

    // Check API_BASE_URL
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8000';
    console.log('[sendCompanyEmailOtp] API_BASE_URL:', apiUrl);

    try {
        const token = localStorage.getItem('token');
        console.log('[sendCompanyEmailOtp] Token exists:', !!token);

        if (!token) {
            alert('You are not logged in. Please log in first.');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = originalText;
            }
            isSendingOtp = false;
            return;
        }

        console.log('[sendCompanyEmailOtp] Making API call to:', `${apiUrl}/api/send-otp-to-email`);

        // Use the new endpoint that sends OTP to a custom email (not user's registered email)
        const response = await fetch(`${apiUrl}/api/send-otp-to-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: email,
                purpose: 'company_verification'
            })
        });

        console.log('[sendCompanyEmailOtp] Response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('[sendCompanyEmailOtp] SUCCESS! Response:', result);

            // Show OTP input section
            document.getElementById('emailOtpSection').classList.remove('hidden');

            // Start countdown timer (60 seconds)
            let countdown = 60;
            if (sendBtn) sendBtn.textContent = `Resend (${countdown}s)`;

            companyEmailOtpTimer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(companyEmailOtpTimer);
                    if (sendBtn) {
                        sendBtn.disabled = false;
                        sendBtn.textContent = 'Resend OTP';
                    }
                } else {
                    if (sendBtn) sendBtn.textContent = `Resend (${countdown}s)`;
                }
            }, 1000);

            // In dev mode, show the OTP for testing
            if (result.otp) {
                console.log('[sendCompanyEmailOtp] DEV MODE - OTP code:', result.otp);
                alert(`OTP sent to your email. Please check your inbox.\n\n(Dev mode - OTP: ${result.otp})`);
            } else {
                alert('OTP sent to your email. Please check your inbox.');
            }

            // Reset flag after success (allow resend after countdown)
            isSendingOtp = false;
        } else {
            const error = await response.json();
            console.error('[sendCompanyEmailOtp] FAILED! Error:', error);
            alert('Failed to send OTP: ' + (error.detail || 'Unknown error'));
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = originalText;
            }
            isSendingOtp = false;
        }
    } catch (error) {
        console.error('[sendCompanyEmailOtp] EXCEPTION:', error);
        alert('Error sending OTP. Please try again.\n\nError: ' + error.message);
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
        }
        isSendingOtp = false;
    }
}

async function verifyCompanyEmailOtp() {
    console.log('[verifyCompanyEmailOtp] ========== FUNCTION CALLED ==========');

    const email = document.getElementById('modalCompanyEmail')?.value;
    const otp = document.getElementById('modalEmailOtp')?.value;

    console.log('[verifyCompanyEmailOtp] Email:', email, 'OTP:', otp);

    if (!otp || otp.length !== 6) {
        alert('Please enter the 6-digit OTP code.');
        return;
    }

    const verifyBtn = document.getElementById('verifyEmailOtpBtn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
    }

    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8000';

    try {
        const token = localStorage.getItem('token');
        console.log('[verifyCompanyEmailOtp] Making API call...');

        // Use the new endpoint for verifying custom email OTP
        const response = await fetch(`${apiUrl}/api/verify-otp-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: email,
                otp: otp,
                purpose: 'company_verification'
            })
        });

        console.log('[verifyCompanyEmailOtp] Response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('[verifyCompanyEmailOtp] SUCCESS! Response:', result);

            // Clear timer if running
            if (companyEmailOtpTimer) {
                clearInterval(companyEmailOtpTimer);
            }

            // Mark email as verified
            showEmailVerified();

            // Store verification in localStorage
            const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
            companyData.emailVerified = true;
            companyData.verifiedEmail = email;
            localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

            alert('Email verified successfully!');
        } else {
            const error = await response.json();
            console.error('[verifyCompanyEmailOtp] FAILED! Error:', error);
            alert('Invalid OTP: ' + (error.detail || 'Please try again.'));
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify';
            }
        }
    } catch (error) {
        console.error('[verifyCompanyEmailOtp] EXCEPTION:', error);
        alert('Error verifying OTP. Please try again.\n\nError: ' + error.message);
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify';
        }
    }
}

function showEmailVerified() {
    // Hide OTP section and send button
    document.getElementById('emailOtpSection')?.classList.add('hidden');
    document.getElementById('sendEmailOtpBtn')?.classList.add('hidden');

    // Show verified badge
    document.getElementById('emailVerifiedBadge')?.classList.remove('hidden');

    // Make email field readonly
    const emailInput = document.getElementById('modalCompanyEmail');
    if (emailInput) {
        emailInput.readOnly = true;
        emailInput.classList.add('bg-gray-100');
    }
}

// Reset email verification UI when email changes
function resetEmailVerificationUI() {
    // Show send button
    const sendBtn = document.getElementById('sendEmailOtpBtn');
    if (sendBtn) {
        sendBtn.classList.remove('hidden');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send OTP';
    }

    // Hide OTP section
    document.getElementById('emailOtpSection')?.classList.add('hidden');

    // Hide verified badge
    document.getElementById('emailVerifiedBadge')?.classList.add('hidden');

    // Make email field editable
    const emailInput = document.getElementById('modalCompanyEmail');
    if (emailInput) {
        emailInput.readOnly = false;
        emailInput.classList.remove('bg-gray-100');
    }

    // Clear OTP input
    const otpInput = document.getElementById('modalEmailOtp');
    if (otpInput) {
        otpInput.value = '';
    }

    // Reset verified email tracking
    verifiedEmailAddress = null;
}

// Setup listener to detect when user changes the email
function setupEmailChangeListener() {
    const emailInput = document.getElementById('modalCompanyEmail');
    if (emailInput && !emailInput.hasAttribute('data-listener-added')) {
        emailInput.setAttribute('data-listener-added', 'true');
        emailInput.addEventListener('input', function() {
            // If user changes the email from the verified one, reset verification
            if (verifiedEmailAddress && this.value !== verifiedEmailAddress) {
                resetEmailVerificationUI();

                // Clear the verification status in localStorage
                const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
                companyData.emailVerified = false;
                companyData.verifiedEmail = null;
                localStorage.setItem('companyVerificationData', JSON.stringify(companyData));
            }
        });
    }
}

// ==========================================
// DOCUMENT PREVIEW MODAL FUNCTIONS
// ==========================================

// Store current preview state
let currentPreviewDocType = null;
let currentPreviewFile = null;
let currentPreviewInput = null;

// Document type labels for display
const docTypeLabels = {
    'businessLicense': 'Business License',
    'tinCertificate': 'TIN Certificate',
    'companyLogo': 'Company Logo',
    'additionalDocs': 'Additional Document'
};

// Show document preview modal
function showDocumentPreview(docType, input) {
    console.log('[showDocumentPreview] Called for:', docType);

    const file = input.files[0];
    if (!file) {
        console.log('[showDocumentPreview] No file selected');
        return;
    }

    // Store current state
    currentPreviewDocType = docType;
    currentPreviewFile = file;
    currentPreviewInput = input;

    // Get modal elements
    const modal = document.getElementById('documentPreviewModal');
    const previewTitle = document.getElementById('previewDocTitle');
    const previewSubtitle = document.getElementById('previewDocSubtitle');
    const imageContainer = document.getElementById('imagePreviewContainer');
    const pdfContainer = document.getElementById('pdfPreviewContainer');
    const previewImage = document.getElementById('previewImage');
    const pdfFileName = document.getElementById('pdfFileName');
    const fileNameEl = document.getElementById('previewFileName');
    const fileSizeEl = document.getElementById('previewFileSize');
    const fileTypeEl = document.getElementById('previewFileType');

    // Set title
    previewTitle.textContent = docTypeLabels[docType] || 'Document Preview';
    previewSubtitle.textContent = 'Review before uploading';

    // Set file info
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSizeForPreview(file.size);
    fileTypeEl.textContent = file.type || 'Unknown';

    // Reset containers
    imageContainer.classList.add('hidden');
    pdfContainer.classList.add('hidden');

    // Check file type and show appropriate preview
    if (file.type.startsWith('image/')) {
        // Show image preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            imageContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
        // Show PDF placeholder
        pdfFileName.textContent = file.name;
        pdfContainer.classList.remove('hidden');
    } else {
        // Generic file preview (doc, docx, etc.)
        pdfFileName.textContent = file.name;
        pdfContainer.classList.remove('hidden');
    }

    // Reset upload progress
    document.getElementById('uploadProgressSection')?.classList.add('hidden');
    document.getElementById('confirmUploadBtn')?.classList.remove('hidden');

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    console.log('[showDocumentPreview] Modal opened for:', file.name);
}

// Format file size for preview
function formatFileSizeForPreview(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Close document preview modal
function closeDocumentPreview(uploadSuccess = false) {
    const modal = document.getElementById('documentPreviewModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    // Clear the file input only if user closed without uploading (cancelled)
    if (!uploadSuccess && currentPreviewInput) {
        currentPreviewInput.value = '';
    }

    // Reset state
    currentPreviewDocType = null;
    currentPreviewFile = null;
    currentPreviewInput = null;

    console.log('[closeDocumentPreview] Modal closed, uploadSuccess:', uploadSuccess);
}

// Change document file (re-open file picker)
function changeDocumentFile() {
    console.log('[changeDocumentFile] Called');

    if (currentPreviewInput) {
        // Trigger file input click
        currentPreviewInput.click();
    }
}

// Confirm and upload document
async function confirmDocumentUpload() {
    console.log('[confirmDocumentUpload] Called');

    if (!currentPreviewFile || !currentPreviewDocType) {
        alert('No file selected for upload.');
        return;
    }

    // Show progress section, hide upload button
    const progressSection = document.getElementById('uploadProgressSection');
    const uploadBtn = document.getElementById('confirmUploadBtn');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressPercent = document.getElementById('uploadProgressPercent');

    if (progressSection) progressSection.classList.remove('hidden');
    if (uploadBtn) uploadBtn.classList.add('hidden');

    // Simulate progress (since fetch doesn't support progress for uploads easily)
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90; // Cap at 90% until actual completion
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressPercent) progressPercent.textContent = Math.round(progress) + '%';
    }, 200);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            clearInterval(progressInterval);
            alert('Please log in to upload documents.');
            closeDocumentPreview();
            return;
        }

        // Map frontend docType to backend document_type
        const docTypeMap = {
            'businessLicense': 'business_license',
            'tinCertificate': 'tin_certificate',
            'companyLogo': 'company_logo',
            'additionalDocs': 'additional_doc'
        };

        const backendDocType = docTypeMap[currentPreviewDocType] || currentPreviewDocType;

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', currentPreviewFile);
        formData.append('document_type', backendDocType);

        const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8000';

        // Upload to server
        const response = await fetch(`${apiUrl}/api/upload/company-document`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        clearInterval(progressInterval);

        if (response.ok) {
            const result = await response.json();

            // Complete the progress bar
            if (progressBar) progressBar.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';

            // Update status badge in the main form
            const statusEl = document.getElementById(`${currentPreviewDocType}Status`);
            if (statusEl) {
                statusEl.className = 'px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600';
                statusEl.textContent = 'Uploaded';
            }

            // Show the uploaded document preview
            showUploadedDocumentPreview(currentPreviewDocType, result.url);

            // Store in localStorage
            const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
            companyData[currentPreviewDocType] = true;
            companyData[`${currentPreviewDocType}Url`] = result.url;
            localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

            console.log(`[OK] ${currentPreviewDocType} uploaded successfully:`, result.url);

            // Close modal immediately after success
            closeDocumentPreview(true);  // Pass true to indicate successful upload

        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }
    } catch (error) {
        clearInterval(progressInterval);
        console.error(`Error uploading ${currentPreviewDocType}:`, error);

        // Reset progress
        if (progressSection) progressSection.classList.add('hidden');
        if (uploadBtn) uploadBtn.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';

        alert(`Failed to upload: ${error.message}`);
    }
}

// ==========================================
// MULTI-EMAIL MANAGEMENT FUNCTIONS
// ==========================================

// Add verified email to the list and reset input for new email
function addAnotherEmail() {
    console.log('[addAnotherEmail] Called');

    const emailInput = document.getElementById('modalCompanyEmail');
    const currentEmail = emailInput?.value?.trim();

    // Check if current email is verified
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');

    if (!companyData.emailVerified || companyData.verifiedEmail !== currentEmail) {
        alert('Please verify the current email first before adding another one.');
        return;
    }

    // Check if email already exists in verified list
    if (verifiedEmails.includes(currentEmail)) {
        alert('This email is already in your verified list.');
        return;
    }

    // Add to verified emails array
    verifiedEmails.push(currentEmail);

    // Update localStorage
    companyData.verifiedEmails = verifiedEmails;
    localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

    // Render the verified email in the list
    renderVerifiedEmailBadge(currentEmail);

    // Reset the input for new email entry
    resetForNewEmail();

    console.log('[addAnotherEmail] Email added to list:', currentEmail);
    console.log('[addAnotherEmail] Total verified emails:', verifiedEmails);
}

// Render a verified email badge in the list
function renderVerifiedEmailBadge(email) {
    const verifiedList = document.getElementById('verifiedEmailsList');
    if (!verifiedList) return;

    const emailBadge = document.createElement('div');
    emailBadge.className = 'flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl';
    emailBadge.id = `verified-email-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
    emailBadge.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-sm text-gray-700">${email}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>
        </div>
        <button type="button" onclick="removeVerifiedEmail('${email}')" class="text-gray-400 hover:text-red-500 transition-colors" title="Remove email">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    verifiedList.appendChild(emailBadge);
}

// Remove a verified email from the list
function removeVerifiedEmail(email) {
    console.log('[removeVerifiedEmail] Removing:', email);

    // Remove from array
    verifiedEmails = verifiedEmails.filter(e => e !== email);

    // Update localStorage
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
    companyData.verifiedEmails = verifiedEmails;
    localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

    // Remove the badge from DOM
    const badge = document.getElementById(`verified-email-${email.replace(/[^a-zA-Z0-9]/g, '-')}`);
    if (badge) {
        badge.remove();
    }

    console.log('[removeVerifiedEmail] Remaining emails:', verifiedEmails);
}

// Reset input for entering a new email
function resetForNewEmail() {
    const emailInput = document.getElementById('modalCompanyEmail');
    if (emailInput) {
        emailInput.value = '';
        emailInput.readOnly = false;
        emailInput.classList.remove('bg-gray-100');
    }

    // Show send button
    const sendBtn = document.getElementById('sendEmailOtpBtn');
    if (sendBtn) {
        sendBtn.classList.remove('hidden');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send OTP';
    }

    // Hide OTP section
    document.getElementById('emailOtpSection')?.classList.add('hidden');

    // Hide verified badge
    document.getElementById('emailVerifiedBadge')?.classList.add('hidden');

    // Clear OTP input
    const otpInput = document.getElementById('modalEmailOtp');
    if (otpInput) {
        otpInput.value = '';
    }

    // Reset verification state in localStorage
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
    companyData.emailVerified = false;
    companyData.verifiedEmail = null;
    localStorage.setItem('companyVerificationData', JSON.stringify(companyData));

    // Reset tracked verified email
    verifiedEmailAddress = null;
}

// Load existing verified emails from localStorage on modal open
function loadVerifiedEmails() {
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
    verifiedEmails = companyData.verifiedEmails || [];

    // Clear existing list in DOM
    const verifiedList = document.getElementById('verifiedEmailsList');
    if (verifiedList) {
        verifiedList.innerHTML = '';
    }

    // Render all verified emails
    verifiedEmails.forEach(email => {
        renderVerifiedEmailBadge(email);
    });

    console.log('[loadVerifiedEmails] Loaded emails:', verifiedEmails);
}

// Get all emails (verified list + current input if verified)
function getAllVerifiedEmails() {
    const companyData = JSON.parse(localStorage.getItem('companyVerificationData') || '{}');
    const allEmails = [...verifiedEmails];

    // Add current email if it's verified and not in the list
    if (companyData.emailVerified && companyData.verifiedEmail) {
        if (!allEmails.includes(companyData.verifiedEmail)) {
            allEmails.push(companyData.verifiedEmail);
        }
    }

    return allEmails;
}

// Export functions globally
window.switchCompanyVerifyTab = switchCompanyVerifyTab;
window.loadCompanyInfoData = loadCompanyInfoData;
window.updateVerificationStatus = updateVerificationStatus;
window.handleCompanyDocUpload = handleCompanyDocUpload;
window.handleLocationToggle = handleLocationToggle;
window.saveCompanyInfo = saveCompanyInfo;
window.submitCompanyForVerification = submitCompanyForVerification;
window.initCompanyVerificationModal = initCompanyVerificationModal;
window.sendCompanyEmailOtp = sendCompanyEmailOtp;
window.verifyCompanyEmailOtp = verifyCompanyEmailOtp;
window.showEmailVerified = showEmailVerified;
window.resetEmailVerificationUI = resetEmailVerificationUI;
window.setupEmailChangeListener = setupEmailChangeListener;
window.addAnotherEmail = addAnotherEmail;
window.renderVerifiedEmailBadge = renderVerifiedEmailBadge;
window.removeVerifiedEmail = removeVerifiedEmail;
window.resetForNewEmail = resetForNewEmail;
window.loadVerifiedEmails = loadVerifiedEmails;
window.getAllVerifiedEmails = getAllVerifiedEmails;
window.showDocumentPreview = showDocumentPreview;
window.closeDocumentPreview = closeDocumentPreview;
window.changeDocumentFile = changeDocumentFile;
window.confirmDocumentUpload = confirmDocumentUpload;
window.showUploadedDocumentPreview = showUploadedDocumentPreview;

console.log('[OK] Verify Company Info Modal JS loaded');
