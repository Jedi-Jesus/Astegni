/**
 * Common Admin Functionality
 * Shared utilities and functions for all admin pages
 */

// Panel, sidebar, and modal managers are loaded as separate scripts
// They will be available globally when needed

/**
 * Initialize common admin functionality
 */
function initializeAdminPage() {
    // Initialize managers (they self-initialize but this ensures order)
    if (typeof panelManager !== 'undefined') panelManager.initialize();
    if (typeof sidebarManager !== 'undefined') sidebarManager.initialize();
    if (typeof modalManager !== 'undefined') modalManager.initialize();

    // Initialize theme toggle
    initializeThemeToggle();

    // Initialize notifications
    initializeNotifications();

    // Initialize tooltips if present
    initializeTooltips();

    // Set up logout functionality
    setupLogout();
}

/**
 * Initialize theme toggle functionality
 */
function initializeThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });

        // Set initial theme from localStorage
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
}

/**
 * Update theme toggle icon
 */
function updateThemeIcon(theme) {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (!themeToggleBtn) return;

    const svg = themeToggleBtn.querySelector('svg');
    if (!svg) return;

    if (theme === 'dark') {
        svg.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z">
            </path>
        `;
    } else {
        svg.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z">
            </path>
        `;
    }
}

/**
 * Initialize notifications
 */
function initializeNotifications() {
    // This would connect to your notification system
    const notificationBtn = document.querySelector('[aria-label="Notifications"]');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            // Open notifications panel/modal
            console.log('Opening notifications...');
        });
    }
}

/**
 * Initialize tooltips
 */
function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const tooltipText = e.target.getAttribute('data-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        pointer-events: none;
    `;
    document.body.appendChild(tooltip);

    const rect = e.target.getBoundingClientRect();
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
    tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;

    e.target._tooltip = tooltip;
}

function hideTooltip(e) {
    if (e.target._tooltip) {
        e.target._tooltip.remove();
        delete e.target._tooltip;
    }
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear session data
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // Redirect to login
            window.location.href = '/index.html';
        }
    };
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;

    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export utilities
window.adminUtils = {
    formatNumber,
    formatDate,
    showToast
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPage);
} else {
    initializeAdminPage();
}

// Make functions globally available
window.initializeAdminPage = initializeAdminPage;
window.showToast = showToast;
window.formatNumber = formatNumber;
window.formatDate = formatDate;