// ============================================
// INITIALIZATION
// ============================================

// Hero Title Typing Animation
function initTypingAnimation() {
    const typedTextElement = document.getElementById('typedText');
    if (!typedTextElement) return;

    const phrases = [
        'Find Your Perfect Tutor',
        'Discover Expert Educators',
        'Connect with Top-Rated Teachers',
        'Learn from the Best'
    ];

    let currentPhraseIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;

    function typeText() {
        const currentPhrase = phrases[currentPhraseIndex];

        if (isDeleting) {
            currentCharIndex--;
        } else {
            currentCharIndex++;
        }

        typedTextElement.textContent = currentPhrase.substring(0, currentCharIndex);

        let typeSpeed = isDeleting ? 50 : 100;

        if (!isDeleting && currentCharIndex === currentPhrase.length) {
            typeSpeed = 2000; // Pause before deleting
            isDeleting = true;
        } else if (isDeleting && currentCharIndex === 0) {
            isDeleting = false;
            currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
            typeSpeed = 500; // Pause before typing next phrase
        }

        setTimeout(typeText, typeSpeed);
    }

    typeText();
}

// Function to parse URL parameters and apply filters
function applyUrlFilters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for subject parameter (for subject-specific filtering from course cards)
    const subject = urlParams.get('subject');
    if (subject) {
        console.log('Applying subject filter from URL:', subject);

        // Set both subject filter AND search filter
        FindTutorsState.updateFilter('subject', subject);
        FindTutorsState.updateFilter('search', subject);

        // Update the search bar to show the subject being searched
        const searchBar = document.getElementById('searchBar');
        if (searchBar) {
            searchBar.value = subject;
        }
    }

    // Check for search parameter (for general searches)
    const searchQuery = urlParams.get('search');
    if (searchQuery && !subject) { // Only if subject wasn't already set
        console.log('Applying search filter from URL:', searchQuery);
        FindTutorsState.updateFilter('search', searchQuery);

        // Update the search bar if it exists
        const searchBar = document.getElementById('searchBar');
        if (searchBar) {
            searchBar.value = searchQuery;
        }
    }

    // Check for courseType parameter
    const courseType = urlParams.get('courseType');
    if (courseType) {
        console.log('Applying courseType filter from URL:', courseType);
        FindTutorsState.updateFilter('courseType', courseType);

        // Update the courseType select dropdown if it exists
        const courseTypeSelect = document.getElementById('courseTypeSelect');
        if (courseTypeSelect) {
            courseTypeSelect.value = courseType;
        }
    }

    // Check for gradeLevel parameter
    const gradeLevel = urlParams.get('gradeLevel');
    if (gradeLevel) {
        console.log('Applying gradeLevel filter from URL:', gradeLevel);
        FindTutorsState.updateFilter('gradeLevel', gradeLevel);

        // Update the gradeLevel select dropdown if it exists
        const gradeLevelSelect = document.getElementById('gradeLevelSelect');
        if (gradeLevelSelect) {
            gradeLevelSelect.value = gradeLevel;
        }
    }

    // You can add more URL parameters here in the future as needed
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 INITIALIZING FIND TUTORS PAGE');

    // Initialize typing animation
    initTypingAnimation();

    // Wait for potential core modules to load
    setTimeout(() => {
        // Apply URL filters before initializing the controller
        applyUrlFilters();

        // Initialize the controller (which will load tutors with applied filters)
        FindTutorsController.init();
    }, 100);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FindTutorsController,
        FindTutorsState,
        FindTutorsUI,
        FindTutorsAPI
    };
}