/**
 * KYC (Know Your Customer) Verification Manager
 * Handles liveliness verification with document + face comparison
 */

class KYCVerificationManager {
    constructor() {
        this.verificationId = null;
        this.currentStep = 'document'; // document, liveliness, result
        this.documentStream = null;
        this.selfieStream = null;
        this.documentImage = null;
        this.selfieImage = null;
        this.livelinessFrames = [];
        this.challengesCompleted = {
            blink: false,
            smile: false,
            turn: false
        };
        this.isProcessing = false;

        console.log('[KYC] Manager initialized');
    }

    /**
     * Open the KYC verification modal
     */
    async openModal() {
        console.log('[KYC] Opening modal...');

        // Load modal if not already in DOM
        let modal = document.getElementById('kyc-verification-modal');
        if (!modal) {
            try {
                const response = await fetch('/modals/common-modals/kyc-verification-modal.html');
                if (response.ok) {
                    const html = await response.text();
                    let container = document.getElementById('modal-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'modal-container';
                        document.body.appendChild(container);
                    }
                    container.insertAdjacentHTML('beforeend', html);
                    modal = document.getElementById('kyc-verification-modal');
                    console.log('[KYC] Modal loaded');
                }
            } catch (error) {
                console.error('[KYC] Failed to load modal:', error);
                alert('Failed to load verification modal. Please refresh the page.');
                return;
            }
        }

        if (!modal) {
            console.error('[KYC] Modal element not found');
            return;
        }

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Set document instruction based on user's location
        const instructionEl = document.getElementById('kyc-document-instruction');
        if (instructionEl) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const countryCode = user.country_code || null;

            if (!countryCode) {
                // No country set — block the step and prompt user to set location
                instructionEl.innerHTML = 'Please <a href="#" onclick="closeKYCModal(); if(typeof openEditProfileModal === \'function\') openEditProfileModal(); return false;" style="color: var(--primary-color);">go to Edit Profile</a> and set your location first before verifying your identity.';
                // Hide camera and capture controls until location is set
                const cameraContainer = modal.querySelector('.camera-container');
                const captureControls = modal.querySelector('.capture-controls');
                const tipsSection = modal.querySelector('.tips-section');
                if (cameraContainer) cameraContainer.style.display = 'none';
                if (captureControls) captureControls.style.display = 'none';
                if (tipsSection) tipsSection.style.display = 'none';
                return;
            }

            const countryNames = {
                'ET': 'Ethiopian', 'US': 'US', 'GB': 'British', 'CA': 'Canadian',
                'AU': 'Australian', 'DE': 'German', 'FR': 'French', 'IN': 'Indian',
                'NG': 'Nigerian', 'KE': 'Kenyan', 'GH': 'Ghanaian', 'ZA': 'South African',
                'EG': 'Egyptian', 'TZ': 'Tanzanian', 'UG': 'Ugandan', 'RW': 'Rwandan',
                'SN': 'Senegalese', 'CM': 'Cameroonian', 'CI': 'Ivorian', 'SD': 'Sudanese'
            };
            const countryName = countryNames[countryCode] || countryCode;

            instructionEl.textContent = `Hold your ${countryName} ID clearly in front of the camera`;
        }

        // Start verification session
        await this.startVerification();

        // Initialize camera for document capture
        await this.initDocumentCamera();
    }

    /**
     * Close the KYC modal
     */
    closeModal() {
        const modal = document.getElementById('kyc-verification-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }

        // Stop all camera streams
        this.stopAllCameras();

        // Reset state
        this.reset();
    }

    /**
     * Reset manager state
     */
    reset() {
        this.currentStep = 'document';
        this.documentImage = null;
        this.selfieImage = null;
        this.livelinessFrames = [];
        this.challengesCompleted = { blink: false, smile: false, turn: false };
        this.isProcessing = false;
    }

    /**
     * Stop all camera streams
     */
    stopAllCameras() {
        if (this.documentStream) {
            this.documentStream.getTracks().forEach(track => track.stop());
            this.documentStream = null;
        }
        if (this.selfieStream) {
            this.selfieStream.getTracks().forEach(track => track.stop());
            this.selfieStream = null;
        }
    }

    /**
     * Start KYC verification session with backend
     */
    async startVerification() {
        try {
            // Check both token keys (app uses both 'token' and 'access_token')
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');

            // Debug: log what we found
            console.log('[KYC] Token check:', {
                token: localStorage.getItem('token') ? 'exists' : 'null',
                access_token: localStorage.getItem('access_token') ? 'exists' : 'null',
                using: token ? 'found' : 'none'
            });

            // Check if token exists
            if (!token) {
                console.error('[KYC] No token found in localStorage');
                alert('Please log in to continue with verification.');
                this.closeModal();
                window.location.href = '/index.html';
                return;
            }

            let response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ document_type: 'digital_id' })
            });

            // If 401, try to refresh token
            if (response.status === 401) {
                console.log('[KYC] Token expired, attempting refresh...');
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry with new token
                    token = localStorage.getItem('token');
                    response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/start`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ document_type: 'digital_id' })
                    });
                } else {
                    alert('Your session has expired. Please log in again.');
                    this.closeModal();
                    // Trigger logout
                    if (typeof window.logout === 'function') {
                        window.logout();
                    } else {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        window.location.href = '/index.html';
                    }
                    return;
                }
            }

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 400 && data.detail === 'You are already verified') {
                    alert('You are already verified!');
                    this.closeModal();
                    return;
                }
                throw new Error(data.detail || 'Failed to start verification');
            }

            this.verificationId = data.verification_id;
            console.log('[KYC] Verification started:', this.verificationId);

        } catch (error) {
            console.error('[KYC] Error starting verification:', error);
            alert('Failed to start verification: ' + error.message);
            this.closeModal();
        }
    }

    /**
     * Attempt to refresh the access token
     */
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                console.log('[KYC] No refresh token available');
                return false;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (!response.ok) {
                console.log('[KYC] Token refresh failed');
                return false;
            }

            const data = await response.json();
            // Store in both keys for compatibility
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('access_token', data.access_token);
            if (data.refresh_token) {
                localStorage.setItem('refreshToken', data.refresh_token);
            }
            console.log('[KYC] Token refreshed successfully');
            return true;

        } catch (error) {
            console.error('[KYC] Error refreshing token:', error);
            return false;
        }
    }

    /**
     * Initialize camera for document capture
     */
    async initDocumentCamera() {
        try {
            const video = document.getElementById('kyc-video-document');
            if (!video) {
                console.error('[KYC] Document video element not found');
                return;
            }

            // Request rear camera for document (if available)
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.documentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = this.documentStream;
            await video.play();

            console.log('[KYC] Document camera initialized');
        } catch (error) {
            console.error('[KYC] Camera error:', error);
            alert('Unable to access camera. Please ensure camera permissions are granted.');
        }
    }

    /**
     * Initialize camera for selfie/liveliness
     */
    async initSelfieCamera() {
        try {
            const video = document.getElementById('kyc-video-selfie');
            if (!video) {
                console.error('[KYC] Selfie video element not found');
                return;
            }

            // Request front camera for selfie
            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.selfieStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = this.selfieStream;
            await video.play();

            console.log('[KYC] Selfie camera initialized');
        } catch (error) {
            console.error('[KYC] Camera error:', error);
            alert('Unable to access camera for selfie. Please ensure camera permissions are granted.');
        }
    }

    /**
     * Capture document photo
     */
    captureDocument() {
        const video = document.getElementById('kyc-video-document');
        const canvas = document.getElementById('kyc-canvas-document');
        const preview = document.getElementById('kyc-preview-document');

        if (!video || !canvas) return;

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Get image data (high quality)
        this.documentImage = canvas.toDataURL('image/jpeg', 0.9);

        console.log('[KYC] Document image size:', Math.round(this.documentImage.length / 1024), 'KB');

        // Show preview
        preview.src = this.documentImage;
        preview.style.display = 'block';
        video.style.display = 'none';

        // Update buttons
        document.getElementById('btn-capture-document').style.display = 'none';
        document.getElementById('btn-retake-document').style.display = 'inline-flex';
        document.getElementById('btn-continue-document').style.display = 'inline-flex';

        console.log('[KYC] Document captured');
    }

    /**
     * Retake document photo
     */
    retakeDocument() {
        const video = document.getElementById('kyc-video-document');
        const preview = document.getElementById('kyc-preview-document');

        video.style.display = 'block';
        preview.style.display = 'none';

        document.getElementById('btn-capture-document').style.display = 'inline-flex';
        document.getElementById('btn-retake-document').style.display = 'none';
        document.getElementById('btn-continue-document').style.display = 'none';

        this.documentImage = null;
    }

    /**
     * Proceed to liveliness step
     */
    async proceedToLiveliness() {
        if (!this.documentImage) {
            alert('Please capture your document first');
            return;
        }

        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Upload document to backend
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('verification_id', this.verificationId);
            formData.append('image_data', this.documentImage);
            formData.append('document_type', 'digital_id');

            let response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/upload-document`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            // If 401, try to refresh token and retry
            if (response.status === 401) {
                console.log('[KYC] Token expired during document upload, refreshing...');
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/upload-document`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                } else {
                    throw new Error('Session expired. Please log in again.');
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to upload document');
            }

            console.log('[KYC] Document uploaded:', data);

            // Stop document camera
            if (this.documentStream) {
                this.documentStream.getTracks().forEach(track => track.stop());
            }

            // Show liveliness step
            this.showStep('liveliness');

            // Update progress
            this.updateProgress(2);

            // Initialize selfie camera
            await this.initSelfieCamera();

        } catch (error) {
            console.error('[KYC] Error uploading document:', error);
            alert(error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start a liveliness challenge
     */
    async startChallenge(type) {
        const instructionEl = document.getElementById('challenge-instruction');
        const video = document.getElementById('kyc-video-selfie');
        const canvas = document.getElementById('kyc-canvas-selfie');

        const instructions = {
            blink: 'Blink your eyes slowly',
            smile: 'Smile naturally',
            turn: 'Turn your head slowly left and right'
        };

        instructionEl.textContent = instructions[type] || 'Follow the instruction';

        // Capture frames during challenge (reduced quality and size for faster upload)
        const frames = [];
        const captureInterval = setInterval(() => {
            if (frames.length < 3) {  // Reduced from 5 to 3 frames per challenge
                // Use smaller canvas size for liveliness frames (320x240)
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                ctx.restore();
                frames.push(canvas.toDataURL('image/jpeg', 0.5));  // Reduced quality from 0.8 to 0.5
            }
        }, 600);  // Slightly slower capture (600ms instead of 500ms)

        // Wait for challenge duration
        await new Promise(resolve => setTimeout(resolve, 3000));
        clearInterval(captureInterval);

        // Add frames to liveliness frames
        this.livelinessFrames.push(...frames);

        // Verify challenge with backend
        try {
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('verification_id', this.verificationId);
            formData.append('challenge_type', type);
            formData.append('frame_data', frames[frames.length - 1] || '');

            let response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/verify-liveliness`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            // If 401, try to refresh token and retry
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/verify-liveliness`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                }
            }

            const data = await response.json();

            if (data.success) {
                this.challengesCompleted[type] = true;
                this.updateChallengeStatus(type, true);
                instructionEl.textContent = 'Challenge passed!';
            } else {
                instructionEl.textContent = 'Please try again';
            }

            // Check if all challenges completed
            if (this.challengesCompleted.blink && this.challengesCompleted.smile && this.challengesCompleted.turn) {
                document.getElementById('btn-complete-liveliness').style.display = 'inline-flex';
            }

        } catch (error) {
            console.error('[KYC] Challenge error:', error);
            instructionEl.textContent = 'Error. Please try again.';
        }
    }

    /**
     * Update challenge status UI
     */
    updateChallengeStatus(type, passed) {
        const statusEl = document.getElementById(`status-${type}`);
        const checkEl = document.getElementById(`check-${type}`);
        const btnEl = document.getElementById(`btn-challenge-${type}`);

        if (passed) {
            if (statusEl) statusEl.textContent = '\u2713';
            if (statusEl) statusEl.style.color = '#10b981';
            if (checkEl) checkEl.classList.add('passed');
            if (btnEl) btnEl.classList.add('completed');
        }
    }

    /**
     * Complete liveliness and submit for final verification
     */
    async completeLiveliness() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // Capture final selfie (optimized for upload)
        const video = document.getElementById('kyc-video-selfie');
        const canvas = document.getElementById('kyc-canvas-selfie');

        // Use reasonable resolution for face comparison (640x480)
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        this.selfieImage = canvas.toDataURL('image/jpeg', 0.75);  // Reduced from 0.9 to 0.75
        console.log('[KYC] Selfie image size:', Math.round(this.selfieImage.length / 1024), 'KB');

        // Show result step with processing
        this.showStep('result');
        this.updateProgress(3);

        try {
            // Upload selfie with liveliness frames
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('verification_id', this.verificationId);
            formData.append('image_data', this.selfieImage);
            formData.append('liveliness_frames', JSON.stringify(this.livelinessFrames));

            console.log('[KYC] Sending selfie upload request:', {
                verification_id: this.verificationId,
                image_data_length: this.selfieImage ? this.selfieImage.length : 0,
                liveliness_frames_count: this.livelinessFrames ? this.livelinessFrames.length : 0
            });

            let response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/upload-selfie`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            // If 401, try to refresh token and retry
            if (response.status === 401) {
                console.log('[KYC] Token expired during selfie upload, refreshing...');
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/upload-selfie`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                }
            }

            const data = await response.json();
            console.log('[KYC] Selfie upload response:', response.status, data);

            // Handle 400 errors with specific message
            if (response.status === 400) {
                console.error('[KYC] Bad request error:', data.detail);
                throw new Error(data.detail || 'Verification failed');
            }

            if (!response.ok) {
                throw new Error(data.detail || 'Verification failed');
            }

            if (data.success) {
                this.showSuccessResult(data);

                // Update user's KYC status in localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.kyc_verified = true;
                user.is_verified = true;
                localStorage.setItem('user', JSON.stringify(user));

                // Update KYC status badge on profile page (if function exists)
                if (typeof updateKYCStatusBadge === 'function') {
                    updateKYCStatusBadge();
                }

            } else {
                this.showFailedResult(data);
            }

        } catch (error) {
            console.error('[KYC] Verification error:', error);
            this.showFailedResult({
                rejection_reason: error.message,
                attempts_remaining: 2
            });
        } finally {
            this.isProcessing = false;
            this.stopAllCameras();
        }
    }

    /**
     * Show verification success result
     */
    showSuccessResult(data) {
        document.getElementById('kyc-result-processing').style.display = 'none';
        document.getElementById('kyc-result-failed').style.display = 'none';
        document.getElementById('kyc-result-success').style.display = 'block';

        // Update scores
        const faceScore = Math.round((data.face_match_score || 0.95) * 100);
        const livelinessScore = Math.round((data.liveliness_score || 1) * 100);

        document.getElementById('result-face-score').textContent = faceScore + '%';
        document.getElementById('result-liveliness-score').textContent = livelinessScore + '%';
        document.getElementById('result-verified-at').textContent = new Date().toLocaleString();
    }

    /**
     * Show verification failed result
     */
    showFailedResult(data) {
        document.getElementById('kyc-result-processing').style.display = 'none';
        document.getElementById('kyc-result-success').style.display = 'none';
        document.getElementById('kyc-result-failed').style.display = 'block';

        document.getElementById('result-failure-reason').textContent =
            data.rejection_reason || 'Verification failed. Please try again.';

        const attemptsRemaining = data.attempts_remaining || 0;
        document.getElementById('result-attempts-remaining').textContent = attemptsRemaining;

        if (attemptsRemaining <= 0) {
            document.getElementById('btn-retry-kyc').style.display = 'none';
            document.getElementById('retry-info').innerHTML = '<p style="color: #ef4444;">Maximum attempts exceeded. Please contact support.</p>';
        }
    }

    /**
     * Retry KYC verification
     */
    async retryKYC() {
        // Reset state
        this.reset();

        // Reset UI
        this.resetUI();

        // Start new verification
        await this.startVerification();

        // Show document step
        this.showStep('document');
        this.updateProgress(1);

        // Initialize document camera
        await this.initDocumentCamera();
    }

    /**
     * Reset UI elements
     */
    resetUI() {
        // Reset document step
        const video = document.getElementById('kyc-video-document');
        const preview = document.getElementById('kyc-preview-document');
        if (video) video.style.display = 'block';
        if (preview) preview.style.display = 'none';

        document.getElementById('btn-capture-document').style.display = 'inline-flex';
        document.getElementById('btn-retake-document').style.display = 'none';
        document.getElementById('btn-continue-document').style.display = 'none';

        // Reset liveliness step
        document.getElementById('btn-complete-liveliness').style.display = 'none';

        ['blink', 'smile', 'turn'].forEach(type => {
            const statusEl = document.getElementById(`status-${type}`);
            const checkEl = document.getElementById(`check-${type}`);
            const btnEl = document.getElementById(`btn-challenge-${type}`);

            if (statusEl) {
                statusEl.textContent = '\u25CB';
                statusEl.style.color = '';
            }
            if (checkEl) checkEl.classList.remove('passed');
            if (btnEl) btnEl.classList.remove('completed');
        });

        // Reset result step
        document.getElementById('kyc-result-processing').style.display = 'block';
        document.getElementById('kyc-result-success').style.display = 'none';
        document.getElementById('kyc-result-failed').style.display = 'none';
    }

    /**
     * Show a specific step
     */
    showStep(step) {
        const steps = ['document', 'liveliness', 'result'];
        steps.forEach(s => {
            const el = document.getElementById(`kyc-step-${s}`);
            if (el) {
                el.style.display = s === step ? 'block' : 'none';
            }
        });
        this.currentStep = step;
    }

    /**
     * Update progress indicator
     */
    updateProgress(step) {
        for (let i = 1; i <= 3; i++) {
            const stepEl = document.getElementById(`step${i}`);
            if (stepEl) {
                stepEl.classList.remove('active', 'completed');
                if (i < step) {
                    stepEl.classList.add('completed');
                } else if (i === step) {
                    stepEl.classList.add('active');
                }

                const circle = stepEl.querySelector('.step-circle');
                if (circle) {
                    if (i < step) {
                        circle.style.background = '#10b981';
                        circle.style.color = 'white';
                    } else if (i === step) {
                        circle.style.background = 'var(--primary-color, #3b82f6)';
                        circle.style.color = 'white';
                    } else {
                        circle.style.background = 'var(--border-color, #e5e7eb)';
                        circle.style.color = 'var(--text-secondary)';
                    }
                }
            }
        }
    }

    /**
     * Check if user needs KYC verification
     */
    async checkKYCRequired() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return { kyc_required: false };

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/check`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                return { kyc_required: false };
            }

            return await response.json();
        } catch (error) {
            console.error('[KYC] Error checking KYC status:', error);
            return { kyc_required: false };
        }
    }
}

// Create global instance
const kycManager = new KYCVerificationManager();

// Global functions for onclick handlers
function openKYCModal() {
    kycManager.openModal();
}

function closeKYCModal() {
    kycManager.closeModal();
}

function captureDocument() {
    kycManager.captureDocument();
}

function retakeDocument() {
    kycManager.retakeDocument();
}

function proceedToLiveliness() {
    kycManager.proceedToLiveliness();
}

function startChallenge(type) {
    kycManager.startChallenge(type);
}

function completeLiveliness() {
    kycManager.completeLiveliness();
}

function retryKYC() {
    kycManager.retryKYC();
}

// Export for module usage
window.KYCVerificationManager = KYCVerificationManager;
window.kycManager = kycManager;
window.openKYCModal = openKYCModal;
window.closeKYCModal = closeKYCModal;

console.log('[KYC] Verification manager loaded');
