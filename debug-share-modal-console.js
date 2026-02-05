// ============================================
// SHARE PROFILE MODAL DEBUG CONSOLE
// ============================================
// Copy and paste this entire script into the browser console
// on parent-profile.html or user-profile.html page
// ============================================

console.log('%c🔍 Share Profile Modal Debug Console', 'background: #000; color: #00ff00; font-size: 20px; padding: 10px;');
console.log('%cInstructions: Open the share modal first, then run: debugShareModal()', 'color: #00ffff; font-size: 14px;');

// Debug function
window.debugShareModal = function() {
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00');
    console.log('%cStarting Share Modal Analysis...', 'color: #ffff00; font-weight: bold');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00');

    const modal = document.getElementById('shareProfileModal');

    if (!modal) {
        console.log('%c❌ ERROR: Modal not found!', 'color: #ff0000; font-weight: bold; font-size: 16px;');
        console.log('%cMake sure to open the share modal first', 'color: #ff9900');
        return;
    }

    console.log('%c✅ Modal found!', 'color: #00ff00; font-weight: bold');

    // Check modal structure
    console.log('%c\n1️⃣ MODAL STRUCTURE:', 'color: #00ffff; font-weight: bold; font-size: 14px;');
    const overlay = modal.querySelector('.modal-overlay');
    const container = modal.querySelector('.modal-container');

    console.log('Modal element:', modal);
    console.log('  - Display:', modal.style.display || window.getComputedStyle(modal).display);
    console.log('  - Has overlay:', !!overlay);
    console.log('  - Has container:', !!container);

    if (!overlay && !container) {
        console.log('%c⚠️ WARNING: Standard structure not found!', 'color: #ff9900; font-weight: bold');
        console.log('Modal children:', modal.children);

        // Try to find by other means
        const allDivs = modal.querySelectorAll('div');
        console.log(`Found ${allDivs.length} divs inside modal`);
        return;
    }

    // Analyze overlay
    if (overlay) {
        console.log('%c\n2️⃣ MODAL OVERLAY ANALYSIS:', 'color: #00ffff; font-weight: bold; font-size: 14px;');
        const overlayComputed = window.getComputedStyle(overlay);

        console.log('%cComputed Styles:', 'color: #ffff00');
        console.log('  backdrop-filter:', overlayComputed.backdropFilter);
        console.log('  -webkit-backdrop-filter:', overlayComputed.webkitBackdropFilter);
        console.log('  background:', overlayComputed.background);
        console.log('  background-color:', overlayComputed.backgroundColor);
        console.log('  opacity:', overlayComputed.opacity);
        console.log('  z-index:', overlayComputed.zIndex);

        // Check for issues
        const hasGlobalBlur = overlayComputed.backdropFilter.includes('blur(8px)') ||
                             overlayComputed.backdropFilter.includes('blur(20px)');

        if (hasGlobalBlur) {
            console.log('%c🔴 ISSUE FOUND: Overlay has GLOBAL blur inherited!', 'background: #ff0000; color: #fff; font-weight: bold; padding: 5px;');
            console.log('%c   Expected: blur(4px)', 'color: #00ff00');
            console.log('%c   Actual: ' + overlayComputed.backdropFilter, 'color: #ff0000');
        } else if (overlayComputed.backdropFilter.includes('blur(4px)')) {
            console.log('%c✅ Overlay blur is correct: blur(4px)', 'color: #00ff00');
        } else {
            console.log('%c⚠️ Unexpected backdrop-filter:', overlayComputed.backdropFilter, 'color: #ff9900');
        }
    }

    // Analyze container
    if (container) {
        console.log('%c\n3️⃣ MODAL CONTAINER ANALYSIS:', 'color: #00ffff; font-weight: bold; font-size: 14px;');
        const containerComputed = window.getComputedStyle(container);

        console.log('%cComputed Styles:', 'color: #ffff00');
        console.log('  backdrop-filter:', containerComputed.backdropFilter);
        console.log('  -webkit-backdrop-filter:', containerComputed.webkitBackdropFilter);
        console.log('  background:', containerComputed.background);
        console.log('  background-color:', containerComputed.backgroundColor);
        console.log('  opacity:', containerComputed.opacity);
        console.log('  border-radius:', containerComputed.borderRadius);

        // Check for issues
        if (containerComputed.backdropFilter !== 'none' && containerComputed.backdropFilter.includes('blur')) {
            console.log('%c🔴 ISSUE FOUND: Container has blur filter!', 'background: #ff0000; color: #fff; font-weight: bold; padding: 5px;');
            console.log('%c   Expected: none', 'color: #00ff00');
            console.log('%c   Actual: ' + containerComputed.backdropFilter, 'color: #ff0000');
        } else {
            console.log('%c✅ Container backdrop-filter is correct: none', 'color: #00ff00');
        }

        if (parseFloat(containerComputed.opacity) < 1) {
            console.log('%c⚠️ WARNING: Container opacity is ' + containerComputed.opacity, 'color: #ff9900');
        } else {
            console.log('%c✅ Container opacity is 1', 'color: #00ff00');
        }

        // Check background transparency
        const bgColor = containerComputed.backgroundColor;
        if (bgColor.includes('rgba') && bgColor.includes(', 0)')) {
            console.log('%c🔴 ISSUE: Background is transparent!', 'background: #ff0000; color: #fff; font-weight: bold; padding: 5px;');
            console.log('%c   ' + bgColor, 'color: #ff0000');
        }
    }

    // Find all CSS rules affecting the modal
    console.log('%c\n4️⃣ CSS RULES AFFECTING MODAL:', 'color: #00ffff; font-weight: bold; font-size: 14px;');

    const styleSheets = document.styleSheets;
    const rules = {
        overlay: [],
        container: []
    };

    for (let i = 0; i < styleSheets.length; i++) {
        const sheet = styleSheets[i];
        const href = sheet.href ? sheet.href.substring(sheet.href.lastIndexOf('/') + 1) : 'inline';

        try {
            const cssRules = sheet.cssRules || sheet.rules;
            if (cssRules) {
                for (let j = 0; j < cssRules.length; j++) {
                    const rule = cssRules[j];
                    if (rule.selectorText) {
                        if (rule.selectorText.includes('modal-overlay')) {
                            const backdropFilter = rule.style.backdropFilter || rule.style.webkitBackdropFilter;
                            if (backdropFilter) {
                                rules.overlay.push({
                                    selector: rule.selectorText,
                                    source: href,
                                    backdropFilter: backdropFilter
                                });
                            }
                        }
                        if (rule.selectorText.includes('modal-container')) {
                            const backdropFilter = rule.style.backdropFilter || rule.style.webkitBackdropFilter;
                            if (backdropFilter) {
                                rules.container.push({
                                    selector: rule.selectorText,
                                    source: href,
                                    backdropFilter: backdropFilter
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // CORS blocked
        }
    }

    console.log('%cOverlay backdrop-filter rules:', 'color: #ffff00');
    if (rules.overlay.length === 0) {
        console.log('  No backdrop-filter rules found in accessible stylesheets');
    } else {
        rules.overlay.forEach(rule => {
            console.log(`  ${rule.selector} (${rule.source}): ${rule.backdropFilter}`);
        });
    }

    console.log('%cContainer backdrop-filter rules:', 'color: #ffff00');
    if (rules.container.length === 0) {
        console.log('  No backdrop-filter rules found in accessible stylesheets');
    } else {
        rules.container.forEach(rule => {
            console.log(`  ${rule.selector} (${rule.source}): ${rule.backdropFilter}`);
        });
    }

    // Provide fix suggestions
    console.log('%c\n5️⃣ FIX SUGGESTIONS:', 'color: #00ffff; font-weight: bold; font-size: 14px;');

    const overlayComputed = overlay ? window.getComputedStyle(overlay) : null;
    const containerComputed = container ? window.getComputedStyle(container) : null;

    let hasIssues = false;

    if (overlayComputed && (overlayComputed.backdropFilter.includes('blur(8px)') || overlayComputed.backdropFilter.includes('blur(20px)'))) {
        console.log('%c⚠️ Overlay has inherited global blur', 'color: #ff9900');
        console.log('%c   Add stronger specificity or check CSS load order', 'color: #fff');
        hasIssues = true;
    }

    if (containerComputed && containerComputed.backdropFilter !== 'none' && containerComputed.backdropFilter.includes('blur')) {
        console.log('%c⚠️ Container should not have blur filter', 'color: #ff9900');
        hasIssues = true;
    }

    if (!hasIssues) {
        console.log('%c✅ No obvious CSS issues detected!', 'color: #00ff00; font-weight: bold');
        console.log('%c   The issue might be:', 'color: #ffff00');
        console.log('%c   1. CSS cache - try hard refresh (Ctrl+Shift+R)', 'color: #fff');
        console.log('%c   2. A different modal-overlay element being styled', 'color: #fff');
        console.log('%c   3. Theme/appearance settings affecting transparency', 'color: #fff');
    }

    console.log('%c\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00');
    console.log('%cAnalysis Complete!', 'color: #00ff00; font-weight: bold; font-size: 16px;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00');

    // Return data for further inspection
    return {
        modal,
        overlay,
        container,
        overlayStyles: overlayComputed,
        containerStyles: containerComputed,
        cssRules: rules
    };
};

// Quick fix function
window.fixShareModal = function() {
    console.log('%c🔧 Applying Quick Fix...', 'color: #00ffff; font-weight: bold; font-size: 14px;');

    const modal = document.getElementById('shareProfileModal');
    if (!modal) {
        console.log('%c❌ Modal not found!', 'color: #ff0000');
        return;
    }

    const overlay = modal.querySelector('.modal-overlay');
    const container = modal.querySelector('.modal-container');

    if (overlay) {
        overlay.style.setProperty('backdrop-filter', 'blur(4px)', 'important');
        overlay.style.setProperty('-webkit-backdrop-filter', 'blur(4px)', 'important');
        overlay.style.setProperty('background', 'rgba(0, 0, 0, 0.6)', 'important');
        console.log('%c✅ Fixed overlay styles', 'color: #00ff00');
    }

    if (container) {
        container.style.setProperty('backdrop-filter', 'none', 'important');
        container.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
        container.style.setProperty('background', 'var(--surface)', 'important');
        container.style.setProperty('opacity', '1', 'important');
        console.log('%c✅ Fixed container styles', 'color: #00ff00');
    }

    console.log('%c🎉 Quick fix applied! Check if modal looks correct now.', 'color: #00ff00; font-weight: bold');
};

console.log('%c\nAvailable Commands:', 'color: #00ffff; font-weight: bold');
console.log('%c  debugShareModal()  - Analyze the modal styles', 'color: #fff');
console.log('%c  fixShareModal()    - Apply quick fix to modal', 'color: #fff');
console.log('%c', 'color: #00ff00');
