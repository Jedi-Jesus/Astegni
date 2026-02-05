// Debug Console Injector for Appearance Modal
// This script injects a debug console into the user-profile page

(function() {
    'use strict';

    // Check if already injected
    if (document.getElementById('debug-console-injected')) {
        console.log('Debug console already injected');
        return;
    }

    // Store all logs
    let allLogs = [];

    // Create debug console HTML
    const debugHTML = `
        <div id="debug-console-injected" style="
            position: fixed;
            top: 10px;
            right: 10px;
            width: 450px;
            max-height: 90vh;
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Segoe UI', sans-serif;
            font-size: 12px;
            border: 2px solid #007acc;
            border-radius: 8px;
            z-index: 999999;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        ">
            <div style="
                background: #007acc;
                color: white;
                padding: 10px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            " id="debug-console-header">
                <span>🔍 Appearance Debug Console</span>
                <div>
                    <button onclick="debugConsole.toggleMinimize()" style="
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 5px 10px;
                        font-size: 16px;
                    ">_</button>
                    <button onclick="debugConsole.close()" style="
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 5px 10px;
                        font-size: 16px;
                    ">×</button>
                </div>
            </div>

            <div id="debug-console-body" style="
                max-height: calc(90vh - 45px);
                overflow-y: auto;
                padding: 10px;
            ">
                <!-- Status Panel -->
                <div style="
                    background: #252526;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 10px;
                ">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #569cd6;">📊 Status</div>
                    <div style="display: grid; grid-template-columns: 120px 1fr; gap: 5px; font-size: 11px;">
                        <div style="color: #9cdcfe;">Modal:</div>
                        <div id="status-modal" style="color: #ce9178;">Not Checked</div>

                        <div style="color: #9cdcfe;">Mini-Mode:</div>
                        <div id="status-minimode" style="color: #ce9178;">Not Checked</div>

                        <div style="color: #9cdcfe;">Backdrop:</div>
                        <div id="status-backdrop" style="color: #ce9178;">Not Checked</div>

                        <div style="color: #9cdcfe;">Header Pos:</div>
                        <div id="status-header" style="color: #ce9178;">Not Checked</div>

                        <div style="color: #9cdcfe;">Height:</div>
                        <div id="status-height" style="color: #ce9178;">Not Checked</div>
                    </div>
                </div>

                <!-- Buttons -->
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 5px;
                    margin-bottom: 10px;
                ">
                    <button onclick="debugConsole.runAllTests()" style="
                        background: #0e639c;
                        color: white;
                        border: none;
                        padding: 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">🧪 Run All Tests</button>

                    <button onclick="debugConsole.checkBackdrop()" style="
                        background: #0e639c;
                        color: white;
                        border: none;
                        padding: 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">🌫️ Check Backdrop</button>

                    <button onclick="debugConsole.checkHeader()" style="
                        background: #0e639c;
                        color: white;
                        border: none;
                        padding: 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">📍 Check Header</button>

                    <button onclick="debugConsole.checkHeight()" style="
                        background: #0e639c;
                        color: white;
                        border: none;
                        padding: 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">📏 Check Height</button>

                    <button onclick="debugConsole.copyResults()" style="
                        background: #16825d;
                        color: white;
                        border: none;
                        padding: 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">📋 Copy Results</button>

                    <button onclick="debugConsole.clearLogs()" style="
                        background: #6e6e6e;
                        color: white;
                        border: none;
                        padding: 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">🗑️ Clear Logs</button>
                </div>

                <!-- Logs -->
                <div style="
                    background: #1e1e1e;
                    border: 1px solid #3e3e42;
                    border-radius: 4px;
                    padding: 10px;
                    max-height: 300px;
                    overflow-y: auto;
                    font-family: 'Consolas', monospace;
                    font-size: 11px;
                " id="debug-console-logs">
                    <div style="color: #4ec9b0;">🚀 Debug console loaded</div>
                    <div style="color: #4ec9b0;">💡 Click "Run All Tests" to begin</div>
                </div>
            </div>
        </div>
    `;

    // Inject HTML
    document.body.insertAdjacentHTML('beforeend', debugHTML);

    // Make draggable
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    const consoleEl = document.getElementById('debug-console-injected');
    const header = document.getElementById('debug-console-header');

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        initialX = e.clientX - consoleEl.offsetLeft;
        initialY = e.clientY - consoleEl.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            consoleEl.style.left = currentX + 'px';
            consoleEl.style.top = currentY + 'px';
            consoleEl.style.right = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Debug Console Functions
    window.debugConsole = {
        log: function(message, type = 'info') {
            const logsDiv = document.getElementById('debug-console-logs');
            const timestamp = new Date().toLocaleTimeString();

            const colors = {
                info: '#4ec9b0',
                success: '#6a9955',
                warn: '#dcdcaa',
                error: '#f48771'
            };

            const entry = document.createElement('div');
            entry.style.color = colors[type] || colors.info;
            entry.style.marginBottom = '3px';
            entry.textContent = `[${timestamp}] ${message}`;
            logsDiv.appendChild(entry);
            logsDiv.scrollTop = logsDiv.scrollHeight;

            // Store for copying
            allLogs.push(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        },

        updateStatus: function(id, text, isGood = null) {
            const el = document.getElementById(`status-${id}`);
            if (el) {
                el.textContent = text;
                if (isGood === true) el.style.color = '#6a9955';
                else if (isGood === false) el.style.color = '#f48771';
                else el.style.color = '#ce9178';
            }
        },

        checkBackdrop: function() {
            this.log('🌫️ Checking backdrop/overlay...', 'info');

            const modal = document.getElementById('appearance-modal');
            if (!modal) {
                this.log('❌ Modal not found', 'error');
                this.updateStatus('modal', 'Not Found', false);
                return;
            }

            const isMiniMode = modal.classList.contains('mini-mode');
            this.log(`Mini-mode: ${isMiniMode ? 'Active' : 'Inactive'}`, isMiniMode ? 'success' : 'info');
            this.updateStatus('minimode', isMiniMode ? 'Active' : 'Inactive', isMiniMode);

            // Check for backdrop
            const modalStyle = window.getComputedStyle(modal);
            const beforeStyle = window.getComputedStyle(modal, '::before');
            const afterStyle = window.getComputedStyle(modal, '::after');

            this.log(`Modal background: ${modalStyle.backgroundColor}`, 'info');
            this.log(`Modal pointer-events: ${modalStyle.pointerEvents}`, 'info');

            if (beforeStyle.content !== 'none' && beforeStyle.content !== '""') {
                this.log(`::before - Background: ${beforeStyle.backgroundColor}`, 'warn');
                this.log(`::before - Pointer-events: ${beforeStyle.pointerEvents}`, 'info');
            }

            if (afterStyle.content !== 'none' && afterStyle.content !== '""') {
                this.log(`::after - Background: ${afterStyle.backgroundColor}`, 'warn');
                this.log(`::after - Pointer-events: ${afterStyle.pointerEvents}`, 'info');
            }

            if (isMiniMode && modalStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                this.log('⚠️ ISSUE A: Modal has background in mini-mode!', 'error');
                this.log('💡 Solution: Remove background or set to transparent', 'warn');
                this.updateStatus('backdrop', 'Has Background!', false);
            } else if (isMiniMode) {
                this.log('✅ Background looks good', 'success');
                this.updateStatus('backdrop', 'OK', true);
            } else {
                this.updateStatus('backdrop', 'Not in Mini-Mode', null);
            }
        },

        checkHeader: function() {
            this.log('📍 Checking header position...', 'info');

            const modal = document.getElementById('appearance-modal');
            if (!modal) {
                this.log('❌ Modal not found', 'error');
                return;
            }

            const isMiniMode = modal.classList.contains('mini-mode');
            const header = modal.querySelector('.modal-header') || modal.querySelector('h2');

            if (!header) {
                this.log('❌ Header not found', 'error');
                this.updateStatus('header', 'Not Found', false);
                return;
            }

            const modalContent = modal.querySelector('.modal-content') || modal.querySelector('.appearance-content');
            if (!modalContent) {
                this.log('❌ Modal content not found', 'error');
                return;
            }

            const contentStyle = window.getComputedStyle(modalContent);
            const headerRect = header.getBoundingClientRect();
            const contentRect = modalContent.getBoundingClientRect();

            this.log(`Content padding-top: ${contentStyle.paddingTop}`, 'info');
            this.log(`Header top: ${headerRect.top}px`, 'info');
            this.log(`Content top: ${contentRect.top}px`, 'info');

            if (!isMiniMode) {
                const gap = Math.abs(headerRect.top - contentRect.top);
                if (gap > 2) {
                    this.log(`⚠️ ISSUE B: ${gap}px gap above header!`, 'error');
                    this.log('💡 Solution: Remove padding-top from modal-content', 'warn');
                    this.updateStatus('header', `${gap}px Gap!`, false);
                } else {
                    this.log('✅ Header at top', 'success');
                    this.updateStatus('header', 'At Top', true);
                }
            } else {
                this.updateStatus('header', 'Mini-Mode', null);
            }
        },

        checkHeight: function() {
            this.log('📏 Checking mini-mode height...', 'info');

            const modal = document.getElementById('appearance-modal');
            if (!modal) {
                this.log('❌ Modal not found', 'error');
                return;
            }

            const isMiniMode = modal.classList.contains('mini-mode');
            if (!isMiniMode) {
                this.log('⚠️ Mini-mode not active', 'warn');
                this.updateStatus('height', 'Not in Mini-Mode', false);
                return;
            }

            const modalContent = modal.querySelector('.modal-content') || modal.querySelector('.appearance-content');
            if (!modalContent) {
                this.log('❌ Modal content not found', 'error');
                return;
            }

            const contentHeight = modalContent.clientHeight;
            const scrollHeight = modalContent.scrollHeight;

            this.log(`Content height: ${contentHeight}px`, 'info');
            this.log(`Scroll height: ${scrollHeight}px`, 'info');

            // Find theme cards
            const themeCards = modal.querySelectorAll('.theme-card');
            if (themeCards.length > 0) {
                const firstCard = themeCards[0];
                const cardHeight = firstCard.offsetHeight;
                const cardStyle = window.getComputedStyle(firstCard);
                const cardMargin = parseInt(cardStyle.marginBottom) || 0;
                const totalCardHeight = cardHeight + cardMargin;

                this.log(`Card height: ${cardHeight}px`, 'info');
                this.log(`Card margin: ${cardMargin}px`, 'info');

                const visibleRows = Math.floor(contentHeight / totalCardHeight);
                const requiredFor3Rows = totalCardHeight * 3;

                this.log(`Visible rows: ~${visibleRows}`, 'info');
                this.log(`Required for 3 rows: ${requiredFor3Rows}px`, 'info');

                if (visibleRows < 3) {
                    this.log(`⚠️ ISSUE C: Only ${visibleRows} rows visible!`, 'error');
                    this.log(`💡 Solution: Increase height to ${requiredFor3Rows + 100}px`, 'warn');
                    this.updateStatus('height', `${visibleRows} rows (Too Short!)`, false);
                } else {
                    this.log(`✅ Shows ${visibleRows} rows`, 'success');
                    this.updateStatus('height', `${visibleRows} rows`, true);
                }
            } else {
                this.log('⚠️ No theme cards found', 'warn');
                this.updateStatus('height', 'No Cards Found', false);
            }
        },

        runAllTests: function() {
            this.log('═══════════════════════════════', 'info');
            this.log('🧪 Running all tests...', 'info');

            const modal = document.getElementById('appearance-modal');
            if (!modal) {
                this.log('❌ Modal not found! Open appearance modal first.', 'error');
                this.updateStatus('modal', 'Not Found', false);
                return;
            }

            this.log('✅ Modal found', 'success');
            this.updateStatus('modal', 'Found', true);

            setTimeout(() => this.checkBackdrop(), 100);
            setTimeout(() => this.checkHeader(), 300);
            setTimeout(() => this.checkHeight(), 500);
            setTimeout(() => {
                this.log('═══════════════════════════════', 'info');
                this.log('✅ All tests completed', 'success');
            }, 700);
        },

        copyResults: function() {
            if (allLogs.length === 0) {
                alert('No results to copy. Run tests first!');
                return;
            }

            let output = '═══════════════════════════════════════\n';
            output += '🔍 APPEARANCE DEBUG RESULTS\n';
            output += '═══════════════════════════════════════\n\n';
            output += allLogs.join('\n');
            output += '\n\n═══════════════════════════════════════\n';
            output += `Generated: ${new Date().toLocaleString()}\n`;
            output += '═══════════════════════════════════════\n';

            navigator.clipboard.writeText(output).then(() => {
                this.log('✅ Results copied to clipboard!', 'success');
            }).catch(err => {
                this.log('❌ Copy failed: ' + err.message, 'error');
                alert(output);
            });
        },

        clearLogs: function() {
            document.getElementById('debug-console-logs').innerHTML = '';
            allLogs = [];
            this.log('Console cleared', 'info');
        },

        toggleMinimize: function() {
            const body = document.getElementById('debug-console-body');
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        },

        close: function() {
            document.getElementById('debug-console-injected').remove();
            delete window.debugConsole;
        }
    };

    console.log('✅ Debug console injected! Use window.debugConsole to access functions.');
})();
