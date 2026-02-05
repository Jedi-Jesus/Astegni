// Run this in browser console on tutor-profile to check palette application

console.log('%c=== PALETTE DIAGNOSTIC ===', 'color: #00a676; font-size: 16px; font-weight: bold;');

// 1. Check HTML attribute
const dataPalette = document.documentElement.getAttribute('data-palette');
console.log('1. HTML data-palette:', dataPalette || '❌ NOT SET');

// 2. Check localStorage
const lsAppearance = localStorage.getItem('appearance_settings');
let paletteInLS = null;
if (lsAppearance) {
    try {
        paletteInLS = JSON.parse(lsAppearance).colorPalette;
        console.log('2. localStorage palette:', paletteInLS);
    } catch (e) {
        console.log('2. localStorage palette: ❌ Parse error');
    }
} else {
    console.log('2. localStorage palette: ❌ NOT SET');
}

// 3. Check if CSS file loaded
const colorPalettesLoaded = Array.from(document.styleSheets).some(sheet => {
    try {
        return sheet.href && sheet.href.includes('color-palettes.css');
    } catch (e) {
        return false;
    }
});
console.log('3. color-palettes.css loaded:', colorPalettesLoaded ? '✅ YES' : '❌ NO');

// 4. Check computed CSS variables
const styles = getComputedStyle(document.documentElement);
const primaryColor = styles.getPropertyValue('--primary-color').trim();
const buttonBg = styles.getPropertyValue('--button-bg').trim();
console.log('4. --primary-color:', primaryColor || '❌ NOT SET');
console.log('   --button-bg:', buttonBg || '❌ NOT SET');

// 5. Check if emerald-gold-charcoal colors are applied
if (dataPalette === 'emerald-gold-charcoal') {
    const expectedPrimary = '#00a676'; // Emerald green
    const isCorrect = primaryColor.toLowerCase() === expectedPrimary ||
                     primaryColor === 'rgb(0, 166, 118)';

    console.log('5. Palette match:', isCorrect ? '✅ CORRECT' : '❌ WRONG');
    if (!isCorrect) {
        console.log('   Expected: #00a676 (emerald green)');
        console.log('   Got:', primaryColor);
        console.log('   🔍 This means CSS is NOT applying the palette!');
    }
}

// 6. Test manual palette application
console.log('\n%c=== TEST FIX ===', 'color: #f59e0b; font-size: 14px; font-weight: bold;');
console.log('Run this to manually set palette:');
console.log('%cdocument.documentElement.setAttribute("data-palette", "emerald-gold-charcoal");', 'color: #00a676; font-family: monospace;');
console.log('\nThen check if button colors change to green.');

// 7. Check if palette CSS selectors exist
console.log('\n%c=== CSS RULES CHECK ===', 'color: #3b82f6; font-size: 14px; font-weight: bold;');
let paletteRulesFound = false;
try {
    for (const sheet of document.styleSheets) {
        if (sheet.href && sheet.href.includes('color-palettes.css')) {
            console.log('Found color-palettes.css:', sheet.href);
            const rules = sheet.cssRules || sheet.rules;
            for (const rule of rules) {
                if (rule.selectorText && rule.selectorText.includes('[data-palette="emerald-gold-charcoal"]')) {
                    paletteRulesFound = true;
                    console.log('✅ Found CSS rule:', rule.selectorText);
                    console.log('   --primary-color:', rule.style.getPropertyValue('--primary-color'));
                    break;
                }
            }
        }
    }
    if (!paletteRulesFound) {
        console.log('❌ CSS rules for emerald-gold-charcoal NOT found');
        console.log('   Possible causes:');
        console.log('   1. CSS file not loading');
        console.log('   2. @import in root.css failing');
        console.log('   3. CSS specificity issue');
    }
} catch (e) {
    console.log('⚠️ Cannot read CSS rules (CORS or security restriction)');
    console.log('   This is normal for cross-origin stylesheets');
}

console.log('\n%c=== END DIAGNOSTIC ===', 'color: #6366f1; font-size: 14px;');
