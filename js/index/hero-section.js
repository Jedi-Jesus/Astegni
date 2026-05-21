

// ============================================
//   HERO SECTION
// ============================================

// Use global CONFIG or default values
const heroConfig = window.CONFIG || {
    TYPING_SPEED: 100,
    COUNTER_DURATION: 2000
};

function initializeHeroSection() {
    const heroTexts = [
        "Discover Expert Tutors with Astegni",
        "Learn Anytime, Anywhere",
        "Your Learning Partner",
        "World's Premier Educational Platform"
    ];

    let textIndex = 0;
    const textElement = document.getElementById("hero-text-content");

    if (textElement) {
        typeWriterEffect(textElement, heroTexts, textIndex);
    }

    createParticles();
    initializeHeroSlideshow();
    initializeCounterScrollEffect();

    const heroLoginBtn = document.getElementById("hero-login-btn");
    const heroRegisterBtn = document.getElementById("hero-register-btn");

    if (heroLoginBtn) {
        heroLoginBtn.addEventListener("click", () => {
            if (window.openModal) {
                window.openModal("login-modal");
            }
        });
    }
    if (heroRegisterBtn) {
        heroRegisterBtn.addEventListener("click", () => {
            if (window.openModal) {
                window.openModal("register-modal");
            }
        });
    }
}

function typeWriterEffect(element, texts, index) {
    if (!element || !texts || texts.length === 0) return;

    const text = texts[index];
    let charIndex = 0;
    element.textContent = "";

    const typeInterval = setInterval(() => {
        if (charIndex < text.length) {
            element.textContent += text[charIndex];
            charIndex++;
        } else {
            clearInterval(typeInterval);
            setTimeout(() => {
                deleteText(element, texts, index);
            }, 3000);
        }
    }, heroConfig.TYPING_SPEED);
}

function deleteText(element, texts, index) {
    if (!element) return;

    const deleteInterval = setInterval(() => {
        if (element.textContent.length > 0) {
            element.textContent = element.textContent.slice(0, -1);
        } else {
            clearInterval(deleteInterval);
            const nextIndex = (index + 1) % texts.length;
            typeWriterEffect(element, texts, nextIndex);
        }
    }, 50);
}

function createParticles() {
    const container = document.getElementById("hero-particles");
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.width = Math.random() * 10 + 5 + "px";
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 20 + "s";
        particle.style.animationDuration = Math.random() * 20 + 20 + "s";
        container.appendChild(particle);
    }
}

function initializeHeroSlideshow() {
    // Slideshow images disabled — using solid color from CSS to avoid copyright issues.
}

