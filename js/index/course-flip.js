// ============================================
//   COURSES WITH FLIP CARDS AND DETAILS (8 CARDS)
// ============================================

// Use global API base URL
const courseApiUrl = window.API_BASE_URL || 'http://localhost:8000';

async function fetchCoursesFromAPI() {
    try {
        // Fetch 16 courses (8 cards × 2 sides = 16 unique courses)
        const response = await fetch(`${courseApiUrl}/api/courses?limit=16&sort_by=popular`);
        if (response.ok) {
            const data = await response.json();
            if (data.courses && data.courses.length >= 16) {
                // Create 8 flip cards, each with 2 unique courses (no duplicates)
                const flipCards = [];
                for (let i = 0; i < 8; i++) {
                    const frontCourse = data.courses[i];
                    const backCourse = data.courses[i + 8]; // Second half for backs

                    flipCards.push({
                        title: frontCourse.title,
                        icon: frontCourse.icon || getCourseIcon(frontCourse.category),
                        category: frontCourse.category,
                        level: frontCourse.level,
                        students: formatStudentCount(frontCourse.students),
                        rating: frontCourse.rating.toString(),
                        instructor: frontCourse.instructor,
                        price: frontCourse.price,
                        thumbnail: frontCourse.thumbnail,
                        // Back side uses course from second half (no duplicates)
                        backTitle: backCourse.title,
                        backIcon: backCourse.icon || getCourseIcon(backCourse.category),
                        backLevel: backCourse.level,
                        backStudents: formatStudentCount(backCourse.students),
                        backRating: backCourse.rating.toString()
                    });
                }
                return flipCards;
            }
        }
    } catch (error) {
        console.log('Using fallback course data:', error);
    }
    return null;
}

function getCourseIcon(category) {
    const icons = {
        tech: '💻',
        language: '🗣️',
        arts: '🎨',
        business: '💼',
        math: '📐',
        science: '🔬'
    };
    return icons[category] || '📚';
}

function formatStudentCount(count) {
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

function getFlipCourse(index) {
    const flipCourses = [
        { title: "Cosmetology", icon: "💄", level: "All Levels", students: "1.2K", rating: "4.9" },
        { title: "Programming", icon: "💻", level: "Beginner", students: "5K", rating: "5.0" },
        { title: "Sports Training", icon: "🏃", level: "All Levels", students: "800", rating: "4.6" },
        { title: "Art Design", icon: "🎨", level: "Intermediate", students: "2.1K", rating: "4.8" },
        { title: "Business", icon: "💼", level: "Advanced", students: "3.5K", rating: "4.7" },
        { title: "Photography", icon: "📷", level: "Beginner", students: "1.5K", rating: "4.9" },
        { title: "Cooking", icon: "👨‍🍳", level: "All Levels", students: "900", rating: "4.8" },
        { title: "Dance", icon: "💃", level: "Beginner", students: "1.3K", rating: "4.7" }
    ];
    return flipCourses[index % flipCourses.length];
}

async function initializeCourses() {
    // Try to fetch from API first
    const apiCourses = await fetchCoursesFromAPI();

    // Fallback data
    const coursesData = apiCourses || [
        {
            title: "Mathematics",
            icon: "📐",
            category: "tech",
            level: "Beginner",
            students: "2.5K",
            rating: "4.8",
            backTitle: "Cosmetology",
            backIcon: "💄",
            backLevel: "All Levels",
            backStudents: "1.2K",
            backRating: "4.9",
        },
        {
            title: "Physics",
            icon: "⚛️",
            category: "tech",
            level: "Intermediate",
            students: "1.8K",
            rating: "4.9",
            backTitle: "Programming",
            backIcon: "💻",
            backLevel: "Beginner",
            backStudents: "5K",
            backRating: "5.0",
        },
        {
            title: "Chemistry",
            icon: "🧪",
            category: "tech",
            level: "Advanced",
            students: "1.2K",
            rating: "4.7",
            backTitle: "Sports Training",
            backIcon: "🏃",
            backLevel: "All Levels",
            backStudents: "800",
            backRating: "4.6",
        },
        {
            title: "Music",
            icon: "🎵",
            category: "arts",
            level: "Beginner",
            students: "3K",
            rating: "4.8",
            backTitle: "Culinary Arts",
            backIcon: "🍳",
            backLevel: "Intermediate",
            backStudents: "600",
            backRating: "4.7",
        },
        {
            title: "English",
            icon: "🇬🇧",
            category: "language",
            level: "All Levels",
            students: "4K",
            rating: "4.9",
            backTitle: "Chinese",
            backIcon: "🇨🇳",
            backLevel: "Beginner",
            backStudents: "1.5K",
            backRating: "4.8",
        },
        {
            title: "Business",
            icon: "📊",
            category: "business",
            level: "Intermediate",
            students: "2K",
            rating: "4.8",
            backTitle: "Marketing",
            backIcon: "🎯",
            backLevel: "Advanced",
            backStudents: "1.8K",
            backRating: "4.9",
        },
        {
            title: "Photography",
            icon: "📸",
            category: "arts",
            level: "All Levels",
            students: "1.5K",
            rating: "4.7",
            backTitle: "Graphic Design",
            backIcon: "🎨",
            backLevel: "Intermediate",
            backStudents: "2.2K",
            backRating: "4.8",
        },
        {
            title: "Special Needs",
            icon: "♿",
            category: "arts",
            level: "Beginner",
            students: "900",
            rating: "4.6",
            backTitle: "Sign Language",
            backIcon: "🤟",
            backLevel: "All Levels",
            backStudents: "1.1K",
            backRating: "4.7",
        },
    ];

    const container = document.getElementById("courses-container");
    if (!container) return;

    container.innerHTML = "";

    coursesData.forEach((course, index) => {
        const card = document.createElement("div");
        card.className = "course-flip-card";
        card.dataset.category = course.category;
        card.innerHTML = `
            <div class="course-flip-inner">
                <div class="course-flip-front">
                    <div class="course-flip-icon">${course.icon}</div>
                    <h3 class="course-flip-title">${course.title}</h3>
                    <div class="course-flip-details">
                        <p class="course-flip-level">${course.level}</p>
                        <div class="course-flip-stats">
                            <span class="course-flip-stat">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                ${course.students}
                            </span>
                            <span class="course-flip-stat course-rating">
                                ⭐ ${course.rating}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="course-flip-back">
                    <div class="course-flip-icon">${course.backIcon}</div>
                    <h3 class="course-flip-title">${course.backTitle}</h3>
                    <div class="course-flip-details">
                        <p class="course-flip-level">${course.backLevel}</p>
                        <div class="course-flip-stats">
                            <span class="course-flip-stat">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                ${course.backStudents}
                            </span>
                            <span class="course-flip-stat">
                                ⭐ ${course.backRating}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add click handlers to front and back sides separately
        const frontSide = card.querySelector('.course-flip-front');
        const backSide = card.querySelector('.course-flip-back');

        if (frontSide) {
            frontSide.addEventListener("click", (e) => {
                e.stopPropagation();
                handleCourseClick(course.title);
            });
        }

        if (backSide) {
            backSide.addEventListener("click", (e) => {
                e.stopPropagation();
                handleCourseClick(course.backTitle);
            });
        }

        container.appendChild(card);
    });

    // Course filters
    document.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.addEventListener("click", (e) => {
            document.querySelector(".filter-chip.active")?.classList.remove("active");
            e.target.classList.add("active");
            filterCourses(e.target.dataset.filter);
        });
    });
}

function filterCourses(filter) {
    const cards = document.querySelectorAll(".course-flip-card");
    cards.forEach((card) => {
        if (filter === "all" || card.dataset.category === filter) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

function handleCourseClick(courseTitle) {
    // Navigate to find-tutors.html with subject filter (filters tutors teaching this subject)
    window.location.href = `branch/find-tutors.html?subject=${encodeURIComponent(courseTitle)}`;
}

function handleViewMoreCourses() {
    // Navigate to find-tutors.html without filters
    window.location.href = "branch/find-tutors.html";
}

// Export functions to global scope for HTML onclick handlers
window.handleCourseClick = handleCourseClick;
window.handleViewMoreCourses = handleViewMoreCourses;
