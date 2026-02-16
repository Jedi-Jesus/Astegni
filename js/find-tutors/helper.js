// ============================================
// HELPER UTILITIES FOR FIND TUTORS
// ============================================

// Notification system
window.showNotification = function(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 max-w-sm`;

    // Style based on type
    switch (type) {
        case 'success':
            notification.className += ' bg-green-100 border-l-4 border-green-500 text-green-700';
            break;
        case 'error':
            notification.className += ' bg-red-100 border-l-4 border-red-500 text-red-700';
            break;
        case 'warning':
            notification.className += ' bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700';
            break;
        default: // info
            notification.className += ' bg-blue-100 border-l-4 border-blue-500 text-blue-700';
    }

    // Add icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
            break;
        case 'error':
            icon = '<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';
            break;
        case 'warning':
            icon = '<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
            break;
        default: // info
            icon = '<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
    }

    notification.innerHTML = `
        <div class="flex items-center">
            ${icon}
            <span>${message}</span>
            <button class="ml-auto pl-3" onclick="this.parentElement.parentElement.remove()">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
};

// Loading state helpers
window.showLoadingState = function() {
    const tutorCardsContainer = document.getElementById('tutorCards');
    if (tutorCardsContainer) {
        tutorCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p class="mt-2 text-gray-600 dark:text-gray-400">Loading tutors...</p>
            </div>
        `;
    }
};

window.hideLoadingState = function() {
    // Loading state is replaced by actual content in renderTutorCards
};

// Utility functions
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Format price helper
window.formatPrice = function(price, currency = CurrencyManager.getCurrency()) {
    if (typeof price === 'number') {
        return `${currency} ${price.toLocaleString()}`;
    }
    return `${currency} ${price}`;
};

// Format rating helper
window.formatRating = function(rating) {
    if (typeof rating === 'number') {
        return rating.toFixed(1);
    }
    return parseFloat(rating).toFixed(1);
};

// Local storage helpers
window.getFromLocalStorage = function(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
};

window.setToLocalStorage = function(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error writing to localStorage:', error);
        return false;
    }
};

// Theme detection
window.isDarkMode = function() {
    return document.documentElement.classList.contains('dark') ||
           document.body.classList.contains('dark-mode');
};

console.log('✅ Helper utilities loaded');