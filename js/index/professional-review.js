// ============================================
//   PROFESSIONAL REVIEWS SYSTEM
// ============================================

// Use global API base URL
const reviewApiUrl = window.API_BASE_URL || 'https://api.astegni.com';

// Fallback data in case API is unavailable
const professionalReviewsData = [
    {
        id: 1,
        name: "Dr. Sarah Johnson",
        title: "Educational Technology Specialist",
        institution: "Ministry of Education",
        review: "Astegni represents a revolutionary approach to digital learning in Ethiopia. The platform's integration of local content with global standards makes it an invaluable educational resource.",
        rating: 5,
        expertise: "EdTech",
        image: "https://picsum.photos/80/80?random=1",
        verified: true
    },
    {
        id: 2,
        name: "Prof. Michael Teshome",
        title: "Computer Science Department Head",
        institution: "Addis Ababa University",
        review: "The technical architecture and user experience design of Astegni demonstrates world-class development standards. This platform will significantly impact Ethiopia's educational landscape.",
        rating: 5,
        expertise: "Computer Science",
        image: "https://picsum.photos/80/80?random=2",
        verified: true
    },
    {
        id: 3,
        name: "Dr. Almaz Desta",
        title: "Learning Sciences Researcher",
        institution: "Ethiopian Education Research Institute",
        review: "Astegni's adaptive learning algorithms and personalized content delivery show remarkable effectiveness in improving student outcomes across diverse learning styles.",
        rating: 5,
        expertise: "Learning Sciences",
        image: "https://picsum.photos/80/80?random=3",
        verified: true
    },
    {
        id: 4,
        name: "Engineer Dawit Mekuria",
        title: "Software Architecture Consultant",
        institution: "Tech Innovation Hub",
        review: "From a technical perspective, Astegni's scalable infrastructure and responsive design make it one of the most robust educational platforms I've evaluated.",
        rating: 5,
        expertise: "Software Engineering",
        image: "https://picsum.photos/80/80?random=4",
        verified: true
    },
    {
        id: 5,
        name: "Dr. Hanan Ahmed",
        title: "Digital Pedagogy Expert",
        institution: "Ethiopian Institute of Technology",
        review: "Astegni's approach to blended learning and interactive content creation sets a new standard for educational technology in East Africa.",
        rating: 5,
        expertise: "Digital Pedagogy",
        image: "https://picsum.photos/80/80?random=5",
        verified: true
    },
    {
        id: 6,
        name: "Prof. Yohannes Haile",
        title: "Educational Psychology Professor",
        institution: "Haramaya University",
        review: "The platform's understanding of diverse learning needs and cognitive load principles demonstrates sophisticated educational psychology implementation.",
        rating: 5,
        expertise: "Educational Psychology",
        image: "https://picsum.photos/80/80?random=6",
        verified: true
    }
];

const recognitionStats = [
    { label: "Expert Reviews", value: "50+", icon: "⭐" },
    { label: "Educational Institutions", value: "25+", icon: "🏫" },
    { label: "Research Citations", value: "15+", icon: "📚" },
    { label: "Industry Awards", value: "8+", icon: "🏆" }
];

async function fetchReviewsFromAPI() {
    try {
        const response = await fetch(`${reviewApiUrl}/api/reviews?type=professional&featured=true&limit=6`);
        if (response.ok) {
            const data = await response.json();
            if (data.reviews && data.reviews.length > 0) {
                // Transform API data to match our format
                return {
                    reviews: data.reviews.map(r => ({
                        id: r.id,
                        name: r.reviewer.name,
                        title: r.reviewer.title,
                        institution: r.reviewer.organization,
                        review: r.review,
                        rating: r.rating,
                        expertise: r.type === 'professional' ? 'EdTech' : 'Education',
                        image: r.reviewer.avatar,
                        verified: r.verified
                    })),
                    stats: data.stats || recognitionStats
                };
            }
        }
    } catch (error) {
        console.log('Using fallback reviews data');
    }
    return null;
}

async function initializeProfessionalReviews() {
    const container = document.getElementById('professionalReviewsContainer');
    const statsContainer = document.getElementById('reviewStats');

    if (!container || !statsContainer) {
        console.log('Professional reviews containers not found');
        return;
    }

    console.log('Initializing professional reviews...');

    // Try to fetch from API first
    const apiData = await fetchReviewsFromAPI();
    const reviewsToUse = apiData?.reviews || professionalReviewsData;

    // Render reviews
    container.innerHTML = reviewsToUse.map((review, index) => `
        <div class="professional-review-card ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="review-header">
                <div class="reviewer-info">
                    <img src="${review.image}" alt="${review.name}" class="reviewer-avatar" loading="lazy">
                    <div class="reviewer-details">
                        <h4 class="reviewer-name">
                            ${review.name}
                            ${review.verified ? '<span class="verified-badge" title="Verified Professional">✓</span>' : ''}
                        </h4>
                        <p class="reviewer-title">${review.title}</p>
                        <p class="reviewer-institution">${review.institution}</p>
                        <span class="expertise-badge">${review.expertise}</span>
                    </div>
                </div>
                <div class="review-rating">${'★'.repeat(review.rating)}</div>
            </div>
            <blockquote class="review-content">"${review.review}"</blockquote>
        </div>
    `).join('');

    // Start the carousel
    startReviewCarousel();

    // Render stats (static - no animation)
    statsContainer.innerHTML = `
        ${recognitionStats.map((stat) => `
            <div class="stat-item">
                <div class="stat-icon">${stat.icon}</div>
                <span class="stat-number">${stat.value}</span>
                <span class="stat-label">${stat.label}</span>
            </div>
        `).join('')}
    `;

    console.log('✅ Professional reviews loaded');
}

// Carousel functionality
let currentReviewIndex = 0;
let reviewInterval;

function startReviewCarousel() {
    const cards = document.querySelectorAll('.professional-review-card');
    if (cards.length <= 1) return;

    // Clear any existing interval
    if (reviewInterval) clearInterval(reviewInterval);

    reviewInterval = setInterval(() => {
        // Fade out current card
        const currentCard = cards[currentReviewIndex];
        currentCard.classList.remove('active');
        currentCard.classList.add('fade-out');

        // Move to next card
        currentReviewIndex = (currentReviewIndex + 1) % cards.length;
        const nextCard = cards[currentReviewIndex];

        // Fade in next card after a short delay
        setTimeout(() => {
            currentCard.classList.remove('fade-out');
            nextCard.classList.add('active');
        }, 500);
    }, 5000); // Change card every 5 seconds for better readability
}

// Pause carousel on hover
function setupCarouselHoverPause() {
    const container = document.getElementById('professionalReviewsContainer');
    if (!container) return;

    container.addEventListener('mouseenter', () => {
        if (reviewInterval) clearInterval(reviewInterval);
    });

    container.addEventListener('mouseleave', () => {
        startReviewCarousel();
    });
}

// Make functions globally available
window.initializeProfessionalReviews = initializeProfessionalReviews;
window.setupCarouselHoverPause = setupCarouselHoverPause;
