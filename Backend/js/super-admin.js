
    

    // Data Objects
const currentAdmin = { id: 1, email: 'admin@astegni.et', role: 'Super Admin' };
const advertisers = {
    1: { id: 1, name: 'EduAds Inc.', email: 'contact@eduads.com', status: 'Active', registered: '2025-01-10', rating: 4.5, left: null },
    2: { id: 2, name: 'LearnEasy Ltd.', email: 'info@learneasy.et', status: 'Pending', registered: '2025-05-15', rating: 3.8, left: null },
    3: { id: 3, name: 'StudyNow', email: 'info@studynow.et', status: 'Left', registered: '2024-12-01', rating: 2.5, left: '2025-06-01' }
};
const campaigns = {
    1: { id: 1, advertiserId: 1, name: 'Math Tutoring Promo', duration: 30, price: 19500, adContent: { description: 'Promote math tutoring' }, reviewStatus: 'Under Review', moderationStatus: 'Pending', startDate: '2025-05-20' },
    2: { id: 2, advertiserId: 1, name: 'Science Campaign', duration: 15, price: 11250, adContent: { description: 'Science tutoring ad' }, reviewStatus: 'Approved', moderationStatus: 'Approved', startDate: '2025-04-10' },
    3: { id: 3, advertiserId: 2, name: 'English Promo', duration: 7, price: 5600, adContent: { description: 'English tutoring ad' }, reviewStatus: 'Active', moderationStatus: 'Approved', startDate: '2025-05-25' }
};
const payments = {
    1: { id: 1, type: 'Ad Campaign', details: 'Math Tutoring Promo', amount: 19500, status: 'Pending', campaignId: 1, date: '2025-05-20' },
    2: { id: 2, type: 'Registration', details: 'EduAds Inc.', amount: 500, status: 'Completed', date: '2025-01-10' },
    3: { id: 3, type: 'Subscription', details: 'EduAds Inc. Monthly', amount: 200, status: 'Completed', date: '2025-05-01' },
    4: { id: 4, type: 'Subscription', details: 'LearnEasy Ltd. Monthly', amount: 200, status: 'Completed', date: '2025-06-01' }
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
const tutors = {
    1: { id: 1, name: 'Abebe Kebede', status: 'Confirmed', registered: '2025-02-01', rating: 4.7, comment: 'Great platform!', left: null },
    2: { id: 2, name: 'Marta Tesfaye', status: 'Confirmed', registered: '2025-03-15', rating: 4.2, comment: 'Good experience', left: null },
    3: { id: 3, name: 'Yared Alem', status: 'Left', registered: '2025-01-20', rating: 3.0, comment: 'Okay service', left: '2025-06-15' }
};
const users = {
    1: { id: 1, type: 'Parent', email: 'parent1@astegni.et', registered: '2025-01-05', rating: 4.5, comment: 'Very helpful tutors', left: null },
    2: { id: 2, type: 'Student', email: 'student1@astegni.et', registered: '2025-02-10', rating: 4.0, comment: 'Good platform', left: null, selfRegistered: true },
    3: { id: 3, type: 'Student', email: 'student2@astegni.et', registered: '2025-03-01', rating: 3.5, comment: 'Needs improvement', left: '2025-06-20', selfRegistered: false }
};
// Data Objects (append to existing)
        const superAdminComments = {
            1: { id: 1, commenter: 'User1', comment: 'Great admin support!', date: '2025-05-20' },
            2: { id: 2, commenter: 'User2', comment: 'Very responsive.', date: '2025-06-01' }
        };

        const colors = {
    primary: visualizationType === 'pie' ? ['#F59E0B', '#D97706', '#92400E', '#78350F'] : '#F59E0B',
    secondary: visualizationType === 'pie' ? ['#FFD54F', '#E6BF45', '#FFB300', '#E0E0E0'] : '#D97706'
};

// Initialize Dashboard (update existing)
function initDashboard() {
            document.getElementById('total-revenue-card').classList.remove('hidden');
            updateSummary();
            searchPayments();
            updatePriceRequests();
            updateReports();
            updateAdmins();
            checkNotifications();
            updateSuperAdminComments();
        }

        // Cover Photo Functions
        function openCoverPicModal() {
            const modal = document.getElementById('cover-pic-modal');
            modal.classList.remove('hidden');
            const fileInput = document.getElementById('cover-pic-upload');
            const preview = document.getElementById('cover-pic-preview');
            fileInput.value = '';
            preview.style.display = 'none';
            preview.src = '';
            trapFocus(modal);
        }

        function closeCoverPicModal() {
            document.getElementById('cover-pic-modal').classList.add('hidden');
            restoreFocus();
        }

        function uploadCoverPic() {
            const fileInput = document.getElementById('cover-pic-upload');
            const file = fileInput.files[0];
            const coverPic = document.getElementById('super-admin-cover-pic');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    coverPic.src = e.target.result;
                    closeCoverPicModal();
                    logAction('Updated super admin cover photo');
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please select an image to upload.');
            }
        }

        document.getElementById('cover-pic-upload').addEventListener('change', function(event) {
            const file = event.target.files[0];
            const preview = document.getElementById('cover-pic-preview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });

        // Profile Picture Functions
        function openProfilePicModal() {
            const modal = document.getElementById('profile-pic-modal');
            modal.classList.remove('hidden');
            const fileInput = document.getElementById('profile-pic-upload');
            const preview = document.getElementById('profile-pic-preview');
            fileInput.value = '';
            preview.style.display = 'none';
            preview.src = '';
            trapFocus(modal);
        }

        function closeProfilePicModal() {
            document.getElementById('profile-pic-modal').classList.add('hidden');
            restoreFocus();
        }

        function uploadProfilePic() {
            const fileInput = document.getElementById('profile-pic-upload');
            const file = fileInput.files[0];
            const profilePic = document.getElementById('super-admin-profile-pic');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePic.src = e.target.result;
                    closeProfilePicModal();
                    logAction('Updated super admin profile picture');
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please select an image to upload.');
            }
        }

        document.getElementById('profile-pic-upload').addEventListener('change', function(event) {
            const file = event.target.files[0];
            const preview = document.getElementById('profile-pic-preview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });

        // Edit Super Admin Profile Functions
        function openEditSuperAdminModal() {
            document.getElementById('edit-super-admin-modal').classList.remove('hidden');
            trapFocus(document.getElementById('edit-super-admin-modal'));
        }

        function closeEditSuperAdminModal() {
            document.getElementById('edit-super-admin-modal').classList.add('hidden');
            restoreFocus();
        }

        function saveSuperAdminProfile() {
            const name = document.getElementById('edit-super-admin-name').value.trim();
            const phone = document.getElementById('edit-super-admin-phone').value.trim();
            const email = document.getElementById('edit-super-admin-email').value.trim();
            const location = document.getElementById('edit-super-admin-location').value.trim();
            const bio = document.getElementById('edit-super-admin-bio').value.trim();
            const quote = document.getElementById('edit-super-admin-quote').value.trim();
            const facebook = document.getElementById('edit-super-admin-facebook').value.trim();
            const x = document.getElementById('edit-super-admin-x').value.trim();
            const instagram = document.getElementById('edit-super-admin-instagram').value.trim();

            if (!name || !phone || !email || !location || !bio || !quote) {
                alert('Please fill in all required fields.');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            document.getElementById('super-admin-name').textContent = name;
            document.getElementById('super-admin-phone').textContent = `Phone: ${phone}`;
            document.getElementById('super-admin-email').textContent = `Email: ${email}`;
            document.getElementById('super-admin-location').textContent = `Location: ${location}`;
            document.getElementById('super-admin-bio').textContent = `Bio: ${bio}`;
            document.getElementById('super-admin-quote').textContent = `"${quote}"`;
            document.querySelector('.social-icons a[href*="facebook.com"]').href = facebook;
            document.querySelector('.social-icons a[href*="x.com"]').href = x;
            document.querySelector('.social-icons a[href*="instagram.com"]').href = instagram;

            logAction('Updated super admin profile');
            alert('Profile updated successfully.');
            closeEditSuperAdminModal();
        }

        // Super Admin Comments Functions
        function updateSuperAdminComments() {
            const commentsTable = document.getElementById('super-admin-comments-table');
            commentsTable.innerHTML = '';
            Object.values(superAdminComments).forEach(comment => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-2">${comment.commenter}</td>
                    <td class="p-2">${comment.comment}</td>
                    <td class="p-2">${comment.date}</td>
                    <td class="p-2">
                        <button onclick="deleteSuperAdminComment(${comment.id})" class="hover:underline">Delete</button>
                    </td>
                `;
                commentsTable.appendChild(tr);
            });
        }

        function openSuperAdminCommentsModal() {
            updateSuperAdminComments();
            document.getElementById('super-admin-comments-modal').classList.remove('hidden');
            trapFocus(document.getElementById('super-admin-comments-modal'));
        }

        function closeSuperAdminCommentsModal() {
            document.getElementById('super-admin-comments-modal').classList.add('hidden');
            restoreFocus();
        }

        function deleteSuperAdminComment(commentId) {
            if (confirm('Are you sure you want to delete this comment?')) {
                logAction(`Deleted super admin comment ${commentId}`);
                delete superAdminComments[commentId];
                alert('Comment deleted');
                updateSuperAdminComments();
            }
        }

// Report Visualization Functions
let reportChart = null;

function openReportVisualizationModal() {
    const modal = document.getElementById('report-visualization-modal');
    if (!modal) {
        console.error('Report visualization modal not found.');
        return;
    }
    modal.classList.remove('hidden');
    updateReportChart();
    trapFocus(modal);
}

function closeReportVisualizationModal() {
    const modal = document.getElementById('report-visualization-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    if (reportChart) {
        reportChart.destroy();
        reportChart = null;
    }
    restoreFocus();
}

function updateReportChart() {
    const reportType = document.getElementById('report-type')?.value;
    const visualizationType = document.getElementById('visualization-type')?.value;
    const canvas = document.getElementById('report-chart');
    if (!canvas || !reportType || !visualizationType) {
        console.error('Required elements for chart rendering are missing.', {
            canvas: !!canvas,
            reportType,
            visualizationType
        });
        return;
    }
    const validChartTypes = ['bar', 'line', 'pie'];
    if (!validChartTypes.includes(visualizationType)) {
        console.error(`Invalid visualization type: ${visualizationType}. Expected one of: ${validChartTypes.join(', ')}`);
        return;
    }
    const ctx = canvas.getContext('2d');

    if (reportChart) {
        reportChart.destroy();
    }

    let data = [], labels = [], datasetLabel = '';
    const colors = {
        primary: visualizationType === 'pie' ? ['#F59E0B', '#D97706', '#92400E', '#78350F'] : '#F59E0B',
        secondary: visualizationType === 'pie' ? ['#FFD54F', '#E6BF45', '#FFB300', '#E0E0E0'] : '#D97706'
    };

    if (reportType === 'payments') {
        const paymentData = Object.values(payments).reduce((acc, p) => {
            acc[p.date] = (acc[p.date] || 0) + p.amount;
            return acc;
        }, {});
        labels = Object.keys(paymentData).sort();
        data = labels.map(date => paymentData[date]);
        datasetLabel = 'Payment Amounts (Birr)';
    } else if (reportType === 'advertisers') {
        labels = Object.values(advertisers).map(a => a.name);
        data = Object.values(advertisers).map(a => a.rating);
        datasetLabel = 'Advertiser Ratings';
    } else if (reportType === 'tutors') {
        labels = Object.values(tutors).map(t => t.name);
        data = Object.values(tutors).map(t => t.rating);
        datasetLabel = 'Tutor Ratings';
    } else if (reportType === 'users') {
        const statusCounts = Object.values(users).reduce((acc, u) => {
            const status = u.left ? 'Left' : 'Active';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        labels = Object.keys(statusCounts);
        data = Object.values(statusCounts);
        datasetLabel = 'User Status Counts';
    }

    if (!labels.length || !data.length) {
        console.warn('No data available for the selected report type.', { reportType });
        return;
    }

    const chartConfig = ```chartjs
    {
        type: "${visualizationType}",
        data: {
            labels: ${JSON.stringify(labels)},
            datasets: [{
                label: "${datasetLabel}",
                data: ${JSON.stringify(data)},
                backgroundColor: ${visualizationType === 'pie' ? JSON.stringify(colors.primary) : JSON.stringify(colors.primary)},
                borderColor: ${visualizationType === 'pie' ? JSON.stringify(colors.secondary) : JSON.stringify(colors.secondary)},
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: ${visualizationType === 'pie'},
                    labels: {
                        color: "var(--modal-text)"
                    }
                },
                title: {
                    display: true,
                    text: "${datasetLabel}",
                    color: "var(--modal-text)"
                }
            },
            scales: ${visualizationType === 'pie' ? '{}' : `{
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "var(--modal-text)"
                    },
                    grid: {
                        color: "var(--modal-input-border)"
                    }
                },
                x: {
                    ticks: {
                        color: "var(--modal-text)"
                    },
                    grid: {
                        color: "var(--modal-input-border)"
                    }
                }
            }`}
        }
    }
    ```;

    reportChart = new Chart(ctx, chartConfig);
}



// Update initDashboard to ensure Chart.js is ready
function initDashboard() {
document.getElementById('total-revenue-card')?.classList.remove('hidden');
updateSummary();
searchPayments();
updatePriceRequests();
updateReports();
updateAdmins();
checkNotifications();
updateSuperAdminComments();
// Ensure Chart.js is loaded
if (typeof Chart !== 'undefined') {
Chart.defaults.color = 'var(--modal-text)';
Chart.defaults.borderColor = 'var(--modal-input-border)';
} else {
console.warn('Chart.js is not loaded.');
}
}


// Update Summary
function updateSummary() {
    const totalAdvertisers = Object.values(advertisers).length;
    const totalCampaigns = Object.values(campaigns).length;
    const totalRevenue = Object.values(payments).reduce((sum, p) => p.status === 'Completed' ? sum + p.amount : sum, 0);
    document.getElementById('total-advertisers').textContent = totalAdvertisers;
    document.getElementById('total-campaigns').textContent = totalCampaigns;
    document.getElementById('total-revenue').textContent = `${totalRevenue} birr`;
}

// Generate Report Modal
function generatePlatformReport() {
    populateReportTables();
    document.getElementById('generate-report-modal').classList.remove('hidden');
    trapFocus(document.getElementById('generate-report-modal'));
}
function closeGenerateReportModal() {
    document.getElementById('generate-report-modal').classList.add('hidden');
    restoreFocus();
}
function populateReportTables() {
    // Payments Table
    const paymentsTable = document.getElementById('payments-table');
    paymentsTable.innerHTML = '';
    Object.values(payments).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border">${p.type}</td>
            <td class="p-2 border">${p.details}</td>
            <td class="p-2 border">${p.amount}</td>
            <td class="p-2 border">${p.status}</td>
            <td class="p-2 border">${p.date}</td>
        `;
        paymentsTable.appendChild(tr);
    });

    // Advertisers Table
    const advertisersTable = document.getElementById('advertisers-table');
    advertisersTable.innerHTML = '';
    Object.values(advertisers).forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border">${a.name}</td>
            <td class="p-2 border">${a.status}</td>
            <td class="p-2 border">${a.registered}</td>
            <td class="p-2 border">${a.left || 'N/A'}</td>
            <td class="p-2 border">${a.rating}</td>
        `;
        advertisersTable.appendChild(tr);
    });

    // Tutors Table
    const tutorsTable = document.getElementById('tutors-table');
    tutorsTable.innerHTML = '';
    Object.values(tutors).forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border">${t.name}</td>
            <td class="p-2 border">${t.status}</td>
            <td class="p-2 border">${t.registered}</td>
            <td class="p-2 border">${t.left || 'N/A'}</td>
            <td class="p-2 border">${t.rating}</td>
            <td class="p-2 border">${t.comment}</td>
        `;
        tutorsTable.appendChild(tr);
    });

    // Users Table
    const usersTable = document.getElementById('users-table');
    usersTable.innerHTML = '';
    Object.values(users).forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border">${u.type}</td>
            <td class="p-2 border">${u.email}</td>
            <td class="p-2 border">${u.left ? 'Left' : 'Active'}</td>
            <td class="p-2 border">${u.registered}</td>
            <td class="p-2 border">${u.left || 'N/A'}</td>
            <td class="p-2 border">${u.rating}</td>
            <td class="p-2 border">${u.comment}</td>
            <td class="p-2 border">${u.type === 'Student' ? (u.selfRegistered ? 'Yes' : 'No') : 'N/A'}</td>
        `;
        usersTable.appendChild(tr);
    });
}
function downloadReport(type) {
    let data = [];
    if (type === 'all' || type === 'payments') {
        data = data.concat(Object.values(payments).map(p => ({
            Type: p.type,
            Details: p.details,
            Amount: p.amount,
            Status: p.status,
            Date: p.date
        })));
    }
    if (type === 'all' || type === 'advertisers') {
        data = data.concat(Object.values(advertisers).map(a => ({
            Type: 'Advertiser',
            Details: a.name,
            Status: a.status,
            Registered: a.registered,
            Left: a.left || 'N/A',
            Rating: a.rating
        })));
    }
    if (type === 'all' || type === 'tutors') {
        data = data.concat(Object.values(tutors).map(t => ({
            Type: 'Tutor',
            Details: t.name,
            Status: t.status,
            Registered: t.registered,
            Left: t.left || 'N/A',
            Rating: t.rating,
            Comment: t.comment
        })));
    }
    if (type === 'all' || type === 'users') {
        data = data.concat(Object.values(users).map(u => ({
            Type: u.type,
            Details: u.email,
            Status: u.left ? 'Left' : 'Active',
            Registered: u.registered,
            Left: u.left || 'N/A',
            Rating: u.rating,
            Comment: u.comment,
            SelfRegistered: u.type === 'Student' ? (u.selfRegistered ? 'Yes' : 'No') : 'N/A'
        })));
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${type.charAt(0).toUpperCase() + type.slice(1)} Report`);
    XLSX.write(wb, `${type}_report.xlsx`);
    logAction(`Downloaded ${type} report`);
    alert(`Downloaded ${type} report`);
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
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show the selected tab content
    document.getElementById(tabId).classList.remove('hidden');

    // Add active class to the clicked tab button
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`).classList.add('active');
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

// Menu Toggle
document.getElementById('menu-btn').addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open');
    document.getElementById('menu-btn').setAttribute('aria-expanded', !isOpen);
});

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
    
    