var gk_isXlsx = true;
        var gk_xlsxFileLookup = {};
        var gk_fileData = [];
        const notifications = {};
        const courseRequests = {};
        let lastFocusedElement = null;

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
            const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
            if (themeToggle) {
                themeToggle.querySelector('svg').innerHTML = icon;
            }
            if (mobileThemeToggle) {
                mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon}</svg>`;
            }
        }

        function initializeTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeToggleIcon(savedTheme);
        }

        function checkNotifications() {
            const hasNotifications = Object.values(notifications).length > 0 || Object.values(courseRequests).some(req => req.status === 'Pending');
            document.getElementById('notification-dot').classList.toggle('hidden', !hasNotifications);
            document.getElementById('mobile-notification-dot').classList.toggle('hidden', !hasNotifications);
        }

        function openNotificationModal() {
            const notificationContent = document.getElementById('notification-content');
            const notificationList = Object.values(notifications);
            const requestList = Object.values(courseRequests).filter(req => req.status === 'Pending');
            if (notificationList.length === 0 && requestList.length === 0) {
                notificationContent.innerHTML = 'You have no notifications.';
            } else {
                notificationContent.innerHTML = '';
                notificationList.forEach(n => {
                    const div = document.createElement('div');
                    div.className = 'mb-2';
                    div.innerHTML = `
                        <p>${n.message}</p>
                        <p class="text-sm opacity-70">${n.date}</p>
                    `;
                    notificationContent.appendChild(div);
                });
                requestList.forEach(req => {
                    const div = document.createElement('div');
                    div.className = 'mb-2';
                    div.innerHTML = `
                        <p>Course request for "${req.course}" is pending.</p>
                        <p class="text-sm opacity-70">${req.date}</p>
                    `;
                    notificationContent.appendChild(div);
                });
            }
            document.getElementById('notification-modal').classList.remove('hidden');
            trapFocus(document.getElementById('notification-modal'));
        }

        function closeNotificationModal() {
            document.getElementById('notification-modal').classList.add('hidden');
            restoreFocus();
        }

        let tutors = [
            {
                id: 1,
                name: 'Amanuel Tesfaye',
                courses: ['Math', 'Physics'],
                rating: 4.5,
                image: 'https://picsum.photos/100',
                about: 'Experienced tutor with a passion for teaching Math and Physics.',
                videos: [
                    'https://via.placeholder.com/640x360.mp4',
                    'https://via.placeholder.com/320x180.mp4',
                    'https://via.placeholder.com/320x180.mp4'
                ],
                certifications: ['BSc in Physics', 'Certified Math Instructor'],
                fees: { 'Math': 300, 'Physics': 350 },
                followers: 0,
                school: 'Addis Ababa University',
                location: 'Addis Ababa'
            },
            {
                id: 2,
                name: 'Kebede Worku',
                courses: ['Chemistry', 'Biology'],
                rating: 4.2,
                image: 'https://picsum.photos/101',
                about: 'Dedicated tutor specializing in Chemistry and Biology.',
                videos: [
                    'https://via.placeholder.com/640x360.mp4',
                    'https://via.placeholder.com/320x180.mp4',
                    'https://via.placeholder.com/320x180.mp4'
                ],
                certifications: ['MSc in Chemistry', 'Biology Teaching Certificate'],
                fees: { 'Chemistry': 320, 'Biology': 340 },
                followers: 0,
                school: 'Bahir Dar University',
                location: 'Bahir Dar'
            }
        ];

        function filledCell(cell) {
            return cell !== '' && cell != null;
        }

        function loadFileData(filename) {
            if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
                try {
                    var workbook = XLSX.read(gk_xlsxFileLookup[filename], { type: 'base64' });
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
                    const rows = csv.split('\n').slice(1).filter(row => row.trim());
                    tutors = rows.map((row, index) => {
                        const cols = row.split(',');
                        return {
                            id: index + 1,
                            name: cols[0] || `Tutor ${index + 1}`,
                            courses: cols[1] ? cols[1].split('|') : ['Unknown'],
                            rating: parseFloat(cols[2]) || 0,
                            image: cols[3] || 'https://picsum.photos/100',
                            about: cols[4] || 'No description available.',
                            videos: cols[5] ? cols[5].split('|') : [],
                            certifications: cols[6] ? cols[6].split('|') : [],
                            fees: cols[7] ? JSON.parse(cols[7]) : {},
                            followers: parseInt(cols[8]) || 0,
                            school: cols[9] || 'Unknown',
                            location: cols[10] || 'Unknown'
                        };
                    });
                    return csv;
                } catch (e) {
                    console.error(e);
                    return "";
                }
            }
            return gk_fileData[filename] || "";
        }

        function displayTutors(filteredTutors) {
            const tutorList = document.getElementById('tutor-list');
            const noTutorsMessage = document.getElementById('no-tutors');
            tutorList.innerHTML = '';

            if (filteredTutors.length === 0) {
                noTutorsMessage.classList.remove('hidden');
                return;
            }

            noTutorsMessage.classList.add('hidden');

            filteredTutors.forEach(tutor => {
                const tutorCard = document.createElement('div');
                tutorCard.className = 'bg-white p-6 rounded-lg shadow-md tutor-card flex items-center space-x-4';
                const tutorData = encodeURIComponent(JSON.stringify(tutor));
                tutorCard.innerHTML = `
                    <img src="${tutor.image}" alt="${tutor.name}" class="w-16 h-16 rounded-full">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold">${tutor.name}</h3>
                        <p class="text-gray-600">Courses: ${tutor.courses.join(', ')}</p>
                        <p class="text-yellow-500">Rating: ${'★'.repeat(Math.floor(tutor.rating))}${tutor.rating % 1 ? '☆' : ''} (${tutor.rating})</p>
                        <p class="text-gray-600">School: ${tutor.school}</p>
                        <p class="text-gray-600">Location: ${tutor.location}</p>
                        <p class="text-gray-700 mt-2">${tutor.about}</p>
                        <a href="view-profile.html?tutor=${tutorData}" class="cta-button px-4 py-2 rounded-lg inline-block mt-2">View Tutor</a>
                    </div>
                `;
                tutorList.appendChild(tutorCard);
            });
        }

        function searchTutors() {
            const searchInput = document.getElementById('search-input').value.trim().toLowerCase();
            const tutorList = document.getElementById('tutor-list');
            const noTutors = document.getElementById('no-tutors');

            tutorList.innerHTML = '';
            noTutors.classList.add('hidden');

            if (!searchInput) {
                noTutors.classList.remove('hidden');
                return;
            }

            const filteredTutors = tutors.filter(tutor =>
                tutor.name.toLowerCase().includes(searchInput) ||
                tutor.courses.some(course => course.toLowerCase().includes(searchInput)) ||
                tutor.rating.toString().includes(searchInput) ||
                tutor.school.toLowerCase().includes(searchInput) ||
                tutor.location.toLowerCase().includes(searchInput)
            );

            const isCourseSearch = !tutors.some(tutor =>
                tutor.name.toLowerCase().includes(searchInput) ||
                tutor.rating.toString().includes(searchInput) ||
                tutor.school.toLowerCase().includes(searchInput) ||
                tutor.location.toLowerCase().includes(searchInput)
            ) && !filteredTutors.length;

            if (filteredTutors.length === 0) {
                noTutors.classList.remove('hidden');
                if (isCourseSearch) {
                    noTutors.innerHTML = `
                        <p>No tutors found for "${searchInput}".</p>
                        <button class="cta-button px-4 py-2 rounded-lg mt-2" onclick="openRequestCourseModal('${searchInput}')" aria-label="Request course ${searchInput}">Request Course</button>
                    `;
                } else {
                    noTutors.innerHTML = 'No tutors found';
                }
            } else {
                noTutors.classList.add('hidden');
            }

            displayTutors(filteredTutors);
        }

        function useMyLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const { latitude, longitude } = position.coords;
                    alert(`Location: Latitude ${latitude}, Longitude ${longitude}`);
                    // Future: Filter tutors by location
                }, error => {
                    alert('Unable to retrieve location. Please try again.');
                    console.error(error);
                });
            } else {
                alert('Geolocation is not supported by this browser.');
            }
        }

        function openRequestCourseModal(course) {
            document.getElementById('request-course-name').value = course;
            document.getElementById('request-course-modal').classList.remove('hidden');
            trapFocus(document.getElementById('request-course-modal'));
        }

        function closeRequestCourseModal() {
            document.getElementById('request-course-modal').classList.add('hidden');
            document.getElementById('request-course-name').value = '';
            document.getElementById('request-contact-info').value = '';
            restoreFocus();
        }

        function submitCourseRequest() {
            const course = document.getElementById('request-course-name').value.trim();
            const contactInfo = document.getElementById('request-contact-info').value.trim();
            if (!course) {
                alert('Please enter a course name.');
                return;
            }
            const requestId = Object.keys(courseRequests).length + 1;
            courseRequests[requestId] = {
                id: requestId,
                course,
                user: contactInfo || 'Anonymous',
                date: new Date().toLocaleString(),
                status: 'Pending'
            };
            logAction(`Course request submitted: ${course}`);
            alert('Course request submitted successfully!');
            closeRequestCourseModal();
            checkNotifications();
        }

        function logAction(action) {
            const newId = Object.keys(courseRequests).length + 1;
            courseRequests[newId] = {
                id: newId,
                action,
                user: 'Anonymous',
                date: new Date().toLocaleString()
            };
        }

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

        function toggleProfileDropdown() {
            const dropdown = document.getElementById('profile-dropdown');
            const mobileDropdown = document.getElementById('mobile-profile-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('hidden');
            }
            if (mobileDropdown) {
                mobileDropdown.classList.toggle('hidden');
            }
        }

        function toggleVerification() {
            alert('Verification toggled');
        }

        function openLoginRegisterModal() {
            document.getElementById('login-register-modal').classList.remove('hidden');
            trapFocus(document.getElementById('login-register-modal'));
        }

        function closeLoginRegisterModal() {
            document.getElementById('login-register-modal').classList.add('hidden');
            restoreFocus();
        }

        function showLogin() {
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('register-form').classList.add('hidden');
        }

        function showRegister() {
            document.getElementById('register-form').classList.remove('hidden');
            document.getElementById('login-form').classList.add('hidden');
            toggleRegisterFields();
        }

        function toggleRegisterFields() {
            const registerAs = document.getElementById('register-as').value;
            document.getElementById('gender-field').classList.toggle('hidden', registerAs !== 'tutor' && registerAs !== 'student');
            document.getElementById('guardian-type-field').classList.toggle('hidden', registerAs !== 'guardian');
            document.getElementById('institute-type-field').classList.toggle('hidden', registerAs !== 'institute');
        }
function toggleInput(type, method) {
        const prefix = type;
        document.getElementById(`${prefix}-email`).classList.toggle('hidden', method !== 'email');
        document.getElementById(`${prefix}-phone`).classList.toggle('hidden', method !== 'phone');
        document.getElementById(`${prefix}-country`).classList.toggle('hidden', method !== 'phone');
        document.getElementById(`${prefix}-social-fields`).classList.toggle('hidden', method !== 'social');
        document.getElementById(`${prefix}-social-button`).classList.toggle('hidden', method !== 'social');
    }

    function updatePhonePlaceholder(type) {
        const countryCode = document.getElementById(`${type}-country`).value;
        document.getElementById(`${type}-phone`).placeholder = countryCode + '912345678';
    }

    function updateSocialPlaceholder(type) {
        const platform = document.getElementById(`${type}-social-platform`).value;
        document.getElementById(`${type}-social-address`).placeholder = platform ? `Enter your ${platform} handle` : 'Enter social media address';
    }

    function togglePassword(id) {
        const input = document.getElementById(id);
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    function submitLogin() {
        const loginType = document.querySelector('input[name="login-type"]:checked').value;
        let identifier;
        if (loginType === 'email') {
            identifier = document.getElementById('login-email').value;
        } else if (loginType === 'phone') {
            identifier = document.getElementById('login-phone').value;
        } else {
            identifier = document.getElementById('login-social-address').value;
        }
        const password = document.getElementById('login-password').value;
        alert(`Logging in with ${loginType}: ${identifier}`);
        console.log(`Login: ${loginType}=${identifier}, Password=${password}`);
        closeLoginRegisterModal();
    }

    function submitRegistration() {
        const registerAs = document.getElementById('register-as').value;
        const loginType = document.querySelector('input[name="register-type"]:checked').value;
        let identifier;
        if (loginType === 'email') {
            identifier = document.getElementById('register-email').value;
        } else if (loginType === 'phone') {
            identifier = document.getElementById('register-phone').value;
        } else {
            identifier = document.getElementById('register-social-address').value;
        }
        const password = document.getElementById('register-password').value;
        const repeatPassword = document.getElementById('register-repeat-password').value;
        if (password !== repeatPassword) {
            alert('Passwords do not match');
            return;
        }
        alert(`Registering as ${registerAs} with ${loginType}: ${identifier}`);
        console.log(`Register: ${registerAs}, ${loginType}=${identifier}, Password=${password}`);
        closeLoginRegisterModal();
    }

    function openAdvertiseModal() {
        document.getElementById('advertise-modal').classList.remove('hidden');
        trapFocus(document.getElementById('advertise-modal'));
    }

    function closeAdvertiseModal() {
        document.getElementById('advertise-modal').classList.add('hidden');
        restoreFocus();
    }

    function toggleAdvertiseFields() {
        const advertiseAs = document.getElementById('advertise-as').value;
        document.getElementById('advertise-gender-field').classList.toggle('hidden', advertiseAs !== 'tutor');
        document.getElementById('advertise-institute-type-field').classList.toggle('hidden', advertiseAs !== 'institute');
    }

    function submitAdvertisement() {
        const advertiseAs = document.getElementById('advertise-as').value;
        const loginType = document.querySelector('input[name="advertise-type"]:checked').value;
        let identifier;
        if (loginType === 'email') {
            identifier = document.getElementById('advertise-email').value;
        } else if (loginType === 'phone') {
            identifier = document.getElementById('advertise-phone').value;
        } else {
            identifier = document.getElementById('advertise-social-address').value;
        }
        const password = document.getElementById('advertise-password').value;
        const repeatPassword = document.getElementById('advertise-repeat-password').value;
        if (password !== repeatPassword) {
            alert('Passwords do not match');
            return;
        }
        alert(`Advertising as ${advertiseAs} with ${loginType}: ${identifier}`);
        console.log(`Advertise: ${advertiseAs}, ${loginType}=${identifier}, Password=${password}`);
        closeAdvertiseModal();
    }

    function socialLogin(platform) {
        alert(`Logging in with ${platform}`);
        console.log(`Social Login: ${platform}`);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeTheme();
        loadFileData('tutors.xlsx');
        document.getElementById('no-tutors')?.classList.remove('hidden');
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', searchTutors);
        }
        const menuBtn = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
        const loginRegisterBtn = document.querySelector('[onclick="openLoginRegisterModal()"]');
        const advertiseBtn = document.querySelector('[onclick="openAdvertiseModal()"]');
        if (loginRegisterBtn) {
            loginRegisterBtn.addEventListener('click', openLoginRegisterModal);
        }
        if (advertiseBtn) {
            advertiseBtn.addEventListener('click', openAdvertiseModal);
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = ['login-register-modal', 'advertise-modal', 'notification-modal', 'request-course-modal'];
                modals.forEach(id => {
                    const modal = document.getElementById(id);
                    if (modal && !modal.classList.contains('hidden')) {
                        if (id === 'request-course-modal') {
                            closeRequestCourseModal();
                        } else {
                            modal.classList.add('hidden');
                            restoreFocus();
                        }
                    }
                });
            }
        });
    });