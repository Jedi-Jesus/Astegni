// ============================================
// PLAYLIST FUNCTIONS
// ============================================
async function openPlaylistModal(reelId) {
    if (!window.currentUser) {
        showToast("Please login to save videos", "warning");
        return;
    }

    selectedReelId = reelId;

    try {
        const playlists = await VideoAPI.getPlaylists();
        displayPlaylists(playlists || []);

        const modal = document.getElementById("playlist-modal");
        if (modal) {
            modal.classList.remove("hidden");
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
        showToast("Failed to load playlists", "error");
    }
}

function displayPlaylists(playlists) {
    const playlistList = document.getElementById("existing-playlists");
    if (!playlistList) return;

    if (!playlists || playlists.length === 0) {
        playlistList.innerHTML = `
            <div class="empty-state">
                <p class="text-center opacity-60">No playlists yet. Create your first playlist above!</p>
            </div>
        `;
        return;
    }

    playlistList.innerHTML = playlists.map(playlist => `
        <div class="playlist-item">
            <button class="flex-1 text-left" onclick="addToPlaylist(${playlist.id})">
                ${playlist.name}
            </button>
            <span class="text-xs opacity-60">${playlist.video_count || 0} videos</span>
        </div>
    `).join('');
}

async function createPlaylist() {
    const nameInput = document.getElementById("new-playlist-name");
    if (!nameInput) return;

    const name = nameInput.value.trim();
    if (!name) {
        showToast("Please enter a playlist name", "error");
        return;
    }

    try {
        const result = await VideoAPI.createPlaylist(name);
        if (result) {
            showToast("Playlist created successfully");
            
            // Add video to new playlist if one was selected
            if (selectedReelId && result.id) {
                await VideoAPI.addToPlaylist(result.id, selectedReelId);
            }
            
            // Reload playlists
            const playlists = await VideoAPI.getPlaylists();
            displayPlaylists(playlists || []);
            
            nameInput.value = "";
        }
    } catch (error) {
        console.error('Error creating playlist:', error);
        showToast("Failed to create playlist", "error");
    }
}

async function addToPlaylist(playlistId) {
    try {
        await VideoAPI.addToPlaylist(playlistId, selectedReelId);
        showToast("Added to playlist");
        closePlaylistModal();
        
        // Update save status
        await updateFilterCounts();
    } catch (error) {
        console.error('Error adding to playlist:', error);
        showToast("Failed to add to playlist", "error");
    }
}

window.openPlaylistModal = openPlaylistModal;
window.closePlaylistModal = () => {
    const modal = document.getElementById("playlist-modal");
    if (modal) modal.classList.add("hidden");
    selectedReelId = null;
};
window.createPlaylist = createPlaylist;
window.addToPlaylist = addToPlaylist;
