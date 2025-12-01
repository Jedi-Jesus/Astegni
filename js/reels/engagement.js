// ============================================
// ENGAGEMENT FUNCTIONS
// ============================================
async function toggleEngagement(reelId, type) {
    if (!window.currentUser && type !== 'share') {
        showToast("Please login to interact with videos", "warning");
        return;
    }

    if (type === 'share') {
        shareReel(reelId);
        return;
    }

    try {
        // Correct engagement type mapping
        const engagementMap = {
            'like': 'like',
            'dislike': 'dislike',
            'favorite': 'favorite', // Fixed: was 'favorites'
            'save': 'save'
        };

        const result = await VideoAPI.toggleEngagement(reelId, engagementMap[type]);
        
        if (result) {
            // Show notification
            const messages = {
                'like': result.message.includes('Removed') ? 'Like removed' : '👍 Liked!',
                'dislike': result.message.includes('Removed') ? 'Dislike removed' : '👎 Disliked',
                'favorite': result.message.includes('Removed') ? 'Removed from favorites' : '❤️ Added to favorites!',
                'save': result.message.includes('Removed') ? 'Removed from saved' : '📌 Saved!'
            };

            showToast(messages[type] || result.message);

            // Update local data
            if (window.currentReels) {
                const videoIndex = window.currentReels.findIndex(r => r.id === parseInt(reelId));
                if (videoIndex !== -1) {
                    const video = window.currentReels[videoIndex];
                    const isRemoving = result.message.includes('Removed');

                    if (!video.user_engagement) {
                        video.user_engagement = {};
                    }

                    // Update engagement states and counts
                    switch(type) {
                        case 'like':
                            video.user_engagement.like = !isRemoving;
                            video.likes = Math.max(0, (video.likes || 0) + (isRemoving ? -1 : 1));
                            if (!isRemoving && video.user_engagement.dislike) {
                                video.user_engagement.dislike = false;
                                video.dislikes = Math.max(0, (video.dislikes || 0) - 1);
                            }
                            break;
                        case 'dislike':
                            video.user_engagement.dislike = !isRemoving;
                            video.dislikes = Math.max(0, (video.dislikes || 0) + (isRemoving ? -1 : 1));
                            if (!isRemoving && video.user_engagement.like) {
                                video.user_engagement.like = false;
                                video.likes = Math.max(0, (video.likes || 0) - 1);
                            }
                            break;
                        case 'favorite':
                            video.user_engagement.favorite = !isRemoving;
                            video.favorites = Math.max(0, (video.favorites || 0) + (isRemoving ? -1 : 1));
                            break;
                        case 'save':
                            video.user_engagement.save = !isRemoving;
                            video.saves = Math.max(0, (video.saves || 0) + (isRemoving ? -1 : 1));
                            break;
                    }
                }
            }

            // Update filter counts
            await updateFilterCounts();

            // If viewing filtered list and item removed, refresh
            if (window.currentFilter && window.currentFilter !== 'all') {
                const shouldRefresh = (
                    (window.currentFilter === 'liked' && type === 'like' && result.message.includes('Removed')) ||
                    (window.currentFilter === 'saved' && type === 'save' && result.message.includes('Removed')) ||
                    (window.currentFilter === 'favorites' && type === 'favorite' && result.message.includes('Removed'))
                );

                if (shouldRefresh) {
                    setTimeout(() => {
                        filterReels(window.currentFilter);
                    }, 500);
                }
            }
        }
    } catch (error) {
        console.error('Error toggling engagement:', error);
        showToast("Failed to update", "error");
    }
}

window.toggleEngagement = toggleEngagement;
