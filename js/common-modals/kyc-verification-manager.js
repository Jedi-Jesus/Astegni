/**
 * KYC (Know Your Customer) Verification Manager
 * Handles liveliness verification with document + face comparison
 */

/**
 * Append a timestamped entry to the on-screen debug panel and console.
 * color: 'info' (white) | 'ok' (green) | 'warn' (yellow) | 'err' (red)
 */
/**
 * Ensure the KYC debug panel exists as a fixed overlay in the bottom-right corner.
 * Creates it once and reuses it across sessions.
 */
function kycEnsureDebugPanel() {
    if (document.getElementById('kyc-debug-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'kyc-debug-panel';
    panel.style.cssText = [
        'position: fixed',
        'bottom: 16px',
        'right: 16px',
        'width: 380px',
        'max-width: calc(100vw - 32px)',
        'z-index: 99999',
        'border: 1px solid #f59e0b',
        'border-radius: 8px',
        'overflow: hidden',
        'font-family: monospace',
        'font-size: 11px',
        'box-shadow: 0 4px 20px rgba(0,0,0,0.5)'
    ].join('; ');

    panel.innerHTML = `
        <div onclick="var b=document.getElementById('kyc-debug-body');b.style.display=b.style.display==='none'?'block':'none'"
             style="background:#fef3c7;padding:6px 12px;cursor:pointer;font-weight:700;color:#92400e;display:flex;justify-content:space-between;align-items:center;user-select:none;">
            <span>&#x1F6E0; KYC Debug</span>
            <span style="font-size:10px;font-weight:400;">click to toggle</span>
        </div>
        <div id="kyc-debug-body" style="background:#1e1e1e;color:#d4d4d4;padding:8px 10px;max-height:220px;overflow-y:auto;">
            <div id="kyc-debug-entries" style="display:flex;flex-direction:column;gap:2px;">
                <span style="color:#6a9955;"># KYC debug output will appear here</span>
            </div>
        </div>`;

    document.body.appendChild(panel);
}

/**
 * Append a timestamped entry to the on-screen debug panel and console.
 * color: 'info' (white) | 'ok' (green) | 'warn' (yellow) | 'err' (red)
 */
function kycDebug(msg, color = 'info', data = null) {
    const colors = { info: '#d4d4d4', ok: '#4ec9b0', warn: '#dcdcaa', err: '#f44747' };
    const time = new Date().toTimeString().slice(0, 8);
    const line = data ? `${msg} → ${JSON.stringify(data)}` : msg;

    // Console
    const fn = color === 'err' ? console.error : color === 'warn' ? console.warn : console.log;
    fn(`[KYC ${time}] ${line}`);

    // Ensure panel exists (it may not be in DOM yet if modal hasn't loaded)
    kycEnsureDebugPanel();

    const container = document.getElementById('kyc-debug-entries');
    if (container) {
        const el = document.createElement('span');
        el.style.color = colors[color] || colors.info;
        el.textContent = `[${time}] ${line}`;
        container.appendChild(el);
        const body = document.getElementById('kyc-debug-body');
        if (body) body.scrollTop = body.scrollHeight;
    }
}

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

        kycDebug('Manager initialized', 'info');
    }

    /**
     * Open the KYC verification modal
     */
    async openModal() {
        kycDebug('━━━ openModal() called ━━━', 'info');
        kycDebug(`currentStep=${this.currentStep} | verificationId=${this.verificationId}`, 'info');

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
                    kycDebug('Modal HTML loaded from fetch', 'ok');
                } else {
                    kycDebug(`Modal fetch failed — HTTP ${response.status}`, 'err');
                }
            } catch (error) {
                kycDebug(`Failed to load modal: ${error.message}`, 'err');
                alert('Failed to load verification modal. Please refresh the page.');
                return;
            }
        }

        if (!modal) {
            kycDebug('Modal element not found in DOM after load attempt', 'err');
            console.error('[KYC] Modal element not found');
            return;
        }

        kycDebug('Modal element found — showing', 'ok');

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Set document instruction based on user's location
        const instructionEl = document.getElementById('kyc-document-instruction');
        if (instructionEl) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const countryCode = user.country_code || null;
            kycDebug(`User countryCode from localStorage: ${countryCode || '(none)'}`, 'info');

            if (!countryCode) {
                kycDebug('No country_code set — blocking step 1, prompting profile edit', 'warn');
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

            kycDebug(`Document instruction set for country: ${countryCode} → "${countryName}"`, 'ok');
            instructionEl.textContent = `Hold your ${countryName} ID clearly in front of the camera`;
        }

        // Start verification session
        kycDebug('Calling startVerification()…', 'info');
        await this.startVerification();

        // Initialize camera for document capture
        kycDebug('Calling initDocumentCamera()…', 'info');
        await this.initDocumentCamera();
        kycDebug('━━━ openModal() complete — STEP 1 active ━━━', 'ok');
    }

    /**
     * Close the KYC modal
     */
    closeModal() {
        kycDebug('closeModal() called', 'info');
        const modal = document.getElementById('kyc-verification-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            kycDebug('Modal hidden', 'ok');
        } else {
            kycDebug('closeModal: modal element not found', 'warn');
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
        kycDebug('reset() — clearing all state', 'info');
        this.currentStep = 'document';
        this.documentImage = null;
        this.selfieImage = null;
        this.livelinessFrames = [];
        this.challengesCompleted = { blink: false, smile: false, turn: false };
        this.isProcessing = false;
        kycDebug('State reset complete', 'ok');
    }

    /**
     * Stop all camera streams
     */
    stopAllCameras() {
        kycDebug('stopAllCameras()', 'info');
        if (this.documentStream) {
            this.documentStream.getTracks().forEach(track => track.stop());
            this.documentStream = null;
            kycDebug('Document camera stream stopped', 'ok');
        } else {
            kycDebug('Document camera: no active stream', 'info');
        }
        if (this.selfieStream) {
            this.selfieStream.getTracks().forEach(track => track.stop());
            this.selfieStream = null;
            kycDebug('Selfie camera stream stopped', 'ok');
        } else {
            kycDebug('Selfie camera: no active stream', 'info');
        }
    }

    /**
     * Start KYC verification session with backend
     */
    async startVerification() {
        try {
            // Check both token keys (app uses both 'token' and 'access_token')
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');

            kycDebug('Token check', 'info', {
                token: localStorage.getItem('token') ? 'exists' : 'null',
                access_token: localStorage.getItem('access_token') ? 'exists' : 'null',
                using: token ? 'found' : 'none'
            });

            // Check if token exists
            if (!token) {
                kycDebug('No token found in localStorage', 'err');
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
                kycDebug('Token expired on /start, attempting refresh', 'warn');
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
            kycDebug(`Session started — verification_id=${this.verificationId}`, 'ok');

        } catch (error) {
            kycDebug(`Error starting verification: ${error.message}`, 'err');
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
        kycDebug('initDocumentCamera() — requesting rear camera', 'info');
        try {
            const video = document.getElementById('kyc-video-document');
            if (!video) {
                kycDebug('kyc-video-document element not found in DOM', 'err');
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

            kycDebug('getUserMedia constraints: facingMode=environment 1280x720', 'info');
            this.documentStream = await navigator.mediaDevices.getUserMedia(constraints);
            const tracks = this.documentStream.getVideoTracks();
            kycDebug(`Camera granted — track: "${tracks[0]?.label || 'unknown'}"`, 'ok');
            video.srcObject = this.documentStream;
            await video.play();

            kycDebug('Document camera initialized and playing', 'ok');
        } catch (error) {
            kycDebug(`initDocumentCamera failed: ${error.name} — ${error.message}`, 'err');
            console.error('[KYC] Camera error:', error);
            alert('Unable to access camera. Please ensure camera permissions are granted.');
        }
    }

    /**
     * Initialize camera for selfie/liveliness
     */
    async initSelfieCamera() {
        kycDebug('initSelfieCamera() — requesting front camera', 'info');
        try {
            const video = document.getElementById('kyc-video-selfie');
            if (!video) {
                kycDebug('kyc-video-selfie element not found in DOM', 'err');
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

            kycDebug('getUserMedia constraints: facingMode=user 1280x720', 'info');
            this.selfieStream = await navigator.mediaDevices.getUserMedia(constraints);
            const tracks = this.selfieStream.getVideoTracks();
            kycDebug(`Front camera granted — track: "${tracks[0]?.label || 'unknown'}"`, 'ok');
            video.srcObject = this.selfieStream;
            await video.play();

            kycDebug('Selfie camera initialized and playing', 'ok');
        } catch (error) {
            kycDebug(`initSelfieCamera failed: ${error.name} — ${error.message}`, 'err');
            console.error('[KYC] Camera error:', error);
            alert('Unable to access camera for selfie. Please ensure camera permissions are granted.');
        }
    }

    /**
     * Capture document photo
     */
    captureDocument() {
        kycDebug('━━━ STEP 1: captureDocument() ━━━', 'info');
        const video = document.getElementById('kyc-video-document');
        const canvas = document.getElementById('kyc-canvas-document');
        const preview = document.getElementById('kyc-preview-document');

        if (!video || !canvas) {
            kycDebug('captureDocument: video or canvas element missing', 'err');
            return;
        }
        kycDebug(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`, 'info');

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Get image data (high quality)
        this.documentImage = canvas.toDataURL('image/jpeg', 0.9);

        kycDebug(`Document captured — ${Math.round(this.documentImage.length / 1024)} KB`, 'ok');

        // Show preview
        preview.src = this.documentImage;
        preview.style.display = 'block';
        video.style.display = 'none';

        // Update buttons
        document.getElementById('btn-capture-document').style.display = 'none';
        document.getElementById('btn-retake-document').style.display = 'inline-flex';
        document.getElementById('btn-continue-document').style.display = 'inline-flex';

        kycDebug('Document captured — ready for upload. Click "Continue" to proceed.', 'ok');
    }

    /**
     * Retake document photo
     */
    retakeDocument() {
        kycDebug('retakeDocument() — discarding captured image, restarting video', 'warn');
        const video = document.getElementById('kyc-video-document');
        const preview = document.getElementById('kyc-preview-document');

        video.style.display = 'block';
        preview.style.display = 'none';

        document.getElementById('btn-capture-document').style.display = 'inline-flex';
        document.getElementById('btn-retake-document').style.display = 'none';
        document.getElementById('btn-continue-document').style.display = 'none';

        this.documentImage = null;
        kycDebug('documentImage cleared — camera live again', 'info');
    }

    /**
     * Proceed to liveliness step
     */
    async proceedToLiveliness() {
        kycDebug('━━━ STEP 1→2: proceedToLiveliness() ━━━', 'info');
        if (!this.documentImage) {
            kycDebug('proceedToLiveliness: no documentImage — user must capture first', 'warn');
            alert('Please capture your document first');
            return;
        }
        kycDebug(`documentImage present — ${Math.round(this.documentImage.length / 1024)} KB`, 'info');

        if (this.isProcessing) {
            kycDebug('Already processing — ignoring duplicate call', 'warn');
            return;
        }
        this.isProcessing = true;

        try {
            // Upload document to backend
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');
            kycDebug(`Uploading document to /api/kyc/upload-document (verification_id=${this.verificationId})`, 'info');
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
                kycDebug('Token expired during document upload, refreshing', 'warn');
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

            kycDebug('Document uploaded', 'ok', { face_detected: data.face_detected, next_step: data.next_step });

            // Stop document camera
            if (this.documentStream) {
                this.documentStream.getTracks().forEach(track => track.stop());
            }

            kycDebug('Document accepted — transitioning to STEP 2 (liveliness)', 'ok');

            // Show liveliness step
            this.showStep('liveliness');

            // Update progress
            this.updateProgress(2);

            // Initialize selfie camera
            await this.initSelfieCamera();
            kycDebug('━━━ STEP 2 active — liveliness challenges ready ━━━', 'ok');

        } catch (error) {
            kycDebug(`Document upload failed: ${error.message}`, 'err');
            alert(error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Capture a single frame from the selfie video into a canvas (mirrored).
     * Returns a base64 JPEG string.
     */
    captureFrame(video, canvas, width = 320, height = 240, quality = 0.6) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -width, 0, width, height);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', quality);
    }

    /**
     * Start a liveliness challenge.
     * - blink: captures a frame mid-challenge when user has blinked
     * - smile: captures a frame mid-challenge when user is smiling
     * - turn: captures multiple frames across the 3s window for head movement tracking
     */
    async startChallenge(type) {
        kycDebug(`━━━ STEP 2: startChallenge('${type}') ━━━`, 'info');
        kycDebug(`Challenges so far — blink:${this.challengesCompleted.blink} smile:${this.challengesCompleted.smile} turn:${this.challengesCompleted.turn}`, 'info');
        const instructionEl = document.getElementById('challenge-instruction');
        const video = document.getElementById('kyc-video-selfie');
        const canvas = document.getElementById('kyc-canvas-selfie');

        if (!video || !canvas) {
            kycDebug(`startChallenge('${type}'): video or canvas element missing`, 'err');
            return;
        }
        kycDebug(`Video ready: ${video.videoWidth}x${video.videoHeight} | readyState=${video.readyState}`, 'info');

        const instructions = {
            blink: 'Blink your eyes slowly now...',
            smile: 'Smile naturally now...',
            turn: 'Slowly turn your head left… then right… (4 seconds)'
        };

        instructionEl.textContent = instructions[type] || 'Follow the instruction';

        // Collect frames across the challenge window
        // Turn gets more time (4s) and faster capture (300ms) so we catch the full arc.
        // Blink/smile use 3s at 400ms — enough frames to catch a momentary action.
        const frames = [];
        const totalDuration = type === 'turn' ? 4000 : 3000; // ms
        const interval = type === 'turn' ? 300 : 400; // ~13 frames for turn, ~7 for others

        const captureInterval = setInterval(() => {
            frames.push(this.captureFrame(video, canvas));
        }, interval);

        await new Promise(resolve => setTimeout(resolve, totalDuration));
        clearInterval(captureInterval);

        // Also add to global liveliness frames for reference
        this.livelinessFrames.push(...frames);
        kycDebug(`Frame capture complete — ${frames.length} frames for '${type}' (total liveliness frames: ${this.livelinessFrames.length})`, 'info');

        if (frames.length === 0) {
            kycDebug(`No frames captured for '${type}' — video may not be playing`, 'err');
            instructionEl.textContent = 'No frames captured. Please try again.';
            return;
        }

        // Send first frame as primary + rest as extra_frames for ALL challenge types.
        // Backend checks extra_frames for blink/smile (any frame with detection passes)
        // and uses all frames for turn (face tracking across frames).
        const primaryFrame = frames[0];
        const extraFrames = frames.slice(1);

        kycDebug(`Challenge '${type}': ${frames.length} frames captured, sending ${extraFrames.length} extra`, 'info');

        try {
            let token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('verification_id', this.verificationId);
            formData.append('challenge_type', type);
            formData.append('frame_data', primaryFrame);
            if (extraFrames.length > 0) {
                formData.append('extra_frames', JSON.stringify(extraFrames));
            }

            let response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/verify-liveliness`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/kyc/verify-liveliness`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                }
            }

            const data = await response.json();
            const passed = data.success;
            kycDebug(
                `Challenge '${type}' → ${passed ? 'PASSED' : 'FAILED'}`,
                passed ? 'ok' : 'err',
                { message: data.message }
            );

            if (passed) {
                this.challengesCompleted[type] = true;
                this.updateChallengeStatus(type, true);
                instructionEl.textContent = '✓ Challenge passed!';
            } else {
                instructionEl.textContent = data.message || 'Please try again';
            }

            // Show complete button once all 3 challenges pass
            const allDone = this.challengesCompleted.blink && this.challengesCompleted.smile && this.challengesCompleted.turn;
            kycDebug(`All challenges done: ${allDone} (blink=${this.challengesCompleted.blink}, smile=${this.challengesCompleted.smile}, turn=${this.challengesCompleted.turn})`, allDone ? 'ok' : 'info');
            if (allDone) {
                document.getElementById('btn-complete-liveliness').style.display = 'inline-flex';
                kycDebug('"Complete Verification" button revealed', 'ok');
            }

        } catch (error) {
            kycDebug(`Challenge '${type}' error: ${error.name} — ${error.message}`, 'err');
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
        kycDebug('━━━ STEP 2→3: completeLiveliness() ━━━', 'info');
        if (this.isProcessing) {
            kycDebug('Already processing — ignoring duplicate call', 'warn');
            return;
        }
        this.isProcessing = true;

        // Capture final selfie (optimized for upload)
        const video = document.getElementById('kyc-video-selfie');
        const canvas = document.getElementById('kyc-canvas-selfie');
        kycDebug(`Capturing final selfie — video: ${video?.videoWidth}x${video?.videoHeight}`, 'info');

        // Use reasonable resolution for face comparison (640x480)
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        this.selfieImage = canvas.toDataURL('image/jpeg', 0.75);  // Reduced from 0.9 to 0.75
        kycDebug(`Selfie captured — ${Math.round(this.selfieImage.length / 1024)} KB`, 'info');

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

            kycDebug('Sending selfie + liveliness frames', 'info', {
                verification_id: this.verificationId,
                selfie_kb: Math.round((this.selfieImage || '').length / 1024),
                liveliness_frames: this.livelinessFrames.length
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
                kycDebug('Token expired during selfie upload, refreshing', 'warn');
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
            kycDebug(`Selfie upload response: HTTP ${response.status}`, response.ok ? 'ok' : 'err', {
                status: data.status,
                face_match_passed: data.face_match_passed,
                face_match_score: data.face_match_score,
                liveliness_passed: data.liveliness_passed,
                liveliness_score: data.liveliness_score,
                blink: data.blink_detected,
                smile: data.smile_detected,
                head_turn: data.head_turn_detected,
                rejection_reason: data.rejection_reason || null
            });

            // Handle 400 errors with specific message
            if (response.status === 400) {
                kycDebug(`Bad request: ${data.detail}`, 'err');
                throw new Error(data.detail || 'Verification failed');
            }

            if (!response.ok) {
                throw new Error(data.detail || 'Verification failed');
            }

            if (data.success) {
                kycDebug('VERIFICATION PASSED', 'ok');
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
                kycDebug(`VERIFICATION FAILED: ${data.rejection_reason}`, 'err');
                this.showFailedResult(data);
            }

        } catch (error) {
            kycDebug(`Verification exception: ${error.message}`, 'err');
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
        kycDebug('━━━ STEP 3: showSuccessResult() ━━━', 'ok');
        kycDebug('Result', 'ok', {
            face_match_score: data.face_match_score,
            liveliness_score: data.liveliness_score,
            blink: data.blink_detected,
            smile: data.smile_detected,
            head_turn: data.head_turn_detected
        });
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
        kycDebug('━━━ STEP 3: showFailedResult() ━━━', 'err');
        kycDebug('Failure details', 'err', {
            rejection_reason: data.rejection_reason,
            attempts_remaining: data.attempts_remaining,
            face_match_passed: data.face_match_passed,
            liveliness_passed: data.liveliness_passed
        });
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
        kycDebug('━━━ retryKYC() — starting over ━━━', 'warn');
        // Reset state
        this.reset();

        // Reset UI
        this.resetUI();

        // Start new verification
        kycDebug('Starting new verification session…', 'info');
        await this.startVerification();

        // Show document step
        this.showStep('document');
        this.updateProgress(1);

        // Initialize document camera
        await this.initDocumentCamera();
        kycDebug('━━━ Retry ready — STEP 1 active ━━━', 'ok');
    }

    /**
     * Reset UI elements
     */
    resetUI() {
        kycDebug('resetUI() — restoring all UI elements to initial state', 'info');
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
        kycDebug(`showStep('${step}') — hiding others`, 'info');
        const steps = ['document', 'liveliness', 'result'];
        steps.forEach(s => {
            const el = document.getElementById(`kyc-step-${s}`);
            if (el) {
                el.style.display = s === step ? 'block' : 'none';
            } else {
                kycDebug(`showStep: element #kyc-step-${s} not found in DOM`, 'warn');
            }
        });
        this.currentStep = step;
        kycDebug(`currentStep is now: ${this.currentStep}`, 'ok');
    }

    /**
     * Update progress indicator
     */
    updateProgress(step) {
        kycDebug(`updateProgress(${step}) — updating step circles`, 'info');
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
