// News Section Module
(function() {
    'use strict';

    // Hard-coded news items. The launch item's user count is filled in live
    // from /api/statistics (see refreshLaunchNews). Astegni launched on
    // 2025-12-01 (date of first production deployment).
    const newsData = [
        {
            title: "Astegni Has Launched!",
            content: "Astegni launched its website on December 1, 2025, and is now serving a growing community of users.",
            date: "Dec 1, 2025",
            category: "Announcement"
        },
        {
            title: "More Education News Coming Soon",
            content: "Other education news and announcements are coming soon. Stay tuned!",
            date: "Coming soon",
            category: "Education"
        }
    ];

    let currentNewsIndex = 0;
    let typingInterval;
    let isTyping = false;

    function typeNews(text, element, callback) {
        if (isTyping) return;
        isTyping = true;

        let charIndex = 0;
        element.textContent = '';

        typingInterval = setInterval(() => {
            if (charIndex < text.length) {
                element.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typingInterval);
                isTyping = false;
                if (callback) callback();
            }
        }, 30);
    }

    function backspaceNews(element, callback) {
        if (isTyping) return;
        isTyping = true;

        let text = element.textContent;
        let charIndex = text.length;

        typingInterval = setInterval(() => {
            if (charIndex > 0) {
                element.textContent = text.substring(0, charIndex - 1);
                charIndex--;
            } else {
                clearInterval(typingInterval);
                isTyping = false;
                if (callback) callback();
            }
        }, 20);
    }

    function displayNews() {
        const titleElement = document.getElementById('news-title-content');
        const contentElement = document.getElementById('news-content-text');
        const dateElement = document.querySelector('.news-date');
        const categoryElement = document.querySelector('.news-category');

        if (!titleElement || !contentElement) return;

        const news = newsData[currentNewsIndex];

        // Update date and category immediately
        if (dateElement) dateElement.textContent = news.date;
        if (categoryElement) categoryElement.textContent = news.category;

        // Type the title first, then the content
        typeNews(news.title, titleElement, () => {
            setTimeout(() => {
                typeNews(news.content, contentElement);
            }, 500);
        });
    }

    function rotateNews() {
        const titleElement = document.getElementById('news-title-content');
        const contentElement = document.getElementById('news-content-text');

        if (!titleElement || !contentElement) return;

        // Add a 2 second delay before starting backspace to let users read
        setTimeout(() => {
            // Backspace current content first
            backspaceNews(contentElement, () => {
                backspaceNews(titleElement, () => {
                    currentNewsIndex = (currentNewsIndex + 1) % newsData.length;
                    displayNews();
                });
            });
        }, 2000);
    }

    // Pull the live total-user count into the launch news item so the copy
    // always reflects the current number of users.
    async function refreshLaunchNews() {
        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/statistics`);
            if (response.ok) {
                const stats = await response.json();
                const totalUsers = stats.total_users;
                if (typeof totalUsers === 'number' && totalUsers > 0) {
                    newsData[0].content =
                        `Astegni launched its website on December 1, 2025, and is now serving ${totalUsers.toLocaleString()} users.`;
                }
            }
        } catch (error) {
            console.log('Using fallback launch news copy');
        }
        displayNews();
    }

    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', () => {
        refreshLaunchNews();

        // Rotate news every 12 seconds (10s reading + 2s added delay)
        setInterval(rotateNews, 12000);
    });

    // Initialize news section
    function initializeNewsSection() {
        refreshLaunchNews();
        // Rotate news every 12 seconds (10s reading + 2s added delay)
        setInterval(rotateNews, 12000);
    }

    // Export functions for global use
    window.newsSection = {
        displayNews,
        rotateNews,
        refreshLaunchNews
    };

    // Export initialization function
    window.initializeNewsSection = initializeNewsSection;
})();