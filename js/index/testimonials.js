
// ============================================
//   TESTIMONIALS WITH ZOOM ANIMATION
// ============================================
function initializeTestimonials() {
    const testimonialData = [
        {
            text: "Astegni helped me find the perfect math tutor. My grades improved from C to A in just 3 months!",
            author: "Sara Tadesse",
            role: "Grade 12 Student",
            avatar: "https://picsum.photos/60",
            dataType: "Test data"
        },
        {
            text: "As a tutor, Astegni gave me the platform to reach students nationwide. I now teach over 50 students online!",
            author: "Daniel Bekele",
            role: "Physics Tutor",
            avatar: "https://picsum.photos/61",
            dataType: "Test data"            
        },
        {
            text: "The variety of courses and quality of instructors on Astegni is unmatched. Best investment in my child's education!",
            author: "Marta Alemu",
            role: "Parent",
            avatar: "https://picsum.photos/62",
            dataType: "Test data"
        },
        {
            text: "I found my dream job through Astegni's job portal. The platform is truly life-changing!",
            author: "Yohannes Girma",
            role: "Software Developer",
            avatar: "https://picsum.photos/63",
            dataType: "Test data"
        },
        {
            text: "Our training center reached 10x more students after joining Astegni. Highly recommended!",
            author: "Tigist Haile",
            role: "Training Center Director",
            avatar: "https://picsum.photos/64",
            dataType: "Test data"
        },
        {
            text: "The online learning tools and resources are amazing. I can learn at my own pace!",
            author: "Abebe Mengistu",
            role: "University Student",
            avatar: "https://picsum.photos/65",
            dataType: "Test data"
        },
    ];

    let currentSet = 0;
    const slider = document.getElementById("testimonials-slider");

    if (!slider) return;

    function updateTestimonials() {
        slider.innerHTML = "";
        const startIndex = currentSet * 3;

        for (let i = 0; i < 3; i++) {
            const testimonial =
                testimonialData[(startIndex + i) % testimonialData.length];
            const card = document.createElement("div");
            card.className = "testimonial-card active";
            card.innerHTML = `
                <div class="testimonial-content">
                    <div class="quote-icon">"</div>
                    <p class="testimonial-text">${testimonial.text}</p>
                    <div class="testimonial-author">
                        <img src="${testimonial.avatar}" alt="${testimonial.author}" class="author-avatar">
                        <div class="author-info">
                            <h4>${testimonial.author}</h4>
                            <p>${testimonial.role}</p>
                            <div class="rating">⭐⭐⭐⭐⭐</div>
                            <p>${testimonial.dataType}</p>
                        </div>
                    </div>
                </div>
            `;
            slider.appendChild(card);
        }

        // Restart animation
        setTimeout(() => {
            document.querySelectorAll(".testimonial-card").forEach((card, index) => {
                card.style.animationDelay = `${index * 0.3}s`;
            });
        }, 100);
    }

    updateTestimonials();

    // Change testimonials every 9 seconds
    setInterval(() => {
        currentSet = (currentSet + 1) % Math.ceil(testimonialData.length / 3);
        updateTestimonials();
    }, 9000);
}
