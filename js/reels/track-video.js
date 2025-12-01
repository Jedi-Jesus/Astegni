// ============================================
// VIDEO VIEW TRACKING
// ============================================
// 2. Fixed trackVideoView with proper error handling
async function trackVideoView(videoId) {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fire and forget, but handle errors gracefully
        fetch(`${API_BASE_URL}/videos/${videoId}/view`, {
            method: 'POST',
            headers: headers
        }).then(response => {
            // Only log if there's an actual problem (not 401)
            if (!response.ok && response.status !== 401) {
                console.debug('View tracking error (non-critical):', response.status);
            }
        }).catch(err => {
            // Silently ignore network errors for view tracking
            console.debug('View tracking failed (non-critical):', err.message);
        });

    } catch (error) {
        // Don't show error to user for view tracking
        console.debug('View tracking exception (non-critical):', error.message);
    }
}
