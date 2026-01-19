// CHAT MODAL DEBUG INJECTOR
// Copy and paste this entire script into your browser console while the chat modal is open

(function() {
    'use strict';

    // Create debug console
    const debugDiv = document.createElement('div');
    debugDiv.id = 'chatDebugConsole';
    debugDiv.innerHTML = `
        <style>
            #chatDebugConsole {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 380px;
                max-height: 600px;
                background: rgba(0, 0, 0, 0.95);
                color: #00ff00;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                padding: 15px;
                border-radius: 8px;
                z-index: 999999;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
                border: 2px solid #00ff00;
            }

            #chatDebugConsole h3 {
                margin: 0 0 10px 0;
                color: #00ffff;
                font-size: 14px;
                border-bottom: 1px solid #00ff00;
                padding-bottom: 5px;
            }

            .debug-section {
                margin-bottom: 12px;
                padding: 8px;
                background: rgba(0, 255, 0, 0.05);
                border-radius: 4px;
            }

            .debug-label {
                color: #ffff00;
                font-weight: bold;
                margin-bottom: 4px;
            }

            .debug-value {
                color: #00ff00;
                margin-left: 10px;
                font-size: 10px;
            }

            .debug-error {
                color: #ff0000 !important;
                font-weight: bold;
            }

            .debug-warning {
                color: #ff9900 !important;
            }

            .debug-success {
                color: #00ff00 !important;
            }

            #chatDebugConsole .close-btn {
                position: absolute;
                top: 5px;
                right: 50px;
                background: #ff0000;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
            }

            #chatDebugConsole .copy-btn {
                position: absolute;
                top: 5px;
                right: 10px;
                background: #00ff00;
                color: black;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
                font-weight: bold;
            }

            #chatDebugConsole .copy-btn:hover {
                background: #00cc00;
            }

            #chatDebugConsole .copy-btn.copied {
                background: #ffff00;
            }

            .log-entry {
                padding: 2px 0;
                font-size: 10px;
                border-bottom: 1px solid rgba(0, 255, 0, 0.1);
            }

            .timestamp {
                color: #888;
                font-size: 9px;
            }

            .cache-warning {
                background: rgba(255, 0, 0, 0.2);
                border: 2px solid #ff0000;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 4px;
            }
        </style>

        <button class="close-btn" onclick="this.parentElement.remove()">✕</button>
        <button class="copy-btn" id="copyDebugBtn">📋 Copy</button>
        <h3>🔍 Chat Modal Debug Console</h3>

        <div id="cacheCheck" class="cache-warning" style="display:none;">
            <div class="debug-error">⚠️ CACHE DETECTED!</div>
            <div style="color: #ffff00; font-size: 10px; margin-top: 5px;">
                Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh!
            </div>
        </div>

        <div class="debug-section">
            <div class="debug-label">Screen Width:</div>
            <div class="debug-value" id="dbgScreenWidth">-</div>
        </div>

        <div class="debug-section">
            <div class="debug-label">Sidebar Element:</div>
            <div class="debug-value" id="dbgSidebarExists">-</div>
            <div class="debug-label">Sidebar Classes:</div>
            <div class="debug-value" id="dbgSidebarClasses">-</div>
        </div>

        <div class="debug-section">
            <div class="debug-label">ChatMain Element:</div>
            <div class="debug-value" id="dbgChatMainExists">-</div>
            <div class="debug-label">ChatMain Classes:</div>
            <div class="debug-value" id="dbgChatMainClasses">-</div>
        </div>

        <div class="debug-section" id="computedStylesSection">
            <div class="debug-label">ChatMain Computed Styles:</div>
            <div class="debug-value" id="dbgChatMainStyles">-</div>
        </div>

        <div class="debug-section">
            <div class="debug-label">Loaded Stylesheets:</div>
            <div class="debug-value" id="dbgStylesheets">-</div>
        </div>

        <div class="debug-section">
            <h3 style="font-size: 12px; color: #ffff00;">Event Log (Last 15):</h3>
            <div id="dbgEventLog"></div>
        </div>
    `;

    document.body.appendChild(debugDiv);

    const logEntries = [];
    const maxLogs = 15;

    function log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = { time: timestamp, message, type };

        logEntries.unshift(entry);
        if (logEntries.length > maxLogs) logEntries.pop();

        const logDiv = document.getElementById('dbgEventLog');
        if (logDiv) {
            logDiv.innerHTML = logEntries.map(e => {
                const cls = e.type === 'error' ? 'debug-error' :
                           e.type === 'warning' ? 'debug-warning' : 'debug-success';
                return `<div class="log-entry"><span class="timestamp">[${e.time}]</span> <span class="${cls}">${e.message}</span></div>`;
            }).join('');
        }

        console.log(`[ChatDebug] ${message}`);
    }

    function checkCSSCache() {
        // Check if the CSS file has our fix
        const chatMainStyleCheck = document.createElement('div');
        chatMainStyleCheck.id = 'chatMain';
        chatMainStyleCheck.style.cssText = 'position: absolute; visibility: hidden;';
        document.body.appendChild(chatMainStyleCheck);

        const testStyles = window.getComputedStyle(chatMainStyleCheck);

        // On mobile, padding-left should be 0
        if (window.innerWidth <= 768) {
            const paddingLeft = testStyles.paddingLeft;
            if (paddingLeft !== '0px') {
                document.getElementById('cacheCheck').style.display = 'block';
                log('🔴 CSS CACHE ISSUE DETECTED! Padding should be 0px but is: ' + paddingLeft, 'error');
            } else {
                log('✓ CSS appears to be loaded correctly', 'success');
            }
        }

        document.body.removeChild(chatMainStyleCheck);
    }

    function updateDebugInfo() {
        const sidebar = document.getElementById('chatSidebar');
        const chatMain = document.getElementById('chatMain');
        const width = window.innerWidth;

        // Screen width
        const widthEl = document.getElementById('dbgScreenWidth');
        widthEl.textContent = `${width}px ${width <= 768 ? '(📱 MOBILE MODE)' : '(💻 DESKTOP MODE)'}`;
        widthEl.className = width <= 768 ? 'debug-value debug-warning' : 'debug-value debug-success';

        // Sidebar
        if (sidebar) {
            document.getElementById('dbgSidebarExists').innerHTML = '<span class="debug-success">✓ Found</span>';
            document.getElementById('dbgSidebarClasses').textContent = sidebar.className || '(no classes)';
        } else {
            document.getElementById('dbgSidebarExists').innerHTML = '<span class="debug-error">✗ NOT FOUND</span>';
            document.getElementById('dbgSidebarClasses').textContent = 'N/A';
        }

        // ChatMain
        if (chatMain) {
            document.getElementById('dbgChatMainExists').innerHTML = '<span class="debug-success">✓ Found</span>';
            document.getElementById('dbgChatMainClasses').textContent = chatMain.className || '(no classes)';

            // Computed styles
            const computed = window.getComputedStyle(chatMain);
            const paddingLeft = computed.paddingLeft;
            const transition = computed.transition;

            let stylesHTML = `
                <strong>padding-left:</strong> <span class="${paddingLeft !== '0px' && width <= 768 ? 'debug-error' : 'debug-success'}">${paddingLeft}</span><br>
                <strong>padding-right:</strong> ${computed.paddingRight}<br>
                <strong>transition:</strong> <span class="${transition !== 'none' && width <= 768 ? 'debug-error' : 'debug-success'}">${transition === 'all 0s ease 0s' ? 'none' : transition}</span><br>
                <strong>left:</strong> ${computed.left}<br>
                <strong>width:</strong> ${computed.width}<br>
                <strong>z-index:</strong> ${computed.zIndex}
            `;

            document.getElementById('dbgChatMainStyles').innerHTML = stylesHTML;

            // Validate mobile styles
            if (width <= 768) {
                if (paddingLeft !== '0px') {
                    log(`🔴 PROBLEM: padding-left is ${paddingLeft}, should be 0px on mobile!`, 'error');
                }
                if (transition !== 'none' && transition !== 'all 0s ease 0s') {
                    log(`🔴 PROBLEM: transition is active on mobile: "${transition}"`, 'error');
                }
            }
        } else {
            document.getElementById('dbgChatMainExists').innerHTML = '<span class="debug-error">✗ NOT FOUND</span>';
            document.getElementById('dbgChatMainClasses').textContent = 'N/A';
            document.getElementById('dbgChatMainStyles').textContent = 'N/A';
        }

        // Check stylesheets
        const styleSheets = Array.from(document.styleSheets)
            .filter(s => s.href && s.href.includes('chat-modal.css'))
            .map(s => {
                const url = new URL(s.href);
                return url.pathname.split('/').pop() + (url.search || '');
            });

        document.getElementById('dbgStylesheets').innerHTML =
            styleSheets.length > 0
                ? styleSheets.join('<br>')
                : '<span class="debug-error">chat-modal.css not found!</span>';
    }

    // Watch for changes
    function watchElements() {
        const sidebar = document.getElementById('chatSidebar');
        const chatMain = document.getElementById('chatMain');

        if (sidebar) {
            new MutationObserver(() => {
                const hidden = sidebar.classList.contains('hidden');
                log(`Sidebar ${hidden ? 'HIDDEN' : 'VISIBLE'}`, hidden ? 'warning' : 'info');
                updateDebugInfo();
            }).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
        }

        if (chatMain) {
            new MutationObserver((mutations) => {
                mutations.forEach(mut => {
                    if (mut.attributeName === 'class') {
                        log(`ChatMain classes: ${chatMain.className}`, 'warning');
                    } else if (mut.attributeName === 'style') {
                        log(`⚠️ ChatMain inline style changed!`, 'error');
                    }
                    updateDebugInfo();
                });
            }).observe(chatMain, { attributes: true });
        }
    }

    // Copy debug info to clipboard
    function copyDebugInfo() {
        const sidebar = document.getElementById('chatSidebar');
        const chatMain = document.getElementById('chatMain');
        const width = window.innerWidth;

        let report = '=== CHAT MODAL DEBUG REPORT ===\n\n';
        report += `Timestamp: ${new Date().toLocaleString()}\n`;
        report += `Screen Width: ${width}px ${width <= 768 ? '(MOBILE MODE)' : '(DESKTOP MODE)'}\n\n`;

        // Sidebar info
        report += '--- SIDEBAR ---\n';
        if (sidebar) {
            report += `Element: Found ✓\n`;
            report += `Classes: ${sidebar.className || '(none)'}\n`;
            report += `Hidden: ${sidebar.classList.contains('hidden') ? 'YES' : 'NO'}\n`;
        } else {
            report += `Element: NOT FOUND ✗\n`;
        }

        // ChatMain info
        report += '\n--- CHAT MAIN ---\n';
        if (chatMain) {
            report += `Element: Found ✓\n`;
            report += `Classes: ${chatMain.className || '(none)'}\n`;

            const computed = window.getComputedStyle(chatMain);
            report += '\nComputed Styles:\n';
            report += `  padding-left: ${computed.paddingLeft}`;
            if (computed.paddingLeft !== '0px' && width <= 768) {
                report += ' ⚠️ PROBLEM! Should be 0px on mobile';
            }
            report += '\n';
            report += `  padding-right: ${computed.paddingRight}\n`;
            report += `  transition: ${computed.transition}`;
            if (computed.transition !== 'none' && computed.transition !== 'all 0s ease 0s' && width <= 768) {
                report += ' ⚠️ PROBLEM! Should be none on mobile';
            }
            report += '\n';
            report += `  left: ${computed.left}\n`;
            report += `  width: ${computed.width}\n`;
            report += `  z-index: ${computed.zIndex}\n`;

            // Inline styles
            const inlineStyle = chatMain.getAttribute('style');
            report += `\nInline Styles: ${inlineStyle || '(none)'}\n`;
        } else {
            report += `Element: NOT FOUND ✗\n`;
        }

        // Stylesheets
        report += '\n--- LOADED STYLESHEETS ---\n';
        const styleSheets = Array.from(document.styleSheets)
            .filter(s => s.href && s.href.includes('chat-modal.css'))
            .map(s => {
                const url = new URL(s.href);
                return url.pathname.split('/').pop() + (url.search || '');
            });

        if (styleSheets.length > 0) {
            styleSheets.forEach(s => report += `  ${s}\n`);
        } else {
            report += '  chat-modal.css NOT FOUND ⚠️\n';
        }

        // Event log
        report += '\n--- EVENT LOG (Last 15) ---\n';
        logEntries.forEach(e => {
            report += `[${e.time}] ${e.message}\n`;
        });

        report += '\n=== END REPORT ===';

        // Copy to clipboard
        navigator.clipboard.writeText(report).then(() => {
            const btn = document.getElementById('copyDebugBtn');
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 Copy';
                btn.classList.remove('copied');
            }, 2000);
            log('✓ Debug report copied to clipboard!', 'success');
        }).catch(err => {
            log('✗ Failed to copy: ' + err.message, 'error');
            // Fallback: show in console
            console.log(report);
            alert('Failed to copy to clipboard. Check console for report.');
        });
    }

    // Attach copy button handler
    document.getElementById('copyDebugBtn').addEventListener('click', copyDebugInfo);

    // Initialize
    log('🚀 Debug console initialized', 'success');
    checkCSSCache();
    updateDebugInfo();
    watchElements();

    // Update periodically
    setInterval(updateDebugInfo, 1000);

    // Window resize
    window.addEventListener('resize', () => {
        log(`Window resized to ${window.innerWidth}px`, 'info');
        updateDebugInfo();
    });

    log('Monitoring chat modal...', 'info');

    console.log('%c✓ Chat Debug Console Loaded', 'background: #00ff00; color: #000; padding: 5px 10px; font-weight: bold;');
    console.log('Debug panel should appear in bottom-right corner');
})();
