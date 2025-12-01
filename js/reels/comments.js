// ============================================
// COMMENT FUNCTIONS
// ============================================
async function openCommentModal(reelId) {
    selectedReelId = reelId;

    try {
        const response = await VideoAPI.getComments(reelId);
        if (response) {
            displayComments(response.comments || []);
        }

        const modal = document.getElementById("comment-modal");
        if (modal) {
            modal.classList.remove("hidden");
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        showToast("Failed to load comments", "error");
    }
}

function displayComments(comments) {
    const commentList = document.getElementById("comment-list");
    if (!commentList) return;

    if (!comments || comments.length === 0) {
        commentList.innerHTML = `
            <div class="empty-state">
                <p class="text-center opacity-60">No comments yet. Be the first to comment!</p>
            </div>
        `;
        return;
    }

    commentList.innerHTML = comments.map(comment => {
        const userFirstLetter = (comment.user_name || 'U').charAt(0).toUpperCase();
        
        return `
            <div class="comment-item">
                <div class="flex items-start gap-3">
                    ${comment.user_picture ?
                        `<img src="${UrlHelper.getAssetUrl(comment.user_picture)}" alt="${comment.user_name}" 
                             class="w-8 h-8 rounded-full">` :
                        `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            ${userFirstLetter}
                        </div>`
                    }
                    <div class="flex-1">
                        <p class="font-semibold text-sm">${comment.user_name || 'Anonymous'}</p>
                        <p class="text-sm mt-1">${comment.text}</p>
                        <p class="text-xs opacity-60 mt-1">
                            ${new Date(comment.created_at).toLocaleDateString()}
                        </p>
                        ${comment.replies && comment.replies.length > 0 ? `
                            <div class="ml-4 mt-2">
                                ${comment.replies.map(reply => `
                                    <div class="comment-reply mb-2">
                                        <p class="text-sm">
                                            <span class="font-semibold">${reply.user_name || 'Anonymous'}:</span> 
                                            ${reply.text}
                                        </p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function addComment() {
    if (!window.currentUser) {
        showToast("Please login to comment", "warning");
        return;
    }

    const textInput = document.getElementById("new-comment");
    if (!textInput) return;

    const text = textInput.value.trim();
    if (!text) {
        showToast("Please enter a comment", "error");
        return;
    }

    try {
        await VideoAPI.addComment(selectedReelId, text);
        showToast("Comment added successfully");
        
        // Reload comments
        const response = await VideoAPI.getComments(selectedReelId);
        if (response) {
            displayComments(response.comments || []);
        }
        
        textInput.value = "";
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast("Failed to add comment", "error");
    }
}

window.openCommentModal = openCommentModal;
window.closeCommentModal = () => {
    const modal = document.getElementById("comment-modal");
    if (modal) modal.classList.add("hidden");
    selectedReelId = null;
};
window.addComment = addComment;
