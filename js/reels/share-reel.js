function shareReel(reelId) {
    const url = `${window.location.origin}/reel/${reelId}`;

    if (navigator.share) {
        navigator.share({
            title: "Check out this video on Astegni",
            url: url
        }).catch(() => {
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
}
