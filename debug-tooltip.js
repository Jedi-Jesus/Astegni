// DEBUG SCRIPT FOR RATING TOOLTIP
// Copy and paste this into browser console when on view-tutor.html

console.log('🔍 RATING TOOLTIP DEBUG SCRIPT');
console.log('================================');

// Find the tooltip element
const tooltip = document.querySelector('.rating-tooltip');
if (!tooltip) {
    console.error('❌ Tooltip element not found!');
} else {
    console.log('✅ Tooltip element found:', tooltip);

    // Get computed styles
    const computedStyle = window.getComputedStyle(tooltip);

    console.log('\n📊 COMPUTED STYLES:');
    console.log('-------------------');
    console.log('background-color:', computedStyle.backgroundColor);
    console.log('background-image:', computedStyle.backgroundImage);
    console.log('background:', computedStyle.background);
    console.log('opacity:', computedStyle.opacity);
    console.log('visibility:', computedStyle.visibility);
    console.log('display:', computedStyle.display);
    console.log('position:', computedStyle.position);
    console.log('z-index:', computedStyle.zIndex);

    // Check for inline styles
    console.log('\n🎨 INLINE STYLES:');
    console.log('-------------------');
    console.log('tooltip.style.background:', tooltip.style.background);
    console.log('tooltip.style.backgroundColor:', tooltip.style.backgroundColor);
    console.log('Full style attribute:', tooltip.getAttribute('style'));

    // Check all applied CSS rules
    console.log('\n📝 ALL CSS RULES APPLIED:');
    console.log('-------------------');
    const rules = document.styleSheets;
    let foundRules = [];

    for (let sheet of rules) {
        try {
            const cssRules = sheet.cssRules || sheet.rules;
            for (let rule of cssRules) {
                if (rule.selectorText && rule.selectorText.includes('.rating-tooltip')) {
                    foundRules.push({
                        selector: rule.selectorText,
                        background: rule.style.background || rule.style.backgroundColor || 'not set',
                        href: sheet.href || 'inline/internal'
                    });
                }
            }
        } catch (e) {
            // CORS or access issues
        }
    }

    console.table(foundRules);

    // Check theme
    const theme = document.documentElement.getAttribute('data-theme');
    console.log('\n🌓 CURRENT THEME:', theme || 'light (default)');

    // Check CSS variables
    console.log('\n🔧 CSS VARIABLES:');
    console.log('-------------------');
    const rootStyle = window.getComputedStyle(document.documentElement);
    console.log('--card-bg:', rootStyle.getPropertyValue('--card-bg'));
    console.log('--modal-bg:', rootStyle.getPropertyValue('--modal-bg'));

    // Force show tooltip for inspection
    console.log('\n👁️ FORCING TOOLTIP VISIBLE:');
    console.log('-------------------');
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
    tooltip.style.display = 'block';
    console.log('Tooltip should now be visible. Check if background is solid or transparent.');

    // Test: Force solid white background
    console.log('\n🧪 TEST: Forcing solid white background:');
    console.log('-------------------');
    tooltip.style.backgroundColor = 'rgb(255, 255, 255)';
    tooltip.style.background = 'rgb(255, 255, 255)';
    console.log('Applied: background = rgb(255, 255, 255)');
    console.log('If tooltip is NOW solid, CSS is being overridden!');

    // Get final computed background
    setTimeout(() => {
        const finalBg = window.getComputedStyle(tooltip).backgroundColor;
        console.log('\n✅ FINAL COMPUTED BACKGROUND:', finalBg);
        console.log('Expected: rgb(255, 255, 255) for light mode OR rgb(26, 26, 26) for dark mode');

        if (finalBg === 'rgba(0, 0, 0, 0)' || finalBg === 'transparent') {
            console.error('❌ BACKGROUND IS TRANSPARENT! CSS is being overridden somewhere!');
        } else {
            console.log('✅ Background has a color value');
        }
    }, 100);
}

console.log('\n================================');
console.log('🔍 DEBUG COMPLETE - Check results above');
