// ============================================
// PARENT PROFILE RESOURCES MANAGER
// Handles My Resources panel functionality
// ============================================

/**
 * Switch between resource tabs (Recent, Favorites, Shared)
 * @param {string} tabName - The name of the tab to switch to ('recent', 'favorites', 'shared')
 */
function switchResourceTab(tabName) {
    console.log(`🔄 [Resources] Switching to tab: ${tabName}`);

    // Hide all tab contents
    const allContents = document.querySelectorAll('.resource-tab-content');
    allContents.forEach(content => {
        content.classList.add('hidden');
    });

    // Show selected tab content
    const selectedContent = document.getElementById(`${tabName}-content`);
    if (selectedContent) {
        selectedContent.classList.remove('hidden');
        console.log(`✅ Tab content "${tabName}" activated`);
    } else {
        console.error(`❌ Tab content "${tabName}-content" not found`);
    }

    // Update tab button styles
    const allTabs = document.querySelectorAll('.resource-tab');
    allTabs.forEach(tab => {
        tab.classList.remove('text-blue-600', 'border-blue-600');
        tab.classList.add('text-gray-600', 'border-transparent');
    });

    // Activate selected tab button
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.remove('text-gray-600', 'border-transparent');
        selectedTab.classList.add('text-blue-600', 'border-blue-600');
        console.log(`✅ Tab button "${tabName}" activated`);
    }
}

/**
 * Filter resources by category (Videos, Documents, Plans, Bookmarks)
 * @param {string} category - The category to filter ('videos', 'documents', 'plans', 'bookmarks')
 */
function filterResources(category) {
    console.log(`🔍 [Resources] Filtering by category: ${category}`);

    // Visual feedback on category card
    const allCards = document.querySelectorAll('.resource-category-card');
    allCards.forEach(card => {
        card.classList.remove('ring-2', 'ring-blue-500', 'shadow-xl');
        card.style.transform = '';
    });

    const selectedCard = document.querySelector(`.resource-category-card[data-category="${category}"]`);
    if (selectedCard) {
        selectedCard.classList.add('ring-2', 'ring-blue-500', 'shadow-xl');
        selectedCard.style.transform = 'scale(1.05)';

        // Remove highlight after 1 second
        setTimeout(() => {
            selectedCard.classList.remove('ring-2', 'ring-blue-500');
            selectedCard.style.transform = '';
        }, 1000);
    }

    // Switch to Recent tab when filtering
    switchResourceTab('recent');

    // TODO: Implement actual filtering logic here
    // This would filter the displayed resources based on the selected category
    // For now, we're just providing visual feedback

    console.log(`✅ Category "${category}" filter applied`);
}

/**
 * Remove a resource from the list
 * @param {string} resourceId - The ID of the resource to remove
 */
function removeResource(resourceId) {
    console.log(`🗑️ [Resources] Removing resource: ${resourceId}`);

    // TODO: Implement API call to remove resource from database

    // For now, just show confirmation
    if (confirm('Are you sure you want to remove this resource?')) {
        // Remove the resource card from DOM
        const resourceCard = document.querySelector(`[data-resource-id="${resourceId}"]`);
        if (resourceCard) {
            resourceCard.style.transition = 'opacity 0.3s, transform 0.3s';
            resourceCard.style.opacity = '0';
            resourceCard.style.transform = 'scale(0.9)';

            setTimeout(() => {
                resourceCard.remove();
                console.log(`✅ Resource "${resourceId}" removed from DOM`);
            }, 300);
        }
    }
}

/**
 * Share a resource with another user
 * @param {string} resourceId - The ID of the resource to share
 */
function shareResource(resourceId) {
    console.log(`🔗 [Resources] Sharing resource: ${resourceId}`);

    // TODO: Implement share modal
    alert('Share functionality coming soon!');
}

/**
 * Open a resource (video, document, link, etc.)
 * @param {string} resourceId - The ID of the resource to open
 * @param {string} resourceType - The type of resource ('video', 'pdf', 'link', etc.)
 */
function openResource(resourceId, resourceType) {
    console.log(`📂 [Resources] Opening resource: ${resourceId} (type: ${resourceType})`);

    // TODO: Implement resource opening logic based on type
    // For videos: Open video player modal
    // For PDFs: Open in new tab or PDF viewer
    // For links: Open in new tab

    alert(`Opening ${resourceType} resource: ${resourceId}`);
}

/**
 * Toggle favorite status of a resource
 * @param {string} resourceId - The ID of the resource
 */
function toggleFavorite(resourceId) {
    console.log(`⭐ [Resources] Toggling favorite for resource: ${resourceId}`);

    // TODO: Implement API call to toggle favorite status

    const resourceCard = document.querySelector(`[data-resource-id="${resourceId}"]`);
    if (resourceCard) {
        const favoriteBtn = resourceCard.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('text-yellow-500');
            favoriteBtn.classList.toggle('text-gray-400');
        }
    }
}

/**
 * Initialize resources manager
 */
function initResourcesManager() {
    console.log('📚 Initializing Resources Manager...');

    // Default to Recent tab
    switchResourceTab('recent');

    // Listen for panel switch events
    window.addEventListener('panelSwitch', (event) => {
        if (event.detail.panelName === 'my-resources') {
            console.log('📚 My Resources panel activated, refreshing data...');
            // TODO: Load resources data from API
        }
    });

    console.log('✅ Resources Manager initialized');
}

// Export to window for onclick handlers
window.switchResourceTab = switchResourceTab;
window.filterResources = filterResources;
window.removeResource = removeResource;
window.shareResource = shareResource;
window.openResource = openResource;
window.toggleFavorite = toggleFavorite;
window.initResourcesManager = initResourcesManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResourcesManager);
} else {
    // DOM already loaded
    initResourcesManager();
}

console.log('✅ Resources Manager module loaded');
