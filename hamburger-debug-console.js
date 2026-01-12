// ============================================
// HAMBURGER BUTTON DEBUG CONSOLE
// Paste this into browser console on find-tutors.html
// ============================================

console.clear();
console.log('%c🔍 HAMBURGER BUTTON DIAGNOSTIC TOOL', 'background: #4ec9b0; color: white; font-size: 20px; font-weight: bold; padding: 10px;');

// Helper function to log styled output
function logSection(title, color = '#4ec9b0') {
    console.log(`%c\n${title}`, `color: ${color}; font-size: 16px; font-weight: bold;`);
    console.log('='.repeat(60));
}

function logItem(label, value, status = 'info') {
    const colors = {
        success: '#4ec9b0',
        error: '#f48771',
        warning: '#dcdcaa',
        info: '#9cdcfe'
    };
    console.log(`%c${label}:`, `color: ${colors[status]}; font-weight: bold;`, value);
}

// ============================================
// 1. ELEMENT EXISTENCE CHECK
// ============================================
logSection('1️⃣ ELEMENT EXISTENCE CHECK');

const hamburgerBtn = document.querySelector('#hamburger');
const hamburgerSpan = document.querySelector('.hamburger');
const sidebarToggle = document.querySelector('.sidebar-toggle');
const nestedHamburger = document.querySelector('.sidebar-toggle .hamburger');
const hamburgerSpans = document.querySelectorAll('.sidebar-toggle .hamburger span');

logItem('Hamburger Button (#hamburger)', hamburgerBtn ? '✅ FOUND' : '❌ NOT FOUND', hamburgerBtn ? 'success' : 'error');
logItem('Hamburger Class (.hamburger)', hamburgerSpan ? '✅ FOUND' : '❌ NOT FOUND', hamburgerSpan ? 'success' : 'error');
logItem('Sidebar Toggle (.sidebar-toggle)', sidebarToggle ? '✅ FOUND' : '❌ NOT FOUND', sidebarToggle ? 'success' : 'error');
logItem('Nested Hamburger (.sidebar-toggle .hamburger)', nestedHamburger ? '✅ FOUND' : '❌ NOT FOUND', nestedHamburger ? 'success' : 'error');
logItem('Hamburger Spans Count', hamburgerSpans.length, hamburgerSpans.length > 0 ? 'success' : 'error');

if (hamburgerBtn) {
    console.log('Hamburger Button Element:', hamburgerBtn);
}

// ============================================
// 2. HAMBURGER BUTTON STYLES
// ============================================
if (hamburgerBtn) {
    logSection('2️⃣ HAMBURGER BUTTON (#hamburger) COMPUTED STYLES', '#dcdcaa');

    const styles = window.getComputedStyle(hamburgerBtn);

    logItem('Display', styles.display, styles.display === 'none' ? 'error' : 'success');
    logItem('Visibility', styles.visibility, styles.visibility === 'hidden' ? 'error' : 'success');
    logItem('Opacity', styles.opacity, parseFloat(styles.opacity) === 0 ? 'error' : 'success');
    logItem('Width', styles.width);
    logItem('Height', styles.height);
    logItem('Position', styles.position);
    logItem('Z-Index', styles.zIndex);
    logItem('Background', styles.background || styles.backgroundColor);
    logItem('Border', styles.border);
    logItem('Cursor', styles.cursor);
    logItem('Overflow', styles.overflow);

    console.log('\nFull computed styles:', styles);
}

// ============================================
// 3. HAMBURGER SPAN CONTAINER STYLES
// ============================================
if (hamburgerSpan) {
    logSection('3️⃣ HAMBURGER SPAN CONTAINER (.hamburger) STYLES', '#dcdcaa');

    const spanStyles = window.getComputedStyle(hamburgerSpan);

    logItem('Display', spanStyles.display, spanStyles.display === 'none' ? 'error' : 'success');
    logItem('Visibility', spanStyles.visibility, spanStyles.visibility === 'hidden' ? 'error' : 'success');
    logItem('Opacity', spanStyles.opacity, parseFloat(spanStyles.opacity) === 0 ? 'error' : 'success');
    logItem('Width', spanStyles.width);
    logItem('Height', spanStyles.height);
    logItem('Position', spanStyles.position);
    logItem('Flex Direction', spanStyles.flexDirection);
    logItem('Gap', spanStyles.gap);

    console.log('\nFull span container styles:', spanStyles);
}

// ============================================
// 4. HAMBURGER LINES (SPANS) STYLES
// ============================================
if (hamburgerSpans.length > 0) {
    hamburgerSpans.forEach((span, index) => {
        logSection(`4️⃣ HAMBURGER LINE ${index + 1} STYLES`, '#ce9178');

        const spanStyle = window.getComputedStyle(span);

        logItem('Display', spanStyle.display, spanStyle.display === 'none' ? 'error' : 'success');
        logItem('Visibility', spanStyle.visibility, spanStyle.visibility === 'hidden' ? 'error' : 'success');
        logItem('Opacity', spanStyle.opacity, parseFloat(spanStyle.opacity) === 0 ? 'error' : 'success');
        logItem('Background', spanStyle.background || spanStyle.backgroundColor,
            (spanStyle.background === 'rgba(0, 0, 0, 0)' || spanStyle.backgroundColor === 'rgba(0, 0, 0, 0)') ? 'error' : 'success');
        logItem('Width', spanStyle.width, spanStyle.width === '0px' ? 'error' : 'success');
        logItem('Height', spanStyle.height, spanStyle.height === '0px' ? 'error' : 'success');
        logItem('Position', spanStyle.position);
        logItem('Top', spanStyle.top);
        logItem('Left', spanStyle.left);
        logItem('Transform', spanStyle.transform);
        logItem('Border Radius', spanStyle.borderRadius);

        console.log(`\nLine ${index + 1} element:`, span);
    });
} else {
    logSection('4️⃣ HAMBURGER LINES', '#f48771');
    logItem('ERROR', 'No hamburger line spans found!', 'error');
}

// ============================================
// 5. THEME & ENVIRONMENT
// ============================================
logSection('5️⃣ THEME & ENVIRONMENT', '#9cdcfe');

const theme = document.documentElement.getAttribute('data-theme');
logItem('Current Theme', theme || 'NOT SET', theme ? 'success' : 'warning');
logItem('HTML data-theme attribute', theme || 'null');
logItem('Window Width', window.innerWidth + 'px');
logItem('Window Height', window.innerHeight + 'px');
logItem('Viewport Width', document.documentElement.clientWidth + 'px');
logItem('Device Pixel Ratio', window.devicePixelRatio);

// ============================================
// 6. PARENT ELEMENT INSPECTION
// ============================================
if (hamburgerBtn) {
    logSection('6️⃣ PARENT ELEMENT INSPECTION', '#9cdcfe');

    const parent = hamburgerBtn.parentElement;
    if (parent) {
        const parentStyles = window.getComputedStyle(parent);

        logItem('Parent Class', parent.className);
        logItem('Parent Display', parentStyles.display);
        logItem('Parent Visibility', parentStyles.visibility);
        logItem('Parent Opacity', parentStyles.opacity);
        logItem('Parent Overflow', parentStyles.overflow);
        logItem('Parent Width', parentStyles.width);
        logItem('Parent Height', parentStyles.height);

        console.log('\nParent Element:', parent);
    }
}

// ============================================
// 7. CSS RULES ANALYSIS
// ============================================
if (hamburgerBtn) {
    logSection('7️⃣ CSS RULES APPLIED', '#dcdcaa');

    let ruleCount = 0;
    try {
        Array.from(document.styleSheets).forEach(sheet => {
            try {
                Array.from(sheet.cssRules || sheet.rules || []).forEach(rule => {
                    if (rule.selectorText && hamburgerBtn.matches(rule.selectorText)) {
                        console.log(`%c${rule.selectorText}`, 'color: #4ec9b0; font-weight: bold;');
                        console.log(rule.style.cssText);
                        ruleCount++;
                    }
                });
            } catch (e) {
                // Cross-origin stylesheet
            }
        });

        if (ruleCount === 0) {
            logItem('WARNING', 'No CSS rules found matching #hamburger', 'warning');
        } else {
            logItem('Total Rules Found', ruleCount, 'success');
        }
    } catch (e) {
        logItem('ERROR', 'Could not analyze CSS rules: ' + e.message, 'error');
    }
}

// ============================================
// 8. BOUNDING BOX & POSITION
// ============================================
if (hamburgerBtn) {
    logSection('8️⃣ BOUNDING BOX & POSITION', '#ce9178');

    const rect = hamburgerBtn.getBoundingClientRect();

    logItem('Top', rect.top + 'px');
    logItem('Left', rect.left + 'px');
    logItem('Right', rect.right + 'px');
    logItem('Bottom', rect.bottom + 'px');
    logItem('Width', rect.width + 'px', rect.width === 0 ? 'error' : 'success');
    logItem('Height', rect.height + 'px', rect.height === 0 ? 'error' : 'success');
    logItem('Is in Viewport',
        rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth ? 'YES' : 'NO',
        rect.top >= 0 && rect.left >= 0 ? 'success' : 'warning');

    console.log('\nBounding Rectangle:', rect);
}

// ============================================
// 9. RECOMMENDATIONS
// ============================================
logSection('9️⃣ DIAGNOSTIC RECOMMENDATIONS', '#f48771');

const issues = [];
const warnings = [];

if (!hamburgerBtn) {
    issues.push('❌ Hamburger button element (#hamburger) not found in DOM');
} else {
    const styles = window.getComputedStyle(hamburgerBtn);
    if (styles.display === 'none') issues.push('❌ Hamburger button has display: none');
    if (styles.visibility === 'hidden') issues.push('❌ Hamburger button has visibility: hidden');
    if (parseFloat(styles.opacity) === 0) issues.push('❌ Hamburger button has opacity: 0');

    const rect = hamburgerBtn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        warnings.push('⚠️ Hamburger button has zero dimensions');
    }
}

if (hamburgerSpans.length === 0) {
    issues.push('❌ Hamburger line spans not found - HTML structure may be incorrect');
} else {
    hamburgerSpans.forEach((span, index) => {
        const spanStyle = window.getComputedStyle(span);
        if (spanStyle.background === 'rgba(0, 0, 0, 0)' && spanStyle.backgroundColor === 'rgba(0, 0, 0, 0)') {
            warnings.push(`⚠️ Line ${index + 1} has transparent background - color not applied`);
        }
        if (spanStyle.width === '0px' || spanStyle.height === '0px') {
            warnings.push(`⚠️ Line ${index + 1} has zero dimensions`);
        }
    });
}

if (!theme) {
    warnings.push('⚠️ Theme not set (data-theme attribute missing on <html>)');
}

if (issues.length > 0) {
    console.log('%c\n🔴 CRITICAL ISSUES:', 'color: #f48771; font-size: 14px; font-weight: bold;');
    issues.forEach(issue => console.log(`%c${issue}`, 'color: #f48771;'));
} else {
    console.log('%c\n✅ No critical issues found!', 'color: #4ec9b0; font-size: 14px; font-weight: bold;');
}

if (warnings.length > 0) {
    console.log('%c\n🟡 WARNINGS:', 'color: #dcdcaa; font-size: 14px; font-weight: bold;');
    warnings.forEach(warning => console.log(`%c${warning}`, 'color: #dcdcaa;'));
}

// ============================================
// 10. AUTO-FIX FUNCTION
// ============================================
console.log('%c\n\n💡 TIP: Run this function to attempt auto-fix:', 'color: #4ec9b0; font-size: 14px; font-weight: bold;');
console.log('%cfixHamburger()', 'background: #0e639c; color: white; padding: 5px 10px; border-radius: 3px; font-family: monospace;');

window.fixHamburger = function() {
    console.log('%c\n🔧 Attempting to fix hamburger button...', 'color: #dcdcaa; font-size: 14px; font-weight: bold;');

    const hamburgerBtn = document.querySelector('#hamburger');
    const hamburgerSpan = document.querySelector('.hamburger');
    const spans = document.querySelectorAll('.sidebar-toggle .hamburger span');

    if (hamburgerBtn) {
        hamburgerBtn.style.display = 'flex';
        hamburgerBtn.style.visibility = 'visible';
        hamburgerBtn.style.opacity = '1';
        console.log('✅ Fixed hamburger button visibility');
    }

    if (hamburgerSpan) {
        hamburgerSpan.style.display = 'flex';
        hamburgerSpan.style.visibility = 'visible';
        hamburgerSpan.style.opacity = '1';
        console.log('✅ Fixed hamburger span container visibility');
    }

    if (spans.length > 0) {
        spans.forEach((span, index) => {
            span.style.display = 'block';
            span.style.background = '#F59E0B';
            span.style.height = '3px';
            span.style.width = '100%';
            span.style.position = 'absolute';
            span.style.left = '0';
            span.style.borderRadius = '3px';
        });
        console.log(`✅ Fixed ${spans.length} hamburger lines`);
    }

    console.log('%c\n✅ Fix complete! Check if hamburger is now visible.', 'color: #4ec9b0; font-size: 14px; font-weight: bold;');
};

console.log('%c\n\n📊 DIAGNOSTIC COMPLETE!', 'background: #4ec9b0; color: white; font-size: 16px; font-weight: bold; padding: 8px;');
