
        // Data Objects
        const currentAdmin = {
            id: 1,
            email: 'admin@astegni.et',
            role: 'Super Admin',
            name: 'Admin User',
            profilePic: 'https://via.placeholder.com/96',
            phone: '+251-912-345-678',
            location: 'Addis Ababa, Ethiopia',
            bio: 'Experienced administrator dedicated to enhancing educational platforms.',
            quote: 'Empowering education through innovation and collaboration.',
            rating: null
        };
        const advertisers = {
            1: {
                id: 1,
                name: 'EduAds Inc.',
                email: 'contact@eduads.com',
                phone: '+251912345680',
                profilePic: 'https://via.placeholder.com/128',
                coverImage: 'https://via.placeholder.com/1200x300',
                status: 'Active',
                rejectionCount: 0,
                suspensionEnd: null,
                location: 'Addis Ababa, Ethiopia',
                message: 'Looking for tutors in various subjects'
            },
            2: {
                id: 2,
                name: 'LearnEasy Ltd.',
                email: 'info@learneasy.et',
                phone: '+251911223344',
                profilePic: 'https://via.placeholder.com/128',
                coverImage: 'https://via.placeholder.com/1200x300',
                status: 'Active',
                rejectionCount: 0,
                suspensionEnd: null,
                location: 'Adama, Ethiopia',
                message: 'Promoting online courses for high school students'
            }
        };
        const bannedAdvertisers = {};
        const campaigns = {
            1: {
                id: 1,
                advertiserId: 1,
                name: 'Math Tutoring Promo',
                duration: 30,
                price: 19500,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Promote math tutoring with fun visuals' },
                reviewStatus: 'Under Review',
                moderationStatus: 'Pending',
                rejectionReason: '',
                rejectionCount: 0
            },
            2: {
                id: 2,
                advertiserId: 1,
                name: 'Science Campaign',
                duration: 15,
                price: 11250,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Science tutoring ad for all grades' },
                reviewStatus: 'Active',
                moderationStatus: 'Approved',
                rejectionReason: '',
                rejectionCount: 0
            },
            3: {
                id: 3,
                advertiserId: 1,
                name: 'Math Tutoring Promo',
                duration: 30,
                price: 19500,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Promote math tutoring with fun visuals' },
                reviewStatus: 'Under Review',
                moderationStatus: 'Pending',
                rejectionReason: '',
                rejectionCount: 0
            },
            4: {
                id: 4,
                advertiserId: 1,
                name: 'Math Tutoring Promo',
                duration: 30,
                price: 19500,
                adContent: { url: 'https://via.placeholder.com/150', description: 'Promote math tutoring with fun visuals' },
                reviewStatus: 'Under Review',
                moderationStatus: 'Pending',
                rejectionReason: '',
                rejectionCount: 0
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
        const schools = {
            1: {
                id: 1,
                name: 'Central Prep',
                phone: '+251-912-000-111',
                email: 'info@centralprep.et',
                location: 'Addis Ababa, Ethiopia',
                status: 'Approved',
                rating: 4.5
            },
            2: {
                id: 2,
                name: 'Riverside Academy',
                phone: '+251-912-000-222',
                email: 'contact@riverside.et',
                location: 'Bahir Dar, Ethiopia',
                status: 'Approved',
                rating: 4.0
            },
            3: {
                id: 3,
                name: 'Springfield High',
                phone: '+251-912-000-333',
                email: 'admin@springfield.et',
                location: 'Hawassa, Ethiopia',
                status: 'Approved',
                rating: 3.8
            }
        };
        const requestedSchools = {
            1: {
                id: 1,
                name: 'New Horizon School',
                phone: '+251-912-000-444',
                email: 'info@newhorizon.et',
                location: 'Adama, Ethiopia',
                status: 'Pending'
            },
            2: {
                id: 2,
                name: 'Bright Future Academy',
                phone: '+251-912-000-555',
                email: 'contact@brightfuture.et',
                location: 'Dire Dawa, Ethiopia',
                status: 'Pending'
            }
        };
        const requestedCourses = {
            1: {
                id: 1,
                name: 'Advanced Mathematics',
                schoolId: 1,
                description: 'Calculus and algebra for high school students',
                status: 'Pending'
            },
            2: {
                id: 2,
                name: 'Physics Fundamentals',
                schoolId: 2,
                description: 'Introductory physics for grade 10',
                status: 'Pending'
            }
        };
        const tutors = {
            1: {
                id: 1,
                name: 'Abebe Kebede',
                schoolId: 1,
                schoolName: 'Central Prep',
                schoolPhone: '+251-912-000-111',
                schoolRating: 4.5,
                type: 'Teacher',
                certifications: [
                    { certSchool: 'Addis University', certSchoolPhone: '+251-911-111-111', courseTitle: 'Calculus', type: 'Academic', certificate: 'BSc in Mathematics' },
                    { certSchool: 'Ethio College', certSchoolPhone: '+251-911-222-222', courseTitle: 'Algebra', type: 'Professional', certificate: 'Teaching Certificate' }
                ],
                experience: [
                    { company: 'Addis Tutoring', companyContact: 'contact@addistutoring.et', experiencedIn: 'Mathematics', years: '2018-2022', proof: 'https://via.placeholder.com/150', status: 'Unverified' },
                    { company: 'Ethio Education', companyContact: '+251-911-333-333', experiencedIn: 'Algebra', years: '2022-2023', proof: 'https://via.placeholder.com/150', status: 'Unverified' }
                ],
                status: 'Pending'
            },
            2: {
                id: 2,
                name: 'Marta Tesfaye',
                schoolId: 2,
                schoolName: 'Riverside Academy',
                schoolPhone: '+251-912-000-222',
                schoolRating: 4.0,
                type: 'Teacher',
                certifications: [
                    { certSchool: 'Bahir Dar University', certSchoolPhone: '+251-911-333-333', courseTitle: 'Physics', type: 'Academic', certificate: 'MSc in Physics' },
                    { certSchool: 'Global Institute', certSchoolPhone: '+251-911-444-444', courseTitle: 'English', type: 'Professional', certificate: 'TESOL Certification' }
                ],
                experience: [
                    { company: 'Global Tutors', companyContact: 'info@globaltutors.et', experiencedIn: 'Physics', years: '2019-2023', proof: 'https://via.placeholder.com/150', status: 'Unverified' }
                ],
                status: 'Pending'
            },
            3: {
                id: 3,
                name: 'Yared Alem',
                schoolId: null,
                schoolName: '',
                schoolPhone: '',
                schoolRating: 0,
                type: 'High School Student',
                certifications: [
                    { certSchool: 'Springfield High', certSchoolPhone: '+251-912-000-333', courseTitle: 'Biology', type: 'Academic', certificate: 'High School Certificate' }
                ],
                experience: [],
                status: 'Pending'
            }
        };
        const astegniComments = {
            1: {
                id: 1,
                userName: 'Yohannes Bekele',
                userType: 'Student',
                content: 'Astegni has a great platform for learning!',
                date: '2025-05-22',
                usabilityRating: 4,
                cultureRating: 4,
                managementRating: 3,
                roleRating: 4,
                developmentRating: 5,
                compensationRating: 4,
                worklifeRating: 4,
                mentalhealthRating: 4,
                isAdminComment: false
            },
            2: {
                id: 2,
                userName: 'Selamawit Tadesse',
                userType: 'Tutor',
                content: 'The course variety on Astegni is impressive.',
                date: '2025-05-23',
                usabilityRating: 5,
                cultureRating: 5,
                managementRating: 4,
                roleRating: 5,
                developmentRating: 5,
                compensationRating: 4,
                worklifeRating: 5,
                mentalhealthRating: 5,
                isAdminComment: false
            }
        };
        const adminComments = {
            1: {
                id: 1,
                userName: 'Amanuel Tesfaye',
                userType: 'Tutor',
                content: 'Great admin support!',
                date: '2025-05-20',
                rating: 5,
                isAdminComment: true
            },
            2: {
                id: 2,
                userName: 'Abebe Kebede',
                userType: 'Student',
                content: 'The admin was very helpful with my issue.',
                date: '2025-05-21',
                rating: 4,
                isAdminComment: true
            }
        };
        const systemImages = [];
        const newsItems = [];

        // Initialize Dashboard
        function initDashboard() {
            try {
                updateSummary();
                updateAdminProfile();
                searchAdvertisers();
                searchCampaigns();
                searchRejectedCampaigns();
                searchRejectedCampaignContent();
                updateNotifications();
                searchSchools();
                searchRequestedSchools();
                searchRequestedCourses();
                searchTutors();
                checkNotifications();
                searchAstegniComments();
                showTab('advertisers');
                console.log('Dashboard initialized successfully');
            } catch (error) {
                console.error('Error initializing dashboard:', error);
            }
        }

        // Update Summary
        function updateSummary() {
            try {
                const pendingReviews = Object.values(campaigns).filter(c => c.reviewStatus === 'Under Review').length;
                const schoolListingRequests = Object.values(requestedSchools).filter(s => s.status === 'Pending').length;
                const requestedCoursesCount = Object.values(requestedCourses).filter(c => c.status === 'Pending').length;
                const tutorConfirmations = Object.values(tutors).filter(t => t.status === 'Pending').length;
                const astegniCommentsCount = Object.values(astegniComments).length;
                document.getElementById('pending-reviews').textContent = pendingReviews;
                document.getElementById('school-listing-requests').textContent = schoolListingRequests;
                document.getElementById('requested-courses-count').textContent = requestedCoursesCount;
                document.getElementById('tutor-confirmations').textContent = tutorConfirmations;
                document.getElementById('user-comments').textContent = astegniCommentsCount;
                console.log('Summary updated:', { pendingReviews, schoolListingRequests, requestedCoursesCount, tutorConfirmations, astegniCommentsCount });
            } catch (error) {
                console.error('Error updating summary:', error);
            }
        }

        // Update Admin Profile
        function updateAdminProfile() {
            try {
                document.getElementById('admin-name').textContent = currentAdmin.name;
                document.getElementById('admin-profile-pic').src = currentAdmin.profilePic || 'https://via.placeholder.com/96';
                document.getElementById('profile-btn').querySelector('img').src = currentAdmin.profilePic || 'https://via.placeholder.com/32';
                document.getElementById('mobile-profile-btn').querySelector('img').src = currentAdmin.profilePicdocument.getElementById('mobile-profile-btn').querySelector('img').src = currentAdmin.profilePic || 'https://via.placeholder.com/32';
                document.getElementById('nav-profile-name').textContent = currentAdmin.name;
                document.getElementById('mobile-nav-profile-name').textContent = currentAdmin.name;
                document.getElementById('admin-phone').textContent = `Phone: ${currentAdmin.phone}`;
                document.getElementById('admin-email').textContent = `Email: ${currentAdmin.email}`;
                document.getElementById('admin-location').textContent = `Location: ${currentAdmin.location}`;
                document.getElementById('admin-bio').textContent = `Bio: ${currentAdmin.bio}`;
                document.getElementById('admin-quote').textContent = `"${currentAdmin.quote}"`;
                const rating = calculateAdminRating();
                displayRating(rating, 'admin-rating');
                console.log('Admin profile updated:', currentAdmin);
            } catch (error) {
                console.error('Error updating admin profile:', error);
            }
        }

        // Calculate Admin Rating
        function calculateAdminRating() {
            try {
                const comments = Object.values(adminComments);
                if (comments.length === 0) return 0;
                const total = comments.reduce((sum, comment) => sum + comment.rating, 0);
                return (total / comments.length).toFixed(1);
            } catch (error) {
                console.error('Error calculating admin rating:', error);
                return 0;
            }
        }

        // Display Rating
        function displayRating(rating, elementId) {
            try {
                const ratingElement = document.getElementById(elementId);
                ratingElement.innerHTML = '';
                const fullStars = Math.floor(rating);
                const halfStar = rating % 1 >= 0.5;
                for (let i = 0; i < 5; i++) {
                    if (i < fullStars) {
                        ratingElement.innerHTML += '<i class="fas fa-star"></i>';
                    } else if (i === fullStars && halfStar) {
                        ratingElement.innerHTML += '<i class="fas fa-star-half-alt"></i>';
                    } else {
                        ratingElement.innerHTML += '<i class="far fa-star"></i>';
                    }
                }
                console.log(`Rating displayed for ${elementId}: ${rating}`);
            } catch (error) {
                console.error('Error displaying rating:', error);
            }
        }

        // Theme Toggle
        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('mobile-theme-toggle-btn').addEventListener('click', toggleTheme);

        function toggleTheme() {
            try {
                const html = document.documentElement;
                const currentTheme = html.getAttribute('data-theme');
                html.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
                localStorage.setItem('theme', html.getAttribute('data-theme'));
                console.log('Theme toggled to:', html.getAttribute('data-theme'));
            } catch (error) {
                console.error('Error toggling theme:', error);
            }
        }

        // Initialize Theme
        function initTheme() {
            try {
                const savedTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', savedTheme);
                console.log('Theme initialized:', savedTheme);
            } catch (error) {
                console.error('Error initializing theme:', error);
            }
        }

        // Mobile Menu Toggle
        document.getElementById('menu-btn').addEventListener('click', () => {
            try {
                const mobileMenu = document.getElementById('mobile-menu');
                mobileMenu.classList.toggle('open');
                mobileMenu.setAttribute('aria-expanded', mobileMenu.classList.contains('open'));
                console.log('Mobile menu toggled:', mobileMenu.classList.contains('open'));
            } catch (error) {
                console.error('Error toggling mobile menu:', error);
            }
        });

        // Profile Dropdown Toggle
        document.getElementById('profile-btn').addEventListener('click', () => {
            try {
                const dropdown = document.getElementById('profile-dropdown');
                dropdown.classList.toggle('show');
                document.getElementById('profile-btn').setAttribute('aria-expanded', dropdown.classList.contains('show'));
                console.log('Profile dropdown toggled:', dropdown.classList.contains('show'));
            } catch (error) {
                console.error('Error toggling profile dropdown:', error);
            }
        });

        document.getElementById('mobile-profile-btn').addEventListener('click', () => {
            try {
                const dropdown = document.getElementById('mobile-profile-dropdown');
                dropdown.classList.toggle('show');
                document.getElementById('mobile-profile-btn').setAttribute('aria-expanded', dropdown.classList.contains('show'));
                console.log('Mobile profile dropdown toggled:', dropdown.classList.contains('show'));
            } catch (error) {
                console.error('Error toggling mobile profile dropdown:', error);
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (event) => {
            try {
                if (!event.target.closest('#profile-btn') && !event.target.closest('#profile-dropdown')) {
                    document.getElementById('profile-dropdown').classList.remove('show');
                    document.getElementById('profile-btn').setAttribute('aria-expanded', 'false');
                }
                if (!event.target.closest('#mobile-profile-btn') && !event.target.closest('#mobile-profile-dropdown')) {
                    document.getElementById('mobile-profile-dropdown').classList.remove('show');
                    document.getElementById('mobile-profile-btn').setAttribute('aria-expanded', 'false');
                }
            } catch (error) {
                console.error('Error handling outside click for dropdowns:', error);
            }
        });

        // Tab Management
        function showTab(tabId) {
            try {
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
                document.getElementById(tabId).classList.remove('hidden');
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                document.querySelector(`button[onclick="showTab('${tabId}')"]`).classList.add('active');
                document.querySelector(`button[onclick="showTab('${tabId}')"]`).setAttribute('aria-selected', 'true');
                console.log(`Tab switched to: ${tabId}`);
            } catch (error) {
                console.error('Error switching tab:', error);
            }
        }

        // Search Functions
        function searchAdvertisers() {
            try {
                const searchTerm = document.getElementById('advertiser-search').value.toLowerCase();
                const table = document.getElementById('advertiser-table');
                table.innerHTML = '';
                Object.values(advertisers).forEach(advertiser => {
                    if (advertiser.name.toLowerCase().includes(searchTerm) || advertiser.email.toLowerCase().includes(searchTerm)) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="p-2">${advertiser.name}</td>
                            <td class="p-2">${advertiser.phone}</td>
                            <td class="p-2">${advertiser.email}</td>
                            <td class="p-2">${advertiser.location}</td>
                            <td class="p-2">
                                <button onclick="openMessageAdvertiserModal(${advertiser.id})" class="px-2 py-1 cta-button" aria-label="Message ${advertiser.name}">Message</button>
                            </td>
                        `;
                        table.appendChild(row);
                    }
                });
                console.log('Advertisers searched:', searchTerm);
            } catch (error) {
                console.error('Error searching advertisers:', error);
            }
        }

        function searchCampaigns() {
            try {
                const searchTerm = document.getElementById('campaign-search').value.toLowerCase();
                const table = document.getElementById('campaign-table');
                table.innerHTML = '';
                Object.values(campaigns).forEach(campaign => {
                    if (campaign.name.toLowerCase().includes(searchTerm) || campaign.adContent.description.toLowerCase().includes(searchTerm)) {
                        const advertiser = advertisers[campaign.advertiserId]?.name || 'Unknown';
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="p-2">${campaign.name}</td>
                            <td class="p-2">${advertiser}</td>
                            <td class="p-2">${campaign.reviewStatus}</td>
                            <td class="p-2">
                                <button onclick="openReviewCampaignModal(${campaign.id})" class="px-2 py-1 cta-button" aria-label="Review ${campaign.name}">Review</button>
                                <button onclick="openViewContentModal(${campaign.id})" class="px-2 py-1 cta-button ml-2" aria-label="View Content for ${campaign.name}">View Content</button>
                            </td>
                        `;
                        table.appendChild(row);
                    }
                });
                console.log('Campaigns searched:', searchTerm);
            } catch (error) {
                console.error('Error searching campaigns:', error);
            }
        }

        function searchRejectedCampaigns() {
            try {
                const searchTerm = document.getElementById('rejected-campaign-search').value.toLowerCase();
                const table = document.getElementById('rejected-campaign-table');
                table.innerHTML = '';
                Object.values(campaigns).filter(c => c.reviewStatus === 'Rejected').forEach(campaign => {
                    if (campaign.name.toLowerCase().includes(searchTerm) || campaign.adContent.description.toLowerCase().includes(searchTerm)) {
                        const advertiser = advertisers[campaign.advertiserId]?.name || 'Unknown';
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="p-2">${campaign.name}</td>
                            <td class="p-2">${advertiser}</td>
                            <td class="p-2">${campaign.adContent.description}</td>
                            <td class="p-2">${campaign.rejectionReason || 'N/A'}</td>
                            <td class="p-2">
                                <button onclick="openViewContentModal(${campaign.id})" class="px-2 py-1 cta-button" aria-label="View Content for ${campaign.name}">View Content</button>
                            </td>
                        `;
                        table.appendChild(row);
                    }
                });
                console.log('Rejected campaigns searched:', searchTerm);
            } catch (error) {
                console.error('Error searching rejected campaigns:', error);
            }
        }

        function searchSchools() {
            try {
                const searchTerm = document.getElementById('school-search').value.toLowerCase();
                const table = document.getElementById('school-table');
                table.innerHTML = '';
                Object.values(schools).forEach(school => {
                    if (school.name.toLowerCase().includes(searchTerm) || school.email.toLowerCase().includes(searchTerm)) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="p-2">${school.name}</td>
                            <td class="p-2">${school.phone}</td>
                            <td class="p-2">${school.email}</td>
                            <td class="p-2">${school.location}</td>
                            <td class="p-2">
                                <button onclick="editSchool(${school.id})" class="px-2 py-1 cta-button" aria-label="Edit ${school.name}">Edit</button>
                                <button onclick="deleteSchool(${school.id})" class="px-2 py-1 bg-red-600 text-white hover:bg-red-700 ml-2" aria-label="Delete ${school.name}">Delete</button>
                            </td>
                        `;
                        table.appendChild(row);
                    }
                });
                console.log('Schools searched:', searchTerm);
            } catch (error) {
                console.error('Error searching schools:', error);
            }
        }

        function searchRequestedSchools() {
            try {
                const searchTerm = document.getElementById('requested-school-search').value.toLowerCase();
                const table = document.getElementById('requested-school-table');
                table.innerHTML = '';
                Object.values(requestedSchools).forEach(school => {
                    if (school.name.toLowerCase().includes(searchTerm) || school.email.toLowerCase().includes(searchTerm)) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="p-2">${school.name}</td>
                            <td class="p-2">${school.phone}</td>
                            <td class="p-2">${school.email}</td>
                            <td class="p-2">${school.location}</td>
                            <td class="p-2">${school.status}</td>
                            <td class="p-2">
                                <button onclick="approveSchool(${school.id})" class="px-2 py-1 cta-button" aria-label="Approve ${school.name}">Approve</button>
                                <button onclick="rejectSchool(${school.id})" class="px-2 py-1 bg-red-600 text-white hover:bg-red-700 ml-2" aria-label="Reject ${school.name}">Reject</button>
                            </td>
                        `;
                        table.appendChild(row);
                    }
                });
                console.log('Requested schools searched:', searchTerm);
            } catch (error) {
                console.error('Error searching requested schools:', error);
            }
        }

        function searchRequestedCourses() {
            try {
                const searchTerm = document.getElementById('requested-course-search').value.toLowerCase();
                const table = document.getElementById('requested-course-table');
                table.innerHTML = '';
                Object.values(requestedCourses).forEach(course => {
                    if (course.name.toLowerCase().includes(searchTerm) || (schools[course.schoolId]?.name || '').toLowerCase().includes(searchTerm)) {
                        const schoolName = schools[course.schoolId]?.name || 'Unknown';
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="p-2">${course.name}</td>
                            <td class="p-2">${schoolName}</td>
                            <td class="p-2">${course.description}</td>
                            <td class="p-2">${course.status}</td>
                            <td class="p-2">
                                <button onclick="approveCourse(${course.id})" class="px-2 py-1 cta-button" aria-label="Approve ${course.name}">Approve</button>
                                <button onclick="rejectCourse(${course.id})" class="px-2 py-1 bg-red-600 text-white hover:bg-red-700 ml-2" aria-label="Reject ${course.name}">Reject</button>
                            </td>
                        `;
                        table.appendChild(row);
                    }
                });
                console.log('Requested courses searched:', searchTerm);
            } catch (error) {
                console.error('Error searching requested courses:', error);
            }
        }

        function searchTutors() {
            try {
                const searchTerm = document.getElementById('tutor-search').value.toLowerCase();
                const table = document.getElementById('tutor-table');
                table.innerHTML = '';
                let sortedTutors = Object.values(tutors);
                if (document.getElementById('sort-school-name').checked) {
                    sortedTutors.sort((a, b) => a.schoolName.localeCompare(b.schoolName));
                } else if (document.getElementById('sort-school-rating').checked) {
                    sortedTutors.sort((a, b) => a.schoolRating - b.schoolRating);
                }
                sortedTutors.forEach(tutor => {
                    if (tutor.name.toLowerCase().includes(searchTerm) || tutor.schoolName.toLowerCase().includes(searchTerm)) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="p-2">${tutor.name}</td>
                            <td class="p-2">${tutor.schoolName || 'N/A'}</td>
                            <td class="p-2">${tutor.schoolPhone || 'N/A'}</td>
                            <td class="p-2">
                                <button onclick="openListCertificationsModal(${tutor.id})" class="px-2 py-1 cta-button" aria-label="View Certifications for ${tutor.name}">View</button>
                            </td>
                            <td class="p-2">
                                <button onclick="openListExperienceModal(${tutor.id})" class="px-2 py-1 cta-button" aria-label="View Experience for ${tutor.name}">View</button>
                            </td>
                            <td class="p-2">${tutor.status}</td>
                            <td class="p-2">
                                <button onclick="approveTutor(${tutor.id})" class="px-2 py-1 cta-button" aria-label="Approve ${tutor.name}">Approve</button>
                                <button onclick="rejectTutor(${tutor.id})" class="px-2 py-1 bg-red-600 text-white hover:bg-red-700 ml-2" aria-label="Reject ${tutor.name}">Reject</button>
                            </td>
                        `;
                        table.appendChild(row);
                    }
                });
                console.log('Tutors searched:', searchTerm);
            } catch (error) {
                console.error('Error searching tutors:', error);
            }
        }

        function sortTutors(criteria) {
            try {
                const otherCheckbox = criteria === 'schoolName' ? 'sort-school-rating' : 'sort-school-name';
                document.getElementById(otherCheckbox).checked = false;
                searchTutors();
                console.log(`Tutors sorted by ${criteria}`);
            } catch (error) {
                console.error('Error sorting tutors:', error);
            }
        }

        function sortRequestedCoursesByNotifications() {
            try {
                const icon = document.getElementById('notifications-sort-icon');
                const isAscending = icon.classList.contains('rotate-180');
                const table = document.getElementById('requested-course-table');
                table.innerHTML = '';
                let sortedCourses = Object.values(requestedCourses);
                sortedCourses.sort((a, b) => {
                    const aNotifications = Object.values(notifications).filter(n => n.message.includes(a.name)).length;
                    const bNotifications = Object.values(notifications).filter(n => n.message.includes(b.name)).length;
                    return isAscending ? aNotifications - bNotifications : bNotifications - aNotifications;
                });
                sortedCourses.forEach(course => {
                    const schoolName = schools[course.schoolId]?.name || 'Unknown';
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="p-2">${course.name}</td>
                        <td class="p-2">${schoolName}</td>
                        <td class="p-2">${course.description}</td>
                        <td class="p-2">${course.status}</td>
                        <td class="p-2">
                            <button onclick="approveCourse(${course.id})" class="px-2 py-1 cta-button" aria-label="Approve ${course.name}">Approve</button>
                            <button onclick="rejectCourse(${course.id})" class="px-2 py-1 bg-red-600 text-white hover:bg-red-700 ml-2" aria-label="Reject ${course.name}">Reject</button>
                        </td>
                    `;
                    table.appendChild(row);
                });
                icon.classList.toggle('rotate-180');
                console.log(`Courses sorted by notifications, ascending: ${!isAscending}`);
            } catch (error) {
                console.error('Error sorting courses by notifications:', error);
            }
        }

        function searchAstegniComments() {
            try {
                const searchTerm = document.getElementById('comment-search').value.toLowerCase();
                const container = document.getElementById('astegni-comment-container');
                container.innerHTML = '';
                Object.values(astegniComments).forEach(comment => {
                    if (comment.userName.toLowerCase().includes(searchTerm) || comment.content.toLowerCase().includes(searchTerm)) {
                        const card = document.createElement('div');
                        card.className = 'comment-card';
                        card.innerHTML = `
                            <div class="flex items-center mb-2">
                                <img src="https://via.placeholder.com/32" alt="${comment.userName} Profile" class="w-8 h-8 rounded-full mr-2">
                                <div>
                                    <p class="font-semibold">${comment.userName} (${comment.userType})</p>
                                    <p class="text-sm text-gray-600">${comment.date}</p>
                                </div>
                            </div>
                            <p class="mb-2">${comment.content}</p>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <p>Usability: ${comment.usabilityRating}/5</p>
                                <p>Culture: ${comment.cultureRating}/5</p>
                                <p>Management: ${comment.managementRating}/5</p>
                                <p>Role: ${comment.roleRating}/5</p>
                                <p>Development: ${comment.developmentRating}/5</p>
                                <p>Compensation: ${comment.compensationRating}/5</p>
                                <p>Work-Life: ${comment.worklifeRating}/5</p>
                                <p>Mental Health: ${comment.mentalhealthRating}/5</p>
                            </div>
                        `;
                        container.appendChild(card);
                    }
                });
                console.log('Astegni comments searched:', searchTerm);
            } catch (error) {
                console.error('Error searching Astegni comments:', error);
            }
        }

            // Function to open the Edit Cover Photo modal
        function openCoverPicModal() {
            const modal = document.getElementById('cover-pic-modal');
            modal.classList.remove('hidden');
            // Reset file input and preview
            const fileInput = document.getElementById('cover-pic-upload');
            const preview = document.getElementById('cover-pic-preview');
            fileInput.value = '';
            preview.style.display = 'none';
            preview.src = '';
        }

        // Function to close the Edit Cover Photo modal
        function closeCoverPicModal() {
            const modal = document.getElementById('cover-pic-modal');
            modal.classList.add('hidden');
        }

        // Optional: Preview the selected cover photo
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

// Function to upload and set the cover photo
function uploadCoverPic() {
            const fileInput = document.getElementById('cover-pic-upload');
            const file = fileInput.files[0];
            const coverPic = document.getElementById('admin-cover-pic');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    coverPic.src = e.target.result; // Update the cover photo src
                    closeCoverPicModal(); // Close the modal after updating
                };
                reader.readAsDataURL(file);
                console.log('Cover photo updated:', file.name);
            } else {
                alert('Please select an image to upload.');
            }
        }

        // Modal Functions
        function openEditProfileModal() {
            try {
                document.getElementById('edit-profile-name').value = currentAdmin.name;
                document.getElementById('edit-profile-phone').value = currentAdmin.phone;
                document.getElementById('edit-profile-email').value = currentAdmin.email;
                document.getElementById('edit-profile-location').value = currentAdmin.location;
                document.getElementById('edit-profile-bio').value = currentAdmin.bio;
                document.getElementById('edit-profile-quote').value = currentAdmin.quote;
                document.getElementById('edit-profile-modal').classList.remove('hidden');
                console.log('Edit profile modal opened');
            } catch (error) {
                console.error('Error opening edit profile modal:', error);
            }
        }

        function closeEditProfileModal() {
            try {
                document.getElementById('edit-profile-modal').classList.add('hidden');
                console.log('Edit profile modal closed');
            } catch (error) {
                console.error('Error closing edit profile modal:', error);
            }
        }

        function saveProfile() {
            try {
                currentAdmin.name = document.getElementById('edit-profile-name').value;
                currentAdmin.phone = document.getElementById('edit-profile-phone').value;
                currentAdmin.email = document.getElementById('edit-profile-email').value;
                currentAdmin.location = document.getElementById('edit-profile-location').value;
                currentAdmin.bio = document.getElementById('edit-profile-bio').value;
                currentAdmin.quote = document.getElementById('edit-profile-quote').value;
                updateAdminProfile();
                closeEditProfileModal();
                console.log('Profile saved:', currentAdmin);
            } catch (error) {
                console.error('Error saving profile:', error);
            }
        }

        function openViewAdminCommentsModal() {
            try {
                const content = document.getElementById('admin-comments-content');
                content.innerHTML = '';
                Object.values(adminComments).forEach(comment => {
                    const card = document.createElement('div');
                    card.className = 'comment-card';
                    card.innerHTML = `
                        <div class="flex items-center mb-2">
                            <img src="https://via.placeholder.com/32" alt="${comment.userName} Profile" class="w-8 h-8 rounded-full mr-2">
                            <div>
                                <p class="font-semibold">${comment.userName} (${comment.userType})</p>
                                <p class="text-sm text-gray-600">${comment.date}</p>
                            </div>
                        </div>
                        <p class="mb-2">${comment.content}</p>
                        <div class="star-rating mb-2" id="admin-comment-rating-${comment.id}"></div>
                    `;
                    content.appendChild(card);
                    displayRating(comment.rating, `admin-comment-rating-${comment.id}`);
                });
                document.getElementById('view-admin-comments-modal').classList.remove('hidden');
                console.log('View admin comments modal opened');
            } catch (error) {
                console.error('Error opening view admin comments modal:', error);
            }
        }

        function closeViewAdminCommentsModal() {
            try {
                document.getElementById('view-admin-comments-modal').classList.add('hidden');
                console.log('View admin comments modal closed');
            } catch (error) {
                console.error('Error closing view admin comments modal:', error);
            }
        }

        let selectedCampaignId = null;

        function openReviewCampaignModal(campaignId) {
            try {
                selectedCampaignId = campaignId;
                const campaign = campaigns[campaignId];
                const content = document.getElementById('review-campaign-content');
                content.innerHTML = `
                    <p><strong>Name:</strong> ${campaign.name}</p>
                    <p><strong>Advertiser:</strong> ${advertisers[campaign.advertiserId]?.name || 'Unknown'}</p>
                    <p><strong>Duration:</strong> ${campaign.duration} days</p>
                    <p><strong>Price:</strong> ${campaign.price} ETB</p>
                    <p><strong>Description:</strong> ${campaign.adContent.description}</p>
                    <img src="${campaign.adContent.url}" alt="Campaign Image" class="w-full mt-2 rounded">
                `;
                document.getElementById('review-campaign-modal').classList.remove('hidden');
                console.log('Review campaign modal opened for campaign:', campaignId);
            } catch (error) {
                console.error('Error opening review campaign modal:', error);
            }
        }

        function closeReviewCampaignModal() {
            try {
                document.getElementById('review-campaign-modal').classList.add('hidden');
                selectedCampaignId = null;
                console.log('Review campaign modal closed');
            } catch (error) {
                console.error('Error closing review campaign modal:', error);
            }
        }

        function openRejectCampaignModal() {
            try {
                document.getElementById('reject-campaign-modal').classList.remove('hidden');
                document.getElementById('rejection-count').textContent = campaigns[selectedCampaignId]?.rejectionCount || 0;
                console.log('Reject campaign modal opened');
            } catch (error) {
                console.error('Error opening reject campaign modal:', error);
            }
        }

        function closeRejectCampaignModal() {
            try {
                document.getElementById('reject-campaign-modal').classList.add('hidden');
                document.getElementById('reject-reason').value = '';
                console.log('Reject campaign modal closed');
            } catch (error) {
                console.error('Error closing reject campaign modal:', error);
            }
        }

        function rejectCampaignWithReason() {
            try {
                const reason = document.getElementById('reject-reason').value;
                if (!reason) {
                    alert('Please provide a reason for rejection.');
                    return;
                }
                campaigns[selectedCampaignId].reviewStatus = 'Rejected';
                campaigns[selectedCampaignId].rejectionReason = reason;
                campaigns[selectedCampaignId].rejectionCount = (campaigns[selectedCampaignId].rejectionCount || 0) + 1;
                const advertiserId = campaigns[selectedCampaignId].advertiserId;
                advertisers[advertiserId].rejectionCount = (advertisers[advertiserId].rejectionCount || 0) + 1;
                if (advertisers[advertiserId].rejectionCount >= 3) {
                    advertisers[advertiserId].status = 'Suspended';
                    advertisers[advertiserId].suspensionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    notifications[Object.keys(notifications).length + 1] = {
                        id: Object.keys(notifications).length + 1,
                        message: `Advertiser ${advertisers[advertiserId].name} suspended due to multiple rejections`,
                        recipient: 'Admin',
                        date: new Date().toISOString().split('T')[0]
                    };
                }
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message: `Campaign ${campaigns[selectedCampaignId].name} rejected: ${reason}`,
                    recipient: advertisers[advertiserId].name,
                    date: new Date().toISOString().split('T')[0]
                };
                updateSummary();
                searchCampaigns();
                searchRejectedCampaigns();
                updateNotifications();
                closeRejectCampaignModal();
                closeReviewCampaignModal();
                console.log('Campaign rejected:', selectedCampaignId, reason);
            } catch (error) {
                console.error('Error rejecting campaign:', error);
            }
        }

        function reviewCampaign(campaignId, approve) {
            try {
                if (approve) {
                    campaigns[campaignId].reviewStatus = 'Active';
                    campaigns[campaignId].moderationStatus = 'Approved';
                    notifications[Object.keys(notifications).length + 1] = {
                        id: Object.keys(notifications).length + 1,
                        message: `Campaign ${campaigns[campaignId].name} approved`,
                        recipient: advertisers[campaigns[campaignId].advertiserId].name,
                        date: new Date().toISOString().split('T')[0]
                    };
                } else {
                    campaigns[campaignId].reviewStatus = 'Rejected';
                    campaigns[campaignId].rejectionCount = (campaigns[campaignId].rejectionCount || 0) + 1;
                    const advertiserId = campaigns[campaignId].advertiserId;
                    advertisers[advertiserId].rejectionCount = (advertisers[advertiserId].rejectionCount || 0) + 1;
                    if (advertisers[advertiserId].rejectionCount >= 3) {
                        advertisers[advertiserId].status = 'Suspended';
                        advertisers[advertiserId].suspensionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        notifications[Object.keys(notifications).length + 1] = {
                            id: Object.keys(notifications).length + 1,
                            message: `Advertiser ${advertisers[advertiserId].name} suspended due to multiple rejections`,
                            recipient: 'Admin',
                            date: new Date().toISOString().split('T')[0]
                        };
                    }
                }
                updateSummary();
                searchCampaigns();
                searchRejectedCampaigns();
                updateNotifications();
                closeReviewCampaignModal();
                console.log(`Campaign ${approve ? 'approved' : 'rejected'}:`, campaignId);
            } catch (error) {
                console.error('Error reviewing campaign:', error);
            }
        }

        function openViewContentModal(campaignId) {
            try {
                const campaign = campaigns[campaignId];
                const content = document.getElementById('view-content-details');
                content.innerHTML = `
                    <p><strong>Name:</strong> ${campaign.name}</p>
                    <p><strong>Advertiser:</strong> ${advertisers[campaign.advertiserId]?.name || 'Unknown'}</p>
                    <p><strong>Duration:</strong> ${campaign.duration} days</p>
                    <p><strong>Price:</strong> ${campaign.price} ETB</p>
                    <p><strong>Description:</strong> ${campaign.adContent.description}</p>
                    <img src="${campaign.adContent.url}" alt="Campaign Image" class="w-full mt-2 rounded">
                `;
                document.getElementById('view-content-modal').classList.remove('hidden');
                console.log('View content modal opened for campaign:', campaignId);
            } catch (error) {
                console.error('Error opening view content modal:', error);
            }
        }

        function closeViewContentModal() {
            try {
                document.getElementById('view-content-modal').classList.add('hidden');
                console.log('View content modal closed');
            } catch (error) {
                console.error('Error closing view content modal:', error);
            }
        }

        function openSendNotificationModal() {
            try {
                document.getElementById('send-notification-modal').classList.remove('hidden');
                console.log('Send notification modal opened');
            } catch (error) {
                console.error('Error opening send notification modal:', error);
            }
        }

        function closeSendNotificationModal() {
            try {
                document.getElementById('send-notification-modal').classList.add('hidden');
                document.getElementById('notification-recipient').value = 'all';
                document.getElementById('notification-message').value = '';
                console.log('Send notification modal closed');
            } catch (error) {
                console.error('Error closing send notification modal:', error);
            }
        }

        function sendNotification() {
            try {
                const recipient = document.getElementById('notification-recipient').value;
                const message = document.getElementById('notification-message').value;
                if (!message) {
                    alert('Please enter a message.');
                    return;
                }
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message,
                    recipient,
                    date: new Date().toISOString().split('T')[0]
                };
                updateNotifications();
                closeSendNotificationModal();
                console.log('Notification sent:', { recipient, message });
            } catch (error) {
                console.error('Error sending notification:', error);
            }
        }

        function updateNotifications() {
            try {
                const table = document.getElementById('notification-table');
                table.innerHTML = '';
                Object.values(notifications).forEach(notification => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="p-2">${notification.message}</td>
                        <td class="p-2">${notification.recipient}</td>
                        <td class="p-2">${notification.date}</td>
                    `;
                    table.appendChild(row);
                });
                console.log('Notifications updated');
            } catch (error) {
                console.error('Error updating notifications:', error);
            }
        }

        function openNotificationModal() {
            try {
                const content = document.getElementById('notification-content');
                content.innerHTML = '';
                const adminNotifications = Object.values(notifications).filter(n => n.recipient === 'Admin');
                if (adminNotifications.length === 0) {
                    content.textContent = 'You have no notifications.';
                } else {
                    adminNotifications.forEach(notification => {
                        const div = document.createElement('div');
                        div.className = 'mb-2';
                        div.innerHTML = `<p><strong>${notification.date}</strong>: ${notification.message}</p>`;
                        content.appendChild(div);
                    });
                }
                document.getElementById('notification-modal').classList.remove('hidden');
                document.getElementById('notification-dot').classList.add('hidden');
                document.getElementById('mobile-notification-dot').classList.add('hidden');
                console.log('Notification modal opened');
            } catch (error) {
                console.error('Error opening notification modal:', error);
            }
        }

        function closeNotificationModal() {
            try {
                document.getElementById('notification-modal').classList.add('hidden');
                console.log('Notification modal closed');
            } catch (error) {
                console.error('Error closing notification modal:', error);
            }
        }

        function checkNotifications() {
            try {
                const adminNotifications = Object.values(notifications).filter(n => n.recipient === 'Admin');
                if (adminNotifications.length > 0) {
                    document.getElementById('notification-dot').classList.remove('hidden');
                    document.getElementById('mobile-notification-dot').classList.remove('hidden');
                }
                console.log('Notifications checked:', adminNotifications.length);
            } catch (error) {
                console.error('Error checking notifications:', error);
            }
        }

        function openAddSchoolModal() {
            try {
                document.getElementById('add-school-modal').classList.remove('hidden');
                console.log('Add school modal opened');
            } catch (error) {
                console.error('Error opening add school modal:', error);
            }
        }

        function closeAddSchoolModal() {
            try {
                document.getElementById('add-school-modal').classList.add('hidden');
                document.getElementById('school-name').value = '';
                document.getElementById('school-phone').value = '';
                document.getElementById('school-email').value = '';
                document.getElementById('school-location').value = '';
                console.log('Add school modal closed');
            } catch (error) {
                console.error('Error closing add school modal:', error);
            }
        }

        function saveSchool() {
            try {
                const name = document.getElementById('school-name').value;
                const phone = document.getElementById('school-phone').value;
                const email = document.getElementById('school-email').value;
                const location = document.getElementById('school-location').value;
                if (!name || !phone || !email || !location) {
                    alert('Please fill in all fields.');
                    return;
                }
                schools[Object.keys(schools).length + 1] = {
                    id: Object.keys(schools).length + 1,
                    name,
                    phone,
                    email,
                    location,
                    status: 'Approved',
                    rating: 0
                };
                updateSummary();
                searchSchools();
                closeAddSchoolModal();
                console.log('School saved:', { name, phone, email, location });
            } catch (error) {
                console.error('Error saving school:', error);
            }
        }

        function editSchool(schoolId) {
            try {
                const school = schools[schoolId];
                document.getElementById('school-name').value = school.name;
                document.getElementById('school-phone').value = school.phone;
                document.getElementById('school-email').value = school.email;
                document.getElementById('school-location').value = school.location;
                document.getElementById('add-school-modal').classList.remove('hidden');
                document.getElementById('add-school-modal').querySelector('h3').textContent = 'Edit School';
                document.getElementById('add-school-modal').querySelector('button[onclick="saveSchool()"]').onclick = () => {
                    schools[schoolId].name = document.getElementById('school-name').value;
                    schools[schoolId].phone = document.getElementById('school-phone').value;
                    schools[schoolId].email = document.getElementById('school-email').value;
                    schools[schoolId].location = document.getElementById('school-location').value;
                    updateSummary();
                    searchSchools();
                    closeAddSchoolModal();
                    console.log('School edited:', schoolId);
                };
                console.log('Edit school modal opened for:', schoolId);
            } catch (error) {
                console.error('Error editing school:', error);
            }
        }

        function deleteSchool(schoolId) {
            try {
                if (confirm('Are you sure you want to delete this school?')) {
                    delete schools[schoolId];
                    updateSummary();
                    searchSchools();
                    console.log('School deleted:', schoolId);
                }
            } catch (error) {
                console.error('Error deleting school:', error);
            }
        }

        function approveSchool(schoolId) {
            try {
                const school = requestedSchools[schoolId];
                schools[Object.keys(schools).length + 1] = {
                    id: Object.keys(schools).length + 1,
                    name: school.name,
                    phone: school.phone,
                    email: school.email,
                    location: school.location,
                    status: 'Approved',
                    rating: 0
                };
                delete requestedSchools[schoolId];
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message: `School ${school.name} approved`,
                    recipient: 'Admin',
                    date: new Date().toISOString().split('T')[0]
                };
                updateSummary();
                searchRequestedSchools();
                searchSchools();
                updateNotifications();
                console.log('School approved:', schoolId);
            } catch (error) {
                console.error('Error approving school:', error);
            }
        }

        function rejectSchool(schoolId) {
            try {
                if (confirm('Are you sure you want to reject this school?')) {
                    delete requestedSchools[schoolId];
                    updateSummary();
                    searchRequestedSchools();
                    console.log('School rejected:', schoolId);
                }
            } catch (error) {
                console.error('Error rejecting school:', error);
            }
        }

        function approveCourse(courseId) {
            try {
                requestedCourses[courseId].status = 'Approved';
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message: `Course ${requestedCourses[courseId].name} approved`,
                    recipient: 'Admin',
                    date: new Date().toISOString().split('T')[0]
                };
                updateSummary();
                searchRequestedCourses();
                updateNotifications();
                console.log('Course approved:', courseId);
            } catch (error) {
                console.error('Error approving course:', error);
            }
        }

        function rejectCourse(courseId) {
            try {
                if (confirm('Are you sure you want to reject this course?')) {
                    requestedCourses[courseId].status = 'Rejected';
                    updateSummary();
                    searchRequestedCourses();
                    console.log('Course rejected:', courseId);
                }
            } catch (error) {
                console.error('Error rejecting course:', error);
            }
        }

        function openListCertificationsModal(tutorId) {
            try {
                const tutor = tutors[tutorId];
                const content = document.getElementById('certifications-content');
                content.innerHTML = '';
                tutor.certifications.forEach(cert => {
                    const div = document.createElement('div');
                    div.className = 'mb-2';
                    div.innerHTML = `
                        <p><strong>School:</strong> ${cert.certSchool}</p>
                        <p><strong>Phone:</strong> ${cert.certSchoolPhone}</p>
                        <p><strong>Course:</strong> ${cert.courseTitle}</p>
                        <p><strong>Type:</strong> ${cert.type}</p>
                        <p><strong>Certificate:</strong> ${cert.certificate}</p>
                    `;
                    content.appendChild(div);
                });
                document.getElementById('list-certifications-modal').classList.remove('hidden');
                console.log('List certifications modal opened for tutor:', tutorId);
            } catch (error) {
                console.error('Error opening list certifications modal:', error);
            }
        }

        function closeListCertificationsModal() {
            try {
                document.getElementById('list-certifications-modal').classList.add('hidden');
                console.log('List certifications modal closed');
            } catch (error) {
                console.error('Error closing list certifications modal:', error);
            }
        }

        function openListExperienceModal(tutorId) {
            try {
                const tutor = tutors[tutorId];
                const content = document.getElementById('experience-content');
                content.innerHTML = '';
                tutor.experience.forEach(exp => {
                    const div = document.createElement('div');
                    div.className = 'mb-2';
                    div.innerHTML = `
                        <p><strong>Company:</strong> ${exp.company}</p>
                        <p><strong>Contact:</strong> ${exp.companyContact}</p>
                        <p><strong>Experienced In:</strong> ${exp.experiencedIn}</p>
                        <p><strong>Years:</strong> ${exp.years}</p>
                        <p><strong>Proof:</strong> <a href="${exp.proof}" target="_blank">View Proof</a></p>
                        <p><strong>Status:</strong> ${exp.status}</p>
                        <button onclick="verifyExperience(${tutorId}, '${exp.experiencedIn}')" class="px-2 py-1 cta-button mt-2" aria-label="Verify ${exp.experiencedIn}">Verify</button>
                        <button onclick="openDeclineExperienceModal(${tutorId}, '${exp.experiencedIn}')" class="px-2 py-1 bg-red-600 text-white hover:bg-red-700 mt-2 ml-2" aria-label="Decline ${exp.experiencedIn}">Decline</button>
                    `;
                    content.appendChild(div);
                });
                document.getElementById('list-experience-modal').classList.remove('hidden');
                console.log('List experience modal opened for tutor:', tutorId);
            } catch (error) {
                console.error('Error opening list experience modal:', error);
            }
        }

        function closeListExperienceModal() {
            try {
                document.getElementById('list-experience-modal').classList.add('hidden');
                console.log('List experience modal closed');
            } catch (error) {
                console.error('Error closing list experience modal:', error);
            }
        }

        function verifyExperience(tutorId, experiencedIn) {
            try {
                const tutor = tutors[tutorId];
                const experience = tutor.experience.find(exp => exp.experiencedIn === experiencedIn);
                experience.status = 'Verified';
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message: `Experience in ${experiencedIn} verified for ${tutor.name}`,
                    recipient: 'Admin',
                    date: new Date().toISOString().split('T')[0]
                };
                updateNotifications();
                openListExperienceModal(tutorId);
                console.log('Experience verified:', tutorId, experiencedIn);
            } catch (error) {
                console.error('Error verifying experience:', error);
            }
        }

        let selectedTutorId = null;
        let selectedExperience = null;

        function openDeclineExperienceModal(tutorId, experiencedIn) {
            try {
                selectedTutorId = tutorId;
                selectedExperience = experiencedIn;
                document.getElementById('decline-experience-modal').classList.remove('hidden');
                console.log('Decline experience modal opened for tutor:', tutorId, experiencedIn);
            } catch (error) {
                console.error('Error opening decline experience modal:', error);
            }
        }

        function closeDeclineExperienceModal() {
            try {
                document.getElementById('decline-experience-modal').classList.add('hidden');
                document.getElementById('decline-reason').value = '';
                selectedTutorId = null;
                selectedExperience = null;
                console.log('Decline experience modal closed');
            } catch (error) {
                console.error('Error closing decline experience modal:', error);
            }
        }

        function submitDeclineExperience() {
            try {
                const reason = document.getElementById('decline-reason').value;
                if (!reason) {
                    alert('Please provide a reason for decline.');
                    return;
                }
                const tutor = tutors[selectedTutorId];
                const experience = tutor.experience.find(exp => exp.experiencedIn === selectedExperience);
                experience.status = 'Declined';
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message: `Experience in ${selectedExperience} declined for ${tutor.name}: ${reason}`,
                    recipient: tutor.name,
                    date: new Date().toISOString().split('T')[0]
                };
                updateNotifications();
                closeDeclineExperienceModal();
                openListExperienceModal(selectedTutorId);
                console.log('Experience declined:', selectedTutorId, selectedExperience, reason);
            } catch (error) {
                console.error('Error declining experience:', error);
            }
        }

        function approveTutor(tutorId) {
            try {
                tutors[tutorId].status = 'Approved';
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message: `Tutor ${tutors[tutorId].name} approved`,
                    recipient: 'Admin',
                    date: new Date().toISOString().split('T')[0]
                };
                updateSummary();
                searchTutors();
                updateNotifications();
                console.log('Tutor approved:', tutorId);
            } catch (error) {
                console.error('Error approving tutor:', error);
            }
        }

        function rejectTutor(tutorId) {
            try {
                if (confirm('Are you sure you want to reject this tutor?')) {
                    tutors[tutorId].status = 'Rejected';
                    notifications[Object.keys(notifications).length + 1] = {
                        id: Object.keys(notifications).length + 1,
                        message: `Tutor ${tutors[tutorId].name} rejected`,
                        recipient: 'Admin',
                        date: new Date().toISOString().split('T')[0]
                    };
                    updateSummary();
                    searchTutors();
                    updateNotifications();
                    console.log('Tutor rejected:', tutorId);
                }
            } catch (error) {
                console.error('Error rejecting tutor:', error);
            }
        }

        function openMessageAdvertiserModal(advertiserId) {
            try {
                document.getElementById('message-recipient').value = advertisers[advertiserId].name;
                document.getElementById('message-advertiser-modal').classList.remove('hidden');
                console.log('Message advertiser modal opened for:', advertiserId);
            } catch (error) {
                console.error('Error opening message advertiser modal:', error);
            }
        }

        function closeMessageAdvertiserModal() {
            try {
                document.getElementById('message-advertiser-modal').classList.add('hidden');
                document.getElementById('message-content').value = '';
                console.log('Message advertiser modal closed');
            } catch (error) {
                console.error('Error closing message advertiser modal:', error);
            }
        }

        function sendMessage() {
            try {
                const message = document.getElementById('message-content').value;
                if (!message) {
                    alert('Please enter a message.');
                    return;
                }
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message,
                    recipient: document.getElementById('message-recipient').value,
                    date: new Date().toISOString().split('T')[0]
                };
                updateNotifications();
                closeMessageAdvertiserModal();
                console.log('Message sent:', message);
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }

        function openProfilePicModal() {
            try {
                document.getElementById('profile-pic-modal').classList.remove('hidden');
                document.getElementById('profile-pic-upload').value = '';
                document.getElementById('profile-pic-preview').style.display = 'none';
                console.log('Profile picture modal opened');
            } catch (error) {
                console.error('Error opening profile picture modal:', error);
            }
        }

        function closeProfilePicModal() {
            try {
                document.getElementById('profile-pic-modal').classList.add('hidden');
                console.log('Profile picture modal closed');
            } catch (error) {
                console.error('Error closing profile picture modal:', error);
            }
        }

        function uploadProfilePic() {
            try {
                const fileInput = document.getElementById('profile-pic-upload');
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                        currentAdmin.profilePic = reader.result;
                        updateAdminProfile();
                        closeProfilePicModal();
                        console.log('Profile picture uploaded');
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Please select an image.');
                }
            } catch (error) {
                console.error('Error uploading profile picture:', error);
            }
        }

        document.getElementById('profile-pic-upload').addEventListener('change', (event) => {
            try {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const preview = document.getElementById('profile-pic-preview');
                        preview.src = reader.result;
                        preview.style.display = 'block';
                        console.log('Profile picture preview updated');
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                console.error('Error previewing profile picture:', error);
            }
        });

        function openSystemImageModal() {
            try {
                document.getElementById('system-image-modal').classList.remove('hidden');
                document.getElementById('system-image-upload').value = '';
                document.getElementById('system-image-preview').style.display = 'none';
                console.log('System image modal opened');
            } catch (error) {
                console.error('Error opening system image modal:', error);
            }
        }

        function closeSystemImageModal() {
            try {
                document.getElementById('system-image-modal').classList.add('hidden');
                console.log('System image modal closed');
            } catch (error) {
                console.error('Error closing system image modal:', error);
            }
        }

        function uploadSystemImage() {
            try {
                const fileInput = document.getElementById('system-image-upload');
                const imageType = document.getElementById('system-image-type').value;
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                        systemImages.push({ type: imageType, url: reader.result });
                        closeSystemImageModal();
                        console.log('System image uploaded:', imageType);
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Please select an image.');
                }
            } catch (error) {
                console.error('Error uploading system image:', error);
            }
        }

        document.getElementById('system-image-upload').addEventListener('change', (event) => {
            try {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const preview = document.getElementById('system-image-preview');
                        preview.src = reader.result;
                        preview.style.display = 'block';
                        console.log('System image preview updated');
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                console.error('Error previewing system image:', error);
            }
        });

        function openUploadNewsModal() {
            try {
                document.getElementById('upload-news-modal').classList.remove('hidden');
                document.getElementById('news-title').value = '';
                document.getElementById('news-author').value = '';
                document.getElementById('news-date').value = '';
                document.getElementById('news-content').value = '';
                document.getElementById('news-image-upload').value = '';
                document.getElementById('news-video-upload').value = '';
                document.getElementById('video-thumbnail-upload').value = '';
                document.getElementById('news-image-preview').style.display = 'none';
                document.getElementById('video-thumbnail-preview').style.display = 'none';
                console.log('Upload news modal opened');
            } catch (error) {
                console.error('Error opening upload news modal:', error);
            }
        }

        function closeUploadNewsModal() {
            try {
                document.getElementById('upload-news-modal').classList.add('hidden');
                console.log('Upload news modal closed');
            } catch (error) {
                console.error('Error closing upload news modal:', error);
            }
        }

        function uploadNews() {
            try {
                const title = document.getElementById('news-title').value;
                const author = document.getElementById('news-author').value;
                const date = document.getElementById('news-date').value;
                const content = document.getElementById('news-content').value;
                const imageFile = document.getElementById('news-image-upload').files[0];
                const videoFile = document.getElementById('news-video-upload').files[0];
                const thumbnailFile = document.getElementById('video-thumbnail-upload').files[0];
                if (!title || !author || !date || !content) {
                    alert('Please fill in all required fields.');
                    return;
                }
                const newsItem = {
                    id: newsItems.length + 1,
                    title,
                    author,
                    date,
                    content
                };
                if (imageFile) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        newsItem.image = reader.result;
                        if (videoFile) {
                            const videoReader = new FileReader();
                            videoReader.onload = () => {
                                newsItem.video = videoReader.result;
                                if (thumbnailFile) {
                                    const thumbnailReader = new FileReader();
                                    thumbnailReader.onload = () => {
                                        newsItem.thumbnail = thumbnailReader.result;
                                        newsItems.push(newsItem);
                                        closeUploadNewsModal();
                                        console.log('News uploaded:', newsItem);
                                    };
                                    thumbnailReader.readAsDataURL(thumbnailFile);
                                } else {
                                    newsItems.push(newsItem);
                                    closeUploadNewsModal();
                                    console.log('News uploaded:', newsItem);
                                }
                            };
                            videoReader.readAsDataURL(videoFile);
                        } else {
                            newsItems.push(newsItem);
                            closeUploadNewsModal();
                            console.log('News uploaded:', newsItem);
                        }
                    };
                    reader.readAsDataURL(imageFile);
                } else {
                    newsItems.push(newsItem);
                    closeUploadNewsModal();
                    console.log('News uploaded:', newsItem);
                }
            } catch (error) {
                console.error('Error uploading news:', error);
            }
        }

        document.getElementById('news-image-upload').addEventListener('change', (event) => {
            try {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const preview = document.getElementById('news-image-preview');
                        preview.src = reader.result;
                        preview.style.display = 'block';
                        console.log('News image preview updated');
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                console.error('Error previewing news image:', error);
            }
        });

        document.getElementById('video-thumbnail-upload').addEventListener('change', (event) => {
            try {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const preview = document.getElementById('video-thumbnail-preview');
                        preview.src = reader.result;
                        preview.style.display = 'block';
                        console.log('Video thumbnail preview updated');
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                console.error('Error previewing video thumbnail:', error);
            }
        });

        function openCommentModal() {
            try {
                document.getElementById('comment-modal').classList.remove('hidden');
                console.log('Comment modal opened');
            } catch (error) {
                console.error('Error opening comment modal:', error);
            }
        }

        function closeCommentModal() {
            try {
                document.getElementById('comment-modal').classList.add('hidden');
                document.getElementById('usability-rating').value = '1';
                document.getElementById('culture-rating').value = '1';
                document.getElementById('management-rating').value = '1';
                document.getElementById('role-rating').value = '1';
                document.getElementById('development-rating').value = '1';
                document.getElementById('compensation-rating').value = '1';
                document.getElementById('worklife-rating').value = '1';
                document.getElementById('mentalhealth-rating').value = '1';
                document.getElementById('comment-content').value = '';
                console.log('Comment modal closed');
            } catch (error) {
                console.error('Error closing comment modal:', error);
            }
        }

        function submitAstegniComment() {
            try {
                const comment = {
                    id: Object.keys(astegniComments).length + 1,
                    userName: currentAdmin.name,
                    userType: 'Admin',
                    content: document.getElementById('comment-content').value,
                    date: new Date().toISOString().split('T')[0],
                    usabilityRating: parseInt(document.getElementById('usability-rating').value),
                    cultureRating: parseInt(document.getElementById('culture-rating').value),
                    managementRating: parseInt(document.getElementById('management-rating').value),
                    roleRating: parseInt(document.getElementById('role-rating').value),
                    developmentRating: parseInt(document.getElementById('development-rating').value),
                    compensationRating: parseInt(document.getElementById('compensation-rating').value),
                    worklifeRating: parseInt(document.getElementById('worklife-rating').value),
                    mentalhealthRating: parseInt(document.getElementById('mentalhealth-rating').value),
                    isAdminComment: false
                };
                if (!comment.content) {
                    alert('Please enter a comment.');
                    return;
                }
                astegniComments[comment.id] = comment;
                updateSummary();
                searchAstegniComments();
                closeCommentModal();
                console.log('Astegni comment submitted:', comment);
            } catch (error) {
                console.error('Error submitting Astegni comment:', error);
            }
        }

        function openRequestLeaveModal() {
            try {
                document.getElementById('request-leave-modal').classList.remove('hidden');
                console.log('Request leave modal opened');
            } catch (error) {
                console.error('Error opening request leave modal:', error);
            }
        }

        function closeRequestLeaveModal() {
            try {
                document.getElementById('request-leave-modal').classList.add('hidden');
                document.getElementById('leave-start-date').value = '';
                document.getElementById('leave-end-date').value = '';
                document.getElementById('leave-reason').value = '';
                console.log('Request leave modal closed');
            } catch (error) {
                console.error('Error closing request leave modal:', error);
            }
        }

        function submitLeaveRequest() {
            try {
                const startDate = document.getElementById('leave-start-date').value;
                const endDate = document.getElementById('leave-end-date').value;
                const reason = document.getElementById('leave-reason').value;
                if (!startDate || !endDate || !reason) {
                    alert('Please fill in all fields.');
                    return;
                }
                notifications[Object.keys(notifications).length + 1] = {
                    id: Object.keys(notifications).length + 1,
                    message: `Leave request from ${currentAdmin.name}: ${reason} (${startDate} to ${endDate})`,
                    recipient: 'Admin',
                    date: new Date().toISOString().split('T')[0]
                };
                updateNotifications();
                closeRequestLeaveModal();
                console.log('Leave request submitted:', { startDate, endDate, reason });
            } catch (error) {
                console.error('Error submitting leave request:', error);
            }
        }

        function shareProfile() {
            try {
                const shareUrl = `${window.location.origin}/profile/admin/${currentAdmin.id}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('Profile link copied to clipboard!');
                    console.log('Profile shared:', shareUrl);
                });
            } catch (error) {
                console.error('Error sharing profile:', error);
            }
        }

        // Initialize on Load
        document.addEventListener('DOMContentLoaded', () => {
            try {
                initTheme();
                initDashboard();
                console.log('Page loaded and initialized');
            } catch (error) {
                console.error('Error during page load:', error);
            }
        });
    