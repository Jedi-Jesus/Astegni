/**
 * Role Switch Debugger - Embedded Debug Panel
 * Captures and displays role switching events in real-time
 */

class RoleSwitchDebugger {
    constructor() {
        // Try to restore logs from sessionStorage
        const savedLogs = sessionStorage.getItem('debugPanelLogs');
        const savedStats = sessionStorage.getItem('debugPanelStats');

        this.logs = savedLogs ? JSON.parse(savedLogs) : [];
        this.stats = savedStats ? JSON.parse(savedStats) : {
            total: 0,
            success: 0,
            error: 0
        };
        this.isVisible = false;
        this.autoScroll = true;

        this.init();
    }

    init() {
        // Create debug panel UI
        this.createDebugPanel();

        // Intercept console methods
        this.interceptConsole();

        // Intercept fetch API calls
        this.interceptFetch();

        // Monitor localStorage changes
        this.monitorLocalStorage();

        // Add keyboard shortcut to toggle (Ctrl+Shift+D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                this.toggle();
            }
        });

        // Auto-open if it was open before navigation
        const wasOpen = sessionStorage.getItem('debugPanelOpen') === 'true';
        if (wasOpen) {
            this.show();
        }

        // Restore saved logs to UI
        if (this.logs.length > 0) {
            this.logs.forEach(log => this.renderLog(log));
            this.updateStats();
            console.log(`🔍 [RoleSwitchDebugger] Restored ${this.logs.length} logs from previous page`);
        }

        console.log('🔍 [RoleSwitchDebugger] Initialized - Press Ctrl+Shift+D to toggle');
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'role-switch-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 60px;
            right: -450px;
            width: 450px;
            height: calc(100vh - 60px);
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            z-index: 9999;
            box-shadow: -5px 0 15px rgba(0,0,0,0.5);
            transition: right 0.3s ease;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        panel.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-bottom: 1px solid #3e3e42;">
                <h3 style="margin: 0 0 5px 0; color: white; font-size: 16px;">🔍 Role Switch Debugger</h3>
                <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.8);">Press Ctrl+Shift+D to toggle</p>
            </div>

            <div style="padding: 10px; background: #252526; border-bottom: 1px solid #3e3e42;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div style="background: rgba(0,122,204,0.2); padding: 8px; border-radius: 4px; border-left: 3px solid #007acc;">
                        <div style="font-size: 10px; color: #858585; margin-bottom: 3px;">TOTAL</div>
                        <div id="debug-stat-total" style="font-size: 20px; font-weight: bold; color: #fff;">0</div>
                    </div>
                    <div style="background: rgba(76,175,80,0.2); padding: 8px; border-radius: 4px; border-left: 3px solid #4caf50;">
                        <div style="font-size: 10px; color: #858585; margin-bottom: 3px;">SUCCESS</div>
                        <div id="debug-stat-success" style="font-size: 20px; font-weight: bold; color: #4caf50;">0</div>
                    </div>
                    <div style="background: rgba(244,67,54,0.2); padding: 8px; border-radius: 4px; border-left: 3px solid #f44336;">
                        <div style="font-size: 10px; color: #858585; margin-bottom: 3px;">ERRORS</div>
                        <div id="debug-stat-error" style="font-size: 20px; font-weight: bold; color: #f44336;">0</div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
                    <div style="font-size: 10px; color: #858585; margin-bottom: 3px;">CURRENT STATUS</div>
                    <div id="debug-current-status" style="font-size: 13px; color: #d4d4d4;">Monitoring...</div>
                </div>

                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 5px;">
                    <button onclick="window.roleSwitchDebugger.fetchBackendLogs()" style="flex: 1; padding: 6px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                        🖥️ Backend Logs
                    </button>
                    <button onclick="window.roleSwitchDebugger.startAutoRefresh()" style="flex: 1; padding: 6px; background: #43a047; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;" id="auto-refresh-btn">
                        ▶️ Auto-Refresh
                    </button>
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button onclick="window.roleSwitchDebugger.clearLogs()" style="flex: 1; padding: 6px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                        🗑️ Clear
                    </button>
                    <button onclick="window.roleSwitchDebugger.clearLocalStorageFlags()" style="flex: 1; padding: 6px; background: #388e3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                        🧹 Clear Flags
                    </button>
                    <button onclick="window.roleSwitchDebugger.captureState()" style="flex: 1; padding: 6px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                        📸 Snapshot
                    </button>
                    <button onclick="window.roleSwitchDebugger.copyToClipboard()" style="flex: 1; padding: 6px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                        📋 Copy
                    </button>
                    <button onclick="window.roleSwitchDebugger.exportLogs()" style="flex: 1; padding: 6px; background: #f57c00; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                        💾 Export
                    </button>
                </div>
            </div>

            <div id="debug-console-body" style="flex: 1; overflow-y: auto; padding: 10px; background: #1e1e1e;">
                <div style="text-align: center; padding: 20px; color: #666;">
                    <div style="font-size: 32px; margin-bottom: 10px;">🎯</div>
                    <p>Waiting for role switch events...</p>
                    <p style="font-size: 10px; margin-top: 10px;">Switch roles to see debugging info</p>
                </div>
            </div>

            <div style="background: #2d2d30; padding: 8px; border-top: 1px solid #3e3e42; font-size: 10px; color: #858585; text-align: center;">
                <div id="debug-timestamp-info">Last update: Never</div>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;
        this.consoleBody = panel.querySelector('#debug-console-body');
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.panel.style.right = this.isVisible ? '0' : '-450px';

        // Save state to sessionStorage for persistence across page navigation
        sessionStorage.setItem('debugPanelOpen', this.isVisible.toString());

        if (this.isVisible) {
            this.captureState();
        }
    }

    show() {
        this.isVisible = true;
        this.panel.style.right = '0';
        sessionStorage.setItem('debugPanelOpen', 'true');
        this.captureState();
    }

    hide() {
        this.isVisible = false;
        this.panel.style.right = '-450px';
        sessionStorage.setItem('debugPanelOpen', 'false');
    }

    interceptConsole() {
        const self = this;
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = function(...args) {
            originalLog.apply(console, args);
            self.processConsoleOutput('info', args);
        };

        console.warn = function(...args) {
            originalWarn.apply(console, args);
            self.processConsoleOutput('warning', args);
        };

        console.error = function(...args) {
            originalError.apply(console, args);
            self.processConsoleOutput('error', args);
        };
    }

    interceptFetch() {
        const self = this;
        const originalFetch = window.fetch;

        window.fetch = async function(...args) {
            const url = args[0];
            const options = args[1] || {};

            // Track role-related API calls (including deactivation)
            if (url.includes('/api/me') || url.includes('/api/switch-role') || url.includes('/api/login') ||
                url.includes('/api/role/deactivate') || url.includes('/api/my-roles')) {
                const method = options.method || 'GET';
                self.addLog('info', `🌐 API CALL: ${method} ${url}`);

                // Log request body for deactivation
                if (url.includes('/api/role/deactivate') && options.body) {
                    try {
                        const body = JSON.parse(options.body);
                        self.addLog('warning', `🔴 DEACTIVATING ROLE: ${body.role}`);
                    } catch (e) {}
                }
            }

            // Call original fetch
            const response = await originalFetch.apply(this, args);

            // Track response for role-related APIs
            if (url.includes('/api/me') || url.includes('/api/switch-role') || url.includes('/api/login') ||
                url.includes('/api/role/deactivate') || url.includes('/api/my-roles')) {
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();

                    // Log deactivation response
                    if (url.includes('/api/role/deactivate')) {
                        if (response.ok) {
                            self.addLog('success', `✅ DEACTIVATION SUCCESS: ${data.deactivated_role} | new_active_role: ${data.new_active_role}`);
                            self.addLog('info', `📋 Remaining active roles: ${JSON.stringify(data.remaining_active_roles)}`);
                        } else {
                            self.addLog('error', `❌ DEACTIVATION FAILED: ${data.detail}`);
                        }
                    }

                    // Log my-roles response
                    if (url.includes('/api/my-roles')) {
                        self.addLog('info', `📋 MY-ROLES: active_role="${data.active_role}" | user_roles=[${data.user_roles?.join(', ')}]`);
                    }

                    const activeRole = data.active_role || data.user?.active_role || data.role;
                    if (activeRole !== undefined) {
                        self.addLog('success', `📥 API RESPONSE: ${url} returned active_role="${activeRole}"`);

                        // Check if role changed unexpectedly
                        const currentRole = localStorage.getItem('userRole');
                        if (currentRole && activeRole !== currentRole && activeRole !== null) {
                            self.addLog('error', `❌ ROLE MISMATCH! localStorage="${currentRole}" but API returned="${activeRole}"`);
                        }
                    }
                } catch (e) {
                    // Non-JSON response, ignore
                }
            }

            return response;
        };
    }

    processConsoleOutput(type, args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');

        // Filter for role-switching related logs
        const keywords = [
            'switchToRole',
            'role_switch_timestamp',
            'role_switch_target',
            'checkRolePageMismatch',
            'TutorProfile',
            'StudentProfile',
            'ParentProfile',
            'UserProfile',
            'AdvertiserProfile',
            'PRE-NAVIGATION STATE',
            'Grace Period',
            'Role switch',
            'roleOption.onclick',
            'handleAddRoleSubmit',
            'EARLY RETURN',
            'FUNCTION CALLED',
            'RoleManager',
            'deactivat',
            'dropdown-profile-link',
            'dropdown-user-role',
            'updateUIForLoggedInUser',
            'ActiveRoleGuard',
            'active_role'
        ];

        const isRelevant = keywords.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase())
        );

        if (isRelevant) {
            this.addLog(type, message);
        }
    }

    addLog(type, message) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const log = { timestamp, type, message };
        this.logs.push(log);
        this.stats.total++;

        if (type === 'error') {
            this.stats.error++;
        } else if (message.includes('✅') || message.includes('successful')) {
            this.stats.success++;
        }

        this.updateStats();
        this.renderLog(log);

        // Save logs to sessionStorage for persistence
        sessionStorage.setItem('debugPanelLogs', JSON.stringify(this.logs));
        sessionStorage.setItem('debugPanelStats', JSON.stringify(this.stats));

        // Auto-scroll to bottom
        if (this.autoScroll) {
            this.consoleBody.scrollTop = this.consoleBody.scrollHeight;
        }

        // Update timestamp
        document.getElementById('debug-timestamp-info').textContent =
            `Last update: ${timestamp}`;
    }

    renderLog(log) {
        // Remove empty state if exists
        const emptyState = this.consoleBody.querySelector('[style*="text-align: center"]');
        if (emptyState) {
            emptyState.remove();
        }

        const logEntry = document.createElement('div');
        const borderColors = {
            info: '#007acc',
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            debug: '#9c27b0'
        };

        const bgColors = {
            info: 'rgba(0,122,204,0.1)',
            success: 'rgba(76,175,80,0.1)',
            error: 'rgba(244,67,54,0.1)',
            warning: 'rgba(255,152,0,0.1)',
            debug: 'rgba(156,39,176,0.1)'
        };

        logEntry.style.cssText = `
            margin-bottom: 6px;
            padding: 6px 10px;
            border-radius: 4px;
            border-left: 3px solid ${borderColors[log.type]};
            background: ${bgColors[log.type]};
            font-size: 11px;
            line-height: 1.4;
            word-break: break-word;
            animation: slideIn 0.3s ease;
        `;

        const highlightedMessage = this.highlightKeywords(this.escapeHtml(log.message));

        logEntry.innerHTML = `
            <span style="color: #858585; font-size: 10px; margin-right: 8px;">${log.timestamp}</span>
            <span style="color: #d4d4d4;">${highlightedMessage}</span>
        `;

        this.consoleBody.appendChild(logEntry);

        // Add separator for key events
        if (log.message.includes('==========')) {
            const separator = document.createElement('div');
            separator.style.cssText = `
                border-top: 1px solid #3e3e42;
                margin: 10px 0;
            `;
            this.consoleBody.appendChild(separator);
        }
    }

    highlightKeywords(text) {
        const keywords = [
            'role_switch_timestamp',
            'role_switch_target',
            'Grace period',
            'EARLY RETURN',
            'null',
            'true',
            'false',
            'tutor',
            'student',
            'parent'
        ];

        let highlighted = text;
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlighted = highlighted.replace(regex,
                `<span style="background: rgba(255,215,0,0.2); padding: 1px 3px; border-radius: 2px; color: #ffd700; font-weight: bold;">${keyword}</span>`
            );
        });

        return highlighted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        document.getElementById('debug-stat-total').textContent = this.stats.total;
        document.getElementById('debug-stat-success').textContent = this.stats.success;
        document.getElementById('debug-stat-error').textContent = this.stats.error;

        // Update current status
        const timestamp = localStorage.getItem('role_switch_timestamp');
        const target = localStorage.getItem('role_switch_target');
        const statusEl = document.getElementById('debug-current-status');

        if (timestamp) {
            const age = Date.now() - parseInt(timestamp);
            const isValid = age < 10000;
            statusEl.innerHTML = isValid
                ? `<span style="color: #4caf50;">⏳ Switching to ${target}</span>`
                : `<span style="color: #ff9800;">⏱️ No active switch</span>`;
        } else {
            statusEl.innerHTML = '<span style="color: #666;">⏸️ No active switch</span>';
        }
    }

    clearLogs() {
        this.logs = [];
        this.stats = { total: 0, success: 0, error: 0 };
        this.updateStats();

        // Clear from sessionStorage too
        sessionStorage.removeItem('debugPanelLogs');
        sessionStorage.removeItem('debugPanelStats');

        this.consoleBody.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <div style="font-size: 32px; margin-bottom: 10px;">🎯</div>
                <p>Console cleared. Waiting for events...</p>
            </div>
        `;

        this.addLog('info', '🗑️ Console cleared');
    }

    clearLocalStorageFlags() {
        localStorage.removeItem('role_switch_timestamp');
        localStorage.removeItem('role_switch_target');
        this.addLog('info', '🧹 Cleared localStorage flags');
        this.updateStats();
    }

    captureState() {
        // Capture dropdown state
        const dropdownProfileLink = document.getElementById('dropdown-profile-link');
        const dropdownUserRole = document.getElementById('dropdown-user-role');

        const state = {
            timestamp: Date.now(),
            localStorage: {
                role_switch_timestamp: localStorage.getItem('role_switch_timestamp'),
                role_switch_target: localStorage.getItem('role_switch_target'),
                userRole: localStorage.getItem('userRole'),
                access_token: localStorage.getItem('access_token') ? 'EXISTS' : 'NULL',
                user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).active_role : 'NULL',
                currentUser: localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')).active_role : 'NULL'
            },
            dropdown: {
                profileLink_href: dropdownProfileLink ? dropdownProfileLink.href : 'NOT FOUND',
                profileLink_onclick: dropdownProfileLink && dropdownProfileLink.onclick ? 'HAS ONCLICK' : 'NO ONCLICK',
                userRole_text: dropdownUserRole ? dropdownUserRole.textContent : 'NOT FOUND'
            },
            url: window.location.href,
            time: new Date().toLocaleString()
        };

        this.addLog('debug', `📸 State Snapshot:\n${JSON.stringify(state, null, 2)}`);
    }

    copyToClipboard() {
        // Format logs in a clean, readable way for sharing
        const header = `=== ROLE SWITCH DEBUG LOG ===
Generated: ${new Date().toLocaleString()}
URL: ${window.location.href}

=== STATISTICS ===
Total Events: ${this.stats.total}
Successful Switches: ${this.stats.success}
Errors: ${this.stats.error}

=== CURRENT STATE ===
localStorage.role_switch_timestamp: ${localStorage.getItem('role_switch_timestamp')}
localStorage.role_switch_target: ${localStorage.getItem('role_switch_target')}
localStorage.userRole: ${localStorage.getItem('userRole')}
localStorage.access_token: ${localStorage.getItem('access_token') ? 'EXISTS' : 'NULL'}

=== EVENT LOG ===
`;

        const logLines = this.logs.map(log => {
            return `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`;
        }).join('\n');

        const footer = `\n\n=== END OF LOG ===`;

        const fullText = header + logLines + footer;

        // Copy to clipboard
        navigator.clipboard.writeText(fullText).then(() => {
            this.addLog('success', '📋 Logs copied to clipboard! Ready to paste.');

            // Show temporary success indicator on the button
            const buttons = document.querySelectorAll('button');
            let copyButton = null;
            buttons.forEach(btn => {
                if (btn.innerHTML.includes('📋 Copy')) {
                    copyButton = btn;
                }
            });

            if (copyButton) {
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '✅ Copied!';
                copyButton.style.background = '#4caf50';

                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.style.background = '#9c27b0';
                }, 2000);
            }
        }).catch(err => {
            this.addLog('error', `❌ Failed to copy: ${err.message}`);

            // Fallback: Show in alert for manual copy
            alert('Copy failed. Here\'s the log:\n\n' + fullText);
        });
    }

    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            logs: this.logs,
            localStorage: {
                role_switch_timestamp: localStorage.getItem('role_switch_timestamp'),
                role_switch_target: localStorage.getItem('role_switch_target'),
                userRole: localStorage.getItem('userRole')
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `role-switch-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.addLog('success', '💾 Logs exported successfully');
    }

    async fetchBackendLogs() {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

        try {
            this.addLog('info', '🖥️ Fetching backend logs...');

            const response = await fetch(`${API_BASE_URL}/api/debug/logs/role-switch`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            this.addLog('success', `🖥️ Received ${data.total} backend logs`);

            // Display backend logs
            if (data.logs && data.logs.length > 0) {
                this.addLog('info', '━━━━━ BACKEND LOGS START ━━━━━');
                data.logs.forEach(log => {
                    // Color code based on content
                    let type = 'info';
                    if (log.message.includes('ERROR') || log.message.includes('❌') || log.message.includes('FAILED')) {
                        type = 'error';
                    } else if (log.message.includes('SUCCESS') || log.message.includes('✅') || log.message.includes('COMMIT')) {
                        type = 'success';
                    } else if (log.message.includes('WARNING') || log.message.includes('⚠️')) {
                        type = 'warn';
                    }

                    this.addLog(type, `[${log.timestamp}] ${log.message}`);
                });
                this.addLog('info', '━━━━━ BACKEND LOGS END ━━━━━');
            } else {
                this.addLog('warn', '⚠️ No backend logs found (switch role to generate logs)');
            }

        } catch (error) {
            this.addLog('error', `❌ Failed to fetch backend logs: ${error.message}`);
            console.error('[RoleSwitchDebugger] Error fetching backend logs:', error);
        }
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            // Stop auto-refresh
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;

            const btn = document.getElementById('auto-refresh-btn');
            if (btn) {
                btn.innerHTML = '▶️ Auto-Refresh';
                btn.style.background = '#43a047';
            }

            this.addLog('info', '⏸️ Auto-refresh stopped');
        } else {
            // Start auto-refresh every 2 seconds
            this.autoRefreshInterval = setInterval(() => {
                this.fetchBackendLogs();
            }, 2000);

            const btn = document.getElementById('auto-refresh-btn');
            if (btn) {
                btn.innerHTML = '⏸️ Stop Auto';
                btn.style.background = '#e64a19';
            }

            this.addLog('success', '▶️ Auto-refresh started (2s interval)');
            this.fetchBackendLogs(); // Fetch immediately
        }
    }

    monitorLocalStorage() {
        // Monitor localStorage changes every 500ms
        setInterval(() => {
            this.updateStats();
        }, 500);
    }
}

// Initialize debugger when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.roleSwitchDebugger = new RoleSwitchDebugger();
    });
} else {
    window.roleSwitchDebugger = new RoleSwitchDebugger();
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(10px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);
