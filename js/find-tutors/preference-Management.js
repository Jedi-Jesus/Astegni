    // ============================================
// PREFERENCES MANAGEMENT
// ============================================

const PreferencesManager = {
    // Get saved preferences from localStorage
    getFavorites() {
        return JSON.parse(localStorage.getItem('favoriteTutors') || '[]');
    },
    
    getSaved() {
        return JSON.parse(localStorage.getItem('savedTutors') || '[]');
    },
    
    getSearchHistory() {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    },
    
    // Add/remove favorites
    toggleFavorite(tutorId) {
        let favorites = this.getFavorites();
        const index = favorites.indexOf(tutorId);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(tutorId);
        }
        localStorage.setItem('favoriteTutors', JSON.stringify(favorites));
        return favorites.includes(tutorId);
    },
    
    // Add/remove saved
    toggleSaved(tutorId) {
        let saved = this.getSaved();
        const index = saved.indexOf(tutorId);
        if (index > -1) {
            saved.splice(index, 1);
        } else {
            saved.push(tutorId);
        }
        localStorage.setItem('savedTutors', JSON.stringify(saved));
        return saved.includes(tutorId);
    },
    
    // Add search to history when user searches and gets results
    addSearchToHistory(searchTerm, tutorIds) {
        if (!searchTerm || searchTerm.trim() === '' || !tutorIds || tutorIds.length === 0) return;

        let history = this.getSearchHistory();
        const timestamp = new Date().toISOString();

        // Add new search entry with tutor IDs
        const searchEntry = {
            searchTerm: searchTerm,
            tutorIds: tutorIds,
            timestamp: timestamp
        };

        // Remove duplicate searches
        history = history.filter(item => item.searchTerm !== searchTerm);

        // Add to beginning
        history.unshift(searchEntry);

        // Keep only last 20 searches
        history = history.slice(0, 20);

        localStorage.setItem('searchHistory', JSON.stringify(history));
    },

    // Add tutor view to search history
    addTutorViewToHistory(searchTerm, tutorId) {
        if (!searchTerm || searchTerm.trim() === '' || !tutorId) return;

        let history = this.getSearchHistory();
        const timestamp = new Date().toISOString();

        // Find existing search entry or create new one
        let searchEntry = history.find(item => item.searchTerm === searchTerm);

        if (searchEntry) {
            // Add tutor ID if not already there
            if (!searchEntry.tutorIds.includes(tutorId)) {
                searchEntry.tutorIds.push(tutorId);
            }
            searchEntry.lastViewed = timestamp;
        } else {
            // Create new entry
            searchEntry = {
                searchTerm: searchTerm,
                tutorIds: [tutorId],
                timestamp: timestamp,
                lastViewed: timestamp
            };
            history.unshift(searchEntry);
        }

        // Keep only last 20 searches
        history = history.slice(0, 20);

        localStorage.setItem('searchHistory', JSON.stringify(history));
    },

    // Get all tutor IDs from search history
    getSearchHistoryTutorIds() {
        const history = this.getSearchHistory();
        const tutorIds = new Set();

        history.forEach(entry => {
            if (entry.tutorIds && Array.isArray(entry.tutorIds)) {
                entry.tutorIds.forEach(id => tutorIds.add(id));
            }
        });

        return Array.from(tutorIds);
    }
};
