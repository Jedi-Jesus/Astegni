// ============================================
// FILTER FUNCTIONS
// ============================================
async function filterReels(filter) {
    console.log(`Filtering reels: ${filter}`);
    currentFilter = filter;
    window.currentFilter = filter; // Update global
    currentPage = 1;

    // Update UI buttons
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    // Show loading
    showLoadingState();

    try {
        const response = await VideoAPI.getReels(filter, searchQuery, currentPage, videosPerPage);
        
        if (response) {
            window.currentReels = response.videos || [];
            totalVideos = response.total || 0;
            displayReels(window.currentReels);
            await updateFilterCounts();
        } else if (filter !== 'all') {
            // User not authenticated for user-specific filters
            showToast("Please login to view " + filter, "warning");
            currentFilter = 'all';
            window.currentFilter = 'all';
            buttons.forEach(btn => {
                btn.classList.toggle("active", btn.dataset.filter === 'all');
            });
            await filterReels('all');
        }
    } catch (error) {
        console.error('Error filtering reels:', error);
        showErrorState();
    }
}

async function updateFilterCounts() {
    const token = localStorage.getItem('access_token');

    // Update "all" count
    const allCountEl = document.getElementById('all-count');
    if (allCountEl) {
        allCountEl.textContent = totalVideos || window.currentReels?.length || '0';
    }

    if (!token) {
        // Not logged in, set user-specific counts to 0
        ['favorites', 'saved', 'liked', 'history'].forEach(type => {
            const el = document.getElementById(`${type}-count`);
            if (el) el.textContent = '0';
        });
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/videos/filter-counts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const counts = await response.json();
            
            // Map backend keys to frontend element IDs
            const countMapping = {
                'all': 'all-count',
                'favorites': 'favorites-count',
                'saved': 'saved-count',
                'liked': 'liked-count',
                'history': 'history-count'
            };

            Object.keys(counts).forEach(key => {
                const elementId = countMapping[key];
                if (elementId) {
                    const el = document.getElementById(elementId);
                    if (el) {
                        el.textContent = counts[key] || '0';
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error fetching filter counts:', error);
    }
}

window.filterReels = filterReels;
window.updateFilterCounts = updateFilterCounts;
