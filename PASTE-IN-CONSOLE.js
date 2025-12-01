// PASTE THIS ENTIRE SCRIPT IN BROWSER CONSOLE (F12)
// This will diagnose the tooltip issue

console.clear();
console.log('🔍 TOOLTIP DIAGNOSTIC SCRIPT');
console.log('============================\n');

// 1. Find tooltip
const tooltip = document.querySelector('.rating-tooltip');
console.log('1. TOOLTIP ELEMENT:', tooltip ? '✅ Found' : '❌ Not found');

if (!tooltip) {
    console.error('CRITICAL: Cannot find .rating-tooltip element!');
} else {
    // 2. Get computed styles
    const computed = window.getComputedStyle(tooltip);

    console.log('\n2. COMPUTED STYLES:');
    console.log('   background:', computed.background);
    console.log('   background-color:', computed.backgroundColor);
    console.log('   background-image:', computed.backgroundImage);

    // 3. Check if transparent
    const isTransparent =
        computed.backgroundColor === 'rgba(0, 0, 0, 0)' ||
        computed.backgroundColor === 'transparent' ||
        computed.backgroundColor === '';

    console.log('\n3. IS TRANSPARENT?', isTransparent ? '❌ YES (PROBLEM!)' : '✅ NO (Good)');

    // 4. Check inline styles
    console.log('\n4. INLINE STYLES:');
    console.log('   style.background:', tooltip.style.background || '(none)');
    console.log('   style.backgroundColor:', tooltip.style.backgroundColor || '(none)');

    // 5. List ALL CSS rules that match
    console.log('\n5. ALL CSS RULES FOR .rating-tooltip:');
    let ruleCount = 0;

    for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
            const rules = sheet.cssRules || sheet.rules;
            for (let j = 0; j < rules.length; j++) {
                const rule = rules[j];
                if (rule.selectorText && rule.selectorText.includes('.rating-tooltip')) {
                    ruleCount++;
                    const source = sheet.href ? new URL(sheet.href).pathname.split('/').pop() : 'inline';
                    const bg = rule.style.background || rule.style.backgroundColor || '(not set)';
                    console.log(`   [${ruleCount}] ${rule.selectorText}`);
                    console.log(`       background: ${bg}`);
                    console.log(`       from: ${source}`);
                    console.log('');
                }
            }
        } catch (e) {
            // CORS - skip
        }
    }

    console.log(`   Total rules found: ${ruleCount}`);

    // 6. Check theme
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    console.log('\n6. CURRENT THEME:', theme);

    // 7. Check CSS variables
    const rootStyle = window.getComputedStyle(document.documentElement);
    console.log('\n7. CSS VARIABLES:');
    console.log('   --card-bg:', rootStyle.getPropertyValue('--card-bg') || '(not set)');
    console.log('   --modal-bg:', rootStyle.getPropertyValue('--modal-bg') || '(not set)');

    // 8. Force show tooltip
    console.log('\n8. FORCING TOOLTIP VISIBLE...');
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
    tooltip.style.display = 'block';
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '999999';
    console.log('   → Tooltip should now be visible on screen');

    // 9. Try forcing background
    console.log('\n9. TESTING: Forcing white background via JS...');
    tooltip.style.backgroundColor = 'rgb(255, 255, 255)';
    tooltip.style.background = 'rgb(255, 255, 255)';

    setTimeout(() => {
        const newBg = window.getComputedStyle(tooltip).backgroundColor;
        console.log('   After forcing:');
        console.log('   computed background-color:', newBg);

        if (newBg === 'rgb(255, 255, 255)' || newBg === 'rgba(255, 255, 255, 1)') {
            console.log('   ✅ JS successfully set background');
            console.log('   → Problem: CSS is not applying OR is being overridden');
        } else {
            console.error('   ❌ Even JS cannot set background!');
            console.log('   → Problem: Something is blocking background styles entirely');
        }
    }, 500);
}

console.log('\n============================');
console.log('📋 COPY THE OUTPUT ABOVE AND SEND IT');
