// ============================================
// PARENT PROFILE - GLOBAL FUNCTIONS
// Global utility functions for parent profile page
// ============================================

// Panel switching (referenced by HTML onclick handlers)
function switchToPanel(panelId) {
    // This function is often overridden by panel-manager.js
    // But we provide a fallback implementation
    if (typeof window.switchPanel === 'function') {
        window.switchPanel(panelId);
    } else {
        // Fallback: update URL and try to show panel
        window.location.hash = panelId;

        // Hide all panels
        document.querySelectorAll('.profile-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.style.display = 'none';
        });

        // Show target panel
        const targetPanel = document.getElementById(`${panelId}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
            targetPanel.style.display = 'block';
        }

        // Update sidebar
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-panel') === panelId) {
                link.classList.add('active');
            }
        });
    }
}

// Quick actions
function quickAddChild() {
    // Open register child modal
    if (typeof openRegisterChildModal === 'function') {
        openRegisterChildModal();
    } else {
        showNotification('Register child modal not available', 'info');
    }
}

function quickViewSessions() {
    switchToPanel('sessions');
}

function quickManagePayments() {
    switchToPanel('payments');
}

// Utility: Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Utility: Format time ago
function timeAgo(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

// Utility: Truncate text
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Make functions available globally
window.switchToPanel = switchToPanel;
window.quickAddChild = quickAddChild;
window.quickViewSessions = quickViewSessions;
window.quickManagePayments = quickManagePayments;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.truncateText = truncateText;
