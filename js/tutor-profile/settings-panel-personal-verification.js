
//    <!-- Settings Panel & Verify Personal Info Modal JavaScript -->
//    Reads from users table - no tutor-specific fields

        /**
         * Open Verify Personal Info Modal
         */
        async function openVerifyPersonalInfoModal() {
            console.log('🔵 Opening Verify Personal Info Modal...');

            // Ensure modal is loaded first (via ModalLoader if available)
            let modal = document.getElementById('verify-personal-info-modal');

            if (!modal) {
                console.log('🔵 Modal not in DOM, attempting to load via ModalLoader...');

                // Try to load via ModalLoader if available
                if (typeof ModalLoader !== 'undefined' && ModalLoader.load) {
                    try {
                        await ModalLoader.load('verify-personal-info-modal');
                        modal = document.getElementById('verify-personal-info-modal');
                    } catch (loadError) {
                        console.error('❌ Failed to load modal via ModalLoader:', loadError);
                    }
                }

                // If still not found, try direct fetch
                if (!modal) {
                    try {
                        const response = await fetch('../modals/common-modals/verify-personal-info-modal.html');
                        if (response.ok) {
                            const html = await response.text();
                            let container = document.getElementById('modal-container');
                            if (!container) {
                                container = document.createElement('div');
                                container.id = 'modal-container';
                                document.body.appendChild(container);
                            }
                            container.insertAdjacentHTML('beforeend', html);
                            modal = document.getElementById('verify-personal-info-modal');
                            console.log('✅ Modal loaded via direct fetch');
                        }
                    } catch (fetchError) {
                        console.error('❌ Failed to fetch modal:', fetchError);
                    }
                }
            }

            if (!modal) {
                console.error('❌ Modal element not found!');
                alert('Error: Modal not found. Please refresh the page.');
                return;
            }

            console.log('✅ Modal element found');

            try {
                // Show modal first - use both .active class and direct style for compatibility
                modal.classList.remove('hidden');
                modal.classList.add('active');
                modal.style.display = 'flex';
                console.log('✅ Modal opened successfully');

                // Wait a brief moment for DOM to be ready, then load data
                await new Promise(resolve => setTimeout(resolve, 50));

                // Load current user data into modal fields
                console.log('🔵 Loading modal data...');
                await loadModalData();
                console.log('✅ Modal data loaded');

                // Reset to personal info tab
                switchVerifyTab('personal');
            } catch (error) {
                console.error('❌ Error opening modal:', error);
                alert('Error opening modal: ' + error.message);
            }
        }

        /**
         * Close Verify Personal Info Modal
         */
        function closeVerifyPersonalInfoModal() {
            const modal = document.getElementById('verify-personal-info-modal');
            if (!modal) return;

            modal.classList.add('hidden');
            modal.classList.remove('active');
            modal.style.display = 'none';

            // Clear password fields
            const currentPassword = document.getElementById('currentPassword');
            const newPassword = document.getElementById('newPassword');
            const confirmNewPassword = document.getElementById('confirmNewPassword');
            if (currentPassword) currentPassword.value = '';
            if (newPassword) newPassword.value = '';
            if (confirmNewPassword) confirmNewPassword.value = '';

            // Reset password indicators
            const passwordStrength = document.getElementById('passwordStrength');
            const passwordMatch = document.getElementById('passwordMatch');
            if (passwordStrength) passwordStrength.innerHTML = '';
            if (passwordMatch) passwordMatch.innerHTML = '';
        }

        /**
         * Switch between tabs in the modal
         */
        function switchVerifyTab(tab) {
            const personalInfoTab = document.getElementById('personalInfoTab');
            const identityVerifyTab = document.getElementById('identityVerifyTab');
            const changePasswordTab = document.getElementById('changePasswordTab');
            const personalInfoContent = document.getElementById('personalInfoContent');
            const identityVerifyContent = document.getElementById('identityVerifyContent');
            const changePasswordContent = document.getElementById('changePasswordContent');

            // Footer buttons
            const savePersonalInfoBtn = document.getElementById('savePersonalInfoBtn');
            const changePasswordBtn = document.getElementById('changePasswordBtn');
            const startVerificationBtn = document.getElementById('startVerificationBtn');
            const continueVerificationBtn = document.getElementById('continueVerificationBtn');
            const retryVerificationBtn = document.getElementById('retryVerificationBtn');

            // Reset all tabs
            const allTabs = [personalInfoTab, identityVerifyTab, changePasswordTab];
            const allContents = [personalInfoContent, identityVerifyContent, changePasswordContent];

            allTabs.forEach(t => {
                if (t) {
                    t.classList.remove('active');
                    t.style.fontWeight = '500';
                    t.style.color = 'var(--text-secondary, #6b7280)';
                    t.style.borderBottom = '2px solid transparent';
                }
            });

            allContents.forEach(c => {
                if (c) c.style.display = 'none';
            });

            // Hide all footer buttons by default
            if (savePersonalInfoBtn) savePersonalInfoBtn.style.display = 'none';
            if (changePasswordBtn) changePasswordBtn.style.display = 'none';
            if (startVerificationBtn) startVerificationBtn.style.display = 'none';
            if (continueVerificationBtn) continueVerificationBtn.style.display = 'none';
            if (retryVerificationBtn) retryVerificationBtn.style.display = 'none';

            if (tab === 'personal') {
                // Activate personal info tab
                if (personalInfoTab) {
                    personalInfoTab.classList.add('active');
                    personalInfoTab.style.fontWeight = '600';
                    personalInfoTab.style.color = 'var(--primary-color, #3b82f6)';
                    personalInfoTab.style.borderBottom = '2px solid var(--primary-color, #3b82f6)';
                }
                if (personalInfoContent) personalInfoContent.style.display = 'block';
                if (savePersonalInfoBtn) savePersonalInfoBtn.style.display = 'inline-flex';

            } else if (tab === 'identity') {
                // Activate identity verification tab
                if (identityVerifyTab) {
                    identityVerifyTab.classList.add('active');
                    identityVerifyTab.style.fontWeight = '600';
                    identityVerifyTab.style.color = 'var(--primary-color, #3b82f6)';
                    identityVerifyTab.style.borderBottom = '2px solid var(--primary-color, #3b82f6)';
                }
                if (identityVerifyContent) identityVerifyContent.style.display = 'block';

                // Load KYC status (this will also show the appropriate footer button)
                loadKYCStatus();

            } else if (tab === 'password') {
                // Activate change password tab
                if (changePasswordTab) {
                    changePasswordTab.classList.add('active');
                    changePasswordTab.style.fontWeight = '600';
                    changePasswordTab.style.color = 'var(--primary-color, #3b82f6)';
                    changePasswordTab.style.borderBottom = '2px solid var(--primary-color, #3b82f6)';
                }
                if (changePasswordContent) changePasswordContent.style.display = 'block';
                if (changePasswordBtn) changePasswordBtn.style.display = 'inline-flex';

                // Add password validation listeners
                setupPasswordValidation();
            }
        }

        /**
         * Load KYC verification status
         */
        async function loadKYCStatus() {
            console.log('[KYC] Loading KYC status...');

            // Get footer buttons
            const startVerificationBtn = document.getElementById('startVerificationBtn');
            const continueVerificationBtn = document.getElementById('continueVerificationBtn');
            const retryVerificationBtn = document.getElementById('retryVerificationBtn');

            console.log('[KYC] Footer buttons found:', {
                start: !!startVerificationBtn,
                continue: !!continueVerificationBtn,
                retry: !!retryVerificationBtn
            });

            // Hide all KYC footer buttons first
            if (startVerificationBtn) startVerificationBtn.style.display = 'none';
            if (continueVerificationBtn) continueVerificationBtn.style.display = 'none';
            if (retryVerificationBtn) retryVerificationBtn.style.display = 'none';

            // Helper function to show verified status from localStorage
            const showVerifiedFromLocalStorage = () => {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const loadingStatus = document.getElementById('kycLoadingStatus');
                const verifiedStatus = document.getElementById('kycVerifiedStatus');

                if (loadingStatus) loadingStatus.style.display = 'none';
                if (verifiedStatus) {
                    verifiedStatus.style.display = 'block';

                    // Show Document Image if available in localStorage
                    const docImageContainer = document.getElementById('kycDocumentImageContainer');
                    const docImageEl = document.getElementById('kycVerifiedDocumentImage');
                    const savedDocImage = localStorage.getItem('kyc_document_image_url');
                    if (savedDocImage && docImageContainer && docImageEl) {
                        docImageEl.src = savedDocImage;
                        docImageContainer.style.display = 'block';
                    }

                    // Show Digital ID
                    const digitalIdEl = document.getElementById('kycVerifiedDigitalId');
                    if (digitalIdEl) {
                        digitalIdEl.textContent = user.digital_id_no || 'Not available';
                    }

                    // Show verification date
                    const dateEl = document.getElementById('kycVerifiedDate');
                    if (dateEl) {
                        const verifiedAt = user.kyc_verified_at;
                        dateEl.textContent = verifiedAt
                            ? new Date(verifiedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })
                            : 'Recently';
                    }
                }
                console.log('[KYC] Showing verified status from localStorage');
            };

            // Check localStorage first for kyc_verified status
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isVerifiedInLocalStorage = user.kyc_verified === true;
            console.log('[KYC] localStorage kyc_verified:', isVerifiedInLocalStorage);

            try {
                // Check both token keys (app uses both 'token' and 'access_token')
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                if (!token) {
                    console.log('[KYC] No token found');
                    const loadingStatus = document.getElementById('kycLoadingStatus');
                    const notVerifiedStatus = document.getElementById('kycNotVerifiedStatus');
                    if (loadingStatus) loadingStatus.style.display = 'none';

                    // If verified in localStorage, show verified status
                    if (isVerifiedInLocalStorage) {
                        showVerifiedFromLocalStorage();
                    } else {
                        if (notVerifiedStatus) notVerifiedStatus.style.display = 'block';
                        if (startVerificationBtn) startVerificationBtn.style.display = 'inline-flex';
                    }
                    return;
                }

                const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/check`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    console.log('[KYC] Status check failed, checking localStorage');
                    const loadingStatus = document.getElementById('kycLoadingStatus');
                    const notVerifiedStatus = document.getElementById('kycNotVerifiedStatus');
                    if (loadingStatus) loadingStatus.style.display = 'none';

                    // If verified in localStorage, show verified status instead of start button
                    if (isVerifiedInLocalStorage) {
                        showVerifiedFromLocalStorage();
                    } else {
                        if (notVerifiedStatus) notVerifiedStatus.style.display = 'block';
                        if (startVerificationBtn) startVerificationBtn.style.display = 'inline-flex';
                    }
                    return;
                }

                const data = await response.json();
                console.log('[KYC] API Response:', JSON.stringify(data, null, 2));

                // Update UI based on status
                const loadingStatus = document.getElementById('kycLoadingStatus');
                const verifiedStatus = document.getElementById('kycVerifiedStatus');
                const notVerifiedStatus = document.getElementById('kycNotVerifiedStatus');
                const inProgressStatus = document.getElementById('kycInProgressStatus');
                const failedStatus = document.getElementById('kycFailedStatus');

                console.log('[KYC] Status elements found:', {
                    loading: !!loadingStatus,
                    verified: !!verifiedStatus,
                    notVerified: !!notVerifiedStatus,
                    inProgress: !!inProgressStatus,
                    failed: !!failedStatus
                });

                // Hide loading and all statuses first
                [loadingStatus, verifiedStatus, notVerifiedStatus, inProgressStatus, failedStatus].forEach(el => {
                    if (el) el.style.display = 'none';
                });

                if (data.kyc_verified) {
                    console.log('[KYC] User is VERIFIED - showing verified status, no button needed');
                    // Show verified status - NO footer button needed (already verified)
                    if (verifiedStatus) {
                        verifiedStatus.style.display = 'block';

                        // Get user data for Digital ID and verification date
                        const user = JSON.parse(localStorage.getItem('user') || '{}');

                        // Show Document Image if available
                        const docImageContainer = document.getElementById('kycDocumentImageContainer');
                        const docImageEl = document.getElementById('kycVerifiedDocumentImage');
                        if (data.document_image_url && docImageContainer && docImageEl) {
                            // Prepend API_BASE_URL for images served by backend
                            const imageUrl = data.document_image_url.startsWith('http')
                                ? data.document_image_url
                                : `${API_BASE_URL}${data.document_image_url}`;
                            docImageEl.src = imageUrl;
                            docImageContainer.style.display = 'block';
                            // Save to localStorage for future use (when API might fail)
                            localStorage.setItem('kyc_document_image_url', imageUrl);
                            console.log('[KYC] Document image loaded:', imageUrl);
                        }

                        // Show Digital ID
                        const digitalIdEl = document.getElementById('kycVerifiedDigitalId');
                        if (digitalIdEl) {
                            digitalIdEl.textContent = user.digital_id_no || data.digital_id_no || 'Not available';
                        }

                        // Show verification date
                        const dateEl = document.getElementById('kycVerifiedDate');
                        if (dateEl) {
                            const verifiedAt = user.kyc_verified_at || data.verified_at;
                            dateEl.textContent = verifiedAt
                                ? new Date(verifiedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })
                                : 'Recently';
                        }
                    }
                    // No footer button for verified status
                } else if (data.status === 'pending' || data.status === 'in_progress') {
                    console.log('[KYC] Verification IN PROGRESS - showing continue button');
                    // Show in progress status
                    if (inProgressStatus) inProgressStatus.style.display = 'block';
                    // Show "Continue Verification" button
                    if (continueVerificationBtn) continueVerificationBtn.style.display = 'inline-flex';
                } else if (data.status === 'failed') {
                    console.log('[KYC] Verification FAILED - can_retry:', data.can_retry, 'time_until_reset:', data.time_until_reset);
                    // Show failed status
                    if (failedStatus) {
                        failedStatus.style.display = 'block';
                        const reasonEl = document.getElementById('kycFailureReason');
                        const attemptsEl = document.getElementById('kycAttemptsInfo');
                        const retryBtn = document.getElementById('btnRetryKYC');

                        if (reasonEl) reasonEl.textContent = data.rejection_reason || 'Verification failed';
                        if (attemptsEl) {
                            if (data.can_retry) {
                                attemptsEl.textContent = `Attempts remaining: ${data.attempts_remaining}`;
                            } else if (data.time_until_reset) {
                                attemptsEl.textContent = `Maximum attempts exceeded. Try again in ${data.time_until_reset}`;
                            } else {
                                attemptsEl.textContent = 'Maximum attempts exceeded. Please contact support.';
                            }
                        }
                        if (retryBtn) retryBtn.style.display = data.can_retry ? 'inline-flex' : 'none';
                    }
                    // Show "Try Again" button in footer if can retry
                    if (data.can_retry && retryVerificationBtn) {
                        retryVerificationBtn.style.display = 'inline-flex';
                    }
                } else {
                    console.log('[KYC] User NOT verified - showing start verification button');
                    // Show not verified status
                    if (notVerifiedStatus) notVerifiedStatus.style.display = 'block';
                    // Show "Start Verification" button
                    if (startVerificationBtn) startVerificationBtn.style.display = 'inline-flex';
                }

            } catch (error) {
                console.error('[KYC] Error loading status:', error);
                const loadingStatus = document.getElementById('kycLoadingStatus');
                const notVerifiedStatus = document.getElementById('kycNotVerifiedStatus');
                const startVerificationBtn = document.getElementById('startVerificationBtn');
                if (loadingStatus) loadingStatus.style.display = 'none';

                // If verified in localStorage, show verified status instead of start button
                if (isVerifiedInLocalStorage) {
                    showVerifiedFromLocalStorage();
                } else {
                    if (notVerifiedStatus) notVerifiedStatus.style.display = 'block';
                    if (startVerificationBtn) startVerificationBtn.style.display = 'inline-flex';
                }
            }
        }

        /**
         * Start KYC verification process
         */
        function startKYCVerification() {
            // Close this modal first
            closeVerifyPersonalInfoModal();

            // Load KYC manager script if not already loaded
            if (typeof kycManager === 'undefined') {
                const script = document.createElement('script');
                script.src = '../js/common-modals/kyc-verification-manager.js';
                script.onload = () => {
                    console.log('[KYC] Manager loaded, opening modal');
                    if (typeof openKYCModal === 'function') {
                        openKYCModal();
                    }
                };
                document.body.appendChild(script);
            } else {
                // Manager already loaded
                if (typeof openKYCModal === 'function') {
                    openKYCModal();
                }
            }
        }

        /**
         * Continue in-progress KYC verification
         */
        function continueKYCVerification() {
            startKYCVerification();
        }

        /**
         * Retry failed KYC verification
         */
        function retryKYCVerification() {
            startKYCVerification();
        }

        /**
         * Toggle password visibility
         */
        function togglePasswordVisibility(inputId) {
            const input = document.getElementById(inputId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        }

        /**
         * Setup password validation
         */
        function setupPasswordValidation() {
            const newPassword = document.getElementById('newPassword');
            const confirmNewPassword = document.getElementById('confirmNewPassword');

            if (newPassword) {
                newPassword.removeEventListener('input', validatePasswordStrength);
                newPassword.addEventListener('input', validatePasswordStrength);
            }

            if (confirmNewPassword) {
                confirmNewPassword.removeEventListener('input', validatePasswordMatch);
                confirmNewPassword.addEventListener('input', validatePasswordMatch);
            }
        }

        /**
         * Validate password strength
         */
        function validatePasswordStrength() {
            const password = document.getElementById('newPassword').value;
            const strengthDiv = document.getElementById('passwordStrength');
            const reqLength = document.getElementById('reqLength');
            const reqUppercase = document.getElementById('reqUppercase');
            const reqLowercase = document.getElementById('reqLowercase');
            const reqNumber = document.getElementById('reqNumber');

            // Check requirements
            const hasLength = password.length >= 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumber = /[0-9]/.test(password);

            // Update requirement indicators
            if (reqLength) reqLength.style.color = hasLength ? '#10b981' : '#6b7280';
            if (reqUppercase) reqUppercase.style.color = hasUppercase ? '#10b981' : '#6b7280';
            if (reqLowercase) reqLowercase.style.color = hasLowercase ? '#10b981' : '#6b7280';
            if (reqNumber) reqNumber.style.color = hasNumber ? '#10b981' : '#6b7280';

            // Calculate strength
            let strength = 0;
            if (hasLength) strength++;
            if (hasUppercase) strength++;
            if (hasLowercase) strength++;
            if (hasNumber) strength++;

            // Display strength indicator
            if (strengthDiv) {
                if (password.length === 0) {
                    strengthDiv.innerHTML = '';
                } else if (strength <= 1) {
                    strengthDiv.innerHTML = '<span style="color: #ef4444;">Weak password</span>';
                } else if (strength <= 2) {
                    strengthDiv.innerHTML = '<span style="color: #f59e0b;">Fair password</span>';
                } else if (strength <= 3) {
                    strengthDiv.innerHTML = '<span style="color: #3b82f6;">Good password</span>';
                } else {
                    strengthDiv.innerHTML = '<span style="color: #10b981;">Strong password</span>';
                }
            }

            // Also check match if confirm field has value
            validatePasswordMatch();
        }

        /**
         * Validate password match
         */
        function validatePasswordMatch() {
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;
            const matchDiv = document.getElementById('passwordMatch');

            if (!matchDiv) return;

            if (confirmPassword.length === 0) {
                matchDiv.innerHTML = '';
            } else if (newPassword === confirmPassword) {
                matchDiv.innerHTML = '<span style="color: #10b981;">✓ Passwords match</span>';
            } else {
                matchDiv.innerHTML = '<span style="color: #ef4444;">✗ Passwords do not match</span>';
            }
        }

        /**
         * Change user password
         */
        async function changeUserPassword() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            // Validate inputs
            if (!currentPassword || !newPassword || !confirmNewPassword) {
                alert('⚠️ Please fill in all password fields');
                return;
            }

            // Check password requirements
            const hasLength = newPassword.length >= 8;
            const hasUppercase = /[A-Z]/.test(newPassword);
            const hasLowercase = /[a-z]/.test(newPassword);
            const hasNumber = /[0-9]/.test(newPassword);

            if (!hasLength || !hasUppercase || !hasLowercase || !hasNumber) {
                alert('⚠️ New password does not meet all requirements');
                return;
            }

            // Check passwords match
            if (newPassword !== confirmNewPassword) {
                alert('⚠️ New passwords do not match');
                return;
            }

            // Check not same as current
            if (currentPassword === newPassword) {
                alert('⚠️ New password must be different from current password');
                return;
            }

            try {
                // Check both token keys (app uses both 'token' and 'access_token')
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');

                if (!token) {
                    alert('⚠️ Session expired. Please log in again.');
                    return;
                }

                const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'Failed to change password');
                }

                alert('✅ Password changed successfully!');
                closeVerifyPersonalInfoModal();
            } catch (error) {
                console.error('❌ Error changing password:', error);
                alert('❌ ' + error.message);
            }
        }

        /**
         * Add a new email field in modal
         */
        function addModalEmail() {
            const container = document.getElementById('modalEmailContainer');
            if (!container) return;

            const index = container.children.length;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center input-group';
            div.innerHTML = `
                <input type="email"
                    class="form-input flex-1"
                    placeholder="your.email@example.com"
                    name="email[]">
                <button type="button"
                    class="btn-remove"
                    onclick="this.parentElement.remove()">
                    ×
                </button>
            `;
            container.appendChild(div);
        }

        /**
         * Add a new phone field in modal
         */
        function addModalPhone() {
            const container = document.getElementById('modalPhoneContainer');
            if (!container) return;

            const index = container.children.length;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center input-group';
            div.innerHTML = `
                <input type="tel"
                    class="form-input flex-1"
                    placeholder="+251 912 345 678"
                    name="phone[]">
                <button type="button"
                    class="btn-remove"
                    onclick="this.parentElement.remove()">
                    ×
                </button>
            `;
            container.appendChild(div);
        }

        /**
         * Load emails list in modal
         */
        function loadModalEmails(emailsArray) {
            const container = document.getElementById('modalEmailContainer');
            if (!container) return;

            container.innerHTML = '';

            if (emailsArray && emailsArray.length > 0) {
                emailsArray.forEach((email) => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2 items-center input-group';
                    div.innerHTML = `
                        <input type="email"
                            class="form-input flex-1"
                            placeholder="your.email@example.com"
                            name="email[]"
                            value="${email}">
                        <button type="button"
                            class="btn-remove"
                            onclick="this.parentElement.remove()">
                            ×
                        </button>
                    `;
                    container.appendChild(div);
                });
            } else {
                // Add one empty field by default
                addModalEmail();
            }
        }

        /**
         * Load phones list in modal
         */
        function loadModalPhones(phonesArray) {
            const container = document.getElementById('modalPhoneContainer');
            if (!container) return;

            container.innerHTML = '';

            if (phonesArray && phonesArray.length > 0) {
                phonesArray.forEach((phone) => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2 items-center input-group';
                    div.innerHTML = `
                        <input type="tel"
                            class="form-input flex-1"
                            placeholder="+251 912 345 678"
                            name="phone[]"
                            value="${phone}">
                        <button type="button"
                            class="btn-remove"
                            onclick="this.parentElement.remove()">
                            ×
                        </button>
                    `;
                    container.appendChild(div);
                });
            } else {
                // Add one empty field by default
                addModalPhone();
            }
        }

        /**
         * Load modal data when modal is opened
         * Reads from users table via localStorage or API
         */
        async function loadModalData() {
            try {
                console.log('🔵 Starting loadModalData...');

                // Try to get fresh user data from API first
                let user = null;
                // Check both token keys (app uses both 'token' and 'access_token')
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');

                if (token) {
                    try {
                        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/me`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        if (response.ok) {
                            user = await response.json();
                            console.log('📦 User data from API:', user);
                            // Update localStorage with fresh data
                            localStorage.setItem('user', JSON.stringify(user));
                        }
                    } catch (apiError) {
                        console.warn('⚠️ Could not fetch from API, using localStorage:', apiError);
                    }
                }

                // Fallback to localStorage
                if (!user) {
                    user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
                    console.log('📦 User data from localStorage:', user);
                }

                // Load personal information (names)
                const modalFirstName = document.getElementById('modalFirstName');
                const modalFatherName = document.getElementById('modalFatherName');
                const modalGrandfatherName = document.getElementById('modalGrandfatherName');

                console.log('🔍 Found elements:', {
                    firstName: !!modalFirstName,
                    fatherName: !!modalFatherName,
                    grandfatherName: !!modalGrandfatherName
                });

                if (modalFirstName) {
                    modalFirstName.value = user.first_name || '';
                    console.log('✅ Loaded first name:', user.first_name);
                } else {
                    console.error('❌ modalFirstName element not found');
                }

                if (modalFatherName) {
                    modalFatherName.value = user.father_name || '';
                    console.log('✅ Loaded father name:', user.father_name);
                } else {
                    console.error('❌ modalFatherName element not found');
                }

                if (modalGrandfatherName) {
                    modalGrandfatherName.value = user.grandfather_name || '';
                    console.log('✅ Loaded grandfather name:', user.grandfather_name);
                } else {
                    console.error('❌ modalGrandfatherName element not found');
                }

                // Load email and phone arrays
                const emails = user.emails && Array.isArray(user.emails) ? user.emails : (user.email ? [user.email] : []);
                const phones = user.phones && Array.isArray(user.phones) ? user.phones : (user.phone ? [user.phone] : []);

                console.log('📧 Loading emails:', emails);
                console.log('📞 Loading phones:', phones);
                loadModalEmails(emails);
                loadModalPhones(phones);
                console.log('✅ Loaded emails and phones');

                // Load date of birth
                const modalDateOfBirth = document.getElementById('modalDateOfBirth');
                if (modalDateOfBirth) {
                    // Set max date to today (users can't select future dates)
                    const today = new Date().toISOString().split('T')[0];
                    modalDateOfBirth.max = today;

                    // Load existing DOB if available
                    if (user.date_of_birth) {
                        // Handle both ISO date string and date object
                        const dobValue = typeof user.date_of_birth === 'string'
                            ? user.date_of_birth.split('T')[0]
                            : user.date_of_birth;
                        modalDateOfBirth.value = dobValue;
                        console.log('✅ Loaded date of birth:', dobValue);
                    }
                }

                // Load gender
                const modalGender = document.getElementById('modalGender');
                if (modalGender) {
                    modalGender.value = user.gender || '';
                    console.log('✅ Loaded gender:', user.gender);
                }

                // Load digital ID number
                const modalDigitalIdNo = document.getElementById('modalDigitalIdNo');
                if (modalDigitalIdNo) {
                    modalDigitalIdNo.value = user.digital_id_no || '';
                    console.log('✅ Loaded digital ID:', user.digital_id_no);
                }

                console.log('✅ loadModalData completed successfully');
            } catch (error) {
                console.error('❌ Error in loadModalData:', error);
                throw error;
            }
        }

        /**
         * Save all personal information from modal (Names, Contact)
         * Updates users table
         */
        async function saveAllPersonalInfo() {
            // Get all modal fields
            const modalFirstName = document.getElementById('modalFirstName');
            const modalFatherName = document.getElementById('modalFatherName');
            const modalGrandfatherName = document.getElementById('modalGrandfatherName');
            const modalEmailContainer = document.getElementById('modalEmailContainer');
            const modalPhoneContainer = document.getElementById('modalPhoneContainer');

            if (!modalFirstName || !modalFatherName || !modalGrandfatherName) {
                alert('⚠️ Name fields not found');
                return;
            }

            const firstName = modalFirstName.value.trim();
            const fatherName = modalFatherName.value.trim();
            const grandfatherName = modalGrandfatherName.value.trim();
            const gender = document.getElementById('modalGender') ? document.getElementById('modalGender').value : '';
            const dateOfBirth = document.getElementById('modalDateOfBirth') ? document.getElementById('modalDateOfBirth').value : '';
            const digitalIdNo = document.getElementById('modalDigitalIdNo') ? document.getElementById('modalDigitalIdNo').value.trim() : '';

            // Collect email values
            const emailInputs = modalEmailContainer ? modalEmailContainer.querySelectorAll('input[name="email[]"]') : [];
            const emailsArray = Array.from(emailInputs)
                .map(input => input.value.trim())
                .filter(value => value !== '');

            // Collect phone values
            const phoneInputs = modalPhoneContainer ? modalPhoneContainer.querySelectorAll('input[name="phone[]"]') : [];
            const phonesArray = Array.from(phoneInputs)
                .map(input => input.value.trim())
                .filter(value => value !== '');

            // Validate required fields
            if (!firstName || !fatherName || !grandfatherName) {
                alert('Please fill in all name fields');
                return;
            }

            // Validate DOB and gender are required for profile completion
            if (!dateOfBirth) {
                alert('Date of Birth is required');
                document.getElementById('modalDateOfBirth')?.focus();
                return;
            }

            if (!gender) {
                alert('Gender is required');
                document.getElementById('modalGender')?.focus();
                return;
            }

            // Digital ID is optional for now
            // if (!digitalIdNo) {
            //     alert('Digital ID Number is required');
            //     document.getElementById('modalDigitalIdNo')?.focus();
            //     return;
            // }

            const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

            // Check what has changed
            const nameChanged = firstName !== user.first_name || fatherName !== user.father_name || grandfatherName !== user.grandfather_name;
            const currentEmails = user.emails && Array.isArray(user.emails) ? user.emails : (user.email ? [user.email] : []);
            const currentPhones = user.phones && Array.isArray(user.phones) ? user.phones : (user.phone ? [user.phone] : []);
            const emailsChanged = JSON.stringify(emailsArray.sort()) !== JSON.stringify(currentEmails.sort());
            const phonesChanged = JSON.stringify(phonesArray.sort()) !== JSON.stringify(currentPhones.sort());
            const genderChanged = gender !== user.gender;
            const dobChanged = dateOfBirth !== (user.date_of_birth ? user.date_of_birth.split('T')[0] : '');
            const digitalIdChanged = digitalIdNo !== (user.digital_id_no || '');

            if (!nameChanged && !emailsChanged && !phonesChanged && !genderChanged && !dobChanged && !digitalIdChanged) {
                alert('No changes detected');
                return;
            }

            // Build confirmation message
            let confirmMessage = 'You are about to update:\n\n';
            if (nameChanged) confirmMessage += `Names: ${firstName} ${fatherName} ${grandfatherName}\n`;
            if (dobChanged) confirmMessage += `Date of Birth: ${dateOfBirth}\n`;
            if (genderChanged) confirmMessage += `Gender: ${gender}\n`;
            if (digitalIdChanged) confirmMessage += `Digital ID: ${digitalIdNo}\n`;
            if (emailsChanged) confirmMessage += `Emails: ${emailsArray.length} email(s)\n`;
            if (phonesChanged) confirmMessage += `Phones: ${phonesArray.length} phone(s)\n`;
            confirmMessage += '\nAre you sure you want to proceed?';

            const confirmed = confirm(confirmMessage);
            if (!confirmed) return;

            console.log('Saving all personal info:', { firstName, fatherName, grandfatherName, emailsArray, phonesArray, gender });

            try {
                // Check both token keys (app uses both 'token' and 'access_token')
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');

                if (!token) {
                    alert('⚠️ Session expired. Please log in again.');
                    return;
                }

                // Prepare update data for users table
                const updateData = {};
                if (nameChanged) {
                    updateData.first_name = firstName;
                    updateData.father_name = fatherName;
                    updateData.grandfather_name = grandfatherName;
                }
                if (dobChanged) {
                    updateData.date_of_birth = dateOfBirth;
                }
                if (genderChanged) {
                    updateData.gender = gender;
                }
                if (digitalIdChanged) {
                    updateData.digital_id_no = digitalIdNo;
                }

                // Save names and gender (immediate update to users table)
                if (Object.keys(updateData).length > 0) {
                    const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/user/profile`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(updateData)
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update information');
                    }

                    const data = await response.json();
                    console.log('✅ Info updated:', data);

                    // Update local storage
                    if (nameChanged) {
                        user.first_name = firstName;
                        user.father_name = fatherName;
                        user.grandfather_name = grandfatherName;

                        // Update profile header display
                        const fullName = `${firstName} ${fatherName} ${grandfatherName}`;
                        const profileNameElements = document.querySelectorAll('.profile-name');
                        profileNameElements.forEach(el => {
                            el.textContent = fullName;
                        });
                    }
                    if (dobChanged) {
                        user.date_of_birth = dateOfBirth;
                    }
                    if (genderChanged) {
                        user.gender = gender;
                    }
                    if (digitalIdChanged) {
                        user.digital_id_no = digitalIdNo;
                    }
                    // Update profile_complete status (requires DOB, gender, and digital ID)
                    user.profile_complete = !!(user.date_of_birth && user.gender && user.digital_id_no);
                    localStorage.setItem('user', JSON.stringify(user));
                }

                // Handle email/phone changes (requires OTP)
                if (emailsChanged || phonesChanged) {
                    // Store pending values as arrays
                    if (emailsChanged) {
                        localStorage.setItem('pendingEmails', JSON.stringify(emailsArray));
                        user.emails = emailsArray;
                    }
                    if (phonesChanged) {
                        localStorage.setItem('pendingPhones', JSON.stringify(phonesArray));
                        user.phones = phonesArray;
                    }
                    localStorage.setItem('user', JSON.stringify(user));

                    // Close this modal
                    closeVerifyPersonalInfoModal();

                    // Open OTP confirmation modal
                    const confirmEmailSpan = document.getElementById('confirm-new-email');
                    const confirmPhoneSpan = document.getElementById('confirm-new-phone');
                    if (confirmEmailSpan) confirmEmailSpan.textContent = emailsArray.join(', ') || 'Not provided';
                    if (confirmPhoneSpan) confirmPhoneSpan.textContent = phonesArray.join(', ') || 'Not provided';

                    const contactConfirmationModal = document.getElementById('contact-confirmation-modal');
                    if (contactConfirmationModal) {
                        contactConfirmationModal.classList.remove('hidden');
                    }
                } else {
                    // All done, close modal
                    closeVerifyPersonalInfoModal();
                    alert('✅ All information updated successfully!');
                }
            } catch (error) {
                console.error('❌ Error updating information:', error);
                alert('❌ Failed to update information. Please try again.');
            }
        }

        // Make functions globally available
        window.openVerifyPersonalInfoModal = openVerifyPersonalInfoModal;
        window.closeVerifyPersonalInfoModal = closeVerifyPersonalInfoModal;
        window.switchVerifyTab = switchVerifyTab;
        window.togglePasswordVisibility = togglePasswordVisibility;
        window.changeUserPassword = changeUserPassword;
        window.addModalEmail = addModalEmail;
        window.addModalPhone = addModalPhone;
        window.saveAllPersonalInfo = saveAllPersonalInfo;
        window.loadKYCStatus = loadKYCStatus;
        window.startKYCVerification = startKYCVerification;
        window.continueKYCVerification = continueKYCVerification;
        window.retryKYCVerification = retryKYCVerification;

        console.log('[OK] Verify Personal Info Modal: JavaScript loaded');
        console.log('[OK] openVerifyPersonalInfoModal function available:', typeof openVerifyPersonalInfoModal);
