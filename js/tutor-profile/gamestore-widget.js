// ============================================
// GAMESTORE WIDGET - ANIMATED TITLE
// ============================================
// Animates the gamestore widget title with fade in/out effects
// Cycles through different game categories every 3 seconds
// ============================================

(function () {
    'use strict';

    const gamestoreTitles = [
        { icon: '🎮', text: 'Educational Games', emoji: '🎮' },
        { icon: '🧮', text: 'Puzzle Games', emoji: '🧩' },
        { icon: '🎯', text: 'Strategy Games', emoji: '♟️' },
        { icon: '🏆', text: 'Top Rated Games', emoji: '⭐' },
        { icon: '🔥', text: 'Trending Games', emoji: '🔥' },
        { icon: '💰', text: 'Special Discounts', emoji: '🏷️' },
        { icon: '🎁', text: 'Bundle Deals', emoji: '📦' },
        { icon: '✨', text: 'Coming Soon!', emoji: '🎉' }
    ];

    let currentGameIndex = 0;
    const gamestoreTitleContainer = document.querySelector('.gamestore-title-animated');
    const gamestoreIcon = document.querySelector('.gamestore-icon');

    if (gamestoreTitleContainer && gamestoreIcon) {
        const titleElement = gamestoreTitleContainer.querySelector('.gamestore-title');

        function animateGamestoreTitle() {
            // Fade out
            titleElement.style.opacity = '0';
            titleElement.style.transform = 'translateY(-10px)';

            setTimeout(() => {
                // Update content
                currentGameIndex = (currentGameIndex + 1) % gamestoreTitles.length;
                const currentTitle = gamestoreTitles[currentGameIndex];
                titleElement.textContent = currentTitle.text;
                gamestoreIcon.textContent = currentTitle.icon;

                // Fade in
                titleElement.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    titleElement.style.opacity = '1';
                    titleElement.style.transform = 'translateY(0)';
                }, 50);
            }, 600);
        }

        // Start animation every 3 seconds
        setInterval(animateGamestoreTitle, 3000);

        console.log('🎮 Gamestore widget animation initialized');
    } else {
        console.log('ℹ️ Gamestore widget elements not found - animation skipped');
    }

})();
