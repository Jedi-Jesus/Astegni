// ============================================
// APPEARANCE DEBUG CONSOLE
// Inject this into tutor-profile or student-profile to debug theme issues
// ============================================

(function() {
    'use strict';

    // Prevent multiple injections
    if (window.appearanceDebugConsole) {
        console.log('[Debug] Console already injected');
        return;
    }

    let logs = [];
    let autoRefresh = null;

    // Create console HTML
    const consoleHTML = `
        <div id="appearance-debug-console" style="
            position: fixed;
            top: 10px;
            right: 10px;
            width: 500px;
            max-height: 90vh;
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 11px;
            border: 2px solid #007acc;
            border-radius: 8px;
            z-index: 999999;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #007acc, #005a9e);
                color: white;
                padding: 12px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            " id="debug-header">
                <span>🔍 Appearance Debug Console</span>
                <div>
                    <button onclick="appearanceDebugConsole.toggleMinimize()" style="
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 5px 10px;
                        font-size: 16px;
                    ">_</button>
                    <button onclick="appearanceDebugConsole.close()" style="
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 5px 10px;
                        font-size: 16px;
                    ">×</button>
                </div>
            </div>

            <!-- Body -->
            <div id="debug-body" style="padding: 12px; max-height: calc(90vh - 50px); overflow-y: auto;">

                <!-- Current State -->
                <div style="
                    background: #252526;
                    padding: 12px;
                    border-radius: 4px;
                    margin-bottom: 12px;
                ">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #4ec9b0; font-size: 13px;">📊 Current State</div>
                    <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">HTML data-theme:</td>
                            <td style="color: #ce9178; padding: 3px 0;" id="state-html-theme">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">HTML classList:</td>
                            <td style="color: #ce9178; padding: 3px 0;" id="state-html-class">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">Body classList:</td>
                            <td style="color: #ce9178; padding: 3px 0;" id="state-body-class">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">localStorage.theme:</td>
                            <td style="color: #ce9178; padding: 3px 0;" id="state-ls-theme">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">appearance_settings:</td>
                            <td style="color: #ce9178; padding: 3px 0; word-break: break-all;" id="state-ls-appearance">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">window.theme:</td>
                            <td style="color: #ce9178; padding: 3px 0;" id="state-window-theme">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">Manager loaded:</td>
                            <td style="color: #ce9178; padding: 3px 0;" id="state-manager">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 3px 0;">Manager settings:</td>
                            <td style="color: #ce9178; padding: 3px 0; word-break: break-all;" id="state-manager-settings">-</td>
                        </tr>
                    </table>
                </div>

                <!-- Actions -->
                <div style="margin-bottom: 12px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #4ec9b0; font-size: 13px;">⚡ Actions</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <button onclick="appearanceDebugConsole.refresh()" style="
                            background: #0e639c;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">🔄 Refresh</button>

                        <button onclick="appearanceDebugConsole.toggleAutoRefresh()" style="
                            background: #0e639c;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        " id="auto-refresh-btn">⏱️ Auto (OFF)</button>

                        <button onclick="appearanceDebugConsole.applyLight()" style="
                            background: #f0f0f0;
                            color: #333;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">☀️ Light</button>

                        <button onclick="appearanceDebugConsole.applyDark()" style="
                            background: #1e1e1e;
                            color: #fff;
                            border: 1px solid #444;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">🌙 Dark</button>

                        <button onclick="appearanceDebugConsole.applySystem()" style="
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">💻 System</button>

                        <button onclick="appearanceDebugConsole.clearStorage()" style="
                            background: #d97706;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">🗑️ Clear</button>

                        <button onclick="appearanceDebugConsole.reapplySettings()" style="
                            background: #10b981;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">✅ Reapply</button>

                        <button onclick="appearanceDebugConsole.clearLogs()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">🧹 Clear Logs</button>
                    </div>
                </div>

                <!-- Event Log -->
                <div>
                    <div style="font-weight: bold; margin-bottom: 8px; color: #4ec9b0; font-size: 13px;">📝 Event Log</div>
                    <div id="debug-logs" style="
                        background: #0d0d0d;
                        border: 1px solid #3e3e42;
                        border-radius: 4px;
                        padding: 8px;
                        max-height: 200px;
                        overflow-y: auto;
                        font-size: 10px;
                    ">
                        <div style="color: #4ec9b0;">Console loaded. Click Refresh to see current state.</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inject HTML
    document.body.insertAdjacentHTML('beforeend', consoleHTML);

    // Make draggable
    const consoleEl = document.getElementById('appearance-debug-console');
    const header = document.getElementById('debug-header');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

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

    // Debug functions
    window.appearanceDebugConsole = {
        log(message, type = 'info') {
            const logsEl = document.getElementById('debug-logs');
            const timestamp = new Date().toLocaleTimeString();

            const colors = {
                info: '#4ec9b0',
                warn: '#dcdcaa',
                error: '#f48771',
                success: '#6a9955'
            };

            const entry = document.createElement('div');
            entry.style.color = colors[type] || colors.info;
            entry.style.marginBottom = '3px';
            entry.textContent = `[${timestamp}] ${message}`;
            logsEl.appendChild(entry);
            logsEl.scrollTop = logsEl.scrollHeight;

            logs.push({ timestamp, message, type });
            console.log(`[AppearanceDebug ${type.toUpperCase()}] ${message}`);
        },

        refresh() {
            this.log('Refreshing state...', 'info');

            // HTML data-theme
            const htmlTheme = document.documentElement.getAttribute('data-theme');
            document.getElementById('state-html-theme').textContent = htmlTheme || 'NOT SET';
            document.getElementById('state-html-theme').style.color = htmlTheme ? '#6a9955' : '#f48771';

            // HTML classList
            const htmlClasses = document.documentElement.className || 'none';
            document.getElementById('state-html-class').textContent = htmlClasses;

            // Body classList
            const bodyClasses = document.body.className || 'none';
            document.getElementById('state-body-class').textContent = bodyClasses;

            // localStorage.theme
            const lsTheme = localStorage.getItem('theme');
            document.getElementById('state-ls-theme').textContent = lsTheme || 'NOT SET';
            document.getElementById('state-ls-theme').style.color = lsTheme ? '#6a9955' : '#f48771';

            // appearance_settings
            const lsAppearance = localStorage.getItem('appearance_settings');
            if (lsAppearance) {
                try {
                    const parsed = JSON.parse(lsAppearance);
                    document.getElementById('state-ls-appearance').textContent = JSON.stringify(parsed, null, 2);
                    document.getElementById('state-ls-appearance').style.color = '#6a9955';
                } catch (e) {
                    document.getElementById('state-ls-appearance').textContent = 'PARSE ERROR';
                    document.getElementById('state-ls-appearance').style.color = '#f48771';
                }
            } else {
                document.getElementById('state-ls-appearance').textContent = 'NOT SET';
                document.getElementById('state-ls-appearance').style.color = '#f48771';
            }

            // window.theme
            document.getElementById('state-window-theme').textContent = window.theme || 'undefined';

            // Manager
            const managerExists = typeof appearanceModalManager !== 'undefined';
            document.getElementById('state-manager').textContent = managerExists ? 'YES ✓' : 'NO ✗';
            document.getElementById('state-manager').style.color = managerExists ? '#6a9955' : '#f48771';

            // Manager settings
            if (managerExists && appearanceModalManager.settings) {
                document.getElementById('state-manager-settings').textContent =
                    JSON.stringify(appearanceModalManager.settings, null, 2);
                document.getElementById('state-manager-settings').style.color = '#6a9955';
            } else {
                document.getElementById('state-manager-settings').textContent = 'NOT AVAILABLE';
                document.getElementById('state-manager-settings').style.color = '#f48771';
            }

            this.log('State refreshed', 'success');
        },

        toggleAutoRefresh() {
            if (autoRefresh) {
                clearInterval(autoRefresh);
                autoRefresh = null;
                document.getElementById('auto-refresh-btn').textContent = '⏱️ Auto (OFF)';
                this.log('Auto-refresh disabled', 'warn');
            } else {
                autoRefresh = setInterval(() => this.refresh(), 1000);
                document.getElementById('auto-refresh-btn').textContent = '⏱️ Auto (ON)';
                this.log('Auto-refresh enabled (1s interval)', 'success');
            }
        },

        applyLight() {
            this.log('Applying LIGHT theme...', 'info');
            if (typeof appearanceModalManager !== 'undefined') {
                appearanceModalManager.applyTheme('light');
                appearanceModalManager.settings.theme = 'light';
                appearanceModalManager.saveSettings();
                this.log('Light theme applied via manager', 'success');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                this.log('Light theme applied manually (manager not available)', 'warn');
            }
            this.refresh();
        },

        applyDark() {
            this.log('Applying DARK theme...', 'info');
            if (typeof appearanceModalManager !== 'undefined') {
                appearanceModalManager.applyTheme('dark');
                appearanceModalManager.settings.theme = 'dark';
                appearanceModalManager.saveSettings();
                this.log('Dark theme applied via manager', 'success');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                this.log('Dark theme applied manually (manager not available)', 'warn');
            }
            this.refresh();
        },

        applySystem() {
            this.log('Applying SYSTEM theme...', 'info');
            if (typeof appearanceModalManager !== 'undefined') {
                appearanceModalManager.applyTheme('system');
                appearanceModalManager.settings.theme = 'system';
                appearanceModalManager.saveSettings();
                this.log('System theme applied via manager', 'success');
            } else {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                localStorage.setItem('theme', 'system');
                this.log('System theme applied manually (manager not available)', 'warn');
            }
            this.refresh();
        },

        clearStorage() {
            this.log('Clearing localStorage...', 'warn');
            localStorage.removeItem('theme');
            localStorage.removeItem('appearance_settings');
            localStorage.removeItem('colorPalette');
            this.log('localStorage cleared', 'success');
            this.refresh();
        },

        reapplySettings() {
            this.log('Reapplying all settings...', 'info');
            if (typeof appearanceModalManager !== 'undefined') {
                appearanceModalManager.applySettings();
                this.log('Settings reapplied via manager', 'success');
            } else {
                this.log('Manager not available - cannot reapply', 'error');
            }
            this.refresh();
        },

        clearLogs() {
            document.getElementById('debug-logs').innerHTML = '';
            logs = [];
            this.log('Logs cleared', 'info');
        },

        toggleMinimize() {
            const body = document.getElementById('debug-body');
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        },

        close() {
            if (autoRefresh) clearInterval(autoRefresh);
            document.getElementById('appearance-debug-console').remove();
            delete window.appearanceDebugConsole;
        },

        exportLogs() {
            const output = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
            console.log('=== APPEARANCE DEBUG LOGS ===\n' + output);
            return output;
        }
    };

    // Initial refresh
    setTimeout(() => window.appearanceDebugConsole.refresh(), 100);

    // Monitor key events
    document.addEventListener('DOMContentLoaded', () => {
        window.appearanceDebugConsole.log('DOMContentLoaded fired', 'info');
        window.appearanceDebugConsole.refresh();
    });

    window.addEventListener('load', () => {
        window.appearanceDebugConsole.log('window.load fired', 'info');
        window.appearanceDebugConsole.refresh();
    });

    console.log('%c✅ Appearance Debug Console Loaded', 'color: #10b981; font-size: 14px; font-weight: bold;');
    console.log('%cUse window.appearanceDebugConsole for programmatic access', 'color: #6366f1; font-size: 12px;');
})();
