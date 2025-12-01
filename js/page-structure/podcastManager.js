// ============================================
// PODCASTS MANAGER - NEW
// ============================================
class PodcastsManager {
    constructor() {
        this.currentFilter = "all";
    }

    createPlaylist() {
        window.playlistsManager.openModal('podcast');
    }

    refreshPlaylists() {
        window.contentLoader.loadPodcasts();
    }

    playPodcast(podcastId) {
        Utils.showToast("🎧 Playing podcast...", "info");
    }
}