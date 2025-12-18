// ============================================
// DEFAULT AVATAR GENERATOR
// Provides fallback avatar images for users without profile pictures
// Handles 404 errors gracefully
// ============================================

/**
 * Default SVG avatars (base64 encoded) for common user types
 * These are simple, inline SVG images that prevent 404 errors
 */
const DEFAULT_AVATARS = {
    // JPG versions
    'woman-user.jpg': 'https://ui-avatars.com/api/?name=User&background=ec4899&color=fff&size=128',
    'boy-user-image.jpg': 'https://ui-avatars.com/api/?name=Student&background=3b82f6&color=fff&size=128',
    'student-college-boy.jpg': 'https://ui-avatars.com/api/?name=Student+Boy&background=10b981&color=fff&size=128',
    'student-college-girl.jpg': 'https://ui-avatars.com/api/?name=Student+Girl&background=ec4899&color=fff&size=128',
    'student-teenage-boy.jpg': 'https://ui-avatars.com/api/?name=Teen+Boy&background=6366f1&color=fff&size=128',
    'student-teenage-girl.jpg': 'https://ui-avatars.com/api/?name=Teen+Girl&background=f472b6&color=fff&size=128',
    'student-default.jpg': 'https://ui-avatars.com/api/?name=Student&background=8b5cf6&color=fff&size=128',
    'Dad-profile.jpg': 'https://ui-avatars.com/api/?name=Father&background=2563eb&color=fff&size=128',
    'Mom-profile.jpg': 'https://ui-avatars.com/api/?name=Mother&background=d946ef&color=fff&size=128',
    'tutor-woman.jpg': 'https://ui-avatars.com/api/?name=Tutor&background=f59e0b&color=fff&size=128',
    'man-user.jpg': 'https://ui-avatars.com/api/?name=User&background=64748b&color=fff&size=128',
    'tutor-.jpg': 'https://ui-avatars.com/api/?name=Tutor&background=8b5cf6&color=fff&size=128',
    'tutor-default.jpg': 'https://ui-avatars.com/api/?name=Tutor&background=f59e0b&color=fff&size=128',
    // PNG versions (same mappings)
    'boy-user-image.png': 'https://ui-avatars.com/api/?name=Student&background=3b82f6&color=fff&size=128',
    'student-college-boy.png': 'https://ui-avatars.com/api/?name=Student+Boy&background=10b981&color=fff&size=128',
    'student-college-girl.png': 'https://ui-avatars.com/api/?name=Student+Girl&background=ec4899&color=fff&size=128',
    'student-teenage-boy.png': 'https://ui-avatars.com/api/?name=Teen+Boy&background=6366f1&color=fff&size=128',
    'student-teenage-girl.png': 'https://ui-avatars.com/api/?name=Teen+Girl&background=f472b6&color=fff&size=128',
    'student-default.png': 'https://ui-avatars.com/api/?name=Student&background=8b5cf6&color=fff&size=128',
    'Dad-profile.png': 'https://ui-avatars.com/api/?name=Father&background=2563eb&color=fff&size=128',
    'Mom-profile.png': 'https://ui-avatars.com/api/?name=Mother&background=d946ef&color=fff&size=128',
    'tutor-woman.png': 'https://ui-avatars.com/api/?name=Tutor&background=f59e0b&color=fff&size=128',
    'man-user.png': 'https://ui-avatars.com/api/?name=User&background=64748b&color=fff&size=128',
    'tutor-.png': 'https://ui-avatars.com/api/?name=Tutor&background=8b5cf6&color=fff&size=128',
    'tutor-default.png': 'https://ui-avatars.com/api/?name=Tutor&background=f59e0b&color=fff&size=128'
};

/**
 * Generate a default avatar URL for a user
 * @param {string} name - User's name (used to generate personalized avatar)
 * @param {string} type - Avatar type: 'user', 'tutor', 'student', 'parent' (optional)
 * @returns {string} Avatar URL
 */
function getDefaultAvatar(name = 'User', type = 'user') {
    // Clean the name
    const cleanName = (name || 'User').trim();

    // Use UI Avatars service to generate personalized avatars
    // This creates an avatar with the user's initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=4F46E5&color=fff&size=128&bold=true`;
}

/**
 * Get avatar with fallback
 * @param {string} avatarUrl - Primary avatar URL
 * @param {string} fallbackName - Name to use for fallback avatar
 * @returns {string} Avatar URL with fallback
 */
function getAvatarWithFallback(avatarUrl, fallbackName = 'User') {
    return avatarUrl || getDefaultAvatar(fallbackName);
}

/**
 * Handle image error by replacing with default avatar
 * @param {HTMLImageElement} img - The image element that failed to load
 */
function handleImageError(img) {
    if (!img || !img.src) return;

    // Prevent infinite loops
    if (img.dataset.fallbackApplied === 'true') return;
    img.dataset.fallbackApplied = 'true';

    // Extract filename from path
    const filename = img.src.split('/').pop().split('?')[0];

    // Check if we have a default avatar for this filename
    if (DEFAULT_AVATARS[filename]) {
        img.src = DEFAULT_AVATARS[filename];
        img.alt = filename.replace(/\.(jpg|png|jpeg|gif)$/i, '').replace(/-/g, ' ');
        return;
    }

    // Fallback to generic avatar
    const name = img.alt || 'User';
    img.src = getDefaultAvatar(name);
}

/**
 * Initialize default avatar handler
 * Adds error handlers to all existing and future images
 */
function initializeDefaultAvatars() {
    // Handle all existing images
    document.querySelectorAll('img').forEach(img => {
        // Add error handler
        img.addEventListener('error', function() {
            handleImageError(this);
        });

        // Check if image is already broken
        if (img.complete && img.naturalHeight === 0 && img.src) {
            handleImageError(img);
        }
    });

    // Monitor for new images using MutationObserver
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'IMG') {
                    node.addEventListener('error', function() {
                        handleImageError(this);
                    });
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('img').forEach(img => {
                        img.addEventListener('error', function() {
                            handleImageError(this);
                        });
                    });
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('✅ Default avatar handler initialized - 404 errors will be suppressed');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDefaultAvatars);
} else {
    // DOM already loaded
    if (document.body) {
        initializeDefaultAvatars();
    } else {
        // Wait for body to be available
        document.addEventListener('DOMContentLoaded', initializeDefaultAvatars);
    }
}

// Export to window for global access
window.getDefaultAvatar = getDefaultAvatar;
window.getAvatarWithFallback = getAvatarWithFallback;
window.handleImageError = handleImageError;
window.DEFAULT_AVATARS = DEFAULT_AVATARS;

// Export constants for common patterns
window.DEFAULT_AVATAR_CONFIG = {
    background: '4F46E5', // Astegni primary color
    color: 'fff',
    size: 128
};
