
// ============================================
//   SCROLL EFFECTS
// ============================================
function initializeScrollEffects() {
    window.addEventListener("scroll", () => {
        const scrollProgress = document.getElementById("scroll-progress");
        if (scrollProgress) {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            scrollProgress.style.width = scrollPercent + "%";
        }
    });

    const backToTop = document.getElementById("back-to-top");
    window.addEventListener("scroll", () => {
        if (backToTop) {
            if (window.scrollY > 500) {
                backToTop.classList.add("visible");
            } else {
                backToTop.classList.remove("visible");
            }
        }
    });

    if (backToTop) {
        backToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("animate-in");
            }
        });
    }, observerOptions);

    document.querySelectorAll(".feature-card, .course-flip-card, .testimonial-card").forEach((el) => {
        observer.observe(el);
    });
}
