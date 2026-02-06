function createAdPlaceholder(adIndex) {
    const div = document.createElement("div");
    div.className = "reel-card promo-placeholder-card";
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
        <div class="inline-promo-container" style="background: ${ad.color};" onclick="openComingSoonModal('Advertising')">
            <div class="inline-promo-content">
                <span class="inline-promo-label">Ad</span>
                <h3 class="inline-promo-title">${ad.title}</h3>
                <p class="inline-promo-text">${ad.text}</p>
                <button class="inline-promo-cta">Learn More</button>
            </div>
            <div class="inline-promo-visual">
                <div class="ad-pattern"></div>
            </div>
        </div>
    `;

    return div;
}
