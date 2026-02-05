// ============================================
// GLOBAL FUNCTIONS MANAGER
// Window functions for HTML onclick handlers
// Extracted from page-structure-3.js for modularity
// ============================================

// ============================================
// PROFILE & SCHEDULE FUNCTIONS
// ============================================

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
    if (window.eventsManager) {
        window.eventsManager.createEvent(newEvent);
        window.eventsManager.updateNextSession();
    }

    Utils.showToast("✅ Schedule saved successfully!", "success");

    const modal = document.getElementById("scheduleModal");
    if (modal) modal.classList.remove("show");
};

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
// FILTER FUNCTIONS
// ============================================

window.filterJobs = function(filter) {
    document.querySelectorAll('#jobs-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    if (window.contentLoader) {
        window.contentLoader.loadJobs(filter);
    }
};

window.filterPodcasts = function(filter) {
    document.querySelectorAll('#podcasts-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    Utils.showToast(`📻 Showing ${filter} podcasts`, "info");
};

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

window.filterBlogs = function(filter) {
    document.querySelectorAll('#blog-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');

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

window.filterClubs = function(filter) {
    document.querySelectorAll('#clubs-content .clubs-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    if (window.contentLoader) {
        window.contentLoader.loadClubs(filter);
    }
};

window.filterMyProducts = function(filter) {
    document.querySelectorAll('#my-products-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    if (window.contentLoader) {
        window.contentLoader.loadMyProducts(filter);
    }
};

// ============================================
// MODAL FUNCTIONS
// ============================================

window.openCreateJobModal = function() {
    Utils.showToast("💼 Opening job creation form...", "info");
};

window.openStoreSetup = function() {
    Utils.showToast("🏪 Opening store setup wizard...", "info");
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

// ============================================
// ACTION FUNCTIONS
// ============================================

window.editJob = function(jobId) {
    Utils.showToast(`✏️ Editing job #${jobId}...`, "info");
};

window.publishJob = function(jobId) {
    if (confirm("Are you sure you want to publish this job post?")) {
        Utils.showToast("✅ Job post published successfully!", "success");
        if (window.contentLoader) {
            window.contentLoader.loadJobs();
        }
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

// REMOVED: shareProfile is now defined in share-profile-manager.js
// This was causing conflicts by overwriting the centralized share modal function
// window.shareProfile = function() {
//     const profileUrl = window.location.href;
//     if (navigator.share) {
//         navigator.share({
//             title: 'Check out my profile',
//             url: profileUrl
//         }).catch(err => console.log('Share failed:', err));
//     } else {
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
            const img = preview?.querySelector("img");
            const placeholder = preview?.querySelector(".upload-placeholder");

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
    if (window.videosManager) {
        window.videosManager.uploadVideo();
    }
};

window.startAdvertising = function() {
    Utils.showToast("📧 Opening advertising registration...", "info");
    setTimeout(() => {
        window.location.href = "#advertising-signup";
    }, 1000);
};

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

// ============================================
// PACKAGE & AD FUNCTIONS (for advertiser profiles)
// ============================================

window.selectPackage = function(packageId) {
    Utils.showToast(`✅ Package ${packageId} selected! Redirecting to checkout...`, "success");
    setTimeout(() => {
        window.location.href = "#checkout";
    }, 1500);
};

window.showPackageType = function(type) {
    document.querySelectorAll('.package-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    const grid = document.getElementById('packagesGrid');
    if (grid && window.AdPackageManager) {
        grid.innerHTML = window.AdPackageManager.getPackagesHTML(type);
    }
};

window.submitCustomPackage = function() {
    Utils.showToast("📧 Custom package request sent! We'll contact you within 24 hours.", "success");
    if (window.modalsManager) {
        window.modalsManager.close('adAnalyticsModal');
    }
};

window.switchMetric = function(metric) {
    if (window.analyticsManager) {
        window.analyticsManager.switchMetric(metric);
    }
};

window.viewAllEvents = function() {
    if (window.eventsManager) {
        window.eventsManager.viewAllEvents();
    }
};

console.log("✅ Global Functions Manager loaded!");
