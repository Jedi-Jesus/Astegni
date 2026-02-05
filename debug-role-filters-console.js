// ═══════════════════════════════════════════════════════════════
// SCHEDULE ROLE FILTER DEBUG SCRIPT
// Paste this entire script into your browser console while on tutor-profile.html
// ═══════════════════════════════════════════════════════════════

console.log('%c🔍 Starting Schedule Role Filter Debug...', 'background: #222; color: #4ec9b0; font-size: 16px; padding: 5px;');
console.log('═══════════════════════════════════════════════════════════════');

// 1. Check current page
console.log('\n%c1️⃣ CURRENT PAGE CHECK', 'color: #569cd6; font-weight: bold');
console.log('Current URL:', window.location.href);
if (window.location.href.includes('tutor-profile.html')) {
    console.log('%c✅ On tutor-profile.html', 'color: #4ec9b0');
} else {
    console.log('%c❌ NOT on tutor-profile.html - navigate there first!', 'color: #f48771');
}

// 2. Check DOM elements
console.log('\n%c2️⃣ DOM ELEMENTS CHECK', 'color: #569cd6; font-weight: bold');

const schedulePanel = document.getElementById('schedule-panel');
console.log('schedule-panel:', schedulePanel);
if (schedulePanel) {
    console.log('%c✅ #schedule-panel found', 'color: #4ec9b0');
    console.log('   Hidden?', schedulePanel.classList.contains('hidden'));
    console.log('   Display:', window.getComputedStyle(schedulePanel).display);
} else {
    console.log('%c❌ #schedule-panel NOT FOUND', 'color: #f48771');
}

const roleFilterContainer = document.getElementById('schedule-role-filters');
console.log('schedule-role-filters:', roleFilterContainer);
if (roleFilterContainer) {
    console.log('%c✅ #schedule-role-filters found', 'color: #4ec9b0');
    const buttons = roleFilterContainer.querySelectorAll('button');
    console.log('   Number of buttons:', buttons.length);
    console.log('   Button details:');
    buttons.forEach((btn, i) => {
        console.log(`      ${i + 1}. Text: "${btn.textContent.trim()}"`);
        console.log(`         onclick: ${btn.getAttribute('onclick')}`);
        console.log(`         classes: ${btn.className}`);
    });
} else {
    console.log('%c❌ #schedule-role-filters NOT FOUND', 'color: #f48771');
    console.log('%c💡 The container needs id="schedule-role-filters"', 'color: #ce9178');

    // Try to find it with the old selector
    const oldSelector = document.querySelector('#schedule-panel .mb-6.flex.gap-4');
    console.log('   Trying old selector (#schedule-panel .mb-6.flex.gap-4):', oldSelector);
}

const tableContainer = document.getElementById('schedules-table-container');
console.log('schedules-table-container:', tableContainer);
if (tableContainer) {
    console.log('%c✅ #schedules-table-container found', 'color: #4ec9b0');
    console.log('   Has content?', tableContainer.innerHTML.trim().length > 0);
} else {
    console.log('%c❌ #schedules-table-container NOT FOUND', 'color: #f48771');
}

// 3. Check JavaScript functions
console.log('\n%c3️⃣ JAVASCRIPT FUNCTIONS CHECK', 'color: #569cd6; font-weight: bold');

console.log('filterSchedulesByRole:', typeof filterSchedulesByRole);
if (typeof filterSchedulesByRole === 'function') {
    console.log('%c✅ filterSchedulesByRole exists', 'color: #4ec9b0');
    console.log('   Function source (first 200 chars):');
    console.log('   ' + filterSchedulesByRole.toString().substring(0, 200) + '...');
} else {
    console.log('%c❌ filterSchedulesByRole NOT FOUND', 'color: #f48771');
    console.log('%c💡 schedule-panel-manager.js might not be loaded', 'color: #ce9178');
}

console.log('loadSchedules:', typeof loadSchedules);
if (typeof loadSchedules === 'function') {
    console.log('%c✅ loadSchedules exists', 'color: #4ec9b0');
} else {
    console.log('%c❌ loadSchedules NOT FOUND', 'color: #f48771');
}

console.log('searchSchedules:', typeof searchSchedules);
if (typeof searchSchedules === 'function') {
    console.log('%c✅ searchSchedules exists', 'color: #4ec9b0');
} else {
    console.log('%c❌ searchSchedules NOT FOUND', 'color: #f48771');
}

// 4. Check global variables
console.log('\n%c4️⃣ GLOBAL VARIABLES CHECK', 'color: #569cd6; font-weight: bold');

console.log('allSchedules:', typeof allSchedules);
if (typeof allSchedules !== 'undefined') {
    console.log('%c✅ allSchedules exists', 'color: #4ec9b0');
    console.log('   Type:', Array.isArray(allSchedules) ? 'Array' : typeof allSchedules);
    console.log('   Length:', Array.isArray(allSchedules) ? allSchedules.length : 'N/A');
    if (Array.isArray(allSchedules) && allSchedules.length > 0) {
        console.log('   First schedule:', allSchedules[0]);
    }
} else {
    console.log('%c❌ allSchedules NOT DEFINED', 'color: #f48771');
}

console.log('currentRoleFilter:', typeof currentRoleFilter);
if (typeof currentRoleFilter !== 'undefined') {
    console.log('%c✅ currentRoleFilter exists:', currentRoleFilter, 'color: #4ec9b0');
} else {
    console.log('%c⚠️ currentRoleFilter NOT DEFINED (might be scoped)', 'color: #ce9178');
}

// 5. Check script loading
console.log('\n%c5️⃣ SCRIPT LOADING CHECK', 'color: #569cd6; font-weight: bold');

const scheduleScripts = document.querySelectorAll('script[src*="schedule-panel-manager"]');
console.log('schedule-panel-manager scripts found:', scheduleScripts.length);
if (scheduleScripts.length > 0) {
    console.log('%c✅ Found schedule-panel-manager script(s)', 'color: #4ec9b0');
    scheduleScripts.forEach((script, i) => {
        console.log(`   ${i + 1}. ${script.src}`);
    });
} else {
    console.log('%c❌ No schedule-panel-manager script found', 'color: #f48771');
}

// 6. Test button clicks
console.log('\n%c6️⃣ BUTTON CLICK TEST', 'color: #569cd6; font-weight: bold');

if (roleFilterContainer && typeof filterSchedulesByRole === 'function') {
    console.log('Testing button click simulation...');

    // Test clicking the "All Schedules" button
    try {
        console.log('%cTesting: filterSchedulesByRole("all")', 'color: #ce9178');
        filterSchedulesByRole('all');
        console.log('%c✅ Function executed without errors', 'color: #4ec9b0');

        // Check if button was activated
        const buttons = roleFilterContainer.querySelectorAll('button');
        let activeButton = null;
        buttons.forEach(btn => {
            if (btn.classList.contains('bg-blue-500')) {
                activeButton = btn;
            }
        });

        if (activeButton) {
            console.log('%c✅ Button activated:', activeButton.textContent.trim(), 'color: #4ec9b0');
        } else {
            console.log('%c⚠️ No button appears to be activated (blue background)', 'color: #ce9178');
        }

        // Check if schedules were loaded
        const tableContainer = document.getElementById('schedules-table-container');
        if (tableContainer && tableContainer.innerHTML.trim().length > 0) {
            console.log('%c✅ Table container has content', 'color: #4ec9b0');
        } else {
            console.log('%c⚠️ Table container is empty or not found', 'color: #ce9178');
        }

    } catch (e) {
        console.log('%c❌ Error executing filterSchedulesByRole:', e.message, 'color: #f48771');
        console.log('   Stack:', e.stack);
    }
} else {
    console.log('%c⚠️ Cannot test - missing container or function', 'color: #ce9178');
}

// 7. Event listener check
console.log('\n%c7️⃣ EVENT LISTENERS CHECK', 'color: #569cd6; font-weight: bold');

if (roleFilterContainer) {
    const buttons = roleFilterContainer.querySelectorAll('button');
    console.log('Checking onclick attributes on role filter buttons:');
    buttons.forEach((btn, i) => {
        const onclick = btn.getAttribute('onclick');
        console.log(`   Button ${i + 1}: ${onclick ? '✅ Has onclick' : '❌ No onclick'}`);
        if (onclick) {
            console.log(`      ${onclick}`);

            // Try to execute the condition check
            try {
                const hasFunction = typeof filterSchedulesByRole === 'function';
                console.log(`      Function check result: ${hasFunction}`);
            } catch (e) {
                console.log(`      Error checking: ${e.message}`);
            }
        }
    });
}

// 8. Summary
console.log('\n%c═══════════════════════════════════════════════════════════════', 'color: #569cd6');
console.log('%c📋 SUMMARY', 'color: #569cd6; font-weight: bold; font-size: 14px');

const checks = {
    'Page': window.location.href.includes('tutor-profile.html'),
    'Schedule Panel': !!schedulePanel,
    'Role Filter Container': !!roleFilterContainer,
    'Table Container': !!tableContainer,
    'filterSchedulesByRole': typeof filterSchedulesByRole === 'function',
    'loadSchedules': typeof loadSchedules === 'function',
    'allSchedules': typeof allSchedules !== 'undefined',
    'Script Loaded': scheduleScripts.length > 0
};

let passing = 0;
let total = Object.keys(checks).length;

for (const [check, result] of Object.entries(checks)) {
    if (result) {
        console.log(`%c✅ ${check}`, 'color: #4ec9b0');
        passing++;
    } else {
        console.log(`%c❌ ${check}`, 'color: #f48771');
    }
}

console.log(`\n%cScore: ${passing}/${total} checks passed`, passing === total ? 'color: #4ec9b0; font-weight: bold' : 'color: #ce9178; font-weight: bold');

if (passing === total) {
    console.log('%c\n🎉 Everything looks good! If buttons still not responding, try:', 'color: #4ec9b0; font-size: 12px');
    console.log('   1. Hard refresh (Ctrl+F5)');
    console.log('   2. Clear browser cache');
    console.log('   3. Check Network tab for failed script loads');
} else {
    console.log('%c\n⚠️ Issues detected. Check the failed items above.', 'color: #ce9178; font-size: 12px');
}

console.log('\n%c═══════════════════════════════════════════════════════════════', 'color: #569cd6');
console.log('%c✅ Debug Complete!', 'background: #222; color: #4ec9b0; font-size: 16px; padding: 5px;');

// Provide helper functions
console.log('\n%c💡 Helper Functions Available:', 'color: #ce9178; font-weight: bold');
console.log('   testRoleFilter("all")    - Test filtering by "all"');
console.log('   testRoleFilter("tutor")  - Test filtering by "tutor"');
console.log('   testRoleFilter("student") - Test filtering by "student"');
console.log('   testRoleFilter("parent") - Test filtering by "parent"');
console.log('   inspectButton(index)     - Inspect button by index (0-3)');

window.testRoleFilter = function(role) {
    console.log(`\n%c🧪 Testing role filter: ${role}`, 'color: #569cd6; font-weight: bold');
    if (typeof filterSchedulesByRole === 'function') {
        try {
            filterSchedulesByRole(role);
            console.log('%c✅ Function executed', 'color: #4ec9b0');
        } catch (e) {
            console.log('%c❌ Error:', e.message, 'color: #f48771');
            console.log(e.stack);
        }
    } else {
        console.log('%c❌ filterSchedulesByRole not available', 'color: #f48771');
    }
};

window.inspectButton = function(index) {
    const container = document.getElementById('schedule-role-filters');
    if (!container) {
        console.log('%c❌ Container not found', 'color: #f48771');
        return;
    }
    const buttons = container.querySelectorAll('button');
    if (index < 0 || index >= buttons.length) {
        console.log(`%c❌ Invalid index. Use 0-${buttons.length - 1}`, 'color: #f48771');
        return;
    }
    const btn = buttons[index];
    console.log(`\n%cButton ${index} Details:`, 'color: #569cd6; font-weight: bold');
    console.log('Text:', btn.textContent.trim());
    console.log('onclick:', btn.getAttribute('onclick'));
    console.log('Classes:', btn.className);
    console.log('Element:', btn);
};
