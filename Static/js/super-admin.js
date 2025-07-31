
        // Theme Toggle
        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleIcon(newTheme);
        }

        function updateThemeToggleIcon(theme) {
            const icon = theme === 'light' ?
                `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>` :
                `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>`;
            const themeToggle = document.getElementById('theme-toggle-btn');
            themeToggle.querySelector('svg').innerHTML = icon;
            const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
            mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon}</svg>`;
        }

        // Data Objects
        const currentAdmin = { id: 1, email: 'admin@astegni.et', role: 'Super Admin' };
        const advertisers = {
            1: { id: 1, name: 'EduAds Inc.', email: 'contact@eduads.com', status: 'Active' },
            2: { id: 2, name: 'LearnEasy Ltd.', email: 'info@learneasy.et', status: 'Pending' }
        };
        const campaigns = {
            1: { id: 1, advertiserId: 1, name: 'Math Tutoring Promo', duration: 30, price: 19500, adContent: { description: 'Promote math tutoring' }, reviewStatus: 'Under Review', moderationStatus: 'Pending' },
            2: { id: 2, advertiserId: 1, name: 'Science Campaign', duration: 15, price: 11250, adContent: { description: 'Science tutoring ad' }, reviewStatus: 'Approved', moderationStatus: 'Approved' }
        };
        const payments = {
            1: { id: 1, type: 'Ad Campaign', details: 'Math Tutoring Promo', amount: 19500, status: 'Pending', campaignId: 1 },
            2: { id: 2, type: 'Registration', details: 'EduAds Inc.', amount: 500, status: 'Completed' },
            3: { id: 3, type: 'Subscription', details: 'EduAds Inc. Monthly', amount: 200, status: 'Completed' }
        };
        const priceRequests = {
            1: { id: 1, type: 'campaign', details: 'Increase 1-day campaign price to 1200 birr', status: 'Pending', requestedBy: 'admin2@astegni.et' }
        };
        const reports = {
            1: { id: 1, advertiserId: 2, reason: 'Inappropriate content', reportedBy: 'admin@astegni.et', date: '2025-05-20' }
        };
        const admins = {
            1: { id: 1, email: 'admin@astegni.et', role: 'Super Admin' },
            2: { id: 2, email: 'admin2@astegni.et', role: 'Admin' }
        };
        const notifications = {
            1: { id: 1, message: 'New campaign submitted for review', recipient: 'Super Admin', date: '2025-05-20' }
        };
        const logs = {
            1: { id: 1, action: 'Campaign 1 submitted for review', user: 'Admin', date: '2025-05-20 10:00' }
        };
        const pricing = {
            campaign: { 1: 1000, 3: 2700, 7: 5600, 15: 11250, 30: 19500, custom: 1000 },
            registration: 500,
            subscription: 200
        };

        // Initialize Dashboard
        function initDashboard() {
            document.getElementById('total-revenue-card').classList.remove('hidden');
            updateSummary();
            searchPayments();
            updateAnalyticsChart();
            updatePriceRequests();
            updateReports();
            updateAdmins();
            checkNotifications();
        }

        // Update Summary
        function updateSummary() {
            const totalAdvertisers = Object.values(advertisers).length;
            const totalRevenue = Object.values(payments).reduce((sum, p) => p.status === 'Completed' ? sum + p.amount : sum, 0);
            document.getElementById('total-advertisers').textContent = totalAdvertisers;
            document.getElementById('total-revenue').textContent = `${totalRevenue} birr`;
        }

        // Tab Management
        function showTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
            document.getElementById(tabId).classList.remove('hidden');
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add('active');
        }

        // Payments Management
        let selectedPaymentId = null;
        function searchPayments() {
            const searchTerm = document.getElementById('payment-search').value.trim().toLowerCase();
            const typeFilter = document.getElementById('payment-type-filter').value;
            const paymentTable = document.getElementById('payment-table');
            paymentTable.innerHTML = '';
            Object.values(payments).forEach(payment => {
                const matchesSearch = searchTerm === '' || 
                    payment.details.toLowerCase().includes(searchTerm) ||
                    (payment.campaignId && campaigns[payment.campaignId]?.name.toLowerCase().includes(searchTerm)) ||
                    (payment.details.includes('EduAds') && advertisers[1]?.name.toLowerCase().includes(searchTerm));
                const matchesType = typeFilter === 'all' || payment.type === typeFilter;
                if (matchesSearch && matchesType) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
    <td class="p-2">${payment.type}</td>
    <td class="p-2">${payment.details}</td>
    <td class="p-2">${payment.amount} birr</td>
    <td class="p-2">${payment.campaignId ? campaigns[payment.campaignId]?.duration + ' days' : 'N/A'}</td>
    <td class="p-2">${payment.status}</td>
    <td class="p-2">
        ${payment.status === 'Pending' ? `<button onclick="openConfirmPaymentModal(${payment.id})" class="hover:underline">Confirm</button> | ` : ''}
        <button onclick="deletePayment(${payment.id})" class="hover:underline">Delete</button>
    </td>
`;
                    paymentTable.appendChild(tr);
                }
            });
        }
        function openConfirmPaymentModal(paymentId) {
            selectedPaymentId = paymentId;
            const payment = payments[paymentId];
            document.getElementById('confirm-payment-details').textContent = `Confirm payment of ${payment.amount} birr for ${payment.details}?`;
            document.getElementById('confirm-payment-modal').classList.remove('hidden');
            trapFocus(document.getElementById('confirm-payment-modal'));
        }
        function closeConfirmPaymentModal() {
            document.getElementById('confirm-payment-modal').classList.add('hidden');
            selectedPaymentId = null;
            restoreFocus();
        }
        function confirmPayment() {
            const payment = payments[selectedPaymentId];
            payment.status = 'Completed';
            logAction(`Confirmed payment for ${payment.details}`);
            alert('Payment confirmed');
            searchPayments();
            updateSummary();
            closeConfirmPaymentModal();
        }
        function deletePayment(paymentId) {
            if (confirm('Are you sure you want to delete this payment?')) {
                logAction(`Deleted payment for ${payments[paymentId].details}`);
                delete payments[paymentId];
                alert('Payment deleted');
                searchPayments();
                updateSummary();
            }
        }

        // Analytics Chart
        let analyticsChart = null;
        function updateAnalyticsChart() {
            const ctx = document.getElementById('platform-analytics-chart').getContext('2d');
            if (analyticsChart) analyticsChart.destroy();
            const campaignData = Object.values(campaigns).reduce((acc, c) => {
                acc[c.reviewStatus] = (acc[c.reviewStatus] || 0) + 1;
                return acc;
            }, {});
            analyticsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Active', 'Paused', 'Under Review', 'Approved', 'Rejected'],
                    datasets: [{
                        label: 'Campaign Statuses',
                        data: [
                            campaignData['Active'] || 0,
                            campaignData['Paused'] || 0,
                            campaignData['Under Review'] || 0,
                            campaignData['Approved'] || 0,
                            campaignData['Rejected'] || 0
                        ],
                        backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#8BC34A', '#F44336']
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        function generatePlatformReport() {
            const data = Object.values(payments).map(p => ({
                Type: p.type,
                Details: p.details,
                Amount: p.amount,
                Status: p.status,
                Date: new Date().toLocaleString()
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Platform Report');
            XLSX.write(wb, 'platform_report.xlsx');
            logAction('Generated platform report');
            alert('Report generated and downloaded');
        }

        // Pricing Management
        function updatePricingFields() {
            const pricingType = document.getElementById('pricing-type').value;
            document.getElementById('campaign-pricing').classList.toggle('hidden', pricingType !== 'campaign');
            document.getElementById('registration-pricing').classList.toggle('hidden', pricingType !== 'registration');
            document.getElementById('subscription-pricing').classList.toggle('hidden', pricingType !== 'subscription');
        }
        function openPricingModal() {
            document.getElementById('pricing-type').value = 'campaign';
            updatePricingFields();
            document.getElementById('pricing-modal').classList.remove('hidden');
            trapFocus(document.getElementById('pricing-modal'));
        }
        function closePricingModal() {
            document.getElementById('pricing-modal').classList.add('hidden');
            restoreFocus();
        }
        function savePricing() {
            const pricingType = document.getElementById('pricing-type').value;
            if (pricingType === 'campaign') {
                pricing.campaign = {
                    1: parseInt(document.getElementById('price-1').value),
                    3: parseInt(document.getElementById('price-3').value),
                    7: parseInt(document.getElementById('price-7').value),
                    15: parseInt(document.getElementById('price-15').value),
                    30: parseInt(document.getElementById('price-30').value),
                    custom: parseInt(document.getElementById('price-custom').value)
                };
            } else if (pricingType === 'registration') {
                pricing.registration = parseInt(document.getElementById('price-registration').value);
            } else if (pricingType === 'subscription') {
                pricing.subscription = parseInt(document.getElementById('price-subscription').value);
            }
            logAction(`Updated ${pricingType} pricing`);
            alert('Pricing updated');
            closePricingModal();
        }

        // Price Requests Management
        function updatePriceRequests() {
            const priceRequestsTable = document.getElementById('price-requests-table');
            priceRequestsTable.innerHTML = '';
            Object.values(priceRequests).forEach(request => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-2">${request.id}</td>
                    <td class="p-2">${request.type}</td>
                    <td class="p-2">${request.details}</td>
                    <td class="p-2">${request.status}</td>
                    <td class="p-2">
                        <button onclick="approvePriceRequest(${request.id})" class="hover:underline">Approve</button> |
                        <button onclick="rejectPriceRequest(${request.id})" class="hover:underline">Reject</button>
                    </td>
                `;
                priceRequestsTable.appendChild(tr);
            });
        }

        function closePriceRequestsModal() {
            document.getElementById('price-requests-modal').classList.add('hidden');
            restoreFocus();
        }
        function approvePriceRequest(requestId) {
            const request = priceRequests[requestId];
            request.status = 'Approved';
            logAction(`Approved price request ${requestId}`);
            alert('Price request approved');
            updatePriceRequests();
        }
        function rejectPriceRequest(requestId) {
            const request = priceRequests[requestId];
            request.status = 'Rejected';
            logAction(`Rejected price request ${requestId}`);
            alert('Price request rejected');
            updatePriceRequests();
        }

        // Reports Management
        function updateReports() {
            const reportsTable = document.getElementById('reports-table');
            reportsTable.innerHTML = '';
            Object.values(reports).forEach(report => {
                const advertiser = advertisers[report.advertiserId];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-2">${advertiser ? advertiser.name : 'Unknown'}</td>
                    <td class="p-2">${report.reason}</td>
                    <td class="p-2">${report.reportedBy}</td>
                    <td class="p-2">${report.date}</td>
                    <td class="p-2">
                        <button onclick="resolveReport(${report.id})" class="hover:underline">Resolve</button>
                    </td>
                `;
                reportsTable.appendChild(tr);
            });
        }
        function openReportsModal() {
            updateReports();
            document.getElementById('reports-modal').classList.remove('hidden');
            trapFocus(document.getElementById('reports-modal'));
        }
        function closeReportsModal() {
            document.getElementById('reports-modal').classList.add('hidden');
            restoreFocus();
        }
        function resolveReport(reportId) {
            logAction(`Resolved report ${reportId}`);
            delete reports[reportId];
            alert('Report resolved');
            updateReports();
        }

        // Admins Management
        function updateAdmins() {
            const adminTable = document.getElementById('admin-table');
            adminTable.innerHTML = '';
            Object.values(admins).forEach(admin => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-2">${admin.email}</td>
                    <td class="p-2">${admin.role}</td>
                    <td class="p-2">
                        <button onclick="deleteAdmin(${admin.id})" class="hover:underline">Delete</button>
                    </td>
                `;
                adminTable.appendChild(tr);
            });
        }
        function openAdminModal() {
            document.getElementById('admin-email').value = '';
            document.getElementById('admin-role').value = 'Admin';
            updateAdmins();
            document.getElementById('admin-modal').classList.remove('hidden');
            trapFocus(document.getElementById('admin-modal'));
        }
        function closeAdminModal() {
            document.getElementById('admin-modal').classList.add('hidden');
            restoreFocus();
        }
        function addAdmin() {
            const email = document.getElementById('admin-email').value.trim();
            const role = document.getElementById('admin-role').value;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            const newId = Object.keys(admins).length + 1;
            admins[newId] = { id: newId, email, role };
            logAction(`Added admin ${email} as ${role}`);
            alert('Admin added');
            updateAdmins();
            document.getElementById('admin-email').value = '';
        }
        function deleteAdmin(adminId) {
            if (confirm('Are you sure you want to delete this admin?')) {
                logAction(`Deleted admin ${admins[adminId].email}`);
                delete admins[adminId];
                alert('Admin deleted');
                updateAdmins();
            }
        }

        // Notifications
        function checkNotifications() {
            const hasNotifications = Object.values(notifications).some(n => n.recipient === 'Super Admin');
            document.getElementById('notification-dot').classList.toggle('hidden', !hasNotifications);
            document.getElementById('mobile-notification-dot').classList.toggle('hidden', !hasNotifications);
            const notificationContent = document.getElementById('notification-content');
            const adminNotifications = Object.values(notifications).filter(n => n.recipient === 'Super Admin');
            if (adminNotifications.length === 0) {
                notificationContent.textContent = 'You have no notifications.';
            } else {
                notificationContent.innerHTML = adminNotifications.map(n => `<p>${n.message} (${n.date})</p>`).join('');
            }
        }
        function openNotificationModal() {
            document.getElementById('notification-modal').classList.remove('hidden');
            trapFocus(document.getElementById('notification-modal'));
        }
        function closeNotificationModal() {
            document.getElementById('notification-modal').classList.add('hidden');
            restoreFocus();
        }

        // Logs
        function logAction(action) {
            const newId = Object.keys(logs).length + 1;
            logs[newId] = {
                id: newId,
                action,
                user: currentAdmin.email,
                date: new Date().toLocaleString()
            };
        }

        // Menu Toggle
        document.getElementById('menu-btn').addEventListener('click', () => {
            const menu = document.getElementById('mobile-menu');
            const isOpen = menu.classList.contains('open');
            menu.classList.toggle('open');
            document.getElementById('menu-btn').setAttribute('aria-expanded', !isOpen);
        });

        // Theme Initialization
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleIcon(savedTheme);
        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('mobile-theme-toggle-btn').addEventListener('click', toggleTheme);

        // Accessibility
        let focusableElements = [];
        let firstFocusableElement = null;
        let lastFocusableElement = null;
        let lastFocusedElement = null;
        function trapFocus(modal) {
            focusableElements = Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
            firstFocusableElement = focusableElements[0];
            lastFocusableElement = focusableElements[focusableElements.length - 1];
            lastFocusedElement = document.activeElement;
            firstFocusableElement.focus();
            modal.addEventListener('keydown', handleFocusTrap);
        }
        function handleFocusTrap(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        e.preventDefault();
                        lastFocusableElement.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        e.preventDefault();
                        firstFocusableElement.focus();
                    }
                }
            } else if (e.key === 'Escape') {
                closeAllModals();
            }
        }
        function restoreFocus() {
            if (lastFocusedElement) lastFocusedElement.focus();
            document.querySelectorAll('.modal').forEach(modal => modal.removeEventListener('keydown', handleFocusTrap));
        }
        function closeAllModals() {
            document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
            restoreFocus();
        }

        // Initialize
        initDashboard();