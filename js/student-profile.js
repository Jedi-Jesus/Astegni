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
        const schoolDatabase = [
            'Addis Ababa University',
            'Menelik II School',
            'St. Joseph School',
            'Ethiopian International School',
            'Lycee Guebre-Mariam'
        ];
        const tutors = {
            1: { id: 1, name: 'Amanuel Tesfaye', subjects: ['Math', 'Physics'], availability: 'Weekdays', rating: 4.5, fee: 1000, profilePicture: 'https://via.placeholder.com/64' },
            2: { id: 2, name: 'Kebede Worku', subjects: ['Chemistry', 'Biology'], availability: 'Weekends', rating: 4.0, fee: 1200, profilePicture: 'https://via.placeholder.com/64' }
        };
        const students = {
            1: {
                name: 'Abebe Kebede',
                email: 'abebe@example.com',
                phone: '+251912345678',
                classes: [],
                school: '',
                verified: false,
                wishlistSubjects: [],
                registeredSubjects: [],
                reportedSubjects: [],
                referrals: [],
                certifications: [],
                nextSession: '2025-05-20 14:00',
                progress: {
                    tutors: {
                        1: { subjects: { Math: 60, Physics: 40 }, overall: 50 },
                        2: { subjects: { Chemistry: 70, Biology: 30 }, overall: 50 }
                    },
                    cumulative: 50
                },
                preferences: {
                    1: 'Online',
                    2: 'In Person'
                },
                guardian: {
                    name: 'Mulugeta Kebede',
                    email: 'mulugeta@example.com',
                    phone: '+251987654321',
                    profilePicture: 'https://via.placeholder.com/64'
                }
            }
        };
        const sessions = {
            1: {
                sessionId: 1,
                date: '2025-05-20',
                time: '14:00',
                duration: '60 minutes',
                student: 'Abebe Kebede',
                studentId: 1,
                tutor: 'Amanuel Tesfaye',
                tutorId: 1,
                subjects: ['Math', 'Physics'],
                cost: 1000,
                status: 'Scheduled',
                studentConfirmed: false,
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
                student: 'Abebe Kebede',
                studentId: 1,
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
                mode: 'In Person'
            }
        };

        // Initialize Profile
        function initProfile() {
            const student = students[1];
            document.getElementById('student-email').textContent = student.email;
            document.getElementById('student-phone').textContent = student.phone;
            document.getElementById('student-school').textContent = student.school || 'None';
            document.getElementById('student-classes').textContent = student.classes.length > 0 ? student.classes.join(', ') : 'None';
            document.getElementById('guardian-name').textContent = student.guardian.name;
            document.getElementById('guardian-email').textContent = student.guardian.email;
            document.getElementById('guardian-phone').textContent = student.guardian.phone;
            document.getElementById('guardian-picture').src = student.guardian.profilePicture;
            const verificationStatus = document.getElementById('verification-status');
            verificationStatus.textContent = student.verified ? 'Verified' : 'Unverified';
            verificationStatus.className = student.verified ? 'text-green-600 italic mb-2' : 'text-red-600 italic mb-2';
            updateSubjectLists();
            updateCertificationsList();
            updateReferralList();
        }

        // Update Subject Lists
        function updateSubjectLists() {
            const student = students[1];
            const wishlist = document.getElementById('wishlist-subjects');
            const registered = document.getElementById('registered-subjects');
            wishlist.innerHTML = student.wishlistSubjects.length > 0 ? student.wishlistSubjects.map(s => `<li>${s}</li>`).join('') : '<li>No subjects added</li>';
            registered.innerHTML = student.registeredSubjects.length > 0 ? student.registeredSubjects.map(s => `<li>${s}</li>`).join('') : '<li>No subjects added</li>';
        }

        // Update Certifications List
        function updateCertificationsList() {
            const student = students[1];
            const certificationsList = document.getElementById('certifications-list');
            certificationsList.innerHTML = student.certifications.length > 0 ? student.certifications.map(c => `<li>${c.title} by ${tutors[c.tutorId].name} (${c.date})</li>`).join('') : '<li>No certifications received</li>';
        }

        // Update Referral List
        function updateReferralList() {
            const student = students[1];
            const referralList = document.getElementById('referral-list');
            referralList.innerHTML = student.referrals.length > 0 ? student.referrals.map(r => `<li>${r.email} - ${r.status}</li>`).join('') : '<li>No referrals yet</li>';
        }

        // Validate School
        function validateSchool(school) {
            return schoolDatabase.includes(school) || school === '' ? '' : 'Invalid school name';
        }

        // Edit Profile Modal
        function openEditProfileModal() {
            const student = students[1];
            document.getElementById('edit-email').value = student.email;
            document.getElementById('edit-phone').value = student.phone;
            document.getElementById('edit-school').value = student.school || '';
            document.getElementById('edit-classes').value = student.classes.join(', ');
            document.getElementById('edit-profile-modal').classList.remove('hidden');
            trapFocus(document.getElementById('edit-profile-modal'));
        }

        function closeEditProfileModal() {
            document.getElementById('edit-profile-modal').classList.add('hidden');
            restoreFocus();
        }

        function saveProfile() {
            const student = students[1];
            const school = document.getElementById('edit-school').value.trim();
            const schoolError = validateSchool(school);
            if (schoolError) {
                alert(schoolError);
                return;
            }
            student.email = document.getElementById('edit-email').value;
            student.phone = document.getElementById('edit-phone').value;
            student.school = school;
            student.classes = document.getElementById('edit-classes').value.split(',').map(c => c.trim()).filter(c => c);
            initProfile();
            alert('Profile updated successfully');
            closeEditProfileModal();
        }

        // Add Subject Modal
        let currentSubjectType = '';
        function openAddSubjectModal(type) {
            currentSubjectType = type;
            document.getElementById('add-subject-title').textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)} Subject`;
            document.getElementById('add-subject-modal').classList.remove('hidden');
            trapFocus(document.getElementById('add-subject-modal'));
        }

        function closeAddSubjectModal() {
            document.getElementById('add-subject-modal').classList.add('hidden');
            document.getElementById('new-subject').value = '';
            restoreFocus();
        }

        function addSubject() {
            const subject = document.getElementById('new-subject').value.trim();
            if (subject) {
                const student = students[1];
                if (currentSubjectType === 'wishlist' && !student.wishlistSubjects.includes(subject)) {
                    student.wishlistSubjects.push(subject);
                } else if (currentSubjectType === 'registered' && !student.registeredSubjects.includes(subject)) {
                    student.registeredSubjects.push(subject);
                }
                updateSubjectLists();
                closeAddSubjectModal();
                alert(`${subject.charAt(0).toUpperCase() + subject.slice(1)} subject added`);
            }
        }

        // Report Subject Modal
        function openReportSubjectModal() {
            document.getElementById('report-subject-modal').classList.remove('hidden');
            trapFocus(document.getElementById('report-subject-modal'));
        }

        function closeReportSubjectModal() {
            document.getElementById('report-subject-modal').classList.add('hidden');
            document.getElementById('report-subject').value = '';
            restoreFocus();
        }

        function reportSubject() {
            const subject = document.getElementById('report-subject').value.trim();
            if (subject) {
                students[1].reportedSubjects.push(subject);
                closeReportSubjectModal();
                alert('Subject reported successfully!');
            }
        }

        // Referral Modal
        function openReferralModal() {
            document.getElementById('referral-modal').classList.remove('hidden');
            updateReferralList();
            trapFocus(document.getElementById('referral-modal'));
        }

        function closeReferralModal() {
            document.getElementById('referral-modal').classList.add('hidden');
            restoreFocus();
        }

        function sendReferral() {
            const email = document.getElementById('referral-email').value.trim();
            if (!email) {
                alert('Please enter a valid email');
                return;
            }
            students[1].referrals.push({ email, status: 'Invited' });
            updateReferralList();
            alert('Referral invite sent successfully!');
            document.getElementById('referral-email').value = '';
            closeReferralModal();
        }

        // My Tutor Modal
        let selectedTutorId = null;
        function openMyTutorModal(tutorId) {
            selectedTutorId = tutorId;
            document.getElementById('my-tutor-modal').classList.remove('hidden');
            updateTutorDetails();
            trapFocus(document.getElementById('my-tutor-modal'));
        }

        function closeMyTutorModal() {
            document.getElementById('my-tutor-modal').classList.add('hidden');
            selectedTutorId = null;
            document.querySelector('#tutor-details-search').value = '';
            restoreFocus();
        }

        // Video Call Modal (Renamed from Go Live Modal)
        function openVideoCallModal() {
            if (!document.getElementById('video-call-btn').disabled) {
                const tutorSelect = document.getElementById('video-call-tutor');
                tutorSelect.innerHTML = `<option value="${tutors[selectedTutorId].name}">${tutors[selectedTutorId].name}</option>`;
                document.getElementById('video-call-modal').classList.remove('hidden');
                trapFocus(document.getElementById('video-call-modal'));
            }
        }

        function closeVideoCallModal() {
            document.getElementById('video-call-modal').classList.add('hidden');
            restoreFocus();
        }

        function startVideoCall() {
            const tutor = document.getElementById('video-call-tutor').value;
            const subject = document.getElementById('video-call-subject').value;
            const duration = document.getElementById('video-call-duration').value;
            alert('Starting video call...');
            console.log(`Video call started: Tutor=${tutor}, Subject=${subject}, Duration=${duration}`);
            closeVideoCallModal();
        }

        function checkVideoCallAvailability(tutorId) {
            const now = new Date();
            let sessionFound = false;
            Object.values(sessions).forEach(session => {
                if (session.tutorId === tutorId && session.status === 'Scheduled') {
                    const sessionTime = new Date(`${session.date}T${session.time}:00`);
                    const timeDiff = (now - sessionTime) / (1000 * 60);
                    const videoCallBtn = document.getElementById('video-call-btn');
                    if (Math.abs(timeDiff) <= 5) {
                        sessionFound = true;
                        videoCallBtn.disabled = false;
                    }
                }
            });
            if (!sessionFound) {
                const videoCallBtn = document.getElementById('video-call-btn');
                videoCallBtn.disabled = true;
            }
        }

        // Guardian Video Call and Chat
        function openGuardianVideoCall() {
            alert('Starting video call with guardian...');
            console.log(`Video call started with guardian: ${students[1].guardian.name}`);
        }

        function openGuardianChat() {
            document.getElementById('guardian-chat-modal').classList.remove('hidden');
            document.getElementById('guardian-chat-modal').querySelector('h3').textContent = `Chat with ${students[1].guardian.name}`;
            trapFocus(document.getElementById('guardian-chat-modal'));
        }

        function closeGuardianChatModal() {
            document.getElementById('guardian-chat-modal').classList.add('hidden');
            document.getElementById('guardian-chat-input').value = '';
            restoreFocus();
        }

        function sendGuardianMessage() {
            const message = document.getElementById('guardian-chat-input').value.trim();
            if (!message) return;
            const messages = document.getElementById('guardian-chat-messages');
            const p = document.createElement('p');
            p.textContent = `You: ${message}`;
            messages.appendChild(p);
            messages.scrollTop = messages.scrollHeight;
            document.getElementById('guardian-chat-input').value = '';
            console.log(`Message sent to guardian: ${message}`);
        }

        // Update Tutor Details
        function updateTutorDetails() {
            const searchTerm = document.getElementById('tutor-details-search').value.trim().toLowerCase();
            const tutorDetails = document.getElementById('tutor-details');
            const sessionTable = document.getElementById('session-table');
            tutorDetails.innerHTML = '';
            sessionTable.innerHTML = '';

            const tutor = tutors[selectedTutorId];
            const matchesName = searchTerm === '' || tutor.name.toLowerCase().includes(searchTerm);
            const matchesSubject = searchTerm === '' || tutor.subjects.some(subject => subject.toLowerCase().includes(searchTerm));

            if (searchTerm === '' || matchesName || matchesSubject) {
                const progress = students[1].progress.tutors[tutor.id];
                const preference = students[1].preferences[tutor.id] || 'No preference set';
                const div = document.createElement('div');
                div.innerHTML = `
                    <img src="${tutor.profilePicture}" class="w-16 h-16 rounded-full mb-4" alt="${tutor.name}'s profile picture">
                    <h3 class="text-xl font-semibold mb-1">${tutor.name}</h3>
                    <p class="mb-2">Subjects: <span>${tutor.subjects.join(', ')}</span></p>
                    <p class="mb-2">Availability: <span>${tutor.availability}</span></p>
                    <p class="text-yellow-600 mb-2">Rating: <span>${tutor.rating} ★</span></p>
                    <p class="mb-2">Fee: <span>${tutor.fee} birr</span></p>
                    <p class="mb-2">Learning Preference: <span>${preference}</span></p>
                    <button onclick="openPreferenceChangeModal()" class="px-4 py-2 rounded-lg mb-4">Request a Learning Preference Change</button>
                    <div class="flex space-x-4 mb-4">
                        <button id="video-call-btn" onclick="openVideoCallModal()" class="px-4 py-2 rounded-lg" disabled>Video Call</button>
                        <button onclick="openRatingModal()" class="px-4 py-2 rounded-lg">Rate Tutor</button>
                        <button onclick="openChatModal(${tutor.id})" class="px-4 py-2 rounded-lg">Chat</button>
                    </div>
                    <div class="mt-4">
                        <h4 class="text-lg font-semibold mb-2">Your Progress with <span>${tutor.name}</span></h4>
                        <div class="flex space-x-8 justify-center">
                            ${tutor.subjects.map(subject => `
                                <div class="text-center">
                                    <div class="relative w-24 h-24">
                                        <svg class="w-full h-full" viewBox="0 0 100 100">
                                            <circle class="text-gray-200" stroke-width="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                            <circle class="progress-circle" stroke-width="10" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" stroke-dasharray="283" stroke-dashoffset="${283 * (1 - progress.subjects[subject] / 100)}" transform="rotate(-90 50 50)"/>
                                        </svg>
                                        <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold">${progress.subjects[subject]}%</span>
                                    </div>
                                    <p class="mt-2">${subject}</p>
                                </div>
                            `).join('')}
                            <div class="text-center">
                                <div class="relative inline-block group">
                                    <div class="relative w-24 h-24">
                                        <svg class="w-full h-full" viewBox="0 0 100 100">
                                            <circle class="text-gray-200" stroke-width="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                            <circle class="progress-circle" stroke-width="10" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" stroke-dasharray="283" stroke-dashoffset="${283 * (1 - progress.overall / 100)}" transform="rotate(-90 50 50)"/>
                                        </svg>
                                        <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold">${progress.overall}%</span>
                                    </div>
                                    <div class="absolute hidden group-hover:block p-4 rounded-lg shadow-lg z-10 w-64 -left-20 top-28">
                                        <h4 class="text-sm font-semibold mb-2">Subject Progress</h4>
                                        ${tutor.subjects.map(subject => `
                                            <div class="mb-2">
                                                <p class="text-sm">${subject}: ${progress.subjects[subject]}%</p>
                                                <div class="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div class="h-2.5 rounded-full" style="width: ${progress.subjects[subject]}%; background-color: var(--button-bg)"></div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <p class="mt-2">Overall</p>
                            </div>
                        </div>
                    </div>
                `;
                tutorDetails.appendChild(div);

                // Update session sheet
                Object.values(sessions).forEach(session => {
                    if (session.tutorId === selectedTutorId) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td class="p-2">${session.date}</td>
                            <td class="p-2">${session.time}</td>
                            <td class="p-2">${session.duration}</td>
                            <td class="p-2">${session.tutor}</td>
                            <td class="p-2">${session.subjects.join(', ')}</td>
                            <td class="p-2">${session.cost} birr</td>
                            <td class="p-2">${session.status}</td>
                            <td class="p-2">
                                <button onclick="confirmAttendance(${session.sessionId})" class="px-2 py-1 rounded">Confirm Attendance</button>
                                <button onclick="confirmWaiting(${session.sessionId})" class="px-2 py-1 rounded">Confirm Waiting</button>
                                <button onclick="openProposeMakeupModal(${session.sessionId})" class="px-2 py-1 rounded">Propose Makeup</button>
                                <button onclick="openEditSubjectsModal(${session.sessionId})" class="px-2 py-1 rounded">Edit Subjects</button>
                            </td>
                        `;
                        sessionTable.appendChild(tr);
                    }
                });

                checkVideoCallAvailability(selectedTutorId);
            } else {
                tutorDetails.innerHTML = '<p class="no-results">No matching results found.</p>';
                sessionTable.innerHTML = '<tr><td colspan="8" class="p-2 no-results">No sessions found.</td></tr>';
            }
        }

        // Learning Preference Change Modal
        function openPreferenceChangeModal() {
            document.getElementById('preference-change-modal').classList.remove('hidden');
            trapFocus(document.getElementById('preference-change-modal'));
        }

        function closePreferenceChangeModal() {
            document.getElementById('preference-change-modal').classList.add('hidden');
            restoreFocus();
        }

        function submitPreferenceChange() {
            const newPreference = document.getElementById('new-preference').value;
            students[1].preferences[selectedTutorId] = newPreference;
            searchTutorsProfile();
            updateTutorDetails();
            alert('Learning preference change requested');
            closePreferenceChangeModal();
        }

        // Search Tutors
        function searchTutorsProfile() {
            const searchTerm = document.getElementById('tutor-search').value.trim().toLowerCase();
            const tutorTable = document.getElementById('tutor-table');
            tutorTable.innerHTML = '';
            Object.values(tutors).forEach(tutor => {
                const matchesName = searchTerm === '' || tutor.name.toLowerCase().includes(searchTerm);
                const matchesSubject = searchTerm === '' || tutor.subjects.some(subject => subject.toLowerCase().includes(searchTerm));
                if (matchesName || matchesSubject) {
                    const progress = students[1].progress.tutors[tutor.id];
                    const strokeDashoffset = 283 * (1 - progress.overall / 100);
                    const preference = students[1].preferences[tutor.id] || 'Not set';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="p-2"><a href="tutor-profile.html?tutorId=${tutor.id}" class="hover:underline">${tutor.name}</a></td>
                        <td class="p-2">${tutor.subjects.join(', ')}</td>
                        <td class="p-2">${preference}</td>
                        <td class="p-2">
                            <div class="relative inline-block group">
                                <div class="relative w-16 h-16">
                                    <svg class="w-full h-full" viewBox="0 0 100 100">
                                        <circle class="text-gray-200" stroke-width="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                        <circle class="progress-circle" stroke-width="10" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" stroke-dasharray="283" stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 50 50)"/>
                                    </svg>
                                    <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold">${progress.overall}%</span>
                                </div>
                                <div class="absolute hidden group-hover:block p-4 rounded-lg shadow-lg z-10 w-64 -left-20 top-16">
                                    <h4 class="text-sm font-semibold mb-2">Subject Progress</h4>
                                    ${tutor.subjects.map(subject => `
                                        <div class="mb-2">
                                            <p class="text-sm">${subject}: ${progress.subjects[subject]}%</p>
                                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                                <div class="h-2.5 rounded-full" style="width: ${progress.subjects[subject]}%; background-color: var(--button-bg)"></div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </td>
                            <td class="p-2">
                                <button onclick="openMyTutorModal(${tutor.id})" class="hover:underline">View</button>
                            </td>
                        `;
                    tutorTable.appendChild(tr);
                }
            });
        }

        // Chat Modal
        function openChatModal(tutorId) {
            const tutor = tutors[tutorId];
            document.getElementById('chat-modal').querySelector('h3').textContent = `Chat with ${tutor.name}`;
            document.getElementById('chat-modal').dataset.tutorId = tutorId;
            document.getElementById('chat-modal').classList.remove('hidden');
            trapFocus(document.getElementById('chat-modal'));
        }

        function closeChatModal() {
            document.getElementById('chat-modal').classList.add('hidden');
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
    console.log(`Message sent to tutor ${tutorId}: ${message}`);
}

// Rating Modal
function openRatingModal() {
    document.getElementById('rating-modal').classList.remove('hidden');
    trapFocus(document.getElementById('rating-modal'));
}

function closeRatingModal() {
    document.getElementById('rating-modal').classList.add('hidden');
    restoreFocus();
}

function submitRating() {
    const rating = document.getElementById('rating-value').value;
    const comment = document.getElementById('rating-comment').value.trim();
    const dislike = document.getElementById('rating-dislike').checked;
    if (!rating) {
        alert('Please select a rating');
        return;
    }
    console.log(`Rating submitted for tutor ${selectedTutorId}: ${rating} stars, Comment: ${comment}, Dislike: ${dislike}`);
    alert('Rating submitted successfully');
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

// Propose Makeup Modal
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
    if (!date || !time) {
        alert('Please select date and time');
        return;
    }
    sessions[sessionId].makeup = { date, time, duration };
    console.log(`Makeup session proposed for session ${sessionId}: ${date} at ${time} for ${duration}`);
    alert('Makeup session proposed');
    closeProposeMakeupModal();
}

// Edit Subjects Modal
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
    const subjects = document.getElementById('edit-subjects-input').value.split(',').map(s => s.trim()).filter(s => s);
    sessions[sessionId].subjects = subjects;
    alert('Session subjects updated');
    closeEditSubjectsModal();
    updateTutorDetails();
}

// Payment Modal
function openPaymentModal() {
    document.getElementById('payment-modal').classList.remove('hidden');
    trapFocus(document.getElementById('payment-modal'));
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
    restoreFocus();
}

function selectBank(bank) {
    console.log(`Selected payment method: ${bank}`);
    alert(`Payment method ${bank} selected`);
    closePaymentModal();
}

// Session Management
function confirmAttendance(sessionId) {
    sessions[sessionId].studentConfirmed = true;
    sessions[sessionId].status = sessions[sessionId].tutorConfirmed ? 'Confirmed' : 'Awaiting Tutor Confirmation';
    alert('Attendance confirmed');
    updateTutorDetails();
}

function confirmWaiting(sessionId) {
    sessions[sessionId].waiting.student = true;
    alert('Waiting status confirmed');
    updateTutorDetails();
}

// Focus Trap for Accessibility
let lastFocusedElement;
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('mobile-theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('edit-profile-btn').addEventListener('click', openEditProfileModal);
    document.getElementById('menu-btn').addEventListener('click', () => {
        const mobileMenu = document.getElementById('mobile-menu');
        const isOpen = mobileMenu.classList.contains('open');
        mobileMenu.classList.toggle('open');
        document.getElementById('menu-btn').setAttribute('aria-expanded', !isOpen);
    });
    initProfile();
    searchTutorsProfile();
});