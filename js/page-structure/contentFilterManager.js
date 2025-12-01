// ============================================
// CONTENT FILTER MANAGER
// Filter functions for different content types
// ============================================

// ============================================
// JOBS FILTER
// ============================================

window.filterJobs = function(filter) {
    document.querySelectorAll('#jobs-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    if (window.contentLoader) {
        window.contentLoader.loadJobs(filter);
    }
};

// ============================================
// PODCASTS FILTER
// ============================================

window.filterPodcasts = function(filter) {
    document.querySelectorAll('#podcasts-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Filter podcasts based on status
    if (window.STATE) {
        let podcasts = window.STATE.podcastPlaylists || [];
        if (filter === 'published') {
            podcasts = podcasts.filter(p => p.status !== 'draft');
        } else if (filter === 'draft') {
            podcasts = podcasts.filter(p => p.status === 'draft');
        }
    }

    if (window.Utils) {
        Utils.showToast(`📻 Showing ${filter} podcasts`, "info");
    }
};

// ============================================
// VIDEOS FILTER
// ============================================

window.filterVideos = function(filter) {
    document.querySelectorAll('#videos-content .video-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });

    if (window.videosManager) {
        if (filter === 'draft') {
            const drafts = window.STATE?.videos ? window.STATE.videos.filter(v => v.status === 'draft') : [];
            window.videosManager.showDrafts(drafts);
        } else if (filter === 'published') {
            const published = window.STATE?.videos ? window.STATE.videos.filter(v => v.status !== 'draft') : [];
            window.videosManager.showPublished(published);
        } else {
            window.videosManager.filterVideos(filter);
        }
    }
};

// ============================================
// BLOGS FILTER
// ============================================

window.filterBlogs = function(filter) {
    document.querySelectorAll('#blog-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (window.blogManager) {
        if (filter === 'draft') {
            const drafts = window.STATE?.blogPosts ? window.STATE.blogPosts.filter(b => b.status === 'draft') : [];
            window.blogManager.showDrafts(drafts);
        } else if (filter === 'published') {
            const published = window.STATE?.blogPosts ? window.STATE.blogPosts.filter(b => b.status !== 'draft') : [];
            window.blogManager.showPublished(published);
        } else {
            window.blogManager.loadFilteredPosts(filter);
        }
    }
};

// ============================================
// CLUBS FILTER
// ============================================

window.filterClubs = function(filter) {
    document.querySelectorAll('#clubs-content .clubs-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    if (window.contentLoader) {
        window.contentLoader.loadClubs(filter);
    }
};

// ============================================
// MY PRODUCTS FILTER
// ============================================

window.filterMyProducts = function(filter) {
    document.querySelectorAll('#my-products-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    if (window.contentLoader) {
        window.contentLoader.loadMyProducts(filter);
    }
};

console.log("✅ Content Filter Manager loaded!");
