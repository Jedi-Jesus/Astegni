// ============================================
// CONTENT ACTIONS MANAGER
// Actions for content items (jobs, products, clubs, etc.)
// ============================================

// ============================================
// JOB ACTIONS
// ============================================

window.editJob = function(jobId) {
    if (window.Utils) {
        Utils.showToast(`✏️ Editing job #${jobId}...`, "info");
    }
};

window.publishJob = function(jobId) {
    if (confirm("Are you sure you want to publish this job post?")) {
        if (window.Utils) {
            Utils.showToast("✅ Job post published successfully!", "success");
        }
        if (window.contentLoader) {
            window.contentLoader.loadJobs();
        }
    }
};

window.viewApplicants = function(jobId) {
    if (window.Utils) {
        Utils.showToast(`👥 Opening applicants for job #${jobId}...`, "info");
    }
};

// ============================================
// CLUB ACTIONS
// ============================================

window.viewClubDetails = function(clubId) {
    if (window.Utils) {
        Utils.showToast(`🎭 Opening club details...`, "info");
    }
};

window.manageClub = function(clubId) {
    if (window.Utils) {
        Utils.showToast(`⚙️ Opening club management...`, "info");
    }
};

// ============================================
// PRODUCT ACTIONS
// ============================================

window.continueProduct = function(productId) {
    if (window.Utils) {
        Utils.showToast("📚 Continuing course...", "info");
    }
};

window.launchProduct = function(productId) {
    if (window.Utils) {
        Utils.showToast("🚀 Launching software...", "info");
    }
};

window.viewProduct = function(productId) {
    if (window.Utils) {
        Utils.showToast("📦 Opening product details...", "info");
    }
};

// ============================================
// VIDEO ACTIONS
// ============================================

window.uploadVideo = function() {
    if (window.videosManager) {
        window.videosManager.uploadVideo();
    }
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

console.log("✅ Content Actions Manager loaded!");
