// ============================================
// QUICK FIX: Define filterSessionsByRole
// Paste this entire block into your browser console
// ============================================

console.log('🔧 Installing filterSessionsByRole fix...');

// Get references to required variables
let allSessionsData = window.allSessionsData || [];
let currentRoleFilter = 'all';
let filteredSessionsCache = [];
let sessionCurrentPage = 1;
const sessionItemsPerPage = 10;

// Define the missing function
window.filterSessionsByRole = function(role, event) {
    console.log(`Filtering sessions by role: ${role}`);
    currentRoleFilter = role;

    // Update filter buttons
    document.querySelectorAll('#sessions-panel button[onclick^="filterSessionsByRole"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    // If event is provided (from onclick), highlight the clicked button
    if (event && event.target) {
        event.target.classList.remove('bg-gray-200');
        event.target.classList.add('bg-blue-500', 'text-white');
    }

    // Reset to page 1 when changing filters
    sessionCurrentPage = 1;

    // Filter sessions by role
    if (role === 'all') {
        if (typeof window.loadSessions === 'function') {
            window.loadSessions();
        } else {
            console.error('loadSessions function not found!');
        }
    } else {
        // Filter allSessionsData array by checking enrolled_students relationship
        const filteredSessions = allSessionsData.filter(session => {
            if (role === 'student') {
                return !session.parent_id; // Direct student enrollment
            } else if (role === 'parent') {
                return session.parent_id; // Parent-initiated enrollment
            } else if (role === 'tutor') {
                return true; // All sessions where user is the tutor
            }
            return true;
        });

        // Cache filtered sessions for pagination
        filteredSessionsCache = filteredSessions;

        if (typeof window.displayFilteredSessions === 'function') {
            window.displayFilteredSessions(filteredSessions);
        } else {
            console.log('Filtered sessions:', filteredSessions);
            alert(`Filtered ${filteredSessions.length} sessions for role: ${role}`);
        }
    }
};

// Also define loadFilteredSessionsPage if missing
if (typeof window.loadFilteredSessionsPage !== 'function') {
    window.loadFilteredSessionsPage = function(page) {
        sessionCurrentPage = page;
        if (typeof window.displayFilteredSessions === 'function') {
            window.displayFilteredSessions(filteredSessionsCache);
        }
    };
}

console.log('✅ filterSessionsByRole installed!');
console.log('✅ Try clicking the filter buttons now.');
console.log('');
console.log('📝 Note: This is a temporary fix. To permanently fix:');
console.log('   1. Check browser console for errors in sessions-panel-manager.js');
console.log('   2. Make sure the script fully loads before buttons are clicked');
