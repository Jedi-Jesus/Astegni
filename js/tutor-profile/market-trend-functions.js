/**
 * MARKET TREND ANALYSIS - COMPLETE FUNCTIONALITY
 * Integrated into Package Management Modal
 * Features: Interactive charts, data tables, price suggestions
 * VERSION: 2.4.0 - Grade Level & Location Integration (2026-01-22)
 *
 * v2.4 Changes:
 * - Added Location similarity factor (15% weight) - Market economics
 * - Added Grade Level similarity factor (10% weight) - Teaching complexity
 * - Enhanced from 7 factors to 9 factors
 * - Rebalanced all weights to total 100%
 * - Updated UI to display location and grade level cards
 */

// FALLBACK DATA REMOVED - v2.4 requires real API data only
// If API fails, show error message instead of misleading sample data
console.log('📊 Market Trend Functions v2.4.0 loaded - Grade Level & Location Integration');

// Global variables for market trend functionality
let marketChartInstance = null;
window.marketChartInstance = null; // Make it globally accessible for sidebar toggle resize
let currentMarketTimePeriod = 3;
let currentMarketMetric = 'rating'; // v2.3 - Single metric on X-axis (rating, completion_rate, student_count, experience_years, credentials_count, account_age)

/**
 * Fetch real market tutor data from API (UPDATED v2.3 - Similar Tutors Only)
 * Returns ONLY tutors similar to you (similarity > 65%)
 */
async function fetchMarketTutorData(timePeriodMonths, sessionFormat = null, gradeLevelRange = null) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return null;

    try {
        const requestBody = {
            time_period_months: timePeriodMonths
        };

        // Add session format if provided (v2.2)
        if (sessionFormat) {
            requestBody.session_format = sessionFormat;
        }

        // Add grade level range if provided (v2.3 - can be single value or array)
        if (gradeLevelRange) {
            requestBody.grade_level = gradeLevelRange;
        }

        const response = await fetch(`${API_BASE_URL}/api/market-pricing/market-tutors`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) return null;
        const data = await response.json();
        const formatInfo = sessionFormat ? ` (${sessionFormat})` : '';
        console.log(`📊 v2.3 - Fetched ${data.count} SIMILAR tutors out of ${data.total_market_tutors} total${formatInfo}`);
        console.log(`👤 Your profile:`, data.requester_profile);
        console.log(`🎯 Similarity threshold: ${data.filters_applied?.similarity_threshold || 0.65}`);
        return data;
    } catch (error) {
        console.error('Failed to fetch market tutor data:', error);
        return null;
    }
}

/**
 * Aggregate tutor data by rating ranges (UPDATED for v2.3 with 7 factors)
 * Groups tutors with similar ratings (±0.1) and calculates averages
 * Note: Session format filtering happens at API level before aggregation
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
            // v2.3 SEVEN FACTORS (separated experience and credentials)
            avgCompletionRate: count ? (similarTutors.reduce((sum, t) => sum + (t.completion_rate || 0), 0) / count) : 0,
            avgStudentCount: count ? (similarTutors.reduce((sum, t) => sum + (t.student_count || t.students || 0), 0) / count).toFixed(1) : 0,
            avgExperienceScore: count ? (similarTutors.reduce((sum, t) => sum + (t.experience_score || t.experience || 0), 0) / count).toFixed(1) : 0,
            avgExperienceYears: count ? (similarTutors.reduce((sum, t) => sum + (t.experience_years || 0), 0) / count).toFixed(1) : 0,
            avgCredentialsScore: count ? (similarTutors.reduce((sum, t) => sum + (t.credentials_score || 0), 0) / count).toFixed(1) : 0,
            avgCredentialsCount: count ? (similarTutors.reduce((sum, t) => sum + (t.credentials_count || 0), 0) / count).toFixed(1) : 0,
            avgAccountAge: count ? (similarTutors.reduce((sum, t) => sum + (t.account_age_days || 0), 0) / count).toFixed(0) : 0,
            avgPrice: count ? (similarTutors.reduce((sum, t) => sum + (t.price_per_hour || t.pricePerHour || 0), 0) / count).toFixed(2) : 0,
            // Legacy fields for backward compatibility
            avgStudents: count ? (similarTutors.reduce((sum, t) => sum + (t.student_count || t.students || 0), 0) / count).toFixed(1) : 0,
            avgAchievement: count ? (similarTutors.reduce((sum, t) => sum + (t.achievement || 0), 0) / count).toFixed(1) : 0,
            avgCertifications: count ? (similarTutors.reduce((sum, t) => sum + (t.credentials_count || t.certifications || 0), 0) / count).toFixed(1) : 0,
            avgExperience: count ? (similarTutors.reduce((sum, t) => sum + (t.experience_score || t.experience || 0), 0) / count).toFixed(1) : 0
        };
    });
}

/**
 * DEPRECATED: Show price suggestion modal/container
 * Now handled by changeGraphType('price')
 */
window.showPriceSuggestion = function() {
    console.log('⚠️ showPriceSuggestion is deprecated, using changeGraphType instead');
    changeGraphType('price');
};

/**
 * DEPRECATED: Go back to pricing trends
 * Now handled by changeGraphType('line')
 */
window.backToTrends = function() {
    console.log('⚠️ backToTrends is deprecated, using changeGraphType instead');
    changeGraphType('line');
};

/**
 * DEPRECATED: Old function for main view switching
 */
window.switchMarketView = function(view) {
    console.log('⚠️ switchMarketView is deprecated, using new functions');
    if (view === 'price') {
        showPriceSuggestion();
    } else {
        backToTrends();
    }
};

/**
 * DEPRECATED: Old function for sidebar card switching (no longer used)
 * Keeping for backward compatibility
 */
window.switchMarketTrendView = function(view) {
    console.log('⚠️ switchMarketTrendView is deprecated, calling switchMarketView instead');
    // Map old 'pricing' view to new 'trends' view
    const newView = view === 'pricing' ? 'trends' : 'price';
    window.switchMarketView(newView);
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

    // Update card states (new card-based UI)
    const cards = document.querySelectorAll('.market-view-card');
    cards.forEach(card => {
        if (card.getAttribute('data-type') === type) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    // Update button states (legacy support for old button-based UI if still present)
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
            btn.style.border = '2px solid var(--border-color)';
        }
    });

    // Switch view based on type
    if (type === 'line') {
        toggleMarketView('line-graph');
    } else if (type === 'bar') {
        toggleMarketView('bar-graph');
    } else if (type === 'table') {
        toggleMarketView('table');
    } else if (type === 'price') {
        toggleMarketView('price');
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
 * Change which metric is shown on X-axis (v2.3 - Radio button selection)
 */
window.changeMarketMetric = function(metricValue) {
    currentMarketMetric = metricValue;
    console.log('📊 v2.3 - Changed X-axis metric to:', metricValue);
    updateMarketGraph();
};

// Store current graph type
let currentGraphType = 'line';

/**
 * Update the market trends chart (v2.3 - ONE metric at a time based on radio selection)
 * Shows only similar tutors (similarity >65%) grouped by selected metric
 */
window.updateMarketGraph = async function() {
    console.log(`📊 v2.3 - Updating market graph with ${currentMarketMetric} vs price...`);

    // Get graph type
    const activeCard = document.querySelector('.market-view-card.active');
    const activeGraphBtn = document.querySelector('.graph-type-btn.active');

    if (activeCard) {
        const cardType = activeCard.getAttribute('data-type');
        if (cardType === 'line' || cardType === 'bar') {
            currentGraphType = cardType;
        }
    } else if (activeGraphBtn) {
        currentGraphType = activeGraphBtn.getAttribute('data-type');
    }

    const graphType = currentGraphType;
    const ctx = document.getElementById('marketChart');

    if (!ctx) {
        console.error('❌ Market chart canvas not found');
        return;
    }

    const spinner = document.getElementById('marketSpinner');
    const canvas = document.getElementById('marketChart');

    // Show loading state
    if (spinner) spinner.style.display = 'block';
    if (canvas) canvas.classList.add('hidden');

    // Get filters from universal filter
    const sessionFormat = getUniversalSessionFormat();
    const gradeLevelRange = getUniversalGradeLevelRange();

    // Fetch ONLY similar tutors from API
    const marketData = await fetchMarketTutorData(currentMarketTimePeriod, sessionFormat, gradeLevelRange);

    // Check if API returned data
    if (!marketData || !marketData.tutors) {
        console.error('❌ Graph API failed - showing error message');
        console.error('Debug info:', {
            hasMarketData: !!marketData,
            hasTutors: marketData?.tutors !== undefined,
            tutorCount: marketData?.tutors?.length,
            sessionFormat: sessionFormat
        });

        // Hide loading state
        if (spinner) spinner.style.display = 'none';
        if (canvas) {
            canvas.classList.remove('hidden');
            // Show error message on canvas
            const ctx2d = canvas.getContext('2d');
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            ctx2d.font = '16px sans-serif';
            ctx2d.fillStyle = '#ef4444';
            ctx2d.textAlign = 'center';
            ctx2d.fillText('Unable to load market data', canvas.width / 2, canvas.height / 2 - 20);
            ctx2d.font = '14px sans-serif';
            ctx2d.fillStyle = '#6b7280';
            const errorMsg = !localStorage.getItem('access_token') && !localStorage.getItem('token')
                ? 'Please log in to view market trends'
                : 'No similar tutors found or API connection failed';
            ctx2d.fillText(errorMsg, canvas.width / 2, canvas.height / 2 + 20);
        }
        return;
    }

    console.log('✅ Graph using REAL API data:', marketData.count, 'similar tutors out of', marketData.total_market_tutors, 'total');
    console.log('👤 Your profile:', marketData.requester_profile);
    console.log('🎯 Filters:', marketData.filters_applied);

    const tutorData = marketData.tutors;

    // Destroy existing chart
    if (marketChartInstance) {
        marketChartInstance.destroy();
        marketChartInstance = null;
        window.marketChartInstance = null;
    }

    // Aggregate data by SELECTED metric only
    const metricData = aggregateDataBySingleMetric(tutorData, currentMarketMetric);

    if (metricData.length === 0) {
        console.warn('⚠️ No data to display after aggregation');
        // Hide loading state
        if (spinner) spinner.style.display = 'none';
        if (canvas) {
            canvas.classList.remove('hidden');
            const ctx2d = canvas.getContext('2d');
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            ctx2d.font = '16px sans-serif';
            ctx2d.fillStyle = '#3b82f6';
            ctx2d.textAlign = 'center';
            ctx2d.fillText('No similar tutors found', canvas.width / 2, canvas.height / 2 - 20);
            ctx2d.font = '14px sans-serif';
            ctx2d.fillStyle = '#6b7280';
            ctx2d.fillText(`Found ${marketData.total_market_tutors} tutors, but none with >65% similarity`, canvas.width / 2, canvas.height / 2 + 20);
        }
        return;
    }

    // Metric configuration (v2.3 - Added experience_years and credentials_count)
    const metricConfigs = {
        'rating': {
            name: 'Rating',
            color: 'rgb(59, 130, 246)',
            bgColor: 'rgba(59, 130, 246, 0.6)',
            xAxisLabel: 'Rating (Stars)'
        },
        'completion_rate': {
            name: 'Completion Rate',
            color: 'rgb(34, 197, 94)',
            bgColor: 'rgba(34, 197, 94, 0.6)',
            xAxisLabel: 'Completion Rate (%)'
        },
        'student_count': {
            name: 'Active Students',
            color: 'rgb(249, 115, 22)',
            bgColor: 'rgba(249, 115, 22, 0.6)',
            xAxisLabel: 'Number of Active Students'
        },
        'experience_years': {
            name: 'Experience (Years)',
            color: 'rgb(168, 85, 247)',
            bgColor: 'rgba(168, 85, 247, 0.6)',
            xAxisLabel: 'Years of Experience'
        },
        'credentials_count': {
            name: 'Credentials',
            color: 'rgb(139, 92, 246)',
            bgColor: 'rgba(139, 92, 246, 0.6)',
            xAxisLabel: 'Number of Credentials'
        },
        'account_age': {
            name: 'Platform Tenure',
            color: 'rgb(236, 72, 153)',
            bgColor: 'rgba(236, 72, 153, 0.6)',
            xAxisLabel: 'Account Age'
        }
    };

    const config = metricConfigs[currentMarketMetric];

    // Extract labels and prices from aggregated data
    const labels = metricData.map(item => item.range);
    const priceData = metricData.map(item => item.avgPrice);

    // Create chart title (v2.3 - only real data, no fallback)
    const chartTitle = `${config.name} vs Price (${marketData.count} Similar Tutors)`;

    // Create new chart
    setTimeout(() => {
        marketChartInstance = new Chart(ctx.getContext('2d'), {
            type: graphType,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Price (ETB/hour)',
                    data: priceData,
                    backgroundColor: config.bgColor,
                    borderColor: config.color,
                    borderWidth: 2,
                    tension: graphType === 'line' ? 0.3 : 0,
                    pointRadius: graphType === 'line' ? 6 : 0,
                    pointHoverRadius: graphType === 'line' ? 8 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuad'
                },
                plugins: {
                    title: {
                        display: true,
                        text: chartTitle,
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const count = metricData[context.dataIndex]?.count || 0;
                                return [
                                    `Average Price: ${context.parsed.y} ETB/hour`,
                                    `Tutors in range: ${count}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Price (ETB per hour)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' ETB';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: config.xAxisLabel,
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            maxRotation: 0,
                            minRotation: 0
                        }
                    }
                }
            }
        });

        // Make chart globally accessible for sidebar toggle resize
        window.marketChartInstance = marketChartInstance;

        // Hide loading state
        if (spinner) spinner.style.display = 'none';
        if (canvas) canvas.classList.remove('hidden');

        console.log(`✅ v2.3 - Graph rendered: ${config.name} vs Price (${marketData.count} similar tutors out of ${marketData.total_market_tutors} total)`);
    }, 100);
};

/**
 * Aggregate tutor data by a SINGLE metric (v2.3 - Radio button selection)
 * Groups similar tutors by ranges of the selected metric
 * IMPORTANT: Returns ALL ranges (even empty ones) for complete X-axis display
 * @param {Array} tutorData - Array of similar tutors
 * @param {String} metricKey - 'rating', 'completion_rate', 'student_count', 'experience_years', 'credentials_count', 'account_age'
 * @returns {Array} - [{range: '4.0-4.5', avgPrice: 250, count: 12}, ...] (includes empty ranges with avgPrice: null)
 */
function aggregateDataBySingleMetric(tutorData, metricKey) {
    // Define ranges for each metric
    const metricRanges = {
        'rating': [
            { min: 0, max: 3.0, label: '0-3.0' },
            { min: 3.0, max: 3.5, label: '3.0-3.5' },
            { min: 3.5, max: 4.0, label: '3.5-4.0' },
            { min: 4.0, max: 4.5, label: '4.0-4.5' },
            { min: 4.5, max: 5.1, label: '4.5-5.0' }
        ],
        'completion_rate': [
            { min: 0, max: 0.5, label: '0-50%' },
            { min: 0.5, max: 0.7, label: '50-70%' },
            { min: 0.7, max: 0.85, label: '70-85%' },
            { min: 0.85, max: 1.1, label: '85-100%' }
        ],
        'student_count': [
            { min: 0, max: 10, label: '0-10' },
            { min: 10, max: 20, label: '10-20' },
            { min: 20, max: 30, label: '20-30' },
            { min: 30, max: 50, label: '30-50' },
            { min: 50, max: 1000, label: '50+' }
        ],
        'experience_years': [
            { min: 0, max: 2, label: '0-2yr' },
            { min: 2, max: 5, label: '2-5yr' },
            { min: 5, max: 10, label: '5-10yr' },
            { min: 10, max: 15, label: '10-15yr' },
            { min: 15, max: 1000, label: '15+yr' }
        ],
        'credentials_count': [
            { min: 0, max: 3, label: '0-3' },
            { min: 3, max: 5, label: '3-5' },
            { min: 5, max: 10, label: '5-10' },
            { min: 10, max: 15, label: '10-15' },
            { min: 15, max: 1000, label: '15+' }
        ],
        'account_age': [
            { min: 0, max: 180, label: '0-6mo' },
            { min: 180, max: 365, label: '6-12mo' },
            { min: 365, max: 730, label: '1-2yr' },
            { min: 730, max: 1460, label: '2-4yr' },
            { min: 1460, max: 100000, label: '4+yr' }
        ]
    };

    const ranges = metricRanges[metricKey];
    if (!ranges) {
        console.error(`Unknown metric key: ${metricKey}`);
        return [];
    }

    // Map backend field names to frontend keys
    const fieldMap = {
        'rating': 'rating',
        'completion_rate': 'completion_rate',
        'student_count': 'student_count',
        'experience_years': 'experience_years',
        'credentials_count': 'credentials_count',
        'account_age': 'account_age_days'
    };

    const dataField = fieldMap[metricKey];

    // Group tutors by ranges and calculate average prices
    // IMPORTANT: Keep ALL ranges (even empty ones) for full X-axis display
    const result = ranges.map(range => {
        const filtered = tutorData.filter(t => {
            let value = parseFloat(t[dataField] || 0);

            // Convert account age from days to match range if needed
            if (metricKey === 'account_age') {
                // value is already in days from backend
            }

            return value >= range.min && value < range.max;
        });

        // If no tutors in this range, return null for avgPrice but keep the range
        if (filtered.length === 0) {
            return {
                range: range.label,
                avgPrice: null, // null means no data for this range
                count: 0
            };
        }

        const avgPrice = filtered.reduce((sum, t) => sum + parseFloat(t.price_per_hour || t.pricePerHour || 0), 0) / filtered.length;

        return {
            range: range.label,
            avgPrice: Math.round(avgPrice),
            count: filtered.length
        };
    }); // Do NOT filter out empty ranges - keep all for full X-axis

    console.log(`📊 Aggregated ${tutorData.length} similar tutors by ${metricKey}:`, result);
    return result;
}


/**
 * Populate the market data table
 */
window.populateMarketTable = async function() {
    console.log('📋 Populating market table with real API data (v2.1)...');

    const tableBody = document.getElementById('marketTableBody');
    if (!tableBody) {
        console.error('❌ Market table body not found');
        return;
    }

    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 2rem;">
                <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(22, 163, 74, 0.3); border-top-color: #16a34a; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 1rem; color: var(--text-secondary);">Loading market data...</p>
            </td>
        </tr>
    `;

    // Get filters from universal filter (v2.3)
    const sessionFormat = getUniversalSessionFormat();
    const gradeLevelRange = getUniversalGradeLevelRange();

    // Fetch real market data from API with filters (v2.3)
    const marketData = await fetchMarketTutorData(currentMarketTimePeriod, sessionFormat, gradeLevelRange);

    // Check if API returned data
    if (!marketData || !marketData.tutors) {
        console.error('❌ Table API failed - showing error message');
        console.error('Debug info:', {
            hasMarketData: !!marketData,
            hasTutors: marketData?.tutors !== undefined,
            tutorCount: marketData?.tutors?.length,
            sessionFormat: sessionFormat
        });

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error-color); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-primary); font-weight: 500; margin-bottom: 0.5rem;">Unable to load market data</p>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        ${!localStorage.getItem('access_token') && !localStorage.getItem('token')
                            ? 'Please log in to view market trends'
                            : 'No similar tutors found or API connection failed. Try adjusting filters or check your connection.'}
                    </p>
                </td>
            </tr>
        `;
        return;
    }

    console.log('✅ Table using REAL API data:', marketData.count, 'similar tutors out of', marketData.total_market_tutors, 'total');
    console.log('👤 Your profile:', marketData.requester_profile);
    console.log('🎯 Filters:', marketData.filters_applied);

    const tutorData = marketData.tutors;
    const aggregatedData = aggregateDataByRating(tutorData);

    tableBody.innerHTML = '';

    if (aggregatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-primary); font-weight: 500; margin-bottom: 0.5rem;">No similar tutors found</p>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        Found ${marketData.total_market_tutors} tutors in the market, but none with >65% similarity to your profile.
                    </p>
                </td>
            </tr>
        `;
        return;
    }

    aggregatedData.forEach(data => {
        const row = document.createElement('tr');

        // v2.3: Display 7 factors + price (separated experience and credentials)
        const completionRate = (parseFloat(data.avgCompletionRate) * 100).toFixed(0);
        const accountAgeYears = (parseFloat(data.avgAccountAge) / 365).toFixed(1);

        row.innerHTML = `
            <td>${data.rating}⭐</td>
            <td>${completionRate}%</td>
            <td>${data.avgStudentCount}</td>
            <td>${data.avgExperienceYears || 0} yrs</td>
            <td>${data.avgCredentialsCount || 0}</td>
            <td>${accountAgeYears} yrs</td>
            <td>${data.avgPrice} ETB</td>
        `;

        tableBody.appendChild(row);
    });

    console.log(`✅ Market table populated with ${aggregatedData.length} rows (${marketData.count} similar tutors out of ${marketData.total_market_tutors} total) - v2.3`);
};

/**
 * Calculate and display suggested price for tutor (NEW: Real API version)
 */
window.suggestMarketPrice = async function() {
    console.log('💰 Calculating suggested price using real market data...');

    const priceResult = document.getElementById('marketPriceResult');
    if (!priceResult) {
        console.error('❌ Price result container not found');
        return;
    }

    // Show loading state
    priceResult.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="display: inline-block; width: 50px; height: 50px; border: 4px solid rgba(22, 163, 74, 0.3); border-top-color: #16a34a; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Analyzing market data...</p>
        </div>
    `;
    priceResult.style.display = 'block';

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    console.log('🔑 Token check:', token ? 'Token found' : 'No token in localStorage');
    console.log('👤 Global user state:', window.user);
    console.log('🔑 Using token from:', localStorage.getItem('access_token') ? 'access_token' : 'token');

    if (!token) {
        priceResult.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--error-color);">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>Please log in to get price suggestions</p>
                <p style="font-size: 0.9rem; margin-top: 1rem; color: var(--text-secondary);">
                    Debug: Token not found in localStorage. Try refreshing the page.
                </p>
            </div>
        `;
        return;
    }

    try {
        // Get filters from universal filter (v2.3)
        const sessionFormat = getUniversalSessionFormat();
        const universalGradeLevelRange = getUniversalGradeLevelRange();

        // Get current package data for filters (if available)
        // Use optional chaining safely - package manager might not be loaded
        let currentPackage = null;
        if (window.packageManagerClean && typeof window.packageManagerClean.getCurrentPackage === 'function') {
            currentPackage = window.packageManagerClean.getCurrentPackage();
        }

        const requestBody = {
            time_period_months: currentMarketTimePeriod,
            course_ids: currentPackage?.courses?.map(c => c.id) || null,
            grade_level: universalGradeLevelRange || (currentPackage?.gradeLevel ? [currentPackage.gradeLevel] : null),
            session_format: sessionFormat
        };

        // Call real API
        const response = await fetch(`${API_BASE_URL}/api/market-pricing/suggest-price`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to get price suggestion');
        }

        const data = await response.json();

        // Store suggestion ID for analytics tracking
        window.lastSuggestionData = data;

        // Log suggestion for analytics
        try {
            await fetch(`${API_BASE_URL}/api/market-pricing/log-suggestion`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tutor_id: data.factors.tutor_id || 0,
                    suggested_price: data.suggested_price,
                    market_average: data.market_average,
                    tutor_rating: data.factors.tutor_rating,
                    tutor_experience_years: data.factors.experience_years || 0,
                    tutor_student_count: data.factors.student_count,
                    time_period_months: data.time_period_months,
                    filters_applied: data.factors.filters_applied
                })
            });
        } catch (logError) {
            console.warn('Failed to log price suggestion:', logError);
        }

        // Get user name from API response first, fallback to global state
        const userName = data.factors.first_name || window.user?.first_name || 'Tutor';

        // Get confidence color
        const confidenceColors = {
            'high': '#16a34a',
            'medium': '#f59e0b',
            'low': '#ef4444'
        };
        const confidenceColor = confidenceColors[data.confidence_level] || '#6b7280';

        // Display results with side-by-side layout
        priceResult.innerHTML = `
            <p style="font-size: 1.3rem; font-weight: 700; color: #16a34a; margin-bottom: 1.5rem;">
                Dear ${userName},
            </p>

            <!-- Two-column layout: Main content (left) + Widget (right) -->
            <div style="display: grid; grid-template-columns: 1fr 380px; gap: 2rem; align-items: start;">

                <!-- Left Column: Main Content -->
                <div>
                    <!-- Score Cards Grid (v2.4 - 9 factors: Added Location & Grade Level) -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                        <div style="padding: 1rem; background: rgba(22, 163, 74, 0.05); border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.2);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">⭐ Your Rating</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${data.factors.tutor_rating?.toFixed(1) || 'N/A'} / 5.0</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Weight: 20%</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(22, 163, 74, 0.05); border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.2);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">✅ Completion Rate</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${((data.factors.completion_rate || 0) * 100).toFixed(0)}%</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Weight: 16%</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(59, 130, 246, 0.08); border-radius: 8px; border: 2px solid rgba(59, 130, 246, 0.4);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">📍 Location Match</div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #3b82f6;">${data.factors.country || data.factors.location || 'Not Set'}</div>
                            <div style="font-size: 0.75rem; color: #3b82f6; margin-top: 0.25rem; font-weight: 600;">Weight: 15% - Market Economics</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(22, 163, 74, 0.05); border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.2);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">👥 Active Students</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${data.factors.student_count || 0}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Weight: 13%</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(22, 163, 74, 0.05); border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.2);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">💻 Session Format</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${sessionFormat || 'Not Set'}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Weight: 12%</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(147, 51, 234, 0.08); border-radius: 8px; border: 2px solid rgba(147, 51, 234, 0.4);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">📚 Grade Level</div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #9333ea;">${data.factors.grade_levels?.join(', ') || 'Not Set'}</div>
                            <div style="font-size: 0.75rem; color: #9333ea; margin-top: 0.25rem; font-weight: 600;">Complexity: ${data.factors.grade_complexity ? data.factors.grade_complexity.toFixed(1) : 'N/A'}/14 (Weight: 10%)</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(22, 163, 74, 0.05); border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.2);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">📅 Experience</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${data.factors.experience_years || 0} yrs <span style="font-size: 0.9rem; color: var(--text-secondary);">(${data.factors.experience_score || 0}/100)</span></div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Weight: 8%</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(22, 163, 74, 0.05); border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.2);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">🎓 Credentials</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${data.factors.credentials_count || 0} <span style="font-size: 0.9rem; color: var(--text-secondary);">(${data.factors.credentials_score || 0}/100)</span></div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Weight: 4%</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(22, 163, 74, 0.05); border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.2);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">🕐 Platform Tenure</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-color);">${data.factors.account_age_days ? (data.factors.account_age_days / 365).toFixed(1) + ' yrs' : 'New'}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Weight: 2%</div>
                        </div>
                    </div>

                    <!-- Suggested Price -->
                    <p style="font-size: 1.5rem; font-weight: 700; color: #16a34a; margin: 2rem 0;">
                        Your suggested hourly price: <strong style="font-size: 1.8rem;">${data.suggested_price.toFixed(0)} ETB</strong>
                    </p>
                    <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-style: italic;">
                        (Based on ${data.time_period_months}-month market trends from ${data.tutor_count} active tutors)
                    </p>
                    <div style="display: inline-block; padding: 0.5rem 1rem; background: ${confidenceColor}20; border: 2px solid ${confidenceColor}; border-radius: 8px; margin-bottom: 1.5rem;">
                        <span style="color: ${confidenceColor}; font-weight: 600; text-transform: uppercase; font-size: 0.9rem;">
                            ${data.confidence_level} Confidence ${data.factors.algorithm_version ? '(v' + data.factors.algorithm_version.split('_')[0] + ')' : ''}
                        </span>
                    </div>

                    <!-- Tip Section -->
                    <div style="margin-top: 2.5rem; padding: 1.5rem; background: rgba(22, 163, 74, 0.1); border-left: 4px solid #16a34a; border-radius: 8px;">
                        <p style="margin: 0; font-size: 0.95rem; color: var(--text-primary); line-height: 1.6;">
                            <strong>💡 Tip:</strong> This price is calculated from real market data based on ${data.tutor_count} active tutors with similar profiles.
                            ${data.confidence_level === 'high' ? 'The high confidence level means we found many similar tutors for accurate comparison.' :
                              data.confidence_level === 'medium' ? 'The medium confidence level suggests moderate market data available.' :
                              'Consider this as a starting point - market data for your specific niche is limited.'}
                        </p>
                    </div>

                    <!-- Apply Button -->
                    <div style="margin-top: 1.5rem; text-align: center;">
                        <button onclick="applySuggestedPrice(${data.suggested_price})"
                            style="padding: 1rem 2rem; background: #16a34a; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; display: inline-flex; align-items: center; gap: 0.5rem;"
                            onmouseover="this.style.background='#15803d'"
                            onmouseout="this.style.background='#16a34a'">
                            <i class="fas fa-check-circle"></i>
                            Apply This Price to All ${sessionFormat} Packages
                        </button>
                    </div>
                </div>

                <!-- Right Column: How to Increase Your Price Widget -->
                <div style="position: sticky; top: 2rem;">
                    <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <p style="font-size: 1.1rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-rocket" style="color: #3b82f6;"></i>
                            How to Increase Your Price
                        </p>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
                            Your suggested price is calculated from your current profile. Here's how you can increase it:
                        </p>
                        <div style="display: grid; gap: 0.75rem;">
                            ${data.factors.credentials_count < 3 ? `
                            <div style="display: flex; gap: 0.75rem; padding: 0.875rem; background: white; border-radius: 8px; border-left: 4px solid #10b981;">
                                <div style="font-size: 1.25rem;">📜</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 0.9rem;">
                                        Upload ${3 - (data.factors.credentials_count || 0)} More Credential${(3 - (data.factors.credentials_count || 0)) > 1 ? 's' : ''}
                                    </div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                        You have ${data.factors.credentials_count || 0} credential${(data.factors.credentials_count || 0) !== 1 ? 's' : ''}. Each adds ${window.credentialBonus || 10} ETB.
                                    </div>
                                    <div style="font-size: 0.8rem; color: #10b981; font-weight: 600;">
                                        +${((3 - (data.factors.credentials_count || 0)) * (window.credentialBonus || 10))} ETB potential
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            ${data.factors.student_count < 5 ? `
                            <div style="display: flex; gap: 0.75rem; padding: 0.875rem; background: white; border-radius: 8px; border-left: 4px solid #3b82f6;">
                                <div style="font-size: 1.25rem;">👥</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 0.9rem;">
                                        Grow Your Student Base
                                    </div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                        You teach ${data.factors.student_count || 0} student${(data.factors.student_count || 0) !== 1 ? 's' : ''}. 5+ students boost positioning.
                                    </div>
                                    <div style="font-size: 0.8rem; color: #3b82f6; font-weight: 600;">
                                        15-25% price increase potential
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            ${(data.factors.completion_rate || 0) < 0.9 ? `
                            <div style="display: flex; gap: 0.75rem; padding: 0.875rem; background: white; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <div style="font-size: 1.25rem;">✅</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 0.9rem;">
                                        Improve Completion Rate
                                    </div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                        Current: ${((data.factors.completion_rate || 0) * 100).toFixed(0)}%. Aim for 90%+.
                                    </div>
                                    <div style="font-size: 0.8rem; color: #f59e0b; font-weight: 600;">
                                        20% weight in pricing
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            <div style="display: flex; gap: 0.75rem; padding: 0.875rem; background: white; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                                <div style="font-size: 1.25rem;">⭐</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 0.9rem;">
                                        Maintain High Ratings
                                    </div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                        Your ${data.factors.tutor_rating?.toFixed(1) || 'N/A'}⭐ is most important.
                                    </div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6; font-weight: 600;">
                                        25% weight in pricing
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 1rem; padding: 0.875rem; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
                            <p style="font-size: 0.8rem; color: var(--text-primary); margin: 0; display: flex; align-items: start; gap: 0.5rem;">
                                <i class="fas fa-lightbulb" style="color: #f59e0b; margin-top: 0.15rem;"></i>
                                <span><strong>Quick Win:</strong> Uploading credentials is the fastest way to increase your price!</span>
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        `;

        priceResult.style.display = 'block';
        console.log('✅ Real market price suggestion calculated:', data.suggested_price, 'ETB');

    } catch (error) {
        console.error('❌ Error getting price suggestion:', error);

        // Fallback to old method on error
        priceResult.innerHTML = `
            <div style="padding: 2rem; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px;">
                <p style="color: var(--error-color); font-weight: 600; margin-bottom: 0.5rem;">
                    <i class="fas fa-exclamation-triangle"></i> Unable to fetch real market data
                </p>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                    ${error.message}
                </p>
                <button onclick="suggestMarketPriceFallback()"
                    style="padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Use Estimated Price Instead
                </button>
            </div>
        `;
    }
};

/**
 * Apply suggested price to packages matching the selected session format (v2.2)
 */
window.applySuggestedPrice = async function(suggestedPrice) {
    // Get the selected session format from radio buttons
    const sessionFormatRadio = document.querySelector('input[name="priceSessionFormat"]:checked');
    const selectedFormat = sessionFormatRadio ? sessionFormatRadio.value : 'Online';

    console.log(`✅ Applying suggested price to ${selectedFormat} packages:`, suggestedPrice, 'ETB');

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to apply pricing');
        return;
    }

    // Show loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;';
    loadingMessage.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <strong>Updating ${selectedFormat} packages...</strong>
    `;
    document.body.appendChild(loadingMessage);

    try {
        // Fetch all packages first
        const response = await fetch(`${API_BASE_URL}/api/tutor/packages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch packages');
        }

        const packages = await response.json();

        // Filter packages by session format (v2.2)
        const matchingPackages = packages.filter(pkg =>
            pkg.session_format === selectedFormat || pkg.sessionFormat === selectedFormat
        );

        console.log(`📦 Found ${matchingPackages.length} ${selectedFormat} packages to update (out of ${packages.length} total)`);

        if (matchingPackages.length === 0) {
            loadingMessage.remove();
            const warningMessage = document.createElement('div');
            warningMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;';
            warningMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <strong>No ${selectedFormat} packages found!</strong>
            `;
            document.body.appendChild(warningMessage);
            setTimeout(() => warningMessage.remove(), 4000);
            return;
        }

        // Update each matching package with the new price
        let successCount = 0;
        let failCount = 0;

        for (const pkg of matchingPackages) {
            try {
                const updateResponse = await fetch(`${API_BASE_URL}/api/tutor/packages/${pkg.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...pkg,
                        hourly_rate: suggestedPrice
                    })
                });

                if (updateResponse.ok) {
                    successCount++;
                    console.log(`✅ Updated ${selectedFormat} package ${pkg.id} (${pkg.name}) to ${suggestedPrice} ETB`);
                } else {
                    failCount++;
                    console.error(`❌ Failed to update package ${pkg.id}`);
                }
            } catch (error) {
                failCount++;
                console.error(`❌ Error updating package ${pkg.id}:`, error);
            }
        }

        // Remove loading message
        loadingMessage.remove();

        // Show success/failure message
        const resultMessage = document.createElement('div');
        const isSuccess = successCount > 0;
        resultMessage.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${isSuccess ? '#16a34a' : '#dc2626'}; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; animation: slideInRight 0.3s ease-out;`;

        if (failCount === 0) {
            resultMessage.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <strong>Success!</strong> Updated ${successCount} ${selectedFormat} package${successCount > 1 ? 's' : ''} to ${suggestedPrice} ETB
            `;
        } else if (successCount === 0) {
            resultMessage.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <strong>Failed!</strong> Could not update ${selectedFormat} packages
            `;
        } else {
            resultMessage.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <strong>Partial Success</strong> ${successCount} ${selectedFormat} package${successCount > 1 ? 's' : ''} updated, ${failCount} failed
            `;
        }

        document.body.appendChild(resultMessage);

        // Remove message after 4 seconds
        setTimeout(() => {
            resultMessage.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => resultMessage.remove(), 300);
        }, 4000);

        // Update the current package editor UI if it exists
        const hourlyRateInput = document.getElementById('hourlyRate');
        if (hourlyRateInput) {
            hourlyRateInput.value = suggestedPrice;
            const event = new Event('input', { bubbles: true });
            hourlyRateInput.dispatchEvent(event);
        }

        // Reload packages list to show updated prices
        if (window.packageManagerClean && typeof window.packageManagerClean.loadPackages === 'function') {
            await window.packageManagerClean.loadPackages();
        }

        // Switch back to package editor view
        const marketTrendView = document.getElementById('marketTrendView');
        const packageEditorContainer = document.getElementById('packageEditorContainer');
        if (marketTrendView && packageEditorContainer) {
            marketTrendView.style.display = 'none';
            packageEditorContainer.style.display = 'flex';
        }

        // Update sidebar to show packages panel
        const packagesPanel = document.getElementById('packagesPanel');
        if (packagesPanel) {
            const allPanels = document.querySelectorAll('.sidebar-panel');
            allPanels.forEach(panel => panel.classList.remove('active'));
            packagesPanel.classList.add('active');

            const allIconBtns = document.querySelectorAll('.sidebar-icon-btn');
            allIconBtns.forEach(btn => btn.classList.remove('active'));
            const packagesBtn = document.querySelector('[data-panel="packages"]');
            if (packagesBtn) packagesBtn.classList.add('active');
        }

    } catch (error) {
        console.error('❌ Error applying price to all packages:', error);
        loadingMessage.remove();

        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc2626; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;';
        errorMessage.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <strong>Error!</strong> Failed to apply price: ${error.message}
        `;
        document.body.appendChild(errorMessage);

        setTimeout(() => errorMessage.remove(), 4000);
    }

    // Log acceptance for analytics
    if (window.lastSuggestionData) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/market-pricing/log-acceptance/${window.lastSuggestionData.suggestion_id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accepted_price: suggestedPrice
                })
            });
        } catch (error) {
            console.warn('Failed to log price acceptance:', error);
        }
    }

    console.log('✅ Price applied successfully');
};

/**
 * Fallback to old estimation method if API fails
 */
window.suggestMarketPriceFallback = function() {
    console.log('💰 Using fallback price estimation...');

    // Get session format from universal filter (v2.2)
    const sessionFormat = getUniversalSessionFormat();

    const priceResult = document.getElementById('marketPriceResult');
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

    // Display results
    priceResult.innerHTML = `
        <div style="padding: 1rem; background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 1.5rem;">
            <p style="margin: 0; font-size: 0.9rem; color: #f59e0b; font-weight: 600;">
                <i class="fas fa-info-circle"></i> Using estimated pricing (real market data unavailable)
            </p>
        </div>
        <p style="font-size: 1.3rem; font-weight: 700; color: #16a34a; margin-bottom: 1.5rem;">
            Dear ${username},
        </p>
        <p style="font-size: 1rem; color: var(--text-primary); margin-bottom: 0.5rem;">
            Your Rating: <strong style="font-size: 1.1rem; color: var(--primary-color);">${rating.toFixed(1)} ⭐</strong>
        </p>
        <p style="font-size: 1.5rem; font-weight: 700; color: #16a34a; margin: 2rem 0;">
            Estimated hourly price: <strong style="font-size: 1.8rem;">${finalPrice} ETB</strong>
        </p>
        <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem; font-style: italic;">
            (Based on ${currentMarketTimePeriod}-month market trends estimation)
        </p>
        <hr style="border: none; border-top: 2px solid rgba(22, 163, 74, 0.3); margin: 2rem 0;">
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem;">
            📊 Price Breakdown:
        </p>
        <ul style="font-size: 1rem; color: var(--text-primary); line-height: 2; margin: 0; padding-left: 1.5rem;">
            <li>Matched with <strong style="color: var(--primary-color);">${similarTutors.length} tutor(s)</strong> with ratings between <strong>${Math.max(0, rating - ratingRange).toFixed(1)}</strong> and <strong>${(rating + ratingRange).toFixed(1)}</strong></li>
            <li>Average price of similar tutors: <strong style="color: var(--primary-color);">${avgPrice.toFixed(2)} ETB</strong></li>
            <li>Time adjustment: <strong style="color: var(--primary-color);">+${Math.round((timeFactor - 1) * 100)}%</strong> for ${currentMarketTimePeriod}-month trends</li>
            <li>Estimated range: <strong style="color: #16a34a;">${Math.max(100, finalPrice - 20)} - ${Math.min(400, finalPrice + 20)} ETB</strong></li>
        </ul>
        <div style="margin-top: 2.5rem; padding: 1.5rem; background: rgba(22, 163, 74, 0.1); border-left: 4px solid #16a34a; border-radius: 8px;">
            <p style="margin: 0; font-size: 0.95rem; color: var(--text-primary); line-height: 1.6;">
                <strong>💡 Tip:</strong> This is an estimated price based on sample data. For accurate pricing based on real market conditions, ensure you're logged in and try the regular price suggestion again.
            </p>
        </div>
        <div style="margin-top: 1.5rem; text-align: center;">
            <button onclick="applySuggestedPrice(${finalPrice})"
                style="padding: 1rem 2rem; background: #16a34a; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; display: inline-flex; align-items: center; gap: 0.5rem;"
                onmouseover="this.style.background='#15803d'"
                onmouseout="this.style.background='#16a34a'">
                <i class="fas fa-check-circle"></i>
                Apply This Price to All ${sessionFormat} Packages
            </button>
        </div>
    `;

    priceResult.style.display = 'block';
    console.log('✅ Fallback price estimation calculated:', finalPrice, 'ETB');
};

/**
 * Get the current universal session format selection
 */
function getUniversalSessionFormat() {
    const sessionFormatRadio = document.querySelector('input[name="universalSessionFormat"]:checked');
    return sessionFormatRadio ? sessionFormatRadio.value : 'Online';
}

/**
 * Get the current universal time period selection
 */
function getUniversalTimePeriod() {
    const timePeriodSlider = document.getElementById('universalTimePeriod');
    return timePeriodSlider ? parseInt(timePeriodSlider.value) : 3;
}

/**
 * Get the current universal grade level range selection
 * Returns an array of grade levels in the range, or null if both are empty
 */
function getUniversalGradeLevelRange() {
    const fromSelect = document.getElementById('universalGradeLevelFrom');
    const toSelect = document.getElementById('universalGradeLevelTo');

    const from = fromSelect && fromSelect.value ? fromSelect.value : null;
    const to = toSelect && toSelect.value ? toSelect.value : null;

    // If both are empty, return null
    if (!from && !to) return null;

    // Define grade level order for range expansion
    const gradeLevels = [
        'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
        'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
        'University', 'Certification'
    ];

    // If only one is selected, return single value
    if (from && !to) return [from];
    if (!from && to) return [to];

    // Both are selected - expand the range
    const fromIndex = gradeLevels.indexOf(from);
    const toIndex = gradeLevels.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) {
        // Invalid selection, return both values
        return [from, to];
    }

    // Ensure from comes before to (swap if needed)
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);

    // Return array of grade levels in range (inclusive)
    return gradeLevels.slice(startIndex, endIndex + 1);
}

/**
 * Handler for universal time period change
 */
window.handleUniversalTimePeriodChange = function(value) {
    const months = parseInt(value);
    currentMarketTimePeriod = months;

    // Update display
    const timeValueDisplay = document.getElementById('universalTimeValue');
    if (timeValueDisplay) {
        timeValueDisplay.textContent = `${months} month${months > 1 ? 's' : ''}`;
    }

    console.log('⏱️ Universal time period changed to:', months, 'months');

    // Auto-update current view
    handleUniversalFilterChange();
};

/**
 * Handler for universal filter changes (session format, time period, or grade level range)
 * Automatically updates the current active view
 */
window.handleUniversalFilterChange = function() {
    const sessionFormat = getUniversalSessionFormat();
    const timePeriod = getUniversalTimePeriod();
    const gradeLevelRange = getUniversalGradeLevelRange();

    const gradeDisplay = gradeLevelRange
        ? (gradeLevelRange.length === 1 ? gradeLevelRange[0] : `${gradeLevelRange[0]} to ${gradeLevelRange[gradeLevelRange.length - 1]} (${gradeLevelRange.length} levels)`)
        : 'All';
    console.log('📊 Universal filters changed - Format:', sessionFormat, 'Period:', timePeriod, 'months', 'Grade:', gradeDisplay);

    // Update global variable
    currentMarketTimePeriod = timePeriod;

    // Determine which view is currently active and update it
    const activeCard = document.querySelector('.market-view-card.active');
    if (!activeCard) return;

    const viewType = activeCard.getAttribute('data-type');

    switch(viewType) {
        case 'line':
        case 'bar':
            updateMarketGraph();
            break;
        case 'table':
            populateMarketTable();
            break;
        case 'price':
            // Don't auto-update price, user needs to click calculate
            console.log('💡 Price view selected - click "Calculate Price" to update');
            break;
    }
};

/**
 * DEPRECATED: Handler for universal session format change
 */
window.handleUniversalSessionFormatChange = function() {
    console.log('⚠️ handleUniversalSessionFormatChange is deprecated, use handleUniversalFilterChange');
    handleUniversalFilterChange();
};

/**
 * DEPRECATED: Handler for graph session format radio button changes (v2.2)
 * Now uses universal session format
 */
window.updateGraphSessionFormat = function() {
    console.log('⚠️ updateGraphSessionFormat is deprecated, use handleUniversalSessionFormatChange');
    handleUniversalSessionFormatChange();
};

console.log('✅ Market trend functions loaded successfully');
