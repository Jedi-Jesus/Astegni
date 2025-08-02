
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
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon(newTheme);
    // Force style recalculation
    document.body.offsetHeight; // Trigger reflow to ensure styles apply
}

function updateThemeToggleIcon(theme) {
    const iconPath = theme === 'light' ?
        `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>` :
        `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>`;
    const themeToggle = document.getElementById('theme-toggle-btn');
    if (themeToggle) {
        themeToggle.querySelector('svg').innerHTML = iconPath;
    }
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
    if (mobileThemeToggle) {
        mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${iconPath}</svg>`;
    }
}

        // Video Call Admin
        function initiateVideoCall() {
            alert('Initiating video call with admin... (This is a placeholder function)');
        }

        // Chat with Admin
        let chatMessages = [];
        function openChatAdminModal() {
            document.getElementById('chat-admin-modal').classList.remove('hidden');
            searchChatCampaigns();
            updateChatView();
            trapFocus(document.getElementById('chat-admin-modal'));
        }
        function closeChatAdminModal() {
            document.getElementById('chat-admin-modal').classList.add('hidden');
            document.getElementById('chat-campaign-search').value = '';
            document.getElementById('chat-message').value = '';
            searchChatCampaigns();
            restoreFocus();
        }
        function searchChatCampaigns() {
            const searchTerm = document.getElementById('chat-campaign-search').value.trim().toLowerCase();
            const resultsDiv = document.getElementById('chat-campaign-results');
            resultsDiv.innerHTML = '';
            Object.values(campaigns).forEach(campaign => {
                const matchesId = searchTerm === '' || campaign.id.toString().includes(searchTerm);
                const matchesName = searchTerm === '' || campaign.name.toLowerCase().includes(searchTerm);
                if (matchesId || matchesName) {
                    const p = document.createElement('p');
                    p.textContent = `ID: ${campaign.id} - ${campaign.name}`;
                    p.className = 'cursor-pointer hover:underline';
                    p.onclick = () => {
                        document.getElementById('chat-campaign-search').value = `ID: ${campaign.id}`;
                        searchChatCampaigns();
                    };
                    resultsDiv.appendChild(p);
                }
            });
            if (resultsDiv.innerHTML === '') {
                resultsDiv.textContent = 'No campaigns found.';
            }
        }
        function sendChatMessage() {
            const message = document.getElementById('chat-message').value.trim();
            const campaignSearch = document.getElementById('chat-campaign-search').value.trim();
            if (!message) {
                alert('Please enter a message');
                return;
            }
            chatMessages.push({
                campaign: campaignSearch || 'General',
                message,
                timestamp: new Date().toLocaleString()
            });
            document.getElementById('chat-message').value = '';
            updateChatView();
            alert('Message sent to admin');
        }
        function updateChatView() {
            const chatView = document.getElementById('chat-view');
            chatView.innerHTML = '';
            chatMessages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'chat-message';
                div.innerHTML = `<strong>${msg.campaign}</strong> (${msg.timestamp}): ${msg.message}`;
                chatView.appendChild(div);
            });
            chatView.scrollTop = chatView.scrollHeight;
        }

        // Comment and Rate Astegni
        function openCommentRateModal() {
            document.getElementById('comment-rate-modal').classList.remove('hidden');
            trapFocus(document.getElementById('comment-rate-modal'));
        }
        function closeCommentRateModal() {
            document.getElementById('comment-rate-modal').classList.add('hidden');
            document.getElementById('comment-usability-text').value = '';
            document.getElementById('comment-usability-value').value = '1';
            document.getElementById('comment-service-text').value = '';
            document.getElementById('comment-service-value').value = '1';
            restoreFocus();
        }
        function submitCommentAndRate() {
            const usabilityComment = document.getElementById('comment-usability-text').value.trim();
            const usabilityRating = document.getElementById('comment-usability-value').value;
            const serviceComment = document.getElementById('comment-service-text').value.trim();
            const serviceRating = document.getElementById('comment-service-value').value;
            if (!usabilityComment || !serviceComment) {
                alert('Please enter both usability and customer service comments');
                return;
            }
            alert(`Usability Comment: "${usabilityComment}"\nUsability Rating: ${usabilityRating} star${usabilityRating > 1 ? 's' : ''}\nCustomer Service Comment: "${serviceComment}"\nCustomer Service Rating: ${serviceRating} star${serviceRating > 1 ? 's' : ''}`);
            closeCommentRateModal();
        }

        
    // Open cover picture upload modal
    function openCoverPictureUploader() {
        document.getElementById('cover-pic-upload-modal').classList.remove('hidden');
    }

    // Open profile picture upload modal
    function openProfilePictureUploader() {
        document.getElementById('profile-pic-upload-modal').classList.remove('hidden');
    }

    // Preview cover picture in upload modal
    function previewCoverPicture(event) {
        const input = event.target;
        const previewContainer = document.getElementById('cover-pic-preview');
        const previewImg = document.getElementById('cover-preview-img');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            previewContainer.classList.add('hidden');
            previewImg.src = '#';
        }
    }

    // Preview profile picture in upload modal
    function previewProfilePicture(event) {
        const input = event.target;
        const previewContainer = document.getElementById('profile-pic-preview');
        const previewImg = document.getElementById('profile-preview-img');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            previewContainer.classList.add('hidden');
            previewImg.src = '#';
        }
    }

    // Upload cover picture (placeholder function, implement actual upload logic)
    function uploadCoverPicture() {
        const input = document.getElementById('cover-pic-input');
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('advertiser-cover').src = e.target.result;
                closeModal('cover-pic-upload-modal');
            };
            reader.readAsDataURL(file);
        }
    }

    // Upload profile picture (placeholder function, implement actual upload logic)
    function uploadProfilePicture() {
        const input = document.getElementById('profile-pic-input');
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('advertiser-profile-pic').src = e.target.result;
                closeModal('profile-pic-upload-modal');
            };
            reader.readAsDataURL(file);
        }
    }

    // Close modal and reset preview
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('hidden');
        if (modalId === 'cover-pic-upload-modal') {
            document.getElementById('cover-pic-input').value = '';
            document.getElementById('cover-pic-preview').classList.add('hidden');
            document.getElementById('cover-preview-img').src = '#';
        } else if (modalId === 'profile-pic-upload-modal') {
            document.getElementById('profile-pic-input').value = '';
            document.getElementById('profile-pic-preview').classList.add('hidden');
            document.getElementById('profile-preview-img').src = '#';
        }
        restoreFocus();
    }

        // Data Objects
    // Sample advertiser data (replace with actual data source)
    const advertiser = {
        name: 'EduAds Inc.',
        email: 'contact@eduads.com',
        location: 'Addis Ababa, Ethiopia',
        phone: '+251912345680',
        profilePic: 'https://via.placeholder.com/64',
        coverPic: 'https://via.placeholder.com/1200x150'
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


// Toggle profile dropdown
    
function toggleMobileProfileDropdown() {
    const dropdown = document.getElementById('mobile-profile-dropdown');
    dropdown.classList.toggle('hidden');
}

    // Share profile (placeholder function)
    function shareProfile() {
        alert('Share functionality not implemented. Add logic to share profile (e.g., copy link or social media).');
        toggleProfileDropdown();
    }

    // Unsubscribe (placeholder function)
    function unsubscribe() {
        alert('Unsubscribe functionality not implemented. Add logic to handle subscription cancellation.');
        toggleProfileDropdown();
    }

    // Delete account (placeholder function)
    function deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            alert('Delete account functionality not implemented. Add logic to delete account.');
        }
        toggleProfileDropdown();
    }
    // Toggle mobile menu
    function toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuBtn = document.getElementById('menu-btn');
        const isExpanded = mobileMenu.classList.toggle('hidden');
        menuBtn.setAttribute('aria-expanded', !isExpanded);
    }

    // Event listener for mobile menu button
    document.getElementById('menu-btn').addEventListener('click', toggleMobileMenu);


    // Initialize profile data
    function initProfile() {
        document.getElementById('advertiser-name').textContent = advertiser.name;
        document.getElementById('advertiser-email').textContent = advertiser.email;
        document.getElementById('advertiser-location').textContent = advertiser.location;
        document.getElementById('advertiser-phone').textContent = advertiser.phone;
        document.getElementById('advertiser-profile-pic').src = advertiser.profilePic;
        document.getElementById('advertiser-cover').src = advertiser.coverPic;
        document.getElementById('profile-name').textContent = advertiser.name;
        document.getElementById('profile-pic').src = advertiser.profilePic;
    }

    // Open edit profile modal with current values
    function openEditProfileModal() {
        document.getElementById('edit-name').value = advertiser.name;
        document.getElementById('edit-email').value = advertiser.email;
        document.getElementById('edit-location').value = advertiser.location;
        document.getElementById('edit-phone').value = advertiser.phone;
        document.getElementById('edit-profile-modal').classList.remove('hidden');
    }

    // Save profile changes
    function saveProfileChanges() {
        advertiser.name = document.getElementById('edit-name').value;
        advertiser.email = document.getElementById('edit-email').value;
        advertiser.location = document.getElementById('edit-location').value;
        advertiser.phone = document.getElementById('edit-phone').value;
        initProfile();
        closeModal('edit-profile-modal');
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
                        <td class="p-2">${campaign.id}</td>
                        <td class="p-2">${campaign.name}</td>
                        <td class="p-2">${campaign.reviewStatus}</td>
                        <td class="p-2">
                            ${campaign.reviewStatus === 'Draft' ? `<button onclick="submitForReview(${campaign.id})" class="px-2 py-1 rounded-lg cta-button">Submit for Review</button>` : ''}
                            ${campaign.reviewStatus === 'Approved' ? `<button onclick="openPaymentModal(${campaign.id})" class="px-2 py-1 rounded-lg cta-button">Pay Now</button>` : ''}
                        </td>
                        <td class="p-2">
                            ${campaign.reviewStatus === 'Active' || campaign.reviewStatus === 'Approved' ? `<button onclick="openAnalyticsModal(${campaign.id})" class="px-2 py-1 rounded-lg cta-button">View Analytics</button>` : 'N/A'}
                        </td>
                        <td class="p-2">
                            <button onclick="openViewCampaignModal(${campaign.id})" class="px-2 py-1 rounded-lg cta-button">View</button>
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
            document.getElementById('payment-bank').value = 'CBE';
            document.getElementById('payment-account').value = '';
            restoreFocus();
        }
        function processPayment() {
            const campaignId = document.getElementById('payment-modal').dataset.campaignId;
            const bank = document.getElementById('payment-bank').value;
            const account = document.getElementById('payment-account').value.trim();
            if (!account) {
                alert('Please enter an account number');
                return;
            }
            campaigns[campaignId].reviewStatus = 'Active';
            console.log(`Payment processed for Campaign ${campaignId} via ${bank} (Account: ${account})`);
            closePaymentModal();
            openCongratulationsModal(campaignId);
            searchCampaigns();
            checkNotifications();
        }

        // Congratulations Modal
        function openCongratulationsModal(campaignId) {
            selectedCampaignId = campaignId;
            const campaign = campaigns[campaignId];
            document.getElementById('congratulations-title').textContent = `Congratulations ${advertiser.name}`;
            document.getElementById('congratulations-message').textContent = `Your campaign "${campaign.name}" is now live!`;
            document.getElementById('congratulations-modal').classList.remove('hidden');
            trapFocus(document.getElementById('congratulations-modal'));
        }
        function closeCongratulationsModal() {
            document.getElementById('congratulations-modal').classList.add('hidden');
            selectedCampaignId = null;
            restoreFocus();
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
                    p.innerHTML = `Campaign "${campaign.name}" is in draft. <button onclick="submitForReview(${campaign.id})" class="px-2 py-1 rounded-lg cta-button">Submit</button>`;
                    notificationContent.appendChild(p);
                } else if (campaign.reviewStatus === 'Under Review') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.textContent = `Campaign "${campaign.name}" is under review.`;
                    notificationContent.appendChild(p);
                } else if (campaign.reviewStatus === 'Approved') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.innerHTML = `Campaign "${campaign.name}" is approved. <button onclick="openPaymentModal(${campaign.id});closeNotificationModal()" class="px-2 py-1 rounded-lg cta-button"><svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9"></path></svg> Pay Now</button>`;
                    notificationContent.appendChild(p);
                } else if (campaign.reviewStatus === 'Active') {
                    hasNotifications = true;
                    const p = document.createElement('p');
                    p.innerHTML = `Campaign "${campaign.name}" is now active! <button onclick="openAnalyticsModal(${campaign.id})" class="px-2 py-1 rounded-lg cta-button">View Analytics</button>`;
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
            if (focusableElements.length === 0) return;
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleKeydown = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };

            modal.addEventListener('keydown', handleKeydown);
            modal._trapFocusHandler = handleKeydown;
            firstElement.focus();
        }

        function restoreFocus() {
            const modals = document.querySelectorAll('.fixed:not(.hidden)');
            modals.forEach(modal => {
                if (modal._trapFocusHandler) {
                    modal.removeEventListener('keydown', modal._trapFocusHandler);
                    delete modal._trapFocusHandler;
                }
            });
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
            localStorage.setItem('theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeToggleIcon('light');
            initProfile();
            setInterval(checkNotifications, 60000);
            document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
            document.getElementById('mobile-theme-toggle-btn').addEventListener('click', toggleTheme);
            document.getElementById('menu-btn').addEventListener('click', toggleMobileMenu);
            const durationPackage = document.getElementById('campaign-duration-package');
            if (durationPackage) durationPackage.addEventListener('change', updateCampaignPrice);
            const customDuration = document.getElementById('campaign-custom-duration');
            if (customDuration) customDuration.addEventListener('input', updateCampaignPrice);
        }

        // Event Listeners
        document.addEventListener('DOMContentLoaded', initialize);

                // Close Modals on Escape Key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = [
                    'edit-profile-modal', 
                    'profile-pic-upload-modal', 
                    'cover-pic-upload-modal',
                    'comment-rate-modal', 
                    'chat-admin-modal',
                    'create-campaign-modal',
                    'view-campaign-modal',
                    'analytics-modal',
                    'payment-modal',
                    'congratulations-modal',
                    'notification-modal'
                ];
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal && !modal.classList.contains('hidden')) {
                        modal.classList.add('hidden');
                        restoreFocus();
                    }
                });
            }
        });

        function toggleMobileProfileDropdown() {
    const dropdown = document.getElementById('mobile-profile-dropdown');
    dropdown.classList.toggle('hidden');
}

function openNotesModal() {
    alert('Notes functionality not implemented. Add logic to open notes modal.');
}

function openManageFinancesModal() {
    alert('Manage Finances functionality not implemented. Add logic to open finances modal.');
}

function initProfile() {
    document.getElementById('advertiser-name').textContent = advertiser.name;
    document.getElementById('advertiser-email').textContent = advertiser.email;
    document.getElementById('advertiser-location').textContent = advertiser.location;
    document.getElementById('advertiser-phone').textContent = advertiser.phone;
    document.getElementById('advertiser-profile-pic').src = advertiser.profilePic;
    document.getElementById('advertiser-cover').src = advertiser.coverPic;
    document.getElementById('profile-name').textContent = advertiser.name;
    document.getElementById('profile-pic').src = advertiser.profilePic;
    document.getElementById('mobile-profile-name').textContent = advertiser.name;
    document.getElementById('mobile-profile-pic').src = advertiser.profilePic;
}

function saveProfileChanges() {
    advertiser.name = document.getElementById('edit-name').value;
    advertiser.email = document.getElementById('edit-email').value;
    advertiser.location = document.getElementById('edit-location').value;
    advertiser.phone = document.getElementById('edit-phone').value;
    initProfile();
    closeModal('edit-profile-modal');
}

function initialize() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);
    initProfile();
    setInterval(checkNotifications, 60000);
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
    document.getElementById('mobile-theme-toggle-btn').addEventListener('click', toggleTheme);
    document.getElementById('menu-btn').addEventListener('click', toggleMobileMenu);
    const durationPackage = document.getElementById('campaign-duration-package');
    if (durationPackage) durationPackage.addEventListener('change', updateCampaignPrice);
    const customDuration = document.getElementById('campaign-custom-duration');
    if (customDuration) customDuration.addEventListener('input', updateCampaignPrice);
}



        
// Toggle profile dropdown
    function toggleProfileDropdown() {
        const dropdown = document.getElementById('profile-dropdown');
        dropdown.classList.toggle('hidden');
    }

    // Share profile (placeholder function)
    function shareProfile() {
        alert('Share functionality not implemented. Add logic to share profile (e.g., copy link or social media).');
        toggleProfileDropdown();
    }

    // Unsubscribe (placeholder function)
    function unsubscribe() {
        alert('Unsubscribe functionality not implemented. Add logic to handle subscription cancellation.');
        toggleProfileDropdown();
    }

    // Delete account (placeholder function)
    function deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            alert('Delete account functionality not implemented. Add logic to delete account.');
        }
        toggleProfileDropdown();
    }
    // Toggle mobile menu
    function toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuBtn = document.getElementById('menu-btn');
        const isExpanded = mobileMenu.classList.toggle('hidden');
        menuBtn.setAttribute('aria-expanded', !isExpanded);
    }

    // Event listener for mobile menu button
    document.getElementById('menu-btn').addEventListener('click', toggleMobileMenu);

    
        // Re-attach Event Listener for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', initialize);
    