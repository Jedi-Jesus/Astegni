// ============================================
//   TUTOR PROFILE HERO SECTION TYPEWRITER ANIMATION
// ============================================

// Configuration
const tutorHeroConfig = {
    TYPING_SPEED: 100,      // Speed of typing in milliseconds per character
    DELETE_SPEED: 50,       // Speed of deleting in milliseconds per character
    PAUSE_DURATION: 3000    // Pause duration after typing completes (3 seconds)
};

// Default hero texts that will rotate (used if no database value)
let tutorHeroTexts = [
    "Excellence in Education, Delivered with Passion",
    "Empowering Students Through Expert Guidance",
    "Your Success is My Mission",
    "Transforming Lives Through Quality Teaching",
    "Building Futures, One Student at a Time"
];

let currentTextIndex = 0;
let typewriterActive = false;
let currentTypeInterval = null;
let currentDeleteInterval = null;
let currentPauseTimeout = null;
let heroTextsLoadedFromDB = false; // Flag to track if custom texts were loaded
let isAnimationLocked = false; // Mutex to prevent concurrent animations

/**
 * Initialize the hero section typewriter effect
 * Only starts animation if custom hero titles haven't been loaded from database
 */
function initializeTutorHeroSection() {
    const textElement = document.getElementById("hero-text-content");

    // Only start default animation if database values weren't set
    if (textElement && !typewriterActive && !heroTextsLoadedFromDB) {
        // Wait longer for database to load before starting default animation
        // This prevents the default texts from briefly showing before DB values load
        setTimeout(() => {
            if (!heroTextsLoadedFromDB && !typewriterActive) {
                typewriterActive = true;
                startTypewriterEffect(textElement, tutorHeroTexts, currentTextIndex);
            }
        }, 2000); // 2 second delay to allow database load
    }
}

/**
 * Main typewriter effect function
 * @param {HTMLElement} element - The element to type text into
 * @param {Array<string>} texts - Array of texts to cycle through
 * @param {number} index - Current text index
 */
function startTypewriterEffect(element, texts, index) {
    if (!element || !texts || texts.length === 0) return;

    // Prevent concurrent animations
    if (isAnimationLocked) {
        console.log('Animation already in progress, skipping...');
        return;
    }
    isAnimationLocked = true;

    const text = texts[index];
    let charIndex = 0;
    element.textContent = "";

    // Clear any existing intervals before starting new one
    if (currentTypeInterval) {
        clearInterval(currentTypeInterval);
        currentTypeInterval = null;
    }

    // Typing interval - store in tracking variable
    currentTypeInterval = setInterval(() => {
        if (charIndex < text.length) {
            element.textContent += text[charIndex];
            charIndex++;
        } else {
            clearInterval(currentTypeInterval);
            currentTypeInterval = null;

            // Pause before deleting - store timeout in tracking variable
            currentPauseTimeout = setTimeout(() => {
                currentPauseTimeout = null;
                isAnimationLocked = false; // Release lock before deleting
                deleteTypewriterText(element, texts, index);
            }, tutorHeroConfig.PAUSE_DURATION);
        }
    }, tutorHeroConfig.TYPING_SPEED);
}

/**
 * Delete text with backspace effect
 * @param {HTMLElement} element - The element to delete text from
 * @param {Array<string>} texts - Array of texts to cycle through
 * @param {number} index - Current text index
 */
function deleteTypewriterText(element, texts, index) {
    if (!element) return;

    // Prevent concurrent animations
    if (isAnimationLocked) {
        console.log('Animation already in progress, skipping delete...');
        return;
    }
    isAnimationLocked = true;

    // Clear any existing delete intervals
    if (currentDeleteInterval) {
        clearInterval(currentDeleteInterval);
        currentDeleteInterval = null;
    }

    // Delete interval - store in tracking variable
    currentDeleteInterval = setInterval(() => {
        if (element.textContent.length > 0) {
            element.textContent = element.textContent.slice(0, -1);
        } else {
            clearInterval(currentDeleteInterval);
            currentDeleteInterval = null;
            isAnimationLocked = false; // Release lock before starting next text

            // Move to next text
            currentTextIndex = (index + 1) % texts.length;
            startTypewriterEffect(element, texts, currentTextIndex);
        }
    }, tutorHeroConfig.DELETE_SPEED);
}

/**
 * Stop the typewriter effect (if needed for cleanup)
 */
function stopTutorHeroTypewriter() {
    typewriterActive = false;
    isAnimationLocked = false; // Release any locks

    // Clear all intervals and timeouts
    if (currentTypeInterval) {
        clearInterval(currentTypeInterval);
        currentTypeInterval = null;
    }
    if (currentDeleteInterval) {
        clearInterval(currentDeleteInterval);
        currentDeleteInterval = null;
    }
    if (currentPauseTimeout) {
        clearTimeout(currentPauseTimeout);
        currentPauseTimeout = null;
    }

    // Clear the text content immediately
    const textElement = document.getElementById("hero-text-content");
    if (textElement) {
        textElement.textContent = "";
    }
}

/**
 * Set custom hero texts and restart animation
 * @param {string|Array<string>} customTexts - Single text or array of texts
 */
function setTutorHeroTexts(customTexts) {
    console.log('Setting new hero texts:', customTexts);

    // Stop current animation and clear display
    stopTutorHeroTypewriter();

    // Mark that custom texts were loaded from database
    heroTextsLoadedFromDB = true;

    // Set new texts
    if (typeof customTexts === 'string') {
        // Single text provided
        tutorHeroTexts = [customTexts];
    } else if (Array.isArray(customTexts) && customTexts.length > 0) {
        // Array of texts provided
        tutorHeroTexts = customTexts;
    } else {
        console.warn('Invalid customTexts provided, keeping existing texts');
        return;
    }

    // Reset index
    currentTextIndex = 0;

    // Small delay to ensure clean state before restarting
    setTimeout(() => {
        const textElement = document.getElementById("hero-text-content");
        if (textElement) {
            typewriterActive = true;
            startTypewriterEffect(textElement, tutorHeroTexts, currentTextIndex);
        }
    }, 100); // 100ms delay to ensure clean transition
}

/**
 * Add a text to the rotation (optionally at the beginning)
 * @param {string} text - Text to add
 * @param {boolean} prepend - If true, add at beginning; otherwise add at end
 */
function addTutorHeroText(text, prepend = false) {
    if (prepend) {
        tutorHeroTexts.unshift(text);
    } else {
        tutorHeroTexts.push(text);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTutorHeroSection);
} else {
    // DOM already loaded
    initializeTutorHeroSection();
}

// Export functions for external use
window.initializeTutorHeroSection = initializeTutorHeroSection;
window.stopTutorHeroTypewriter = stopTutorHeroTypewriter;
window.setTutorHeroTexts = setTutorHeroTexts;
window.addTutorHeroText = addTutorHeroText;
