// Enhanced Podcast Modal JavaScript
// Complete functionality for all advanced features

// ============================================
// STATE MANAGEMENT
// ============================================
let currentTab = 'basics';
let currentTheme = 'light';
let isRecording = false;
let isPlaying = false;
let recordingInterval = null;
let recordingStartTime = null;
let waveformAnimation = null;
let playerInterval = null;
let currentMonth = 7; // August (0-indexed)
let currentYear = 2024;

const episodeData = {
    title: '',
    number: 1,
    season: 'Season 1',
    description: '',
    tags: ['Technology', 'Innovation'],
    guests: [{name: 'Jane Doe', email: 'jane@techcompany.com', role: 'Expert'}],
    schedule: 'immediate',
    platforms: ['Apple Podcasts', 'Spotify', 'Google Podcasts'],
    files: {},
    chapters: [
        {time: '00:00', title: 'Introduction'},
        {time: '05:30', title: 'Guest Introduction'},
        {time: '15:00', title: 'Main Discussion'}
    ],
    monetization: {
        sponsors: 2,
        estimatedEarnings: 2450,
        adPlacements: ['pre-roll', 'mid-roll'],
        cpm: 25,
        downloads: 10000
    },
    analytics: {
        predictedReach: 12500,
        completionRate: 68,
        targetMatch: 89
    }
};

const progressSteps = {
    'basics': 14.28,      // Changed from 16.66
    'recording': 28.57,   // Changed from 33.33
    'guests': 42.86,      // Changed from 50
    'schedule': 57.14,    // Changed from 66.66
    'monetize': 71.43,    // Changed from 83.33
    'golive': 85.71,      // NEW
    'publish': 100        // Still 100
};
// ============================================
// INITIALIZATION
// ============================================
window.addEventListener('load', function() {
    init();
});

function init() {
    initTheme();
    initWaveform();
    initCalendar();
    animateAudioLevels();
    animateNoiseMeters();
    updateAnalytics();
    setupDragAndDrop();
    initChapterDragAndDrop();
    loadDraft();
    startAutoSave();
    
    // Initialize Go Live features
    if (window.goLiveFunctions) {
        window.goLiveFunctions.initGoLive();
    }
}

console.log('JavaScript updates needed:');
console.log('\n1. Update progress steps percentages (7 steps instead of 6)');
console.log('2. Initialize Go Live features in init()');
console.log('3. Add Go Live tab handling in switchTab()');
console.log('4. Include all Go Live functions at the end of the file');
console.log('\nThe Go Live feature is now fully integrated!');

// ============================================
// THEME MANAGEMENT
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
    showToast('Theme Changed', `Switched to ${currentTheme} mode`, 'success');
}

function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    }
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    showToast('Welcome!', 'AI-powered podcast creation ready', 'success');
    initModalFeatures();
}

function closeModal() {
    if (confirm('Save your progress before closing?')) {
        saveDraft();
        document.getElementById('modalOverlay').classList.remove('active');
        document.body.style.overflow = 'auto';
        stopAllAnimations();
    }
}

function initModalFeatures() {
    // Initialize any features that need to be ready when modal opens
    if (!waveformAnimation) {
        initWaveform();
    }
}

function stopAllAnimations() {
    if (waveformAnimation) {
        cancelAnimationFrame(waveformAnimation);
        waveformAnimation = null;
    }
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    if (playerInterval) {
        clearInterval(playerInterval);
        playerInterval = null;
    }
}

// ============================================
// TAB NAVIGATION
// ============================================
function switchTab(tabName, tabElement) {
    // Update progress
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = progressSteps[tabName] + '%';
    }
    
    // Update progress steps
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'completed');
        const stepName = step.getAttribute('data-step');
        if (stepName === tabName) {
            step.classList.add('active');
        } else if (Object.keys(progressSteps).indexOf(stepName) < Object.keys(progressSteps).indexOf(tabName)) {
            step.classList.add('completed');
        }
    });
    
    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetContent = document.getElementById(tabName);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    currentTab = tabName;
    
    // Initialize tab-specific features
    if (tabName === 'recording') {
        initWaveform();
    } else if (tabName === 'schedule') {
        checkForConflicts();
    }
        // Initialize tab-specific features
    if (tabName === 'recording') {
        initWaveform();
    } else if (tabName === 'schedule') {
        checkForConflicts();
    } else if (tabName === 'golive') {
        // Initialize Go Live features when tab is selected
        if (window.goLiveFunctions) {
            window.goLiveFunctions.initGoLive();
        }
    }
}

// ============================================
// AI FEATURES
// ============================================
function generateTitle() {
    const suggestions = document.getElementById('titleSuggestions');
    if (suggestions) {
        suggestions.style.display = 'flex';
        
        // Simulate AI generation with loading
        showToast('AI Assistant', 'Generating title suggestions...', 'info');
        
        setTimeout(() => {
            showToast('AI Assistant', 'Generated 3 title suggestions', 'success');
        }, 1000);
    }
}

function selectSuggestion(element) {
    const titleInput = document.getElementById('episodeTitle');
    if (titleInput) {
        titleInput.value = element.textContent;
        episodeData.title = element.textContent;
    }
    
    element.classList.add('selected');
    setTimeout(() => {
        const suggestions = document.getElementById('titleSuggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }, 500);
}

function addSuggestedTag(tag) {
    const tagInput = document.getElementById('tagInput');
    if (!tagInput) return;
    
    const newTag = document.createElement('div');
    newTag.className = 'tag';
    newTag.innerHTML = `${tag} <span class="tag-close" onclick="removeTag(this)">×</span>`;
    tagInput.insertBefore(newTag, tagInput.lastElementChild);
    episodeData.tags.push(tag);
    showToast('Tag Added', `"${tag}" added to tags`, 'success');
}

function generateTranscript() {
    const loading = document.getElementById('transcriptLoading');
    if (loading) {
        loading.style.display = 'flex';
        
        // Simulate transcript generation
        setTimeout(() => {
            loading.style.display = 'none';
            showToast('Transcript Ready', 'AI has generated the transcript', 'success');
            
            // Add sample transcript lines
            const transcriptContent = document.getElementById('transcriptContent');
            if (transcriptContent) {
                const newLine = document.createElement('div');
                newLine.className = 'transcript-line';
                newLine.innerHTML = `
                    <span class="transcript-timestamp">[00:45]</span>
                    AI-generated content: Today we explore the intersection of technology and creativity...
                `;
                transcriptContent.appendChild(newLine);
            }
        }, 3000);
    }
}

// ============================================
// SEO FEATURES
// ============================================
function updateSEOScore() {
    const description = document.getElementById('episodeDescription');
    if (!description) return;
    
    const text = description.value;
    const wordCount = text.split(' ').length;
    const hasKeywords = /podcast|episode|content|audio/i.test(text);
    
    // Calculate score based on various factors
    let score = 50; // Base score
    score += Math.min(wordCount / 10, 30); // Word count bonus (max 30)
    score += hasKeywords ? 20 : 0; // Keywords bonus
    score = Math.min(100, score); // Cap at 100
    
    // Update display
    const scoreElement = document.getElementById('seoScore');
    if (scoreElement) {
        scoreElement.textContent = Math.round(score);
    }
    
    // Update circle
    const circle = document.getElementById('seoCircle');
    if (circle) {
        const circumference = 339.292;
        const offset = circumference - (score / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        // Update color based on score
        if (score > 75) {
            circle.style.stroke = 'var(--success)';
        } else if (score > 50) {
            circle.style.stroke = 'var(--warning)';
        } else {
            circle.style.stroke = 'var(--error)';
        }
    }
}

// ============================================
// RECORDING STUDIO
// ============================================
function toggleRecording() {
    const btn = document.getElementById('recordBtn');
    const studio = document.getElementById('recordingStudio');
    
    if (!isRecording) {
        isRecording = true;
        if (studio) studio.classList.add('active');
        if (btn) {
            btn.classList.add('active');
            btn.querySelector('.studio-label').textContent = 'Stop Recording';
        }
        startRecording();
        showToast('Recording Started', 'Your audio is being recorded', 'success');
    } else {
        isRecording = false;
        if (studio) studio.classList.remove('active');
        if (btn) {
            btn.classList.remove('active');
            btn.querySelector('.studio-label').textContent = 'Start Recording';
        }
        stopRecording();
        showToast('Recording Stopped', 'Audio saved successfully', 'success');
    }
}

function startRecording() {
    recordingStartTime = Date.now();
    recordingInterval = setInterval(updateRecordingTime, 1000);
    
    // Start waveform animation
    if (!waveformAnimation) {
        animateWaveform();
    }
}

function stopRecording() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    const timer = document.getElementById('recordingTime');
    if (timer) {
        timer.textContent = '00:00:00';
    }
}

function updateRecordingTime() {
    if (!recordingStartTime) return;
    
    const elapsed = Date.now() - recordingStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timeString = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    
    const timer = document.getElementById('recordingTime');
    if (timer) {
        timer.textContent = timeString;
    }
}

function toggleNoiseReduction() {
    event.currentTarget.classList.toggle('active');
    showToast('Noise Reduction', 'Background noise filter activated', 'success');
}

function toggleVoiceEnhance() {
    event.currentTarget.classList.toggle('active');
    showToast('Voice Enhancement', 'Voice clarity improved', 'success');
}

function toggleEqualizer() {
    event.currentTarget.classList.toggle('active');
    showToast('Equalizer', 'Audio balanced for podcasting', 'success');
}

function updateFilter(slider, type) {
    const value = slider.value;
    slider.parentElement.querySelector('.filter-value').textContent = value;
    
    // Apply filter effect (simulated)
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} Adjusted`, `Set to ${value}%`, 'info');
}

// ============================================
// WAVEFORM VISUALIZATION
// ============================================
function initWaveform() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    if (isRecording) {
        animateWaveform();
    } else {
        drawStaticWaveform(ctx, canvas.width, canvas.height);
    }
}

function animateWaveform() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'var(--primary)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < canvas.width; i += 5) {
            const amplitude = Math.sin(i * 0.05 + Date.now() * 0.002) * 30;
            const randomNoise = (Math.random() - 0.5) * 10;
            const y = canvas.height / 2 + amplitude + randomNoise;
            
            if (i === 0) {
                ctx.moveTo(i, y);
            } else {
                ctx.lineTo(i, y);
            }
        }
        
        ctx.stroke();
        
        if (isRecording) {
            waveformAnimation = requestAnimationFrame(draw);
        }
    }
    
    draw();
}

function drawStaticWaveform(ctx, width, height) {
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
}

// ============================================
// AUDIO LEVELS & NOISE
// ============================================
function animateAudioLevels() {
    const levels = document.querySelectorAll('#audioLevels .level-bar');
    if (!levels.length) return;
    
    setInterval(() => {
        levels.forEach(bar => {
            if (isRecording) {
                const height = Math.random() * 50 + 10;
                bar.style.height = height + 'px';
            } else {
                bar.style.height = '10px';
            }
        });
    }, 100);
}

function animateNoiseMeters() {
    const bars = document.querySelectorAll('#noiseBars .noise-bar');
    const status = document.getElementById('noiseStatus');
    if (!bars.length) return;
    
    setInterval(() => {
        let totalNoise = 0;
        bars.forEach(bar => {
            const height = Math.random() * 20 + 5;
            bar.style.height = height + 'px';
            totalNoise += height;
        });
        
        if (status) {
            const avgNoise = totalNoise / bars.length;
            if (avgNoise < 10) {
                status.textContent = 'Low';
                status.style.color = 'var(--success)';
            } else if (avgNoise < 15) {
                status.textContent = 'Medium';
                status.style.color = 'var(--warning)';
            } else {
                status.textContent = 'High';
                status.style.color = 'var(--error)';
            }
        }
    }, 500);
}

// ============================================
// COLLABORATION FEATURES
// ============================================
function checkAvailability() {
    const status = document.getElementById('availabilityStatus');
    if (status) {
        status.style.display = 'block';
        
        // Simulate checking calendar
        setTimeout(() => {
            showToast('Availability Checked', 'Guest calendar synchronized', 'success');
        }, 1000);
    }
}

// ============================================
// GUEST MANAGEMENT
// ============================================
function addGuest() {
    const nameInput = document.getElementById('guestName');
    const emailInput = document.getElementById('guestEmail');
    const roleSelect = document.getElementById('guestRole');
    
    if (!nameInput || !emailInput || !roleSelect) return;
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const role = roleSelect.value;
    
    if (name && email) {
        if (!validateEmail(email)) {
            showToast('Invalid Email', 'Please enter a valid email address', 'error');
            emailInput.classList.add('error-shake');
            setTimeout(() => {
                emailInput.classList.remove('error-shake');
            }, 500);
            return;
        }
        
        const guestList = document.getElementById('guestList');
        if (guestList) {
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            const guestItem = document.createElement('div');
            guestItem.className = 'guest-item';
            guestItem.innerHTML = `
                <div class="guest-avatar">${initials}</div>
                <div class="guest-info">
                    <div class="guest-name">
                        ${name}
                        <span class="guest-role">${role}</span>
                    </div>
                    <div class="guest-email">${email}</div>
                </div>
                <button class="remove-guest" onclick="removeGuest(this)">Remove</button>
            `;
            
            guestList.appendChild(guestItem);
            episodeData.guests.push({name, email, role});
            
            // Clear inputs
            nameInput.value = '';
            emailInput.value = '';
            
            updateGuestCount();
            showToast('Guest Added', `${name} added as ${role}`, 'success');
        }
    } else {
        showToast('Missing Information', 'Please enter both name and email', 'warning');
    }
}

function removeGuest(element) {
    const guestItem = element.parentElement;
    const guestName = guestItem.querySelector('.guest-name').textContent.split('\n')[0].trim();
    
    guestItem.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        guestItem.remove();
        episodeData.guests = episodeData.guests.filter(g => g.name !== guestName);
        updateGuestCount();
    }, 300);
    
    showToast('Guest Removed', `${guestName} has been removed`, 'info');
}

function updateGuestCount() {
    const count = document.querySelectorAll('.guest-item').length;
    const countElement = document.getElementById('guestCount');
    if (countElement) {
        countElement.textContent = `${count} Guest${count !== 1 ? 's' : ''}`;
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}



// ============================================
// CALENDAR FEATURES
// ============================================
function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    // Clear existing content
    grid.innerHTML = '';
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.style.fontWeight = '600';
        header.style.fontSize = '12px';
        header.style.textAlign = 'center';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // Add empty cells for alignment
    for (let i = 0; i < firstDayOfMonth; i++) {
        const empty = document.createElement('div');
        grid.appendChild(empty);
    }
    
    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Mark current day
        if (day === 15) dayElement.classList.add('selected');
        
        // Mark days with events
        if ([5, 12, 19, 26].includes(day)) dayElement.classList.add('has-event');
        
        // Mark conflict days
        if ([8, 22].includes(day)) dayElement.classList.add('conflict');
        
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;
        dayElement.onclick = () => selectCalendarDay(dayElement, day);
        grid.appendChild(dayElement);
    }
}

function selectCalendarDay(element, day) {
    document.querySelectorAll('.calendar-day').forEach(d => {
        d.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // Check for conflicts
    if (element.classList.contains('conflict')) {
        showConflictAlert();
    }
}

function navigateCalendar(direction) {
    if (direction === 'prev') {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
    } else {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    
    // Update calendar header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const header = document.querySelector('.calendar-header h4');
    if (header) {
        header.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    initCalendar();
}

function checkForConflicts() {
    // Simulate conflict detection
    const conflictAlert = document.getElementById('conflictAlert');
    if (conflictAlert) {
        // Show conflict if certain conditions are met
        const hasConflict = Math.random() > 0.7;
        conflictAlert.style.display = hasConflict ? 'flex' : 'none';
    }
}

function showConflictAlert() {
    const alert = document.getElementById('conflictAlert');
    if (alert) {
        alert.style.display = 'flex';
        showToast('Schedule Conflict', 'Another episode is scheduled for this time', 'warning');
    }
}

// ============================================
// SERIES SCHEDULING
// ============================================
function selectPattern(element, pattern) {
    document.querySelectorAll('.pattern-option').forEach(option => {
        option.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // Update series preview
    updateSeriesPreview(pattern);
    showToast('Series Pattern', `${pattern} schedule selected`, 'success');
}

function updateSeriesPreview(pattern) {
    const preview = document.querySelector('.series-preview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    const intervals = {
        'weekly': 7,
        'biweekly': 14,
        'monthly': 30,
        'custom': 10
    };
    
    const interval = intervals[pattern];
    const baseDate = new Date();
    
    for (let i = 0; i < 4; i++) {
        const episodeDate = new Date(baseDate);
        episodeDate.setDate(baseDate.getDate() + (interval * i));
        
        const episode = document.createElement('div');
        episode.className = 'series-episode';
        episode.innerHTML = `
            <div class="series-episode-number">Ep. ${i + 1}</div>
            <div class="series-episode-date">${episodeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        `;
        preview.appendChild(episode);
    }
}

// ============================================
// MONETIZATION FEATURES
// ============================================
function calculateROI() {
    const downloadsInput = document.querySelector('.roi-calculator input[type="number"]');
    const cpmInput = document.querySelectorAll('.roi-calculator input[type="number"]')[1];
    
    if (downloadsInput && cpmInput) {
        const downloads = parseInt(downloadsInput.value) || 0;
        const cpm = parseFloat(cpmInput.value) || 0;
        
        const revenue = (downloads / 1000) * cpm;
        const roi = ((revenue / 100) * 100).toFixed(0);
        
        const roiElement = document.getElementById('roiValue');
        if (roiElement) {
            roiElement.textContent = `${roi}% ROI`;
        }
        
        // Update earnings
        const earningsElement = document.getElementById('earningsAmount');
        if (earningsElement) {
            earningsElement.textContent = `${revenue.toFixed(0)}`;
        }
        
        episodeData.monetization.downloads = downloads;
        episodeData.monetization.cpm = cpm;
    }
}

function addSponsor() {
    showToast('Add Sponsor', 'Opening sponsor management...', 'info');
    // Here you could open a sponsor selection modal
}

// ============================================
// ANALYTICS
// ============================================
function updateAnalytics() {
    // Simulate analytics updates
    setInterval(() => {
        const reach = (Math.random() * 5 + 10).toFixed(1) + 'K';
        const reachElement = document.getElementById('reach');
        if (reachElement) {
            reachElement.textContent = `Est. Reach: ${reach}`;
        }
        
        // Update other analytics
        episodeData.analytics.predictedReach = parseFloat(reach) * 1000;
    }, 5000);
}

// ============================================
// PLAYER CONTROLS
// ============================================
function playerControl(action) {
    const playBtn = document.getElementById('playBtn');
    const progress = document.getElementById('playerProgress');
    
    switch(action) {
        case 'play':
            isPlaying = !isPlaying;
            if (playBtn) {
                playBtn.textContent = isPlaying ? '⏸️' : '▶️';
            }
            if (isPlaying) {
                startPlayback();
            } else {
                stopPlayback();
            }
            break;
        case 'prev':
            showToast('Previous', 'Playing previous chapter', 'info');
            break;
        case 'next':
            showToast('Next', 'Playing next chapter', 'info');
            break;
    }
}

function startPlayback() {
    let currentProgress = 35;
    playerInterval = setInterval(() => {
        currentProgress += 0.5;
        if (currentProgress >= 100) {
            currentProgress = 0;
        }
        
        const progress = document.getElementById('playerProgress');
        if (progress) {
            progress.style.width = currentProgress + '%';
        }
        
        // Update time display
        updatePlayerTime(currentProgress);
    }, 1000);
}

function stopPlayback() {
    if (playerInterval) {
        clearInterval(playerInterval);
        playerInterval = null;
    }
}

function updatePlayerTime(progress) {
    const totalSeconds = 45 * 60; // 45 minutes
    const currentSeconds = Math.floor((progress / 100) * totalSeconds);
    
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        currentTimeElement.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}

// ============================================
// CHAPTER MANAGEMENT
// ============================================
function addChapter() {
    const list = document.getElementById('chapterList');
    if (!list) return;
    
    const newChapter = document.createElement('div');
    newChapter.className = 'chapter-item';
    newChapter.draggable = true;
    newChapter.innerHTML = `
        <span class="chapter-time">00:00</span>
        <span class="chapter-title">New Chapter</span>
        <div class="chapter-actions">
            <button class="chapter-btn" onclick="editChapter(this)">✏️</button>
            <button class="chapter-btn" onclick="deleteChapter(this)">🗑️</button>
        </div>
    `;
    
    list.appendChild(newChapter);
    initChapterDragAndDrop();
    showToast('Chapter Added', 'New chapter marker created', 'success');
}

function editChapter(button) {
    const chapterItem = button.closest('.chapter-item');
    const titleElement = chapterItem.querySelector('.chapter-title');
    
    const newTitle = prompt('Edit chapter title:', titleElement.textContent);
    if (newTitle) {
        titleElement.textContent = newTitle;
        showToast('Chapter Updated', 'Chapter title changed', 'success');
    }
}

function deleteChapter(button) {
    if (confirm('Delete this chapter?')) {
        button.closest('.chapter-item').remove();
        showToast('Chapter Deleted', 'Chapter marker removed', 'info');
    }
}

function initChapterDragAndDrop() {
    const chapters = document.querySelectorAll('.chapter-item');
    let draggedElement = null;
    
    chapters.forEach(chapter => {
        chapter.addEventListener('dragstart', function(e) {
            draggedElement = this;
            this.classList.add('dragging');
        });
        
        chapter.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
        });
        
        chapter.addEventListener('dragover', function(e) {
            e.preventDefault();
            const afterElement = getDragAfterElement(this.parentElement, e.clientY);
            if (afterElement == null) {
                this.parentElement.appendChild(draggedElement);
            } else {
                this.parentElement.insertBefore(draggedElement, afterElement);
            }
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.chapter-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ============================================
// TRANSCRIPT FEATURES
// ============================================
function switchTranscriptMode(mode, button) {
    document.querySelectorAll('.transcript-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    const content = document.getElementById('transcriptContent');
    if (content) {
        if (mode === 'edit') {
            content.contentEditable = true;
            content.style.background = 'var(--background)';
        } else {
            content.contentEditable = false;
            content.style.background = 'transparent';
        }
    }
}

function exportTranscript() {
    const content = document.getElementById('transcriptContent');
    if (content) {
        const text = content.innerText;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.txt';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Transcript Exported', 'File downloaded successfully', 'success');
    }
}

// ============================================
// POLL MANAGEMENT
// ============================================
function addPollOption() {
    const pollOptions = document.getElementById('pollOptions');
    if (!pollOptions) return;
    
    const newOption = document.createElement('div');
    newOption.className = 'poll-option';
    newOption.innerHTML = `
        <input type="text" placeholder="New option">
        <button class="poll-option-remove" onclick="removePollOption(this)">×</button>
    `;
    pollOptions.appendChild(newOption);
}

function removePollOption(button) {
    button.parentElement.remove();
}

// ============================================
// Q&A SESSION
// ============================================
function selectQASlot(element) {
    document.querySelectorAll('.qa-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    element.classList.add('selected');
    showToast('Q&A Scheduled', `Session set for ${element.querySelector('.qa-time').textContent}`, 'success');
}

// ============================================
// TAG MANAGEMENT
// ============================================
function addTag(event) {
    if (event.key === 'Enter' && event.target.value.trim()) {
        event.preventDefault();
        const tagInput = document.getElementById('tagInput');
        if (!tagInput) return;
        
        const newTag = document.createElement('div');
        newTag.className = 'tag';
        newTag.innerHTML = `${event.target.value} <span class="tag-close" onclick="removeTag(this)">×</span>`;
        tagInput.insertBefore(newTag, event.target);
        
        episodeData.tags.push(event.target.value);
        event.target.value = '';
        
        showToast('Tag Added', 'New tag added successfully', 'success');
    }
}

function removeTag(element) {
    const tagText = element.parentElement.textContent.replace('×', '').trim();
    element.parentElement.remove();
    episodeData.tags = episodeData.tags.filter(tag => tag !== tagText);
    showToast('Tag Removed', `"${tagText}" removed from tags`, 'info');
}

// ============================================
// PLATFORM MANAGEMENT
// ============================================
function togglePlatform(element) {
    element.classList.toggle('selected');
    const platformName = element.querySelector('.platform-name').textContent;
    
    if (element.classList.contains('selected')) {
        if (!episodeData.platforms.includes(platformName)) {
            episodeData.platforms.push(platformName);
        }
        showToast('Platform Added', `${platformName} selected for distribution`, 'success');
    } else {
        episodeData.platforms = episodeData.platforms.filter(p => p !== platformName);
        showToast('Platform Removed', `${platformName} removed from distribution`, 'info');
    }
}

// ============================================
// FILE UPLOAD
// ============================================
function setupDragAndDrop() {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function triggerFileInput(type) {
    const input = document.createElement('input');
    input.type = 'file';
    
    switch(type) {
        case 'audio':
            input.accept = 'audio/*';
            break;
        case 'thumbnail':
            input.accept = 'image/*';
            break;
        case 'transcript':
            input.accept = '.txt,.srt,.vtt';
            break;
    }
    
    input.onchange = function(e) {
        if (e.target.files[0]) {
            handleFile(e.target.files[0], type);
        }
    };
    input.click();
}

function dropHandler(ev, type) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('dragging');
    
    if (ev.dataTransfer.items) {
        for (let i = 0; i < ev.dataTransfer.items.length; i++) {
            if (ev.dataTransfer.items[i].kind === 'file') {
                const file = ev.dataTransfer.items[i].getAsFile();
                handleFile(file, type);
                break;
            }
        }
    }
}

function dragOverHandler(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('dragging');
}

function dragLeaveHandler(ev) {
    ev.currentTarget.classList.remove('dragging');
}

function handleFile(file, type) {
    const maxSize = type === 'audio' ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
        showToast('File Too Large', `Maximum size is ${maxSize / 1024 / 1024}MB`, 'error');
        return;
    }
    
    episodeData.files[type] = file;
    
    // Update UI based on file type
    if (type === 'audio') {
        const duration = document.getElementById('duration');
        if (duration) {
            // Simulate duration calculation
            const mins = Math.floor(Math.random() * 60) + 10;
            duration.textContent = `Duration: ${mins}:00`;
        }
    }
    
    showToast('File Uploaded', `${file.name} uploaded successfully`, 'success');
}

// ============================================
// SAVE & PUBLISH
// ============================================
function saveDraft() {
    // Collect all form data
    const titleInput = document.getElementById('episodeTitle');
    if (titleInput) {
        episodeData.title = titleInput.value;
    }
    
    const descInput = document.getElementById('episodeDescription');
    if (descInput) {
        episodeData.description = descInput.value;
    }
    
    // Save to localStorage
    localStorage.setItem('podcastDraft', JSON.stringify(episodeData));
    showToast('Draft Saved', 'Your episode has been saved', 'success');
}

function loadDraft() {
    const draft = localStorage.getItem('podcastDraft');
    if (draft) {
        try {
            const parsed = JSON.parse(draft);
            Object.assign(episodeData, parsed);
            
            // Restore form values
            const titleInput = document.getElementById('episodeTitle');
            if (titleInput && episodeData.title) {
                titleInput.value = episodeData.title;
            }
            
            const descInput = document.getElementById('episodeDescription');
            if (descInput && episodeData.description) {
                descInput.value = episodeData.description;
            }
        } catch (e) {
            console.error('Error loading draft:', e);
        }
    }
}

function startAutoSave() {
    setInterval(() => {
        if (document.getElementById('modalOverlay').classList.contains('active')) {
            saveDraft();
        }
    }, 30000); // Auto-save every 30 seconds
}

function publishEpisode() {
    // Validate required fields
    const title = document.getElementById('episodeTitle');
    if (!title || !title.value) {
        showToast('Validation Error', 'Please enter an episode title', 'error');
        switchTab('basics', document.querySelector('.tab'));
        if (title) title.focus();
        return;
    }
    
    if (!episodeData.files.audio) {
        showToast('Validation Error', 'Please upload an audio file', 'error');
        switchTab('recording', document.querySelectorAll('.tab')[1]);
        return;
    }
    
    if (episodeData.platforms.length === 0) {
        showToast('Validation Error', 'Please select at least one platform', 'error');
        switchTab('publish', document.querySelectorAll('.tab')[5]);
        return;
    }
    
    // Show publishing animation
    showToast('Publishing Episode', 'Your episode is being published...', 'success');
    
    // Simulate publishing process
    setTimeout(() => {
        showToast('Episode Published!', 'Your episode is now live! 🎉', 'success');
        
        // Clear draft after successful publish
        localStorage.removeItem('podcastDraft');
        
        setTimeout(() => {
            closeModal();
        }, 2000);
    }, 3000);
}

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <span class="toast-close" onclick="closeToast(this)">×</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        closeToast(toast.querySelector('.toast-close'));
    }, 5000);
}

function closeToast(element) {
    const toast = element.parentElement;
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', function(e) {
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('modalOverlay');
        if (modal && modal.classList.contains('active')) {
            closeModal();
        }
    }
    
    // Ctrl/Cmd + S to save draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const modal = document.getElementById('modalOverlay');
        if (modal && modal.classList.contains('active')) {
            saveDraft();
        }
    }
    
    // Spacebar to play/pause (when player is focused)
    if (e.key === ' ' && e.target.classList.contains('player-btn')) {
        e.preventDefault();
        playerControl('play');
    }
});

// ============================================
// MODAL OVERLAY CLICK HANDLER
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // Prevent modal close when clicking inside
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
});