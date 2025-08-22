// ============================================
// TRAINING CENTER PROFILE - PART 4
// BUTTON HANDLERS AND MODAL MANAGERS
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
    }

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = "flex";
            modal.classList.add("show");
            this.activeModals.add(modalId);

            // Ensure modal is properly styled
            this.ensureModalStyle(modal);

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
        }
    }

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("show");
            setTimeout(() => {
                modal.style.display = "none";
            }, 300);
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
            modal.style.display = "none";
        });
        this.activeModals.clear();
    }

    ensureModalStyle(modal) {
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.zIndex = "10000";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
    }
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
// ANIMATIONS MANAGER
// ============================================
class AnimationsManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.addHoverEffects();
        this.addParallaxEffects();
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px",
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("animated");
                    entry.target.style.animationDelay = `${Math.random() * 0.3}s`;
                }
            });
        }, options);

        const elements = document.querySelectorAll(
            ".stat-card, .award-card, .follow-card, .class-card, .video-card, .blog-card"
        );
        elements.forEach((el) => observer.observe(el));
    }

    addHoverEffects() {
        document
            .querySelectorAll(".stat-card, .award-card, .class-card")
            .forEach((card) => {
                card.addEventListener("mousemove", (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    const rotateX = (y - centerY) / 10;
                    const rotateY = (centerX - x) / 10;

                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
                    card.style.transition = "transform 0.1s ease";
                });

                card.addEventListener("mouseleave", () => {
                    card.style.transform = "";
                    card.style.transition = "transform 0.5s ease";
                });
            });
    }

    addParallaxEffects() {
        window.addEventListener("scroll", () => {
            const scrolled = window.pageYOffset;

            const coverImg = document.querySelector(".cover-img");
            if (coverImg) {
                coverImg.style.transform = `translateY(${scrolled * 0.5}px)`;
            }

            document.querySelectorAll(".stat-card").forEach((card, index) => {
                const speed = 0.5 + index * 0.1;
                card.style.transform = `translateY(${scrolled * -speed * 0.1}px)`;
            });
        });
    }
}

// ============================================
// AD ANALYTICS MODAL ENHANCEMENT
// ============================================
function enhanceAdAnalyticsModal() {
    // Update the modal content to show yearly packages
    const modal = document.getElementById("adAnalyticsModal");
    if (modal) {
        const packagesSection = modal.querySelector(".ad-packages");
        if (packagesSection) {
            packagesSection.innerHTML = `
                <h3>Advertising Packages</h3>
                <div class="package-tabs">
                    <button class="package-tab active" onclick="showPackageType('monthly')">Monthly</button>
                    <button class="package-tab" onclick="showPackageType('yearly')">Yearly (Best Value)</button>
                    <button class="package-tab" onclick="showPackageType('custom')">Custom</button>
                </div>
                <div class="packages-grid" id="packagesGrid">
                    ${getPackagesHTML('monthly')}
                </div>
            `;
        }
    }
}

function getPackagesHTML(type) {
    const packages = {
        monthly: `
            <div class="package-card">
                <h4>Starter</h4>
                <div class="package-price">$299/mo</div>
                <ul>
                    <li>50,000 impressions</li>
                    <li>Basic targeting</li>
                    <li>Performance reports</li>
                </ul>
                <button class="btn-primary" onclick="selectPackage('starter-monthly')">Select</button>
            </div>
            <div class="package-card">
                <h4>Professional</h4>
                <div class="package-price">$999/mo</div>
                <ul>
                    <li>250,000 impressions</li>
                    <li>Advanced targeting</li>
                    <li>A/B testing</li>
                    <li>Dedicated manager</li>
                </ul>
                <button class="btn-primary" onclick="selectPackage('pro-monthly')">Select</button>
            </div>
            <div class="package-card">
                <h4>Enterprise</h4>
                <div class="package-price">$2,999/mo</div>
                <ul>
                    <li>Unlimited impressions</li>
                    <li>Custom targeting</li>
                    <li>Priority placement</li>
                    <li>Full analytics suite</li>
                </ul>
                <button class="btn-primary" onclick="selectPackage('enterprise-monthly')">Select</button>
            </div>
        `,
        yearly: `
            <div class="package-card">
                <h4>Starter</h4>
                <div class="package-price">$2,990/yr</div>
                <div class="package-savings">Save $598!</div>
                <ul>
                    <li>600,000 impressions/year</li>
                    <li>Basic targeting</li>
                    <li>Performance reports</li>
                    <li>2 months FREE</li>
                </ul>
                <button class="btn-primary" onclick="selectPackage('starter-yearly')">Select</button>
            </div>
            <div class="package-card featured">
                <div class="featured-badge">Most Popular</div>
                <h4>Professional</h4>
                <div class="package-price">$9,990/yr</div>
                <div class="package-savings">Save $1,998!</div>
                <ul>
                    <li>3,000,000 impressions/year</li>
                    <li>Advanced targeting</li>
                    <li>A/B testing</li>
                    <li>Dedicated manager</li>
                    <li>2 months FREE</li>
                </ul>
                <button class="btn-primary" onclick="selectPackage('pro-yearly')">Best Value</button>
            </div>
            <div class="package-card">
                <h4>Enterprise</h4>
                <div class="package-price">$29,990/yr</div>
                <div class="package-savings">Save $5,998!</div>
                <ul>
                    <li>Unlimited impressions</li>
                    <li>Custom targeting</li>
                    <li>Priority placement</li>
                    <li>Full analytics suite</li>
                    <li>2 months FREE</li>
                </ul>
                <button class="btn-primary" onclick="selectPackage('enterprise-yearly')">Select</button>
            </div>
        `,
        custom: `
            <div class="custom-package-form">
                <h3>Custom Advertising Package</h3>
                <p>Tell us about your advertising needs and we'll create a custom package for you.</p>
                <form id="customPackageForm">
                    <div class="form-group">
                        <label>Budget Range</label>
                        <select class="form-select">
                            <option>$5,000 - $10,000</option>
                            <option>$10,000 - $25,000</option>
                            <option>$25,000 - $50,000</option>
                            <option>$50,000+</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Campaign Duration</label>
                        <input type="text" class="form-input" placeholder="e.g., 6 months">
                    </div>
                    <div class="form-group">
                        <label>Target Audience</label>
                        <textarea class="form-textarea" placeholder="Describe your target audience..."></textarea>
                    </div>
                    <button type="button" class="btn-primary" onclick="submitCustomPackage()">Get Custom Quote</button>
                </form>
            </div>
        `
    };
    
    return packages[type] || packages.monthly;
}

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
    enhanceAdAnalyticsModal();

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
function attachAllButtonHandlers() {
    // Profile action buttons
    const editProfileBtn = document.querySelector('.edit-profile');
    if (editProfileBtn && !editProfileBtn.hasAttribute('data-handler')) {
        editProfileBtn.setAttribute('data-handler', 'true');
        editProfileBtn.addEventListener('click', () => {
            window.modalsManager.open('editProfileModal');
        });
    }

    const scheduleBtn = document.querySelector('.set-schedule');
    if (scheduleBtn && !scheduleBtn.hasAttribute('data-handler')) {
        scheduleBtn.setAttribute('data-handler', 'true');
        scheduleBtn.addEventListener('click', () => {
            window.modalsManager.open('scheduleModal');
        });
    }

    // Follow cards
    document.querySelectorAll('.follow-card').forEach(card => {
        if (!card.hasAttribute('data-handler')) {
            card.setAttribute('data-handler', 'true');
            card.style.cursor = 'pointer';
        }
    });

    // Video upload button
    const uploadVideoBtn = document.querySelector('[onclick="openUploadVideoModal()"]');
    if (uploadVideoBtn && !uploadVideoBtn.hasAttribute('data-handler')) {
        uploadVideoBtn.setAttribute('data-handler', 'true');
        uploadVideoBtn.addEventListener('click', () => {
            window.modalsManager.open('uploadVideoModal');
        });
    }

    // Blog create button
    const createBlogBtn = document.querySelector('[onclick="openCreateBlogModal()"]');
    if (createBlogBtn && !createBlogBtn.hasAttribute('data-handler')) {
        createBlogBtn.setAttribute('data-handler', 'true');
        createBlogBtn.addEventListener('click', () => {
            window.modalsManager.open('createBlogModal');
        });
    }

    // All modal open buttons
    document.querySelectorAll('[onclick*="Modal"]').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('open')) {
            const modalName = onclickAttr.match(/open(\w+Modal)/);
            if (modalName && modalName[1]) {
                const modalId = modalName[1].charAt(0).toLowerCase() + modalName[1].slice(1);
                btn.removeAttribute('onclick');
                btn.addEventListener('click', () => {
                    window.modalsManager.open(modalId);
                });
            }
        }
    });

    // Fix notification button
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn && !notificationBtn.hasAttribute('data-handler')) {
        notificationBtn.setAttribute('data-handler', 'true');
        notificationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.notificationsManager) {
                window.notificationsManager.open();
            }
        });
    }

    // Fix theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle && !themeToggle.hasAttribute('data-handler')) {
        themeToggle.setAttribute('data-handler', 'true');
        themeToggle.addEventListener('click', () => {
            if (window.trainingCenterProfile && window.trainingCenterProfile.theme) {
                window.trainingCenterProfile.theme.toggle();
            }
        });
    }

    // Fix sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle && !sidebarToggle.hasAttribute('data-handler')) {
        sidebarToggle.setAttribute('data-handler', 'true');
        sidebarToggle.addEventListener('click', () => {
            if (window.trainingCenterProfile && window.trainingCenterProfile.sidebar) {
                window.trainingCenterProfile.sidebar.toggle();
            }
        });
    }
}

// Export managers for global access
window.ModalsManager = ModalsManager;
window.AnalyticsManager = AnalyticsManager;
window.WeatherManager = WeatherManager;
window.WidgetsManager = WidgetsManager;
window.AnimationsManager = AnimationsManager