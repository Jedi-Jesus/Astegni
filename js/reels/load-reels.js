async function loadReels() {
    showLoadingState();

    try {
        // For reels page, we want Ad category videos
        const response = await VideoAPI.getReels(currentFilter, searchQuery, currentPage, videosPerPage, 'Ad');
        
        if (response && response.videos) {
            window.currentReels = response.videos;
            totalVideos = response.total || response.videos.length;
            displayReels(response.videos);
            
            if (response.videos.length === 0 && currentFilter === 'all') {
                showToast("No Ad videos found. Please check with admin.", "info");
            }
        }
    } catch (error) {
        console.error('Error loading reels:', error);
        showErrorState();
    }
}

window.loadReels = loadReels;

function displayReels(reels) {
    const reelsGrid = document.getElementById("reels-grid");
    if (!reelsGrid) return;

    if (reels.length === 0) {
        reelsGrid.innerHTML = renderEmptyState();
        return;
    }

    reelsGrid.innerHTML = '';

    reels.forEach((reel, index) => {
        // Insert ad placeholder every 25 cards
        if (index > 0 && index % 25 === 24) {
            const adPlaceholder = createAdPlaceholder(Math.floor(index / 25));
            reelsGrid.appendChild(adPlaceholder);
        }

        const reelCard = createReelCard(reel, index);
        reelsGrid.appendChild(reelCard);
    });
}
