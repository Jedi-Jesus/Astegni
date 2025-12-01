
// ============================================
// CREATE REEL CARD
// ============================================
// Complete fixed createReelCard function for reels_dynamic.js

function createReelCard(reel, index) {
    const div = document.createElement("div");
    div.className = "reel-card";
    div.style.animationDelay = `${index * 0.1}s`;

    const uploadDate = new Date(reel.upload_date || reel.created_at).toLocaleDateString();
    const videoUrl = UrlHelper.getAssetUrl(reel.video_url);
    const thumbnailUrl = reel.thumbnail_url ? UrlHelper.getAssetUrl(reel.thumbnail_url) : null;
    
    // Fixed profile picture handling with null safety
    const tutorName = reel.tutor_name || 'Unknown';
    const tutorPicture = UrlHelper.getProfilePictureUrl(
        reel.tutor_picture,
        tutorName
    );

    div.innerHTML = `
        <video class="reel-card-video featured-video" onclick="openUltimateVideoModal(${reel.id})" style="cursor: pointer;">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="p-4">
            <h3 class="text-lg font-bold mb-1 featured-title" onclick="openUltimateVideoModal(${reel.id})" style="cursor: pointer;">
                ${reel.title || 'Untitled'} ${reel.video_number || ''}
            </h3>
            <p class="text-sm mb-2 opacity-80 flex items-center gap-2">
                <a href="../view-profile-tier-1/view-tutor.html?tutorId=${reel.tutor_id}" 
                   class="flex items-center gap-2 hover:text-[var(--nav-link-hover)] transition-colors"
                   onclick="event.stopPropagation();">
                    <img src="${tutorPicture}" alt="${tutorName}" 
                         style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
                    ${tutorName}
                </a> 
                <span>•</span>
                <span>${reel.tutor_subject || reel.subject || ''}</span>
            </p>
            <p class="text-sm mb-3 line-clamp-2">${reel.description || ''}</p>
            <div class="flex justify-between items-center mb-3">
                <p class="text-xs opacity-60">${uploadDate}</p>
                <p class="text-xs opacity-60">${reel.views || 0} views</p>
            </div>
        </div>
    `;
    return div;
}

