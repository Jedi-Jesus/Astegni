// ============================================
// PARENT PROFILE - EDIT HANDLER
// Handles profile editing functionality
// Note: Main edit functions are in parent-profile.html inline script
// This file provides additional edit-related utilities
// ============================================

// Profile field validation
const ParentEditValidation = {
    validateUsername(username) {
        if (!username) return { valid: true };

        // Username rules: 3-30 chars, alphanumeric and underscores only
        const regex = /^[a-zA-Z0-9_]{3,30}$/;
        if (!regex.test(username)) {
            return {
                valid: false,
                error: 'Username must be 3-30 characters, using only letters, numbers, and underscores'
            };
        }
        return { valid: true };
    },

    validateBio(bio) {
        if (!bio) return { valid: true };

        // Bio max length: 500 characters
        if (bio.length > 500) {
            return {
                valid: false,
                error: 'Bio must be less than 500 characters'
            };
        }
        return { valid: true };
    },

    validateQuote(quote) {
        if (!quote) return { valid: true };

        // Quote max length: 200 characters
        if (quote.length > 200) {
            return {
                valid: false,
                error: 'Quote must be less than 200 characters'
            };
        }
        return { valid: true };
    },

    validateLocation(location) {
        if (!location) return { valid: true };

        // Location max length: 100 characters
        if (location.length > 100) {
            return {
                valid: false,
                error: 'Location must be less than 100 characters'
            };
        }
        return { valid: true };
    }
};

// Make validation available globally
window.ParentEditValidation = ParentEditValidation;
