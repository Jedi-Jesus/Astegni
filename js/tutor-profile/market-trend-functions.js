/**
 * MARKET TREND ANALYSIS - COMPLETE FUNCTIONALITY
 * Integrated into Package Management Modal
 * Features: Interactive charts, data tables, price suggestions
 */

// Sample tutor data organized by time periods (3, 6, 9, 12 months)
// Adapted for Ethiopian context with ETB pricing
const tutorDataByTime = {
    3: [
        { name: "Abebe Tadesse", rating: 4.8, students: 20, achievement: 15, certifications: 2, experience: 5, pricePerHour: 200 },
        { name: "Hana Mekonnen", rating: 4.2, students: 15, achievement: 10, certifications: 1, experience: 3, pricePerHour: 150 },
        { name: "Yohannes Haile", rating: 4.5, students: 25, achievement: 20, certifications: 3, experience: 7, pricePerHour: 250 },
        { name: "Sara Desta", rating: 3.9, students: 10, achievement: -8, certifications: 0, experience: 2, pricePerHour: 120 },
        { name: "Dawit Tesfaye", rating: 4.7, students: 30, achievement: 18, certifications: 2, experience: 6, pricePerHour: 220 },
        { name: "Marta Bekele", rating: 4.6, students: 22, achievement: 16, certifications: 2, experience: 5, pricePerHour: 210 },
        { name: "Alemayehu Girma", rating: 4.3, students: 18, achievement: 12, certifications: 1, experience: 4, pricePerHour: 170 },
        { name: "Tigist Solomon", rating: 4.9, students: 35, achievement: 22, certifications: 3, experience: 8, pricePerHour: 280 }
    ],
    6: [
        { name: "Abebe Tadesse", rating: 4.7, students: 22, achievement: 16, certifications: 2, experience: 5.5, pricePerHour: 210 },
        { name: "Hana Mekonnen", rating: 4.3, students: 18, achievement: 12, certifications: 1, experience: 3.5, pricePerHour: 160 },
        { name: "Yohannes Haile", rating: 4.6, students: 28, achievement: 22, certifications: 3, experience: 7.5, pricePerHour: 260 },
        { name: "Sara Desta", rating: 4.0, students: 12, achievement: -9, certifications: 0, experience: 2.5, pricePerHour: 130 },
        { name: "Dawit Tesfaye", rating: 4.8, students: 32, achievement: 19, certifications: 2, experience: 6.5, pricePerHour: 230 },
        { name: "Marta Bekele", rating: 4.7, students: 25, achievement: 17, certifications: 2, experience: 5.5, pricePerHour: 220 },
        { name: "Alemayehu Girma", rating: 4.4, students: 20, achievement: 13, certifications: 1, experience: 4.5, pricePerHour: 180 },
        { name: "Tigist Solomon", rating: 5.0, students: 38, achievement: 24, certifications: 3, experience: 8.5, pricePerHour: 300 }
    ],
    9: [
        { name: "Abebe Tadesse", rating: 4.9, students: 25, achievement: 17, certifications: 3, experience: 6, pricePerHour: 220 },
        { name: "Hana Mekonnen", rating: 4.4, students: 20, achievement: 13, certifications: 1, experience: 4, pricePerHour: 170 },
        { name: "Yohannes Haile", rating: 4.7, students: 30, achievement: 24, certifications: 4, experience: 8, pricePerHour: 270 },
        { name: "Sara Desta", rating: 4.1, students: 15, achievement: -10, certifications: 1, experience: 3, pricePerHour: 140 },
        { name: "Dawit Tesfaye", rating: 4.9, students: 35, achievement: 20, certifications: 3, experience: 7, pricePerHour: 250 },
        { name: "Marta Bekele", rating: 4.8, students: 27, achievement: 18, certifications: 2, experience: 6, pricePerHour: 230 },
        { name: "Alemayehu Girma", rating: 4.5, students: 22, achievement: 14, certifications: 2, experience: 5, pricePerHour: 190 },
        { name: "Tigist Solomon", rating: 5.0, students: 40, achievement: 25, certifications: 4, experience: 9, pricePerHour: 320 }
    ],
    12: [
        { name: "Abebe Tadesse", rating: 5.0, students: 28, achievement: 18, certifications: 3, experience: 6.5, pricePerHour: 240 },
        { name: "Hana Mekonnen", rating: 4.5, students: 22, achievement: 14, certifications: 2, experience: 4.5, pricePerHour: 180 },
        { name: "Yohannes Haile", rating: 4.8, students: 33, achievement: 25, certifications: 4, experience: 8.5, pricePerHour: 290 },
        { name: "Sara Desta", rating: 4.2, students: 18, achievement: -11, certifications: 1, experience: 3.5, pricePerHour: 150 },
        { name: "Dawit Tesfaye", rating: 5.0, students: 38, achievement: 22, certifications: 3, experience: 7.5, pricePerHour: 270 },
        { name: "Marta Bekele", rating: 4.9, students: 30, achievement: 19, certifications: 3, experience: 6.5, pricePerHour: 250 },
        { name: "Alemayehu Girma", rating: 4.6, students: 25, achievement: 15, certifications: 2, experience: 5.5, pricePerHour: 200 },
        { name: "Tigist Solomon", rating: 5.0, students: 42, achievement: 26, certifications: 4, experience: 9.5, pricePerHour: 350 }
    ]
};

// Global variables for market trend functionality
let marketChartInstance = null;
let currentMarketTimePeriod = 3;
let visibleMarketDatasets = [true, true, true, true, true, true];

/**
 * Aggregate tutor data by rating ranges
 * Groups tutors with similar ratings (±0.1) and calculates averages
 */
function aggregateDataByRating(tutorData) {
    const ratingRange = 0.1;
    const ratings = [...new Set(tutorData.map(t => Math.round(t.rating * 10) / 10))].sort((a, b) => a - b);

    return ratings.map(rating => {
        const similarTutors = tutorData.filter(t =>
            t.rating >= rating - ratingRange && t.rating <= rating + ratingRange
        );
        const count = similarTutors.length;

        return {
            rating: rating.toFixed(1),
            count: count,
            avgStudents: count ? (similarTutors.reduce((sum, t) => sum + t.students, 0) / count).toFixed(1) : 0,
            avgAchievement: count ? (similarTutors.reduce((sum, t) => sum + t.achievement, 0) / count).toFixed(1) : 0,
            avgCertifications: count ? (similarTutors.reduce((sum, t) => sum + t.certifications, 0) / count).toFixed(1) : 0,
            avgExperience: count ? (similarTutors.reduce((sum, t) => sum + t.experience, 0) / count).toFixed(1) : 0,
            avgPrice: count ? (similarTutors.reduce((sum, t) => sum + t.pricePerHour, 0) / count).toFixed(2) : 0
        };
    });
}

/**
 * Switch between sidebar views (pricing or price)
 * Called from market trend cards in packageSidebar
 */
window.switchMarketTrendView = function(view) {
    console.log('🔄 Switching market trend view to:', view);

    // Update card states (in Market Trend Panel)
    const marketPanel = document.getElementById('marketTrendPanel');
    if (marketPanel) {
        const cards = marketPanel.querySelectorAll('.market-trend-card');
        cards.forEach(card => {
            if (card.getAttribute('data-view') === view) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    // Get containers
    const graphContainer = document.getElementById('marketGraphContainer');
    const tableContainer = document.getElementById('marketTableContainer');
    const priceContainer = document.getElementById('marketPriceContainer');
    const graphTypeButtons = document.getElementById('marketGraphTypeButtons');

    // Hide all containers
    if (graphContainer) graphContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (priceContainer) priceContainer.classList.add('hidden');

    if (view === 'pricing') {
        // Show graph type buttons
        if (graphTypeButtons) graphTypeButtons.style.display = 'flex';

        // Show graph container (user clicks Update Graph button to load data)
        if (graphContainer) {
            graphContainer.classList.remove('hidden');
            // Only auto-load if chart doesn't exist (first time)
            if (!marketChartInstance) {
                updateMarketGraph();
            }
        }
    } else if (view === 'price') {
        // Hide graph type buttons
        if (graphTypeButtons) graphTypeButtons.style.display = 'none';

        // Show price container (user clicks Calculate button to get price)
        if (priceContainer) {
            priceContainer.classList.remove('hidden');
            // Clear previous results
            const priceResult = document.getElementById('marketPriceResult');
            if (priceResult) {
                priceResult.innerHTML = '';
                priceResult.style.display = 'none';
            }
        }
    }

    console.log('✅ Market trend view switched to:', view);
};

/**
 * Toggle between different market views (line-graph, bar-graph, table) - kept for backwards compatibility
 */
window.toggleMarketView = function(view) {
    console.log('🔄 Switching market view to:', view);

    // Hide all containers
    const graphContainer = document.getElementById('marketGraphContainer');
    const tableContainer = document.getElementById('marketTableContainer');
    const priceContainer = document.getElementById('marketPriceContainer');

    if (graphContainer) graphContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (priceContainer) priceContainer.classList.add('hidden');

    // Show selected view
    if (view === 'line-graph' || view === 'bar-graph') {
        if (graphContainer) {
            graphContainer.classList.remove('hidden');
            if (!marketChartInstance) {
                updateMarketGraph();
            } else {
                updateMarketGraph();
            }
        }
    } else if (view === 'table') {
        if (tableContainer) {
            tableContainer.classList.remove('hidden');
            populateMarketTable();
        }
    } else if (view === 'price') {
        if (priceContainer) {
            priceContainer.classList.remove('hidden');
            setTimeout(() => suggestMarketPrice(), 100);
        }
    }

    console.log('✅ Market view switched to:', view);
};

/**
 * Change graph type using the buttons in Pricing Trends card
 */
window.changeGraphType = function(type) {
    console.log('📊 Changing graph type to:', type);

    // Update button states
    const buttons = document.querySelectorAll('.graph-type-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
            btn.style.background = 'var(--primary-color)';
            btn.style.color = 'white';
            btn.style.border = 'none';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'var(--hover-bg)';
            btn.style.color = 'var(--text-primary)';
            btn.style.border = '1px solid var(--border-color)';
        }
    });

    // Switch view based on type
    if (type === 'line') {
        toggleMarketView('line-graph');
    } else if (type === 'bar') {
        toggleMarketView('bar-graph');
    } else if (type === 'table') {
        toggleMarketView('table');
    }
};

/**
 * Update time period display only (no auto-calculation)
 * Used when user slides the time period slider
 */
window.updateMarketTimePeriodOnly = function(value) {
    currentMarketTimePeriod = parseInt(value);

    // Update all time value displays
    const timeDisplays = ['graphTimeValue', 'tableTimeValue', 'priceTimeValue'];
    timeDisplays.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.textContent = value;
    });

    // Sync all sliders
    const sliders = ['graphTimePeriod', 'tableTimePeriod', 'priceTimePeriod'];
    sliders.forEach(id => {
        const slider = document.getElementById(id);
        if (slider) slider.value = value;
    });

    console.log('⏱️ Time period updated to:', value, 'months (manual update required)');
};

/**
 * Legacy function - kept for backwards compatibility
 */
window.updateMarketTimePeriod = function(value) {
    updateMarketTimePeriodOnly(value);
};

window.updateTableTimePeriod = function(value) {
    updateMarketTimePeriodOnly(value);
};

window.updatePriceTimePeriod = function(value) {
    updateMarketTimePeriodOnly(value);
};

/**
 * Auto-update price when slider changes
 */
window.updatePriceTimePeriodAuto = function(value) {
    updateMarketTimePeriod(value);
    // Auto-trigger price calculation
    setTimeout(() => suggestMarketPrice(), 100);
};

/**
 * Toggle dataset visibility in the chart
 */
window.toggleMarketDataset = function(checkbox) {
    const datasetIndex = parseInt(checkbox.dataset.dataset);
    visibleMarketDatasets[datasetIndex] = checkbox.checked;
    updateMarketGraph();
    console.log('📊 Dataset', datasetIndex, checkbox.checked ? 'shown' : 'hidden');
};

// Store current graph type
let currentGraphType = 'line';

/**
 * Update the market trends chart
 */
window.updateMarketGraph = function() {
    console.log('📊 Updating market graph...');

    // Get graph type from active button or use current type
    const activeGraphBtn = document.querySelector('.graph-type-btn.active');
    if (activeGraphBtn) {
        currentGraphType = activeGraphBtn.getAttribute('data-type');
    }
    const graphType = currentGraphType;
    const ctx = document.getElementById('marketChart');

    if (!ctx) {
        console.error('❌ Market chart canvas not found');
        return;
    }

    const tutorData = tutorDataByTime[currentMarketTimePeriod];
    const aggregatedData = aggregateDataByRating(tutorData);

    const spinner = document.getElementById('marketSpinner');
    const canvas = document.getElementById('marketChart');

    // Show loading state
    if (spinner) spinner.style.display = 'block';
    if (canvas) canvas.classList.add('hidden');

    // Destroy existing chart
    if (marketChartInstance) {
        marketChartInstance.destroy();
    }

    // Create new chart after brief delay
    setTimeout(() => {
        marketChartInstance = new Chart(ctx.getContext('2d'), {
            type: graphType,
            data: {
                labels: aggregatedData.map(data => data.rating),
                datasets: [
                    {
                        label: 'Number of Tutors',
                        data: visibleMarketDatasets[0] ? aggregatedData.map(data => data.count) : [],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.4)',
                        yAxisID: 'y',
                        tension: graphType === 'line' ? 0.3 : 0,
                        pointRadius: 5
                    },
                    {
                        label: 'Average Students',
                        data: visibleMarketDatasets[1] ? aggregatedData.map(data => data.avgStudents) : [],
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.4)',
                        yAxisID: 'y1',
                        tension: graphType === 'line' ? 0.3 : 0,
                        pointRadius: 5
                    },
                    {
                        label: 'Average Achievement (%)',
                        data: visibleMarketDatasets[2] ? aggregatedData.map(data => data.avgAchievement) : [],
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.4)',
                        yAxisID: 'y2',
                        tension: graphType === 'line' ? 0.3 : 0,
                        pointRadius: 5
                    },
                    {
                        label: 'Average Price per Hour (ETB)',
                        data: visibleMarketDatasets[3] ? aggregatedData.map(data => data.avgPrice) : [],
                        borderColor: 'rgba(255, 206, 86, 1)',
                        backgroundColor: 'rgba(255, 206, 86, 0.4)',
                        yAxisID: 'y3',
                        tension: graphType === 'line' ? 0.3 : 0,
                        pointRadius: 5
                    },
                    {
                        label: 'Average Certifications',
                        data: visibleMarketDatasets[4] ? aggregatedData.map(data => data.avgCertifications) : [],
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.4)',
                        yAxisID: 'y4',
                        tension: graphType === 'line' ? 0.3 : 0,
                        pointRadius: 5
                    },
                    {
                        label: 'Average Experience (Years)',
                        data: visibleMarketDatasets[5] ? aggregatedData.map(data => data.avgExperience) : [],
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.4)',
                        yAxisID: 'y5',
                        tension: graphType === 'line' ? 0.3 : 0,
                        pointRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuad'
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: visibleMarketDatasets[0],
                        position: 'left',
                        title: { display: true, text: 'No. of Tutors' },
                        min: 0
                    },
                    y1: {
                        type: 'linear',
                        display: visibleMarketDatasets[1],
                        position: 'right',
                        title: { display: true, text: 'Avg Students' },
                        grid: { drawOnChartArea: false },
                        min: 0
                    },
                    y2: {
                        type: 'linear',
                        display: visibleMarketDatasets[2],
                        position: 'right',
                        title: { display: true, text: 'Avg Achievement (%)' },
                        grid: { drawOnChartArea: false }
                    },
                    y3: {
                        type: 'linear',
                        display: visibleMarketDatasets[3],
                        position: 'right',
                        title: { display: true, text: 'Avg Price (ETB)' },
                        grid: { drawOnChartArea: false },
                        min: 0
                    },
                    y4: {
                        type: 'linear',
                        display: visibleMarketDatasets[4],
                        position: 'right',
                        title: { display: true, text: 'Avg Certifications' },
                        grid: { drawOnChartArea: false },
                        min: 0
                    },
                    y5: {
                        type: 'linear',
                        display: visibleMarketDatasets[5],
                        position: 'right',
                        title: { display: true, text: 'Avg Experience (Years)' },
                        grid: { drawOnChartArea: false },
                        min: 0
                    },
                    x: {
                        title: { display: true, text: 'Rating' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });

        // Hide loading state
        if (spinner) spinner.style.display = 'none';
        if (canvas) canvas.classList.remove('hidden');

        console.log('✅ Market graph rendered successfully');
    }, 300);
};

/**
 * Populate the market data table
 */
window.populateMarketTable = function() {
    console.log('📋 Populating market table...');

    const tableBody = document.getElementById('marketTableBody');
    if (!tableBody) {
        console.error('❌ Market table body not found');
        return;
    }

    const tutorData = tutorDataByTime[currentMarketTimePeriod];
    const aggregatedData = aggregateDataByRating(tutorData);

    tableBody.innerHTML = '';

    aggregatedData.forEach(data => {
        const row = document.createElement('tr');
        const achievement = parseFloat(data.avgAchievement);
        const signClass = achievement >= 0 ? 'positive' : 'negative';
        const sign = achievement >= 0 ? '+' : '−';
        const achievementDisplay = `${sign}${Math.abs(achievement).toFixed(1)}`;

        row.innerHTML = `
            <td>${data.rating}</td>
            <td>${data.count}</td>
            <td>${data.avgStudents}</td>
            <td><span class="${signClass}">${achievementDisplay}</span></td>
            <td>${data.avgCertifications}</td>
            <td>${data.avgExperience}</td>
            <td>${data.avgPrice}</td>
        `;

        tableBody.appendChild(row);
    });

    console.log('✅ Market table populated with', aggregatedData.length, 'rows');
};

/**
 * Calculate and display suggested price for tutor
 */
window.suggestMarketPrice = function() {
    console.log('💰 Calculating suggested price...');

    const priceResult = document.getElementById('marketPriceResult');
    if (!priceResult) {
        console.error('❌ Price result container not found');
        return;
    }

    const tutorData = tutorDataByTime[currentMarketTimePeriod];

    // Simulate logged-in tutor by selecting random tutor from data
    const randomTutor = tutorData[Math.floor(Math.random() * tutorData.length)];
    const username = randomTutor.name;
    const rating = randomTutor.rating;

    // Find tutors with similar ratings (within ±0.1)
    const ratingRange = 0.1;
    const similarTutors = tutorData.filter(tutor =>
        tutor.rating >= rating - ratingRange && tutor.rating <= rating + ratingRange
    );

    // Calculate average price of similar tutors
    const avgPrice = similarTutors.length > 0
        ? similarTutors.reduce((sum, tutor) => sum + tutor.pricePerHour, 0) / similarTutors.length
        : tutorData.reduce((sum, tutor) => sum + tutor.pricePerHour, 0) / tutorData.length;

    // Time period adjustment (longer periods increase price slightly)
    const timeFactor = 1 + (currentMarketTimePeriod - 3) * 0.05;

    // Suggested price with time adjustment
    const suggestedPrice = Math.round(avgPrice * timeFactor);

    // Ensure price is within reasonable range (100-400 ETB)
    const finalPrice = Math.max(100, Math.min(suggestedPrice, 400));

    // Display personalized results (direct display without box)
    priceResult.innerHTML = `
        <p style="font-size: 1.3rem; font-weight: 700; color: #16a34a; margin-bottom: 1.5rem;">
            Dear ${username},
        </p>
        <p style="font-size: 1rem; color: var(--text-primary); margin-bottom: 0.5rem;">
            Your Rating: <strong style="font-size: 1.1rem; color: var(--primary-color);">${rating.toFixed(1)} ⭐</strong>
        </p>
        <p style="font-size: 1.5rem; font-weight: 700; color: #16a34a; margin: 2rem 0;">
            Your suggested hourly price: <strong style="font-size: 1.8rem;">${finalPrice} ETB</strong>
        </p>
        <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem; font-style: italic;">
            (Based on ${currentMarketTimePeriod}-month market trends)
        </p>
        <hr style="border: none; border-top: 2px solid rgba(22, 163, 74, 0.3); margin: 2rem 0;">
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem;">
            📊 Price Breakdown:
        </p>
        <ul style="font-size: 1rem; color: var(--text-primary); line-height: 2; margin: 0; padding-left: 1.5rem;">
            <li>Matched with <strong style="color: var(--primary-color);">${similarTutors.length} tutor(s)</strong> with ratings between <strong>${Math.max(0, rating - ratingRange).toFixed(1)}</strong> and <strong>${(rating + ratingRange).toFixed(1)}</strong></li>
            <li>Average price of similar tutors: <strong style="color: var(--primary-color);">${avgPrice.toFixed(2)} ETB</strong></li>
            <li>Time adjustment: <strong style="color: var(--primary-color);">+${Math.round((timeFactor - 1) * 100)}%</strong> for ${currentMarketTimePeriod}-month trends</li>
            <li>Final suggested range: <strong style="color: #16a34a;">${Math.max(100, finalPrice - 20)} - ${Math.min(400, finalPrice + 20)} ETB</strong></li>
        </ul>
        <div style="margin-top: 2.5rem; padding: 1.5rem; background: rgba(22, 163, 74, 0.1); border-left: 4px solid #16a34a; border-radius: 8px;">
            <p style="margin: 0; font-size: 0.95rem; color: var(--text-primary); line-height: 1.6;">
                <strong>💡 Tip:</strong> Building a consistent track record with high ratings is key to commanding higher prices. Focus on student outcomes, communication, and professionalism to increase your market value.
            </p>
        </div>
    `;

    priceResult.style.display = 'block';

    console.log('✅ Price suggestion calculated:', finalPrice, 'ETB');
};

console.log('✅ Market trend functions loaded successfully');
