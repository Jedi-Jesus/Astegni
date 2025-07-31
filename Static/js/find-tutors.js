document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Toggle
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        mainContent.classList.toggle('shifted');
    });

    // Profile Dropdown
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    profileBtn.addEventListener('click', () => {
        profileDropdown.classList.toggle('hidden');
    });

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    themeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
    });

    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
    }

    // Tutor Data
    const tutors = [
        { name: 'John Doe', courses: ['Math', 'Physics'], grades: ['High School', 'College'], location: 'New York', teachesAt: 'New York University', gender: 'Male', learningMethod: 'Hybrid', rating: 4.4, price: 50, favorite: false, inSearchHistory: false },
        { name: 'Sarah Smith', courses: ['English', 'Literature'], grades: ['Middle School', 'High School'], location: 'Chicago', teachesAt: 'Online Academy', gender: 'Female', learningMethod: 'Online', rating: 4.78, price: 40, favorite: false, inSearchHistory: false },
        { name: 'Michael Brown', courses: ['Chemistry', 'Biology'], grades: ['College', 'Graduate'], location: 'Boston', teachesAt: 'Boston College', gender: 'Male', learningMethod: 'In-person', rating: 4.32, price: 60, favorite: false, inSearchHistory: false },
        { name: 'Emily Davis', courses: ['History', 'Social Studies'], grades: ['High School'], location: 'Los Angeles', teachesAt: 'Los Angeles High School', gender: 'Female', learningMethod: 'Hybrid', rating: 3.78, price: 35, favorite: false, inSearchHistory: false },
        { name: 'David Lee', courses: ['Computer Science', 'Programming'], grades: ['College', 'Graduate'], location: 'San Francisco', teachesAt: 'CodeTech Institute', gender: 'Male', learningMethod: 'Online', rating: 4.86, price: 55, favorite: false, inSearchHistory: false },
        { name: 'Lisa Johnson', courses: ['Algebra', 'Calculus'], grades: ['High School'], location: 'Miami', teachesAt: 'Miami University', gender: 'Female', learningMethod: 'Online', rating: 4.2, price: 45, favorite: false, inSearchHistory: false },
        { name: 'James Wilson', courses: ['Economics', 'Finance'], grades: ['College'], location: 'Seattle', teachesAt: 'University of Washington', gender: 'Male', learningMethod: 'Hybrid', rating: 4.5, price: 50, favorite: false, inSearchHistory: false },
        { name: 'Anna Martinez', courses: ['Spanish', 'French'], grades: ['Middle School', 'High School'], location: 'Houston', teachesAt: 'Houston Language School', gender: 'Female', learningMethod: 'In-person', rating: 4.6, price: 42, favorite: false, inSearchHistory: false },
        { name: 'Robert Taylor', courses: ['Physics', 'Astronomy'], grades: ['College'], location: 'Austin', teachesAt: 'University of Texas', gender: 'Male', learningMethod: 'Hybrid', rating: 4.3, price: 55, favorite: false, inSearchHistory: false },
        { name: 'Emma White', courses: ['Literature', 'Writing'], grades: ['High School'], location: 'Denver', teachesAt: 'Denver High School', gender: 'Female', learningMethod: 'Online', rating: 4.7, price: 38, favorite: false, inSearchHistory: false },
        { name: 'Thomas Clark', courses: ['Biology', 'Environmental Science'], grades: ['College', 'Graduate'], location: 'Portland', teachesAt: 'Portland State University', gender: 'Male', learningMethod: 'In-person', rating: 4.4, price: 50, favorite: false, inSearchHistory: false },
        { name: 'Olivia Harris', courses: ['History', 'Geography'], grades: ['Middle School'], location: 'Phoenix', teachesAt: 'Phoenix Academy', gender: 'Female', learningMethod: 'Hybrid', rating: 4.1, price: 40, favorite: false, inSearchHistory: false },
        { name: 'William Lewis', courses: ['Computer Science', 'Data Science'], grades: ['Graduate'], location: 'San Diego', teachesAt: 'UC San Diego', gender: 'Male', learningMethod: 'Online', rating: 4.8, price: 60, favorite: false, inSearchHistory: false },
        { name: 'Sophia Walker', courses: ['Chemistry', 'Organic Chemistry'], grades: ['College'], location: 'Atlanta', teachesAt: 'Georgia Tech', gender: 'Female', learningMethod: 'In-person', rating: 4.5, price: 48, favorite: false, inSearchHistory: false },
        { name: 'Daniel Young', courses: ['Math', 'Statistics'], grades: ['High School', 'College'], location: 'Dallas', teachesAt: 'Dallas Community College', gender: 'Male', learningMethod: 'Hybrid', rating: 4.3, price: 45, favorite: false, inSearchHistory: false },
        { name: 'Isabella King', courses: ['English', 'Creative Writing'], grades: ['High School'], location: 'Philadelphia', teachesAt: 'Philadelphia High School', gender: 'Female', learningMethod: 'Online', rating: 4.6, price: 40, favorite: false, inSearchHistory: false }
    ];

    // Generate Tutor Cards
    const tutorCardsContainer = document.getElementById('tutorCards');
    function generateTutorCard(tutor, index) {
        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 animate__animated animate__zoomIn" style="animation-delay: ${index * 0.1}s;">
                <div class="flex items-center mb-2">
                    <img src="https://via.placeholder.com/50" alt="Profile Picture" class="w-12 h-12 rounded-full mr-2">
                    <div class="flex-1">
                        <div class="flex justify-between items-center">
                            <a href="view-tutor.html" class="font-semibold text-gray-800 dark:text-white hover:text-blue-500">${tutor.name}</a>
                            <div class="flex space-x-2">
                                <button class="favorite-btn text-gray-600 dark:text-gray-300 hover:text-yellow-500" data-index="${index}">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                    </svg>
                                </button>
                                <button class="save-btn text-gray-600 dark:text-gray-300 hover:text-blue-500">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="relative">
                            <span class="rating-stars text-yellow-500 cursor-pointer">${'★'.repeat(Math.round(tutor.rating))}${'☆'.repeat(5 - Math.round(tutor.rating))}</span>
                            <div class="rating-tooltip absolute hidden bg-gray-800 text-white text-xs rounded p-2 -mt-12 z-10">
                                Engagement: ${tutor.rating.toFixed(1)}<br>
                                Discipline: ${(tutor.rating - 0.4).toFixed(1)}<br>
                                Punctuality: ${(tutor.rating + 0.2).toFixed(1)}<br>
                                Communication: ${(tutor.rating - 0.2).toFixed(1)}<br>
                                Subject Matter: ${(tutor.rating + 0.3).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
                <p class="text-gray-600 dark:text-gray-300"><strong>Gender:</strong> ${tutor.gender}</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Courses:</strong> ${tutor.courses.join(', ')}</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Grades:</strong> ${tutor.grades.join(', ')}</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Experience:</strong> ${Math.floor(tutor.price / 10)} years</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Teaches at:</strong> ${tutor.teachesAt}</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Location:</strong> ${tutor.location}</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Learning Methods:</strong> ${tutor.learningMethod}</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Bio:</strong> Experienced tutor in ${tutor.courses[0]}.</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Quote:</strong> "Learn with passion."</p>
                <p class="text-gray-600 dark:text-gray-300"><strong>Price:</strong> $${tutor.price}/hr</p>
                <a href="view-tutor.html" class="block mt-4 text-center bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">View Tutor</a>
            </div>
        `;
    }

    // Add Tutor Cards and Ad Placeholders
    const adFrequency = 12;
    tutorCardsContainer.innerHTML = '';
    tutors.forEach((tutor, index) => {
        tutorCardsContainer.insertAdjacentHTML('beforeend', generateTutorCard(tutor, index));
        if ((index + 1) % adFrequency === 0) {
            tutorCardsContainer.insertAdjacentHTML('beforeend', `
                <div class="ad-placeholder h-48 bg-gray-300 dark:bg-gray-700 flex items-center justify-center transition-all duration-300">
                    <span class="ad-text text-gray-600 dark:text-gray-300">Ad Placeholder ${Math.floor(index / adFrequency) + 1}</span>
                </div>
            `);
        }
    });

    // Favorite and Save Buttons
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    const saveButtons = document.querySelectorAll('.save-btn');

    favoriteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const index = btn.dataset.index;
            btn.classList.toggle('text-yellow-500');
            tutors[index].favorite = !tutors[index].favorite;
            applyFilters();
        });
    });

    saveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('text-blue-500');
        });
    });

    // Rating Tooltip Hover
    document.querySelectorAll('.rating-stars').forEach(stars => {
        const tooltip = stars.nextElementSibling;
        stars.addEventListener('mouseenter', () => {
            tooltip.classList.remove('hidden');
        });
        stars.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
        });
    });

    // Ad Rotation
    const adPlaceholders = document.querySelectorAll('.ad-placeholder .ad-text, #adPlaceholder .ad-text');
    const ads = ['Ad 1: Learn Math Today!', 'Ad 2: Boost Your Grades!', 'Ad 3: Expert Tutors Await!'];
    let adIndex = 0;

    function rotateAd() {
        adPlaceholders.forEach(placeholder => {
            if (!placeholder) return;
            placeholder.style.opacity = '0';
            setTimeout(() => {
                placeholder.textContent = ads[adIndex];
                placeholder.style.opacity = '1';
                placeholder.parentElement.classList.add('animate__animated', 'animate__pulse');
                setTimeout(() => {
                    placeholder.parentElement.classList.remove('animate__animated', 'animate__pulse');
                }, 1000);
            }, 500);
        });
        adIndex = (adIndex + 1) % ads.length;
    }

    rotateAd();
    setInterval(rotateAd, 8000);

    // Typing Animation for Hero Text
    const typedTextElement = document.getElementById('typedText');
    const cursorElement = document.getElementById('cursor');
    const heroTexts = ['Find Your Perfect Tutor', 'Learn with the Best Tutors', 'Discover Expert Educators'];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        if (!typedTextElement || !cursorElement) return;
        const currentText = heroTexts[textIndex];
        typedTextElement.textContent = currentText.substring(0, charIndex);
        cursorElement.style.display = 'inline';

        if (!isDeleting) {
            charIndex++;
            if (charIndex > currentText.length) {
                isDeleting = true;
                setTimeout(type, 1000);
            } else {
                setTimeout(type, 100);
            }
        } else {
            charIndex--;
            if (charIndex < 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % heroTexts.length;
                setTimeout(type, 500);
            } else {
                setTimeout(type, 50);
            }
        }
    }

    type();

    // Search and Filter Functionality
    const searchBar = document.getElementById('searchBar');
    const tutorCards = document.getElementById('tutorCards').children;
    const genderCheckboxes = document.querySelectorAll('input[name="gender"]');
    const nearMeCheckbox = document.querySelector('input[name="nearMe"]');
    const favoriteCheckbox = document.querySelector('input[name="favorite"]');
    const searchHistoryCheckbox = document.querySelector('input[name="searchHistory"]');
    const ratingSelect = document.querySelector('select[name="rating"]');
    const learningMethodSelect = document.querySelector('select[name="learningMethod"]');
    const gradeSelect = document.querySelector('select[name="grade"]');
    const minPriceInput = document.querySelector('input[name="minPrice"]');
    const maxPriceInput = document.querySelector('input[name="maxPrice"]');
    const requestCourseBtn = document.getElementById('requestCourse');
    const requestSchoolBtn = document.getElementById('requestSchool');

    function applyFilters() {
        const query = searchBar.value.toLowerCase().trim();
        const selectedGenders = Array.from(genderCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const nearMe = nearMeCheckbox.checked;
        const favorite = favoriteCheckbox.checked;
        const searchHistory = searchHistoryCheckbox.checked;
        const rating = ratingSelect.value;
        const learningMethod = learningMethodSelect.value;
        const grade = gradeSelect.value;
        const minPrice = parseFloat(minPriceInput.value) || 0;
        const maxPrice = parseFloat(maxPriceInput.value) || Infinity;

        let courseMatch = false;
        let schoolMatch = false;

        Array.from(tutorCards).forEach((card, index) => {
            if (card.classList.contains('ad-placeholder')) {
                card.style.display = '';
                return;
            }
            const tutorIndex = index - Math.floor(index / (adFrequency + 1));
            const tutor = tutors[tutorIndex];
            let isMatch = true;

            if (query) {
                const matchesCourse = tutor.courses.some(course => course.toLowerCase().includes(query));
                const matchesSchool = tutor.teachesAt.toLowerCase().includes(query);
                isMatch = isMatch && (
                    tutor.name.toLowerCase().includes(query) ||
                    matchesCourse ||
                    tutor.grades.some(grade => grade.toLowerCase().includes(query)) ||
                    matchesSchool
                );
                if (matchesCourse) courseMatch = true;
                if (matchesSchool) schoolMatch = true;
            }

            if (selectedGenders.length > 0) {
                isMatch = isMatch && selectedGenders.includes(tutor.gender);
            }

            if (nearMe) {
                isMatch = isMatch && tutor.location === 'New York';
            }

            if (favorite) {
                isMatch = isMatch && tutor.favorite;
            }

            if (searchHistory) {
                isMatch = isMatch && tutor.inSearchHistory;
            }

            if (rating) {
                if (rating === '>=4.5') {
                    isMatch = isMatch && tutor.rating >= 4.5;
                } else if (rating === '>=4.0&&<4.5') {
                    isMatch = isMatch && tutor.rating >= 4.0 && tutor.rating < 4.5;
                } else if (rating === '>=3.5&&<4.0') {
                    isMatch = isMatch && tutor.rating >= 3.5 && tutor.rating < 4.0;
                } else if (rating === '>=3.0&&<3.5') {
                    isMatch = isMatch && tutor.rating >= 3.0 && tutor.rating < 3.5;
                } else if (rating === '>=2.5&&<3.0') {
                    isMatch = isMatch && tutor.rating >= 2.5 && tutor.rating < 3.0;
                } else if (rating === '>=2.0&&<2.5') {
                    isMatch = isMatch && tutor.rating >= 2.0 && tutor.rating < 2.5;
                }
            }

            if (learningMethod) {
                isMatch = isMatch && tutor.learningMethod === learningMethod;
            }

            if (grade) {
                isMatch = isMatch && tutor.grades.includes(grade);
            }

            isMatch = isMatch && tutor.price >= minPrice && tutor.price <= maxPrice;

            card.style.display = isMatch ? '' : 'none';
        });

        requestCourseBtn.classList.toggle('hidden', courseMatch || schoolMatch || !query);
        requestSchoolBtn.classList.toggle('hidden', schoolMatch || courseMatch || !query);
    }

    searchBar.addEventListener('input', applyFilters);
    genderCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    nearMeCheckbox.addEventListener('change', applyFilters);
    favoriteCheckbox.addEventListener('change', applyFilters);
    searchHistoryCheckbox.addEventListener('change', applyFilters);
    ratingSelect.addEventListener('change', applyFilters);
    learningMethodSelect.addEventListener('change', applyFilters);
    gradeSelect.addEventListener('change', applyFilters);
    minPriceInput.addEventListener('input', applyFilters);
    maxPriceInput.addEventListener('input', applyFilters);

    // Request Course Modal
    const requestCourseModal = document.getElementById('requestCourseModal');
    const cancelCourseBtn = document.getElementById('cancelCourseBtn');
    const submitCourseBtn = document.getElementById('submitCourseBtn');

    requestCourseBtn.addEventListener('click', () => {
        requestCourseModal.classList.toggle('hidden');
    });

    cancelCourseBtn.addEventListener('click', () => {
        requestCourseModal.classList.add('hidden');
    });

    submitCourseBtn.addEventListener('click', () => {
        console.log('Course Request Submitted:', {
            courseName: document.getElementById('courseName').value,
            courseType: document.getElementById('courseType').value,
            courseDescription: document.getElementById('courseDescription').value
        });
        requestCourseModal.classList.add('hidden');
    });

    // Request School Modal
    const requestSchoolModal = document.getElementById('requestSchoolModal');
    const cancelSchoolBtn = document.getElementById('cancelSchoolBtn');
    const submitSchoolBtn = document.getElementById('submitSchoolBtn');

    requestSchoolBtn.addEventListener('click', () => {
        requestSchoolModal.classList.toggle('hidden');
    });

    cancelSchoolBtn.addEventListener('click', () => {
        requestSchoolModal.classList.add('hidden');
    });

    submitSchoolBtn.addEventListener('click', () => {
        console.log('School Request Submitted:', {
            schoolName: document.getElementById('schoolName').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            location: document.getElementById('location').value
        });
        requestSchoolModal.classList.add('hidden');
    });
});