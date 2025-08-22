// Author Profile JavaScript

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const uploadBookBtn = document.getElementById('uploadBookBtn');
const uploadBookModal = document.getElementById('uploadBookModal');
const viewCommentsBtn = document.getElementById('viewCommentsBtn');
const commentsModal = document.getElementById('commentsModal');
const modalCloses = document.querySelectorAll('.modal-close');
const tabBtns = document.querySelectorAll('.tab-btn');
const videoTabBtns = document.querySelectorAll('.video-tab-btn');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Add transition animation
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('.theme-icon');
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

// Modal Management
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Tab Management
function switchTab(tabBtn) {
    const tabName = tabBtn.dataset.tab;
    
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    tabBtn.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Video Tab Management
function switchVideoTab(videoTabBtn) {
    const videoTabName = videoTabBtn.dataset.videoTab;
    
    // Remove active class from all video tabs and contents
    document.querySelectorAll('.video-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.video-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    videoTabBtn.classList.add('active');
    document.getElementById(videoTabName).classList.add('active');
}

// Book Upload Form Handler
function handleBookUpload(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const bookData = {
        title: formData.get('title'),
        description: formData.get('description'),
        genre: formData.get('genre'),
        price: formData.get('price'),
        date: formData.get('date'),
        cover: formData.get('cover')
    };
    
    // Simulate upload process
    showNotification('Book uploaded successfully!', 'success');
    closeModal(uploadBookModal);
    e.target.reset();
    
    // Add new book to grid (in real app, this would come from server)
    addBookToGrid(bookData);
}

// Add Book to Grid
function addBookToGrid(bookData) {
    const booksGrid = document.querySelector('.books-grid');
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.style.animation = 'fadeIn 0.5s ease';
    
    bookCard.innerHTML = `
        <div class="book-cover">
            <img src="https://via.placeholder.com/200x300/6366f1/ffffff?text=New+Book" alt="${bookData.title}">
            <div class="book-badge">New</div>
        </div>
        <div class="book-info">
            <h3>${bookData.title || 'New Book'}</h3>
            <p class="book-genre">${bookData.genre || 'Genre'}</p>
            <div class="book-rating">
                <span class="stars">⭐⭐⭐⭐⭐</span>
                <span>0.0</span>
            </div>
            <div class="book-price">
                <span class="price">$${bookData.price || '0.00'}</span>
            </div>
            <button class="book-action-btn">View Details</button>
        </div>
    `;
    
    booksGrid.insertBefore(bookCard, booksGrid.firstChild);
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Follow Button Handler
function handleFollowButton() {
    const followBtn = document.querySelector('.btn-follow');
    const isFollowing = followBtn.textContent === 'Following';
    
    if (isFollowing) {
        followBtn.textContent = 'Follow';
        followBtn.style.background = 'linear-gradient(135deg, var(--button-bg), var(--button-hover))';
        updateFollowerCount(-1);
        showNotification('Unfollowed Alexandra Rivers', 'info');
    } else {
        followBtn.textContent = 'Following';
        followBtn.style.background = '#10b981';
        updateFollowerCount(1);
        showNotification('Now following Alexandra Rivers!', 'success');
    }
}

// Update Follower Count
function updateFollowerCount(change) {
    const followerStat = document.querySelector('.follow-stats .stat-value');
    const currentCount = parseFloat(followerStat.textContent);
    const newCount = currentCount + (change * 0.001); // Convert to K
    followerStat.textContent = newCount.toFixed(1) + 'K';
}

// Share Profile Handler
function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: 'Alexandra Rivers - Author Profile',
            text: 'Check out this amazing author!',
            url: window.location.href
        }).then(() => {
            showNotification('Profile shared successfully!', 'success');
        }).catch(console.error);
    } else {
        // Fallback: Copy link to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('Profile link copied to clipboard!', 'success');
        });
    }
}

// Book Details Handler
function showBookDetails(bookCard) {
    const title = bookCard.querySelector('h3').textContent;
    const genre = bookCard.querySelector('.book-genre').textContent;
    const price = bookCard.querySelector('.price').textContent;
    
    // Create and show book details modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
                <img src="https://via.placeholder.com/200x300/6366f1/ffffff?text=Book" alt="${title}" style="width: 100%; border-radius: 10px;">
                <div>
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">${genre}</p>
                    <p style="line-height: 1.8; margin-bottom: 1.5rem;">
                        A captivating story that explores the depths of human emotion and the complexities of modern life. 
                        This masterpiece has captured the hearts of readers worldwide.
                    </p>
                    <div style="display: flex; align-items: center; gap: 2rem; margin-bottom: 1.5rem;">
                        <span style="font-size: 2rem; font-weight: 700; color: var(--button-bg);">${price}</span>
                        <div>
                            <span style="color: #fbbf24;">⭐⭐⭐⭐⭐</span>
                            <span style="color: var(--text-muted);"> 4.8 (523 reviews)</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button class="btn-submit" style="flex: 1;">Buy Now</button>
                        <button class="btn-cancel">Add to Cart</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add close handler
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });
}

// Real-time Analytics Functions
function initRealTimeAnalytics() {
    // Update analytics every 3 seconds
    setInterval(() => {
        updateAnalyticsValues();
    }, 3000);
    
    // Update market trends every 5 seconds
    setInterval(() => {
        updateMarketTrend();
    }, 5000);
    
    // Update fan base every 10 seconds
    setInterval(() => {
        updateFanBase();
    }, 10000);
    
    // Initialize mini chart
    const canvas = document.getElementById('analyticsChart');
    if (canvas) {
        drawMiniChart(canvas);
        // Redraw chart periodically
        setInterval(() => drawMiniChart(canvas), 10000);
    }
}

function updateAnalyticsValues() {
    // Update Active Readers
    const activeReaders = document.getElementById('activeReaders');
    if (activeReaders) {
        const currentValue = parseInt(activeReaders.textContent.replace(',', ''));
        const change = Math.floor(Math.random() * 50) - 25;
        const newValue = Math.max(0, currentValue + change);
        activeReaders.textContent = newValue.toLocaleString();
        
        // Update change indicator
        const changeElement = activeReaders.parentElement.querySelector('.analytic-change');
        if (changeElement) {
            if (change > 0) {
                changeElement.className = 'analytic-change up';
                changeElement.textContent = `+${Math.abs(change)}`;
            } else if (change < 0) {
                changeElement.className = 'analytic-change down';
                changeElement.textContent = `${change}`;
            }
        }
    }
    
    // Update Page Views
    const pageViews = document.getElementById('pageViews');
    if (pageViews) {
        const currentValue = parseFloat(pageViews.textContent.replace('K', ''));
        const change = (Math.random() * 2 - 1).toFixed(1);
        const newValue = Math.max(0, currentValue + parseFloat(change));
        pageViews.textContent = newValue.toFixed(1) + 'K';
    }
    
    // Update Books Sold
    const booksSold = document.getElementById('booksSold');
    if (booksSold) {
        const random = Math.random();
        if (random > 0.7) {
            const currentValue = parseInt(booksSold.textContent);
            booksSold.textContent = currentValue + 1;
            showNotification('New book sold! 🎉', 'success');
            
            // Flash the element
            booksSold.parentElement.style.animation = 'pulse 0.5s';
            setTimeout(() => {
                booksSold.parentElement.style.animation = '';
            }, 500);
        }
    }
    
    // Update Revenue
    const revenue = document.getElementById('revenue');
    if (revenue) {
        const currentValue = parseFloat(revenue.textContent.replace('$', '').replace(',', ''));
        const change = Math.random() * 100;
        const newValue = currentValue + change;
        revenue.textContent = '$' + newValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

function updateFanBase() {
    const fanBase = document.getElementById('fanBase');
    if (fanBase) {
        const currentValue = parseFloat(fanBase.textContent.replace('K', ''));
        
        // Simulate different growth patterns
        const growthPatterns = [
            { change: 0.1, probability: 0.3 },  // Small growth
            { change: 0.5, probability: 0.5 },  // Medium growth
            { change: 1.2, probability: 0.15 }, // Large growth
            { change: -0.2, probability: 0.05 } // Small loss
        ];
        
        const random = Math.random();
        let cumulativeProbability = 0;
        let selectedChange = 0;
        
        for (const pattern of growthPatterns) {
            cumulativeProbability += pattern.probability;
            if (random <= cumulativeProbability) {
                selectedChange = pattern.change;
                break;
            }
        }
        
        const newValue = Math.max(0, currentValue + selectedChange);
        fanBase.textContent = newValue.toFixed(1) + 'K';
        
        // Update change indicator
        const changeElement = fanBase.parentElement.querySelector('.analytic-change');
        if (changeElement) {
            const changeCount = Math.floor(selectedChange * 1000);
            
            if (changeCount > 0) {
                changeElement.className = 'analytic-change up';
                changeElement.textContent = `+${changeCount}`;
                
                // Special notification for milestones
                if (Math.floor(newValue) > Math.floor(currentValue)) {
                    showNotification(`Milestone reached! ${Math.floor(newValue)}K followers! 🎊`, 'success');
                }
            } else if (changeCount < 0) {
                changeElement.className = 'analytic-change down';
                changeElement.textContent = `${changeCount}`;
            }
        }
    }
}

function updateMarketTrend() {
    const marketTrend = document.getElementById('marketTrend');
    if (marketTrend) {
        // Market trend analysis based on multiple factors
        const trends = [
            { indicator: '📈', text: 'Bullish', color: '#10b981', weight: 0.4 },
            { indicator: '📊', text: 'Stable', color: '#f59e0b', weight: 0.3 },
            { indicator: '📉', text: 'Bearish', color: '#ef4444', weight: 0.2 },
            { indicator: '🚀', text: 'Trending', color: '#8b5cf6', weight: 0.1 }
        ];
        
        // Calculate trend based on various metrics
        const random = Math.random();
        let cumulativeWeight = 0;
        let selectedTrend = trends[0];
        
        for (const trend of trends) {
            cumulativeWeight += trend.weight;
            if (random <= cumulativeWeight) {
                selectedTrend = trend;
                break;
            }
        }
        
        const trendIndicator = marketTrend.querySelector('.trend-indicator');
        const trendText = marketTrend.querySelector('.trend-text');
        
        if (trendIndicator && trendText) {
            trendIndicator.textContent = selectedTrend.indicator;
            trendText.textContent = selectedTrend.text;
            trendText.style.color = selectedTrend.color;
            
            // Animate the change
            marketTrend.style.animation = 'scaleIn 0.3s ease';
            setTimeout(() => {
                marketTrend.style.animation = '';
            }, 300);
        }
        
        // Update percentage change
        const changeElement = marketTrend.parentElement.querySelector('.analytic-change');
        if (changeElement) {
            const percentChange = (Math.random() * 10 - 5).toFixed(1);
            
            if (parseFloat(percentChange) > 0) {
                changeElement.className = 'analytic-change up';
                changeElement.textContent = `+${Math.abs(percentChange)}%`;
            } else if (parseFloat(percentChange) < 0) {
                changeElement.className = 'analytic-change down';
                changeElement.textContent = `${percentChange}%`;
            } else {
                changeElement.className = 'analytic-change';
                changeElement.textContent = '0.0%';
            }
        }
        
        // Update market indicators
        updateMarketIndicators();
    }
}

function updateMarketIndicators() {
    // Update Genre Rank
    const indicators = document.querySelectorAll('.indicator-value');
    if (indicators[0]) {
        const ranks = ['#1', '#2', '#3', '#4', '#5'];
        const currentRank = indicators[0].textContent;
        const currentIndex = ranks.indexOf(currentRank);
        
        // Simulate rank changes
        const random = Math.random();
        if (random > 0.8 && currentIndex !== -1) {
            const newIndex = Math.max(0, Math.min(4, currentIndex + (Math.random() > 0.5 ? -1 : 1)));
            if (newIndex !== currentIndex) {
                indicators[0].textContent = ranks[newIndex];
                
                if (newIndex < currentIndex) {
                    indicators[0].style.color = '#10b981';
                    showNotification(`Climbed to ${ranks[newIndex]} in genre rankings! 📈`, 'success');
                } else {
                    indicators[0].style.color = '#ef4444';
                }
                
                setTimeout(() => {
                    indicators[0].style.color = '';
                }, 3000);
            }
        }
    }
    
    // Update Engagement Rate
    if (indicators[1]) {
        const currentValue = parseFloat(indicators[1].textContent);
        const change = (Math.random() * 0.5 - 0.25);
        const newValue = Math.max(0, Math.min(100, currentValue + change));
        indicators[1].textContent = newValue.toFixed(1) + '%';
    }
    
    // Update Sentiment
    if (indicators[2]) {
        const currentValue = parseInt(indicators[2].textContent);
        const change = Math.floor(Math.random() * 5 - 2);
        const newValue = Math.max(0, Math.min(100, currentValue + change));
        indicators[2].textContent = newValue + '%';
        
        // Update color based on value
        if (newValue >= 70) {
            indicators[2].className = 'indicator-value positive';
        } else if (newValue >= 40) {
            indicators[2].className = 'indicator-value';
        } else {
            indicators[2].className = 'indicator-value negative';
        }
    }
}

function drawMiniChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 150;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Generate data points for multiple metrics
    const datasets = [
        { 
            color: '#10b981', 
            data: generateDataPoints(20, height * 0.3, height * 0.5),
            label: 'Fan Growth'
        },
        { 
            color: '#f59e0b', 
            data: generateDataPoints(20, height * 0.4, height * 0.6),
            label: 'Engagement'
        },
        { 
            color: '#8b5cf6', 
            data: generateDataPoints(20, height * 0.2, height * 0.7),
            label: 'Market Trend'
        }
    ];
    
    // Draw each dataset
    datasets.forEach((dataset) => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        
        dataset.data.forEach((point, index) => {
            const x = (width / (dataset.data.length - 1)) * index;
            if (index === 0) {
                ctx.moveTo(x, point);
            } else {
                ctx.lineTo(x, point);
            }
        });
        
        ctx.stroke();
        
        // Fill area under the line with gradient
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, dataset.color + '30');
        gradient.addColorStop(1, dataset.color + '00');
        ctx.fillStyle = gradient;
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
}

function generateDataPoints(count, min, max) {
    const points = [];
    let lastValue = (min + max) / 2;
    
    for (let i = 0; i < count; i++) {
        const change = (Math.random() - 0.5) * (max - min) * 0.3;
        lastValue = Math.max(min, Math.min(max, lastValue + change));
        points.push(lastValue);
    }
    
    return points;
}

// Weather Widget Functions
function updateWeatherWidget() {
    // Simulate weather API call
    const weatherData = {
        temp: 72,
        location: 'Los Angeles, CA',
        description: 'Partly Cloudy',
        high: 78,
        low: 65,
        humidity: 15,
        forecast: [
            { day: 'Mon', icon: '🌤️', temp: 75 },
            { day: 'Tue', icon: '☀️', temp: 79 },
            { day: 'Wed', icon: '🌧️', temp: 68 }
        ]
    };
    
    // Update weather display
    const tempElement = document.querySelector('.weather-temp');
    if (tempElement) {
        tempElement.textContent = weatherData.temp + '°F';
    }
    
    // Update every 10 minutes
    setTimeout(updateWeatherWidget, 600000);
}

// Schedule Functions
function handleScheduleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const scheduleData = {
        type: formData.get('type'),
        title: formData.get('title'),
        date: formData.get('date'),
        time: formData.get('time'),
        duration: formData.get('duration'),
        recurring: formData.get('recurring')
    };
    
    // Add to schedule
    addToSchedule(scheduleData);
    
    showNotification('Event scheduled successfully!', 'success');
    closeModal(document.getElementById('scheduleModal'));
    e.target.reset();
}

function addToSchedule(scheduleData) {
    const scheduleItems = document.querySelector('.schedule-items');
    if (!scheduleItems) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'schedule-item';
    newItem.style.animation = 'fadeIn 0.5s ease';
    
    const date = new Date(scheduleData.date + ' ' + scheduleData.time);
    const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    
    newItem.innerHTML = `
        <div class="schedule-time">${formattedDate}</div>
        <div class="schedule-event">${scheduleData.title}</div>
        <div class="schedule-actions">
            <button class="btn-mini">Edit</button>
            <button class="btn-mini danger">Cancel</button>
        </div>
    `;
    
    scheduleItems.insertBefore(newItem, scheduleItems.firstChild);
}

// Other form handlers
function handlePodcastSubmit(e) {
    e.preventDefault();
    showNotification('Podcast episode published!', 'success');
    closeModal(document.getElementById('podcastModal'));
    e.target.reset();
}

function handleBlogSubmit(e) {
    e.preventDefault();
    showNotification('Blog post published!', 'success');
    closeModal(document.getElementById('createBlogModal'));
    e.target.reset();
}

function handleVideoUpload(e) {
    e.preventDefault();
    showNotification('Video uploaded successfully!', 'success');
    closeModal(document.getElementById('uploadVideoModal'));
    e.target.reset();
}

function handleBookClubCreate(e) {
    e.preventDefault();
    showNotification('Book Club created successfully!', 'success');
    closeModal(document.getElementById('bookClubModal'));
    e.target.reset();
}

// AI Writer Functions
function generateAIContent() {
    const selectedType = document.querySelector('.ai-option.active')?.dataset.type;
    const context = document.querySelector('.ai-input-section textarea')?.value;
    
    if (!context) {
        showNotification('Please provide context or topic', 'error');
        return;
    }
    
    // Show loading state
    const generateBtn = document.getElementById('generateAIContent');
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="ai-icon">⏳</span> Generating...';
    }
    
    // Simulate AI generation
    setTimeout(() => {
        const outputSection = document.querySelector('.ai-output-section');
        const outputDiv = document.querySelector('.ai-output');
        
        if (outputSection && outputDiv) {
            outputSection.style.display = 'block';
            outputDiv.innerHTML = '<p>AI generated content based on: ' + context + '</p>';
        }
        
        // Reset button
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<span class="ai-icon">✨</span> Generate Content';
        }
        
        showNotification('Content generated successfully!', 'success');
    }, 2000);
}

// Live Stream Functions
function initLiveStream() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            const video = document.getElementById('livePreview');
            if (video) {
                video.srcObject = stream;
            }
        })
        .catch(err => {
            console.error('Error accessing media devices:', err);
            showNotification('Camera access denied', 'error');
        });
}

function toggleCamera() {
    const btn = document.getElementById('toggleCamera');
    if (btn) btn.classList.toggle('active');
}

function toggleMic() {
    const btn = document.getElementById('toggleMic');
    if (btn) btn.classList.toggle('active');
}

function toggleScreenShare() {
    const btn = document.getElementById('toggleScreen');
    if (btn) btn.classList.toggle('active');
}

function startLiveStream() {
    const btn = document.getElementById('startLiveBtn');
    if (!btn) return;
    
    if (btn.textContent.includes('Start')) {
        btn.innerHTML = '<span class="live-dot"></span> End Live Stream';
        btn.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
        showNotification('Live stream started!', 'success');
    } else {
        btn.innerHTML = '<span class="live-dot"></span> Start Live Stream';
        btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        showNotification('Live stream ended', 'info');
        closeModal(document.getElementById('goLiveModal'));
    }
}

// Setup Functions
function setupSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search books...';
    searchInput.className = 'search-input';
    searchInput.style.cssText = `
        padding: 0.7rem 1rem;
        border: 2px solid var(--input-bg);
        border-radius: 25px;
        background: var(--input-bg);
        color: var(--text);
        width: 200px;
        transition: all 0.3s ease;
    `;
    
    const storeHeader = document.querySelector('.store-header');
    if (storeHeader) {
        storeHeader.insertBefore(searchInput, storeHeader.firstChild);
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const bookCards = document.querySelectorAll('.book-card');
            
            bookCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const genre = card.querySelector('.book-genre').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || genre.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

function animateStats() {
    const stats = document.querySelectorAll('.stat-value');
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                stat.style.animation = 'fadeIn 0.5s ease';
                statsObserver.unobserve(stat);
            }
        });
    });
    
    stats.forEach(stat => statsObserver.observe(stat));
}

function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress');
    
    const progressObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progress = entry.target;
                const width = progress.style.width;
                progress.style.width = '0';
                
                setTimeout(() => {
                    progress.style.width = width;
                }, 100);
                
                progressObserver.unobserve(progress);
            }
        });
    });
    
    progressBars.forEach(bar => progressObserver.observe(bar));
}

// Main Event Listener
document.addEventListener('DOMContentLoaded', () => {
    // Initialize core features
    initTheme();
    initRealTimeAnalytics();
    updateWeatherWidget();
    
    // Setup UI enhancements
    setupSearch();
    setupLazyLoading();
    animateStats();
    animateProgressBars();
    
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Modal event listeners
    if (uploadBookBtn && uploadBookModal) {
        uploadBookBtn.addEventListener('click', () => openModal(uploadBookModal));
    }
    
    if (viewCommentsBtn && commentsModal) {
        viewCommentsBtn.addEventListener('click', () => openModal(commentsModal));
    }
    
    // New feature buttons
    document.getElementById('setScheduleBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('scheduleModal');
        if (modal) openModal(modal);
    });
    
    document.getElementById('createPodcastBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('podcastModal');
        if (modal) openModal(modal);
    });
    
    document.getElementById('goLiveBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('goLiveModal');
        if (modal) {
            openModal(modal);
            initLiveStream();
        }
    });
    
    document.getElementById('createBlogBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('createBlogModal');
        if (modal) openModal(modal);
    });
    
    document.getElementById('uploadVideoBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('uploadVideoModal');
        if (modal) openModal(modal);
    });
    
    document.getElementById('aiWriterBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('aiWriterModal');
        if (modal) openModal(modal);
    });
    
    document.getElementById('analyticsBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('analyticsModal');
        if (modal) openModal(modal);
    });
    
    document.getElementById('bookClubBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('bookClubModal');
        if (modal) openModal(modal);
    });
    
    // Modal close buttons
    modalCloses.forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal);
        });
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn));
    });
    
    // Video tab switching
    videoTabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchVideoTab(btn));
    });
    
    // Follow button
    const followBtn = document.querySelector('.btn-follow');
    if (followBtn) {
        followBtn.addEventListener('click', handleFollowButton);
    }
    
    // Share button
    const shareBtn = document.querySelector('.btn-share');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }
    
    // Book action buttons
    document.querySelectorAll('.book-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bookCard = e.target.closest('.book-card');
            if (bookCard) showBookDetails(bookCard);
        });
    });
    
    // Form submissions
    document.querySelector('.upload-form')?.addEventListener('submit', handleBookUpload);
    document.querySelector('.schedule-form')?.addEventListener('submit', handleScheduleSubmit);
    document.querySelector('.podcast-form')?.addEventListener('submit', handlePodcastSubmit);
    document.querySelector('.blog-form')?.addEventListener('submit', handleBlogSubmit);
    document.querySelector('.video-form')?.addEventListener('submit', handleVideoUpload);
    document.querySelector('.book-club-form')?.addEventListener('submit', handleBookClubCreate);
    
    // AI Writer
    document.querySelectorAll('.ai-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.ai-option').forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });
    
    document.getElementById('generateAIContent')?.addEventListener('click', generateAIContent);
    
    // Live stream controls
    document.getElementById('toggleCamera')?.addEventListener('click', toggleCamera);
    document.getElementById('toggleMic')?.addEventListener('click', toggleMic);
    document.getElementById('toggleScreen')?.addEventListener('click', toggleScreenShare);
    document.getElementById('startLiveBtn')?.addEventListener('click', startLiveStream);
    
    // Cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal);
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC to close modals
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) closeModal(activeModal);
        }
        
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) searchInput.focus();
        }
        
        // Ctrl/Cmd + B for new blog
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            const modal = document.getElementById('createBlogModal');
            if (modal) openModal(modal);
        }
    });
    
    console.log('Author Profile initialized successfully!');
});