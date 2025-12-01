// ============================================
// MODAL ACTIONS MANAGER
// Functions to open various modals
// ============================================

window.openCreateJobModal = function() {
    if (window.Utils) {
        Utils.showToast("💼 Opening job creation form...", "info");
    }
};

window.openStoreSetup = function() {
    if (window.Utils) {
        Utils.showToast("🏪 Opening store setup wizard...", "info");
    }
    setTimeout(() => {
        window.location.href = "../branch/store-setup.html";
    }, 1000);
};

window.uploadBook = function() {
    if (window.Utils) {
        Utils.showToast("📚 Opening book upload form...", "info");
    }
};

window.openCreateClubModal = function() {
    if (window.Utils) {
        Utils.showToast("🎭 Opening club creation form...", "info");
    }
};

window.openMyClassesModal = function() {
    if (window.Utils) {
        Utils.showToast('📚 Opening your classes...', 'info');
    }
};

window.openConnectModal = function() {
    if (window.Utils) {
        Utils.showToast("🔗 Opening connection options...", "info");
    }
};

window.openClassModal = function() {
    if (window.Utils) {
        Utils.showToast("📚 Opening class creation...", "info");
    }
};

window.openJobModal = function() {
    if (window.Utils) {
        Utils.showToast("💼 Opening job posting...", "info");
    }
};

window.openJobDetailModal = function(jobId) {
    if (window.Utils) {
        Utils.showToast(`💼 Opening job details #${jobId}...`, 'info');
    }
};

window.createGroup = function() {
    if (window.Utils) {
        Utils.showToast("👥 Opening group creation...", "info");
    }
};

console.log("✅ Modal Actions Manager loaded!");
