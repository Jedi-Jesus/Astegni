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