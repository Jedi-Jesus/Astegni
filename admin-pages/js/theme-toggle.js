// Theme Toggle System - Integrates with existing theme.css

// Initialize theme on page load
(function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
})();

// Toggle theme function
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    // Apply theme with smooth transition
    document.documentElement.setAttribute('data-theme', newTheme);

    // Save to localStorage
    localStorage.setItem('theme', newTheme);

    // Update icon
    updateThemeIcon(newTheme);

    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));

    // Update canvas if neural network is active
    if (window.neuralNetwork) {
        window.neuralNetwork.updateThemeColors();
    }
}

// Update theme icon
function updateThemeIcon(theme) {
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    if (!moonIcon || !sunIcon) return;

    if (theme === 'dark') {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }
}

// Listen for system theme changes
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });
}

// Helper function to get CSS variable value
function getCSSVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Export functions for use in other modules
window.themeManager = {
    toggleTheme,
    updateThemeIcon,
    getCSSVariable,
    getCurrentTheme: () => document.documentElement.getAttribute('data-theme')
};

// Make toggleTheme globally accessible for onclick handlers
window.toggleTheme = toggleTheme;