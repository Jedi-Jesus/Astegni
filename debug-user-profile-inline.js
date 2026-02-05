/**
 * Inline Debug Script for user-profile.html
 * Add this script to user-profile.html to debug Leave Astegni modal issues
 *
 * Usage: Add before closing </body> tag:
 * <script src="../debug-user-profile-inline.js"></script>
 */

(function() {
    console.log('%c🔍 Leave Astegni Debug Mode Activated', 'background: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;');

    // Create floating debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'leave-astegni-debug-panel';
    debugPanel.innerHTML = `
        <style>
            #leave-astegni-debug-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 320px;
                background: white;
                border: 3px solid #3b82f6;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: system-ui, -apple-system, sans-serif;
                overflow: hidden;
            }
            #debug-header {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 10px 14px;
                font-weight: 700;
                font-size: 13px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #debug-body {
                padding: 12px;
                max-height: 300px;
                overflow-y: auto;
                font-size: 12px;
            }
            .debug-item {
                padding: 8px;
                margin: 4px 0;
                border-radius: 6px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .debug-item.ok { background: #dcfce7; color: #166534; }
            .debug-item.fail { background: #fee2e2; color: #991b1b; }
            .debug-item.pending { background: #fef3c7; color: #92400e; }
            .debug-label { font-weight: 600; }
            .debug-value { font-family: 'Courier New', monospace; }
            .debug-btn {
                background: white;
                border: none;
                color: #3b82f6;
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
            }
            .debug-btn:hover {
                background: #dbeafe;
            }
            .close-debug {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            }
        </style>
        <div id="debug-header">
            <span>🔍 Leave Astegni Debug</span>
            <button class="close-debug" onclick="document.getElementById('leave-astegni-debug-panel').remove()">✕</button>
        </div>
        <div id="debug-body">
            <div class="debug-item pending">
                <span class="debug-label">Container:</span>
                <span id="debug-container" class="debug-value">Checking...</span>
            </div>
            <div class="debug-item pending">
                <span class="debug-label">Modal HTML:</span>
                <span id="debug-modal-html" class="debug-value">Checking...</span>
            </div>
            <div class="debug-item pending">
                <span class="debug-label">Function:</span>
                <span id="debug-function" class="debug-value">Checking...</span>
            </div>
            <div class="debug-item pending">
                <span class="debug-label">Card Found:</span>
                <span id="debug-card" class="debug-value">Checking...</span>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb;">
                <button class="debug-btn" onclick="window.debugLeaveAstegni()" style="width: 100%; padding: 8px;">
                    🧪 Run Full Diagnostic
                </button>
                <button class="debug-btn" onclick="window.tryOpenModal()" style="width: 100%; padding: 8px; margin-top: 4px;">
                    🚀 Try Open Modal
                </button>
            </div>
            <div id="debug-log" style="margin-top: 12px; padding: 8px; background: #f8fafc; border-radius: 6px; font-size: 11px; max-height: 120px; overflow-y: auto;">
                <div style="font-weight: 600; margin-bottom: 4px;">Console Log:</div>
            </div>
        </div>
    `;
    document.body.appendChild(debugPanel);

    // Debug functions
    window.debugLeaveAstegni = function() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 LEAVE ASTEGNI DIAGNOSTIC REPORT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const results = {};

        // Check 1: Modal Container
        console.log('\n📦 CHECK 1: Modal Container (#modal-container)');
        const container = document.getElementById('modal-container');
        results.container = !!container;
        if (container) {
            console.log('✅ PASS: Container found');
            console.log(`   → Tag: ${container.tagName}`);
            console.log(`   → Children: ${container.children.length}`);
            updateDebugItem('debug-container', '✅ Found', 'ok');
        } else {
            console.log('❌ FAIL: Container NOT found');
            console.log('   → This is the root cause if modal fails!');
            updateDebugItem('debug-container', '❌ Missing', 'fail');
        }

        // Check 2: Modal HTML Element
        console.log('\n🎨 CHECK 2: Modal HTML Element (#leave-astegni-modal)');
        const modal = document.getElementById('leave-astegni-modal');
        results.modal = !!modal;
        if (modal) {
            console.log('✅ PASS: Modal element found');
            console.log(`   → Display: ${window.getComputedStyle(modal).display}`);
            console.log(`   → Classes: ${modal.className}`);
            console.log(`   → Z-index: ${window.getComputedStyle(modal).zIndex}`);
            updateDebugItem('debug-modal-html', '✅ Loaded', 'ok');
        } else {
            console.log('❌ FAIL: Modal element NOT found');
            console.log('   → Modal HTML may not have loaded yet');
            updateDebugItem('debug-modal-html', '❌ Not Found', 'fail');
        }

        // Check 3: Function Definition
        console.log('\n⚙️ CHECK 3: Function Definition (openLeaveAstegniModal)');
        const funcExists = typeof openLeaveAstegniModal === 'function';
        results.function = funcExists;
        if (funcExists) {
            console.log('✅ PASS: Function is defined');
            console.log(`   → Type: ${typeof openLeaveAstegniModal}`);
            console.log(`   → On window: ${!!window.openLeaveAstegniModal}`);
            updateDebugItem('debug-function', '✅ Defined', 'ok');
        } else {
            console.log('❌ FAIL: Function NOT defined');
            console.log(`   → Current type: ${typeof openLeaveAstegniModal}`);
            updateDebugItem('debug-function', '❌ Undefined', 'fail');
        }

        // Check 4: Card Element
        console.log('\n🎯 CHECK 4: Leave Astegni Card Element');
        const cards = Array.from(document.querySelectorAll('[onclick*="openLeaveAstegniModal"]'));
        results.card = cards.length > 0;
        if (cards.length > 0) {
            console.log(`✅ PASS: Found ${cards.length} card(s) with onclick handler`);
            cards.forEach((card, i) => {
                console.log(`   → Card ${i+1}: ${card.tagName}.${card.className}`);
                console.log(`   → onclick: ${card.getAttribute('onclick')}`);
            });
            updateDebugItem('debug-card', `✅ ${cards.length} found`, 'ok');
        } else {
            console.log('❌ FAIL: No cards found with onclick="openLeaveAstegniModal()"');
            updateDebugItem('debug-card', '❌ Not Found', 'fail');
        }

        // Check 5: Script Loading
        console.log('\n📜 CHECK 5: Script Loading');
        const scripts = Array.from(document.querySelectorAll('script[src*="leave-astegni-modal"]'));
        if (scripts.length > 0) {
            console.log(`✅ Found ${scripts.length} leave-astegni-modal script(s)`);
            scripts.forEach((script, i) => {
                console.log(`   → Script ${i+1}: ${script.src}`);
            });
        } else {
            console.log('⚠️ WARNING: No leave-astegni-modal.js script tags found');
        }

        // Summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const passed = Object.values(results).filter(v => v).length;
        const total = Object.keys(results).length;

        if (passed === total) {
            console.log(`✅ DIAGNOSTIC PASSED: ${passed}/${total} checks OK`);
            console.log('   → Modal should work! Try clicking the card.');
        } else {
            console.log(`❌ DIAGNOSTIC FAILED: ${passed}/${total} checks OK`);
            console.log(`   → ${total - passed} issue(s) found. Modal will NOT work.`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return results;
    };

    window.tryOpenModal = function() {
        console.log('🚀 Attempting to open Leave Astegni modal...');
        addDebugLog('🚀 Attempting to open modal...');

        if (typeof openLeaveAstegniModal !== 'function') {
            console.error('❌ Function openLeaveAstegniModal is not defined!');
            addDebugLog('❌ Function not defined!');
            return;
        }

        try {
            openLeaveAstegniModal();
            console.log('✅ Function called successfully');
            addDebugLog('✅ Function called');

            // Check if modal is now visible
            setTimeout(() => {
                const modal = document.getElementById('leave-astegni-modal');
                if (modal && modal.style.display === 'flex') {
                    console.log('✅ SUCCESS: Modal is now visible!');
                    addDebugLog('✅ Modal opened!');
                } else {
                    console.error('❌ Modal did not open');
                    addDebugLog('❌ Modal failed to open');
                }
            }, 200);
        } catch (error) {
            console.error('❌ Error calling function:', error);
            addDebugLog(`❌ Error: ${error.message}`);
        }
    };

    function updateDebugItem(elementId, value, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            const parent = element.parentElement;
            parent.className = `debug-item ${status}`;
        }
    }

    function addDebugLog(message) {
        const logContainer = document.getElementById('debug-log');
        if (logContainer) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.style.cssText = 'padding: 2px 0; color: #64748b;';
            logEntry.innerHTML = `<span style="opacity: 0.6;">[${timestamp}]</span> ${message}`;
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // Override openLeaveAstegniModal to add logging
    const originalOpen = window.openLeaveAstegniModal;
    if (originalOpen) {
        window.openLeaveAstegniModal = function() {
            console.log('%c🔵 openLeaveAstegniModal() called', 'color: #3b82f6; font-weight: bold;');
            addDebugLog('🔵 Function called');

            const modal = document.getElementById('leave-astegni-modal');
            console.log(`   → Modal element: ${modal ? 'FOUND' : 'NOT FOUND'}`);

            if (!modal) {
                console.error('%c❌ Modal element not found! Function will exit.', 'color: #ef4444; font-weight: bold;');
                addDebugLog('❌ Modal not found!');
            }

            const result = originalOpen.apply(this, arguments);

            if (modal) {
                console.log(`   → Modal display after call: ${modal.style.display}`);
                console.log(`   → Modal classes after call: ${modal.className}`);
                addDebugLog('✅ Modal opened');
            }

            return result;
        };
        console.log('✅ openLeaveAstegniModal() function wrapped with logging');
    }

    // Run initial check after a delay
    setTimeout(() => {
        console.log('🏁 Running initial diagnostic check...');
        window.debugLeaveAstegni();
    }, 1000);

    // Add click listener to detect card clicks
    document.addEventListener('click', function(e) {
        const target = e.target.closest('[onclick*="openLeaveAstegniModal"]');
        if (target) {
            console.log('%c🖱️ Leave Astegni card clicked!', 'background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            addDebugLog('🖱️ Card clicked');

            const onclickAttr = target.getAttribute('onclick');
            console.log(`   → onclick attribute: "${onclickAttr}"`);
            console.log(`   → Card element:`, target);
        }
    }, true);

    console.log('✅ Debug mode ready. Type debugLeaveAstegni() to run diagnostic.');
})();
