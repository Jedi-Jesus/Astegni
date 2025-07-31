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
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.querySelector('svg').innerHTML = icon;
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon}</svg>`;
}

// Data Objects
const parent = {
    id: 1,
    name: 'Mulugeta Alemu',
    email: 'mulugeta@example.com',
    phone: '+251912345679',
    location: 'Addis Ababa, Ethiopia',
    verified: false
};
const children = {
    1: {
        id: 1,
        name: 'Abebe Kebede',
        gender: 'Male',
        profilePicture: 'https://via.placeholder.com/64',
        coverPicture: 'https://via.placeholder.com/1200x300',
        courses: ['Math', 'Physics'],
        pendingCourses: [],
        tutorIds: [1],
        progress: {
            tutors: {
                1: { subjects: { Math: 60, Physics: 40 }, overall: 50 }
            },
            cumulative: 50
        }
    },
    2: {
        id: 2,
        name: 'Selam Tesfaye',
        gender: 'Female',
        profilePicture: 'https://via.placeholder.com/64',
        coverPicture: 'https://via.placeholder.com/1200x300',
        courses: ['Chemistry', 'Biology'],
        pendingCourses: ['English'],
        tutorIds: [2],
        progress: {
            tutors: {
                2: { subjects: { Chemistry: 70, Biology: 30 }, overall: 50 }
            },
            cumulative: 50
        }
    }
};
const tutors = {
    1: { id: 1, name: 'Amanuel Tesfaye', subjects: ['Math', 'Physics'], availability: 'Weekdays', rating: 1.0, fee: 1000, profilePicture: 'https://via.placeholder.com/64' },
    2: { id: 2, name: 'Kebede Worku', subjects: ['Chemistry', 'Biology'], availability: 'Weekends', rating: 2.0, fee: 1200, profilePicture: 'https://via.placeholder.com/64' }
};
const sessions = {
    1: {
        sessionId: 1,
        date: '2025-05-20',
        time: '14:00',
        duration: '80 minutes',
        student: 'Abebe Kebede',
        studentId: 1,
        tutor: 'Amanuel Tesfaye',
        tutorId: 1,
        subjects: ['Math', 'Physics'],
        cost: 1000,
        status: 'Confirmed',
        studentConfirmed: true,
        tutorConfirmed: true,
        waiting: { student: false, tutor: false },
        missed: false,
        makeup: null,
        mode: 'Online'
    },
    2: {
        sessionId: 2,
        date: '2025-05-21',
        time: '10:00',
        duration: '60 minutes',
        student: 'Selam Tesfaye',
        studentId: 2,
        tutor: 'Kebede Worku',
        tutorId: 2,
        subjects: ['Chemistry', 'Biology'],
        cost: 1200,
        status: 'Scheduled',
        studentConfirmed: false,
        tutorConfirmed: false,
        waiting: { student: false, tutor: false },
        missed: false,
        makeup: null,
        mode: 'Online'
    }
};
const ratings = [];
const videos = {
    1: { intro: null, clips: [] },
    2: { intro: null, clips: [] }
};
const payments = {};
const logs = {};

// Initialize Profile
function initProfile() {
    document.getElementById('parent-email').textContent = parent.email;
    document.getElementById('parent-phone').textContent = parent.phone;
    document.getElementById('parent-location').textContent = parent.location || 'Not set';
    const verificationStatus = document.getElementById('verification-status');
    verificationStatus.textContent = parent.verified ? 'Verified' : 'Unverified';
    verificationStatus.className = parent.verified ? 'text-green-600 italic mb-2' : 'text-red-600 italic mb-2';
    searchChildren();
}

// Edit Profile Modal
function openEditProfileModal() {
    document.getElementById('edit-email').value = parent.email;
    document.getElementById('edit-phone').value = parent.phone;
    document.getElementById('edit-location').value = parent.location || '';
    document.getElementById('edit-profile-modal').classList.remove('hidden');
    trapFocus(document.getElementById('edit-profile-modal'));
}
function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.add('hidden');
    restoreFocus();
}
function saveProfile() {
    parent.email = document.getElementById('edit-email').value;
    parent.phone = document.getElementById('edit-phone').value;
    parent.location = document.getElementById('edit-location').value;
    initProfile();
    alert('Profile updated');
    closeEditProfileModal();
}

// Share Profile Modal
function openShareModal() {
    const shareLink = `https://astegni.et/parent/${parent.id}`;
    document.getElementById('share-link').value = shareLink;
    document.getElementById('share-modal').classList.remove('hidden');
    trapFocus(document.getElementById('share-modal'));
}
function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
    restoreFocus();
}
function copyShareLink() {
    const shareLink = document.getElementById('share-link');
    shareLink.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}
function shareProfile() {
    const shareLink = document.getElementById('share-link').value;
    const shareData = {
        title: 'My ASTEGNI Parent Profile',
        text: `Check out my parent profile on ASTEGNI!`,
        url: shareLink
    };
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('Profile shared successfully'))
            .catch((error) => console.error('Error sharing:', error));
    } else {
        copyShareLink();
    }
}

// Register Child Modal
let pendingChild = null;
let pendingPaymentId = null;
function openRegisterChildModal() {
    document.getElementById('register-child-modal').classList.remove('hidden');
    trapFocus(document.getElementById('register-child-modal'));
}
function closeRegisterChildModal() {
    document.getElementById('register-child-modal').classList.add('hidden');
    document.getElementById('child-name').value = '';
    document.getElementById('child-gender').value = 'Male';
    document.getElementById('child-profile-pic').value = 'https://via.placeholder.com/64';
    document.getElementById('child-cover-pic').value = 'https://via.placeholder.com/1200x300';
    document.getElementById('child-courses').value = '';
    document.getElementById('child-payment-method').value = '';
    restoreFocus();
}
function registerChild() {
    const name = document.getElementById('child-name').value.trim();
    const gender = document.getElementById('child-gender').value;
    const profilePic = document.getElementById('child-profile-pic').value.trim() || 'https://via.placeholder.com/64';
    const coverPic = document.getElementById('child-cover-pic').value.trim() || 'https://via.placeholder.com/1200x300';
    const courses = document.getElementById('child-courses').value.split(',').map(c => c.trim()).filter(c => c);
    const paymentMethod = document.getElementById('child-payment-method').value;

    if (!name || !gender || !courses.length || !paymentMethod) {
        alert('Please fill in all required fields, including payment method.');
        return;
    }

    const newChildId = Object.keys(children).length + 1;
    pendingChild = {
        id: newChildId,
        name,
        gender,
        profilePicture: profilePic,
        coverPicture: coverPic,
        courses,
        pendingCourses: [],
        tutorIds: [],
        progress: { tutors: {}, cumulative: 0 }
    };

    const newPaymentId = Object.keys(payments).length + 1;
    pendingPaymentId = newPaymentId;
    payments[newPaymentId] = {
        id: newPaymentId,
        type: 'Registration',
        details: `Child Registration: ${name}`,
        amount: 500,
        status: 'Pending',
        childId: newChildId,
        paymentMethod
    };

    document.getElementById('confirm-child-payment-details').textContent = `Confirm payment of 500 birr for registering ${name} using ${paymentMethod}?`;
    document.getElementById('confirm-child-payment-modal').classList.remove('hidden');
    trapFocus(document.getElementById('confirm-child-payment-modal'));
}
function confirmChildPayment() {
    if (pendingChild && pendingPaymentId) {
        children[pendingChild.id] = pendingChild;
        payments[pendingPaymentId].status = 'Completed';
        logAction(`Confirmed payment for child registration: ${pendingChild.name}`);
        alert('Child registered and payment confirmed');
        searchChildren();
        closeChildPaymentModal();
        closeRegisterChildModal();
        checkNotifications();
        pendingChild = null;
        pendingPaymentId = null;
    }
}
function closeChildPaymentModal() {
    document.getElementById('confirm-child-payment-modal').classList.add('hidden');
    if (pendingPaymentId) {
        delete payments[pendingPaymentId];
    }
    pendingChild = null;
    pendingPaymentId = null;
    restoreFocus();
}

// Child Details Modal
let selectedChildId = null;
let selectedTutorId = null;
function openChildDetailsModal(childId) {
    selectedChildId = childId;
    document.getElementById('child-details-modal').classList.remove('hidden');
    updateChildDetails();
    trapFocus(document.getElementById('child-details-modal'));
}
function closeChildDetailsModal() {
    document.getElementById('child-details-modal').classList.add('hidden');
    selectedChildId = null;
    selectedTutorId = null;
    document.getElementById('child-details-search').value = '';
    restoreFocus();
}

// Add Course Modal
function openAddCourseModal() {
    document.getElementById('add-course-modal').classList.remove('hidden');
    trapFocus(document.getElementById('add-course-modal'));
}
function closeAddCourseModal() {
    document.getElementById('add-course-modal').classList.add('hidden');
    document.getElementById('new-course').value = '';
    restoreFocus();
}
function addCourse() {
    const isFromNotification = document.getElementById('add-course-modal').dataset.fromNotification === 'true';
    const child = children[selectedChildId];
    let courses = [];

    if (isFromNotification) {
        courses = child.pendingCourses;
        if (courses.length === 0) {
            alert('No pending courses to confirm');
            closeAddCourseModal();
            closeNotificationModal();
            return;
        }
    } else {
        courses = document.getElementById('new-course').value.split(',').map(c => c.trim()).filter(c => c);
        if (courses.length === 0) {
            alert('Please enter at least one course');
            return;
        }
    }

    courses.forEach(course => {
        if (!child.courses.includes(course) && !child.pendingCourses.includes(course)) {
            child.pendingCourses.push(course);
        }
    });
    child.courses.push(...child.pendingCourses);
    child.pendingCourses = [];
    alert('Courses confirmed');
    updateChildDetails();
    searchChildren();
    closeAddCourseModal();
    if (isFromNotification) {
        closeNotificationModal();
    }
    checkNotifications();
}
function confirmCourse(childId) {
    selectedChildId = childId;
    document.getElementById('add-course-modal').dataset.fromNotification = 'true';
    openAddCourseModal();
}

// Update Child Details
function updateChildDetails() {
    const searchTerm = document.getElementById('child-details-search').value.trim().toLowerCase();
    const childDetails = document.getElementById('child-details');
    const sessionTable = document.getElementById('session-table');
    childDetails.innerHTML = '';
    sessionTable.innerHTML = '';

    const child = children[selectedChildId];
    const matchesCourse = searchTerm === '' || child.courses.some(course => course.toLowerCase().includes(searchTerm));
    const matchesTutor = searchTerm === '' || child.tutorIds.some(id => tutors[id].name.toLowerCase().includes(searchTerm));

    if (searchTerm === '' || matchesCourse || matchesTutor) {
        const div = document.createElement('div');
        div.innerHTML = `
            <img src="${child.coverPicture}" class="w-full h-48 object-cover mb-4 rounded-lg" alt="Cover Picture">
            <div class="flex items-center mb-4">
                <img src="${child.profilePicture}" class="w-16 h-16 rounded-full mr-4" alt="Profile Picture">
                <div>
                    <h3 class="text-xl font-semibold">${child.name}</h3>
                    <p class="text-[var(--text)]">Gender: ${child.gender}</p>
                </div>
            </div>
            <p class="text-[var(--text)] mb-2">Courses: ${child.courses.join(', ')}</p>
            <p class="text-[var(--text)] mb-2">Pending Courses: ${child.pendingCourses.join(', ') || 'None'}</p>
            <div class="flex space-x-2 mb-4 flex-wrap gap-y-2">
                <button onclick="openAddCourseModal()" class="px-4 py-2 rounded-lg cta-button">Add Course</button>
                ${child.tutorIds.map(id => `
                    <button onclick="openChatModal(${id})" class="px-4 py-2 rounded-lg cta-button">Chat with ${tutors[id].name}</button>
                    <button onclick="openRatingModal(${id})" class="px-4 py-2 rounded-lg cta-button">Rate ${tutors[id].name}</button>
                `).join('')}
            </div>
            <h4 class="text-lg font-semibold mb-2">Progress</h4>
            <div class="flex space-x-8 justify-center flex-wrap gap-y-4">
                ${child.tutorIds.map(tutorId => {
                    const progress = child.progress.tutors[tutorId] || { subjects: {}, overall: 0 };
                    return Object.keys(progress.subjects).map(subject => `
                        <div class="text-center">
                            <div class="relative w-24 h-24">
                                <svg class="w-full h-full" viewBox="0 0 100 100">
                                    <circle class="text-gray-200" stroke-width="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                    <circle class="progress-circle" stroke-width="10" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" stroke-dasharray="283" stroke-dashoffset="${283 * (1 - progress.subjects[subject] / 100)}" transform="rotate(-90 50 50)"/>
                                </svg>
                                <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold">${progress.subjects[subject]}%</span>
                            </div>
                            <p class="mt-2 text-[var(--text)]">${subject}</p>
                        </div>
                    `).join('');
                }).join('')}
                <div class="text-center">
                    <div class="relative inline-block group">
                        <div class="relative w-24 h-24">
                            <svg class="w-full h-full" viewBox="0 0 100 100">
                                <circle class="text-gray-200" stroke-width="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                <circle class="progress-circle" stroke-width="10" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" stroke-dasharray="283" stroke-dashoffset="${283 * (1 - child.progress.cumulative / 100)}" transform="rotate(-90 50 50)"/>
                            </svg>
                            <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold">${child.progress.cumulative}%</span>
                        </div>
                        <div class="absolute hidden group-hover:block p-4 rounded-lg shadow-lg z-10 w-64 -left-20 top-28" style="background-color: var(--modal-bg); color: var(--modal-text)">
                            <h4 class="text-sm font-semibold mb-2">Subject Progress</h4>
                            ${child.tutorIds.map(tutorId => {
                                const progress = child.progress.tutors[tutorId] || { subjects: {} };
                                return Object.keys(progress.subjects).map(subject => `
                                    <div class="mb-2">
                                        <p class="text-sm text-[var(--modal-text)]">${subject}: ${progress.subjects[subject]}%</p>
                                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                                            <div class="h-2.5 rounded-full" style="width: ${progress.subjects[subject]}%; background-color: var(--button-bg)"></div>
                                        </div>
                                    </div>
                                `).join('');
                            }).join('')}
                        </div>
                    </div>
                    <p class="mt-2 text-[var(--text)]">Overall</p>
                </div>
            </div>
        `;
        childDetails.appendChild(div);

        Object.values(sessions).forEach(session => {
            if (session.studentId === selectedChildId) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-2">${session.date}</td>
                    <td class="p-2">${session.time}</td>
                    <td class="p-2">${session.duration}</td>
                    <td class="p-2">${session.tutor}</td>
                    <td class="p-2">${session.subjects.join(', ')}</td>
                    <td class="p-2">${session.cost} birr</td>
                    <td class="p-2">${session.status}</td>
                    <td class="p-2 flex space-x-2 flex-wrap gap-y-2">
                        <button onclick="confirmAttendance(${session.sessionId})" class="px-2 py-1 rounded cta-button">Confirm Attendance</button>
                        <button onclick="confirmWaiting(${session.sessionId})" class="px-2 py-1 rounded cta-button">Confirm Waiting</button>
                        <button onclick="openProposeMakeupModal(${session.sessionId})" class="px-2 py-1 rounded cta-button">Propose Makeup</button>
                        <button onclick="openEditSubjectsModal(${session.sessionId})" class="px-2 py-1 rounded cta-button">Edit Subjects</button>
                    </td>
                `;
                sessionTable.appendChild(tr);
            }
        });
    } else {
        childDetails.innerHTML = '<p class="no-results">No matching results found.</p>';
        sessionTable.innerHTML = '<tr><td colspan="8" class="p-2 no-results">No sessions found.</td></tr>';
    }
}

// Search Children
function searchChildren() {
    const searchTerm = document.getElementById('child-search').value.trim().toLowerCase();
    const childTable = document.getElementById('child-table');
    childTable.innerHTML = '';
    Object.values(children).forEach(child => {
        const matchesName = searchTerm === '' || child.name.toLowerCase().includes(searchTerm);
        const matchesCourse = searchTerm === '' || child.courses.some(course => course.toLowerCase().includes(searchTerm));
        if (matchesName || matchesCourse) {
            const strokeDashoffset = 283 * (1 - child.progress.cumulative / 100);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-2">${child.name}</td>
                <td class="p-2">${child.gender}</td>
                <td class="p-2">${child.courses.join(', ')}</td>
                <td class="p-2">
                    <div class="relative inline-block group">
                        <div class="relative w-16 h-16">
                            <svg class="w-full h-full" viewBox="0 0 100 100">
                                <circle class="text-gray-200" stroke-width="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                <circle class="progress-circle" stroke-width="10" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" stroke-dasharray="283" stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 50 50)"/>
                            </svg>
                            <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold">${child.progress.cumulative}%</span>
                        </div>
                        <div class="absolute hidden group-hover:block p-4 rounded-lg shadow-lg z-10 w-64 -left-20 top-16" style="background-color: var(--modal-bg); color: var(--modal-text)">
                            <h4 class="text-sm font-semibold mb-2">Subject Progress</h4>
                            ${child.tutorIds.map(tutorId => {
                                const progress = child.progress.tutors[tutorId] || { subjects: {} };
                                return Object.keys(progress.subjects).map(subject => `
                                    <div class="mb-2">
                                        <p class="text-sm text-[var(--modal-text)]">${subject}: ${progress.subjects[subject]}%</p>
                                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                                            <div class="h-2.5 rounded-full" style="width: ${progress.subjects[subject]}%; background-color: var(--button-bg)"></div>
                                        </div>
                                    </div>
                                `).join('');
                            }).join('')}
                        </div>
                    </div>
                </td>
                <td class="p-2">
                    <button onclick="openChildDetailsModal(${child.id})" class="hover:underline">View</button>
                </td>
            `;
            childTable.appendChild(tr);
        }
    });
}

// Chat Modal
function openChatModal(tutorId) {
    selectedTutorId = tutorId;
    const tutor = tutors[tutorId];
    document.getElementById('chat-modal').querySelector('h3').textContent = `Chat with ${tutor.name}`;
    document.getElementById('chat-modal').dataset.tutorId = tutorId;
    document.getElementById('chat-modal').classList.remove('hidden');
    trapFocus(document.getElementById('chat-modal'));
}
function closeChatModal() {
    document.getElementById('chat-modal').classList.add('hidden');
    selectedTutorId = null;
    restoreFocus();
}
function sendMessage() {
    const tutorId = document.getElementById('chat-modal').dataset.tutorId;
    const message = document.getElementById('chat-input').value.trim();
    if (!message) return;
    const messages = document.getElementById('chat-messages');
    const p = document.createElement('p');
    p.textContent = `You: ${message}`;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
    document.getElementById('chat-input').value = '';
    console.log(`Message sent to TutorId=${tutorId}: ${message}`);
}

// Rating Modal
function openRatingModal(tutorId) {
    selectedTutorId = tutorId;
    document.getElementById('rating-modal').classList.remove('hidden');
    trapFocus(document.getElementById('rating-modal'));
}
function closeRatingModal() {
    document.getElementById('rating-modal').classList.add('hidden');
    selectedTutorId = null;
    restoreFocus();
}
function submitRating() {
    const rating = document.getElementById('rating-value').value;
    const comment = document.getElementById('rating-comment').value;
    const dislike = document.getElementById('rating-dislike').checked;
    ratings.push({ tutorId: selectedTutorId, rating, comment, dislike });
    alert('Rating submitted');
    console.log(`Rating Submitted: TutorId=${selectedTutorId}, Rating=${rating}, Comment=${comment}, Dislike=${dislike}`);
    closeRatingModal();
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

// Payment Modal
function openPaymentModal(sessionId) {
    document.getElementById('payment-modal').dataset.sessionId = sessionId;
    document.getElementById('payment-modal').classList.remove('hidden');
    trapFocus(document.getElementById('payment-modal'));
}
function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
    restoreFocus();
}
function selectBank(bank) {
    const sessionId = document.getElementById('payment-modal').dataset.sessionId;
    alert(`Redirecting to ${bank} banking API for session ${sessionId}`);
    console.log(`Payment initiated for Session ${sessionId} via ${bank}`);
    closePaymentModal();
}

// Session Actions
function confirmAttendance(sessionId) {
    sessions[sessionId].studentConfirmed = true;
    sessions[sessionId].status = 'Confirmed';
    alert('Attendance confirmed');
    console.log(`Session ${sessionId}: Parent confirmed attendance`);
    checkNotifications();
    updateChildDetails();
}
function confirmWaiting(sessionId) {
    sessions[sessionId].waiting.student = true;
    alert('Waiting confirmed');
    console.log(`Session ${sessionId}: Parent confirmed waiting`);
    checkNotifications();
}
function openProposeMakeupModal(sessionId) {
    document.getElementById('propose-makeup-modal').dataset.sessionId = sessionId;
    document.getElementById('propose-makeup-modal').classList.remove('hidden');
    trapFocus(document.getElementById('propose-makeup-modal'));
}
function closeProposeMakeupModal() {
    document.getElementById('propose-makeup-modal').classList.add('hidden');
    restoreFocus();
}
function submitMakeup() {
    const sessionId = document.getElementById('propose-makeup-modal').dataset.sessionId;
    const date = document.getElementById('makeup-date').value;
    const time = document.getElementById('makeup-time').value;
    const duration = document.getElementById('makeup-duration').value;
    if (!date || !time || !duration) {
        alert('Please fill in all fields');
        return;
    }
    sessions[sessionId].makeup = { date, time, duration };
    sessions[sessionId].missed = true;
    alert('Makeup session proposed');
    console.log(`Session ${sessionId}: Makeup proposed - Date=${date}, Time=${time}, Duration=${duration}`);
    closeProposeMakeupModal();
    checkNotifications();
    updateChildDetails();
}
function openEditSubjectsModal(sessionId) {
    document.getElementById('edit-subjects-modal').dataset.sessionId = sessionId;
    document.getElementById('edit-subjects-input').value = sessions[sessionId].subjects.join(', ');
    document.getElementById('edit-subjects-modal').classList.remove('hidden');
    trapFocus(document.getElementById('edit-subjects-modal'));
}
function closeEditSubjectsModal() {
    document.getElementById('edit-subjects-modal').classList.add('hidden');
    restoreFocus();
}
function submitEditSubjects() {
    const sessionId = document.getElementById('edit-subjects-modal').dataset.sessionId;
    const subjectsInput = document.getElementById('edit-subjects-input').value;
    const newSubjects = subjectsInput.split(',').map(s => s.trim()).filter(s => s);
    if (newSubjects.length === 0) {
        alert('Please enter at least one subject');
        return;
    }
    sessions[sessionId].subjects = newSubjects;
    alert('Subjects updated');
    console.log(`Session ${sessionId}: Subjects updated to ${newSubjects.join(', ')}`);
    closeEditSubjectsModal();
    updateChildDetails();
}

// Log Action
function logAction(action) {
    const newId = Object.keys(logs).length + 1;
    logs[newId] = {
        id: newId,
        action,
        user: parent.email,
        date: new Date().toLocaleString()
    };
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

// Notifications
function checkNotifications() {
    const currentTime = new Date();
    let hasNotifications = false;
    const notificationContent = document.getElementById('notification-content');
    notificationContent.innerHTML = '';
    Object.values(sessions).forEach(session => {
        if (session.status === 'Confirmed') {
            hasNotifications = true;
            const p = document.createElement('p');
            p.textContent = `Session ${session.subjects.join(', ')} for ${session.student} confirmed! Proceed to payment.`;
            p.innerHTML += ` <button onclick="openPaymentModal(${session.sessionId})" class="underline">Pay Now</button>`;
            notificationContent.appendChild(p);
        }
        const sessionTime = new Date(`${session.date}T${session.time}:00+03:00`);
        const timeDiff = (sessionTime - currentTime) / (1000 * 60);
        if (session.status === 'Scheduled' && timeDiff > 0 && timeDiff <= 30) {
            hasNotifications = true;
            const p = document.createElement('p');
            p.textContent = `Session with ${session.tutor} for ${session.student} in ${Math.round(timeDiff)} minutes!`;
            notificationContent.appendChild(p);
        }
    });
    Object.values(children).forEach(child => {
        if (child.pendingCourses.length > 0) {
            hasNotifications = true;
            const p = document.createElement('p');
            p.textContent = `Confirm courses: ${child.pendingCourses.join(', ')} for ${child.name}`;
            p.innerHTML += ` <button onclick="confirmCourse(${child.id})" class="underline">Confirm</button>`;
            notificationContent.appendChild(p);
        }
    });
    Object.values(payments).forEach(payment => {
        if (payment.status === 'Pending' && payment.type === 'Registration') {
            hasNotifications = true;
            const p = document.createElement('p');
            p.textContent = `Confirm payment for child registration: ${payment.details}`;
            p.innerHTML += ` <button onclick="confirmChildPayment(${payment.id})" class="underline">Confirm Payment</button>`;
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
    checkNotifications();
    setInterval(checkNotifications, 60000);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('mobile-theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('menu-btn').addEventListener('click', toggleMobileMenu);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);

// Close Modals on Escape Key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = [
            'edit-profile-modal', 'register-child-modal', 'child-details-modal',
            'add-course-modal', 'chat-modal', 'rating-modal', 'notification-modal',
            'propose-makeup-modal', 'edit-subjects-modal', 'payment-modal', 'share-modal',
            'confirm-child-payment-modal'
        ];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (!modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
                if (id === 'confirm-child-payment-modal') {
                    closeChildPaymentModal();
                } else {
                    restoreFocus();
                }
            }
        });
    }
});
