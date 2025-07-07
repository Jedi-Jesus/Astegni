
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
            1: {
                id: 1,
                name: 'EduAds Inc.',
                email: 'contact@eduads.com',
                phone: '+251912345680',
                profilePic: 'https://via.placeholder.com/64',
                coverImage: 'https://via.placeholder.com/1200x300',
                status: 'Active'
            },
            2: {
                id: 2,
                name: 'LearnEasy Ltd.',
                email: 'info@learneasy.et',
                phone: '+251911223344',
                profilePic: 'https://via.placeholder.com/64',
                coverImage: 'https://via.placeholder.com/1200x300',
                status: 'Pending'
            }
        };
        const campaigns = {
            1: {
                id: 1,
                advertiserId: 1,
                name: 'Math Tutoring Promo',
                duration: 30,
                price: 19500,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Promote math tutoring with fun visuals' },
                reviewStatus: 'Under Review',
                moderationStatus: 'Pending'
            },
            2: {
                id: 2,
                advertiserId: 1,
                name: 'Science Campaign',
                duration: 15,
                price: 11250,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Science tutoring ad for all grades' },
                reviewStatus: 'Approved',
                moderationStatus: 'Approved'
            }
        };
        const notifications = {
            1: {
                id: 1,
                message: 'New campaign submitted for review',
                recipient: 'Admin',
                date: '2025-05-20'
            }
        };
        const logs = {
            1: {
                id: 1,
                action: 'Campaign 1 submitted for review',
                user: 'Admin',
                date: '2025-05-20 10:00'
            }
        };
        const schools = {
            1: {
                id: 1,
                name: 'Central Prep',
                phone: '+251-912-000-111',
                email: 'info@centralprep.et',
                location: 'Addis Ababa, Ethiopia'
            },
            2: {
                id: 2,
                name: 'Riverside Academy',
                phone: '+251-912-000-222',
                email: 'contact@riverside.et',
                location: 'Bahir Dar, Ethiopia'
            },
            3: {
                id: 3,
                name: 'Springfield High',
                phone: '+251-912-000-333',
                email: 'admin@springfield.et',
                location: 'Hawassa, Ethiopia'
            }
        };

        // Initialize Dashboard
        function initDashboard() {
            if (currentAdmin.role === 'Super Admin') {
                document.getElementById('total-revenue-card').classList.remove('hidden');
            }
            updateSummary();
            searchAdvertisers();
            searchCampaigns();
            updateNotifications();
            searchSchools();
            searchLogs();
            checkNotifications();
        }

        // Update Summary
       function updateSummary() {
    const activeCampaigns = Object.values(campaigns).filter(c => c.reviewStatus === 'Active').length;
    const pendingReviews = Object.values(campaigns).filter(c => c.reviewStatus === 'Under Review').length;
    const schoolListingRequests = Object.values(schools).filter(s => s.status === 'Pending').length;
    document.getElementById('active-campaigns').textContent = activeCampaigns;
    document.getElementById('pending-reviews').textContent = pendingReviews;
    document.getElementById('school-listing-requests').textContent = schoolListingRequests;
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

        // Advertiser Management
        let selectedUserId = null;
        function searchAdvertisers() {
            const searchTerm = document.getElementById('advertiser-search').value.trim().toLowerCase();
            const advertiserTable = document.getElementById('advertiser-table');
            advertiserTable.innerHTML = '';
            Object.values(advertisers).forEach(user => {
                if (searchTerm === '' || user.name.toLowerCase().includes(searchTerm) || user.email.toLowerCase().includes(searchTerm)) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="p-2">${user.name}</td>
                        <td class="p-2">${user.email}</td>
                        <td class="p-2">${user.status}</td>
                        <td class="p-2">
                            ${user.status === 'Pending' ? `<button onclick="approveUser(${user.id})" class="hover:underline">Approve</button> | ` : ''}
                            ${user.status === 'Pending' ? `<button onclick="rejectUser(${user.id})" class="hover:underline">Reject</button> | ` : ''}
                            <button onclick="reportUser(${user.id})" class="hover:underline">Report</button> |
                            <button onclick="suspendUser(${user.id})" class="hover:underline">${user.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}</button> |
                            ${currentAdmin.role === 'Super Admin' ? `<button onclick="deleteUser(${user.id})" class="hover:underline">Delete</button>` : ''}
                        </td>
                    `;
                    advertiserTable.appendChild(tr);
                }
            });
        }
        function approveUser(userId) {
            advertisers[userId].status = 'Active';
            logAction(`Approved user ${advertisers[userId].email}`);
            alert('User approved');
            searchAdvertisers();
            updateSummary();
        }
        function rejectUser(userId) {
            advertisers[userId].status = 'Rejected';
            logAction(`Rejected user ${advertisers[userId].email}`);
            alert('User rejected');
            searchAdvertisers();
            updateSummary();
        }
        function suspendUser(userId) {
            const user = advertisers[userId];
            user.status = user.status === 'Suspended' ? 'Active' : 'Suspended';
            logAction(`${user.status === 'Suspended' ? 'Suspended' : 'Unsuspended'} user ${user.email}`);
            if (user.status === 'Suspended' && currentAdmin.role !== 'Super Admin') {
                const newId = Object.keys(notifications).length + 1;
                notifications[newId] = {
                    id: newId,
                    message: `Advertiser ${user.email} suspended by ${currentAdmin.email}`,
                    recipient: 'Super Admin',
                    date: new Date().toISOString().split('T')[0]
                };
            }
            alert(`User ${user.status === 'Suspended' ? 'suspended' : 'unsuspended'}`);
            searchAdvertisers();
            checkNotifications();
        }
        function reportUser(userId) {
            const user = advertisers[userId];
            const newId = Object.keys(notifications).length + 1;
            notifications[newId] = {
                id: newId,
                message: `Advertiser ${user.email} reported by ${currentAdmin.email}`,
                recipient: 'Super Admin',
                date: new Date().toISOString().split('T')[0]
            };
            logAction(`Reported user ${user.email}`);
            alert('User reported for review');
            checkNotifications();
        }
        function deleteUser(userId) {
            if (confirm('Are you sure you want to delete this user?')) {
                logAction(`Deleted user ${advertisers[userId].email}`);
                delete advertisers[userId];
                alert('User deleted');
                searchAdvertisers();
                updateSummary();
            }
        }

        // Campaign Management
        let selectedCampaignId = null;
        function searchCampaigns() {
            const searchTerm = document.getElementById('campaign-search').value.trim().toLowerCase();
            const campaignTable = document.getElementById('campaign-table');
            campaignTable.innerHTML = '';
            Object.values(campaigns).forEach(campaign => {
                const advertiser = advertisers[campaign.advertiserId];
                if (searchTerm === '' || campaign.name.toLowerCase().includes(searchTerm) || campaign.adContent.description.toLowerCase().includes(searchTerm)) {
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-campaign-id', campaign.id);
                    tr.innerHTML = `
    <td class="p-2">${campaign.name}</td>
    <td class="p-2">${advertiser ? advertiser.name : 'Unknown'}</td>
    <td class="p-2">${campaign.reviewStatus}</td>
    <td class="p-2">
        ${campaign.reviewStatus === 'Under Review' ? `<button onclick="openReviewCampaignModal(${campaign.id})" class="hover:underline">Review</button> | ` : ''}
        <button onclick="openEditCampaignModal(${campaign.id})" class="hover:underline">Edit</button> |
        <button onclick="deleteCampaign(${campaign.id})" class="hover:underline">Delete</button> |
        ${campaign.reviewStatus === 'Active' ? `<button onclick="pauseCampaign(${campaign.id})" class="hover:underline">${campaign.reviewStatus === 'Paused' ? 'Resume' : 'Pause'}</button>` : ''}
    </td>
`;
                    campaignTable.appendChild(tr);
                }
            });
        }
        function openReviewCampaignModal(campaignId) {
            selectedCampaignId = campaignId;
            const campaign = campaigns[campaignId];
            document.getElementById('review-campaign-content').innerHTML = `
                <h4 class="text-xl font-semibold mb-2">${campaign.name}</h4>
                <a href="${campaign.adContent.url}" target="_blank">
                    <img src="${campaign.adContent.url}" alt="${campaign.name}" class="w-full h-48 object-cover rounded-lg mb-4">
                </a>
                <p class="mb-2"><strong>Description:</strong> ${campaign.adContent.description}</p>
                <p class="mb-2"><strong>Duration:</strong> ${campaign.duration} days</p>
            `;
            document.getElementById('review-campaign-modal').classList.remove('hidden');
            trapFocus(document.getElementById('review-campaign-modal'));
        }
        function closeReviewCampaignModal() {
            document.getElementById('review-campaign-modal').classList.add('hidden');
            selectedCampaignId = null;
            restoreFocus();
        }
        function openRejectCampaignModal() {
            document.getElementById('reject-reason').value = '';
            document.getElementById('reject-campaign-modal').classList.remove('hidden');
            trapFocus(document.getElementById('reject-campaign-modal'));
        }
        function closeRejectCampaignModal() {
            document.getElementById('reject-campaign-modal').classList.add('hidden');
            restoreFocus();
        }
        function rejectCampaignWithReason() {
            const reason = document.getElementById('reject-reason').value.trim();
            if (!reason) {
                alert('Please provide a reason for rejection');
                return;
            }
            const campaign = campaigns[selectedCampaignId];
            campaign.reviewStatus = 'Rejected';
            campaign.moderationStatus = 'Rejected';
            const newId = Object.keys(notifications).length + 1;
            notifications[newId] = {
                id: newId,
                message: `Your campaign "${campaign.name}" was rejected. Reason: ${reason}`,
                recipient: advertisers[campaign.advertiserId].email,
                date: new Date().toISOString().split('T')[0]
            };
            logAction(`Rejected campaign ${campaign.name} with reason: ${reason}`);
            alert('Campaign rejected and notification sent');
            searchCampaigns();
            updateSummary();
            closeRejectCampaignModal();
            closeReviewCampaignModal();
        }
        function reviewCampaign(campaignId, approve) {
            if (approve) {
                const campaign = campaigns[campaignId];
                campaign.reviewStatus = 'Approved';
                campaign.moderationStatus = 'Approved';
                const newId = Object.keys(notifications).length + 1;
                notifications[newId] = {
                    id: newId,
                    message: `Congratulations, your campaign "${campaign.name}" has been approved!`,
                    recipient: advertisers[campaign.advertiserId].email,
                    date: new Date().toISOString().split('T')[0]
                };
                logAction(`Approved campaign ${campaign.name}`);
                alert('Campaign approved and notification sent');
            }
            searchCampaigns();
            updateSummary();
            closeReviewCampaignModal();
        }
        function openEditCampaignModal(campaignId) {
            selectedCampaignId = campaignId;
            const campaign = campaigns[campaignId];
            document.getElementById('edit-campaign-name').value = campaign.name;
            document.getElementById('edit-campaign-duration').value = campaign.duration;
            document.getElementById('edit-campaign-description').value = campaign.adContent.description;
            document.getElementById('edit-campaign-modal').classList.remove('hidden');
            trapFocus(document.getElementById('edit-campaign-modal'));
        }
        function closeEditCampaignModal() {
            document.getElementById('edit-campaign-modal').classList.add('hidden');
            selectedCampaignId = null;
            restoreFocus();
        }
        function saveCampaign() {
            const campaign = campaigns[selectedCampaignId];
            campaign.name = document.getElementById('edit-campaign-name').value.trim();
            campaign.duration = parseInt(document.getElementById('edit-campaign-duration').value);
            campaign.adContent.description = document.getElementById('edit-campaign-description').value.trim();
            if (!campaign.name || !campaign.duration || !campaign.adContent.description) {
                alert('Please fill in all fields');
                return;
            }
            logAction(`Edited campaign ${campaign.name}`);
            alert('Campaign updated');
            searchCampaigns();
            closeEditCampaignModal();
        }
        function deleteCampaign(campaignId) {
            if (confirm('Are you sure you want to delete this campaign?')) {
                logAction(`Deleted campaign ${campaigns[campaignId].name}`);
                delete campaigns[campaignId];
                alert('Campaign deleted');
                searchCampaigns();
                updateSummary();
            }
        }
        function pauseCampaign(campaignId) {
            const campaign = campaigns[campaignId];
            campaign.reviewStatus = campaign.reviewStatus === 'Paused' ? 'Active' : 'Paused';
            logAction(`${campaign.reviewStatus === 'Paused' ? 'Paused' : 'Resumed'} campaign ${campaign.name}`);
            alert(`Campaign ${campaign.reviewStatus === 'Paused' ? 'paused' : 'resumed'}`);
            searchCampaigns();
        }

        // School Management
        let selectedSchoolId = null;
        function searchSchools() {
            const searchTerm = document.getElementById('school-search').value.trim().toLowerCase();
            const schoolTable = document.getElementById('school-table');
            schoolTable.innerHTML = '';
            Object.values(schools).forEach(school => {
                if (searchTerm === '' || school.name.toLowerCase().includes(searchTerm) || school.email.toLowerCase().includes(searchTerm)) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="p-2">${school.name}</td>
                        <td class="p-2">${school.phone}</td>
                        <td class="p-2">${school.email}</td>
                        <td class="p-2">${school.location}</td>
                        <td class="p-2">
                            <button onclick="openEditSchoolModal(${school.id})" class="hover:underline">Edit</button> |
                            <button onclick="deleteSchool(${school.id})" class="hover:underline">Delete</button>
                        </td>
                    `;
                    schoolTable.appendChild(tr);
                }
            });
        }
        function openAddSchoolModal() {
            selectedSchoolId = null;
            document.getElementById('add-school-modal').querySelector('h3').textContent = 'Add School';
            document.getElementById('school-name').value = '';
            document.getElementById('school-phone').value = '';
            document.getElementById('school-email').value = '';
            document.getElementById('school-location').value = '';
            document.getElementById('add-school-modal').classList.remove('hidden');
            trapFocus(document.getElementById('add-school-modal'));
        }
        function openEditSchoolModal(schoolId) {
            selectedSchoolId = schoolId;
            const school = schools[schoolId];
            document.getElementById('add-school-modal').querySelector('h3').textContent = 'Edit School';
            document.getElementById('school-name').value = school.name;
            document.getElementById('school-phone').value = school.phone;
            document.getElementById('school-email').value = school.email;
            document.getElementById('school-location').value = school.location;
            document.getElementById('add-school-modal').classList.remove('hidden');
            trapFocus(document.getElementById('add-school-modal'));
        }
        function closeAddSchoolModal() {
            document.getElementById('add-school-modal').classList.add('hidden');
            selectedSchoolId = null;
            restoreFocus();
        }
        function saveSchool() {
            const name = document.getElementById('school-name').value.trim();
            const phone = document.getElementById('school-phone').value.trim();
            const email = document.getElementById('school-email').value.trim();
            const location = document.getElementById('school-location').value.trim();
            if (!name || !phone || !email || !location) {
                alert('Please fill in all fields');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            if (!/^\+?\d{10,}$/.test(phone.replace(/[-()\s]/g, ''))) {
                alert('Please enter a valid phone number');
                return;
            }
            if (selectedSchoolId) {
                schools[selectedSchoolId] = { ...schools[selectedSchoolId], name, phone, email, location };
                logAction(`Edited school ${name}`);
                alert('School updated');
            } else {
                const newId = Object.keys(schools).length + 1;
                schools[newId] = { id: newId, name, phone, email, location };
                logAction(`Added school ${name}`);
                alert('School added');
            }
            searchSchools();
            closeAddSchoolModal();
        }
        function deleteSchool(schoolId) {
            if (confirm('Are you sure you want to delete this school?')) {
                logAction(`Deleted school ${schools[schoolId].name}`);
                delete schools[schoolId];
                alert('School deleted');
                searchSchools();
            }
        }

        // Notifications
        function updateNotifications() {
            const notificationTable = document.getElementById('notification-table');
            notificationTable.innerHTML = '';
            Object.values(notifications).forEach(notification => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-2">${notification.message}</td>
                    <td class="p-2">${notification.recipient}</td>
                    <td class="p-2">${notification.date}</td>
                `;
                notificationTable.appendChild(tr);
            });
        }
        function openSendNotificationModal() {
            document.getElementById('notification-recipient').value = 'all';
            document.getElementById('notification-message').value = '';
            document.getElementById('send-notification-modal').classList.remove('hidden');
            trapFocus(document.getElementById('send-notification-modal'));
        }
        function closeSendNotificationModal() {
            document.getElementById('send-notification-modal').classList.add('hidden');
            restoreFocus();
        }
        function sendNotification() {
            const recipient = document.getElementById('notification-recipient').value;
            const message = document.getElementById('notification-message').value.trim();
            if (!message) {
                alert('Please enter a message');
                return;
            }
            const newId = Object.keys(notifications).length + 1;
            notifications[newId] = {
                id: newId,
                message,
                recipient,
                date: new Date().toISOString().split('T')[0]
            };
            logAction(`Sent notification to ${recipient}: ${message}`);
            alert('Notification sent');
            updateNotifications();
            closeSendNotificationModal();
            checkNotifications();
        }

        // Admin Notifications
        function checkNotifications() {
            const hasNotifications = Object.values(notifications).some(n => n.recipient === 'Admin' || n.recipient === 'Super Admin');
            document.getElementById('notification-dot').classList.toggle('hidden', !hasNotifications);
            document.getElementById('mobile-notification-dot').classList.toggle('hidden', !hasNotifications);
            const notificationContent = document.getElementById('notification-content');
            const adminNotifications = Object.values(notifications).filter(n => n.recipient === 'Admin' || n.recipient === 'Super Admin');
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
        function searchLogs() {
            const searchTerm = document.getElementById('log-search').value.trim().toLowerCase();
            const logTable = document.getElementById('log-table');
            logTable.innerHTML = '';
            Object.values(logs).forEach(log => {
                if (searchTerm === '' || log.action.toLowerCase().includes(searchTerm) || log.user.toLowerCase().includes(searchTerm)) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="p-2">${log.action}</td>
                        <td class="p-2">${log.user}</td>
                        <td class="p-2">${log.date}</td>
                    `;
                    logTable.appendChild(tr);
                }
            });
        }
        function logAction(action) {
            const newId = Object.keys(logs).length + 1;
            logs[newId] = {
                id: newId,
                action,
                user: currentAdmin.email,
                date: new Date().toLocaleString()
            };
            searchLogs();
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