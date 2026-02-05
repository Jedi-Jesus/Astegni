/**
 * View Parent Widgets Manager
 * Dynamically updates the admin-right-widgets with real parent data
 * Updates: children-count, engagement rate, parent rating, payment punctuality, and children list
 */

class ViewParentWidgets {
    constructor() {
        this.parentData = null;
        this.reviewStats = null;
    }

    /**
     * Initialize widgets with parent data
     * @param {Object} parentData - Parent profile data
     * @param {Object} reviewStats - Review statistics
     */
    init(parentData, reviewStats) {
        this.parentData = parentData;
        this.reviewStats = reviewStats;

        // Update all widgets
        this.updateParentStatisticsWidget();
        this.updateChildrenOverviewWidget();
        this.updatePaymentPunctualityWidget();
    }

    /**
     * Update Parent Statistics Widget (4 metrics grid)
     */
    updateParentStatisticsWidget() {
        if (!this.parentData || !this.reviewStats) return;

        const data = this.parentData;
        const stats = this.reviewStats;

        // Children Count
        const childrenCount = data.total_children || (data.children_ids ? data.children_ids.length : 0);
        const childrenCountEl = document.getElementById('widget-children-count');
        if (childrenCountEl) {
            childrenCountEl.textContent = childrenCount;
        }

        // Engagement Rate
        const engagementRate = this.calculateEngagementRate();
        const engagementEl = document.getElementById('widget-engagement-rate');
        if (engagementEl) {
            engagementEl.textContent = engagementRate + '%';
        }

        // Parent Rating
        const rating = (data.rating || 0).toFixed(1);
        const ratingEl = document.getElementById('widget-parent-rating');
        if (ratingEl) {
            ratingEl.textContent = rating;
        }

        console.log('✅ Parent Statistics Widget updated:', {
            children: childrenCount,
            engagement: engagementRate + '%',
            rating: rating
        });
    }

    /**
     * Update Payment Punctuality Widget
     * Fetches REAL payment data from API
     */
    async updatePaymentPunctualityWidget() {
        if (!this.parentData) return;

        try {
            // Fetch real payment punctuality data from API
            const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? (window.API_BASE_URL || 'http://localhost:8000')
                : 'https://api.astegni.com';

            const response = await fetch(`${API_BASE_URL}/api/parent/${this.parentData.id}/payment-punctuality/widget`);

            if (!response.ok) {
                throw new Error('Failed to fetch payment punctuality data');
            }

            const punctuality = await response.json();

            const paymentPercent = punctuality.punctuality_percentage;
            const totalPayments = punctuality.total_payments;
            const onTimePayments = punctuality.paid_on_time;
            const latePayments = punctuality.late_payments + punctuality.overdue_payments;

            // Update circular progress
            const circle = document.getElementById('widget-punctuality-circle');
            if (circle) {
                const circumference = 2 * Math.PI * 16; // r=16
                const offset = circumference - (paymentPercent / 100) * circumference;
                circle.setAttribute('stroke-dasharray', circumference);
                circle.setAttribute('stroke-dashoffset', offset);
            }

            // Update percentage text
            const percentEl = document.getElementById('widget-punctuality-percent');
            if (percentEl) {
                percentEl.textContent = paymentPercent + '%';
            }

            // Update Paid on Time
            const onTimeEl = document.getElementById('widget-punctuality-ontime');
            if (onTimeEl) {
                onTimeEl.textContent = `${onTimePayments}/${totalPayments}`;
            }

            // Update Late Payments
            const lateEl = document.getElementById('widget-punctuality-late');
            if (lateEl) {
                lateEl.textContent = latePayments;
            }

            // Update badge based on punctuality score
            this.updatePunctualityBadge(paymentPercent, latePayments, totalPayments);

            console.log('✅ Payment Punctuality Widget updated (REAL DATA):', {
                percent: paymentPercent + '%',
                onTime: `${onTimePayments}/${totalPayments}`,
                late: latePayments,
                source: 'API'
            });

        } catch (error) {
            console.error('❌ Error fetching payment punctuality:', error);

            // Fallback to review-based calculation
            if (this.reviewStats) {
                const stats = this.reviewStats;
                const paymentConsistency = stats.payment_consistency_avg || 0;
                const paymentPercent = Math.round((paymentConsistency / 5) * 100);

                // Update with fallback data
                const circle = document.getElementById('widget-punctuality-circle');
                if (circle) {
                    const circumference = 2 * Math.PI * 16;
                    const offset = circumference - (paymentPercent / 100) * circumference;
                    circle.setAttribute('stroke-dasharray', circumference);
                    circle.setAttribute('stroke-dashoffset', offset);
                }

                const percentEl = document.getElementById('widget-punctuality-percent');
                if (percentEl) {
                    percentEl.textContent = paymentPercent + '%';
                }

                console.log('⚠️ Payment Punctuality Widget updated (FALLBACK):', {
                    percent: paymentPercent + '%',
                    source: 'review_stats'
                });
            }
        }
    }

    /**
     * Update Children Overview Widget
     */
    updateChildrenOverviewWidget() {
        if (!this.parentData) return;

        const childrenInfo = this.parentData.children_info || [];
        const childrenContainer = document.querySelector('.admin-widget-card:nth-of-type(4) .timeline-content');

        if (!childrenContainer) return;

        if (childrenInfo.length === 0) {
            childrenContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.8);">
                    <p style="font-size: 2rem; margin-bottom: 0.5rem;">👶</p>
                    <p style="font-size: 0.9rem;">No children added yet</p>
                </div>
            `;
            return;
        }

        // Generate children list
        const childrenHTML = childrenInfo.slice(0, 5).map((child, index) => {
            const opacity = 1 - (index * 0.15); // Fade effect
            const borderStyle = index < childrenInfo.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.2);' : '';
            const dotOpacity = opacity;

            // Format child name
            const childName = this.formatChildName(child);

            // Format grade and school
            const grade = child.grade_level || 'Grade not set';
            const school = child.studying_at || 'School not set';

            return `
                <div class="timeline-item"
                    style="display: flex; gap: 0.75rem; padding-bottom: 1rem; ${borderStyle}">
                    <div class="timeline-dot"
                        style="width: 12px; height: 12px; background: rgba(255,255,255,${dotOpacity}); border-radius: 50%; margin-top: 0.25rem; flex-shrink: 0; ${index === 0 ? 'box-shadow: 0 0 10px rgba(255,255,255,0.5);' : ''}">
                    </div>
                    <div style="flex: 1;">
                        <p style="font-weight: 600; margin-bottom: 0.25rem; font-size: 0.95rem;">${childName}</p>
                        <p style="font-size: 0.875rem; opacity: 0.9;">${grade} • ${school}</p>
                    </div>
                </div>
            `;
        }).join('');

        childrenContainer.innerHTML = childrenHTML;

        // If more than 5 children, show indicator
        if (childrenInfo.length > 5) {
            childrenContainer.innerHTML += `
                <div style="text-align: center; padding-top: 0.5rem; color: rgba(255,255,255,0.7); font-size: 0.85rem;">
                    +${childrenInfo.length - 5} more child${childrenInfo.length - 5 > 1 ? 'ren' : ''}
                </div>
            `;
        }

        console.log('✅ Children Overview Widget updated:', {
            count: childrenInfo.length,
            displayed: Math.min(childrenInfo.length, 5)
        });
    }

    /**
     * Format child name from child data
     */
    formatChildName(child) {
        if (child.name) return child.name;

        // Build name from parts
        const parts = [];
        if (child.first_name) parts.push(child.first_name);
        if (child.father_name) parts.push(child.father_name);

        if (parts.length > 0) {
            return parts.join(' ');
        }

        return 'Student';
    }

    /**
     * Calculate engagement rate from review stats
     */
    calculateEngagementRate() {
        if (!this.reviewStats || this.reviewStats.total_reviews === 0) {
            return 0;
        }

        const avg = (
            this.reviewStats.engagement_with_tutor_avg +
            this.reviewStats.engagement_with_child_avg +
            this.reviewStats.responsiveness_avg
        ) / 3;

        return Math.round((avg / 5) * 100);
    }

    /**
     * Update punctuality badge based on score
     */
    updatePunctualityBadge(percentage, latePayments, totalPayments = 0) {
        const badgeEl = document.getElementById('widget-punctuality-badge');
        const iconEl = document.getElementById('widget-punctuality-badge-icon');
        const textEl = document.getElementById('widget-punctuality-badge-text');

        if (!badgeEl || !iconEl || !textEl) return;

        let icon = '';
        let text = '';
        let bgColor = '';

        // Check if there's no payment data yet
        if (totalPayments === 0) {
            icon = '🆕';
            text = 'No Payment History';
            bgColor = 'rgba(156, 163, 175, 0.2)'; // Gray
        } else if (percentage >= 95 && latePayments === 0) {
            icon = '✅';
            text = 'Perfect Record';
            bgColor = 'rgba(34, 197, 94, 0.2)'; // Green
        } else if (percentage >= 90) {
            icon = '🌟';
            text = 'Excellent';
            bgColor = 'rgba(34, 197, 94, 0.2)'; // Green
        } else if (percentage >= 80) {
            icon = '👍';
            text = 'Very Good';
            bgColor = 'rgba(59, 130, 246, 0.2)'; // Blue
        } else if (percentage >= 70) {
            icon = '✔️';
            text = 'Good';
            bgColor = 'rgba(34, 197, 94, 0.15)'; // Light green
        } else if (percentage >= 50) {
            icon = '⚠️';
            text = 'Needs Improvement';
            bgColor = 'rgba(245, 158, 11, 0.2)'; // Orange
        } else {
            icon = '❌';
            text = 'Poor';
            bgColor = 'rgba(239, 68, 68, 0.2)'; // Red
        }

        iconEl.textContent = icon;
        textEl.textContent = text;
        badgeEl.style.background = bgColor;
    }
}

// Create global instance
const viewParentWidgets = new ViewParentWidgets();

// Listen for parent data loaded event
window.addEventListener('parentDataLoaded', (event) => {
    const { parentData, reviewStats } = event.detail;
    if (parentData && reviewStats) {
        viewParentWidgets.init(parentData, reviewStats);
    }
});

// Export for use in other modules
window.viewParentWidgets = viewParentWidgets;
window.ViewParentWidgets = ViewParentWidgets;
