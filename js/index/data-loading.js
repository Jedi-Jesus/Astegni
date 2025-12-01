
// ============================================
//   DATA LOADING
// ============================================
async function loadRealData() {
    try {
        // Statistics are already loaded by counter-anime.js
        // Remove duplicate API call to avoid 404 error

        const newsResponse = await apiCall("/api/news");
        if (newsResponse.ok) {
            const newsItems = await newsResponse.json();
            if (newsItems.length > 0 && window.updateNewsWithRealData) {
                window.updateNewsWithRealData(newsItems);
            }
        }

        const videosResponse = await apiCall("/api/videos");
        if (videosResponse.ok) {
            const videos = await videosResponse.json();
            if (videos.length > 0 && window.updateVideosWithRealData) {
                window.updateVideosWithRealData(videos);
            }
        }
    } catch (error) {
        console.error("Failed to load data:", error);
    }
}