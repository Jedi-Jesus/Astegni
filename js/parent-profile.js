
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

        // Ad Rotation
        function rotateAds() {
            const adContainer = document.getElementById('advertise-placeholder-2');
            const adSlides = adContainer.querySelectorAll('.ad-slide');
            let currentAd = 0;

            setInterval(() => {
                adSlides[currentAd].classList.remove('active');
                currentAd = (currentAd + 1) % adSlides.length;
                adSlides[currentAd].classList.add('active');
            }, 7000);
        }


        function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon(newTheme);
    // Force style recalculation
    document.body.offsetHeight; // Trigger reflow to ensure styles apply
}

function updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    const sunIcon = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
    `;
    const moonIcon = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
        </svg>
    `;
    if (themeToggle) themeToggle.innerHTML = theme === 'light' ? moonIcon : sunIcon;
    if (mobileThemeToggle) mobileThemeToggle.innerHTML = theme === 'light' ? moonIcon : sunIcon;
}



        // Data Objects
        const parent = {
            id: 1,
            name: 'Mulugeta Alemu',
            email: 'mulugeta@example.com',
            phone: '+251912345679',
            location: 'Addis Ababa, Ethiopia',
            verified: false,
            profilePicture: 'https://via.placeholder.com/96',
            rating: 4.0
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
                tutorIds: [1, 2],
                progress: {
                    tutors: {
                        1: { subjects: { Math: 60, Physics: 40 }, overall: 50 },
                        2: { subjects: { Chemistry: 70, Biology: 30 }, overall: 50 }
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
            1: { id: 1, name: 'Amanuel Tesfaye', subjects: ['Math', 'Physics'], availability: 'Weekdays', rating: 1.0, fee: 1000, profilePicture: 'https://via.placeholder.com/64', phone: '+251911111111', email: 'amanuel@example.com' },
            2: { id: 2, name: 'Kebede Worku', subjects: ['Chemistry', 'Biology'], availability: 'Weekends', rating: 2.0, fee: 1200, profilePicture: 'https://via.placeholder.com/64', phone: '+251922222222', email: 'kebede@example.com' }
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
        const astegniRatings = [];
        const parentRatings = [
            { id: 1, tutorId: 1, rating: 4, comment: 'Great communication with our family.' },
            { id: 2, tutorId: 2, rating: 4, comment: 'Very responsive parent.' }
        ];
        const childRatings = [
            { id: 1, childId: 1, tutorId: 1, rating: 4, comment: 'Abebe is a diligent student.' },
            { id: 2, childId: 2, tutorId: 2, rating: 3, comment: 'Selam needs to focus more in class.' }
        ];
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
            document.querySelector('#parentDetails h3').textContent = parent.name;
            document.querySelector('#profile-dropdown-btn img').src = parent.profilePicture;
            document.querySelector('#mobile-profile-dropdown-btn img').src = parent.profilePicture;
            document.querySelector('#parentDetails img').src = parent.profilePicture;
            const verificationStatus = document.getElementById('verification-status');
            verificationStatus.textContent = parent.verified ? 'Verified' : 'Unverified';
            verificationStatus.className = parent.verified ? 'text-green-600 italic mb-2' : 'text-red-600 italic mb-2';
            const parentRating = document.getElementById('parent-rating');
            parentRating.textContent = `★★★★☆ (${parent.rating})`;
            searchChildren();
            rotateAds();
        }

        // Edit Profile Picture Modal
        function openEditProfilePicModal() {
            document.getElementById('profile-pic-preview-modal').src = parent.profilePicture;
            document.getElementById('edit-profile-pic').value = '';
            document.getElementById('edit-profile-pic-modal').classList.remove('hidden');
            trapFocus(document.getElementById('edit-profile-pic-modal'));
        }
        function closeEditProfilePicModal() {
            document.getElementById('edit-profile-pic-modal').classList.add('hidden');
            restoreFocus();
        }
        function saveProfilePic() {
            const fileInput = document.getElementById('edit-profile-pic');
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    parent.profilePicture = e.target.result;
                    document.getElementById('profile-pic-preview').src = parent.profilePicture;
                    document.getElementById('profile-pic-preview-modal').src = parent.profilePicture;
                    initProfile();
                    alert('Profile picture updated');
                    closeEditProfilePicModal();
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                alert('Please select an image file.');
            }
        }

        // Profile Picture Preview
        document.addEventListener('DOMContentLoaded', () => {
            const fileInput = document.getElementById('edit-profile-pic');
            if (fileInput) {
                fileInput.addEventListener('change', function (e) {
                    if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            document.getElementById('profile-pic-preview-modal').src = e.target.result;
                        };
                        reader.readAsDataURL(e.target.files[0]);
                    }
                });
            }
        });

        // Edit Profile Modal
        function openEditProfileModal() {
            document.getElementById('edit-email').value = parent.email;
            document.getElementById('edit-phone').value = parent.phone;
            document.getElementById('edit-location').value = parent.location || '';
            document.getElementById('edit-name').value = parent.name;
            document.getElementById('edit-profile-modal').classList.remove('hidden');
            trapFocus(document.getElementById('edit-profile-modal'));
        }
        function closeEditProfileModal() {
            document.getElementById('edit-profile-modal').classList.add('hidden');
            restoreFocus();
        }
        function saveProfile() {
            parent.name = document.getElementById('edit-name').value.trim();
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
            document.getElementById('child-courses').value = '';
            document.getElementById('child-payment-method').value = '';
            document.getElementById('child-account-number').value = '';
            restoreFocus();
        }
        function registerChild() {
            const name = document.getElementById('child-name').value.trim();
            const gender = document.getElementById('child-gender').value;
            const courses = document.getElementById('child-courses').value.split(',').map(c => c.trim()).filter(c => c);
            const paymentMethod = document.getElementById('child-payment-method').value;
            const accountNumber = document.getElementById('child-account-number').value.trim();

            if (!name || !gender || !courses.length || !paymentMethod || !accountNumber) {
                alert('Please fill in all required fields, including payment method and account number.');
                return;
            }

            const newChildId = Object.keys(children).length + 1;
            pendingChild = {
                id: newChildId,
                name,
                gender,
                profilePicture: 'https://via.placeholder.com/64',
                coverPicture: 'https://via.placeholder.com/1200x300',
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
                paymentMethod,
                accountNumber
            };

            document.getElementById('confirm-child-payment-details').textContent = `Confirm payment of 500 birr for registering ${name} using ${paymentMethod} (Account: ${accountNumber})?`;
            document.getElementById('confirm-child-payment-modal').classList.remove('hidden');
            trapFocus(document.getElementById('confirm-child-payment-modal'));
        }
        function confirmChildPayment() {
            if (pendingChild && pendingPaymentId) {
                children[pendingChild.id] = pendingChild;
                payments[pendingPaymentId].status = 'Confirmed';
                alert(`Child ${pendingChild.name} registered successfully!`);
                closeChildPaymentModal();
                closeRegisterChildModal();
                searchChildren();
                pendingChild = null;
                pendingPaymentId = null;
            }
        }
        function closeChildPaymentModal() {
            document.getElementById('confirm-child-payment-modal').classList.add('hidden');
            restoreFocus();
        }

        // Add CSS for seamless progress tooltip styling
const style = document.createElement('style');
style.textContent = `
    .progress-container {
        position: relative;
        display: inline-block;
    }
.progress-tooltip {
    display: none;
    position: absolute;
    top: 50%; /* Align vertically with the circle */
    left: calc(100% + 10px); /* Position to the right with a 10px gap */
    transform: translateY(-50%); /* Center vertically */
    background-color: var(--modal-bg);
    border: 1px solid var(--modal-input-border);
    padding: 0.75rem;
    border-radius: 6px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 20;
    min-width: 200px;
    text-align: left;
    color: var(--modal-text);
}
.progress-container:hover .progress-tooltip {
    display: block;
}
    .progress-bar {
        background-color: #e5e7eb;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 0.5rem;
    }
    .progress-bar-fill {
        background-color: var(--button-bg);
        height: 100%;
        transition: width 0.3s ease-in;
    }
    .progress-tooltip p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);

function searchChildren() {
    const searchTerm = document.getElementById('child-search').value.toLowerCase();
    const table = document.getElementById('child-table');
    table.innerHTML = '';
    Object.values(children).forEach(child => {
        // Update child.courses to include all subjects from tutors
        const allSubjects = new Set(child.courses || []);
        Object.values(child.progress.tutors).forEach(tutorData => {
            Object.keys(tutorData.subjects).forEach(subject => allSubjects.add(subject));
        });
        child.courses = Array.from(allSubjects);
        
        if (child.name.toLowerCase().includes(searchTerm) || child.courses.some(c => c.toLowerCase().includes(searchTerm))) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-2">${child.name}</td>
                <td class="p-2">${child.gender}</td>
                <td class="p-2">${child.courses.join(', ')}</td>
                <td class="p-2">
                    <div class="progress-container">
                        <svg class="w-12 h-12" viewBox="0 0 36 36">
                            <path class="progress-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="3"/>
                            <path class="progress-circle" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--button-bg)" stroke-width="3" stroke-dasharray="${child.progress.cumulative}, 100"/>
                            <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm">${child.progress.cumulative}%</span>
                        </svg>
                        <div class="progress-tooltip">
                            ${Object.entries(child.progress.tutors).map(([tutorId, data]) => `
                                ${Object.entries(data.subjects).map(([subject, percent]) => `
                                    <p>${subject}: ${percent}%</p>
                                    <div class="progress-bar">
                                        <div class="progress-bar-fill" style="width: ${percent}%"></div>
                                    </div>
                                `).join('')}
                            `).join('')}
                        </div>
                    </div>
                </td>
                <td class="p-2">
                    <button onclick="openChildDetailsModal(${child.id})" class="px-2 py-1 rounded-lg cta-button">Details</button>
                </td>
            `;
            table.appendChild(row);
        }
    });
    if (!table.innerHTML) {
        table.innerHTML = '<tr><td colspan="5" class="p-2 text-center no-results">No children found.</td></tr>';
    }
}        // Child Details Modal
        function openChildDetailsModal(childId) {
            const child = children[childId];
            if (!child) {
                console.error(`Child with ID ${childId} not found.`);
                alert('Child not found.');
                return;
            }
            const details = document.getElementById('child-details');
            details.innerHTML = `
                <div class="mb-4">
                    <img src="${child.coverPicture}" class="w-full h-32 object-cover rounded-lg mb-4" alt="${child.name}'s Cover Picture"> 
                    <img src="${child.profilePicture}" class="w-16 h-16 rounded-full mb-2" alt="${child.name}'s Profile Picture">
                    <h4 class="text-lg font-semibold">${child.name}</h4>
                    <p>Gender: ${child.gender}</p>
                    <p>Courses: ${child.courses.join(', ') || 'None'}</p>
                    <p>Pending Courses: ${child.pendingCourses.length ? child.pendingCourses.join(', ') : 'None'}</p>
                </div>
                <h4 class="text-lg font-semibold mb-2">Tutors</h4>
                <div class="tutor-grid">
                    ${child.tutorIds.length ? child.tutorIds.map(tutorId => {
                const tutor = tutors[tutorId];
                if (!tutor) return '';
                const progress = child.progress.tutors[tutorId] || { subjects: {}, overall: 0 };
                return `
                            <div class="border p-4 rounded-lg" data-tutor-id="${tutorId}">
                                <h5 class="font-semibold">${tutor.name}</h5>
                                <p>Subjects: ${tutor.subjects.join(', ') || 'None'}</p>
                                <p>Availability: ${tutor.availability || 'Not specified'}</p>
                                <p>Fee: ${tutor.fee} birr</p>
                                <p class="star-rating">Rating: ${'★'.repeat(Math.round(tutor.rating))}${'☆'.repeat(5 - Math.round(tutor.rating))} (${tutor.rating.toFixed(1)})</p>
                                <p>Progress: ${progress.overall}%</p>
                                ${Object.entries(progress.subjects).map(([subject, percent]) => `
                                    <p>${subject}: ${percent}%</p>
                                `).join('')}
                                <button onclick="openSessionSheetModal(${childId}, ${tutorId})" class="px-2 py-1 rounded-lg cta-button mt-2">Session Sheet</button>
                            </div>
                        `;
            }).join('') : '<p class="no-results">No tutors assigned.</p>'}
                </div>
            `;
            document.getElementById('child-details-modal').classList.remove('hidden');
            trapFocus(document.getElementById('child-details-modal'));
            updateChildDetails();
        }
        function closeChildDetailsModal() {
            document.getElementById('child-details-modal').classList.add('hidden');
            document.getElementById('child-details-search').value = '';
            restoreFocus();
        }
        function updateChildDetails() {
            const searchTerm = document.getElementById('child-details-search').value.toLowerCase();
            const tutorDivs = document.querySelectorAll('#child-details .tutor-grid > div');
            tutorDivs.forEach(div => {
                const tutorName = div.querySelector('h5').textContent.toLowerCase();
                div.style.display = tutorName.includes(searchTerm) ? 'block' : 'none';
            });
            const noResults = document.querySelector('#child-details .no-results');
            if (noResults) {
                noResults.style.display = searchTerm ? 'none' : 'block';
            }
        }

        // Rate Tutor Modal
        let currentTutorId = null;
        let currentChildId = null;
        function openRateTutorModal(tutorId, childId) {
            currentTutorId = tutorId;
            currentChildId = childId;
            document.getElementById('rating-retention').value = 1;
            document.getElementById('rating-punctuality').value = 1;
            document.getElementById('rating-discipline').value = 1;
            document.getElementById('rating-communication').value = 1;
            document.getElementById('rating-subject-matter').value = 1;
            document.getElementById('rating-tutor-comment').value = '';
            document.getElementById('rate-tutor-modal').classList.remove('hidden');
            trapFocus(document.getElementById('rate-tutor-modal'));
        }
        function closeRateTutorModal() {
            document.getElementById('rate-tutor-modal').classList.add('hidden');
            restoreFocus();
        }
        function submitTutorRating() {
            const retention = parseInt(document.getElementById('rating-retention').value);
            const punctuality = parseInt(document.getElementById('rating-punctuality').value);
            const discipline = parseInt(document.getElementById('rating-discipline').value);
            const communication = parseInt(document.getElementById('rating-communication').value);
            const subjectMatter = parseInt(document.getElementById('rating-subject-matter').value);
            const comment = document.getElementById('rating-tutor-comment').value.trim();
            if (!retention || !punctuality || !discipline || !communication || !subjectMatter) {
                alert('Please provide all ratings.');
                return;
            }
            const rating = (retention + punctuality + discipline + communication + subjectMatter) / 5;
            ratings.push({
                id: ratings.length + 1,
                tutorId: currentTutorId,
                childId: currentChildId,
                rating,
                comment
            });
            const tutor = tutors[currentTutorId];
            const ratingsForTutor = ratings.filter(r => r.tutorId === currentTutorId);
            tutor.rating = ratingsForTutor.reduce((sum, r) => sum + r.rating, 0) / ratingsForTutor.length;
            alert('Rating submitted successfully!');
            closeRateTutorModal();
            openChildDetailsModal(currentChildId);
        }

        // Session Sheet Modal
        function openSessionSheetModal(childId, tutorId) {
            const table = document.getElementById('session-table');
            table.innerHTML = '';
            Object.values(sessions).forEach(session => {
                if (session.studentId === childId && session.tutorId === tutorId) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="p-2">${session.date}</td>
                        <td class="p-2">${session.time}</td>
                        <td class="p-2">${session.duration}</td>
                        <td class="p-2">${session.tutor}</td>
                        <td class="p-2">${session.subjects.join(', ') || 'None'}</td>
                        <td class="p-2">${session.cost} birr</td>
                        <td class="p-2">${session.status}</td>
                        <td class="p-2">
                            ${session.status === 'Scheduled' ? `
                                <button onclick="openPaymentModal(${session.sessionId})" class="px-2 py-1 rounded-lg cta-button">Pay</button>
                                <button onclick="openProposeMakeupModal(${session.sessionId})" class="px-2 py-1 rounded-lg cta-button mt-2">Propose Makeup</button>
                                <button onclick="openEditSubjectsModal(${session.sessionId})" class="px-2 py-1 rounded-lg cta-button mt-2">Edit Subjects</button>
                            ` : ''}
                            ${session.status === 'Confirmed' && !session.studentConfirmed ? `
                                <button onclick="confirmSession(${session.sessionId}, 'student')" class="px-2 py-1 rounded-lg cta-button">Confirm</button>
                            ` : ''}
                            ${session.missed && !session.makeup ? `
                                <button onclick="openProposeMakeupModal(${session.sessionId})" class="px-2 py-1 rounded-lg cta-button">Propose Makeup</button>
                            ` : ''}
                        </td>
                    `;
                    table.appendChild(row);
                }
            });
            if (!table.innerHTML) {
                table.innerHTML = '<tr><td colspan="8" class="p-2 text-center no-results">No sessions found.</td></tr>';
            }
            document.getElementById('session-sheet-modal').classList.remove('hidden');
            trapFocus(document.getElementById('session-sheet-modal'));
        }
        function closeSessionSheetModal() {
            document.getElementById('session-sheet-modal').classList.add('hidden');
            restoreFocus();
        }

        // View Child Comments Modal
        function openViewChildCommentsModal(childId, tutorId = null) {
            const comments = childRatings.filter(r => r.childId === childId && (!tutorId || r.tutorId === tutorId));
            const content = document.getElementById('child-comments-content');
            content.innerHTML = comments.length ? comments.map(r => `
                <div class="border-b py-2">
                    <p class="star-rating">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))} (${r.rating.toFixed(1)})</p>
                    <p>${r.comment || 'No comment provided.'}</p>
                    <p class="text-sm text-gray-500">By ${tutors[r.tutorId]?.name || 'Unknown Tutor'}</p>
                </div>
            `).join('') : '<p class="no-results">No comments available.</p>';
            document.getElementById('view-child-comments-modal').classList.remove('hidden');
            trapFocus(document.getElementById('view-child-comments-modal'));
        }
        function closeViewChildCommentsModal() {
            document.getElementById('view-child-comments-modal').classList.add('hidden');
            restoreFocus();
        }

        // Chat Modal
        let currentChatId = null;
        function openChatModal(id) {
            currentChatId = id;
            const messages = document.getElementById('chat-messages');
            messages.innerHTML = logs[id]?.map(log => `
                <p><strong>${log.sender}:</strong> ${log.message}</p>
            `).join('') || '<p class="no-results">No messages yet.</p>';
            document.getElementById('chat-modal').classList.remove('hidden');
            trapFocus(document.getElementById('chat-modal'));
            document.getElementById('chat-input').focus();
        }
        function closeChatModal() {
            document.getElementById('chat-modal').classList.add('hidden');
            document.getElementById('chat-input').value = '';
            restoreFocus();
        }
        function sendMessage() {
            const message = document.getElementById('chat-input').value.trim();
            if (!message) {
                alert('Please enter a message.');
                return;
            }
            if (!logs[currentChatId]) logs[currentChatId] = [];
            logs[currentChatId].push({ sender: parent.name, message });
            const messages = document.getElementById('chat-messages');
            messages.innerHTML = logs[currentChatId].map(log => `
                <p><strong>${log.sender}:</strong> ${log.message}</p>
            `).join('');
            document.getElementById('chat-input').value = '';
            messages.scrollTop = messages.scrollHeight;
        }

        // Rate ASTEGNI Modal
        function openRateAstegniModal() {
            document.getElementById('rating-usability').value = 1;
            document.getElementById('rating-customer-service').value = 1;
            document.getElementById('rating-astegni-comment').value = '';
            document.getElementById('rate-astegni-modal').classList.remove('hidden');
            trapFocus(document.getElementById('rate-astegni-modal'));
        }
        function closeRateAstegniModal() {
            document.getElementById('rate-astegni-modal').classList.add('hidden');
            restoreFocus();
        }
        function submitAstegniRating() {
            const usability = parseInt(document.getElementById('rating-usability').value);
            const customerService = parseInt(document.getElementById('rating-customer-service').value);
            const comment = document.getElementById('rating-astegni-comment').value.trim();
            if (!usability || !customerService) {
                alert('Please provide all ratings.');
                return;
            }
            const rating = (usability + customerService) / 2;
            astegniRatings.push({ id: astegniRatings.length + 1, rating, comment });
            alert('Thank you for rating ASTEGNI!');
            closeRateAstegniModal();
        }

        /// View Parent Comments Modal
        function openViewParentCommentsModal() {
            const content = document.getElementById('parent-comments-content');
            content.innerHTML = parentRatings.length ? parentRatings.map(r => `
        <div class="border-b py-2">
            <p class="star-rating">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))} (${r.rating.toFixed(1)})</p>
            <p>${r.comment || 'No comment provided.'}</p>
            <p class="text-sm text-gray-500">By ${tutors[r.tutorId]?.name || 'Unknown Tutor'}</p>
        </div>
    `).join('') : '<p class="no-results">No comments available.</p>';
            document.getElementById('view-parent-comments-modal').classList.remove('hidden');
            trapFocus(document.getElementById('view-parent-comments-modal'));
        }
        function closeViewParentCommentsModal() {
            document.getElementById('view-parent-comments-modal').classList.add('hidden');
            restoreFocus();
        }

        // Notification Modal
        function openNotificationModal() {
            const content = document.getElementById('notification-content');
            const notifications = Object.values(sessions).filter(s => s.status === 'Scheduled' && !s.studentConfirmed).map(s => `
        <div class="border-b py-2">
            <p>Session with ${s.tutor} on ${s.date} at ${s.time} is awaiting your confirmation.</p>
            <button onclick="confirmSession(${s.sessionId}, 'student')" class="px-2 py-1 rounded-lg cta-button mt-2">Confirm</button>
        </div>
    `);
            content.innerHTML = notifications.length ? notifications.join('') : '<p class="no-results">No notifications.</p>';
            document.getElementById('notification-modal').classList.remove('hidden');
            document.getElementById('notification-dot').classList.toggle('hidden', !notifications.length);
            document.getElementById('mobile-notification-dot').classList.toggle('hidden', !notifications.length);
            trapFocus(document.getElementById('notification-modal'));
        }
        function closeNotificationModal() {
            document.getElementById('notification-modal').classList.add('hidden');
            restoreFocus();
        }

        // Propose Makeup Modal
        let currentSessionId = null;
        function openProposeMakeupModal(sessionId) {
            currentSessionId = sessionId;
            document.getElementById('makeup-date').value = '';
            document.getElementById('makeup-time').value = '';
            document.getElementById('makeup-duration').value = '60 minutes';
            document.getElementById('propose-makeup-modal').classList.remove('hidden');
            trapFocus(document.getElementById('propose-makeup-modal'));
        }
        function closeProposeMakeupModal() {
            document.getElementById('propose-makeup-modal').classList.add('hidden');
            restoreFocus();
        }
        function submitMakeup() {
            const date = document.getElementById('makeup-date').value;
            const time = document.getElementById('makeup-time').value;
            const duration = document.getElementById('makeup-duration').value;
            if (!date || !time) {
                alert('Please select a date and time.');
                return;
            }
            sessions[currentSessionId].makeup = { date, time, duration, status: 'Proposed' };
            alert('Makeup session proposed successfully!');
            closeProposeMakeupModal();
            openSessionSheetModal(sessions[currentSessionId].studentId, sessions[currentSessionId].tutorId);
        }

        // Edit Subjects Modal
        function openEditSubjectsModal(sessionId) {
            currentSessionId = sessionId;
            document.getElementById('edit-subjects-input').value = sessions[sessionId].subjects.join(', ');
            document.getElementById('edit-subjects-modal').classList.remove('hidden');
            trapFocus(document.getElementById('edit-subjects-modal'));
        }
        function closeEditSubjectsModal() {
            document.getElementById('edit-subjects-modal').classList.add('hidden');
            restoreFocus();
        }
        function submitEditSubjects() {
            const subjects = document.getElementById('edit-subjects-input').value.split(',').map(s => s.trim()).filter(s => s);
            if (!subjects.length) {
                alert('Please enter at least one subject.');
                return;
            }
            sessions[currentSessionId].subjects = subjects;
            alert('Subjects updated successfully!');
            closeEditSubjectsModal();
            openSessionSheetModal(sessions[currentSessionId].studentId, sessions[currentSessionId].tutorId);
        }

        // Payment Modal
        function openPaymentModal(sessionId) {
            currentSessionId = sessionId;
            document.getElementById('payment-modal').classList.remove('hidden');
            trapFocus(document.getElementById('payment-modal'));
        }
        function closePaymentModal() {
            document.getElementById('payment-modal').classList.add('hidden');
            restoreFocus();
        }
        function selectBank(bank) {
            const session = sessions[currentSessionId];
            if (!session) {
                alert('Invalid session.');
                return;
            }
            const paymentId = Object.keys(payments).length + 1;
            payments[paymentId] = {
                id: paymentId,
                type: 'Session',
                details: `Session ${currentSessionId} with ${session.tutor}`,
                amount: session.cost,
                status: 'Confirmed',
                childId: session.studentId,
                paymentMethod: bank,
                accountNumber: 'N/A'
            };
            session.studentConfirmed = true;
            if (session.tutorConfirmed) {
                session.status = 'Confirmed';
            }
            alert(`Payment of ${session.cost} birr confirmed via ${bank}!`);
            closePaymentModal();
            openSessionSheetModal(session.studentId, session.tutorId);
            openNotificationModal();
        }

        // Confirm Session
        function confirmSession(sessionId, role) {
            const session = sessions[sessionId];
            if (!session) {
                alert('Invalid session.');
                return;
            }
            if (role === 'student') {
                session.studentConfirmed = true;
            }
            if (session.studentConfirmed && session.tutorConfirmed) {
                session.status = 'Confirmed';
            }
            alert('Session confirmed successfully!');
            openSessionSheetModal(session.studentId, session.tutorId);
            openNotificationModal();
        }

        // Notes Modal
        function openNotesModal() {
            document.getElementById('notes-input').value = localStorage.getItem('parentNotes') || '';
            document.getElementById('notes-modal').classList.remove('hidden');
            trapFocus(document.getElementById('notes-modal'));
        }
        function closeNotesModal() {
            document.getElementById('notes-modal').classList.add('hidden');
            restoreFocus();
        }
        function saveNotes() {
            const notes = document.getElementById('notes-input').value.trim();
            localStorage.setItem('parentNotes', notes);
            alert('Notes saved successfully!');
            closeNotesModal();
        }

        // Manage Finances Modal
        function openManageFinancesModal() {
            document.getElementById('manage-finances-modal').classList.remove('hidden');
            trapFocus(document.getElementById('manage-finances-modal'));
        }
        function closeManageFinancesModal() {
            document.getElementById('manage-finances-modal').classList.add('hidden');
            restoreFocus();
        }

        // Accessibility: Trap Focus in Modal
        function trapFocus(modal) {
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusableElements.length) return;
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            modal.focusedElementBeforeModal = document.activeElement;

            const handleKeyDown = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
                if (e.key === 'Escape') {
                    const closeButton = modal.querySelector('button[onclick*="close"]');
                    if (closeButton) closeButton.click();
                }
            };

            modal.addEventListener('keydown', handleKeyDown);
            modal._handleKeyDown = handleKeyDown;
            if (firstElement) firstElement.focus();
        }

        // Accessibility: Restore Focus
        function restoreFocus() {
            const modal = document.querySelector('.modal:not(.hidden)');
            if (modal && modal.focusedElementBeforeModal) {
                modal.focusedElementBeforeModal.focus();
            }
        }

        // Mobile Menu Toggle
        document.getElementById('menu-btn').addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobile-menu');
            const isOpen = mobileMenu.classList.contains('open');
            mobileMenu.classList.toggle('open');
            document.getElementById('menu-btn').setAttribute('aria-expanded', !isOpen);
        });

        // Profile Dropdown Toggle
        function toggleProfileDropdown() {
            const dropdown = document.getElementById('profile-dropdown');
            const isOpen = !dropdown.classList.contains('hidden');
            dropdown.classList.toggle('hidden');
            document.getElementById('profile-dropdown-btn').setAttribute('aria-expanded', !isOpen);
        }
        function toggleMobileProfileDropdown() {
            const dropdown = document.getElementById('mobile-profile-dropdown');
            const isOpen = !dropdown.classList.contains('hidden');
            dropdown.classList.toggle('hidden');
            document.getElementById('mobile-profile-dropdown-btn').setAttribute('aria-expanded', !isOpen);
        }
        document.getElementById('profile-dropdown-btn').addEventListener('click', toggleProfileDropdown);
        document.getElementById('mobile-profile-dropdown-btn').addEventListener('click', toggleMobileProfileDropdown);

        // Theme Initialization
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeToggleIcon(savedTheme);
            document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
            document.getElementById('mobile-theme-toggle').addEventListener('click', toggleTheme);
            initProfile();
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    const closeButton = modal.querySelector('button[onclick*="close"]');
                    if (closeButton) closeButton.click();
                }
            });
        });
    