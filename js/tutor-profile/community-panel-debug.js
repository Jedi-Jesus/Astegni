/**
 * ============================================
 * COMMUNITY PANEL DEBUG CONSOLE
 * ============================================
 * This script provides deep tracing of the community panel data flow
 * Run this in browser console to diagnose issues
 * ============================================
 */

// Enable verbose logging
window.COMMUNITY_DEBUG = true;

// Intercept all fetch calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    console.log(`%c🌐 FETCH REQUEST`, 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;', url);

    return originalFetch.apply(this, args)
        .then(response => {
            if (response.ok) {
                console.log(`%c✅ FETCH SUCCESS (${response.status})`, 'background: #10b981; color: white; padding: 2px 6px; border-radius: 3px;', url);
            } else {
                console.error(`%c❌ FETCH FAILED (${response.status})`, 'background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px;', url);
            }
            return response;
        })
        .catch(error => {
            console.error(`%c💥 FETCH ERROR`, 'background: #dc2626; color: white; padding: 2px 6px; border-radius: 3px;', url, error);
            throw error;
        });
};

// Debug helper functions
window.CommunityDebug = {

    /**
     * Check if all required elements exist
     */
    checkElements: function() {
        console.log('%c🔍 CHECKING DOM ELEMENTS', 'background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const elements = {
            // Main panel
            'tutor-community-panel': document.getElementById('tutor-community-panel'),

            // Main tab contents
            'connections-main-tab-content': document.getElementById('connections-main-tab-content'),
            'requests-main-tab-content': document.getElementById('requests-main-tab-content'),
            'events-main-tab-content': document.getElementById('events-main-tab-content'),
            'clubs-main-tab-content': document.getElementById('clubs-main-tab-content'),

            // Connection grids
            'all-connections-grid': document.getElementById('all-connections-grid'),
            'student-connections-grid': document.getElementById('student-connections-grid'),
            'parent-connections-grid': document.getElementById('parent-connections-grid'),
            'tutor-connections-grid': document.getElementById('tutor-connections-grid'),

            // Request lists
            'sent-requests-list': document.getElementById('sent-requests-list'),
            'received-requests-list': document.getElementById('received-requests-list'),

            // Event grids
            'all-events-grid': document.getElementById('all-events-grid'),
            'upcoming-events-grid': document.getElementById('upcoming-events-grid'),
            'past-events-grid': document.getElementById('past-events-grid'),

            // Club grids
            'all-clubs-grid': document.getElementById('all-clubs-grid'),
            'joined-clubs-grid': document.getElementById('joined-clubs-grid'),
            'discover-clubs-grid': document.getElementById('discover-clubs-grid')
        };

        let foundCount = 0;
        let missingCount = 0;

        Object.entries(elements).forEach(([id, element]) => {
            if (element) {
                console.log(`✅ ${id.padEnd(35)} FOUND`);
                foundCount++;
            } else {
                console.error(`❌ ${id.padEnd(35)} MISSING`);
                missingCount++;
            }
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Summary: ${foundCount} found, ${missingCount} missing`);

        return { foundCount, missingCount, elements };
    },

    /**
     * Check manager initialization
     */
    checkManagers: function() {
        console.log('%c🔍 CHECKING MANAGERS', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const managers = {
            'window.communityManager': window.communityManager,
            'window.switchCommunityMainTab': window.switchCommunityMainTab,
            'window.switchRequestsTab': window.switchRequestsTab,
            'window.toggleRequestsSubSection': window.toggleRequestsSubSection,
            'window.toggleConnectionsSubSection': window.toggleConnectionsSubSection,
            'window.toggleEventsSubSection': window.toggleEventsSubSection,
            'window.toggleClubsSubSection': window.toggleClubsSubSection
        };

        Object.entries(managers).forEach(([name, obj]) => {
            if (obj) {
                console.log(`✅ ${name.padEnd(45)} ${typeof obj === 'function' ? 'FUNCTION' : 'OBJECT'}`);
            } else {
                console.error(`❌ ${name.padEnd(45)} MISSING`);
            }
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return managers;
    },

    /**
     * Test API connectivity
     */
    testAPI: async function() {
        console.log('%c🔍 TESTING API CONNECTIVITY', 'background: #ec4899; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const token = localStorage.getItem('token');
        const API_BASE = window.API_BASE_URL || 'http://localhost:8000';

        if (!token) {
            console.error('❌ No authentication token found');
            return;
        }

        console.log('✅ Token found:', token.substring(0, 20) + '...');

        const endpoints = [
            '/api/connections/stats',
            '/api/connections?status=accepted',
            '/api/connections?status=pending&direction=incoming',
            '/api/connections?status=pending&direction=outgoing',
            '/api/events',
            '/api/clubs'
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`\n🔹 Testing: ${endpoint}`);
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`   ✅ Status: ${response.status}`);
                    console.log(`   📊 Data:`, data);
                } else {
                    console.error(`   ❌ Status: ${response.status}`);
                    const errorText = await response.text();
                    console.error(`   📄 Error:`, errorText);
                }
            } catch (error) {
                console.error(`   💥 Exception:`, error.message);
            }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    },

    /**
     * Trace function execution
     */
    traceFunctions: function() {
        console.log('%c🔍 TRACING FUNCTION CALLS', 'background: #6366f1; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Wrap switchCommunityMainTab
        if (window.switchCommunityMainTab) {
            const original = window.switchCommunityMainTab;
            window.switchCommunityMainTab = function(section) {
                console.log(`%c📞 switchCommunityMainTab('${section}')`, 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;');
                try {
                    const result = original.apply(this, arguments);
                    console.log(`   ✅ Completed successfully`);
                    return result;
                } catch (error) {
                    console.error(`   ❌ Error:`, error);
                    throw error;
                }
            };
        }

        // Wrap communityManager methods
        if (window.communityManager) {
            const methods = ['loadSectionGrid', 'loadConnectionsGrid', 'displayConnectionsGrid'];

            methods.forEach(methodName => {
                if (window.communityManager[methodName]) {
                    const original = window.communityManager[methodName];
                    window.communityManager[methodName] = async function(...args) {
                        console.log(`%c📞 communityManager.${methodName}(${JSON.stringify(args)})`, 'background: #10b981; color: white; padding: 2px 6px; border-radius: 3px;');
                        try {
                            const result = await original.apply(this, args);
                            console.log(`   ✅ Completed successfully`);
                            return result;
                        } catch (error) {
                            console.error(`   ❌ Error:`, error);
                            throw error;
                        }
                    };
                }
            });
        }

        console.log('✅ Function tracing enabled');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    },

    /**
     * Run full diagnostic
     */
    runFullDiagnostic: async function() {
        console.clear();
        console.log('%c╔════════════════════════════════════════════════╗', 'color: #8b5cf6; font-weight: bold;');
        console.log('%c║  COMMUNITY PANEL DIAGNOSTIC REPORT             ║', 'color: #8b5cf6; font-weight: bold;');
        console.log('%c╚════════════════════════════════════════════════╝', 'color: #8b5cf6; font-weight: bold;');
        console.log('');

        // Check 1: DOM Elements
        this.checkElements();
        console.log('\n');

        // Check 2: Managers
        this.checkManagers();
        console.log('\n');

        // Check 3: API Connectivity
        await this.testAPI();
        console.log('\n');

        // Enable tracing
        this.traceFunctions();
        console.log('\n');

        console.log('%c✅ DIAGNOSTIC COMPLETE', 'background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 14px;');
        console.log('%c💡 TIP: Now click the Community panel to see traced execution', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px;');
    },

    /**
     * Check for silent failures in image loading
     */
    checkImageErrors: function() {
        console.log('%c🔍 CHECKING IMAGE ERRORS', 'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const images = document.querySelectorAll('img');
        let errorCount = 0;
        let loadedCount = 0;

        images.forEach((img, index) => {
            if (img.complete) {
                if (img.naturalHeight === 0) {
                    console.error(`❌ Image ${index + 1} failed to load:`, img.src);
                    errorCount++;
                } else {
                    loadedCount++;
                }
            }
        });

        console.log(`📊 Total images: ${images.length}`);
        console.log(`✅ Loaded: ${loadedCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Monitor future image errors
        console.log('🔄 Monitoring future image errors...');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'IMG') {
                        node.addEventListener('error', function() {
                            console.error(`❌ NEW IMAGE FAILED:`, this.src);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * Force load connections data
     */
    forceLoadConnections: async function() {
        console.log('%c🚀 FORCE LOADING CONNECTIONS', 'background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

        const grid = document.getElementById('all-connections-grid');
        if (!grid) {
            console.error('❌ all-connections-grid not found');
            return;
        }

        grid.innerHTML = '<div style="padding: 2rem; text-align: center;">Loading...</div>';

        try {
            const token = localStorage.getItem('token');
            const API_BASE = window.API_BASE_URL || 'http://localhost:8000';

            console.log('📡 Fetching connections...');
            const response = await fetch(`${API_BASE}/api/connections?status=accepted`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Data received:', data);

                if (data.length === 0) {
                    grid.innerHTML = '<div style="padding: 2rem; text-align: center;">No connections yet</div>';
                } else {
                    // Display connections
                    grid.innerHTML = data.map(conn => `
                        <div class="connection-card p-4 border rounded-lg">
                            <h4 class="font-bold">${conn.requester_name || conn.recipient_name || 'Unknown'}</h4>
                            <p class="text-sm text-gray-600">${conn.requester_email || conn.recipient_email || ''}</p>
                        </div>
                    `).join('');
                    console.log(`✅ Displayed ${data.length} connections`);
                }
            } else {
                console.error('❌ API error:', response.status);
                grid.innerHTML = `<div style="padding: 2rem; text-align: center; color: red;">Error: ${response.status}</div>`;
            }
        } catch (error) {
            console.error('❌ Exception:', error);
            grid.innerHTML = `<div style="padding: 2rem; text-align: center; color: red;">Error: ${error.message}</div>`;
        }
    }
};

// Auto-run diagnostic on load
console.log('%c🔧 Community Panel Debug Console Loaded', 'background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 16px;');
console.log('%c📖 Available commands:', 'font-weight: bold; font-size: 14px; margin-top: 10px;');
console.log('   CommunityDebug.runFullDiagnostic()   - Run complete diagnostic');
console.log('   CommunityDebug.checkElements()        - Check DOM elements');
console.log('   CommunityDebug.checkManagers()        - Check managers');
console.log('   CommunityDebug.testAPI()              - Test API endpoints');
console.log('   CommunityDebug.traceFunctions()       - Enable function tracing');
console.log('   CommunityDebug.checkImageErrors()     - Check image loading');
console.log('   CommunityDebug.forceLoadConnections() - Force load connections');
console.log('');
console.log('%c💡 Quick start: CommunityDebug.runFullDiagnostic()', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px;');
