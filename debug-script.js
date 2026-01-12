// ============================================
// COUNTER FLIP ANIMATION DEBUG SCRIPT
// Copy and paste this into the browser console on astegni.com
// ============================================

console.clear();
console.log('%c🔍 COUNTER FLIP ANIMATION DEBUGGER', 'background: #4fc3f7; color: #000; padding: 10px; font-size: 16px; font-weight: bold;');
console.log('=' .repeat(80));

// Test 1: Check if counter flip cards exist
console.log('\n%c[TEST 1] Checking Counter Flip Card Elements', 'color: #81c784; font-weight: bold; font-size: 14px;');
const flipCards = document.querySelectorAll('.counter-flip-card');
console.log(`Found ${flipCards.length} counter-flip-card elements`);

if (flipCards.length === 0) {
    console.error('%c❌ ERROR: No .counter-flip-card elements found!', 'color: #f44336; font-weight: bold;');
    console.log('Expected 3 cards. Check if the HTML structure is correct.');
} else {
    console.log('%c✅ SUCCESS: Counter flip cards found', 'color: #4caf50; font-weight: bold;');
    flipCards.forEach((card, index) => {
        console.log(`  Card ${index + 1}:`, card);
    });
}

// Test 2: Check if CSS file is loaded
console.log('\n%c[TEST 2] Checking CSS Files', 'color: #81c784; font-weight: bold; font-size: 14px;');
const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
const heroCSS = cssLinks.find(link => link.href.includes('hero-section.css'));

if (heroCSS) {
    console.log('%c✅ hero-section.css is loaded:', 'color: #4caf50; font-weight: bold;');
    console.log('  URL:', heroCSS.href);
} else {
    console.error('%c❌ ERROR: hero-section.css not found!', 'color: #f44336; font-weight: bold;');
}

console.log('\nAll CSS files loaded:');
cssLinks.forEach(link => {
    console.log(`  - ${link.href}`);
});

// Test 3: Check computed styles on flip cards
console.log('\n%c[TEST 3] Checking Computed Styles', 'color: #81c784; font-weight: bold; font-size: 14px;');
if (flipCards.length > 0) {
    flipCards.forEach((card, index) => {
        const inner = card.querySelector('.counter-flip-inner');
        if (inner) {
            const styles = window.getComputedStyle(inner);
            console.log(`\n  Card ${index + 1} (.counter-flip-inner) styles:`);
            console.log(`    animation: ${styles.animation}`);
            console.log(`    animation-name: ${styles.animationName}`);
            console.log(`    animation-duration: ${styles.animationDuration}`);
            console.log(`    animation-delay: ${styles.animationDelay}`);
            console.log(`    animation-iteration-count: ${styles.animationIterationCount}`);
            console.log(`    transform: ${styles.transform}`);
            console.log(`    transform-style: ${styles.transformStyle}`);
            console.log(`    perspective: ${window.getComputedStyle(card).perspective}`);

            if (styles.animationName === 'none') {
                console.error(`    %c❌ No animation applied to card ${index + 1}!`, 'color: #f44336; font-weight: bold;');
            } else {
                console.log(`    %c✅ Animation detected: ${styles.animationName}`, 'color: #4caf50; font-weight: bold;');
            }
        } else {
            console.error(`  %c❌ Card ${index + 1} missing .counter-flip-inner!`, 'color: #f44336; font-weight: bold;');
        }
    });
}

// Test 4: Check if autoFlipCounter keyframes exist
console.log('\n%c[TEST 4] Checking CSS Animation Keyframes', 'color: #81c784; font-weight: bold; font-size: 14px;');
try {
    const sheets = Array.from(document.styleSheets);
    let foundKeyframes = false;

    for (const sheet of sheets) {
        try {
            const rules = Array.from(sheet.cssRules || []);
            const keyframeRule = rules.find(rule =>
                rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'autoFlipCounter'
            );

            if (keyframeRule) {
                foundKeyframes = true;
                console.log('%c✅ Found @keyframes autoFlipCounter', 'color: #4caf50; font-weight: bold;');
                console.log('  Defined in:', sheet.href || 'inline styles');
                console.log('  Keyframe rule:', keyframeRule.cssText.substring(0, 200) + '...');
                break;
            }
        } catch (e) {
            // Cross-origin stylesheets - skip
        }
    }

    if (!foundKeyframes) {
        console.error('%c❌ ERROR: @keyframes autoFlipCounter not found!', 'color: #f44336; font-weight: bold;');
        console.log('This means the CSS animation definition is missing.');
    }
} catch (error) {
    console.warn('%c⚠️ Could not check keyframes (cross-origin restrictions)', 'color: #ff9800; font-weight: bold;');
    console.log('Error:', error.message);
}

// Test 5: Check for CSS conflicts
console.log('\n%c[TEST 5] Checking for CSS Conflicts', 'color: #81c784; font-weight: bold; font-size: 14px;');
if (flipCards.length > 0) {
    const firstCard = flipCards[0];
    const inner = firstCard.querySelector('.counter-flip-inner');

    if (inner) {
        const styles = window.getComputedStyle(inner);

        // Check for common issues
        const issues = [];

        if (styles.display === 'none' || styles.visibility === 'hidden') {
            issues.push('Element is hidden (display: none or visibility: hidden)');
        }

        if (styles.transformStyle !== 'preserve-3d') {
            issues.push(`transform-style is "${styles.transformStyle}" (should be "preserve-3d")`);
        }

        if (parseFloat(styles.width) === 0 || parseFloat(styles.height) === 0) {
            issues.push('Element has zero width or height');
        }

        if (issues.length > 0) {
            console.warn('%c⚠️ Potential issues found:', 'color: #ff9800; font-weight: bold;');
            issues.forEach(issue => console.log(`  - ${issue}`));
        } else {
            console.log('%c✅ No obvious CSS conflicts detected', 'color: #4caf50; font-weight: bold;');
        }
    }
}

// Test 6: Check backface-visibility
console.log('\n%c[TEST 6] Checking Flip Card Face Visibility', 'color: #81c784; font-weight: bold; font-size: 14px;');
if (flipCards.length > 0) {
    const firstCard = flipCards[0];
    const front = firstCard.querySelector('.counter-flip-front');
    const back = firstCard.querySelector('.counter-flip-back');

    if (front && back) {
        const frontStyles = window.getComputedStyle(front);
        const backStyles = window.getComputedStyle(back);

        console.log('  Front face:');
        console.log(`    backface-visibility: ${frontStyles.backfaceVisibility}`);
        console.log(`    transform: ${frontStyles.transform}`);

        console.log('  Back face:');
        console.log(`    backface-visibility: ${backStyles.backfaceVisibility}`);
        console.log(`    transform: ${backStyles.transform}`);

        if (frontStyles.backfaceVisibility !== 'hidden' || backStyles.backfaceVisibility !== 'hidden') {
            console.warn('%c⚠️ backface-visibility should be "hidden" for both faces', 'color: #ff9800; font-weight: bold;');
        } else {
            console.log('%c✅ backface-visibility correctly set', 'color: #4caf50; font-weight: bold;');
        }
    } else {
        console.error('%c❌ Front or back face elements not found', 'color: #f44336; font-weight: bold;');
    }
}

// Test 7: Force animation (manual test)
console.log('\n%c[TEST 7] Manual Animation Test', 'color: #81c784; font-weight: bold; font-size: 14px;');
console.log('Run this command to manually trigger a flip on the first card:');
console.log('%cdocument.querySelector(".counter-flip-inner").style.transform = "rotateY(180deg)";', 'background: #2d2d30; padding: 5px; color: #ce9178;');

// Summary
console.log('\n' + '='.repeat(80));
console.log('%c📊 DIAGNOSIS SUMMARY', 'background: #4fc3f7; color: #000; padding: 10px; font-size: 16px; font-weight: bold;');

const summary = {
    'Cards Found': flipCards.length === 3 ? '✅ YES' : '❌ NO',
    'CSS Loaded': heroCSS ? '✅ YES' : '❌ NO',
    'Animation Applied': flipCards.length > 0 && window.getComputedStyle(flipCards[0].querySelector('.counter-flip-inner')).animationName !== 'none' ? '✅ YES' : '❌ NO'
};

Object.entries(summary).forEach(([key, value]) => {
    const color = value.includes('✅') ? '#4caf50' : '#f44336';
    console.log(`%c${key}: ${value}`, `color: ${color}; font-weight: bold;`);
});

console.log('\n%cNext Steps:', 'color: #4fc3f7; font-weight: bold; font-size: 14px;');
if (flipCards.length === 0) {
    console.log('1. Check that the HTML structure includes <div class="counter-flip-card"> elements');
} else if (!heroCSS) {
    console.log('1. Ensure css/index/hero-section.css is properly loaded');
} else if (flipCards.length > 0 && window.getComputedStyle(flipCards[0].querySelector('.counter-flip-inner')).animationName === 'none') {
    console.log('1. The CSS animation is not being applied. Check:');
    console.log('   - Is the @keyframes autoFlipCounter defined in hero-section.css?');
    console.log('   - Are there CSS specificity conflicts?');
    console.log('   - Is there a CSP blocking inline styles?');
} else {
    console.log('1. Animation should be working. Wait 12 seconds to see the flip.');
    console.log('2. If still not working, check browser support for CSS 3D transforms.');
}

console.log('\n' + '='.repeat(80));
