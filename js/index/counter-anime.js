
// ============================================
//   COUNTERS
// ============================================

// Use global API base URL
const counterApiUrl = window.API_BASE_URL || 'http://localhost:8000';

async function fetchStatistics() {
    try {
        const response = await fetch(`${counterApiUrl}/api/statistics`);
        if (response.ok) {
            const stats = await response.json();
            return [
                { id: "counter-parents", target: stats.registered_parents ?? 0, current: 0, suffix: "+" },
                { id: "counter-students", target: stats.students ?? 0, current: 0, suffix: "+" },
                { id: "counter-tutors", target: stats.expert_tutors ?? 0, current: 0, suffix: "+" },
                { id: "counter-centers", target: stats.training_centers ?? 0, current: 0, suffix: "+" },
                { id: "counter-books", target: stats.books_available ?? 0, current: 0, suffix: "+" },
                { id: "counter-jobs", target: stats.job_opportunities ?? 0, current: 0, suffix: "+" },
            ];
        }
    } catch (error) {
        console.log('Using fallback statistics');
    }
    // Return fallback data
    return [
        { id: "counter-parents", target: 1273, current: 0, suffix: "+" },
        { id: "counter-students", target: 5670, current: 0, suffix: "+" },
        { id: "counter-tutors", target: 327, current: 0, suffix: "+" },
        { id: "counter-centers", target: 59, current: 0, suffix: "+" },
        { id: "counter-books", target: 13879, current: 0, suffix: "+" },
        { id: "counter-jobs", target: 47, current: 0, suffix: "+" },
    ];
}

async function initializeCounters() {
    const counters = await fetchStatistics();

    const observerOptions = {
        threshold: 0.5,
        rootMargin: "0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const counter = counters.find((c) => c.id === entry.target.id);
                if (counter && counter.current === 0) {
                    animateCounter(entry.target, counter.target, counter.suffix);
                    counter.current = counter.target;
                }
            }
        });
    }, observerOptions);

    counters.forEach((counter) => {
        const element = document.getElementById(counter.id);
        if (element) observer.observe(element);
    });

    window.countersData = counters;
}

function initializeCounterScrollEffect() {
    const heroSection = document.querySelector(".hero-section");
    let hasScrolledOut = false;
    let isResetting = false;

    window.addEventListener("scroll", () => {
        if (!heroSection || !window.countersData) return;

        const rect = heroSection.getBoundingClientRect();
        const isVisible = rect.bottom > 0;

        if (!isVisible && !hasScrolledOut) {
            hasScrolledOut = true;
            window.countersData.forEach((counter) => {
                const element = document.getElementById(counter.id);
                if (element) {
                    const halfValue = Math.floor(counter.target / 2);
                    element.textContent = halfValue.toLocaleString() + counter.suffix;
                    counter.current = halfValue;
                }
            });
        }

        if (isVisible && hasScrolledOut && !isResetting) {
            hasScrolledOut = false;
            isResetting = true;
            window.countersData.forEach((counter) => {
                const element = document.getElementById(counter.id);
                if (element) {
                    animateCounterFromValue(element, counter.current, counter.target, counter.suffix);
                    counter.current = counter.target;
                }
            });
            setTimeout(() => {
                isResetting = false;
            }, 2000);
        }
    });
}

function animateCounter(element, target, suffix) {
    if (!element) return;

    let current = 0;
    const CONFIG = window.CONFIG || { COUNTER_DURATION: 2000 };
    const increment = target / (CONFIG.COUNTER_DURATION / 16);

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
}

function animateCounterFromValue(element, start, target, suffix) {
    if (!element) return;

    let current = start;
    const CONFIG = window.CONFIG || { COUNTER_DURATION: 2000 };
    const increment = (target - start) / (CONFIG.COUNTER_DURATION / 16);

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
}
