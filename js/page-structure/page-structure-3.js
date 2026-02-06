// ============================================
// TRAINING CENTER PROFILE - PART 3
// REFACTORED: Now imports from modular managers
// ============================================

// This file is kept for backwards compatibility with journalist/institute profiles
// For new implementations, import specific managers directly:
// - utilsManager.js - Utils class with showToast, formatDate
// - profileFunctionsManager.js - saveSchedule, saveProfile, addLocation, etc.
// - contentFilterManager.js - filterJobs, filterPodcasts, filterVideos, etc.
// - modalActionsManager.js - openCreateJobModal, openStoreSetup, etc.
// - contentActionsManager.js - editJob, publishJob, viewApplicants, etc.
// - navigationManager.js - navigateToStore, shareProfile, toggleSidebar

// All functionality has been extracted to modular managers
// Import those managers to use specific features





// Additional managers would continue here...
// (AnalyticsManager, WeatherManager, ModalsManager, AnimationsManager, WidgetsManager, Utils)

// ============================================
// UTILITIES
// ============================================
class Utils {
    static showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;

        const backgrounds = {
            success: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            error: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            info: "var(--primary-gradient, linear-gradient(135deg, #F59E0B 0%, #D97706 100%))",
        };

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${backgrounds[type] || backgrounds.info};
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInUp 0.3s ease, slideOutDown 0.3s ease 2.7s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
        `;

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }
}

// ============================================
// GLOBAL FUNCTIONS FOR HTML HANDLERS
// ============================================

// Schedule functions - ENHANCED
window.saveSchedule = function () {
    const form = document.getElementById("scheduleForm");
    if (!form) return;

    const eventTitle = form.querySelector("#eventTitle")?.value;
    const eventType = form.querySelector("#eventType")?.value;
    const startDateTime = form.querySelector("#startDateTime")?.value;
    const endDateTime = form.querySelector("#endDateTime")?.value;
    const repeatOption = form.querySelector("#repeatOption")?.value;
    const eventLocation = form.querySelector("#eventLocation")?.value;
    const eventDescription = form.querySelector("#eventDescription")?.value;

    if (!eventTitle || !startDateTime) {
        Utils.showToast("⚠️ Please fill in required fields", "error");
        return;
    }

    // Parse date and time
    const startDate = new Date(startDateTime);
    const timeStr = startDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });

    // Create new event
    const newEvent = {
        title: eventTitle,
        type: eventType,
        date: startDate,
        time: timeStr,
        location: eventLocation,
        description: eventDescription,
        attendees: 0,
    };

    // Add event through events manager
    window.eventsManager.createEvent(newEvent);

    // Update profile next session
    window.eventsManager.updateNextSession();

    Utils.showToast("✅ Schedule saved successfully!", "success");

    const modal = document.getElementById("scheduleModal");
    if (modal) modal.classList.remove("show");
};

// Profile functions - ENHANCED
window.saveProfile = function () {
    const form = document.getElementById("editProfileForm");
    if (!form) return;

    const companyName = form.querySelector("#companyName")?.value;
    const centerQuote = form.querySelector("#centerQuote")?.value;
    const aboutUs = form.querySelector("#aboutUs")?.value;

    // Get locations
    const locationInputs = form.querySelectorAll("#locationsContainer input");
    const locations = Array.from(locationInputs)
        .map(input => input.value)
        .filter(value => value.trim() !== "")
        .join(" | ");

    if (!companyName) {
        Utils.showToast("⚠️ Company name is required", "error");
        return;
    }

    // Update UI
    const nameElement = document.getElementById("centerName");
    if (nameElement) nameElement.textContent = companyName;

    const quoteElement = document.getElementById("profileQuote");
    if (quoteElement) quoteElement.textContent = centerQuote;

    const aboutElement = document.getElementById("aboutText");
    if (aboutElement) aboutElement.textContent = aboutUs;

    const locationElement = document.getElementById("locationText");
    if (locationElement) locationElement.textContent = locations;

    // Save to localStorage
    const profileData = {
        companyName,
        quote: centerQuote,
        about: aboutUs,
        location: locations
    };
    localStorage.setItem("profileData", JSON.stringify(profileData));

    Utils.showToast("✅ Profile updated successfully!", "success");

    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.remove("show");
};

window.addLocation = function () {
    const container = document.getElementById("locationsContainer");
    if (container) {
        const locationItem = document.createElement("div");
        locationItem.className = "location-item";
        locationItem.innerHTML = `
            <input type="text" class="form-input" placeholder="Enter location">
            <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
        `;
        container.appendChild(locationItem);
    }
};

window.removeLocation = function (btn) {
    btn.parentElement.remove();
};

window.addSocialMedia = function () {
    const container = document.getElementById("socialMediaContainer");
    if (container) {
        const socialItem = document.createElement("div");
        socialItem.className = "social-item";
        socialItem.innerHTML = `
            <select class="form-select">
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter/X</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="telegram">Telegram</option>
                <option value="website">Website</option>
            </select>
            <input type="text" class="form-input" placeholder="URL or username">
            <button type="button" class="btn-remove" onclick="removeSocial(this)">×</button>
        `;
        container.appendChild(socialItem);
    }
};

window.removeSocial = function (btn) {
    btn.parentElement.remove();
};









// ============================================
// FILTER FUNCTIONS WITH DRAFT SUPPORT
// ============================================

// Jobs filter
window.filterJobs = function(filter) {
    document.querySelectorAll('#jobs-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    window.contentLoader.loadJobs(filter);
};

// Podcasts filter with draft
window.filterPodcasts = function(filter) {
    document.querySelectorAll('#podcasts-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter podcasts based on status
    let podcasts = STATE.podcastPlaylists;
    if (filter === 'published') {
        podcasts = podcasts.filter(p => p.status !== 'draft');
    } else if (filter === 'draft') {
        podcasts = podcasts.filter(p => p.status === 'draft');
    }
    
    // Re-render podcasts
    Utils.showToast(`📻 Showing ${filter} podcasts`, "info");
};

// Videos filter with draft
window.filterVideos = function(filter) {
    document.querySelectorAll('#videos-content .video-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    if (filter === 'draft') {
        // Show draft videos
        const drafts = STATE.videos.filter(v => v.status === 'draft');
        window.videosManager.showDrafts(drafts);
    } else if (filter === 'published') {
        // Show published videos
        const published = STATE.videos.filter(v => v.status !== 'draft');
        window.videosManager.showPublished(published);
    } else {
        // Use existing filter logic
        window.videosManager.filterVideos(filter);
    }
};

// Blogs filter with draft
window.filterBlogs = function(filter) {
    document.querySelectorAll('#blog-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (filter === 'draft') {
        // Show draft blogs
        const drafts = STATE.blogPosts.filter(b => b.status === 'draft');
        window.blogManager.showDrafts(drafts);
    } else if (filter === 'published') {
        // Show published blogs
        const published = STATE.blogPosts.filter(b => b.status !== 'draft');
        window.blogManager.showPublished(published);
    } else {
        window.blogManager.loadFilteredPosts(filter);
    }
};

// Clubs filter
window.filterClubs = function(filter) {
    document.querySelectorAll('#clubs-content .clubs-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    window.contentLoader.loadClubs(filter);
};

// My Products filter
window.filterMyProducts = function(filter) {
    document.querySelectorAll('#my-products-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    window.contentLoader.loadMyProducts(filter);
};

// ============================================
// NEW MODAL AND ACTION FUNCTIONS
// ============================================

window.openCreateJobModal = function() {
    Utils.showToast("💼 Opening job creation form...", "info");
};

window.openStoreSetup = function() {
    Utils.showToast("🏪 Opening store setup wizard...", "info");
    // Could redirect to store setup page
    setTimeout(() => {
        window.location.href = "../branch/store-setup.html";
    }, 1000);
};

window.uploadBook = function() {
    Utils.showToast("📚 Opening book upload form...", "info");
};

window.openCreateClubModal = function() {
    Utils.showToast("🎭 Opening club creation form...", "info");
};

window.editJob = function(jobId) {
    Utils.showToast(`✏️ Editing job #${jobId}...`, "info");
};

window.publishJob = function(jobId) {
    if (confirm("Are you sure you want to publish this job post?")) {
        Utils.showToast("✅ Job post published successfully!", "success");
        // Update job status
        const job = STATE.jobPosts.find(j => j.id === jobId);
        if (job) {
            job.status = 'posted';
            job.postedDate = new Date();
            job.deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            job.applicants = 0;
        }
        window.contentLoader.loadJobs();
    }
};

window.viewApplicants = function(jobId) {
    Utils.showToast(`👥 Opening applicants for job #${jobId}...`, "info");
};

window.viewClubDetails = function(clubId) {
    Utils.showToast(`🎭 Opening club details...`, "info");
};

window.manageClub = function(clubId) {
    Utils.showToast(`⚙️ Opening club management...`, "info");
};

window.navigateToStore = function() {
    window.location.href = "../branch/store.html";
};

window.continueProduct = function(productId) {
    Utils.showToast("📚 Continuing course...", "info");
};

window.launchProduct = function(productId) {
    Utils.showToast("🚀 Launching software...", "info");
};

window.viewProduct = function(productId) {
    Utils.showToast("📦 Opening product details...", "info");
};



window.debugFooterLift = function() {
    const footer = document.querySelector('.footer-section');
    const sidebar = document.querySelector('.left-sidebar');
    
    if (footer && sidebar) {
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const footerVisible = footerRect.top < windowHeight;
        const visibleHeight = footerVisible ? windowHeight - footerRect.top : 0;
        
        console.log('Debug Info:');
        console.log('Footer top:', footerRect.top);
        console.log('Footer height:', footerRect.height);
        console.log('Window height:', windowHeight);
        console.log('Footer visible:', footerVisible);
        console.log('Visible height:', visibleHeight);
        console.log('Current offset:', sidebar.style.getPropertyValue('--footer-offset'));
        console.log('Has footer-visible class:', sidebar.classList.contains('footer-visible'));
        console.log('Sidebar element exists:', !!sidebar);
        
        // Try to apply lift manually for testing
        if (footerVisible && visibleHeight > 20) {
            const testLift = Math.min(visibleHeight * 0.8, 300);
            console.log('🔧 TEST: Should lift by', testLift + 'px');
        }
    }
};



// ============================================
// INITIALIZATION ON DOM READY - MERGED
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize main app
    const app = new TrainingCenterProfile();

    // Replace content loader with updated version for institute profile
    window.contentLoader = new UpdatedContentLoader();
    
    // Initialize community manager
    window.communityManager = new CommunityManager();

    // Make managers globally available
    window.trainingCenterProfile = app;
    window.notificationsManager = app.notifications;
    window.modalsManager = app.modals;
    window.eventsManager = app.events;
    window.analyticsManager = app.analytics;
    window.weatherManager = app.weather;
    window.videosManager = app.videos;
    window.playlistsManager = app.playlists;
    window.blogManager = app.blog;
    window.commentsManager = app.comments;
    window.podcastsManager = app.podcasts;
    
    // Update app references with new managers
    app.content = window.contentLoader;
    app.community = window.communityManager;
    delete app.followers; // Remove old followers reference

    // Expose utility functions
    window.Utils = Utils;

    // Expose individual functions for HTML onclick handlers
    window.toggleTheme = () => app.theme.toggle();
    window.toggleSidebar = () => app.sidebar.toggle();

    // Modal functions
window.openScheduleModal = () => app.modals.open("create-session-modal");  // FIXED
window.closeScheduleModal = () => app.modals.close("create-session-modal"); // FIXED
window.openEditProfileModal = () => app.modals.open("edit-profile-modal");  // FIXED
window.closeEditProfileModal = () => app.modals.close("edit-profile-modal"); // FIXED
    window.openFollowersModal = (type) => window.communityManager.open(type); // Updated
    window.closeCommunityModal = () => window.communityManager.close(); // Updated
    window.openUploadVideoModal = () => app.modals.open("uploadVideoModal");
    window.closeUploadVideoModal = () => app.modals.close("uploadVideoModal");
    window.openCreateBlogModal = () => app.modals.open("createBlogModal");
    window.closeCreateBlogModal = () => app.modals.close("createBlogModal");
    window.publishBlog = () => app.blog.publishBlog();
    window.openCommentsModal = () => app.comments.open();
    window.closeCommentsModal = () => app.comments.close();
    // window.openAdAnalyticsModal = () => app.modals.open("promoAnalyticsModal"); // DISABLED - Now opens coming soon modal (defined elsewhere)
    window.closeAdAnalyticsModal = () => app.modals.close("promoAnalyticsModal");
    window.openAllEventsModal = () => app.events.viewAllEvents();
    window.openAnalyticsModal = () => app.analytics.openModal();

    // Podcast functions
    window.createPodcast = () => Utils.showToast("🎙️ Opening podcast recorder...", "info");

    // Navigation functions
    window.navigateToNews = (category = "all") => {
        window.location.href = `../branch/news.html?category=${category}`;
    };

    window.navigateToMarket = () => {
        window.location.href = "../branch/yeneta-exchange.html";
    };

    // Video functions
    window.goLive = () => app.videos.goLive();

    // Additional helper functions
    window.syncGoogleCalendar = function() {
        Utils.showToast('📅 Connecting to Google Calendar...', 'info');
        setTimeout(() => {
            Utils.showToast('✅ Google Calendar connected!', 'success');
        }, 2000);
    };

    window.syncOutlookCalendar = function() {
        Utils.showToast('📆 Connecting to Outlook Calendar...', 'info');
        setTimeout(() => {
            Utils.showToast('✅ Outlook Calendar connected!', 'success');
        }, 2000);
    };

    window.openJobDetailModal = function(jobId) {
        Utils.showToast(`💼 Opening job details #${jobId}...`, 'info');
    };


    // Add missing global functions
// REMOVED: shareProfile is now defined in share-profile-manager.js
// This was causing conflicts by overwriting the centralized share modal function
// window.shareProfile = function() {
//     const profileUrl = window.location.href;
//     if (navigator.share) {
//         navigator.share({
//             title: 'Check out my tutor profile',
//             url: profileUrl
//         }).catch(err => console.log('Share failed:', err));
//     } else {
//         // Fallback - copy to clipboard
//         navigator.clipboard.writeText(profileUrl);
//         Utils.showToast('📋 Profile link copied to clipboard!', 'success');
//     }
// };

window.toggleSidebar = function() {
    const sidebar = document.getElementById('leftSidebar');
    const mainContainer = document.querySelector('.main-container');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        if (mainContainer) {
            mainContainer.classList.toggle('sidebar-collapsed');
        }
    }
};

    window.openMyClassesModal = function() {
        Utils.showToast('📚 Opening your classes...', 'info');
    };

    window.openConnectModal = function() {
        Utils.showToast("🔗 Opening connection options...", "info");
    };

    window.openClassModal = function() {
        Utils.showToast("📚 Opening class creation...", "info");
    };

    window.openJobModal = function() {
        Utils.showToast("💼 Opening job posting...", "info");
    };

    window.createGroup = function() {
        Utils.showToast("👥 Opening group creation...", "info");
    };

    window.previewThumbnail = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById("thumbnailPreview");
                const img = preview.querySelector("img");
                const placeholder = preview.querySelector(".upload-placeholder");

                if (img) {
                    img.src = e.target.result;
                    img.style.display = "block";
                }
                if (placeholder) {
                    placeholder.style.display = "none";
                }
            };
            reader.readAsDataURL(file);
        }
    };

    window.uploadVideo = function() {
        window.videosManager?.uploadVideo();
    };

    window.startAdvertising = function() {
        Utils.showToast("📧 Opening advertising registration...", "info");
        setTimeout(() => {
            window.location.href = "#advertising-signup";
        }, 1000);
    };

    console.log("✅ Training Center Profile fully initialized!");
    console.log("✅ Institute Profile Updates Loaded!");
});

// Ensure modal styles
function ensureModalStyles() {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.zIndex = "10000";
        modal.style.display = "none";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
    });
}

// Call to ensure styles on load
ensureModalStyles();

console.log("✅ Page Structure 3 loaded (uses modular managers)!");
console.log("   → Using: utilsManager.js, profileFunctionsManager.js, contentFilterManager.js");
console.log("   → Using: modalActionsManager.js, contentActionsManager.js, navigationManager.js");
