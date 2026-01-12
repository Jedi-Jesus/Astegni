/**
 * TrueVoice Manager
 * =================
 * Manages TrueVoice voice-personalized messaging for Astegni.
 *
 * Features:
 * - Voice enrollment with sample recording
 * - Voice synthesis and caching
 * - Message playback in sender's voice
 * - Settings management
 */

const TrueVoiceManager = {
    // State
    state: {
        profile: null,
        isEnrolled: false,
        isActive: false,
        enrollmentInProgress: false,
        currentSampleIndex: 0,
        sampleTexts: [],
        mediaRecorder: null,
        audioChunks: [],
        isRecording: false,
        currentAudio: null,
        audioCache: new Map(), // Local cache for quick playback
    },

    // API Base URL
    API_BASE_URL: (window.API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, ''),

    /**
     * Initialize TrueVoice manager
     */
    init() {
        console.log('[TrueVoice] Initializing...');
        this.loadProfile();
    },

    /**
     * Get authorization header
     */
    getAuthHeader() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            console.warn('[TrueVoice] No auth token found in localStorage');
            return null;
        }
        return `Bearer ${token}`;
    },

    /**
     * Load user's TrueVoice profile
     */
    async loadProfile() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/profile`, {
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('[TrueVoice] Not authenticated');
                    return;
                }
                throw new Error('Failed to load profile');
            }

            const data = await response.json();

            if (data.has_profile) {
                this.state.profile = data.profile;
                this.state.isEnrolled = data.profile.enrollment_status === 'active';
                this.state.isActive = data.profile.is_active;
                this.state.enrollmentInProgress = data.profile.enrollment_status === 'pending' ||
                                                   data.profile.enrollment_status === 'processing';
            }

            this.updateUI();
        } catch (error) {
            console.error('[TrueVoice] Error loading profile:', error);
        }
    },

    /**
     * Update UI based on current state
     */
    updateUI() {
        const notEnrolledEl = document.getElementById('truevoiceNotEnrolled');
        const enrollingEl = document.getElementById('truevoiceEnrolling');
        const activeEl = document.getElementById('truevoiceActive');
        const settingsEl = document.getElementById('truevoiceSettings');

        if (!notEnrolledEl) return; // UI not loaded yet

        // Hide all states first
        notEnrolledEl.style.display = 'none';
        enrollingEl.style.display = 'none';
        activeEl.style.display = 'none';
        settingsEl.style.display = 'none';

        if (!this.state.profile) {
            // Not enrolled
            notEnrolledEl.style.display = 'flex';
        } else if (this.state.enrollmentInProgress) {
            // Enrollment in progress
            enrollingEl.style.display = 'flex';
            this.updateEnrollmentProgress();
        } else if (this.state.isEnrolled) {
            // Enrolled and active
            activeEl.style.display = 'flex';
            settingsEl.style.display = 'block';

            // Update UI with profile data
            const voiceNameEl = document.getElementById('truevoiceVoiceName');
            const statsEl = document.getElementById('truevoiceStats');
            const activeToggle = document.getElementById('truevoiceActiveToggle');

            if (voiceNameEl) voiceNameEl.textContent = this.state.profile.voice_name || 'My Voice';
            if (statsEl) statsEl.textContent = `Used ${this.state.profile.total_syntheses || 0} times`;
            if (activeToggle) activeToggle.checked = this.state.isActive;

            // Update permission toggles
            this.updateSettingsUI();
        }
    },

    /**
     * Update settings UI with profile data
     */
    updateSettingsUI() {
        if (!this.state.profile) return;

        const p = this.state.profile;

        // Permission toggles
        const toggles = {
            'truevoiceAllowStudents': p.allow_students_to_hear,
            'truevoiceAllowParents': p.allow_parents_to_hear,
            'truevoiceAllowTutors': p.allow_tutors_to_hear,
            'truevoiceAllowGroups': p.allow_in_groups,
            'truevoiceAutoPlay': p.auto_play_for_recipients,
        };

        for (const [id, value] of Object.entries(toggles)) {
            const el = document.getElementById(id);
            if (el) el.checked = value;
        }

        // Playback speed
        const speedEl = document.getElementById('truevoicePlaybackSpeed');
        if (speedEl && p.default_speed) {
            speedEl.value = p.default_speed.toString();
        }
    },

    /**
     * Update enrollment progress UI
     */
    updateEnrollmentProgress() {
        if (!this.state.profile) return;

        const progress = this.state.profile.enrollment_progress || 0;
        const progressFill = document.getElementById('truevoiceProgressFill');
        const progressText = document.getElementById('truevoiceProgressText');
        const statusText = document.getElementById('truevoiceEnrollmentStatus');

        if (progressFill) {
            progressFill.setAttribute('stroke-dasharray', `${progress}, 100`);
        }
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
        if (statusText) {
            const samplesCompleted = Math.floor(progress / 20);
            statusText.textContent = `Sample ${samplesCompleted + 1} of 5`;
        }
    },

    /**
     * Start voice enrollment
     */
    async startEnrollment() {
        try {
            const authHeader = this.getAuthHeader();
            if (!authHeader) {
                this.showNotification('Please log in to set up TrueVoice', 'error');
                return;
            }

            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/enroll`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    voice_name: 'My Voice',
                    consent_given: true
                })
            });

            if (response.status === 401) {
                this.showNotification('Session expired. Please log in again.', 'error');
                return;
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || 'Failed to start enrollment');
            }

            const data = await response.json();

            this.state.sampleTexts = data.sample_texts;
            this.state.currentSampleIndex = 0;
            this.state.enrollmentInProgress = true;

            // Show enrollment modal
            this.showEnrollmentModal();

        } catch (error) {
            console.error('[TrueVoice] Enrollment error:', error);
            this.showNotification('Failed to start enrollment: ' + error.message, 'error');
        }
    },

    /**
     * Show enrollment recording modal
     */
    showEnrollmentModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('truevoiceEnrollmentModal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'truevoiceEnrollmentModal';
            modal.className = 'truevoice-enrollment-modal';
            modal.innerHTML = `
                <div class="truevoice-enrollment-overlay" onclick="TrueVoiceManager.closeEnrollmentModal()"></div>
                <div class="truevoice-enrollment-content">
                    <div class="enrollment-header">
                        <h3>Create Your TrueVoice</h3>
                        <button class="close-btn" onclick="TrueVoiceManager.closeEnrollmentModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="enrollment-body">
                        <div class="sample-progress">
                            <span id="enrollmentSampleNumber">Sample 1 of 5</span>
                            <div class="progress-bar">
                                <div class="progress-fill" id="enrollmentProgressBar" style="width: 0%"></div>
                            </div>
                        </div>
                        <div class="sample-text-card">
                            <p id="enrollmentSampleText">Loading...</p>
                        </div>
                        <div class="recording-controls" id="recordingControlsContainer">
                            <div class="recording-visualizer" id="enrollmentVisualizer">
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                            </div>
                            <div class="recording-time" id="enrollmentRecordingTime">0:00</div>
                            <div class="recording-buttons">
                                <button class="record-btn" id="enrollmentRecordBtn" onclick="TrueVoiceManager.toggleRecording()">
                                    <svg class="mic-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                        <line x1="12" y1="19" x2="12" y2="23"></line>
                                        <line x1="8" y1="23" x2="16" y2="23"></line>
                                    </svg>
                                    <span>Tap to Record</span>
                                </button>
                                <div class="recording-secondary-buttons">
                                    <button class="restart-record-btn" id="restartRecordBtn" onclick="TrueVoiceManager.restartRecording()">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 4v6h6"></path>
                                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                        </svg>
                                        <span>Restart</span>
                                    </button>
                                    <button class="cancel-record-btn" id="cancelRecordBtn" onclick="TrueVoiceManager.cancelRecording()">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M18 6L6 18M6 6l12 12"></path>
                                        </svg>
                                        <span>Cancel</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="enrollment-tips">
                            <p><strong>Tips:</strong> Speak clearly and naturally. Find a quiet space. Hold your device steady.</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add styles
            this.addEnrollmentModalStyles();
        }

        // Update content
        this.updateEnrollmentModalContent();

        // Show modal
        modal.classList.add('active');
    },

    /**
     * Update enrollment modal content
     */
    updateEnrollmentModalContent() {
        const sampleNumber = document.getElementById('enrollmentSampleNumber');
        const sampleText = document.getElementById('enrollmentSampleText');
        const progressBar = document.getElementById('enrollmentProgressBar');
        const controlsContainer = document.getElementById('recordingControlsContainer');

        if (sampleNumber) {
            sampleNumber.textContent = `Sample ${this.state.currentSampleIndex + 1} of ${this.state.sampleTexts.length}`;
        }
        if (sampleText && this.state.sampleTexts[this.state.currentSampleIndex]) {
            sampleText.textContent = this.state.sampleTexts[this.state.currentSampleIndex];
        }
        if (progressBar) {
            const progress = ((this.state.currentSampleIndex) / this.state.sampleTexts.length) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Show restart button after first sample is recorded (sample index > 0)
        if (controlsContainer) {
            if (this.state.currentSampleIndex > 0) {
                controlsContainer.classList.add('has-samples');
            } else {
                controlsContainer.classList.remove('has-samples');
            }
        }
    },

    /**
     * Close enrollment modal
     */
    closeEnrollmentModal() {
        const modal = document.getElementById('truevoiceEnrollmentModal');
        if (modal) {
            modal.classList.remove('active');
        }
        // Reload profile to get updated state
        this.loadProfile();
    },

    /**
     * Toggle recording
     */
    async toggleRecording() {
        if (this.state.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    },

    /**
     * Start recording
     */
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.state.mediaRecorder = new MediaRecorder(stream);
            this.state.audioChunks = [];
            this.state.isRecording = true;

            this.state.mediaRecorder.ondataavailable = (event) => {
                this.state.audioChunks.push(event.data);
            };

            this.state.mediaRecorder.onstop = () => {
                this.handleRecordingComplete();
            };

            this.state.mediaRecorder.start();

            // Update UI
            const recordBtn = document.getElementById('enrollmentRecordBtn');
            const controlsContainer = document.getElementById('recordingControlsContainer');
            if (recordBtn) {
                recordBtn.classList.add('recording');
                recordBtn.querySelector('span').textContent = 'Tap to Stop';
            }
            if (controlsContainer) {
                controlsContainer.classList.add('recording');
            }

            // Start timer
            this.startRecordingTimer();

        } catch (error) {
            console.error('[TrueVoice] Recording error:', error);
            this.showNotification('Could not access microphone. Please allow microphone access.', 'error');
        }
    },

    /**
     * Stop recording
     */
    stopRecording() {
        if (this.state.mediaRecorder && this.state.isRecording) {
            this.state.mediaRecorder.stop();
            this.state.isRecording = false;

            // Stop all tracks
            this.state.mediaRecorder.stream.getTracks().forEach(track => track.stop());

            // Update UI
            const recordBtn = document.getElementById('enrollmentRecordBtn');
            const controlsContainer = document.getElementById('recordingControlsContainer');
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.querySelector('span').textContent = 'Processing...';
            }
            if (controlsContainer) {
                controlsContainer.classList.remove('recording');
            }

            // Stop timer
            this.stopRecordingTimer();
        }
    },

    /**
     * Cancel recording without saving
     */
    cancelRecording() {
        if (this.state.mediaRecorder && this.state.isRecording) {
            // Stop the media recorder without triggering onstop handler
            this.state.mediaRecorder.onstop = null;
            this.state.mediaRecorder.stop();
            this.state.isRecording = false;

            // Stop all tracks
            this.state.mediaRecorder.stream.getTracks().forEach(track => track.stop());

            // Clear audio chunks
            this.state.audioChunks = [];

            // Update UI
            const recordBtn = document.getElementById('enrollmentRecordBtn');
            const controlsContainer = document.getElementById('recordingControlsContainer');
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.querySelector('span').textContent = 'Tap to Record';
            }
            if (controlsContainer) {
                controlsContainer.classList.remove('recording');
            }

            // Stop and reset timer
            this.stopRecordingTimer();
            const recordingTime = document.getElementById('enrollmentRecordingTime');
            if (recordingTime) {
                recordingTime.textContent = '0:00';
            }

            this.showNotification('Recording cancelled', 'info');
        }
    },

    /**
     * Restart enrollment from Sample 1
     * Resets all progress and starts fresh
     */
    restartRecording() {
        // If currently recording, stop first
        if (this.state.mediaRecorder && this.state.isRecording) {
            // Stop the media recorder without triggering onstop handler
            this.state.mediaRecorder.onstop = null;
            this.state.mediaRecorder.stop();
            this.state.isRecording = false;

            // Stop all tracks
            this.state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        // Clear audio chunks
        this.state.audioChunks = [];

        // Reset to sample 1
        this.state.currentSampleIndex = 0;

        // Update UI
        const recordBtn = document.getElementById('enrollmentRecordBtn');
        const controlsContainer = document.getElementById('recordingControlsContainer');
        if (recordBtn) {
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('span').textContent = 'Tap to Record';
        }
        if (controlsContainer) {
            controlsContainer.classList.remove('recording');
            controlsContainer.classList.remove('has-samples');
        }

        // Stop and reset timer
        this.stopRecordingTimer();
        const recordingTime = document.getElementById('enrollmentRecordingTime');
        if (recordingTime) {
            recordingTime.textContent = '0:00';
        }

        // Update modal content to show Sample 1
        this.updateEnrollmentModalContent();

        this.showNotification('Enrollment restarted from Sample 1', 'info');
    },

    /**
     * Handle recording complete
     */
    async handleRecordingComplete() {
        try {
            const audioBlob = new Blob(this.state.audioChunks, { type: 'audio/wav' });

            // Upload sample
            const formData = new FormData();
            formData.append('sample_index', this.state.currentSampleIndex);
            formData.append('sample_text', this.state.sampleTexts[this.state.currentSampleIndex]);
            formData.append('audio_file', audioBlob, `sample_${this.state.currentSampleIndex}.wav`);

            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/upload-sample`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader()
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload sample');
            }

            const data = await response.json();

            // Move to next sample
            this.state.currentSampleIndex++;

            if (this.state.currentSampleIndex >= this.state.sampleTexts.length) {
                // All samples recorded, complete enrollment
                await this.completeEnrollment();
            } else {
                // Update UI for next sample
                this.updateEnrollmentModalContent();

                const recordBtn = document.getElementById('enrollmentRecordBtn');
                if (recordBtn) {
                    recordBtn.querySelector('span').textContent = 'Tap to Record';
                }
            }

        } catch (error) {
            console.error('[TrueVoice] Upload error:', error);
            this.showNotification('Failed to upload sample. Please try again.', 'error');

            const recordBtn = document.getElementById('enrollmentRecordBtn');
            if (recordBtn) {
                recordBtn.querySelector('span').textContent = 'Tap to Record';
            }
        }
    },

    /**
     * Complete enrollment
     */
    async completeEnrollment() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/complete-enrollment`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                throw new Error('Failed to complete enrollment');
            }

            const data = await response.json();

            this.showNotification('TrueVoice created successfully!', 'success');
            this.closeEnrollmentModal();
            this.loadProfile();

        } catch (error) {
            console.error('[TrueVoice] Complete enrollment error:', error);
            this.showNotification('Failed to complete enrollment: ' + error.message, 'error');
        }
    },

    /**
     * Continue enrollment (from settings page)
     */
    continueEnrollment() {
        if (this.state.profile && this.state.enrollmentInProgress) {
            const samplesCompleted = Math.floor((this.state.profile.enrollment_progress || 0) / 20);
            this.state.currentSampleIndex = samplesCompleted;

            // Fetch sample texts if not loaded
            if (this.state.sampleTexts.length === 0) {
                this.state.sampleTexts = [
                    "Hello, I'm excited to use TrueVoice to connect with my students.",
                    "The quick brown fox jumps over the lazy dog near the riverbank.",
                    "Mathematics helps us understand patterns in nature and solve real-world problems.",
                    "Learning a new language opens doors to different cultures and perspectives.",
                    "Science experiments teach us to observe, hypothesize, and discover truth."
                ];
            }

            this.showEnrollmentModal();
        }
    },

    /**
     * Toggle TrueVoice active state
     */
    async toggleActive(isActive) {
        await this.updateSetting('is_active', isActive);
        this.state.isActive = isActive;
    },

    /**
     * Update a TrueVoice setting
     */
    async updateSetting(key, value) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [key]: value })
            });

            if (!response.ok) {
                throw new Error('Failed to update setting');
            }

            const data = await response.json();
            this.state.profile = data.profile;

        } catch (error) {
            console.error('[TrueVoice] Update setting error:', error);
            this.showNotification('Failed to update setting', 'error');
        }
    },

    /**
     * Delete TrueVoice profile
     */
    async deleteProfile() {
        if (!confirm('Are you sure you want to delete your TrueVoice profile? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/profile`, {
                method: 'DELETE',
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete profile');
            }

            this.state.profile = null;
            this.state.isEnrolled = false;
            this.state.isActive = false;

            this.showNotification('TrueVoice profile deleted', 'success');
            this.updateUI();

        } catch (error) {
            console.error('[TrueVoice] Delete error:', error);
            this.showNotification('Failed to delete profile', 'error');
        }
    },

    /**
     * Synthesize and play a message
     */
    async playMessage(messageId) {
        try {
            // Check cache first
            if (this.state.audioCache.has(messageId)) {
                const audio = this.state.audioCache.get(messageId);
                audio.play();
                return;
            }

            // Show loading state
            const playBtn = document.querySelector(`[data-truevoice-message="${messageId}"]`);
            if (playBtn) {
                playBtn.classList.add('loading');
            }

            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/synthesize/${messageId}`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Synthesis failed');
            }

            const data = await response.json();

            // Check if it's browser TTS fallback
            if (data.audio_url && data.audio_url.includes('tts-fallback')) {
                // Use browser's speechSynthesis
                this.speakWithBrowserTTS(data.audio_url);
            } else if (data.audio_url) {
                // Play the audio
                const audio = new Audio(data.audio_url);
                this.state.audioCache.set(messageId, audio);
                audio.play();
            }

            // Remove loading state
            if (playBtn) {
                playBtn.classList.remove('loading');
            }

        } catch (error) {
            console.error('[TrueVoice] Playback error:', error);
            this.showNotification('Could not play TrueVoice: ' + error.message, 'error');
        }
    },

    /**
     * Fallback: Use browser's built-in TTS
     */
    speakWithBrowserTTS(url) {
        // Parse text from URL
        const params = new URLSearchParams(url.split('?')[1]);
        const text = params.get('text');

        if (text && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
    },

    /**
     * Check if a user has TrueVoice enabled
     */
    async checkUserTrueVoice(userId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/truevoice/check/${userId}`);
            if (!response.ok) return { has_truevoice: false };
            return await response.json();
        } catch (error) {
            return { has_truevoice: false };
        }
    },

    /**
     * Recording timer helpers
     */
    recordingTimer: null,
    recordingSeconds: 0,

    startRecordingTimer() {
        this.recordingSeconds = 0;
        const timerEl = document.getElementById('enrollmentRecordingTime');

        this.recordingTimer = setInterval(() => {
            this.recordingSeconds++;
            const mins = Math.floor(this.recordingSeconds / 60);
            const secs = this.recordingSeconds % 60;
            if (timerEl) {
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }, 1000);
    },

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    },

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use global notification system if available
        if (typeof showChatNotification === 'function') {
            showChatNotification(message, type);
        } else if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[TrueVoice] ${type}: ${message}`);
            alert(message);
        }
    },

    /**
     * Add enrollment modal styles
     */
    addEnrollmentModalStyles() {
        if (document.getElementById('truevoice-enrollment-styles')) return;

        const style = document.createElement('style');
        style.id = 'truevoice-enrollment-styles';
        style.textContent = `
            .truevoice-enrollment-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10010;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .truevoice-enrollment-modal.active {
                opacity: 1;
                visibility: visible;
            }

            .truevoice-enrollment-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
            }

            .truevoice-enrollment-content {
                position: relative;
                background: var(--card-bg, white);
                border-radius: 20px;
                width: 90%;
                max-width: 480px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            }

            .truevoice-enrollment-modal.active .truevoice-enrollment-content {
                transform: translateY(0);
            }

            .enrollment-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
            }

            .enrollment-header h3 {
                margin: 0;
                font-size: 1.2rem;
                font-weight: 600;
                color: var(--primary-color, #F59E0B);
            }

            .enrollment-header .close-btn {
                background: none;
                border: none;
                cursor: pointer;
                color: var(--text-secondary, #6B7280);
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s;
            }

            .enrollment-header .close-btn:hover {
                background: var(--hover-bg, rgba(0, 0, 0, 0.05));
                color: var(--text-primary, #1F2937);
            }

            .enrollment-body {
                padding: 24px;
                background: var(--card-bg, white);
                border-radius: 0 0 20px 20px;
            }

            .sample-progress {
                margin-bottom: 20px;
            }

            .sample-progress span {
                display: block;
                font-size: 0.85rem;
                color: var(--text-secondary, #6B7280);
                margin-bottom: 8px;
            }

            .sample-progress .progress-bar {
                height: 6px;
                background: rgba(var(--primary-rgb, 245, 158, 11), 0.15);
                border-radius: 3px;
                overflow: hidden;
            }

            .sample-progress .progress-fill {
                height: 100%;
                background: var(--primary-color, #F59E0B);
                border-radius: 3px;
                transition: width 0.3s ease;
            }

            .sample-text-card {
                background: rgba(var(--primary-rgb, 245, 158, 11), 0.05);
                border: 1px solid rgba(var(--primary-rgb, 245, 158, 11), 0.15);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 24px;
            }

            .sample-text-card p {
                margin: 0;
                font-size: 1.1rem;
                line-height: 1.6;
                color: var(--text-primary, #1F2937);
            }

            .recording-controls {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                margin-bottom: 20px;
            }

            .recording-visualizer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                height: 40px;
            }

            .recording-visualizer .wave-bar {
                width: 4px;
                height: 20px;
                background: rgba(var(--primary-rgb, 245, 158, 11), 0.3);
                border-radius: 2px;
                animation: none;
            }

            .recording .recording-visualizer .wave-bar {
                animation: wave 0.5s ease-in-out infinite;
                background: var(--primary-color, #F59E0B);
            }

            .recording .recording-visualizer .wave-bar:nth-child(2) { animation-delay: 0.1s; }
            .recording .recording-visualizer .wave-bar:nth-child(3) { animation-delay: 0.2s; }
            .recording .recording-visualizer .wave-bar:nth-child(4) { animation-delay: 0.3s; }
            .recording .recording-visualizer .wave-bar:nth-child(5) { animation-delay: 0.4s; }

            @keyframes wave {
                0%, 100% { height: 20px; }
                50% { height: 40px; }
            }

            .recording-time {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--text-primary, #1F2937);
                font-family: monospace;
            }

            .recording-buttons {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }

            .recording-secondary-buttons {
                display: none;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }

            /* Show secondary buttons container when has samples OR when recording */
            .has-samples .recording-secondary-buttons,
            .recording .recording-secondary-buttons {
                display: flex;
            }

            .record-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                max-width: 200px;
                padding: 16px 24px;
                background: var(--primary-color, #F59E0B);
                color: var(--button-text, #FFFFFF);
                border: none;
                border-radius: 50px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .record-btn:hover {
                transform: scale(1.05);
                background: var(--primary-hover, #D97706);
                box-shadow: 0 8px 24px rgba(var(--primary-rgb, 245, 158, 11), 0.4);
            }

            .record-btn.recording {
                background: linear-gradient(135deg, #EF4444, #DC2626);
                animation: pulse 1s ease-in-out infinite;
            }

            .restart-record-btn,
            .cancel-record-btn {
                display: none;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px 16px;
                background: var(--hover-bg, #F3F4F6);
                color: var(--text-secondary, #6B7280);
                border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
                border-radius: 50px;
                font-size: 0.85rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            /* Show restart button after first sample (sample index > 0) */
            .has-samples .restart-record-btn {
                display: flex;
            }

            /* Show cancel button only during recording */
            .recording .cancel-record-btn {
                display: flex;
            }

            .restart-record-btn:hover {
                background: rgba(var(--primary-rgb, 245, 158, 11), 0.15);
                color: var(--primary-color, #F59E0B);
                border-color: rgba(var(--primary-rgb, 245, 158, 11), 0.3);
            }

            .cancel-record-btn:hover {
                background: #FEE2E2;
                color: #DC2626;
                border-color: rgba(220, 38, 38, 0.3);
            }

            @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
            }

            .enrollment-tips {
                text-align: center;
                padding: 12px;
                background: var(--tips-bg, rgba(0, 0, 0, 0.03));
                border-radius: 8px;
            }

            .enrollment-tips p {
                margin: 0;
                font-size: 0.8rem;
                color: var(--text-secondary, #6B7280);
            }

            /* Dark mode overrides */
            [data-theme="dark"] .truevoice-enrollment-content,
            .dark .truevoice-enrollment-content,
            html.dark .truevoice-enrollment-content {
                background: var(--card-bg, #1F2937);
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
            }

            [data-theme="dark"] .enrollment-header,
            .dark .enrollment-header,
            html.dark .enrollment-header {
                border-bottom-color: var(--border-color, rgba(255, 255, 255, 0.1));
            }

            [data-theme="dark"] .enrollment-header .close-btn:hover,
            .dark .enrollment-header .close-btn:hover,
            html.dark .enrollment-header .close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            [data-theme="dark"] .sample-progress .progress-bar,
            .dark .sample-progress .progress-bar,
            html.dark .sample-progress .progress-bar {
                background: rgba(var(--primary-rgb, 255, 213, 79), 0.2);
            }

            [data-theme="dark"] .sample-text-card,
            .dark .sample-text-card,
            html.dark .sample-text-card {
                background: rgba(var(--primary-rgb, 255, 213, 79), 0.08);
                border-color: rgba(var(--primary-rgb, 255, 213, 79), 0.2);
            }

            [data-theme="dark"] .recording-visualizer .wave-bar,
            .dark .recording-visualizer .wave-bar,
            html.dark .recording-visualizer .wave-bar {
                background: rgba(var(--primary-rgb, 255, 213, 79), 0.4);
            }

            [data-theme="dark"] .restart-record-btn,
            [data-theme="dark"] .cancel-record-btn,
            .dark .restart-record-btn,
            .dark .cancel-record-btn,
            html.dark .restart-record-btn,
            html.dark .cancel-record-btn {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.1);
                color: var(--text-secondary, #9CA3AF);
            }

            [data-theme="dark"] .restart-record-btn:hover,
            .dark .restart-record-btn:hover,
            html.dark .restart-record-btn:hover {
                background: rgba(var(--primary-rgb, 255, 213, 79), 0.2);
                color: var(--primary-color, #FFD54F);
                border-color: rgba(var(--primary-rgb, 255, 213, 79), 0.3);
            }

            [data-theme="dark"] .cancel-record-btn:hover,
            .dark .cancel-record-btn:hover,
            html.dark .cancel-record-btn:hover {
                background: rgba(220, 38, 38, 0.2);
                color: #F87171;
                border-color: rgba(220, 38, 38, 0.3);
            }

            [data-theme="dark"] .enrollment-tips,
            .dark .enrollment-tips,
            html.dark .enrollment-tips {
                background: rgba(255, 255, 255, 0.05);
            }
        `;
        document.head.appendChild(style);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TrueVoiceManager.init());
} else {
    TrueVoiceManager.init();
}

// Make globally available
window.TrueVoiceManager = TrueVoiceManager;
