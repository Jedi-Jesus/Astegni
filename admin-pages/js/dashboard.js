// Dashboard Main Functionality

// Initialize dashboard when authenticated
function initializeDashboard() {
    // Start live clock
    startLiveClock();

    // Animate stat counters
    animateStatCounters();

    // Initialize random stat updates
    startRandomStatUpdates();

    // Update last backup time
    updateLastBackup();

    // Initialize tooltips
    initializeTooltips();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    console.log('Dashboard initialized successfully');
}

// Live Clock
function startLiveClock() {
    const updateClock = () => {
        const now = new Date();

        // Format time
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}:${seconds}`;

        // Format date
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const dateString = now.toLocaleDateString('en-US', options);

        // Update DOM
        const timeElement = document.getElementById('current-time');
        const dateElement = document.getElementById('current-date');

        if (timeElement) timeElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString;
    };

    // Update immediately
    updateClock();

    // Update every second
    setInterval(updateClock, 1000);
}

// Animate stat counters on load
function animateStatCounters() {
    const animateValue = (element, start, end, duration) => {
        if (!element) return;

        const startTime = performance.now();
        const range = end - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const current = Math.round(start + range * easeOutQuart);

            // Format number based on magnitude
            if (current >= 1000) {
                element.textContent = (current / 1000).toFixed(1) + 'k';
            } else {
                element.textContent = current;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    };

    // Animate connections counter
    const connections = document.getElementById('active-connections');
    if (connections) {
        animateValue(connections, 0, 187, 2000);
    }

    // Animate requests counter
    const requests = document.getElementById('requests-per-min');
    if (requests) {
        animateValue(requests, 0, 2400, 2500);
    }

    // Animate active users
    const users = document.getElementById('active-users');
    if (users) {
        animateValue(users, 0, 1247, 2000);
    }
}

// Random stat updates to simulate real-time data
function startRandomStatUpdates() {
    setInterval(() => {
        // Update active connections
        const connections = document.getElementById('active-connections');
        if (connections) {
            const current = parseInt(connections.textContent) || 187;
            const change = Math.floor(Math.random() * 11) - 5; // -5 to +5
            const newValue = Math.max(150, Math.min(250, current + change));
            connections.textContent = newValue;
        }

        // Update requests per minute
        const requests = document.getElementById('requests-per-min');
        if (requests) {
            const base = 2400;
            const variance = Math.floor(Math.random() * 1000) - 500;
            const newValue = base + variance;
            requests.textContent = (newValue / 1000).toFixed(1) + 'k';
        }
    }, 5000); // Update every 5 seconds
}

// Update last backup time
function updateLastBackup() {
    const updateBackupTime = () => {
        const element = document.getElementById('last-backup');
        if (!element) return;

        // Simulate different backup times
        const times = ['2 hours ago', '3 hours ago', '1 hour ago', '4 hours ago'];
        const randomTime = times[Math.floor(Math.random() * times.length)];
        element.textContent = randomTime;
    };

    // Update immediately
    updateBackupTime();

    // Update every minute
    setInterval(updateBackupTime, 60000);
}

// Initialize tooltips for interactive elements
function initializeTooltips() {
    // Add tooltips to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.title = 'Click for detailed analytics';
    });

    // Add tooltips to action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        const label = btn.querySelector('.action-label');
        if (label) {
            btn.title = `Navigate to ${label.textContent}`;
        }
    });
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Escape to close modals
        if (e.key === 'Escape') {
            closeAllModals();
        }

        // Ctrl/Cmd + K for search (future feature)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            console.log('Search shortcut triggered');
        }

        // Ctrl/Cmd + / for help (future feature)
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            console.log('Help shortcut triggered');
        }
    });
}

// Navigation functions - REMOVED: Conflicts with auth.js navigateToPage
// The actual navigation is handled by auth.js requireAuth() -> navigateToPage()
// This function was overwriting the working implementation from auth.js

// Modal functions
function openBackupModal() {
    alert('Backup functionality would be implemented here');
}

function openSettingsModal() {
    alert('Settings panel would be implemented here');
}

function closeAllModals() {
    // Close auth modal if open
    const authModal = document.getElementById('auth-modal');
    if (authModal && authModal.classList.contains('active')) {
        closeAuthModal();
    }

    // Close dropdown menus
    const dropdowns = document.querySelectorAll('.dropdown-menu.active');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

// Notification badge update
function updateNotificationBadge(count) {
    const badges = document.querySelectorAll('.notification-button .badge');
    badges.forEach(badge => {
        badge.textContent = count;
        if (count === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'block';
        }
    });
}

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Reinitialize components that need recalculation
        if (window.neuralNetwork) {
            window.neuralNetwork.setupCanvas();
        }
    }, 250);
});

// Handle visibility change (tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is not visible
        if (window.neuralNetwork) {
            window.neuralNetwork.pause();
        }
    } else {
        // Resume animations when tab becomes visible
        if (window.neuralNetwork) {
            window.neuralNetwork.resume();
        }
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated before initializing
    const isAuthenticated = localStorage.getItem('adminAuth') === 'true';

    if (isAuthenticated) {
        // Initialize dashboard immediately
        initializeDashboard();
    }

    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    // Prevent context menu on canvas
    const canvas = document.getElementById('neural-network');
    if (canvas) {
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    // Add page transition animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// Export functions for global access
window.initializeDashboard = initializeDashboard;
// window.navigateToPage = navigateToPage; // REMOVED: Conflicts with auth.js
window.openBackupModal = openBackupModal;
window.openSettingsModal = openSettingsModal;
window.updateNotificationBadge = updateNotificationBadge;