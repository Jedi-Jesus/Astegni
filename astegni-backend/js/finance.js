// finance-script.js - Enhanced Finance Management Script with Fixed Analytics

// Store courses, payment details, subscription state, profile, and verification status
let courses = [];
let bankDetails = { bankName: 'Not set', accountNumber: 'Not set' };
let activeSubscriptions = {};
let profile = {
    name: 'Not set',
    gender: 'Not set',
    phone: 'Not set',
    email: 'Not set',
    bio: 'Not set',
    quote: 'Not set',
    address: 'Not set',
    school: 'Not set',
    userType: 'tutor',
    experience: '',
    certifications: '',
    achievements: '',
    businessLicenses: []
};
let verificationStatus = 'Not Verified';
let currentUnsubscribe = null;
let isAccountDeleted = false;
let pendingSchools = [];
let parentStudentRequest = { daysPerWeek: 3, hoursPerDay: 1 };
let tempProfile = null;

// Analytics chart instance
let analyticsChart = null;

// Subscription plans data
const subscriptionPlans = {
    page: [
        { duration: '1-month', price: 390, visibility: 'Standard', originalPrice: 390 },
        { duration: '3-months', price: 1000, visibility: 'Enhanced', originalPrice: 1170 },
        { duration: '6-months', price: 2000, visibility: 'Premium', originalPrice: 2360 },
        { duration: '12-months', price: 4000, visibility: 'Top Tier', originalPrice: 4680 }
    ],
    ad: [
        { duration: '24-hours', price: 300, visibility: 'Boosted', originalPrice: 300 },
        { duration: '3-days', price: 500, visibility: 'Boosted', originalPrice: 600 },
        { duration: '1-week', price: 1400, visibility: 'Boosted', originalPrice: 2100 },
        { duration: '2-weeks', price: 2500, visibility: 'Boosted', originalPrice: 4200 },
        { duration: '1-month', price: 4000, visibility: 'Premium', originalPrice: 5000 },
        { duration: '3-months', price: 12000, visibility: 'Premium', originalPrice: 15000 },
        { duration: '6-months', price: 25000, visibility: 'Premium', originalPrice: 30000 },
        { duration: '12-months', price: 50000, visibility: 'Top Tier', originalPrice: 60000 }
    ]
};

// Levenshtein distance function for typo tolerance
function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Format money with comma and no decimals
function formatMoney(amount) {
    return Math.round(amount).toLocaleString('en-US') + ' ETB';
}

// Modal Show/Hide Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Tab Navigation
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active state from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show/hide package tabs based on user type
    const setPackageBtn = document.querySelector('.tab-btn[data-tab="set-package"]');
    const viewPackageBtn = document.querySelector('.tab-btn[data-tab="view-package"]');
    
    if (profile.userType === 'tutor') {
        if (setPackageBtn) setPackageBtn.style.display = 'flex';
        if (viewPackageBtn) viewPackageBtn.style.display = 'flex';
    } else {
        if (setPackageBtn) setPackageBtn.style.display = 'none';
        if (viewPackageBtn) viewPackageBtn.style.display = 'none';
        // If trying to access package tabs as non-tutor, redirect to payment details
        if (tabId === 'set-package' || tabId === 'view-package') {
            tabId = 'payment-details';
        }
    }
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Add active state to selected button
    const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Initialize analytics chart if analytics tab is selected
    if (tabId === 'analytics') {
        setTimeout(() => {
            updateAnalyticsChart();
        }, 100);
    }
}

// Open Manage Finances Modal
function openManageFinances() {
    showModal('manageFinanceModal');
    showTab('payment-details');
}

// Track previous sensitive data for re-verification
let previousSensitiveData = {
    school: '',
    experience: '',
    certifications: '',
    achievements: '',
    businessLicenses: []
};

// Update Verification Card
function updateVerificationCard() {
    document.getElementById('tutor-name').textContent = profile.name;
    document.getElementById('tutor-gender').textContent = profile.gender;
    document.getElementById('tutor-phone').textContent = profile.phone;
    document.getElementById('tutor-email').textContent = profile.email;
    document.getElementById('tutor-bio').textContent = profile.bio;
    document.getElementById('tutor-quote').textContent = profile.quote;
    document.getElementById('tutor-address').textContent = profile.address;
    
    // Show/hide fields based on user type
    const teachesAtRow = document.getElementById('teaches-at-row');
    const businessLicenseRow = document.getElementById('business-license-row');
    
    if (profile.userType === 'tutor') {
        teachesAtRow.style.display = 'flex';
        businessLicenseRow.style.display = 'none';
        
        const mockSchools = ['Addis Ababa University', 'Unity University', 'St. Mary School', 'Hillside School'];
        const schoolDisplay = mockSchools.includes(profile.school) ? profile.school : `${profile.school} (pending)`;
        document.getElementById('tutor-school').textContent = schoolDisplay;
    } else if (profile.userType === 'business') {
        teachesAtRow.style.display = 'none';
        businessLicenseRow.style.display = 'flex';
        const licenseCount = profile.businessLicenses.length;
        document.getElementById('business-license-status').textContent = 
            licenseCount > 0 ? `${licenseCount} license(s) uploaded` : 'Not uploaded';
    } else {
        teachesAtRow.style.display = 'none';
        businessLicenseRow.style.display = 'none';
    }
    
    document.getElementById('tutor-verification-status').textContent = verificationStatus;
    
    // Check if re-verification is needed
    const getVerifiedBtn = document.getElementById('get-verified-btn');
    let needsReverification = false;
    
    if (verificationStatus === 'Verified') {
        // Check if sensitive data has changed
        if (profile.userType === 'tutor') {
            needsReverification = (
                profile.school !== previousSensitiveData.school ||
                profile.experience !== previousSensitiveData.experience ||
                profile.certifications !== previousSensitiveData.certifications ||
                profile.achievements !== previousSensitiveData.achievements
            );
        } else if (profile.userType === 'business') {
            needsReverification = (
                JSON.stringify(profile.businessLicenses) !== JSON.stringify(previousSensitiveData.businessLicenses)
            );
        }
        
        if (needsReverification) {
            getVerifiedBtn.style.display = 'inline-flex';
            getVerifiedBtn.textContent = 'Re-verify';
        } else {
            getVerifiedBtn.style.display = 'none';
        }
    } else {
        const isTutorDataNotSet = Object.values(profile).some(value => value === 'Not set');
        getVerifiedBtn.style.display = isTutorDataNotSet ? 'inline-flex' : 'none';
        getVerifiedBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Get Verified';
    }
    
    // Update status badge
    const badge = document.getElementById('verification-badge');
    if (badge) {
        badge.className = 'status-badge';
        if (verificationStatus === 'Verified' && !needsReverification) {
            badge.classList.add('status-verified');
            badge.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Verified';
        } else if (verificationStatus === 'Verified' && needsReverification) {
            badge.classList.add('status-pending');
            badge.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Re-verification Needed';
        } else if (verificationStatus === 'Under Verification') {
            badge.classList.add('status-pending');
            badge.innerHTML = '<i class="fas fa-clock mr-1"></i>Under Verification';
        } else {
            badge.classList.add('status-pending');
            badge.innerHTML = '<i class="fas fa-clock mr-1"></i>Not Verified';
        }
    }
    
    // Update tab visibility
    showTab(document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'payment-details');
}

// Save Profile
function saveProfile() {
    const name = document.getElementById('profile-name').value;
    const gender = document.getElementById('profile-gender').value;
    const phone = document.getElementById('profile-phone').value;
    const email = document.getElementById('profile-email').value;
    const bio = document.getElementById('profile-bio').value;
    const quote = document.getElementById('profile-quote').value;
    const address = document.getElementById('profile-address').value;
    const userType = document.querySelector('.user-type-btn.active').getAttribute('data-type');
    const experience = document.getElementById('profile-experience').value;
    const certifications = document.getElementById('profile-certifications').value;
    const achievements = document.getElementById('profile-achievements').value;
    const idFile = document.getElementById('id-input').files[0];

    if (!name || !gender || !phone || !email || !address) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Additional validation based on user type
    if (userType === 'tutor') {
        const school = document.getElementById('profile-school').value;
        if (!school) {
            alert('Please enter your school.');
            return;
        }
        tempProfile = { 
            name, gender, phone, email, bio, quote, address, school, userType,
            experience, certifications, achievements
        };
        
        const mockSchools = ['Addis Ababa University', 'Unity University', 'St. Mary School', 'Hillside School'];
        const isSystemSchool = mockSchools.some(s => 
            s.toLowerCase() === school.toLowerCase() || 
            levenshteinDistance(s.toLowerCase(), school.toLowerCase()) <= 2
        );
        const isPendingSchool = pendingSchools.some(s => 
            s.toLowerCase() === school.toLowerCase() || 
            levenshteinDistance(s.toLowerCase(), school.toLowerCase()) <= 2
        );
        
        if (!isSystemSchool && !isPendingSchool) {
            document.getElementById('request-school-name').value = school;
            showModal('request-school-modal');
        } else {
            // Store previous sensitive data if verified
            if (verificationStatus === 'Verified') {
                previousSensitiveData = {
                    school: profile.school,
                    experience: profile.experience,
                    certifications: profile.certifications,
                    achievements: profile.achievements,
                    businessLicenses: []
                };
            }
            
            profile = tempProfile;
            tempProfile = null;
            closeModal('edit-verify-profile-modal');
            updateVerificationCard();
            alert('Profile updated successfully!');
        }
    } else if (userType === 'business') {
        const businessLicenses = [];
        document.querySelectorAll('.business-license-input').forEach(input => {
            if (input.files[0]) {
                businessLicenses.push(input.files[0].name);
            }
        });
        
        if (businessLicenses.length === 0) {
            alert('Please upload at least one business license.');
            return;
        }
        
        // Store previous sensitive data if verified
        if (verificationStatus === 'Verified') {
            previousSensitiveData = {
                school: '',
                experience: profile.experience,
                certifications: profile.certifications,
                achievements: profile.achievements,
                businessLicenses: profile.businessLicenses
            };
        }
        
        profile = { 
            name, gender, phone, email, bio, quote, address, userType,
            experience, certifications, achievements, businessLicenses
        };
        closeModal('edit-verify-profile-modal');
        updateVerificationCard();
        alert('Profile updated successfully!');
    } else {
        profile = { name, gender, phone, email, bio, quote, address, userType };
        closeModal('edit-verify-profile-modal');
        updateVerificationCard();
        alert('Profile updated successfully!');
    }
    
    if (idFile && idFile.size > 5 * 1024 * 1024) {
        document.getElementById('id-error').classList.remove('hidden');
        return;
    }
}

// Display Courses
function displayCourses() {
    const coursesDisplay = document.getElementById('coursesDisplay');
    const daysPerWeek = parseInt(document.getElementById('days-per-week').value) || parentStudentRequest.daysPerWeek;
    const hoursPerDay = parseInt(document.getElementById('hours-per-day').value) || parentStudentRequest.hoursPerDay;
    const hoursPerWeek = daysPerWeek * hoursPerDay;

    coursesDisplay.innerHTML = '';
    if (courses.length === 0) {
        coursesDisplay.innerHTML = '<p class="no-courses-message">No packages have been set.</p>';
    } else {
        courses.forEach((course, index) => {
            const courseDiv = document.createElement('div');
            courseDiv.className = 'course-entry';
            const weeksPerCycle = course.paymentFrequency === '2-weeks' ? 2 : 4;
            const basePricePerCycle = course.hourlyRate * hoursPerWeek * weeksPerCycle;
            const priceShortTerm = basePricePerCycle * (1 - course.discount3Months / 100);
            const price3Months = basePricePerCycle * (1 - course.discount3Months / 100);
            const price6Months = basePricePerCycle * (1 - course.discount6Months / 100);
            const priceYearly = basePricePerCycle * (1 - course.discountYearly / 100);

            courseDiv.innerHTML = `
                <h4 class="course-title"><i class="fas fa-box mr-2"></i>Package ${index + 1}</h4>
                <div class="profile-details">
                    <div class="detail-row">
                        <span class="detail-label">Courses Included:</span>
                        <span class="detail-value">${course.courseName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Fee Type:</span>
                        <span class="detail-value">Hourly</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Frequency:</span>
                        <span class="detail-value">${course.paymentFrequency === '2-weeks' ? '2 Weeks' : 'Monthly'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Availability:</span>
                        <span class="detail-value">${daysPerWeek} days/week, ${hoursPerDay} hours/day (${hoursPerWeek} hours/week)</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Price (${course.paymentFrequency === '2-weeks' ? '2 Weeks' : '1 Month'}):</span>
                        <span class="detail-value">
                            ${course.discount3Months > 0 ? `<span class="old-price">${formatMoney(basePricePerCycle)}</span> ` : ''}
                            <span class="price-amount">${formatMoney(priceShortTerm)}</span>
                            ${course.discount3Months > 0 ? `<span style="color: #10B981;"> (${course.discount3Months}% off)</span>` : ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Price (3 Months):</span>
                        <span class="detail-value">
                            ${course.discount3Months > 0 ? `<span class="old-price">${formatMoney(basePricePerCycle)}</span> ` : ''}
                            <span class="price-amount">${formatMoney(price3Months)}</span>
                            ${course.discount3Months > 0 ? `<span style="color: #10B981;"> (${course.discount3Months}% off)</span>` : ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Price (6 Months):</span>
                        <span class="detail-value">
                            ${course.discount6Months > 0 ? `<span class="old-price">${formatMoney(basePricePerCycle)}</span> ` : ''}
                            <span class="price-amount">${formatMoney(price6Months)}</span>
                            ${course.discount6Months > 0 ? `<span style="color: #10B981;"> (${course.discount6Months}% off)</span>` : ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Price (Yearly):</span>
                        <span class="detail-value">
                            ${course.discountYearly > 0 ? `<span class="old-price">${formatMoney(basePricePerCycle)}</span> ` : ''}
                            <span class="price-amount">${formatMoney(priceYearly)}</span>
                            ${course.discountYearly > 0 ? `<span style="color: #10B981;"> (${course.discountYearly}% off)</span>` : ''}
                        </span>
                    </div>
                </div>
            `;
            coursesDisplay.appendChild(courseDiv);
        });
    }
    document.getElementById('displayBankName').textContent = bankDetails.bankName;
    document.getElementById('displayAccountNumber').textContent = bankDetails.accountNumber;
}

// Update Remove Buttons
function updateRemoveButtons() {
    const removeButtons = document.querySelectorAll('.remove-course-btn');
    const courseEntries = document.querySelectorAll('.course-entry');
    removeButtons.forEach((btn, index) => {
        btn.classList.toggle('hidden', courseEntries.length === 1);
        btn.onclick = () => {
            if (courseEntries.length > 1) {
                btn.closest('.course-entry').remove();
                updateRemoveButtons();
            }
        };
    });
}

// Analytics Chart Update Function (FIXED)
function updateAnalyticsChart() {
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const period = document.getElementById('analyticsPeriod').value;
    let labels, incomeData, paymentData;

    switch (period) {
        case '1-day':
            labels = ['Day 1'];
            incomeData = [7500];
            paymentData = [3000];
            break;
        case '3-days':
            labels = ['Day 1', 'Day 2', 'Day 3'];
            incomeData = [2500, 3000, 2000];
            paymentData = [1000, 1200, 800];
            break;
        case '1-week':
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            incomeData = [1000, 1200, 1100, 1300, 1400, 1100, 900];
            paymentData = [400, 500, 450, 550, 600, 400, 300];
            break;
        case '2-weeks':
            labels = Array.from({ length: 14 }, (_, i) => `Day ${i + 1}`);
            incomeData = Array(14).fill(0).map(() => Math.floor(Math.random() * 1000 + 500));
            paymentData = Array(14).fill(0).map(() => Math.floor(Math.random() * 400 + 100));
            break;
        case '1-month':
            labels = Array.from({ length: 30 }, (_, i) => i % 5 === 0 ? `Day ${i + 1}` : '');
            incomeData = Array(30).fill(0).map(() => Math.floor(Math.random() * 1000 + 500));
            paymentData = Array(30).fill(0).map(() => Math.floor(Math.random() * 400 + 100));
            break;
        case '3-months':
            labels = ['Month 1', 'Month 2', 'Month 3'];
            incomeData = [22500, 24000, 21000];
            paymentData = [9000, 9600, 8400];
            break;
        case '6-months':
            labels = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
            incomeData = [22500, 24000, 21000, 21600, 22800, 22200];
            paymentData = [9000, 9600, 8400, 8700, 9300, 9000];
            break;
        case '1-year':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            incomeData = [22500, 24000, 21000, 21600, 22800, 22200, 23400, 23700, 23100, 22500, 21900, 22200];
            paymentData = [9000, 9600, 8400, 8700, 9300, 9000, 9300, 9600, 9000, 8700, 8400, 9000];
            break;
        default:
            labels = ['Day 1'];
            incomeData = [7500];
            paymentData = [3000];
    }

    // Destroy previous chart instance if it exists
    if (analyticsChart) {
        analyticsChart.destroy();
    }

    // Create new chart
    analyticsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income (ETB)',
                    data: incomeData,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Payments (ETB)',
                    data: paymentData,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time Period'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Amount (ETB)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Initialize Event Listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    // Main button
    const manageFinanceBtn = document.getElementById('manage-finance-btn');
    if (manageFinanceBtn) {
        manageFinanceBtn.addEventListener('click', openManageFinances);
    }

    // Close modal button
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => closeModal('manageFinanceModal'));
    }

    // Payment Details Form
    const paymentDetailsForm = document.getElementById('paymentDetailsForm');
    if (paymentDetailsForm) {
        paymentDetailsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const bankName = document.getElementById('bankName').value;
            const accountNumber = document.getElementById('accountNumber').value;
            if (bankName && accountNumber) {
                bankDetails.bankName = bankName;
                bankDetails.accountNumber = accountNumber;
                alert('Payment details saved successfully!');
                if (document.getElementById('samePaymentDetails').checked) {
                    document.getElementById('updateBankName').value = bankName;
                    document.getElementById('updateAccountNumber').value = accountNumber;
                }
                displayCourses();
            } else {
                alert('Please fill in all payment details.');
            }
        });
    }

    // Get Verified Button
    const getVerifiedBtn = document.getElementById('get-verified-btn');
    if (getVerifiedBtn) {
        getVerifiedBtn.addEventListener('click', () => {
            if (!bankDetails.bankName || bankDetails.bankName === 'Not set' || 
                !bankDetails.accountNumber || bankDetails.accountNumber === 'Not set') {
                alert('Please fill in all required data first. Set your payment details in the Payment Details tab.');
                return;
            }

            const idFile = document.getElementById('id-input')?.files[0];
            const faceScanStatus = document.getElementById('face-scan-status')?.textContent;
            
            // Check based on user type
            if (profile.userType === 'tutor') {
                if (!profile.name || profile.name === 'Not set' || 
                    !profile.gender || profile.gender === 'Not set' || 
                    !profile.phone || profile.phone === 'Not set' || 
                    !profile.email || profile.email === 'Not set' || 
                    !profile.address || profile.address === 'Not set' || 
                    !profile.school || profile.school === 'Not set' ||
                    !profile.experience || !profile.certifications || !profile.achievements ||
                    !idFile || faceScanStatus !== 'Selfie captured successfully!') {
                    alert('Please fill in all required data first. Complete your profile including experience, certifications, achievements, upload an ID document, and capture a selfie in the Edit Profile section.');
                    return;
                }
            } else if (profile.userType === 'business') {
                if (!profile.name || profile.name === 'Not set' || 
                    !profile.gender || profile.gender === 'Not set' || 
                    !profile.phone || profile.phone === 'Not set' || 
                    !profile.email || profile.email === 'Not set' || 
                    !profile.address || profile.address === 'Not set' || 
                    !profile.businessLicenses || profile.businessLicenses.length === 0 ||
                    !profile.experience || !profile.certifications || !profile.achievements ||
                    !idFile || faceScanStatus !== 'Selfie captured successfully!') {
                    alert('Please fill in all required data first. Complete your profile including experience, certifications, achievements, upload business license(s), ID document, and capture a selfie in the Edit Profile section.');
                    return;
                }
            } else {
                if (!profile.name || profile.name === 'Not set' || 
                    !profile.gender || profile.gender === 'Not set' || 
                    !profile.phone || profile.phone === 'Not set' || 
                    !profile.email || profile.email === 'Not set' || 
                    !profile.address || profile.address === 'Not set' || 
                    !idFile || faceScanStatus !== 'Selfie captured successfully!') {
                    alert('Please fill in all required data first. Complete your profile, upload an ID document, and capture a selfie in the Edit Profile section.');
                    return;
                }
            }

            // Store current sensitive data
            if (profile.userType === 'tutor') {
                previousSensitiveData = {
                    school: profile.school,
                    experience: profile.experience,
                    certifications: profile.certifications,
                    achievements: profile.achievements,
                    businessLicenses: []
                };
            } else if (profile.userType === 'business') {
                previousSensitiveData = {
                    school: '',
                    experience: profile.experience,
                    certifications: profile.certifications,
                    achievements: profile.achievements,
                    businessLicenses: [...profile.businessLicenses]
                };
            }

            verificationStatus = 'Under Verification';
            updateVerificationCard();
            alert('Verification request submitted! Your profile is now under verification.');
            
            // Simulate verification completion after 3 seconds
            setTimeout(() => {
                verificationStatus = 'Verified';
                updateVerificationCard();
                alert('Congratulations! Your profile has been verified.');
            }, 3000);
        });
    }

    // Edit Profile Button
    const editProfileBtn = document.getElementById('edit-verify-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            document.getElementById('profile-name').value = profile.name !== 'Not set' ? profile.name : '';
            document.getElementById('profile-gender').value = profile.gender !== 'Not set' ? profile.gender : '';
            document.getElementById('profile-phone').value = profile.phone !== 'Not set' ? profile.phone : '';
            document.getElementById('profile-email').value = profile.email !== 'Not set' ? profile.email : '';
            document.getElementById('profile-bio').value = profile.bio !== 'Not set' ? profile.bio : '';
            document.getElementById('profile-quote').value = profile.quote !== 'Not set' ? profile.quote : '';
            document.getElementById('profile-address').value = profile.address !== 'Not set' ? profile.address : '';
            document.getElementById('profile-school').value = profile.school !== 'Not set' ? profile.school : '';
            document.getElementById('profile-experience').value = profile.experience || '';
            document.getElementById('profile-certifications').value = profile.certifications || '';
            document.getElementById('profile-achievements').value = profile.achievements || '';
            document.getElementById('face-scan-status').textContent = 'No selfie captured.';
            document.getElementById('id-preview').innerHTML = '';
            
            // Set user type buttons
            document.querySelectorAll('.user-type-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-type') === profile.userType) {
                    btn.classList.add('active');
                }
            });
            
            // Show/hide fields based on user type
            updateProfileFields(profile.userType);
            
            showModal('edit-verify-profile-modal');
        });
    }

    // Add Business License Button
    const addBusinessLicenseBtn = document.getElementById('add-business-license-btn');
    if (addBusinessLicenseBtn) {
        addBusinessLicenseBtn.addEventListener('click', () => {
            const container = document.getElementById('business-licenses-container');
            const newLicenseItem = document.createElement('div');
            newLicenseItem.className = 'business-license-item';
            newLicenseItem.innerHTML = `
                <input type="file" class="business-license-input form-file" accept="image/*,application/pdf">
                <button type="button" class="remove-license-btn btn-icon">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(newLicenseItem);
            
            // Update remove buttons visibility
            updateBusinessLicenseButtons();
            
            // Add remove handler
            newLicenseItem.querySelector('.remove-license-btn').addEventListener('click', function() {
                newLicenseItem.remove();
                updateBusinessLicenseButtons();
            });
        });
    }

    // Function to update business license remove buttons
    function updateBusinessLicenseButtons() {
        const licenseItems = document.querySelectorAll('.business-license-item');
        licenseItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-license-btn');
            if (removeBtn) {
                if (licenseItems.length === 1) {
                    removeBtn.classList.add('hidden');
                } else {
                    removeBtn.classList.remove('hidden');
                }
            }
        });
    }

    // User Type Button Handling
    function updateProfileFields(userType) {
        const teachesAtField = document.getElementById('teaches-at-field');
        const experienceField = document.getElementById('experience-field');
        const certificationsField = document.getElementById('certifications-field');
        const achievementsField = document.getElementById('achievements-field');
        const businessLicenseField = document.getElementById('business-license-field');
        
        if (userType === 'tutor') {
            teachesAtField.style.display = 'block';
            experienceField.style.display = 'block';
            certificationsField.style.display = 'block';
            achievementsField.style.display = 'block';
            businessLicenseField.classList.add('hidden');
        } else if (userType === 'business') {
            teachesAtField.style.display = 'none';
            experienceField.style.display = 'block';
            certificationsField.style.display = 'block';
            achievementsField.style.display = 'block';
            businessLicenseField.classList.remove('hidden');
        } else {
            teachesAtField.style.display = 'none';
            experienceField.style.display = 'none';
            certificationsField.style.display = 'none';
            achievementsField.style.display = 'none';
            businessLicenseField.classList.add('hidden');
        }
    }

    // Add user type button event listeners
    document.querySelectorAll('.user-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.user-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const userType = this.getAttribute('data-type');
            updateProfileFields(userType);
        });
    });

    // Save Profile Button
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    // Cancel Profile Button
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', () => closeModal('edit-verify-profile-modal'));
    }

    // School Search
    const profileSchool = document.getElementById('profile-school');
    if (profileSchool) {
        profileSchool.addEventListener('input', (e) => {
            const input = e.target.value.toLowerCase();
            const suggestionsContainer = document.getElementById('school-suggestions');
            const mockSchools = ['Addis Ababa University', 'Unity University', 'St. Mary School', 'Hillside School'];
            suggestionsContainer.innerHTML = '';
            const requestSchoolBtn = document.getElementById('request-school-btn');
            requestSchoolBtn.classList.add('hidden');

            if (input) {
                const filteredSchools = mockSchools.filter(school =>
                    school.toLowerCase().includes(input) || levenshteinDistance(school.toLowerCase(), input) <= 2
                );
                if (filteredSchools.length > 0) {
                    filteredSchools.forEach(school => {
                        const div = document.createElement('div');
                        div.textContent = school;
                        div.onclick = () => {
                            document.getElementById('profile-school').value = school;
                            suggestionsContainer.classList.add('hidden');
                        };
                        suggestionsContainer.appendChild(div);
                    });
                    suggestionsContainer.classList.remove('hidden');
                } else {
                    suggestionsContainer.classList.add('hidden');
                    requestSchoolBtn.classList.remove('hidden');
                }
            } else {
                suggestionsContainer.classList.add('hidden');
            }
        });
    }

    // Request School Button
    const requestSchoolBtn = document.getElementById('request-school-btn');
    if (requestSchoolBtn) {
        requestSchoolBtn.addEventListener('click', () => {
            document.getElementById('request-school-name').value = document.getElementById('profile-school').value;
            showModal('request-school-modal');
        });
    }

    // Submit School Request
    const submitSchoolRequestBtn = document.getElementById('submitSchoolRequestBtn');
    if (submitSchoolRequestBtn) {
        submitSchoolRequestBtn.addEventListener('click', () => {
            const schoolName = document.getElementById('request-school-name').value;
            const phone = document.getElementById('request-school-phone').value;
            const email = document.getElementById('request-school-email').value;
            const location = document.getElementById('request-school-location').value;

            if (!schoolName || !phone || !email || !location) {
                alert('Please fill in all required fields.');
                return;
            }

            pendingSchools.push(schoolName);
            closeModal('request-school-modal');
            if (tempProfile) {
                // Store previous sensitive data if verified
                if (verificationStatus === 'Verified') {
                    previousSensitiveData = {
                        school: profile.school,
                        experience: profile.experience,
                        certifications: profile.certifications,
                        achievements: profile.achievements,
                        businessLicenses: []
                    };
                }
                
                profile = tempProfile;
                tempProfile = null;
                closeModal('edit-verify-profile-modal');
                updateVerificationCard();
                alert('Profile updated and school request submitted successfully!');
            } else {
                alert('School request submitted successfully!');
            }
        });
    }

    // Cancel School Request
    const cancelSchoolRequestBtn = document.getElementById('cancelSchoolRequestBtn');
    if (cancelSchoolRequestBtn) {
        cancelSchoolRequestBtn.addEventListener('click', () => {
            closeModal('request-school-modal');
            if (tempProfile) {
                const currentSchool = profile.school !== 'Not set' ? profile.school : '';
                document.getElementById('profile-school').value = currentSchool;
                tempProfile = null;
            }
        });
    }

    // Use My Location
    const useLocationBtn = document.getElementById('use-my-location');
    if (useLocationBtn) {
        useLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        document.getElementById('profile-address').value = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
                        document.getElementById('location-error').classList.add('hidden');
                    },
                    () => {
                        document.getElementById('location-error').classList.remove('hidden');
                    }
                );
            } else {
                document.getElementById('location-error').classList.remove('hidden');
            }
        });
    }

    // ID File Upload
    const idInput = document.getElementById('id-input');
    if (idInput) {
        idInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const idError = document.getElementById('id-error');
            const idPreview = document.getElementById('id-preview');
            idPreview.innerHTML = '';
            idError.classList.add('hidden');

            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    idError.classList.remove('hidden');
                    return;
                }
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    idPreview.appendChild(img);
                } else if (file.type === 'application/pdf') {
                    idPreview.innerHTML = `<p>Uploaded PDF: ${file.name}</p>`;
                }
            }
        });
    }

    // Face Scan
    const faceScanBtn = document.getElementById('face-scan-btn');
    if (faceScanBtn) {
        faceScanBtn.addEventListener('click', () => {
            document.getElementById('face-scan-status').textContent = 'Selfie captured successfully!';
        });
    }

    // Add Package Button (formerly Add Course)
    const addPackageBtn = document.getElementById('addCourseBtn');
    if (addPackageBtn) {
        addPackageBtn.addEventListener('click', () => {
            const coursesContainer = document.getElementById('coursesContainer');
            const packageTemplate = document.createElement('div');
            packageTemplate.className = 'course-entry';
            packageTemplate.innerHTML = `
                <div class="course-header">
                    <h4 class="course-title"><i class="fas fa-box mr-2"></i>Package</h4>
                    <button type="button" class="remove-course-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="package-layout">
                    <div class="form-group full-width">
                        <label class="form-label">
                            <i class="fas fa-plus-circle mr-1"></i>Course Names (Add multiple courses)
                        </label>
                        <div class="courses-list-container">
                            <div class="course-name-group">
                                <input type="text" class="course-name form-input" placeholder="Enter course name">
                                <button type="button" class="add-course-to-package btn-icon">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="added-courses-list"></div>
                        </div>
                    </div>
                    <div class="payment-row">
                        <div class="form-group">
                            <label class="form-label">Payment Frequency</label>
                            <select class="payment-frequency form-select" required>
                                <option value="2-weeks">2 Weeks</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Hourly Rate (ETB)</label>
                            <input type="number" class="hourly-rate form-input" placeholder="Enter hourly rate" min="0" required>
                        </div>
                        <div class="form-group discount-group">
                            <label class="form-label">Discounts (%)</label>
                            <div class="discount-grid">
                                <input type="number" class="discount-3months form-input" placeholder="3M" min="0" max="100">
                                <input type="number" class="discount-6months form-input" placeholder="6M" min="0" max="100">
                                <input type="number" class="discount-yearly form-input" placeholder="1Y" min="0" max="100">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            coursesContainer.appendChild(packageTemplate);
            updateRemoveButtons();
            initializePackageCourseHandlers(packageTemplate);
        });
    }

    // Initialize handlers for adding courses to package
    function initializePackageCourseHandlers(packageElement) {
        const addCourseBtn = packageElement.querySelector('.add-course-to-package');
        const courseInput = packageElement.querySelector('.course-name');
        const coursesList = packageElement.querySelector('.added-courses-list');
        
        if (addCourseBtn) {
            addCourseBtn.addEventListener('click', () => {
                const courseName = courseInput.value.trim();
                if (courseName) {
                    const courseItem = document.createElement('div');
                    courseItem.className = 'added-course-item';
                    courseItem.innerHTML = `
                        <span>${courseName}</span>
                        <button type="button" class="remove-course-item">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    coursesList.appendChild(courseItem);
                    courseInput.value = '';
                    
                    // Add remove handler
                    courseItem.querySelector('.remove-course-item').addEventListener('click', () => {
                        courseItem.remove();
                    });
                }
            });
        }
    }

    // Initialize handlers for existing package
    document.querySelectorAll('.course-entry').forEach(packageElement => {
        initializePackageCourseHandlers(packageElement);
    });

    // Set Package Form
    const setPackageForm = document.getElementById('setPackageForm');
    if (setPackageForm) {
        setPackageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const packageEntries = document.querySelectorAll('#coursesContainer .course-entry');
            let valid = true;
            courses = [];
            
            packageEntries.forEach((entry, index) => {
                // Get all courses in this package
                const packageCourses = [];
                
                // Add all courses from the list
                const addedCourses = entry.querySelectorAll('.added-courses-list .added-course-item span');
                addedCourses.forEach(courseSpan => {
                    packageCourses.push(courseSpan.textContent);
                });
                
                // Include the course in the input field if it hasn't been added to the list
                const mainCourseInput = entry.querySelector('.course-name');
                if (mainCourseInput && mainCourseInput.value.trim()) {
                    packageCourses.push(mainCourseInput.value.trim());
                }
                
                if (packageCourses.length === 0) {
                    alert(`Please add at least one course to Package ${index + 1}.`);
                    valid = false;
                    return;
                }
                
                const paymentFrequency = entry.querySelector('.payment-frequency').value;
                const hourlyRate = parseFloat(entry.querySelector('.hourly-rate').value);
                const discount3Months = parseFloat(entry.querySelector('.discount-3months').value) || 0;
                const discount6Months = parseFloat(entry.querySelector('.discount-6months').value) || 0;
                const discountYearly = parseFloat(entry.querySelector('.discount-yearly').value) || 0;

                if (isNaN(hourlyRate) || hourlyRate <= 0) {
                    alert(`Please enter a valid hourly rate for Package ${index + 1}.`);
                    valid = false;
                    return;
                }
                
                if (discount3Months < 0 || discount3Months > 100 ||
                    discount6Months < 0 || discount6Months > 100 ||
                    discountYearly < 0 || discountYearly > 100) {
                    alert(`Please enter valid discount percentages (0-100) for Package ${index + 1}.`);
                    valid = false;
                    return;
                }
                
                courses.push({
                    courseName: packageCourses.join(', '), // Join all course names
                    coursesList: packageCourses, // Keep array for reference
                    feeType: 'hourly',
                    paymentFrequency,
                    hourlyRate,
                    discount3Months,
                    discount6Months,
                    discountYearly
                });
            });
            
            if (valid && courses.length > 0) {
                const updateBankName = document.getElementById('updateBankName').value;
                const updateAccountNumber = document.getElementById('updateAccountNumber').value;
                
                if (updateBankName) {
                    bankDetails.bankName = updateBankName;
                }
                if (updateAccountNumber) {
                    bankDetails.accountNumber = updateAccountNumber;
                }
                
                alert('Packages updated successfully!');
                displayCourses();
            }
        });
    }

    // Same Payment Details Checkbox
    const samePaymentDetails = document.getElementById('samePaymentDetails');
    if (samePaymentDetails) {
        samePaymentDetails.addEventListener('change', (e) => {
            const bankName = document.getElementById('bankName').value;
            const accountNumber = document.getElementById('accountNumber').value;
            const updateBankName = document.getElementById('updateBankName');
            const updateAccountNumber = document.getElementById('updateAccountNumber');
            if (e.target.checked) {
                updateBankName.value = bankName;
                updateAccountNumber.value = accountNumber;
                updateBankName.disabled = true;
                updateAccountNumber.disabled = true;
            } else {
                updateBankName.disabled = false;
                updateAccountNumber.disabled = false;
            }
        });
    }

    // Calculate Fees Button
    const calculateFeesBtn = document.getElementById('calculate-fees');
    if (calculateFeesBtn) {
        calculateFeesBtn.addEventListener('click', () => {
            const daysPerWeek = parseInt(document.getElementById('days-per-week').value);
            const hoursPerDay = parseInt(document.getElementById('hours-per-day').value);
            if (isNaN(daysPerWeek) || isNaN(hoursPerDay) || 
                daysPerWeek < 1 || daysPerWeek > 7 || 
                hoursPerDay < 1 || hoursPerDay > 24) {
                alert('Please enter valid values for days per week (1-7) and hours per day (1-24).');
                return;
            }
            parentStudentRequest = { daysPerWeek, hoursPerDay };
            displayCourses();
        });
    }

    // Toggle Income Visibility
    const toggleIncome = document.getElementById('toggleIncome');
    if (toggleIncome) {
        toggleIncome.addEventListener('click', () => {
            const totalIncome = document.getElementById('totalIncome');
            totalIncome.textContent = totalIncome.textContent.includes('★★★') ? 
                'Total Income: 7500 ETB' : 'Total Income: ★★★';
        });
    }

    // Analytics Period Change
    const analyticsPeriod = document.getElementById('analyticsPeriod');
    if (analyticsPeriod) {
        analyticsPeriod.addEventListener('change', updateAnalyticsChart);
    }

    // Subscription Buttons
    document.querySelectorAll('.subscribe-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (verificationStatus !== 'Verified') {
                alert('You must be verified to subscribe to a plan. Please complete verification in the Edit Profile section.');
                return;
            }

            const price = parseFloat(button.getAttribute('data-price'));
            const type = button.getAttribute('data-type');
            const duration = button.getAttribute('data-duration');
            
            // Check if already subscribed
            if (button.textContent === 'Switch Plan') {
                // Open switch plan modal
                openSwitchPlanModal(type, duration);
            } else {
                // Subscribe to plan
                button.textContent = 'Switch Plan';
                button.classList.add('active');
                const cancelBtn = button.parentElement.querySelector('.cancel-btn');
                if (cancelBtn) cancelBtn.classList.remove('hidden');
                
                activeSubscriptions[type] = { duration, price };
                alert(`Subscribed to ${type} plan for ${duration} at ${price} ETB!`);
            }
        });
    });

    // Function to open switch plan modal
    function openSwitchPlanModal(currentType, currentDuration) {
        const modal = document.getElementById('manageSubscriptionModal');
        const optionsContainer = document.getElementById('subscriptionOptions');
        optionsContainer.innerHTML = '';
        
        // Combine both standard and premium plans
        const allPlans = {
            'Standard Plans': subscriptionPlans.page,
            'Premium Plans': subscriptionPlans.ad
        };
        
        Object.entries(allPlans).forEach(([planCategory, plans]) => {
            // Add category header
            const categoryHeader = document.createElement('h4');
            categoryHeader.className = 'text-lg font-semibold mb-3 text-gray-700';
            categoryHeader.textContent = planCategory;
            optionsContainer.appendChild(categoryHeader);
            
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'grid grid-cols-2 gap-3 mb-4';
            
            plans.forEach(plan => {
                // Skip current plan
                const planType = planCategory === 'Standard Plans' ? 'page' : 'ad';
                if (planType === currentType && plan.duration === currentDuration) {
                    return;
                }
                
                const planDiv = document.createElement('div');
                planDiv.className = 'subscription-card p-4';
                planDiv.innerHTML = `
                    <h5 class="subscription-title text-sm">${plan.duration.replace('-', ' ')}</h5>
                    <div class="subscription-price">
                        ${plan.originalPrice !== plan.price ? 
                            `<span class="old-price text-xs">${formatMoney(plan.originalPrice)}</span>` : ''}
                        <span class="price text-lg">${formatMoney(plan.price)}</span>
                    </div>
                    <ul class="subscription-features text-xs mt-2">
                        <li><i class="fas fa-check text-green-500"></i>${plan.visibility} Visibility</li>
                    </ul>
                    <button class="switch-to-plan-btn btn-primary text-sm mt-2 w-full" 
                            data-type="${planType}" 
                            data-duration="${plan.duration}" 
                            data-price="${plan.price}">
                        Switch to This Plan
                    </button>
                `;
                categoryContainer.appendChild(planDiv);
            });
            
            optionsContainer.appendChild(categoryContainer);
        });
        
        // Add event listeners for switch buttons
        document.querySelectorAll('.switch-to-plan-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const newType = this.getAttribute('data-type');
                const newDuration = this.getAttribute('data-duration');
                const newPrice = parseFloat(this.getAttribute('data-price'));
                
                // Reset all subscription buttons
                document.querySelectorAll('.subscribe-btn').forEach(subBtn => {
                    subBtn.textContent = 'Subscribe';
                    subBtn.classList.remove('active');
                    const cancelBtn = subBtn.parentElement.querySelector('.cancel-btn');
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                });
                
                // Activate the new plan button
                const newPlanBtn = document.querySelector(`.subscribe-btn[data-type="${newType}"][data-duration="${newDuration}"]`);
                if (newPlanBtn) {
                    newPlanBtn.textContent = 'Switch Plan';
                    newPlanBtn.classList.add('active');
                    const cancelBtn = newPlanBtn.parentElement.querySelector('.cancel-btn');
                    if (cancelBtn) cancelBtn.classList.remove('hidden');
                }
                
                // Clear old subscriptions and add new one
                activeSubscriptions = {};
                activeSubscriptions[newType] = { duration: newDuration, price: newPrice };
                
                const planTypeText = newType === 'page' ? 'Standard' : 'Premium';
                alert(`Successfully switched to ${planTypeText} plan for ${newDuration.replace('-', ' ')} at ${formatMoney(newPrice)}!`);
                closeModal('manageSubscriptionModal');
            });
        });
        
        showModal('manageSubscriptionModal');
    }

    // Cancel Subscription Buttons
    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', () => {
            const price = parseFloat(button.getAttribute('data-price'));
            const type = button.getAttribute('data-type');
            const duration = button.getAttribute('data-duration');
            currentUnsubscribe = { button, price, type, duration };
            showModal('unsubscribeModal1');
        });
    });

    // Unsubscribe Flow
    const unsubscribeOther = document.getElementById('unsubscribeOther');
    if (unsubscribeOther) {
        unsubscribeOther.addEventListener('change', (e) => {
            document.getElementById('otherText').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    // All unsubscribe modal buttons
    const unsubscribeSubmitBtn = document.getElementById('unsubscribeSubmitBtn');
    if (unsubscribeSubmitBtn) {
        unsubscribeSubmitBtn.addEventListener('click', () => {
            const reasons = Array.from(document.querySelectorAll('input[name="unsubscribeReason"]:checked')).map(input => input.value);
            const otherText = document.getElementById('otherText').value;
            if (reasons.length === 0) {
                alert('Please select at least one reason.');
                return;
            }
            if (reasons.includes('other') && !otherText) {
                alert('Please specify the reason for "Other".');
                return;
            }
            closeModal('unsubscribeModal1');
            document.getElementById('unsubscribeFirstConfirmText').textContent = 
                `This decision will deactivate your ${currentUnsubscribe.type} subscription for ${currentUnsubscribe.duration}.`;
            showModal('unsubscribeConfirm1');
        });
    }

    // Unsubscribe cancel buttons
    ['unsubscribeCancelBtn1', 'unsubscribeCancelBtn2', 'unsubscribeCancelBtn3', 'unsubscribeCancelBtn4'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                closeModal(btn.closest('.modal').id);
                currentUnsubscribe = null;
            });
        }
    });

    // Unsubscribe Yes buttons
    const unsubscribeYesBtn1 = document.getElementById('unsubscribeYesBtn1');
    if (unsubscribeYesBtn1) {
        unsubscribeYesBtn1.addEventListener('click', () => {
            closeModal('unsubscribeConfirm1');
            const fee = currentUnsubscribe.price * 0.05;
            document.getElementById('unsubscribeSecondConfirmText').textContent = 
                `Subscription cancellation has a fee of 5% (${fee.toFixed(2)} ETB). Are you still sure to cancel subscription?`;
            showModal('unsubscribeConfirm2');
        });
    }

    const unsubscribeYesBtn2 = document.getElementById('unsubscribeYesBtn2');
    if (unsubscribeYesBtn2) {
        unsubscribeYesBtn2.addEventListener('click', () => {
            closeModal('unsubscribeConfirm2');
            showModal('unsubscribePasswordModal');
        });
    }

    const unsubscribeSubmitPasswordBtn = document.getElementById('unsubscribeSubmitPasswordBtn');
    if (unsubscribeSubmitPasswordBtn) {
        unsubscribeSubmitPasswordBtn.addEventListener('click', () => {
            const password = document.getElementById('unsubscribePassword').value;
            if (!password) {
                alert('Please enter your password.');
                return;
            }
            if (password === 'password123') {
                closeModal('unsubscribePasswordModal');
                const subscribeBtn = document.querySelector(`.subscribe-btn[data-type="${currentUnsubscribe.type}"][data-duration="${currentUnsubscribe.duration}"]`);
                if (subscribeBtn) {
                    subscribeBtn.textContent = 'Subscribe';
                    subscribeBtn.classList.remove('active');
                }
                currentUnsubscribe.button.classList.add('hidden');
                delete activeSubscriptions[currentUnsubscribe.type];
                showModal('unsubscribeModal3');
                currentUnsubscribe = null;
            } else {
                alert('Incorrect password.');
            }
        });
    }

    const unsubscribeCloseBtn = document.getElementById('unsubscribeCloseBtn');
    if (unsubscribeCloseBtn) {
        unsubscribeCloseBtn.addEventListener('click', () => closeModal('unsubscribeModal3'));
    }

    // Leave Astegni Button
    const leaveAstegniBtn = document.getElementById('leaveAstegniBtn');
    if (leaveAstegniBtn) {
        leaveAstegniBtn.addEventListener('click', () => {
            if (isAccountDeleted) {
                alert('Your account is already deleted.');
                return;
            }
            showModal('deleteModal1');
        });
    }

    // Delete flow - similar to unsubscribe
    const deleteOther = document.getElementById('deleteOther');
    if (deleteOther) {
        deleteOther.addEventListener('change', (e) => {
            document.getElementById('otherTextDelete').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    // Delete modal buttons
    const deleteSubmitBtn = document.getElementById('deleteSubmitBtn');
    if (deleteSubmitBtn) {
        deleteSubmitBtn.addEventListener('click', () => {
            const reasons = Array.from(document.querySelectorAll('input[name="deleteReason"]:checked')).map(input => input.value);
            const otherText = document.getElementById('otherTextDelete').value;
            if (reasons.length === 0) {
                alert('Please select at least one reason.');
                return;
            }
            if (reasons.includes('other') && !otherText) {
                alert('Please specify the reason for "Other".');
                return;
            }
            closeModal('deleteModal1');
            const verificationFee = verificationStatus === 'Verified' ? 990 * 0.15 : 0;
            document.getElementById('deleteVerifyText').textContent = 
                `This decision will unverify and deactivate your account. A 15% verification fee (${verificationFee.toFixed(2)} ETB) will be charged if applicable.`;
            showModal('deleteVerifyModal');
        });
    }

    // Delete cancel buttons
    ['deleteCancelBtn1', 'deleteCancelBtn2', 'deleteCancelBtn3', 'deleteCancelBtn4'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => closeModal(btn.closest('.modal').id));
        }
    });

    const deleteYesBtn = document.getElementById('deleteYesBtn');
    if (deleteYesBtn) {
        deleteYesBtn.addEventListener('click', () => {
            closeModal('deleteVerifyModal');
            if (Object.keys(activeSubscriptions).length > 0) {
                showModal('deleteSubscriptionCheckModal');
            } else {
                showModal('deleteConfirm2');
            }
        });
    }

    const deleteSubmitPasswordBtn = document.getElementById('deleteSubmitPasswordBtn');
    if (deleteSubmitPasswordBtn) {
        deleteSubmitPasswordBtn.addEventListener('click', () => {
            const password = document.getElementById('deletePassword').value;
            if (!password) {
                alert('Please enter your password.');
                return;
            }
            if (password === 'password123') {
                closeModal('deleteConfirm2');
                isAccountDeleted = true;
                verificationStatus = 'Not Verified';
                activeSubscriptions = {};
                profile = {
                    name: 'Not set',
                    gender: 'Not set',
                    phone: 'Not set',
                    email: 'Not set',
                    quote: 'Not set',
                    address: 'Not set',
                    school: 'Not set'
                };
                updateVerificationCard();
                showModal('deleteModal3');
            } else {
                alert('Incorrect password.');
            }
        });
    }

    const deleteCloseBtn = document.getElementById('deleteCloseBtn');
    if (deleteCloseBtn) {
        deleteCloseBtn.addEventListener('click', () => closeModal('deleteModal3'));
    }

    const closeManageModal = document.getElementById('closeManageModal');
    if (closeManageModal) {
        closeManageModal.addEventListener('click', () => closeModal('manageSubscriptionModal'));
    }

    // Initialize
    updateRemoveButtons();
    updateVerificationCard();
    displayCourses();
    
    // Initialize business license remove button
    const initialRemoveLicenseBtn = document.querySelector('.remove-license-btn');
    if (initialRemoveLicenseBtn) {
        initialRemoveLicenseBtn.addEventListener('click', function() {
            const licenseItem = this.closest('.business-license-item');
            if (licenseItem && document.querySelectorAll('.business-license-item').length > 1) {
                licenseItem.remove();
                updateBusinessLicenseButtons();
            }
        });
        updateBusinessLicenseButtons();
    }
    
    // Initialize favorite buttons
    document.querySelectorAll('.btn-favorite').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('i');
            if (this.classList.contains('active')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        });
    });

    // Add smooth scrolling for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Add theme toggle functionality if needed
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);

    // Add keyboard navigation for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close all open modals
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'flex') {
                    modal.style.display = 'none';
                }
            });
        }
    });

    // Add loading states for async operations
    function showLoading(button) {
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        return originalText;
    }

    function hideLoading(button, originalText) {
        button.disabled = false;
        button.innerHTML = originalText;
    }

    // Enhanced form validation
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validatePhone(phone) {
        const re = /^\+?[0-9]{10,15}$/;
        return re.test(phone.replace(/\s/g, ''));
    }

    // Add input validation feedback
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                this.classList.add('border-red-500');
                this.classList.remove('border-green-500');
            } else if (this.value) {
                this.classList.add('border-green-500');
                this.classList.remove('border-red-500');
            }
        });
    });

    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validatePhone(this.value)) {
                this.classList.add('border-red-500');
                this.classList.remove('border-green-500');
            } else if (this.value) {
                this.classList.add('border-green-500');
                this.classList.remove('border-red-500');
            }
        });
    });

    // Add tooltips for help text
    function addTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(tooltip);

        element.addEventListener('mouseenter', (e) => {
            tooltip.style.display = 'block';
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
        });

        element.addEventListener('mousemove', (e) => {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
        });

        element.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }

    // Add confirmation dialogs for critical actions
    function confirmAction(message, callback) {
        const result = confirm(message);
        if (result) {
            callback();
        }
    }

    // Export data functionality
    function exportData() {
        const data = {
            profile,
            bankDetails,
            courses,
            activeSubscriptions,
            verificationStatus
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'finance_data_export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Import data functionality
    function importData(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.profile) profile = data.profile;
                if (data.bankDetails) bankDetails = data.bankDetails;
                if (data.courses) courses = data.courses;
                if (data.activeSubscriptions) activeSubscriptions = data.activeSubscriptions;
                if (data.verificationStatus) verificationStatus = data.verificationStatus;
                
                updateVerificationCard();
                displayCourses();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    // Auto-save functionality
    function autoSave() {
        const data = {
            profile,
            bankDetails,
            courses,
            activeSubscriptions,
            verificationStatus
        };
        localStorage.setItem('financeData', JSON.stringify(data));
    }

    // Load saved data on page load
    function loadSavedData() {
        const savedData = localStorage.getItem('financeData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (data.profile) profile = data.profile;
                if (data.bankDetails) bankDetails = data.bankDetails;
                if (data.courses) courses = data.courses;
                if (data.activeSubscriptions) activeSubscriptions = data.activeSubscriptions;
                if (data.verificationStatus) verificationStatus = data.verificationStatus;
                
                updateVerificationCard();
                displayCourses();
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        }
    }

    // Auto-save every 30 seconds
    setInterval(autoSave, 30000);

    // Load saved data on initialization
    loadSavedData();

    // Print functionality for invoices
    function printInvoice(invoiceData) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #F59E0B; }
                        .invoice-header { border-bottom: 2px solid #F59E0B; padding-bottom: 10px; margin-bottom: 20px; }
                        .invoice-details { margin-bottom: 20px; }
                        .invoice-table { width: 100%; border-collapse: collapse; }
                        .invoice-table th, .invoice-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                        .invoice-total { font-size: 1.2em; font-weight: bold; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="invoice-header">
                        <h1>Invoice</h1>
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="invoice-details">
                        <p><strong>From:</strong> ${profile.name}</p>
                        <p><strong>Email:</strong> ${profile.email}</p>
                        <p><strong>Phone:</strong> ${profile.phone}</p>
                    </div>
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceData.items.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${item.amount} ETB</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="invoice-total">
                        Total: ${invoiceData.total} ETB
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    // Add notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        switch(type) {
            case 'success':
                notification.style.background = '#10B981';
                break;
            case 'error':
                notification.style.background = '#EF4444';
                break;
            case 'warning':
                notification.style.background = '#F59E0B';
                break;
            default:
                notification.style.background = '#3B82F6';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Replace alerts with notifications
    const originalAlert = window.alert;
    window.alert = function(message) {
        showNotification(message, 'info');
    };

    console.log('Finance Management System initialized successfully!');
});