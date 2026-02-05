// ============================================
// TRENDING TRACKER
// ============================================
// Tracks tutor views/searches to build trending rankings

const TrendingTracker = {
    /**
     * Track when tutors are displayed in search results
     * @param {Array<number>} tutorIds - Array of tutor IDs that were displayed
     */
    async trackTutorViews(tutorIds) {
        if (!tutorIds || tutorIds.length === 0) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            // Don't track if user is not logged in (optional - you can change this)
            if (!token) {
                console.log('[TrendingTracker] Skipping tracking - user not logged in');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/tutors/track-views`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    tutor_ids: tutorIds
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`[TrendingTracker] Tracked ${data.updated} tutor views`);
            } else {
                console.warn('[TrendingTracker] Failed to track views:', response.status);
            }
        } catch (error) {
            console.warn('[TrendingTracker] Error tracking views:', error.message);
            // Silent fail - tracking should not break user experience
        }
    },

    /**
     * Track a single tutor view (e.g., when profile is opened)
     * @param {number} tutorId - The tutor ID that was viewed
     */
    async trackSingleTutorView(tutorId) {
        return this.trackTutorViews([tutorId]);
    },

    /**
     * Debounced tracker to avoid excessive API calls
     * Collects tutor IDs and sends them in batches
     */
    _pendingTrack: [],
    _trackTimer: null,

    /**
     * Queue tutor IDs for tracking (debounced)
     * @param {Array<number>} tutorIds - Tutor IDs to track
     * @param {number} delay - Delay in ms before sending (default: 2000)
     */
    queueTutorViews(tutorIds, delay = 2000) {
        if (!tutorIds || tutorIds.length === 0) return;

        // Add to pending queue
        this._pendingTrack.push(...tutorIds);

        // Clear existing timer
        if (this._trackTimer) {
            clearTimeout(this._trackTimer);
        }

        // Set new timer
        this._trackTimer = setTimeout(() => {
            // Get unique tutor IDs
            const uniqueIds = [...new Set(this._pendingTrack)];

            // Clear queue
            this._pendingTrack = [];

            // Track
            this.trackTutorViews(uniqueIds);
        }, delay);
    }
};

// Export to window for global access
window.TrendingTracker = TrendingTracker;

console.log('✅ TrendingTracker loaded successfully');
