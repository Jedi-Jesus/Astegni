// ============================================
// ENHANCED JOURNALIST PROFILE JAVASCRIPT
// Complete functionality for all features
// ============================================

// ============================================
// INITIALIZATION & CONFIGURATION
// ============================================

// Global State Management
const AppState = {
    user: {
        id: 'user_001',
        name: 'Sarah Mitchell',
        role: 'Elite Journalist',
        verified: true,
        rating: 4.5,
        trustScore: 92,
        followers: 12500,
        following: 842
    },
    articles: [],
    videos: [],
    podcasts: [],
    schedules: [],
    drafts: [],
    connections: [],
    messages: [],
    liveStream: null,
    recording: {
        isRecording: false,
        mediaRecorder: null,
        chunks: [],
        startTime: null
    },
    performance: {
        views: 28500,
        viewsChange: 12,
        followers: 1200,
        followersChange: 8,
        engagement: 456,
        engagementChange: -3
    },
    theme: localStorage.getItem('theme') || 'light'
};

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initializePage();
    
    // Load saved data
    loadUserData();
    
    // Start real-time updates
    startRealTimeUpdates();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Hide preloader
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.display = 'none';
        }
    }, 1500);
    
    console.log('🚀 Journalist Profile System Initialized');
});

// Initialize Page Components
function initializePage() {
    // Initialize theme
    loadTheme();
    
    // Initialize particles background if available
    initParticles();
    
    // Initialize tooltips
    initTooltips();
    
    // Initialize counters animation
    animateCounters();
    
    // Initialize charts
    initCharts();
    
    // Check notification permissions
    requestNotificationPermission();
}

// ============================================
// THEME MANAGEMENT
// ============================================

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    showToast(`Switched to ${newTheme} mode`, 'success');
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ============================================
// PARTICLE BACKGROUND
// ============================================

function initParticles() {
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-bg')) {
        particlesJS('particles-bg', {
            particles: {
                number: { value: 50, density: { enable: true, value_area: 800 } },
                color: { value: '#F59E0B' },
                shape: { type: 'circle' },
                opacity: { value: 0.3, random: true },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#F59E0B',
                    opacity: 0.2,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out'
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: { enable: true, mode: 'grab' },
                    onclick: { enable: true, mode: 'push' },
                    resize: true
                }
            },
            retina_detect: true
        });
    }
}

// ============================================
// MODAL MANAGEMENT
// ============================================

// Schedule Modal
function openScheduleModal() {
    openModal('scheduleModal');
}

function closeScheduleModal() {
    closeModal('scheduleModal');
}

// News Modal
function openNewsModal() {
    openModal('newsModal');
}

function closeNewsModal() {
    closeModal('newsModal');
}

// Video/Vlog Modal
function openVlogModal() {
    openModal('vlogModal');
}

function closeVlogModal() {
    closeModal('vlogModal');
}

// Podcast Modal
function openPodcastModal() {
    openModal('podcastModal');
}

function closePodcastModal() {
    closeModal('podcastModal');
}

// Go Live Modal
function openGoLiveModal() {
    openModal('goLiveModal');
}

function closeGoLiveModal() {
    closeModal('goLiveModal');
    stopStreamPreview();
}

// Connect Modal
function openConnectModal() {
    openModal('connectModal');
    loadConnections();
}

function closeConnectModal() {
    closeModal('connectModal');
}

// AI Writer Modal
function openAIWriter() {
    openModal('aiWriterModal');
}

function closeAIWriter() {
    closeModal('aiWriterModal');
}

// Edit Profile Modal
function openEditProfileModal() {
    openModal('editProfileModal');
}

function closeEditProfileModal() {
    closeModal('editProfileModal');
}

// Comments Modal
function openCommentsModal() {
    openModal('commentsModal');
}

function closeCommentsModal() {
    closeModal('commentsModal');
}

// Generic Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// ARTICLE/NEWS FUNCTIONS
// ============================================

function saveDraft() {
    const title = document.getElementById('newsTitle')?.value;
    const content = document.getElementById('newsContent')?.innerHTML;
    const category = document.getElementById('newsCategory')?.value;
    const type = document.getElementById('newsType')?.value;
    
    if (!title && !content) {
        showToast('Please add some content before saving', 'warning');
        return;
    }
    
    const draft = {
        id: generateId(),
        title: title || 'Untitled Draft',
        content: content,
        category: category,
        type: type,
        savedAt: new Date().toISOString(),
        status: 'draft'
    };
    
    AppState.drafts.push(draft);
    saveToLocalStorage();
    showToast('Draft saved successfully', 'success');
}

function postNews() {
    const title = document.getElementById('newsTitle')?.value;
    const content = document.getElementById('newsContent')?.innerHTML;
    const category = document.getElementById('newsCategory')?.value;
    const type = document.getElementById('newsType')?.value;
    
    if (!title || !content) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const article = {
        id: generateId(),
        title: title,
        content: content,
        category: category,
        type: type,
        author: AppState.user.name,
        publishedAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        status: 'published'
    };
    
    AppState.articles.push(article);
    saveToLocalStorage();
    showToast('Article published successfully!', 'success');
    closeNewsModal();
    refreshArticlesList();
}

function previewArticle() {
    const title = document.getElementById('newsTitle')?.value;
    const content = document.getElementById('newsContent')?.innerHTML;
    
    if (!title || !content) {
        showToast('Add content to preview', 'warning');
        return;
    }
    
    // Open preview in new window
    const preview = window.open('', '_blank');
    preview.document.write(`
        <html>
            <head>
                <title>Preview: ${title}</title>
                <style>
                    body { 
                        font-family: -apple-system, sans-serif; 
                        max-width: 800px; 
                        margin: 50px auto; 
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1 { color: #F59E0B; margin-bottom: 20px; }
                    .meta { color: #666; margin-bottom: 30px; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <div class="meta">By ${AppState.user.name} • Preview Mode</div>
                <div>${content}</div>
            </body>
        </html>
    `);
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('newsContent')?.focus();
}

function insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
        document.execCommand('createLink', false, url);
    }
}

function insertImage() {
    const url = prompt('Enter image URL:');
    if (url) {
        document.execCommand('insertImage', false, url);
    }
}

// ============================================
// VIDEO FUNCTIONS
// ============================================

function uploadVideo() {
    const fileInput = document.getElementById('videoFile');
    const file = fileInput?.files[0];
    
    if (!file) {
        showToast('Please select a video file', 'warning');
        return;
    }
    
    // Simulate upload progress
    const progressBar = document.querySelector('.upload-progress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressBar) {
        progressBar.style.display = 'block';
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += 10;
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '% uploaded';
            
            if (progress >= 100) {
                clearInterval(interval);
                showToast('Video uploaded successfully!', 'success');
                setTimeout(() => {
                    closeVlogModal();
                    progressBar.style.display = 'none';
                }, 1000);
            }
        }, 300);
    }
}

// ============================================
// PODCAST FUNCTIONS
// ============================================

let podcastRecording = false;
let podcastRecorder = null;
let podcastChunks = [];
let recordingTimer = null;
let recordingStartTime = null;

function selectRecordingOption(option) {
    // Hide all sections first
    document.getElementById('audioUploadSection').style.display = 'none';
    document.getElementById('recordingSection').style.display = 'none';
    
    // Show selected section
    if (option === 'upload') {
        document.getElementById('audioUploadSection').style.display = 'block';
    } else if (option === 'record') {
        document.getElementById('recordingSection').style.display = 'block';
        initializePodcastRecorder();
    }
    
    // Update button states
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function togglePodcastRecording() {
    if (!podcastRecording) {
        startPodcastRecording();
    } else {
        stopPodcastRecording();
    }
}

function startPodcastRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            podcastRecorder = new MediaRecorder(stream);
            podcastChunks = [];
            
            podcastRecorder.ondataavailable = event => {
                podcastChunks.push(event.data);
            };
            
            podcastRecorder.onstop = () => {
                const audioBlob = new Blob(podcastChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Save or preview audio
                showToast('Recording saved!', 'success');
            };
            
            podcastRecorder.start();
            podcastRecording = true;
            recordingStartTime = Date.now();
            
            // Update UI
            const recordBtn = document.querySelector('.record-btn');
            if (recordBtn) {
                recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
                recordBtn.classList.add('recording');
            }
            
            // Start timer
            startRecordingTimer();
            
            showToast('Recording started...', 'info');
        })
        .catch(error => {
            showToast('Microphone access denied', 'error');
        });
}

function stopPodcastRecording() {
    if (podcastRecorder && podcastRecorder.state === 'recording') {
        podcastRecorder.stop();
        podcastRecording = false;
        
        // Stop all tracks
        podcastRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Update UI
        const recordBtn = document.querySelector('.record-btn');
        if (recordBtn) {
            recordBtn.innerHTML = '<i class="fas fa-circle"></i>';
            recordBtn.classList.remove('recording');
        }
        
        // Stop timer
        clearInterval(recordingTimer);
    }
}

function startRecordingTimer() {
    recordingTimer = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const time = formatTime(elapsed);
        const timerElement = document.querySelector('.recording-time');
        if (timerElement) {
            timerElement.textContent = time;
        }
    }, 1000);
}

function addGuest() {
    const guestInput = document.getElementById('guestName');
    const guestName = guestInput?.value.trim();
    
    if (!guestName) {
        showToast('Please enter guest name', 'warning');
        return;
    }
    
    const guestList = document.getElementById('guestList');
    if (guestList) {
        const guestItem = document.createElement('div');
        guestItem.className = 'guest-item';
        guestItem.innerHTML = `
            <span>${guestName}</span>
            <button onclick="this.parentElement.remove()" class="remove-guest">
                <i class="fas fa-times"></i>
            </button>
        `;
        guestList.appendChild(guestItem);
        guestInput.value = '';
    }
}

function savePodcastDraft() {
    showToast('Podcast draft saved', 'success');
}

// ============================================
// GO LIVE FUNCTIONS
// ============================================

let selectedLiveOption = null;
let localStream = null;

function selectLiveOption(option) {
    selectedLiveOption = option;
    
    // Update UI
    document.querySelectorAll('.live-option-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Show settings
    document.getElementById('liveSettings').style.display = 'block';
    
    // Show/hide guest invites
    const guestInvites = document.getElementById('guestInvites');
    if (option === 'interview' || option === 'panel') {
        guestInvites.style.display = 'block';
    } else {
        guestInvites.style.display = 'none';
    }
    
    // Initialize stream preview
    initStreamPreview();
    
    showToast(`${option.charAt(0).toUpperCase() + option.slice(1)} stream selected`, 'info');
}

function initStreamPreview() {
    const streamType = document.getElementById('streamType')?.value;
    const constraints = streamType === 'video' 
        ? { video: true, audio: true }
        : { audio: true };
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;
            const preview = document.getElementById('streamPreview');
            if (preview) {
                preview.srcObject = stream;
            }
        })
        .catch(error => {
            showToast('Camera/Microphone access denied', 'error');
        });
}

function stopStreamPreview() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
}

function toggleCamera() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const btn = event.currentTarget;
            btn.innerHTML = videoTrack.enabled 
                ? '<i class="fas fa-video"></i>' 
                : '<i class="fas fa-video-slash"></i>';
        }
    }
}

function toggleMic() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const btn = event.currentTarget;
            btn.innerHTML = audioTrack.enabled 
                ? '<i class="fas fa-microphone"></i>' 
                : '<i class="fas fa-microphone-slash"></i>';
        }
    }
}

function shareScreen() {
    navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(stream => {
            const videoTrack = stream.getVideoTracks()[0];
            const sender = localStream.getSenders().find(
                s => s.track && s.track.kind === 'video'
            );
            if (sender) {
                sender.replaceTrack(videoTrack);
            }
            
            videoTrack.onended = () => {
                // Return to camera when screen share ends
                initStreamPreview();
            };
            
            showToast('Screen sharing started', 'success');
        })
        .catch(error => {
            showToast('Screen share cancelled', 'info');
        });
}

function testAudioVideo() {
    showToast('Testing audio and video...', 'info');
    // Implement actual audio/video test
}

function startLiveStream() {
    const title = document.getElementById('streamTitle')?.value;
    
    if (!title) {
        showToast('Please enter a stream title', 'error');
        return;
    }
    
    // Update live indicator
    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
        liveIndicator.classList.add('active');
        liveIndicator.style.display = 'flex';
    }
    
    // Start streaming (simulated)
    AppState.liveStream = {
        id: generateId(),
        title: title,
        type: selectedLiveOption,
        startedAt: new Date().toISOString(),
        viewers: 0
    };
    
    showToast('You are now live! 🔴', 'success');
    closeGoLiveModal();
    
    // Simulate viewer count increase
    setInterval(() => {
        if (AppState.liveStream) {
            AppState.liveStream.viewers += Math.floor(Math.random() * 10);
            updateViewerCount();
        }
    }, 5000);
}

function scheduleLive() {
    showToast('Live stream scheduled', 'success');
}

function updateViewerCount() {
    const viewerElement = document.getElementById('viewerCount');
    if (viewerElement && AppState.liveStream) {
        viewerElement.textContent = `${AppState.liveStream.viewers} viewers`;
    }
}

// ============================================
// CONNECT FUNCTIONS
// ============================================

function loadConnections() {
    // Simulate loading connections
    showToast('Loading your network...', 'info');
    
    // Update online count
    const onlineCount = Math.floor(Math.random() * 500) + 100;
    const countElement = document.querySelector('.online-count');
    if (countElement) {
        countElement.textContent = onlineCount;
    }
}

function sendConnectionRequest(button) {
    button.textContent = 'Pending';
    button.style.background = '#6B7280';
    button.disabled = true;
    
    showToast('Connection request sent!', 'success');
    
    // Update stats
    AppState.user.following++;
    updateFollowingCount();
}

// Connect tab navigation
document.querySelectorAll('.connect-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        // Update active tab
        document.querySelectorAll('.connect-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Show corresponding content
        const tabName = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        const tabContent = document.getElementById(tabName + 'Tab');
        if (tabContent) {
            tabContent.style.display = 'block';
        }
    });
});

// ============================================
// AI WRITER FUNCTIONS
// ============================================

let currentAIMode = 'generate';

// AI mode selection
document.querySelectorAll('.ai-option-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.ai-option-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentAIMode = this.getAttribute('data-mode');
        
        // Update UI based on mode
        updateAIInterface(currentAIMode);
    });
});

function updateAIInterface(mode) {
    const topicLabel = document.querySelector('#aiTopic').previousElementSibling;
    const instructionsLabel = document.querySelector('#aiInstructions').previousElementSibling;
    
    switch(mode) {
        case 'generate':
            topicLabel.textContent = 'Topic or Keywords';
            instructionsLabel.textContent = 'Additional Instructions';
            break;
        case 'improve':
            topicLabel.textContent = 'Paste Your Content';
            instructionsLabel.textContent = 'What to Improve';
            break;
        case 'ideas':
            topicLabel.textContent = 'General Topic Area';
            instructionsLabel.textContent = 'Specific Angle or Focus';
            break;
        case 'headlines':
            topicLabel.textContent = 'Article Summary';
            instructionsLabel.textContent = 'Headline Style Preferences';
            break;
        case 'translate':
            topicLabel.textContent = 'Content to Translate';
            instructionsLabel.textContent = 'Target Language';
            break;
    }
}

function generateAIContent() {
    const topic = document.getElementById('aiTopic')?.value;
    const tone = document.getElementById('aiTone')?.value;
    const length = document.getElementById('aiLength')?.value;
    const instructions = document.getElementById('aiInstructions')?.value;
    
    if (!topic) {
        showToast('Please provide input for AI generation', 'warning');
        return;
    }
    
    showToast('Generating AI content...', 'info');
    
    // Simulate AI generation
    setTimeout(() => {
        const output = document.getElementById('aiOutput');
        if (output) {
            let generatedContent = '';
            
            switch(currentAIMode) {
                case 'generate':
                    generatedContent = `
                        <h2>${topic}</h2>
                        <p>This is an AI-generated article about ${topic} written in a ${tone} tone.</p>
                        <p>The content would be approximately ${length} and tailored to your specifications.</p>
                        <p>${instructions || 'No additional instructions provided.'}</p>
                    `;
                    break;
                case 'headlines':
                    generatedContent = `
                        <h3>Generated Headlines:</h3>
                        <ul>
                            <li>"Breaking: ${topic} Revolutionizes Industry"</li>
                            <li>"Exclusive: The Inside Story of ${topic}"</li>
                            <li>"How ${topic} is Changing Everything We Know"</li>
                            <li>"${topic}: What You Need to Know Now"</li>
                            <li>"The Truth About ${topic} Revealed"</li>
                        </ul>
                    `;
                    break;
                case 'ideas':
                    generatedContent = `
                        <h3>Content Ideas for ${topic}:</h3>
                        <ul>
                            <li>Deep dive investigation into ${topic}</li>
                            <li>Interview series with experts on ${topic}</li>
                            <li>Data analysis and visualization of ${topic} trends</li>
                            <li>Historical perspective on ${topic}</li>
                            <li>Future predictions for ${topic}</li>
                        </ul>
                    `;
                    break;
                default:
                    generatedContent = `<p>AI-processed content based on your input: ${topic}</p>`;
            }
            
            output.innerHTML = generatedContent;
        }
        showToast('Content generated successfully!', 'success');
    }, 2000);
}

function copyAIContent() {
    const content = document.getElementById('aiOutput')?.innerText;
    if (content) {
        navigator.clipboard.writeText(content).then(() => {
            showToast('Content copied to clipboard', 'success');
        });
    }
}

function downloadAIContent() {
    const content = document.getElementById('aiOutput')?.innerText;
    if (content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai-generated-content.txt';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Content downloaded', 'success');
    }
}

function regenerateContent() {
    showToast('Regenerating content...', 'info');
    generateAIContent();
}

function useAIContent() {
    const content = document.getElementById('aiOutput')?.innerHTML;
    
    // Transfer to news editor
    document.getElementById('newsContent').innerHTML = content;
    closeAIWriter();
    openNewsModal();
    
    showToast('Content transferred to editor', 'success');
}

// ============================================
// PROFILE FUNCTIONS
// ============================================

// Edit Profile button
document.querySelector('.btn-edit-profile')?.addEventListener('click', function() {
    openEditProfileModal();
});

// View Comments button
document.querySelector('.btn-view-comments')?.addEventListener('click', function() {
    openCommentsModal();
});

// Profile form submission
document.getElementById('editProfileForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    showToast('Profile updated successfully', 'success');
    closeEditProfileModal();
});

// ============================================
// REAL-TIME UPDATES
// ============================================

function startRealTimeUpdates() {
    // Update performance stats every 30 seconds
    setInterval(() => {
        updatePerformanceStats();
    }, 30000);
    
    // Update follower count
    setInterval(() => {
        updateFollowerCount();
    }, 60000);
    
    // Simulate notifications
    setInterval(() => {
        simulateNotification();
    }, 120000);
}

function updatePerformanceStats() {
    // Update views
    AppState.performance.views += Math.floor(Math.random() * 100);
    const viewsElement = document.querySelector('.perf-stat:nth-child(1) .perf-value');
    if (viewsElement) {
        viewsElement.textContent = formatNumber(AppState.performance.views);
    }
}

function updateFollowerCount() {
    AppState.user.followers += Math.floor(Math.random() * 5);
    const followerElement = document.querySelector('.stat-number');
    if (followerElement) {
        followerElement.textContent = formatNumber(AppState.user.followers);
    }
}

function updateFollowingCount() {
    const followingElements = document.querySelectorAll('.stat-card:nth-child(2) .stat-number');
    followingElements.forEach(el => {
        el.textContent = AppState.user.following;
    });
}

function simulateNotification() {
    const notifications = [
        'New follower: Tech Enthusiast',
        'Your article is trending!',
        'New comment on your latest post',
        'Live stream viewer milestone: 1000',
        'New connection request'
    ];
    
    const message = notifications[Math.floor(Math.random() * notifications.length)];
    showNotification(message);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// ============================================
// ANIMATIONS
// ============================================

function animateCounters() {
    const counters = document.querySelectorAll('.animated-counter .count');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        if (target) {
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString();
                }
            };
            
            updateCounter();
        }
    });
}

// ============================================
// CHARTS
// ============================================

function initCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') return;
    
    // Initialize any charts on the page
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Views',
                    data: [12000, 19000, 15000, 25000, 22000, 30000, 28500],
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// ============================================
// TOOLTIPS
// ============================================

function initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip-popup';
            tooltip.textContent = this.getAttribute('data-tooltip');
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 0.85rem;
                z-index: 10000;
                pointer-events: none;
                white-space: nowrap;
            `;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            
            this._tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                delete this._tooltip;
            }
        });
    });
}

// ============================================
// NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        padding: 16px 24px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10B981, #059669)' : 
                     type === 'error' ? 'linear-gradient(135deg, #EF4444, #DC2626)' :
                     type === 'warning' ? 'linear-gradient(135deg, #F59E0B, #D97706)' :
                     'linear-gradient(135deg, #3B82F6, #2563EB)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInRight 0.3s ease;
        position: fixed;
        right: 20px;
        top: 20px;
        z-index: 10000;
        max-width: 350px;
    `;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 
                     type === 'error' ? 'fas fa-exclamation-circle' :
                     type === 'warning' ? 'fas fa-exclamation-triangle' :
                     'fas fa-info-circle';
    
    toast.appendChild(icon);
    toast.appendChild(document.createTextNode(message));
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Journalist Dashboard', {
            body: message,
            icon: '/favicon.ico',
            badge: '/badge.png'
        });
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ============================================
// LOCAL STORAGE
// ============================================

function saveToLocalStorage() {
    const data = {
        user: AppState.user,
        articles: AppState.articles,
        videos: AppState.videos,
        podcasts: AppState.podcasts,
        schedules: AppState.schedules,
        drafts: AppState.drafts,
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('journalistProfile', JSON.stringify(data));
}

function loadUserData() {
    const saved = localStorage.getItem('journalistProfile');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.assign(AppState, data);
            refreshUI();
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }
}

function refreshUI() {
    // Refresh article count
    refreshArticlesList();
    
    // Update follower counts
    updateFollowerCount();
    updateFollowingCount();
}

function refreshArticlesList() {
    // Update article count in UI
    const articleCount = AppState.articles.length;
    // Update UI elements that show article count
}

// ============================================
// EVENT LISTENERS
// ============================================

function initializeEventListeners() {
    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K: Quick search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.querySelector('.search-box input')?.focus();
        }
        
        // Ctrl/Cmd + N: New article
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openNewsModal();
        }
        
        // Ctrl/Cmd + Shift + A: AI Assistant
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            openAIWriter();
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });
    
    // Form submissions
    document.getElementById('scheduleForm')?.addEventListener('submit', handleScheduleSubmit);
    document.getElementById('newsForm')?.addEventListener('submit', handleNewsSubmit);
    document.getElementById('vlogForm')?.addEventListener('submit', handleVlogSubmit);
    document.getElementById('podcastForm')?.addEventListener('submit', handlePodcastSubmit);
    
    // File uploads
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function() {
            const label = this.nextElementSibling;
            if (label && label.classList.contains('file-label')) {
                const fileName = this.files[0]?.name || 'Choose file';
                label.querySelector('span').textContent = fileName;
            }
        });
    });
    
    // Auto-save drafts
    setInterval(() => {
        const titleField = document.getElementById('newsTitle');
        const contentField = document.getElementById('newsContent');
        
        if (titleField?.value || contentField?.innerHTML) {
            localStorage.setItem('autosave_draft', JSON.stringify({
                title: titleField.value,
                content: contentField.innerHTML,
                savedAt: new Date().toISOString()
            }));
        }
    }, 30000);
}

// Form Handlers
function handleScheduleSubmit(e) {
    e.preventDefault();
    showToast('Schedule saved successfully', 'success');
    closeScheduleModal();
}

function handleNewsSubmit(e) {
    e.preventDefault();
    postNews();
}

function handleVlogSubmit(e) {
    e.preventDefault();
    uploadVideo();
}

function handlePodcastSubmit(e) {
    e.preventDefault();
    showToast('Podcast episode published!', 'success');
    closePodcastModal();
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

// Make functions available globally
window.journalistProfile = {
    // Modals
    openScheduleModal,
    closeScheduleModal,
    openNewsModal,
    closeNewsModal,
    openVlogModal,
    closeVlogModal,
    openPodcastModal,
    closePodcastModal,
    openGoLiveModal,
    closeGoLiveModal,
    openConnectModal,
    closeConnectModal,
    openAIWriter,
    closeAIWriter,
    openEditProfileModal,
    closeEditProfileModal,
    openCommentsModal,
    closeCommentsModal,
    
    // Functions
    toggleTheme,
    saveDraft,
    postNews,
    previewArticle,
    formatText,
    insertLink,
    insertImage,
    selectLiveOption,
    toggleCamera,
    toggleMic,
    shareScreen,
    testAudioVideo,
    startLiveStream,
    scheduleLive,
    sendConnectionRequest,
    generateAIContent,
    copyAIContent,
    downloadAIContent,
    regenerateContent,
    useAIContent,
    selectRecordingOption,
    togglePodcastRecording,
    addGuest,
    savePodcastDraft,
    showToast
};

console.log('✨ Journalist Profile System v2.0 - All systems operational!');