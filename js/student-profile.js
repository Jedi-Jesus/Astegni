document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        themeToggle.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    });

    // Verified Badge Toggle (Mock logic for ID and face scan)
    const verifiedBadge = document.querySelector('.verified-badge');
    const isVerified = true; // Mock condition; replace with actual ID/face scan logic
    if (isVerified) {
        verifiedBadge.textContent = 'Verified';
        verifiedBadge.classList.add('verified');
    } else {
        verifiedBadge.textContent = 'Unverified';
        verifiedBadge.classList.add('unverified');
    }

    // Attendance Records
    const attendanceRecords = [];

    // Mock Data for Tutors and Courses
    const tutors = [
        {
            name: 'Jane Smith',
            subjects: ['Math', 'Physics'],
            learningMethod: 'Online',
            progress: 85,
            progressDetails: { Math: 90, Physics: 80 },
            sessions: [
                { date: '07/31/2025', time: '02:44 PM', duration: '1 hr', subject: 'Math' },
                { date: '08/01/2025', time: '02:00 PM', duration: '1 hr', subject: 'Physics' }
            ]
        },
        {
            name: 'John Brown',
            subjects: ['Chemistry', 'Biology'],
            learningMethod: 'In-Person',
            progress: 78,
            progressDetails: { Chemistry: 75, Biology: 80 },
            sessions: [
                { date: '07/31/2025', time: '01:30 PM', duration: '1 hr', subject: 'Physics' }
            ]
        },
        {
            name: 'Alice Johnson',
            subjects: ['English', 'Algebra'],
            learningMethod: 'Online',
            progress: 92,
            progressDetails: { English: 95, Algebra: 90 },
            sessions: [
                { date: '08/01/2025', time: '10:00 AM', duration: '1 hr', subject: 'Chemistry' }
            ]
        }
    ];

    const courses = [
        'Algebra',
        'Physics',
        'Chemistry',
        'Biology',
        'English',
        'Philosophy'
    ];

    // Populate Tutor Table
    const tutorTableBody = document.querySelector('#tutor-table tbody');
    function populateTutorTable(filteredTutors = tutors) {
        tutorTableBody.innerHTML = '';
        filteredTutors.forEach((tutor, index) => {
            const row = document.createElement('tr');
            row.classList.add('slide-in');
            row.innerHTML = `
                <td><a href="view-tutor.html">${tutor.name}</a></td>
                <td>${tutor.subjects.join(', ')}</td>
                <td>${tutor.learningMethod}</td>
                <td>
                    <div class="progress-circle" data-progress="${tutor.progress}">
                        <span>${tutor.progress}%</span>
                        <div class="tooltip">
                            ${Object.entries(tutor.progressDetails).map(([subject, percent]) => `
                                <p>${subject}: ${percent}%</p>
                            `).join('')}
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${tutor.progress}%"></div>
                            </div>
                        </div>
                    </div>
                </td>
                <td><a href="#" class="view-tutor-details" data-tutor-index="${index}">View</a></td>
            `;
            tutorTableBody.appendChild(row);
        });
    }
    populateTutorTable();

    // Tutor Search
    const tutorSearchInput = document.querySelector('#tutor-search');
    tutorSearchInput.addEventListener('input', () => {
        const query = tutorSearchInput.value.toLowerCase();
        const filteredTutors = tutors.filter(tutor =>
            tutor.name.toLowerCase().includes(query) ||
            tutor.subjects.some(subject => subject.toLowerCase().includes(query))
        );
        populateTutorTable(filteredTutors);
    });

    // Course Search
    const courseSearchInput = document.querySelector('#course-search');
    const courseResultDiv = document.querySelector('#course-result');
    function populateCourseResults(query = '') {
        courseResultDiv.innerHTML = '';
        if (!query) {
            courseResultDiv.innerHTML = `
                <div class="search-course slide-in">
                    <button class="search-course-btn cta-button bg-blue-600">Search Course</button>
                </div>
            `;
            const searchCourseBtn = courseResultDiv.querySelector('.search-course-btn');
            searchCourseBtn.addEventListener('click', () => {
                const query = courseSearchInput.value.trim();
                if (query) populateCourseResults(query);
            });
            return;
        }
        const queryLower = query.toLowerCase();
        const exactMatch = courses.find(course => course.toLowerCase() === queryLower);
        if (exactMatch) {
            const tutorCount = tutors.filter(tutor => tutor.subjects.includes(exactMatch)).length;
            courseResultDiv.innerHTML = `
                <div class="course-found slide-in">
                    <p>Found <strong>${exactMatch}</strong> with ${tutorCount} tutor${tutorCount === 1 ? '' : 's'} available</p>
                    <button class="find-tutors-btn cta-button bg-blue-600">Find Tutors</button>
                </div>
            `;
            const findTutorsBtn = courseResultDiv.querySelector('.find-tutors-btn');
            findTutorsBtn.addEventListener('click', () => {
                window.location.href = 'find-tutors.html';
            });
        } else {
            const partialMatches = courses.filter(course => course.toLowerCase().startsWith(queryLower));
            if (partialMatches.length > 0) {
                const ul = document.createElement('ul');
                ul.classList.add('course-list');
                partialMatches.forEach(course => {
                    const li = document.createElement('li');
                    li.classList.add('course-item', 'slide-in');
                    li.textContent = course;
                    ul.appendChild(li);
                });
                courseResultDiv.appendChild(ul);
                const findTutorsBtn = document.createElement('button');
                findTutorsBtn.classList.add('find-tutors-btn', 'cta-button', 'bg-blue-600', 'slide-in');
                findTutorsBtn.textContent = 'Find Tutors';
                courseResultDiv.appendChild(findTutorsBtn);
                findTutorsBtn.addEventListener('click', () => {
                    window.location.href = 'find-tutors.html';
                });
            } else {
                courseResultDiv.innerHTML = `
                    <div class="course-not-found slide-in">
                        <p>Course <strong>${query}</strong> not found</p>
                        <button class="request-course-btn cta-button bg-blue-600">Request Course</button>
                    </div>
                `;
                const requestCourseBtn = courseResultDiv.querySelector('.request-course-btn');
                requestCourseBtn.addEventListener('click', () => {
                    console.log(`Course request submitted: ${query}`);
                    courseResultDiv.innerHTML = `
                        <div class="course-submitted slide-in">
                            <span class="checkmark">✔</span>
                            <p>Course submitted. We'll work very hard to find a tutor on this subject.</p>
                        </div>
                    `;
                });
            }
        }
    }
    populateCourseResults();

    courseSearchInput.addEventListener('input', () => {
        const query = courseSearchInput.value.trim();
        populateCourseResults(query);
    });

    // Session Time Logic with Live Counter
    function updateSessionTimes() {
        const now = new Date(); // Use current browser time, adjusted for EAT
        const sessionRows = document.querySelectorAll('.sessions-modal tbody tr, .tutor-details-modal tbody tr');
        sessionRows.forEach(row => {
            const dateCell = row.cells[0].textContent; // e.g., "07/31/2025"
            const timeCell = row.cells[1].textContent; // e.g., "02:44 PM"
            const isSessionsModal = row.closest('.sessions-modal');
            const tutorCell = isSessionsModal ? row.cells[3] : null; // Tutor name in sessions-modal only
            const subjectCell = isSessionsModal ? row.cells[4] : row.cells[3]; // Subject (adjust for tutor-details-modal)
            const actionCell = isSessionsModal ? row.cells[5] : row.cells[4]; // Action column
            const sessionDateTime = new Date(`${dateCell} ${timeCell} EAT`);
            const timeDiffMinutes = Math.floor((now - sessionDateTime) / (1000 * 60));

            const lateText = actionCell.querySelector('.time-late');
            const confirmBtn = actionCell.querySelector('.confirm-attendance-btn');
            const makeupBtn = actionCell.querySelector('.propose-makeup-btn');

            if (timeDiffMinutes >= 0) {
                // Session time reached or passed
                if (lateText) lateText.textContent = `${timeDiffMinutes} minutes late`;
                if (confirmBtn) confirmBtn.style.display = 'inline-block';
                if (makeupBtn) makeupBtn.style.display = 'inline-block';
            } else {
                // Session is in the future
                if (lateText) lateText.textContent = '';
                if (confirmBtn) confirmBtn.style.display = 'none';
                if (makeupBtn) makeupBtn.style.display = 'none';
            }

            // Handle Confirm Attendance
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const tutorName = isSessionsModal 
                        ? tutorCell.textContent 
                        : row.closest('.modal').querySelector('.tutor-info a')?.textContent || 'Unknown';
                    const record = {
                        session: `${subjectCell.textContent} with ${tutorName}`,
                        minutesLate: timeDiffMinutes
                    };
                    attendanceRecords.push(record);
                    console.log('Attendance recorded:', record);
                    confirmBtn.style.display = 'none'; // Hide after clicking
                };
            }

            // Handle Propose Makeup
            if (makeupBtn) {
                makeupBtn.onclick = () => {
                    const tutorName = isSessionsModal 
                        ? tutorCell.textContent 
                        : row.closest('.modal').querySelector('.tutor-info a')?.textContent || 'Tutor';
                    console.log(`Proposing makeup for session: ${subjectCell.textContent} with ${tutorName}`);
                };
            }
        });
    }
    updateSessionTimes();
    setInterval(updateSessionTimes, 1000); // Update every second

    // Modal Handling with Event Delegation
    const modals = document.querySelectorAll('.modal');
    const modalButtonMap = {
        'edit-profile-btn': 'edit-profile-modal',
        'sessions-btn': 'sessions-modal',
        'contact-parent-btn': 'parent-modal',
        'certifications-btn': 'certifications-modal',
        'add-course-btn': 'add-course-modal',
        'request-tutor-course-btn': 'request-tutor-course-modal',
        'request-parent-course-btn': 'request-parent-course-modal',
        'view-tutor-details': 'tutor-details-modal',
        'cover-edit': 'cover-upload-modal',
        'profile-edit': 'profile-upload-modal',
        'request-session-btn': 'request-session-modal',
        'close-request-session-btn': 'request-session-modal',
        'submit-session-request-btn': 'request-session-modal',
        'view-packages-btn': 'request-session-modal',
        'chat-btn': 'request-session-modal',
        'video-call-btn': 'request-session-modal'
    };

    document.addEventListener('click', (e) => {
        const target = e.target;
        const buttonClass = Array.from(target.classList).find(cls => modalButtonMap[cls]);
        if (buttonClass) {
            e.preventDefault(); // Prevent default link behavior
            const modalClass = modalButtonMap[buttonClass];
            const modal = document.querySelector(`.${modalClass}`);
            if (modal) {
                // Handle tutor-details-modal specifically
                if (buttonClass === 'view-tutor-details') {
                    const tutorIndex = target.getAttribute('data-tutor-index');
                    const tutor = tutors[tutorIndex];
                    if (tutor) {
                        const tutorInfo = modal.querySelector('.tutor-info');
                        tutorInfo.innerHTML = `
                            <img src="placeholder-tutor.jpg" alt="Tutor Profile Picture" class="tutor-profile-img">
                            <p><a href="view-tutor.html">${tutor.name}</a></p>
                            <p><strong>Rating:</strong> ★★★★☆</p>
                            <p><strong>Subject:</strong> ${tutor.subjects.join(', ')}</p>
                            <p><strong>Days:</strong> Mon, Wed, Fri</p>
                            <p><strong>Learning Preference:</strong> ${tutor.learningMethod}</p>
                            <div class="course-progress">
                                ${Object.entries(tutor.progressDetails).map(([subject, percent]) => `
                                    <div class="progress-circle" data-progress="${percent}">
                                        <span>${percent}%</span>
                                    </div>
                                    <span class="progress-label">${subject}</span>
                                `).join('')}
                                <div class="progress-circle cumulative" data-progress="${tutor.progress}">
                                    <span>${tutor.progress}%</span>
                                </div>
                                <span class="progress-label">Cumulative</span>
                            </div>
                            <button class="video-call-btn cta-button bg-blue-600">Video Call</button>
                            <button class="chat-btn cta-button bg-blue-600">Chat</button>
                            <button class="comment-rate-btn cta-button bg-blue-600">Comment and Rate</button>
                            <button class="request-learning-method-btn cta-button bg-blue-600">Request Learning Method Change</button>
                            <button class="request-session-btn cta-button bg-blue-600">Request Session</button>
                        `;
                        const sessionTableBody = modal.querySelector('tbody');
                        sessionTableBody.innerHTML = tutor.sessions.map(session => `
                            <tr class="slide-in">
                                <td>${session.date}</td>
                                <td>${session.time}</td>
                                <td>${session.duration}</td>
                                <td>${session.subject}</td>
                                <td>
                                    <span class="time-late"></span>
                                    <button class="confirm-attendance-btn">Confirm Attendance</button>
                                    <button class="propose-makeup-btn">Propose Makeup</button>
                                </td>
                            </tr>
                        `).join('');
                        updateSessionTimes(); // Update session times after populating
                        const requestLearningMethodBtn = modal.querySelector('.request-learning-method-btn');
                        const requestSessionBtn = modal.querySelector('.request-session-btn');
                        requestLearningMethodBtn.addEventListener('click', () => {
                            console.log(`Requesting learning preference change for ${tutor.name} (to be implemented)`);
                        });
                        requestSessionBtn.addEventListener('click', () => {
                            document.querySelector('.request-session-modal').classList.add('active');
                            console.log(`Opening request session modal for ${tutor.name}`);
                        });
                    }
                }
                modal.classList.add('active');
                console.log(`Opening modal: ${modalClass}`);
            } else {
                console.error(`Modal not found for class: ${modalClass}`);
            }
        }
    });

    const closeModalButtons = document.querySelectorAll('.close, .close-request-session-btn');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            modal.classList.remove('active');
        });
    });

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Request Session Modal Functions
    window.toggleChildSearch = function() {
        const childInput = document.querySelector('#session-child');
        const selfCheckbox = document.querySelector('#session-self');
        childInput.disabled = selfCheckbox.checked;
        childInput.value = selfCheckbox.checked ? '' : childInput.value;
        document.querySelector('#session-child-suggestions').classList.add('hidden');
    };

    window.openPackagesModal = function() {
        console.log('Opening packages modal (to be implemented)');
    };

    window.submitSessionRequest = function() {
        console.log('Submitting session request (to be implemented)');
    };

    window.openChatModal = function() {
        console.log('Opening chat modal (to be implemented)');
    };

    window.openVideoCallModal = function() {
        console.log('Opening video call modal (to be implemented)');
    };

    window.closeRequestSessionModal = function() {
        document.querySelector('.request-session-modal').classList.remove('active');
    };

    // Image Upload Previews and Updates
    const coverUploadInput = document.querySelector('.cover-upload-input');
    const coverPreviewImg = document.querySelector('.cover-preview-img');
    const coverImg = document.querySelector('.cover-img');
    const profileUploadInput = document.querySelector('.profile-upload-input');
    const profilePreviewImg = document.querySelector('.profile-preview-img');
    const profileImg = document.querySelector('.profile-img');

    coverUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            coverPreviewImg.src = url;
        }
    });

    profileUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            profilePreviewImg.src = url;
        }
    });

    document.querySelector('.cover-upload-modal form').addEventListener('submit', (e) => {
        e.preventDefault();
        const file = coverUploadInput.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            coverImg.src = url;
            coverPreviewImg.src = url;
            coverUploadInput.value = '';
            const modal = document.querySelector('.cover-upload-modal');
            modal.classList.remove('active');
        }
    });

    document.querySelector('.profile-upload-modal form').addEventListener('submit', (e) => {
        e.preventDefault();
        const file = profileUploadInput.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            profileImg.src = url;
            profilePreviewImg.src = url;
            profileUploadInput.value = '';
            const modal = document.querySelector('.profile-upload-modal');
            modal.classList.remove('active');
        }
    });

    // Ad Rotation
    const middleAds = document.querySelectorAll('.ad-placeholder .ad-card');
    const rightAdCards = document.querySelectorAll('.right-ad-placeholder .ad-card');
    let middleAdIndex = 0;
    let rightAdIndex = 0;

    const rightAdContents = [
        'Ad Placeholder 1 (300x250)',
        'Ad Placeholder 2 (300x250)',
        'Ad Placeholder 3 (300x250)',
        'Ad Placeholder 4 (300x250)'
    ];

    function rotateMiddleAds() {
        middleAds.forEach((ad, index) => {
            ad.style.display = index === middleAdIndex ? 'flex' : 'none';
        });
        middleAdIndex = (middleAdIndex + 1) % middleAds.length;
    }

    function rotateRightAds() {
        rightAdCards[0].textContent = rightAdContents[rightAdIndex];
        rightAdCards[1].textContent = rightAdContents[(rightAdIndex + 1) % rightAdContents.length];
        rightAdIndex = (rightAdIndex + 2) % rightAdContents.length;
    }

    setInterval(rotateMiddleAds, 8000);
    setInterval(rotateRightAds, 8000);
});