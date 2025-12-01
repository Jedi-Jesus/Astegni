function createAdPlaceholder(adIndex) {
    const div = document.createElement("div");
    div.className = "reel-card ad-placeholder-card";
    div.style.animationDelay = `${adIndex * 0.1}s`;

    const adVariations = [
        {
            title: "Boost Your Learning",
            text: "Premium tutors available",
            color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        },
        {
            title: "Advertise Here",
            text: "Reach thousands of students",
            color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        },
        {
            title: "Special Offer",
            text: "Get 30% off this month",
            color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        },
        {
            title: "Join as Tutor",
            text: "Start earning today",
            color: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
        }
    ];

    const ad = adVariations[adIndex % adVariations.length];

    div.innerHTML = `
        <div class="inline-ad-container" style="background: ${ad.color};" onclick="openAdAnalyticsModal()">
            <div class="inline-ad-content">
                <span class="inline-ad-label">Ad</span>
                <h3 class="inline-ad-title">${ad.title}</h3>
                <p class="inline-ad-text">${ad.text}</p>
                <button class="inline-ad-cta">Learn More</button>
            </div>
            <div class="inline-ad-visual">
                <div class="ad-pattern"></div>
            </div>
        </div>
    `;

    return div;
}
