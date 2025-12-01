// ============================================
// BOOKSTORE WIDGET - ANIMATED TITLE
// ============================================
// Animates the bookstore widget title with fade in/out effects
// Cycles through different book categories every 3 seconds
// ============================================

(function () {
    'use strict';

    const bookstoreTitles = [
        { icon: '📖', text: 'Educational Books', emoji: '📚' },
        { icon: '📚', text: 'Fiction & Novels', emoji: '📖' },
        { icon: '🔬', text: 'Science Textbooks', emoji: '🧪' },
        { icon: '📐', text: 'Mathematics Books', emoji: '➗' },
        { icon: '🔥', text: 'Trending Books', emoji: '🔥' },
        { icon: '💰', text: 'Special Discounts', emoji: '🏷️' },
        { icon: '🎁', text: 'Bundle Deals', emoji: '📦' },
        { icon: '✨', text: 'Coming Soon!', emoji: '🎉' }
    ];

    let currentBookIndex = 0;
    const bookstoreTitleContainer = document.querySelector('.bookstore-title-animated');
    const bookstoreIcon = document.querySelector('.bookstore-icon');

    if (bookstoreTitleContainer && bookstoreIcon) {
        const titleElement = bookstoreTitleContainer.querySelector('.bookstore-title');

        function animateBookstoreTitle() {
            // Fade out
            titleElement.style.opacity = '0';
            titleElement.style.transform = 'translateY(-10px)';

            setTimeout(() => {
                // Update content
                currentBookIndex = (currentBookIndex + 1) % bookstoreTitles.length;
                const currentTitle = bookstoreTitles[currentBookIndex];
                titleElement.textContent = currentTitle.text;
                bookstoreIcon.textContent = currentTitle.icon;

                // Fade in
                titleElement.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    titleElement.style.opacity = '1';
                    titleElement.style.transform = 'translateY(0)';
                }, 50);
            }, 600);
        }

        // Start animation every 3 seconds
        setInterval(animateBookstoreTitle, 3000);

        console.log('📚 Bookstore widget animation initialized');
    } else {
        console.log('ℹ️ Bookstore widget elements not found - animation skipped');
    }

})();
