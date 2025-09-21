// ============================================
// TRAINING CENTER PROFILE - PART 4
// BUTTON HANDLERS AND MODAL MANAGERS
// ============================================

// ============================================
// MODALS MANAGER - ENHANCED
// ============================================
// ============================================
// MODALS MANAGER - ENHANCED
// ============================================
class ModalsManager {
    constructor() {
        this.activeModals = new Set();
        this.init();
    }

    init() {
        // Handle all modal overlays
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("modal-overlay")) {
                const modal = e.target.closest(".modal");
                if (modal) {
                    this.close(modal.id);
                }
            }
        });

        // Handle ESC key for all modals
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeTopModal();
            }
        });
        
        console.log("ModalsManager initialized");
    }

    open(modalId) {
        console.log(`Opening modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            console.error(`Modal not found: ${modalId}`);
            return;
        }
        
        // Remove all hiding classes
        modal.classList.remove("hidden");
        modal.classList.add("show");
        
        // Force display
        modal.style.display = "flex";
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        
        this.activeModals.add(modalId);

        const content = modal.querySelector(".modal-content");
        if (content) {
            content.style.animation = "modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
        }

        // Auto-attach close button handler
        const closeBtn = modal.querySelector(".modal-close");
        if (closeBtn && !closeBtn.hasAttribute("data-handler-attached")) {
            closeBtn.setAttribute("data-handler-attached", "true");
            closeBtn.addEventListener("click", () => this.close(modalId));
        }
        
        console.log(`Modal ${modalId} opened successfully`);
    }

    close(modalId) {
        console.log(`Closing modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("show");
            modal.classList.add("hidden");
            modal.style.display = "none";
            this.activeModals.delete(modalId);
        }
    }

    closeTopModal() {
        if (this.activeModals.size > 0) {
            const lastModal = Array.from(this.activeModals).pop();
            this.close(lastModal);
        }
    }

    closeAll() {
        document.querySelectorAll(".modal.show").forEach((modal) => {
            modal.classList.remove("show");
            modal.classList.add("hidden");
            modal.style.display = "none";
        });
        this.activeModals.clear();
    }
}

// Initialize immediately, don't wait for DOMContentLoaded
if (!window.modalsManager) {
    window.modalsManager = new ModalsManager();
}

// ============================================
// ANALYTICS MANAGER - COMPLETE
// ============================================
class AnalyticsManager {
    constructor() {
        this.canvas = document.getElementById("analyticsChart");
        this.ctx = this.canvas?.getContext("2d");
        this.init();
    }

    init() {
        if (!this.canvas) return;

        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = 150;

        this.drawChart(this.generateData("views"));

        document.querySelectorAll(".rt-stat").forEach((stat) => {
            stat.addEventListener("click", () => {
                document.querySelectorAll(".rt-stat").forEach((s) => s.classList.remove("active"));
                stat.classList.add("active");
                this.switchMetric(stat.dataset.metric);
            });
        });

        this.startRealtimeUpdates();
    }

    openModal() {
        Utils.showToast("📊 Opening detailed analytics...", "info");

        // Create analytics modal if it doesn't exist
        let modal = document.getElementById("analyticsDetailsModal");
        if (!modal) {
            modal = this.createAnalyticsModal();
            document.body.appendChild(modal);
        }
        
        window.modalsManager.open("analyticsDetailsModal");
        
        // Draw detailed chart after modal opens
        setTimeout(() => this.drawDetailedChart(), 100);
    }

    createAnalyticsModal() {
        const modal = document.createElement("div");
        modal.id = "analyticsDetailsModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content analytics-modal">
                <div class="modal-header">
                    <h2>📊 Detailed Analytics Dashboard</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="analytics-summary">
                        <div class="summary-card">
                            <h3>Total Views</h3>
                            <p class="summary-value">1.2M</p>
                            <span class="summary-change up">+15.3%</span>
                        </div>
                        <div class="summary-card">
                            <h3>Engagement Rate</h3>
                            <p class="summary-value">89%</p>
                            <span class="summary-change up">+5.2%</span>
                        </div>
                        <div class="summary-card">
                            <h3>Revenue</h3>
                            <p class="summary-value">$124.5K</p>
                            <span class="summary-change up">+22.7%</span>
                        </div>
                        <div class="summary-card">
                            <h3>Active Users</h3>
                            <p class="summary-value">3,842</p>
                            <span class="summary-change down">-2.1%</span>
                        </div>
                    </div>
                    <div class="chart-section">
                        <h3>Performance Over Time</h3>
                        <canvas id="detailedChart"></canvas>
                    </div>
                    <div class="top-content">
                        <h3>Top Performing Content</h3>
                        <ol class="content-list">
                            <li>Film Production Masterclass - 45K views</li>
                            <li>Advanced Cinematography - 38K views</li>
                            <li>Color Grading Tutorial - 32K views</li>
                            <li>Sound Design Basics - 28K views</li>
                            <li>Editing Techniques - 24K views</li>
                        </ol>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.analyticsManager.exportData()">Export Data</button>
                    <button class="btn-primary" onclick="window.modalsManager.close('analyticsDetailsModal')">Close</button>
                </div>
            </div>
        `;
        return modal;
    }

    drawDetailedChart() {
        const canvas = document.getElementById("detailedChart");
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        canvas.width = canvas.offsetWidth;
        canvas.height = 200;
        
        // Draw a simple chart
        this.drawChart(this.generateData("views"), ctx, canvas);
    }

    exportData() {
        Utils.showToast("📥 Exporting analytics data...", "info");
        setTimeout(() => {
            Utils.showToast("✅ Data exported successfully!", "success");
        }, 1500);
    }

    generateData(metric) {
        const baseValues = {
            views: 500,
            users: 150,
            revenue: 1000,
            engagement: 85,
        };

        const base = baseValues[metric];
        const data = [];

        for (let i = 0; i < 24; i++) {
            const dayPattern = Math.sin((i / 24) * Math.PI * 2 - Math.PI / 2) * 0.3 + 0.7;
            const randomVariation = (Math.random() - 0.5) * 0.2;
            data.push(base * dayPattern * (1 + randomVariation));
        }

        return data;
    }

    drawChart(data, customCtx, customCanvas) {
        const ctx = customCtx || this.ctx;
        const canvas = customCanvas || this.canvas;
        
        if (!ctx || !canvas) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 10;

        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        const isDark = STATE.currentTheme === "dark";

        if (isDark) {
            gradient.addColorStop(0, "rgba(255, 213, 79, 0.4)");
            gradient.addColorStop(1, "rgba(255, 213, 79, 0.05)");
            ctx.strokeStyle = "#FFD54F";
        } else {
            gradient.addColorStop(0, "rgba(245, 158, 11, 0.4)");
            gradient.addColorStop(1, "rgba(245, 158, 11, 0.05)");
            ctx.strokeStyle = "#F59E0B";
        }

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        // Draw grid lines
        ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (height - padding * 2) * (i / 4);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw chart line
        ctx.strokeStyle = isDark ? "#FFD54F" : "#F59E0B";
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((value, i) => {
            const x = (width / (data.length - 1)) * i;
            const y = height - padding - ((value - min) / range) * (height - padding * 2);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevX = (width / (data.length - 1)) * (i - 1);
                const prevY = height - padding - ((data[i - 1] - min) / range) * (height - padding * 2);
                const cp1x = prevX + (x - prevX) / 2;
                const cp1y = prevY;
                const cp2x = prevX + (x - prevX) / 2;
                const cp2y = y;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
            }
        });

        ctx.stroke();

        // Fill area under line
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    switchMetric(metric) {
        STATE.currentMetric = metric;
        this.updateChart(metric);
        this.updateLabel(metric);
        this.animateValue(metric);
    }

    updateChart(metric) {
        const data = this.generateData(metric);
        this.drawChart(data);
    }

    updateLabel(metric) {
        const labels = {
            views: "Page Views - Last 24 Hours",
            users: "Active Users - Last 24 Hours",
            revenue: "Revenue - Last 24 Hours",
            engagement: "Engagement Rate - Last 24 Hours",
        };

        const chartLabel = document.querySelector(".chart-label");
        if (chartLabel) {
            chartLabel.textContent = labels[metric];
        }
    }

    animateValue(metric) {
        const stat = document.querySelector(`.rt-stat[data-metric="${metric}"] .rt-value`);
        if (!stat) return;

        const targetValue = parseFloat(stat.dataset.value);
        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();

        const updateValue = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

            if (metric === "revenue") {
                stat.textContent = `$${(current / 1000).toFixed(1)}K`;
            } else if (metric === "engagement") {
                stat.textContent = `${current}%`;
            } else {
                stat.textContent = current.toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        };

        requestAnimationFrame(updateValue);
    }

    startRealtimeUpdates() {
        setInterval(() => {
            document.querySelectorAll(".rt-value[data-value]").forEach((el) => {
                const currentValue = parseFloat(el.dataset.value);
                const variation = (Math.random() - 0.5) * currentValue * 0.05;
                const newValue = Math.max(0, currentValue + variation);

                el.dataset.value = newValue;

                const metric = el.closest(".rt-stat")?.dataset.metric;
                if (metric === "revenue") {
                    el.textContent = `$${(newValue / 1000).toFixed(1)}K`;
                } else if (metric === "engagement") {
                    el.textContent = `${Math.round(newValue)}%`;
                } else {
                    el.textContent = Math.round(newValue).toLocaleString();
                }

                el.style.animation = "pulse 0.5s ease";
                setTimeout(() => {
                    el.style.animation = "";
                }, 500);
            });
        }, CONFIG.realtime.updateInterval);
    }
}

// ============================================
// WEATHER MANAGER - COMPLETE
// ============================================
class WeatherManager {
    constructor() {
        this.currentTheme = localStorage.getItem("weatherTheme") || "royal-blue";
        this.widget = null;
        this.weatherData = {
            temperature: 72,
            condition: "Sunny",
            high: 78,
            low: 65,
            humidity: 45,
            wind: 8,
            location: "Los Angeles, CA",
        };
        this.init();
    }

    init() {
        this.widget = document.querySelector(".weather-widget");
        if (this.widget) {
            this.applyTheme(this.currentTheme);
            this.startWeatherUpdates();
        }
    }

    showForecast() {
        Utils.showToast("🌤️ Opening extended forecast...", "info");

        let modal = document.getElementById("forecastModal");
        if (!modal) {
            modal = this.createForecastModal();
            document.body.appendChild(modal);
        }
        
        window.modalsManager.open("forecastModal");
    }

    createForecastModal() {
        const modal = document.createElement("div");
        modal.id = "forecastModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🌤️ 7-Day Weather Forecast</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="forecast-grid">
                        ${this.generateForecast()}
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    generateForecast() {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const conditions = ["☀️", "⛅", "☁️", "🌧️", "⛈️"];

        return days
            .map((day) => {
                const condition = conditions[Math.floor(Math.random() * conditions.length)];
                const high = Math.floor(Math.random() * 10 + 70);
                const low = high - Math.floor(Math.random() * 10 + 5);

                return `
                <div class="forecast-card">
                    <h3>${day}</h3>
                    <div class="forecast-icon">${condition}</div>
                    <div class="forecast-temps">
                        <span class="temp-high">${high}°</span>
                        <span class="temp-low">${low}°</span>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    toggleSettings() {
        const selector = document.getElementById("weatherThemeSelector");
        if (selector) {
            selector.classList.toggle("active");
        }
    }

    closeSettings() {
        const selector = document.getElementById("weatherThemeSelector");
        if (selector) {
            selector.classList.remove("active");
        }
    }

    changeTheme(themeName) {
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        localStorage.setItem("weatherTheme", themeName);
        Utils.showToast(`🎨 Weather theme changed to ${themeName}`, "success");
    }

    applyTheme(themeName) {
        if (!this.widget) return;

        const themes = {
            "sky-blue": "linear-gradient(135deg, #87CEEB 0%, #2E7BC4 100%)",
            "royal-blue": "linear-gradient(135deg, #0d47a1 0%, #1e88e5 100%)",
            midnight: "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)",
            sunset: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)",
            aurora: "linear-gradient(135deg, #667eea 0%, #f093fb 100%)",
            storm: "linear-gradient(135deg, #373B44 0%, #4286f4 100%)",
            forest: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)",
            ocean: "linear-gradient(135deg, #1a237e 0%, #3f51b5 100%)",
            "purple-haze": "linear-gradient(135deg, #360033 0%, #0b8793 100%)",
            coral: "linear-gradient(135deg, #FF9A8B 0%, #FF99AC 100%)",
        };

        if (themes[themeName]) {
            this.widget.style.background = themes[themeName];
            this.widget.setAttribute("data-weather-theme", themeName);
        }
    }

    openCustomPicker() {
        const picker = document.getElementById("customColorPicker");
        if (picker) {
            picker.style.display = picker.style.display === "none" ? "block" : "none";
        }
    }

    applyCustomColors() {
        const startColor = document.getElementById("startColor")?.value;
        const endColor = document.getElementById("endColor")?.value;

        if (startColor && endColor) {
            const customGradient = `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`;

            if (this.widget) {
                this.widget.style.background = customGradient;
            }

            localStorage.setItem("customWeatherColors", JSON.stringify({
                start: startColor,
                end: endColor,
            }));

            document.getElementById("customColorPicker").style.display = "none";
            Utils.showToast("🎨 Custom weather theme applied!", "success");
        }
    }

    startWeatherUpdates() {
        // Update weather data every 10 minutes
        this.updateWeatherData();
        setInterval(() => this.updateWeatherData(), 600000);
    }

    updateWeatherData() {
        // Simulate weather data update
        const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Clear"];
        const temps = [68, 72, 75, 70, 65];

        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        const randomTemp = temps[Math.floor(Math.random() * temps.length)];

        const tempElement = this.widget?.querySelector(".weather-temp");
        const conditionElement = this.widget?.querySelector(".weather-condition");

        if (tempElement) {
            tempElement.textContent = `${randomTemp}°F`;
        }
        if (conditionElement) {
            conditionElement.textContent = randomCondition;
        }
    }
}

// ============================================
// WIDGETS MANAGER
// ============================================
class WidgetsManager {
    constructor() {
        this.initNews();
        this.initMarket();
    }

    initNews() {
        setInterval(() => {
            this.changeNews(1);
        }, 5000);
    }

    initMarket() {
        setInterval(() => {
            document.querySelectorAll(".rate[data-value]").forEach((el) => {
                const value = parseFloat(
                    el.dataset.value || el.textContent.replace(/[^0-9.-]/g, "")
                );
                const variation = (Math.random() - 0.5) * value * 0.002;
                const newValue = value + variation;

                if (el.textContent.includes("$")) {
                    el.textContent = `${newValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}`;
                } else {
                    el.textContent = newValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                }

                const changeEl = el.nextElementSibling;
                if (changeEl && changeEl.classList.contains("change")) {
                    const changeValue = (Math.random() - 0.5) * 2;
                    changeEl.textContent = `${changeValue > 0 ? "↑" : "↓"} ${Math.abs(
                        changeValue
                    ).toFixed(2)}%`;
                    changeEl.className = `change ${changeValue > 0 ? "up" : "down"}`;
                }
            });
        }, CONFIG.realtime.updateInterval);
    }

    changeNews(direction) {
        const cards = document.querySelectorAll(".news-card");
        if (cards.length === 0) return;

        let activeIndex = Array.from(cards).findIndex((card) =>
            card.classList.contains("active")
        );
        if (activeIndex === -1) activeIndex = 0;

        cards[activeIndex].classList.remove("active");
        activeIndex = (activeIndex + direction + cards.length) % cards.length;
        cards[activeIndex].classList.add("active");

        document.querySelectorAll(".news-dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === activeIndex);
        });
    }
}
// ============================================
// ENHANCED ANIMATIONS MANAGER
// ============================================
class AnimationsManager {
    constructor(options = {}) {
        this.options = {
            enableParallax: true,
            enableHover: true,
            enableReveal: true,
            enableMagnetic: false,
            parallaxIntensity: 0.3,
            hoverIntensity: 15,
            revealDuration: 600,
            throttleDelay: 16,
            ...options
        };
        
        this.observers = [];
        this.rafId = null;
        this.scrollY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.init();
    }

    init() {
        if (this.options.enableReveal) this.setupRevealAnimations();
        if (this.options.enableHover) this.setupHoverEffects();
        if (this.options.enableParallax) this.setupParallaxEffects();
        if (this.options.enableMagnetic) this.setupMagneticEffects();
        this.setupScrollListener();
        this.setupResizeListener();
    }

    // Advanced reveal animations with multiple styles
    setupRevealAnimations() {
        const options = {
            threshold: 0.05,
            rootMargin: "0px 0px -10% 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting && !entry.target.classList.contains('revealed')) {
                    const delay = this.calculateStaggerDelay(entry.target, index);
                    const animationType = entry.target.dataset.animation || 'fadeUp';
                    
                    setTimeout(() => {
                        entry.target.classList.add('revealed', `reveal-${animationType}`);
                        this.triggerCountAnimation(entry.target);
                    }, delay);
                }
            });
        }, options);

        // Select all animatable elements
        const elements = document.querySelectorAll(
            '.stat-card, .award-card, .follow-card, .class-card, .video-card, .blog-card, [data-animate]'
        );
        
        elements.forEach((el, index) => {
            // Add initial state classes
            el.classList.add('reveal-item');
            
            // Set animation type based on element type or data attribute
            if (!el.dataset.animation) {
                if (el.classList.contains('stat-card')) {
                    el.dataset.animation = 'scale';
                } else if (el.classList.contains('award-card')) {
                    el.dataset.animation = 'rotate';
                } else {
                    el.dataset.animation = 'fadeUp';
                }
            }
            
            observer.observe(el);
        });
        
        this.observers.push(observer);
    }

    // Calculate smart stagger delays based on position
    calculateStaggerDelay(element, index) {
        const rect = element.getBoundingClientRect();
        const row = Math.floor(rect.top / 200);
        const col = Math.floor(rect.left / 200);
        const zigzag = (row + col) * 50;
        return Math.min(zigzag, 400);
    }

    // Enhanced hover effects with spring physics
    setupHoverEffects() {
        const cards = document.querySelectorAll(
            '.stat-card, .award-card, .class-card, [data-hover="3d"]'
        );

        cards.forEach(card => {
            let currentX = 0;
            let currentY = 0;
            let targetX = 0;
            let targetY = 0;
            let rafId = null;

            const updateTransform = () => {
                currentX += (targetX - currentX) * 0.1;
                currentY += (targetY - currentY) * 0.1;
                
                card.style.transform = `
                    perspective(1000px) 
                    rotateX(${currentX}deg) 
                    rotateY(${currentY}deg) 
                    translateZ(30px)
                    scale(1.02)
                `;
                
                if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
                    rafId = requestAnimationFrame(updateTransform);
                }
            };

            card.addEventListener('mouseenter', (e) => {
                card.style.transition = 'box-shadow 0.3s ease';
                card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                if (!card.querySelector('.shine')) {
                    this.addShineEffect(card);
                }
            });

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                targetX = ((y - centerY) / centerY) * -this.options.hoverIntensity;
                targetY = ((x - centerX) / centerX) * this.options.hoverIntensity;
                
                if (!rafId) {
                    rafId = requestAnimationFrame(updateTransform);
                }

                // Update shine position
                const shine = card.querySelector('.shine');
                if (shine) {
                    const shineX = (x / rect.width) * 100;
                    const shineY = (y / rect.height) * 100;
                    shine.style.background = `
                        radial-gradient(
                            circle at ${shineX}% ${shineY}%,
                            rgba(255,255,255,0.3) 0%,
                            transparent 60%
                        )
                    `;
                }
            });

            card.addEventListener('mouseleave', () => {
                targetX = 0;
                targetY = 0;
                card.style.boxShadow = '';
                
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                
                requestAnimationFrame(updateTransform);
                
                const shine = card.querySelector('.shine');
                if (shine) {
                    setTimeout(() => shine.remove(), 300);
                }
            });
        });
    }

    // Add shine overlay effect
    addShineEffect(element) {
        const shine = document.createElement('div');
        shine.className = 'shine';
        shine.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            opacity: 0;
            animation: fadeIn 0.3s forwards;
            z-index: 10;
            border-radius: inherit;
        `;
        element.style.position = 'relative';
        element.appendChild(shine);
    }

    // Smooth parallax without the dropping effect
    setupParallaxEffects() {
        const parallaxElements = [
            { selector: '.cover-img', speed: 0.5, offset: 0 },
            { selector: '.hero-section', speed: 0.3, offset: 0 },
            { selector: '[data-parallax]', speed: 0.2, offset: 0 }
        ];

        this.parallaxElements = parallaxElements.map(config => ({
            ...config,
            elements: document.querySelectorAll(config.selector)
        })).filter(config => config.elements.length > 0);
    }

    // Magnetic cursor effect for interactive elements
    setupMagneticEffects() {
        const magneticElements = document.querySelectorAll('[data-magnetic], .btn, .follow-card');
        
        magneticElements.forEach(elem => {
            let currentX = 0;
            let currentY = 0;
            
            elem.addEventListener('mousemove', (e) => {
                const rect = elem.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                currentX = x * 0.3;
                currentY = y * 0.3;
                
                elem.style.transform = `translate(${currentX}px, ${currentY}px)`;
                elem.style.transition = 'transform 0.1s ease-out';
            });
            
            elem.addEventListener('mouseleave', () => {
                elem.style.transform = 'translate(0, 0)';
                elem.style.transition = 'transform 0.3s ease-out';
            });
        });
    }

    // Optimized scroll handling
    setupScrollListener() {
        let ticking = false;
        
        const updateScroll = () => {
            this.scrollY = window.pageYOffset;
            
            if (this.options.enableParallax) {
                this.updateParallax();
            }
            
            this.updateScrollProgress();
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScroll);
                ticking = true;
            }
        });
    }

    // Update parallax positions (upward float effect instead of dropping)
    updateParallax() {
        if (!this.parallaxElements) return;
        
        this.parallaxElements.forEach(config => {
            config.elements.forEach(elem => {
                const rect = elem.getBoundingClientRect();
                const speed = parseFloat(elem.dataset.parallaxSpeed) || config.speed;
                const offset = parseFloat(elem.dataset.parallaxOffset) || config.offset;
                
                // Calculate parallax based on element's position in viewport
                const viewportHeight = window.innerHeight;
                const elementCenter = rect.top + rect.height / 2;
                const centerOffset = elementCenter - viewportHeight / 2;
                
                // Upward floating effect instead of dropping
                const yPos = -(centerOffset * speed * this.options.parallaxIntensity) + offset;
                
                elem.style.transform = `translateY(${yPos}px)`;
                elem.style.willChange = 'transform';
            });
        });
    }

    // Scroll progress indicator
    updateScrollProgress() {
        const progress = this.scrollY / (document.body.scrollHeight - window.innerHeight);
        document.documentElement.style.setProperty('--scroll-progress', progress);
    }

    // Number counting animation for stats
    triggerCountAnimation(element) {
        const countElements = element.querySelectorAll('[data-count]');
        
        countElements.forEach(countEl => {
            const target = parseInt(countEl.dataset.count);
            const duration = parseInt(countEl.dataset.duration) || 2000;
            const start = 0;
            const startTime = performance.now();
            
            const updateCount = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function for smooth animation
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(start + (target - start) * easeOutQuart);
                
                countEl.textContent = current.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(updateCount);
                } else {
                    countEl.textContent = target.toLocaleString();
                }
            };
            
            requestAnimationFrame(updateCount);
        });
    }

    // Handle window resize
    setupResizeListener() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    handleResize() {
        // Recalculate positions if needed
        if (this.options.enableParallax) {
            this.updateParallax();
        }
    }

    // Cleanup method
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
    }
}

// Initialize with custom options
const animations = new AnimationsManager({
    enableParallax: true,
    enableHover: true,
    enableReveal: true,
    enableMagnetic: true,
    parallaxIntensity: 0.2,
    hoverIntensity: 12,
    revealDuration: 500
});

// Required CSS for animations (add to your stylesheet)
const animationStyles = `
    .reveal-item {
        opacity: 0;
        will-change: transform, opacity;
    }
    
    .reveal-item.revealed {
        opacity: 1;
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .reveal-fadeUp {
        transform: translateY(30px);
    }
    
    .reveal-fadeUp.revealed {
        transform: translateY(0);
    }
    
    .reveal-scale {
        transform: scale(0.9);
    }
    
    .reveal-scale.revealed {
        transform: scale(1);
    }
    
    .reveal-rotate {
        transform: rotate(-5deg) scale(0.9);
    }
    
    .reveal-rotate.revealed {
        transform: rotate(0) scale(1);
    }
    
    @keyframes fadeIn {
        to { opacity: 1; }
    }
`;
// ============================================
// AD PACKAGE MANAGER - DYNAMIC PACKAGE SYSTEM
// ============================================
const AdPackageManager = {
    // Package configuration
    packages: [
        {
            id: 'three-days',
            title: 'Up to Three days',
            pricePerDay: 2000,
            currency: 'ETB',
            duration: 3,
            featured: false,
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Full analytics suite'
            ]
        },
        {
            id: 'seven-days',
            title: 'Up to Seven days',
            pricePerDay: 1800,
            currency: 'ETB',
            duration: 7,
            featured: true,
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Full analytics suite',
            ]
        },
                {
            id: 'fifteen-days',
            title: 'Up to fifteen days',
            pricePerDay: 1500,
            currency: 'ETB',
            duration: 15,
            featured: true,
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Full analytics suite',
            ]
        },
                {
            id: 'one-month',
            title: 'Up to one month',
            pricePerDay: 1200,
            currency: 'ETB',
            duration: 30,
            featured: true,
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Full analytics suite'
            ]
        },
                {
            id: 'three-months',
            title: 'Up to three months',
            pricePerDay: 1000,
            currency: 'ETB',
            duration: 90,
            featured: true,
            badge: 'Most Popular',
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Priority placement',
                'Full analytics suite'
            ]
        },
                {
            id: 'six-months',
            title: 'Up to six months',
            pricePerDay: 800,
            currency: 'ETB',
            duration: 180,
            featured: true,
            badge: 'Most Popular',
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Priority placement',
                'Full analytics suite',
            ]
        },
                        {
            id: 'nine-months',
            title: 'Up to nine months',
            pricePerDay: 600,
            currency: 'ETB',
            duration: 270,
            featured: true,
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Priority placement',
                'Full analytics suite',
            ]
        },
                        {
            id: 'yearly',
            title: 'Up to a year',
            pricePerDay: 500,
            currency: 'ETB',
            duration: 365,
            featured: true,
            badge: 'Most Popular',
            features: [
                'Unlimited impressions',
                'Custom targeting',
                'Priority placement',
                'Full analytics suite',
            ]
        },
        // ... rest of the packages array from my previous response ...
    ],

    renderPackages() {
        const packagesSection = document.querySelector('#adAnalyticsModal .ad-packages');
        if (!packagesSection) return;

        packagesSection.innerHTML = `
            <h3>Advertising Packages</h3>
            <div class="packages-grid">
                ${this.packages.map(pkg => this.createPackageCard(pkg)).join('')}
            </div>
        `;
    },

    createPackageCard(pkg) {
        const totalPrice = pkg.pricePerDay * pkg.duration;
        const savings = this.calculateSavings(pkg);
        
        return `
            <div class="package-card ${pkg.featured ? 'featured' : ''}" data-package-id="${pkg.id}">
                ${pkg.badge ? `<div class="featured-badge">${pkg.badge}</div>` : ''}
                <h4>${pkg.title}</h4>
                <div class="package-price">${pkg.pricePerDay.toLocaleString()} ${pkg.currency}/day</div>
                <div class="package-total">Total: ${totalPrice.toLocaleString()} ${pkg.currency}</div>
                ${savings > 0 ? `<div class="package-savings">Save ${savings.toLocaleString()} ${pkg.currency}</div>` : ''}
                <ul>
                    ${pkg.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <button class="btn-primary" onclick="selectPackage('${pkg.id}')">
                    Select Package
                </button>
            </div>
        `;
    },

    calculateSavings(pkg) {
        const basePrice = 2000;
        const actualTotal = pkg.pricePerDay * pkg.duration;
        const expectedTotal = basePrice * pkg.duration;
        return Math.max(0, expectedTotal - actualTotal);
    }
};

// Global function for package selection
window.selectPackage = function(packageId) {
    const pkg = AdPackageManager.packages.find(p => p.id === packageId);
    if (!pkg) return;
    
    Utils.showToast(`✅ Selected: ${pkg.title} - ${pkg.pricePerDay} ${pkg.currency}/day`, "success");
    
    // You can add checkout redirection here
    setTimeout(() => {
        // window.location.href = `/checkout?package=${packageId}`;
        console.log('Proceed to checkout with:', pkg);
    }, 1500);
};
// ============================================
// GLOBAL FUNCTION HANDLERS
// ============================================

// Package selection handlers
window.showPackageType = function(type) {
    document.querySelectorAll('.package-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const grid = document.getElementById('packagesGrid');
    if (grid) {
        grid.innerHTML = getPackagesHTML(type);
    }
};

window.selectPackage = function(packageId) {
    Utils.showToast(`✅ Package ${packageId} selected! Redirecting to checkout...`, "success");
    setTimeout(() => {
        window.location.href = "#checkout";
    }, 1500);
};

window.submitCustomPackage = function() {
    Utils.showToast("📧 Custom package request sent! We'll contact you within 24 hours.", "success");
    window.modalsManager.close('adAnalyticsModal');
};

// Switch metric for analytics
window.switchMetric = function(metric) {
    if (window.analyticsManager) {
        window.analyticsManager.switchMetric(metric);
    }
};

// View all events handler
window.viewAllEvents = function() {
    window.eventsManager.viewAllEvents();
};

// ============================================
// INITIALIZE ON DOM READY
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize enhanced modals manager if not already initialized
    if (!window.modalsManager) {
        window.modalsManager = new ModalsManager();
    }

    // Initialize other managers if needed
    if (!window.analyticsManager) {
        window.analyticsManager = new AnalyticsManager();
    }

    if (!window.weatherManager) {
        window.weatherManager = new WeatherManager();
    }

    if (!window.widgetsManager) {
        window.widgetsManager = new WidgetsManager();
    }

    if (!window.animationsManager) {
        window.animationsManager = new AnimationsManager();
    }

    
    AIInsights.init();

    // Enhance ad analytics modal
AdPackageManager.renderPackages();

    // Ensure all modal close buttons work
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn && !closeBtn.hasAttribute('data-handler-attached')) {
            closeBtn.setAttribute('data-handler-attached', 'true');
            closeBtn.addEventListener('click', () => {
                window.modalsManager.close(modal.id);
            });
        }

        // Ensure overlay closes modal
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay && !overlay.hasAttribute('data-handler-attached')) {
            overlay.setAttribute('data-handler-attached', 'true');
            overlay.addEventListener('click', () => {
                window.modalsManager.close(modal.id);
            });
        }
    });

    // Fix ad placeholder learn more buttons
    document.querySelectorAll('.ad-cta').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.modalsManager.open('adAnalyticsModal');
        });
    });

    // Ensure all buttons have proper handlers
    attachAllButtonHandlers();

    console.log("✅ Training Center Profile Part 4 - All buttons initialized!");
});

// ============================================
// ATTACH ALL BUTTON HANDLERS
// ============================================
// Update the button handler attachments (around line 1340)
function attachAllButtonHandlers() {
    // Fix edit profile button
    const editProfileBtn = document.querySelector('.edit-profile');
    if (editProfileBtn && !editProfileBtn.hasAttribute('data-handler')) {
        editProfileBtn.setAttribute('data-handler', 'true');
        editProfileBtn.addEventListener('click', () => {
            window.modalsManager.open('edit-profile-modal'); // Correct ID
        });
    }

    // Fix schedule button  
    const scheduleBtn = document.querySelector('.set-schedule');
    if (scheduleBtn && !scheduleBtn.hasAttribute('data-handler')) {
        scheduleBtn.setAttribute('data-handler', 'true');
        scheduleBtn.addEventListener('click', () => {
            window.modalsManager.open('create-session-modal'); // Correct ID
        });
    }
}

// Export managers for global access
window.ModalsManager = ModalsManager;
window.AnalyticsManager = AnalyticsManager;
window.WeatherManager = WeatherManager;
window.WidgetsManager = WidgetsManager;
window.AnimationsManager = AnimationsManager