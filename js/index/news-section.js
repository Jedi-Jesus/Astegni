// News Section Module
(function() {
    'use strict';

    // News data - will be replaced with backend data
    const newsData = [
        {
            title: "New AI-Powered Learning Tools Now Available",
            content: "Revolutionary AI tutoring features have been integrated into the platform, providing personalized learning experiences for every student.",
            date: "Today",
            category: "Education"
        },
        {
            title: "Partnership with Ethiopian Universities",
            content: "We're proud to announce partnerships with major Ethiopian universities, expanding our course offerings significantly.",
            date: "Yesterday",
            category: "Partnership"
        },
        {
            title: "500+ New Courses Added This Month",
            content: "Our platform continues to grow with over 500 new courses added across various subjects and skill levels.",
            date: "2 days ago",
            category: "Courses"
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

    // Fetch news from backend
    async function fetchNewsFromBackend() {
        try {
            const response = await fetch('https://api.astegni.com/api/news', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.news && data.news.length > 0) {
                    newsData.length = 0; // Clear existing data
                    newsData.push(...data.news);
                    displayNews();
                }
            }
        } catch (error) {
            console.log('Using fallback news data');
            // Use existing newsData as fallback
            displayNews();
        }
    }

    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', () => {
        fetchNewsFromBackend();

        // Rotate news every 12 seconds (10s reading + 2s added delay)
        setInterval(rotateNews, 12000);
    });

    // Initialize news section
    function initializeNewsSection() {
        fetchNewsFromBackend();
        // Rotate news every 12 seconds (10s reading + 2s added delay)
        setInterval(rotateNews, 12000);
    }

    // Export functions for global use
    window.newsSection = {
        displayNews,
        rotateNews,
        fetchNewsFromBackend
    };

    // Export initialization function
    window.initializeNewsSection = initializeNewsSection;
})();