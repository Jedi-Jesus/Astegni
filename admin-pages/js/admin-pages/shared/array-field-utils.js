/**
 * Array Field Utilities for Edit Profile Modals
 * Handles hero_title and location arrays in manage_*_profile tables
 */

// Hero Title array field management
window.addHeroTitleField = function(value = '') {
    const container = document.getElementById('heroTitleContainer');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" name="heroTitle[]" value="${escapeHtml(value)}"
            class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="e.g., Course Manager">
        <button type="button" onclick="removeArrayField(this)"
            class="text-red-500 hover:text-red-700 p-2">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
};

// Location array field management
window.addLocationField = function(value = '') {
    const container = document.getElementById('locationContainer');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" name="location[]" value="${escapeHtml(value)}"
            class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="e.g., Addis Ababa, Ethiopia">
        <button type="button" onclick="removeArrayField(this)"
            class="text-red-500 hover:text-red-700 p-2">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
};

// Remove array field
window.removeArrayField = function(button) {
    button.parentElement.remove();
};

// Get all hero titles as array
window.getHeroTitles = function() {
    const inputs = document.querySelectorAll('input[name="heroTitle[]"]');
    return Array.from(inputs).map(input => input.value.trim()).filter(v => v);
};

// Get all locations as array
window.getLocations = function() {
    const inputs = document.querySelectorAll('input[name="location[]"]');
    return Array.from(inputs).map(input => input.value.trim()).filter(v => v);
};

// Populate hero titles from array
window.populateHeroTitles = function(titles) {
    const container = document.getElementById('heroTitleContainer');
    if (!container) return;

    container.innerHTML = '';
    if (Array.isArray(titles) && titles.length > 0) {
        titles.forEach(title => addHeroTitleField(title));
    } else {
        addHeroTitleField(''); // Add one empty field
    }
};

// Populate locations from array
window.populateLocations = function(locations) {
    const container = document.getElementById('locationContainer');
    if (!container) return;

    container.innerHTML = '';
    if (Array.isArray(locations) && locations.length > 0) {
        locations.forEach(loc => addLocationField(loc));
    } else {
        addLocationField(''); // Add one empty field
    }
};

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('Array Field Utils loaded');
