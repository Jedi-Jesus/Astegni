/**
 * Interested In Ticker Widget
 * Dynamically populates ticker animation with student's interests from database
 * Reads from student_profiles.interested_in array
 */

class InterestedTickerManager {
    constructor() {
        this.tickerWrapper = document.getElementById('ticker-wrapper-interested');
        this.tickerItemsFirst = document.getElementById('ticker-items-first');
        this.tickerItemsDuplicate = document.getElementById('ticker-items-duplicate');

        // Subject to emoji mapping
        this.subjectEmojis = {
            // Core Subjects
            'Mathematics': '🧮',
            'Math': '🧮',
            'Algebra': '🧮',
            'Geometry': '📐',
            'Calculus': '📈',
            'Statistics': '📊',

            // Sciences
            'Science': '🔬',
            'Physics': '⚛️',
            'Chemistry': '🧪',
            'Biology': '🧬',
            'Environmental Science': '🌱',

            // Languages
            'English': '📖',
            'Literature': '📚',
            'Language Arts': '✍️',
            'Creative Writing': '✒️',
            'Reading': '📕',

            // Social Studies
            'History': '📜',
            'Geography': '🌍',
            'Social Studies': '🗺️',
            'Civics': '🏛️',
            'Economics': '💰',

            // Technology
            'Computer Science': '💻',
            'Programming': '💻',
            'Coding': '👨‍💻',
            'Web Development': '🌐',
            'Robotics': '🤖',
            'Technology': '⚙️',

            // Arts
            'Art': '🎨',
            'Drawing': '✏️',
            'Painting': '🖌️',
            'Design': '🎨',
            'Graphic Design': '🖼️',
            'Music': '🎵',
            'Theater': '🎭',
            'Drama': '🎭',
            'Dance': '💃',

            // Physical Education
            'Physical Education': '⚽',
            'PE': '🏃',
            'Sports': '🏅',
            'Athletics': '🏋️',

            // Other
            'Business': '💼',
            'Philosophy': '🤔',
            'Psychology': '🧠',
            'Health': '🏥',
            'Nutrition': '🥗'
        };
    }

    /**
     * Get emoji for subject
     */
    getEmojiForSubject(subject) {
        if (!subject) return '📌';

        // Check exact match first
        if (this.subjectEmojis[subject]) {
            return this.subjectEmojis[subject];
        }

        // Check case-insensitive partial match
        const lowerSubject = subject.toLowerCase();
        for (const [key, emoji] of Object.entries(this.subjectEmojis)) {
            if (key.toLowerCase().includes(lowerSubject) || lowerSubject.includes(key.toLowerCase())) {
                return emoji;
            }
        }

        // Default emoji
        return '📌';
    }

    /**
     * Create a ticker item element
     */
    createTickerItem(subject) {
        const emoji = this.getEmojiForSubject(subject);

        const item = document.createElement('span');
        item.className = 'ticker-item';
        item.innerHTML = `<span>${emoji}</span> ${subject}`;

        return item;
    }

    /**
     * Populate ticker with interests from database
     */
    populateTicker(interests) {
        if (!this.tickerItemsFirst || !this.tickerItemsDuplicate) {
            console.error('Ticker containers not found');
            return;
        }

        // Clear existing content
        this.tickerItemsFirst.innerHTML = '';
        this.tickerItemsDuplicate.innerHTML = '';

        // If no interests, show default message
        if (!interests || !Array.isArray(interests) || interests.length === 0) {
            const defaultInterests = ['Mathematics', 'Science', 'Literature', 'Art', 'Music'];
            interests = defaultInterests;
        }

        // Create ticker items for first set
        interests.forEach(interest => {
            const item = this.createTickerItem(interest);
            this.tickerItemsFirst.appendChild(item);
        });

        // Duplicate items for seamless loop
        interests.forEach(interest => {
            const item = this.createTickerItem(interest);
            this.tickerItemsDuplicate.appendChild(item);
        });

        console.log('✅ Ticker populated with interests:', interests);
    }

    /**
     * Initialize ticker from student data
     */
    init(studentData) {
        if (!studentData) {
            console.warn('No student data provided to ticker');
            return;
        }

        // Get interested_in array from student data
        const interests = studentData.interested_in || [];

        console.log('📊 Loading interests into ticker:', interests);
        this.populateTicker(interests);
    }
}

// Global instance
window.interestedTickerManager = new InterestedTickerManager();

// Auto-initialize when student data is loaded
// This will be called by view-student-loader.js after data is fetched
console.log('✅ Interested Ticker Manager loaded');
