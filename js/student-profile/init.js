// ============================================
// STUDENT PROFILE INITIALIZATION
// Coordinates all student profile modules
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Student Profile...');

    try {
        // ============================================
        // AUTHENTICATION CHECK
        // ============================================
        // Check if user is authenticated
        if (typeof AuthManager === 'undefined' || typeof window.AuthManager === 'undefined') {
            console.error('❌ AuthManager not loaded! Redirecting to login...');
            alert('Authentication manager not loaded. Please refresh the page.');
            window.location.href = '../index.html';
            return;
        }

        // Wait for AuthManager to restore session
        await window.AuthManager.restoreSession();

        // Check if user is authenticated
        if (!window.AuthManager.isAuthenticated()) {
            console.warn('⚠️ User not authenticated. Redirecting to login...');
            alert('Please log in to access your student profile.');
            window.location.href = '../index.html';
            return;
        }

        // FIX: Check if role switch is in progress FIRST (before getting userRole)
        // Use localStorage with timestamp - valid for 10 seconds after switch
        const switchTimestamp = localStorage.getItem('role_switch_timestamp');
        const targetRole = localStorage.getItem('role_switch_target');

        console.log('🔍 [StudentProfile] Grace Period Check:', {
            switchTimestamp: switchTimestamp,
            targetRole: targetRole,
            currentTime: Date.now(),
            timeSinceSwitch: switchTimestamp ? Date.now() - parseInt(switchTimestamp) : 'N/A'
        });

        if (switchTimestamp && targetRole === 'student') {
            const timeSinceSwitch = Date.now() - parseInt(switchTimestamp);
            const isWithinGracePeriod = timeSinceSwitch < 10000; // 10 seconds grace period

            console.log(`🔍 [StudentProfile] Time since switch: ${timeSinceSwitch}ms, Grace period valid: ${isWithinGracePeriod}`);

            if (isWithinGracePeriod) {
                // DON'T clear the flags here - let them expire naturally
                // This ensures any subsequent checks within the grace period still pass
                // The flags will be cleared by AuthManager.restoreSession() when they expire
                console.log('✅ [StudentProfile] Role switch detected (within 10s grace period) - allowing page load');
                console.log('✅ [StudentProfile] Skipping role validation (user just switched roles)');
                console.log(`✅ [StudentProfile] Grace period will expire in ${10000 - timeSinceSwitch}ms`);
                // Continue to initialize the page - skip role validation entirely
            } else {
                // Grace period expired, clear flags and perform normal check
                console.log(`⚠️ [StudentProfile] Role switch grace period expired (${timeSinceSwitch}ms > 10000ms), performing normal role check`);
                localStorage.removeItem('role_switch_timestamp');
                localStorage.removeItem('role_switch_target');

                // Fall through to normal role check below
                performNormalRoleCheck();
            }
        } else {
            // No role switch in progress - perform normal check
            console.log('🔍 [StudentProfile] No active role switch detected, performing normal role check');
            performNormalRoleCheck();
        }

        function performNormalRoleCheck() {
            const userRole = window.AuthManager.getUserRole();
            const user = window.AuthManager.getUser();

            // DEBUG: Log detailed role information
            console.log('🔍 [StudentProfile] Role Check Debug:', {
                userRole: userRole,
                user_active_role: user?.active_role,
                user_role: user?.role,
                user_roles: user?.roles,
                localStorage_userRole: localStorage.getItem('userRole'),
                localStorage_switchTimestamp: localStorage.getItem('role_switch_timestamp'),
                localStorage_switchTarget: localStorage.getItem('role_switch_target')
            });

            // More defensive role check - handle undefined, null, and string "undefined"
            const normalizedRole = userRole && userRole !== 'undefined' && userRole !== 'null' ? userRole : null;

            if (normalizedRole !== 'student') {
                console.warn(`⚠️ [StudentProfile] User role is '${normalizedRole}', not 'student'. Redirecting...`);
                alert(`This page is for students only. You are logged in as: ${normalizedRole || 'unknown'}\n\nPlease switch to your student role or log in with a student account.`);
                window.location.href = '../index.html';
                return;
            }
        }

        console.log('✅ [StudentProfile] Authentication verified for student role');

        // ============================================
        // INITIALIZE PROFILE
        // ============================================
        // Initialize profile data loader
        if (typeof StudentProfileDataLoader !== 'undefined') {
            await StudentProfileDataLoader.init();
            console.log('✅ StudentProfileDataLoader initialized');
        } else {
            console.error('❌ StudentProfileDataLoader not found');
        }

        // ============================================
        // LOAD RECENT FEEDBACK
        // ============================================
        // Load recent feedback from tutors
        if (typeof window.loadRecentFeedback === 'function') {
            await window.loadRecentFeedback();
            console.log('✅ Recent feedback loaded');
        } else {
            console.warn('⚠️ loadRecentFeedback function not found');
        }

        // ============================================
        // INITIALIZE FOLDER MANAGER
        // ============================================
        if (typeof initializeFolderManager === 'function') {
            initializeFolderManager('student');
            console.log('✅ FolderManager initialized for student');
        } else {
            console.warn('⚠️ initializeFolderManager function not found');
        }

        console.log('✅ Student Profile initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing student profile:', error);
    }
});
