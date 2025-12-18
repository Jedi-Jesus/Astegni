        // Chart instances storage
        let chartInstances = {
            userChart: null,
            revenueChart: null,
            campaignChart: null
        };

        // Sample data for demonstration
        const reportData = {
            month: {
                totalUsers: 12547,
                premiumUsers: 1568,
                revenue: 2850000,
                satisfaction: 89,
                satisfactionRating: 4.5,
                students: 6234,
                tutors: 3421,
                parents: 1892,
                advertisers: 567,
                basicUsers: 433,
                freeTier: 8920,
                basicPaid: 2059,
                premiumPaid: 1568,
                revenueBasic: 823600,
                revenuePremium: 1879200,
                revenueCampaigns: 147200,
                platformSatisfied: 11168,
                adminSatisfied: 10519,
                churnAdvertisers: 45,
                churnUsers: 178,
                campaignCount: 234,
                campaignActive: 156
            }
        };

        // Open Reports Modal
        function openReportsModal() {
            const modal = document.getElementById('reports-modal');
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');

            // Initialize with current period
            loadReportData('month');

            // Initialize charts after modal is visible
            setTimeout(() => {
                initializeCharts();
            }, 100);
        }

        // Close Reports Modal
        function closeReportsModal() {
            const modal = document.getElementById('reports-modal');
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');

            // Destroy all chart instances
            Object.keys(chartInstances).forEach(key => {
                if (chartInstances[key]) {
                    chartInstances[key].destroy();
                    chartInstances[key] = null;
                }
            });
        }

        // Switch Report Period
        function switchReportPeriod(period) {
            // Update active button
            document.querySelectorAll('.report-period-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-white', 'bg-opacity-30');
                btn.classList.add('bg-opacity-20');
            });

            const activeBtn = document.getElementById(`period-${period}`);
            activeBtn.classList.add('active', 'bg-opacity-30');

            // Load data for selected period
            loadReportData(period);

            // Update charts
            updateCharts(period);
        }

        // Load Report Data
        function loadReportData(period) {
            const data = reportData[period] || reportData.month;

            // Update stat cards
            document.getElementById('stat-total-users').textContent = data.totalUsers.toLocaleString();
            document.getElementById('stat-total-users-change').textContent = '+12.5%';
            document.getElementById('stat-premium-users').textContent = data.premiumUsers.toLocaleString();
            document.getElementById('stat-premium-users-change').textContent = '+8.3%';
            document.getElementById('stat-revenue').textContent = data.revenue.toLocaleString() + ' ETB';
            document.getElementById('stat-revenue-change').textContent = '+15.7%';
            document.getElementById('stat-satisfaction').textContent = data.satisfaction + '%';
            document.getElementById('stat-satisfaction-rating').textContent = data.satisfactionRating + '/5.0';

            // Update role distribution
            document.getElementById('count-students').textContent = data.students.toLocaleString();
            document.getElementById('count-tutors').textContent = data.tutors.toLocaleString();
            document.getElementById('count-parents').textContent = data.parents.toLocaleString();
            document.getElementById('count-advertisers').textContent = data.advertisers.toLocaleString();
            document.getElementById('count-basic').textContent = data.basicUsers.toLocaleString();

            // Update subscription tiers
            const totalSubs = data.freeTier + data.basicPaid + data.premiumPaid;
            document.getElementById('count-free').textContent = data.freeTier.toLocaleString();
            document.getElementById('bar-free').style.width = ((data.freeTier / totalSubs) * 100) + '%';
            document.getElementById('count-basic-paid').textContent = data.basicPaid.toLocaleString();
            document.getElementById('bar-basic').style.width = ((data.basicPaid / totalSubs) * 100) + '%';
            document.getElementById('revenue-basic').textContent = data.revenueBasic.toLocaleString() + ' ETB';
            document.getElementById('count-premium-paid').textContent = data.premiumPaid.toLocaleString();
            document.getElementById('bar-premium').style.width = ((data.premiumPaid / totalSubs) * 100) + '%';
            document.getElementById('revenue-premium').textContent = data.revenuePremium.toLocaleString() + ' ETB';

            // Update satisfaction metrics
            document.getElementById('count-happy-platform').textContent = data.platformSatisfied.toLocaleString();
            document.getElementById('count-happy-admin').textContent = data.adminSatisfied.toLocaleString();

            // Update churn analysis
            const churnAdvertisersPercent = ((data.churnAdvertisers / data.advertisers) * 100).toFixed(1);
            const churnUsersPercent = ((data.churnUsers / data.totalUsers) * 100).toFixed(1);
            document.getElementById('churn-advertisers').textContent = churnAdvertisersPercent + '%';
            document.getElementById('bar-churn-advertisers').style.width = churnAdvertisersPercent + '%';
            document.getElementById('count-churn-advertisers').textContent = data.churnAdvertisers;
            document.getElementById('churn-users').textContent = churnUsersPercent + '%';
            document.getElementById('bar-churn-users').style.width = churnUsersPercent + '%';
            document.getElementById('count-churn-users').textContent = data.churnUsers;

            // Update campaign metrics
            document.getElementById('count-campaigns').textContent = data.campaignCount;
            document.getElementById('count-campaigns-active').textContent = data.campaignActive;
            document.getElementById('revenue-campaigns').textContent = data.revenueCampaigns.toLocaleString() + ' ETB';
        }

        // Initialize Charts
        function initializeCharts() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#f9fafb' : '#1f2937';
            const gridColor = isDark ? '#374151' : '#e5e7eb';

            // User Registration Chart
            const userCtx = document.getElementById('userChart');
            if (userCtx && !chartInstances.userChart) {
                chartInstances.userChart = new Chart(userCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: [
                            {
                                label: 'Students',
                                data: [450, 520, 580, 620, 680, 720, 780, 840, 920, 980, 1050, 1120],
                                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                borderColor: 'rgb(59, 130, 246)',
                                borderWidth: 1
                            },
                            {
                                label: 'Tutors',
                                data: [230, 260, 290, 320, 350, 380, 410, 450, 490, 530, 570, 610],
                                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                                borderColor: 'rgb(168, 85, 247)',
                                borderWidth: 1
                            },
                            {
                                label: 'Parents',
                                data: [120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340],
                                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                                borderColor: 'rgb(34, 197, 94)',
                                borderWidth: 1
                            },
                            {
                                label: 'Advertisers',
                                data: [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
                                backgroundColor: 'rgba(249, 115, 22, 0.8)',
                                borderColor: 'rgb(249, 115, 22)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { color: textColor }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: textColor },
                                grid: { color: gridColor }
                            },
                            x: {
                                ticks: { color: textColor },
                                grid: { color: gridColor }
                            }
                        }
                    }
                });
            }

            // Revenue Chart
            const revenueCtx = document.getElementById('revenueChart');
            if (revenueCtx && !chartInstances.revenueChart) {
                chartInstances.revenueChart = new Chart(revenueCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: [
                            {
                                label: 'Basic Subscriptions',
                                data: [45000, 52000, 58000, 64000, 70000, 76000, 82000, 88000, 94000, 100000, 106000, 112000],
                                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                borderColor: 'rgb(59, 130, 246)',
                                borderWidth: 1
                            },
                            {
                                label: 'Premium Subscriptions',
                                data: [85000, 98000, 110000, 122000, 134000, 146000, 158000, 170000, 182000, 194000, 206000, 218000],
                                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                                borderColor: 'rgb(168, 85, 247)',
                                borderWidth: 1
                            },
                            {
                                label: 'Campaign Ads',
                                data: [12000, 14000, 16000, 18000, 20000, 22000, 24000, 26000, 28000, 30000, 32000, 34000],
                                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                                borderColor: 'rgb(34, 197, 94)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { color: textColor }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: textColor,
                                    callback: function(value) {
                                        return value.toLocaleString() + ' ETB';
                                    }
                                },
                                grid: { color: gridColor }
                            },
                            x: {
                                ticks: { color: textColor },
                                grid: { color: gridColor }
                            }
                        }
                    }
                });
            }

            // Campaign Chart
            const campaignCtx = document.getElementById('campaignChart');
            if (campaignCtx && !chartInstances.campaignChart) {
                chartInstances.campaignChart = new Chart(campaignCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: [
                            {
                                label: 'Campaign Revenue',
                                data: [12000, 14000, 16000, 18000, 20000, 22000, 24000, 26000, 28000, 30000, 32000, 34000],
                                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                                borderColor: 'rgb(99, 102, 241)',
                                borderWidth: 1
                            },
                            {
                                label: 'Active Campaigns',
                                data: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
                                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                                borderColor: 'rgb(34, 197, 94)',
                                borderWidth: 1,
                                yAxisID: 'y1'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { color: textColor }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                position: 'left',
                                ticks: {
                                    color: textColor,
                                    callback: function(value) {
                                        return value.toLocaleString() + ' ETB';
                                    }
                                },
                                grid: { color: gridColor }
                            },
                            y1: {
                                beginAtZero: true,
                                position: 'right',
                                ticks: { color: textColor },
                                grid: { display: false }
                            },
                            x: {
                                ticks: { color: textColor },
                                grid: { color: gridColor }
                            }
                        }
                    }
                });
            }
        }

        // Switch Chart Type
        function switchChartType(chartName, type) {
            if (!chartInstances[chartName]) return;

            const chart = chartInstances[chartName];
            chart.config.type = type;
            chart.update();

            // Update button states
            const parentDiv = chart.canvas.closest('.bg-white').querySelector('.flex.gap-2');
            if (parentDiv) {
                parentDiv.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('bg-blue-100', 'bg-green-100', 'bg-indigo-100', 'dark:bg-blue-900', 'dark:bg-green-900', 'dark:bg-indigo-900');
                    btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
                });

                const activeBtn = type === 'bar' ? parentDiv.children[0] : parentDiv.children[1];
                activeBtn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');

                // Add appropriate color based on chart
                if (chartName === 'userChart') {
                    activeBtn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'text-blue-600', 'dark:text-blue-300');
                } else if (chartName === 'revenueChart') {
                    activeBtn.classList.add('bg-green-100', 'dark:bg-green-900', 'text-green-600', 'dark:text-green-300');
                } else if (chartName === 'campaignChart') {
                    activeBtn.classList.add('bg-indigo-100', 'dark:bg-indigo-900', 'text-indigo-600', 'dark:text-indigo-300');
                }
            }
        }

        // Update Charts (when period changes)
        function updateCharts(period) {
            // This would update chart data based on selected period
            // For now, we'll just refresh the existing charts
            Object.keys(chartInstances).forEach(key => {
                if (chartInstances[key]) {
                    chartInstances[key].update();
                }
            });
        }

        // Export Reports
        function exportReportPDF() {
            alert('PDF export functionality would be implemented here using a library like jsPDF');
        }

        function exportReportExcel() {
            alert('Excel export functionality would be implemented here using a library like SheetJS');
        }

        // Initialize charts when reports panel is activated
        document.addEventListener('panelChanged', function(event) {
            if (event.detail.panelName === 'reports') {
                // Wait for panel to be visible before initializing charts
                setTimeout(() => {
                    initializeCharts();
                }, 100);
            }
        });

        // Update charts when theme changes
        document.addEventListener('themeChanged', function() {
            // Destroy and recreate charts with new theme colors
            Object.keys(chartInstances).forEach(key => {
                if (chartInstances[key]) {
                    chartInstances[key].destroy();
                    chartInstances[key] = null;
                }
            });

            // Check if reports panel is active (not reports-modal which doesn't exist)
            const reportsPanel = document.getElementById('reports-panel');
            if (reportsPanel && reportsPanel.classList.contains('active')) {
                setTimeout(() => {
                    initializeCharts();
                }, 100);
            }
        });

        // ============================================
        // New Feature Functions
        // ============================================

        // Contact Phone/Email Management
        let phoneCount = 1;
        let emailCount = 1;

        function addContactPhone() {
            phoneCount++;
            const container = document.getElementById('additional-phones');
            const phoneDiv = document.createElement('div');
            phoneDiv.className = 'flex gap-2';
            phoneDiv.innerHTML = `
                <input type="phone" id="contact-phone-${phoneCount}" class="flex-1 p-2 border rounded-lg" placeholder="+251 911 234 567">
                <button onclick="removeContactField(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-minus"></i>
                </button>
            `;
            container.appendChild(phoneDiv);
        }

        function addContactEmail() {
            emailCount++;
            const container = document.getElementById('additional-emails');
            const emailDiv = document.createElement('div');
            emailDiv.className = 'flex gap-2';
            emailDiv.innerHTML = `
                <input type="email" id="contact-email-${emailCount}" class="flex-1 p-2 border rounded-lg" placeholder="contact@astegni.com">
                <button onclick="removeContactField(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-minus"></i>
                </button>
            `;
            container.appendChild(emailDiv);
        }

        function removeContactField(button) {
            button.parentElement.remove();
        }

        // Email Template Modal Functions
        const emailTemplates = {
            'welcome': {
                name: 'Welcome Email',
                subject: 'Welcome to Astegni - Let\'s Get Started!',
                body: 'Dear {{name}},\\n\\nWelcome to {{platform_name}}! We\'re excited to have you on board.\\n\\nGet started by exploring our platform at {{link}}.\\n\\nBest regards,\\nThe Astegni Team'
            },
            'password-reset': {
                name: 'Password Reset',
                subject: 'Reset Your Astegni Password',
                body: 'Hello {{name}},\\n\\nWe received a request to reset your password for {{email}}.\\n\\nClick here to reset: {{link}}\\n\\nIf you didn\'t request this, please ignore this email.\\n\\nBest regards,\\nThe Astegni Team'
            },
            'course-enrollment': {
                name: 'Course Enrollment',
                subject: 'You\'re Enrolled! Welcome to Your New Course',
                body: 'Hi {{name}},\\n\\nYou\'ve successfully enrolled in the course!\\n\\nAccess your course here: {{link}}\\n\\nHappy learning!\\n\\nBest regards,\\nThe Astegni Team'
            }
        };

        function openEditEmailTemplateModal(templateKey) {
            const template = emailTemplates[templateKey];
            document.getElementById('template-name').value = template.name;
            document.getElementById('template-subject').value = template.subject;
            document.getElementById('template-body').value = template.body.replace(/\\\\n/g, '\\n');
            document.getElementById('edit-email-template-modal').classList.remove('hidden');
        }

        function closeEditEmailTemplateModal() {
            document.getElementById('edit-email-template-modal').classList.add('hidden');
        }

        function previewEmailTemplate() {
            const subject = document.getElementById('template-subject').value;
            const body = document.getElementById('template-body').value;
            const testName = document.getElementById('preview-name').value;
            const testEmail = document.getElementById('preview-email').value;

            const previewSubject = subject.replace(/{{name}}/g, testName).replace(/{{email}}/g, testEmail).replace(/{{platform_name}}/g, 'Astegni');
            const previewBody = body.replace(/{{name}}/g, testName).replace(/{{email}}/g, testEmail).replace(/{{link}}/g, 'https://astegni.com/example').replace(/{{platform_name}}/g, 'Astegni');

            alert(`Preview Email:\\n\\nSubject: ${previewSubject}\\n\\n${previewBody}`);
        }

        function saveEmailTemplate() {
            alert('Email template saved successfully!');
            closeEditEmailTemplateModal();
        }

        // Integration Modal Functions
        let selectedProviderData = null;

        function openAddIntegrationModal() {
            document.getElementById('add-integration-modal').classList.remove('hidden');
        }

        function closeAddIntegrationModal() {
            document.getElementById('add-integration-modal').classList.add('hidden');
            // Reset form
            document.getElementById('integration-type').value = '';
            document.getElementById('social-integrations').classList.add('hidden');
            document.getElementById('integration-fields').classList.add('hidden');
            document.getElementById('selected-provider').classList.add('hidden');
            document.getElementById('provider-search').value = '';
            selectedProviderData = null;
            filterProviders(''); // Show all providers
        }

        function updateIntegrationFields() {
            const type = document.getElementById('integration-type').value;
            const socialDiv = document.getElementById('social-integrations');
            const fieldsDiv = document.getElementById('integration-fields');
            const selectedProviderDiv = document.getElementById('selected-provider');

            if (type === 'social') {
                socialDiv.classList.remove('hidden');
                selectedProviderDiv.classList.add('hidden');
                fieldsDiv.classList.add('hidden');
                selectedProviderData = null;
            } else if (type) {
                socialDiv.classList.add('hidden');
                selectedProviderDiv.classList.add('hidden');
                fieldsDiv.classList.remove('hidden');
            } else {
                socialDiv.classList.add('hidden');
                selectedProviderDiv.classList.add('hidden');
                fieldsDiv.classList.add('hidden');
            }
        }

        function filterProviders(searchTerm) {
            const items = document.querySelectorAll('.provider-item');
            const term = searchTerm.toLowerCase();

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(term)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        function selectProvider(id, name, icon) {
            selectedProviderData = { id, name, icon };

            // Update selected provider display
            document.getElementById('selected-provider-name').textContent = name;
            document.getElementById('selected-provider-icon').className = icon + ' text-3xl';
            document.getElementById('selected-provider').classList.remove('hidden');

            // Hide provider list and show configuration fields
            document.getElementById('social-integrations').classList.add('hidden');
            document.getElementById('integration-fields').classList.remove('hidden');

            // Auto-fill integration name
            document.getElementById('integration-name').value = name + ' Login';
        }

        function clearProviderSelection() {
            selectedProviderData = null;
            document.getElementById('selected-provider').classList.add('hidden');
            document.getElementById('social-integrations').classList.remove('hidden');
            document.getElementById('integration-fields').classList.add('hidden');
            document.getElementById('provider-search').value = '';
            filterProviders('');
        }

        function toggleSecretVisibility() {
            const input = document.getElementById('integration-client-secret');
            const icon = document.getElementById('secret-eye-icon');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }

        function configureIntegration(provider) {
            alert(`Configure ${provider} integration`);
        }

        function saveIntegration() {
            const type = document.getElementById('integration-type').value;
            if (!type) {
                alert('Please select an integration type');
                return;
            }

            const name = document.getElementById('integration-name').value;
            const clientId = document.getElementById('integration-client-id').value;

            if (!name || !clientId) {
                alert('Please fill in all required fields');
                return;
            }

            alert(`Integration "${name}" added successfully!`);
            closeAddIntegrationModal();
        }

        // Churn Others Modal Functions
        function openChurnOthersModal() {
            document.getElementById('churn-others-modal').classList.remove('hidden');
        }

        function closeChurnOthersModal() {
            document.getElementById('churn-others-modal').classList.add('hidden');
        }

        function exportChurnData() {
            alert('Churn data export functionality would be implemented here');
        }

        // ESC key handler for all new modals
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeEditEmailTemplateModal();
                closeAddIntegrationModal();
                closeChurnOthersModal();
            }
        });