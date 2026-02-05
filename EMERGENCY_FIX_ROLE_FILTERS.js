// ========================================
// EMERGENCY FIX - Run this in browser console
// if role filters still don't work after clearing cache
// ========================================

console.log('%c🚨 EMERGENCY FIX FOR ROLE FILTERS', 'color: red; font-size: 20px; font-weight: bold');

// Check if function already exists
if (typeof window.filterSchedulesByRole === 'function') {
    console.log('%c✅ Function already exists! No need to run this fix.', 'color: green; font-size: 14px');
    console.log('Just do a hard refresh (Ctrl+Shift+R) instead.');
} else {
    console.log('%c⚠️ Function missing! Installing emergency fix...', 'color: orange; font-size: 14px');
    
    // Manually define the function
    window.filterSchedulesByRole = async function(role) {
        console.log(`🔍 Filtering schedules by role: ${role}`);
        window.currentRoleFilter = role;

        // Update filter buttons
        const roleFilterContainer = document.getElementById('schedule-role-filters');
        if (!roleFilterContainer) {
            console.error('❌ Role filter container not found!');
            return;
        }

        // Update button styles
        roleFilterContainer.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });

        roleFilterContainer.querySelectorAll('button').forEach(btn => {
            const btnText = btn.textContent.toLowerCase();
            if ((role === 'all' && btnText.includes('all schedules')) ||
                (role === 'tutor' && btnText.includes('as tutor')) ||
                (role === 'student' && btnText.includes('as student')) ||
                (role === 'parent' && btnText.includes('as parent'))) {
                btn.classList.remove('bg-gray-200', 'text-gray-700');
                btn.classList.add('bg-blue-500', 'text-white');
            }
        });

        // Load schedules if empty
        if (!window.allSchedules || window.allSchedules.length === 0) {
            console.log('⚠️ Loading schedules first...');
            if (typeof window.loadSchedules === 'function') {
                await window.loadSchedules();
            } else {
                console.error('❌ loadSchedules function also missing!');
                return;
            }
        }

        // Filter schedules
        if (role === 'all') {
            if (typeof window.loadSchedules === 'function') {
                window.loadSchedules();
            }
        } else {
            const filteredSchedules = window.allSchedules.filter(schedule =>
                schedule.scheduler_role === role
            );

            const container = document.getElementById('schedules-table-container');
            if (filteredSchedules.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-filter text-3xl mb-3"></i>
                        <p>No schedules found for this role</p>
                    </div>
                `;
                return;
            }

            if (typeof window.renderSchedulesTable === 'function') {
                window.renderSchedulesTable(filteredSchedules);
            } else {
                console.error('❌ renderSchedulesTable function missing!');
            }
        }
    };
    
    console.log('%c✅ Emergency fix installed!', 'color: green; font-size: 16px; font-weight: bold');
    console.log('%cNow try clicking the role filter buttons again.', 'color: cyan');
    console.log('%c⚠️ NOTE: This is temporary. You still need to clear your browser cache!', 'color: orange; font-weight: bold');
}
