        // Weather Manager
        window.weatherManager = {
            themes: {
                'sky-blue': 'linear-gradient(135deg, #87CEEB, #4A90E2)',
                'royal-blue': 'linear-gradient(135deg, #667eea, #764ba2)',
                'midnight': 'linear-gradient(135deg, #232526, #414345)',
                'sunset': 'linear-gradient(135deg, #ff6b6b, #feca57)',
                'aurora': 'linear-gradient(135deg, #00c6ff, #0072ff)',
                'storm': 'linear-gradient(135deg, #536976, #292E49)',
                'forest': 'linear-gradient(135deg, #134E5E, #71B280)',
                'ocean': 'linear-gradient(135deg, #2E3192, #1BFFFF)',
                'purple-haze': 'linear-gradient(135deg, #360033, #0b8793)',
                'coral': 'linear-gradient(135deg, #ff9a56, #ff6a88)'
            },

            toggleSettings: function () {
                const selector = document.getElementById('weatherThemeSelector');
                if (selector.style.display === 'none' || !selector.style.display) {
                    selector.style.display = 'block';
                } else {
                    selector.style.display = 'none';
                }
            },

            closeSettings: function () {
                document.getElementById('weatherThemeSelector').style.display = 'none';
                document.getElementById('customColorPicker').style.display = 'none';
            },

            changeTheme: function (theme) {
                const weatherWidget = document.querySelector('.weather-widget');
                if (this.themes[theme]) {
                    weatherWidget.style.background = this.themes[theme];
                    weatherWidget.setAttribute('data-weather-theme', theme);
                }
            },

            openCustomPicker: function () {
                document.getElementById('customColorPicker').style.display = 'block';
            },

            applyCustomColors: function () {
                const startColor = document.getElementById('startColor').value;
                const endColor = document.getElementById('endColor').value;
                const weatherWidget = document.querySelector('.weather-widget');
                weatherWidget.style.background = `linear-gradient(135deg, ${startColor}, ${endColor})`;
                weatherWidget.setAttribute('data-weather-theme', 'custom');
            },

            showForecast: function () {
                alert('Full 7-day forecast feature coming soon!');
            }
        };

        // News Carousel Manager
        let currentNewsIndex = 0;
        const newsCards = document.querySelectorAll('.news-card');
        const totalNewsCards = newsCards.length;

        function rotateNews() {
            // Fade out current card
            newsCards[currentNewsIndex].style.opacity = '0';

            setTimeout(() => {
                // Hide current card
                newsCards[currentNewsIndex].style.display = 'none';
                newsCards[currentNewsIndex].classList.remove('active');

                // Move to next card
                currentNewsIndex = (currentNewsIndex + 1) % totalNewsCards;

                // Show and fade in next card
                newsCards[currentNewsIndex].style.display = 'block';
                setTimeout(() => {
                    newsCards[currentNewsIndex].style.opacity = '1';
                    newsCards[currentNewsIndex].classList.add('active');
                }, 50);
            }, 500);
        }

        // Start news rotation (every 5 seconds)
        setInterval(rotateNews, 5000);

        // Market Live Updates Manager
        const marketData = {
            banking: { value: 1245.67, volatility: 0.5 },
            telecom: { value: 892.45, volatility: 0.4 },
            usd: { value: 56.85, volatility: 0.2 },
            eur: { value: 61.23, volatility: 0.15 }
        };

        function updateMarketValue(element, newValue, oldValue) {
            const changePercent = ((newValue - oldValue) / oldValue * 100).toFixed(2);
            const isPositive = changePercent >= 0;

            // Update rate with animation
            element.querySelector('.rate').textContent = newValue.toFixed(2);
            element.querySelector('.rate').style.color = isPositive ? '#10b981' : '#ef4444';

            // Flash animation
            element.style.background = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            setTimeout(() => {
                element.style.background = 'var(--highlight-bg)';
            }, 1000);

            // Update change indicator
            const changeElement = element.querySelector('.change');
            changeElement.textContent = `${isPositive ? '↑' : '↓'} ${Math.abs(changePercent)}%`;
            changeElement.style.color = isPositive ? '#10b981' : '#ef4444';
            changeElement.className = `change ${isPositive ? 'up' : 'down'}`;
        }

        function simulateMarketUpdate() {
            const exchangeItems = document.querySelectorAll('.exchange-item');
            const markets = ['banking', 'telecom', 'usd', 'eur'];

            markets.forEach((market, index) => {
                if (exchangeItems[index]) {
                    const data = marketData[market];
                    const oldValue = data.value;

                    // Simulate realistic market movement
                    const change = (Math.random() - 0.5) * data.volatility;
                    data.value = parseFloat((data.value * (1 + change / 100)).toFixed(2));

                    updateMarketValue(exchangeItems[index], data.value, oldValue);
                }
            });
        }

        // Start market updates (every 3 seconds)
        setInterval(simulateMarketUpdate, 3000);

        // Initial animation on load
        document.addEventListener('DOMContentLoaded', function () {
            // Add pulse animation to exchange items
            const exchangeItems = document.querySelectorAll('.exchange-item');
            exchangeItems.forEach((item, index) => {
                item.style.transition = 'all 0.3s ease';
                item.addEventListener('mouseenter', function () {
                    this.style.transform = 'translateX(5px)';
                });
                item.addEventListener('mouseleave', function () {
                    this.style.transform = 'translateX(0)';
                });
            });
        });