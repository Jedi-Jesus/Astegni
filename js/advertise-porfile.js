
        var gk_isXlsx = false;
        var gk_xlsxFileLookup = {};
        var gk_fileData = {};
        function filledCell(cell) {
            return cell !== '' && cell != null;
        }
        function loadFileData(filename) {
            if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
                try {
                    var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
                    var firstSheetName = workbook.SheetNames[0];
                    var worksheet = workbook.Sheets[firstSheetName];
                    var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
                    var filteredData = jsonData.filter(row => row.some(filledCell));
                    var headerRowIndex = filteredData.findIndex((row, index) =>
                        row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
                    );
                    if (headerRowIndex === -1 || headerRowIndex > 25) {
                        headerRowIndex = 0;
                    }
                    var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
                    csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
                    return csv;
                } catch (e) {
                    console.error(e);
                    return "";
                }
            }
            return gk_fileData[filename] || "";
        }

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
        const advertiser = {
            id: 1,
            name: 'EduAds Inc.',
            email: 'contact@eduads.com',
            phone: '+251912345680',
            profilePic: 'https://via.placeholder.com/64',
            coverImage: 'https://via.placeholder.com/1200x300'
        };
        const campaigns = {
            1: {
                id: 1,
                name: 'Math Tutoring Promo',
                duration: 30,
                price: 19500,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Promote math tutoring with fun visuals' },
                reviewStatus: 'Under Review',
                analytics: { impressions: 1000, clicks: 50, conversions: 5 }
            },
            2: {
                id: 2,
                name: 'Science Campaign',
                duration: 15,
                price: 11250,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Science tutoring ad for all grades' },
                reviewStatus: 'Approved',
                analytics: { impressions: 2000, clicks: 120, conversions: 15 }
            }
        };

        // Initialize Profile
        function initProfile() {
            document.getElementById('advertiser-name').textContent = advertiser.name;
            document.getElementById('advertiser-email').textContent = advertiser.email;
            document.getElementById('advertiser-phone').textContent = advertiser.phone;
            document.getElementById('advertiser-profile-pic').src = advertiser.profilePic;
            document.getElementById('advertiser-cover').src = advertiser.coverImage;
            searchCampaigns();
            checkNotifications();
        }

        // Edit Profile Modal
        function openEditProfileModal() {
            document.getElementById('edit-name').value = advertiser.name;
            document.getElementById('edit-email').value = advertiser.email;
            document.getElementById('edit-phone').value = advertiser.phone;
            document.getElementById('edit-profile-pic').value = '';
            document.getElementById('edit-cover-pic').value = '';
            document.getElementById('edit-profile-modal').classList.remove('hidden');
            trapFocus(document.getElementById('edit-profile-modal'));
        }
        function closeEditProfileModal() {
            document.getElementById('edit-profile-modal').classList.add('hidden');
            restoreFocus();
        }
        function saveProfile() {
            advertiser.name = document.getElementById('edit-name').value.trim();
            advertiser.email = document.getElementById('edit-email').value.trim();
            advertiser.phone = document.getElementById('edit-phone').value.trim();
            const profilePic = document.getElementById('edit-profile-pic').files[0];
            const coverPic = document.getElementById('edit-cover-pic').files[0];
            if (!advertiser.name || !advertiser.email || !advertiser.phone) {
                alert('Please fill in all fields');
                return;
            }
            if (profilePic) advertiser.profilePic = URL.createObjectURL(profilePic);
            if (coverPic) advertiser.coverImage = URL.createObjectURL(coverPic);
            initProfile();
            alert('Profile updated');
            closeEditProfileModal();
        }

        // Create Campaign Modal
        function openCreateCampaignModal() {
            document.getElementById('create-campaign-modal').classList.remove('hidden');
            updateCampaignPrice();
            trapFocus(document.getElementById('create-campaign-modal'));
        }
        function closeCreateCampaignModal() {
            document.getElementById('create-campaign-modal').classList.add('hidden');
            document.getElementById('campaign-name').value = '';
            document.getElementById('campaign-duration-package').value = '1';
            document.getElementById('campaign-custom-duration').value = '';
            document.getElementById('custom-duration-container').classList.add('hidden');
            document.getElementById('campaign-ad-content').value = '';
            document.getElementById('campaign-ad-description').value = '';
            document.getElementById('campaign-price').textContent = 'Price: 1000 birr';
            restoreFocus();
        }
        function toggleCustomDuration() {
            const packageSelect = document.getElementById('campaign-duration-package').value;
            const customContainer = document.getElementById('custom-duration-container');
            if (packageSelect === 'custom') {
                customContainer.classList.remove('hidden');
            } else {
                customContainer.classList.add('hidden');
            }
            updateCampaignPrice();
        }
        function updateCampaignPrice() {
            const packageSelect = document.getElementById('campaign-duration-package').value;
            let duration = parseInt(packageSelect);
            let price;
            const packages = {
                1: 1000,
                3: 2700,
                7: 5600,
                15: 11250,
                30: 19500
            };
            if (packageSelect === 'custom') {
                duration = parseInt(document.getElementById('campaign-custom-duration').value) || 1;
                price = duration * 1000;
            } else {
                price = packages[duration];
            }
            document.getElementById('campaign-price').textContent = `Price: ${price} birr`;
        }
        function createCampaign() {
            const name = document.getElementById('campaign-name').value.trim();
            const packageSelect = document.getElementById('campaign-duration-package').value;
            let duration = parseInt(packageSelect);
            let price;
            const packages = {
                1: 1000,
                3: 2700,
                7: 5600,
                15: 11250,
                30: 19500
            };
            if (packageSelect === 'custom') {
                duration = parseInt(document.getElementById('campaign-custom-duration').value);
                if (!duration || duration < 1) {
                    alert('Please enter a valid custom duration');
                    return;
                }
                price = duration * 1000;
            } else {
                price = packages[duration];
            }
            const adContent = document.getElementById('campaign-ad-content').files[0];
            const description = document.getElementById('campaign-ad-description').value.trim();
            if (!name || !adContent || !description) {
                alert('Please fill in all fields, upload an ad image or video, and provide a description');
                return;
            }
            const newId = Object.keys(campaigns).length + 1;
            campaigns[newId] = {
                id: newId,
                name,
                duration,
                price,
                adContent: { url: URL.createObjectURL(adContent), description },
                reviewStatus: 'Draft',
                analytics: { impressions: 0, clicks: 0, conversions: 0 }
            };
            searchCampaigns();
            checkNotifications();
            alert('Campaign draft saved');
            closeCreateCampaignModal();
        }

        // View Campaign Modal
        let selectedCampaignId = null;
        function openViewCampaignModal(campaignId) {
            selectedCampaignId = campaignId;
            document.getElementById('view-campaign-modal').classList.remove('hidden');
            updateViewCampaign();
            trapFocus(document.getElementById('view-campaign-modal'));
        }
        function closeViewCampaignModal() {
            document.getElementById('view-campaign-modal').classList.add('hidden');
            selectedCampaignId = null;
            restoreFocus();
        }
        function updateViewCampaign() {
            const campaign = campaigns[selectedCampaignId];
            const content = document.getElementById('view-campaign-content');
            content.innerHTML = `
                <h4 class="text-xl font-semibold mb-2">${campaign.name}</h4>
                <a href="${campaign.adContent.url}" target="_blank">
                    <img src="${campaign.adContent.url}" alt="${campaign.name}" class="w-full h-48 object-cover rounded-lg mb-4">
                </a>
                <p class="mb-2"><strong>Description:</strong> ${campaign.adContent.description}</p>
                <p class="mb-2"><strong>Duration:</strong> ${campaign.duration} days</p>
                <p class="mb-2"><strong>Price:</strong> ${campaign.price} birr</p>
            `;
        }

        // Analytics Modal
        function openAnalyticsModal(campaignId) {
            selectedCampaignId = campaignId;
            document.getElementById('analytics-modal').classList.remove('hidden');
            updateAnalytics();
            trapFocus(document.getElementById('analytics-modal'));
        }
        function closeAnalyticsModal() {
            document.getElementById('analytics-modal').classList.add('hidden');
            selectedCampaignId = null;
            const chartCanvas = document.getElementById('analytics-chart');
            const chart = Chart.getChart(chartCanvas);
            if (chart) chart.destroy();
            restoreFocus();
        }
        function updateAnalytics() {
            const campaign = campaigns[selectedCampaignId];
            const content = document.getElementById('analytics-content');
            content.innerHTML = `
                <h4 class="text-xl font-semibold mb-2">${campaign.name}</h4>
                <p class="mb-2">Impressions: ${campaign.analytics.impressions}</p>
                <p class="mb-2">Clicks: ${campaign.analytics.clicks}</p>
                <p class="mb-2">Conversions: ${campaign.analytics.conversions}</p>
                <p class="mb-2">Click-Through Rate: ${(campaign.analytics.clicks / (campaign.analytics.impressions || 1) * 100).toFixed(2)}%</p>
                <p class="mb-2">Ad Content: <a href="${campaign.adContent.url}" target="_blank" class="underline">View</a></p>
                <p class="mb-2">Ad Description: ${campaign.adContent.description}</p>
            `;
            renderAnalyticsChart();
        }

        // Render Analytics Chart
        function renderAnalyticsChart() {
            const campaign = campaigns[selectedCampaignId];
            const ctx = document.getElementById('analytics-chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Impressions', 'Clicks', 'Conversions'],
                    datasets: [{
                        label: 'Campaign Metrics',
                        data: [campaign.analytics.impressions, campaign.analytics.clicks, campaign.analytics.conversions],
                        backgroundColor: ['var(--button-bg)', 'var(--button-hover)', 'var(--button-active)'],
                        borderColor: ['var(--button-active)', 'var(--button-active)', 'var(--button-hover)'],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: { beginAtZero: true, ticks: { color: 'var(--modal-text)' } },
                        x: { ticks: { color: 'var(--modal-text)' } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'var(--modal-bg)', titleColor: 'var(--modal-text)', bodyColor: 'var(--modal-text)' }
                    }
                }
            });
        }

        // Search Campaigns
        function searchCampaigns() {
            const searchTerm = document.getElementById('campaign-search').value.trim().toLowerCase();
            const campaignTable = document.getElementById('campaign-table');
            campaignTable.innerHTML = '';
            Object.values(campaigns).forEach(campaign => {
                const matchesName = searchTerm === '' || campaign.name.toLowerCase().includes(searchTerm);
                const matchesDescription = searchTerm === '' || campaign.adContent.description.toLowerCase().includes(searchTerm);
                if (matchesName || matchesDescription) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="p-2">${campaign.name}</td>
                        <td class="p-2">${campaign.reviewStatus}</td>
                        <td class="p-2">
                            ${campaign.reviewStatus === 'Draft' ? `<button onclick="submitForReview(${campaign.id})" class="hover:underline">Submit for Review</button>` : ''}
                            ${campaign.reviewStatus === 'Approved' ? `<button onclick="openPaymentModal(${campaign.id})" class="hover:underline">Pay Now</button>` : ''}
                        </td>
                        <td class="p-2">
                            ${campaign.reviewStatus === 'Active' || campaign.reviewStatus === 'Approved' ? `<button onclick="openAnalyticsModal(${campaign.id})" class="hover:underline">View Analytics</button>` : 'N/A'}
                        </td>
                        <td class="p-2">
                            <button onclick="openViewCampaignModal(${campaign.id})" class="hover:underline">View</button>
                        </td>
                    `;
                    campaignTable.appendChild(tr);
                }
            });
        }

        // Campaign Review
        function submitForReview(campaignId) {
            campaigns[campaignId].reviewStatus = 'Under Review';
            alert(`Campaign "${campaigns[campaignId].name}" submitted for review`);
            searchCampaigns();
            checkNotifications();
        }
        function reviewCampaign(campaignId, approve) {
            campaigns[campaignId].reviewStatus = approve ? 'Approved' : 'Rejected';
            alert(`Campaign "${campaigns[campaignId].name}" ${approve ? 'approved' : 'rejected'}`);
            searchCampaigns();
            checkNotifications();
        }

        // Payment Modal
        function openPaymentModal(campaignId) {
            if (campaigns[campaignId].reviewStatus !== 'Approved') {
                alert('Campaign must be approved before payment');
                return;
            }
            document.getElementById('payment-modal').dataset.campaignId = campaignId;
            document.getElementById('payment-modal').classList.remove('hidden');
            trapFocus(document.getElementById('payment-modal'));
        }
        function closePaymentModal() {
            document.getElementById('payment-modal').classList.add('hidden');
            restoreFocus();
        }
        function selectBank(bank) {
            const campaignId = document.getElementById('payment-modal').dataset.campaignId;
            campaigns[campaignId].reviewStatus = 'Active';
            alert(`Redirecting to ${bank} banking API for campaign ${campaignId} (Price: ${campaigns[campaignId].price} birr)`);
            console.log(`Payment initiated for Campaign ${campaignId} via ${bank}`);
            closePaymentModal();
            searchCampaigns();
            checkNotifications();
        }

        // Notification Modal
        function openNotificationModal() {
            document.getElementById('notification-modal').classList.remove('hidden');
            trapFocus(document.getElementById('notification-modal'));
        }
        function closeNotificationModal() {
            document.getElementById('notification-modal').classList.add('hidden');
            restoreFocus();
        }
        function checkNotifications() {
            let hasNotifications = false;
            const notificationContent = document.getElementById('notification-content');
            notificationContent.innerHTML = '';
            Object.values(campaigns).forEach(campaign => {
                if (campaign.reviewStatus === 'Draft') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.textContent = `Campaign "${campaign.name}" is in draft. Submit for review.`;
                    p.innerHTML += ` <button onclick="submitForReview(${campaign.id})" class="underline">Submit</button>`;
                    notificationContent.appendChild(p);
                } else if (campaign.reviewStatus === 'Under Review') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.textContent = `Campaign "${campaign.name}" is under review.`;
                    notificationContent.appendChild(p);
                } else if (campaign.reviewStatus === 'Approved') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.textContent = `Campaign "${campaign.name}" is approved. Proceed to payment (Price: ${campaign.price} birr).`;
                    p.innerHTML += ` <button onclick="openPaymentModal(${campaign.id})" class="underline">Pay Now</button>`;
                    notificationContent.appendChild(p);
                } else if (campaign.reviewStatus === 'Active') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.textContent = `Campaign "${campaign.name}" is now active!`;
                    p.innerHTML += ` <button onclick="openAnalyticsModal(${campaign.id})" class="underline">View Analytics</button>`;
                    notificationContent.appendChild(p);
                } else if (campaign.reviewStatus === 'Rejected') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.textContent = `Campaign "${campaign.name}" was rejected. Please revise and resubmit.`;
                    notificationContent.appendChild(p);
                }
            });
            if (!hasNotifications) {
                notificationContent.textContent = 'You have no notifications.';
            }
            const dot = document.getElementById('notification-dot');
            const mobileDot = document.getElementById('mobile-notification-dot');
            if (hasNotifications) {
                dot.classList.remove('hidden');
                mobileDot.classList.remove('hidden');
            } else {
                dot.classList.add('hidden');
                mobileDot.classList.add('hidden');
            }
        }

        // Focus Management
        let lastFocusedElement = null;
        function trapFocus(modal) {
            lastFocusedElement = document.activeElement;
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });

            firstElement.focus();
        }

        function restoreFocus() {
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        // Mobile Menu Toggle
        function toggleMobileMenu() {
            const mobileMenu = document.getElementById('mobile-menu');
            const menuBtn = document.getElementById('menu-btn');
            const isOpen = mobileMenu.classList.contains('open');
            if (isOpen) {
                mobileMenu.classList.remove('open');
                menuBtn.setAttribute('aria-expanded', 'false');
            } else {
                mobileMenu.classList.add('open');
                menuBtn.setAttribute('aria-expanded', 'true');
            }
        }

        // Initialize
        function initialize() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeToggleIcon(savedTheme);
            initProfile();
            setInterval(checkNotifications, 60000);
            document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
            document.getElementById('mobile-theme-toggle-btn').addEventListener('click', toggleTheme);
            document.getElementById('menu-btn').addEventListener('click', toggleMobileMenu);
            document.getElementById('campaign-duration-package')?.addEventListener('change', updateCampaignPrice);
            document.getElementById('campaign-custom-duration')?.addEventListener('input', updateCampaignPrice);
        }

        // Event Listeners
        document.addEventListener('DOMContentLoaded', initialize);

        // Close Modals on Escape Key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = [
                    'edit-profile-modal', 'create-campaign-modal', 'view-campaign-modal',
                    'analytics-modal', 'payment-modal', 'notification-modal'
                ];
                modals.forEach(id => {
                    const modal = document.getElementById(id);
                    if (!modal.classList.contains('hidden')) {
                        modal.classList.add('hidden');
                        restoreFocus();
                    }
                });
            }
        });