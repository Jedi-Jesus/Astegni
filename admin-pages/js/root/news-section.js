
// ============================================
//   NEWS SECTION
// ============================================
function initializeNewsSection() {
    const newsItems = [
        {
            title: "New AI-Powered Learning Features Launched",
            content: "Experience personalized learning with our new AI tutor assistant.",
            category: "Technology",
            date: "Today",
        },
    ];

    let currentNewsIndex = 0;
    const titleElement = document.getElementById("news-title-content");
    const contentElement = document.getElementById("news-content-text");

    if (titleElement && contentElement) {
        typeNewsItem(newsItems[currentNewsIndex], titleElement, contentElement, () => {
            setInterval(() => {
                currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
                deleteNewsItem(titleElement, contentElement, () => {
                    typeNewsItem(newsItems[currentNewsIndex], titleElement, contentElement);
                });
            }, 8000);
        });
    }
}

function typeNewsItem(news, titleEl, contentEl, callback) {
    if (!titleEl || !contentEl) return;

    let titleIndex = 0;
    let contentIndex = 0;

    const typeTitle = setInterval(() => {
        if (titleIndex < news.title.length) {
            titleEl.textContent = news.title.substring(0, titleIndex + 1);
            titleIndex++;
        } else {
            clearInterval(typeTitle);
            const typeContent = setInterval(() => {
                if (contentIndex < news.content.length) {
                    contentEl.textContent = news.content.substring(0, contentIndex + 1);
                    contentIndex++;
                } else {
                    clearInterval(typeContent);
                    if (callback) callback();
                }
            }, 50);
        }
    }, 80);
}

function deleteNewsItem(titleEl, contentEl, callback) {
    if (!titleEl || !contentEl) return;

    const deleteContent = setInterval(() => {
        if (contentEl.textContent.length > 0) {
            contentEl.textContent = contentEl.textContent.slice(0, -1);
        } else {
            clearInterval(deleteContent);
            const deleteTitle = setInterval(() => {
                if (titleEl.textContent.length > 0) {
                    titleEl.textContent = titleEl.textContent.slice(0, -1);
                } else {
                    clearInterval(deleteTitle);
                    if (callback) callback();
                }
            }, 30);
        }
    }, 20);
}
