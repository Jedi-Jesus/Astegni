/**
 * Earnings Widget Manager
 * Handles the monthly earnings and investments line graph widget
 */

const EarningsWidget = {
    canvas: null,
    ctx: null,
    earningsData: [],
    investmentsData: [],
    currentType: 'earnings', // 'earnings' or 'investments'
    API_BASE_URL: window.API_BASE_URL || 'http://localhost:8000',

    init() {
        this.canvas = document.getElementById('earnings-line-chart');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.setupEventListeners();
        this.loadData();
    },

    setupCanvas() {
        // Set canvas size for high DPI displays
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.ctx.scale(dpr, dpr);
    },

    setupEventListeners() {
        const typeSelect = document.getElementById('earnings-period-select');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.currentType = e.target.value;
                this.switchDataType(this.currentType);
            });
        }
    },

    /**
     * Get auth headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    /**
     * Load both earnings and investments data
     */
    async loadData() {
        await Promise.all([
            this.loadEarningsData(),
            this.loadInvestmentsData()
        ]);

        // Show earnings by default
        this.switchDataType('earnings');
    },

    /**
     * Load earnings data from API
     */
    async loadEarningsData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/summary?months=6`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load earnings data, using sample data');
                this.earningsData = this.generateSampleEarningsData();
                return;
            }

            const data = await response.json();

            // Transform API data to widget format
            this.earningsData = data.monthly_data.reverse().map(item => ({
                month: new Date(item.year, item.month - 1).toLocaleDateString('en-US', { month: 'short' }),
                earnings: item.total_earnings
            }));
        } catch (error) {
            console.error('Error loading earnings data:', error);
            this.earningsData = this.generateSampleEarningsData();
        }
    },

    /**
     * Load investments data from API
     */
    async loadInvestmentsData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/investments/summary`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load investments data, using sample data');
                this.investmentsData = this.generateSampleInvestmentsData();
                return;
            }

            const data = await response.json();

            // Group investments by month for the chart
            const monthlyInvestments = {};
            data.investments.forEach(inv => {
                const date = new Date(inv.investment_date);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

                if (!monthlyInvestments[monthKey]) {
                    monthlyInvestments[monthKey] = {
                        month: monthLabel,
                        investments: 0,
                        impressions: 0
                    };
                }

                monthlyInvestments[monthKey].investments += inv.amount;
                monthlyInvestments[monthKey].impressions += inv.impressions || 0;
            });

            // Convert to array and sort by date (last 6 months)
            this.investmentsData = Object.values(monthlyInvestments)
                .sort((a, b) => {
                    const aDate = new Date(a.month + ' 2024');
                    const bDate = new Date(b.month + ' 2024');
                    return aDate - bDate;
                })
                .slice(-6);
        } catch (error) {
            console.error('Error loading investments data:', error);
            this.investmentsData = this.generateSampleInvestmentsData();
        }
    },

    /**
     * Switch between earnings and investments data
     */
    switchDataType(type) {
        this.currentType = type;

        // Update widget title
        const titleElement = document.getElementById('widget-title');
        if (titleElement) {
            titleElement.textContent = type === 'earnings' ? '💰 Monthly Earnings' : '💎 Monthly Investments';
        }

        // Update change label
        const changeLabelElement = document.getElementById('change-label');
        if (changeLabelElement) {
            changeLabelElement.textContent = type === 'earnings' ? 'vs last month' : 'vs last month';
        }

        // Update data and chart
        const currentData = type === 'earnings' ? this.earningsData : this.investmentsData;
        this.updateChart(currentData, type);
        this.updateStats(currentData, type);
        this.updateMonthLabels(currentData);
    },

    updateChart(data, type = 'earnings') {
        if (!this.ctx || !data || !data.length) return;

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Extract values based on type
        const values = data.map(d => type === 'earnings' ? d.earnings : d.investments);
        const maxValue = Math.max(...values, 1);
        const minValue = Math.min(...values, 0);

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw grid lines (subtle)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(width - padding, y);
            this.ctx.stroke();
        }

        // Calculate points
        const points = data.map((item, index) => {
            const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
            const value = type === 'earnings' ? item.earnings : item.investments;
            const normalizedValue = (value - minValue) / (maxValue - minValue || 1);
            const y = height - padding - (normalizedValue * chartHeight);
            return { x, y, value };
        });

        // Draw gradient fill under line
        if (points.length > 1) {
            const gradient = this.ctx.createLinearGradient(0, padding, 0, height - padding);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, height - padding);
            points.forEach(point => {
                this.ctx.lineTo(point.x, point.y);
            });
            this.ctx.lineTo(points[points.length - 1].x, height - padding);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // Draw line
        if (points.length > 0) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);

            // Smooth curve using quadratic curves
            for (let i = 1; i < points.length; i++) {
                const xMid = (points[i - 1].x + points[i].x) / 2;
                const yMid = (points[i - 1].y + points[i].y) / 2;
                this.ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xMid, yMid);
            }

            // Draw last segment
            if (points.length > 1) {
                const lastPoint = points[points.length - 1];
                const secondLastPoint = points[points.length - 2];
                this.ctx.quadraticCurveTo(secondLastPoint.x, secondLastPoint.y, lastPoint.x, lastPoint.y);
            }

            this.ctx.stroke();
        }

        // Draw points
        points.forEach((point, index) => {
            // Outer circle (glow)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            this.ctx.fill();

            // Inner circle
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    },

    updateStats(data, type = 'earnings') {
        if (!data || data.length === 0) return;

        // Current month (last value)
        const currentMonth = data[data.length - 1];
        const previousMonth = data[data.length - 2];

        const currentValue = type === 'earnings' ? (currentMonth?.earnings || 0) : (currentMonth?.investments || 0);
        const previousValue = type === 'earnings' ? (previousMonth?.earnings || 0) : (previousMonth?.investments || 0);

        // Update current month value
        const valueElement = document.getElementById('current-month-earnings');
        if (valueElement) {
            valueElement.textContent = currentValue.toLocaleString();
        }

        // Calculate and update change percentage
        if (previousValue > 0) {
            const change = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
            const changeElement = document.getElementById('earnings-change');
            if (changeElement) {
                const isPositive = change >= 0;
                changeElement.textContent = `${isPositive ? '+' : ''}${change}%`;
                changeElement.className = isPositive ? 'text-green-300' : 'text-red-300';
            }
        } else {
            const changeElement = document.getElementById('earnings-change');
            if (changeElement) {
                changeElement.textContent = '+0%';
                changeElement.className = 'text-green-300';
            }
        }
    },

    updateMonthLabels(data) {
        const labelsContainer = document.getElementById('earnings-months-labels');
        if (!labelsContainer || !data) return;

        // Show all months
        labelsContainer.innerHTML = data.map(item =>
            `<span>${item.month}</span>`
        ).join('');
    },

    // Generate sample earnings data for testing
    generateSampleEarningsData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map((month, index) => ({
            month,
            earnings: Math.floor(8000 + Math.random() * 7000 + index * 500)
        }));
    },

    // Generate sample investments data for testing
    generateSampleInvestmentsData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map((month, index) => ({
            month,
            investments: Math.floor(2000 + Math.random() * 5000 + index * 300),
            impressions: Math.floor(1000 + Math.random() * 3000 + index * 200)
        }));
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        EarningsWidget.init();
    }, 100);
});
