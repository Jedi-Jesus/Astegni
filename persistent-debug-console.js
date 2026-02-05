// ============================================
// PERSISTENT DEBUG CONSOLE
// Inject this into browser console to track appearance across page navigation
// ============================================

(function() {
    'use strict';

    // Prevent multiple injections
    if (window.persistentDebugConsole) {
        console.log('[Debug] Console already injected');
        return;
    }

    let logs = [];
    let snapshots = [];

    // Create floating console HTML
    const consoleHTML = `
        <div id="persistent-debug-console" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 450px;
            max-height: 600px;
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 11px;
            border: 2px solid #007acc;
            border-radius: 8px;
            z-index: 999999;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #007acc, #005a9e);
                color: white;
                padding: 10px 12px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            " id="debug-header">
                <span>🔍 Persistence Tracker</span>
                <div>
                    <button onclick="persistentDebugConsole.toggleMinimize()" style="
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 5px 10px;
                        font-size: 16px;
                    ">_</button>
                    <button onclick="persistentDebugConsole.close()" style="
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
            <div id="debug-body" style="max-height: 550px; overflow-y: auto;">

                <!-- Current Page Info -->
                <div style="background: #252526; padding: 10px; border-bottom: 1px solid #3e3e42;">
                    <div style="font-weight: bold; color: #4ec9b0; margin-bottom: 5px; font-size: 12px;">📍 Current Page</div>
                    <div style="color: #ce9178; font-size: 10px; word-break: break-all;" id="current-page-path">-</div>
                </div>

                <!-- Quick Snapshot -->
                <div style="background: #252526; padding: 10px; border-bottom: 1px solid #3e3e42;">
                    <div style="font-weight: bold; color: #4ec9b0; margin-bottom: 8px; font-size: 12px;">📸 Quick Snapshot</div>
                    <table style="width: 100%; font-size: 10px;">
                        <tr>
                            <td style="color: #9cdcfe; padding: 2px 0;">data-theme:</td>
                            <td style="color: #ce9178; padding: 2px 0;" id="quick-html-theme">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 2px 0;">localStorage:</td>
                            <td style="color: #ce9178; padding: 2px 0; word-break: break-all;" id="quick-ls-theme">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 2px 0;">Manager:</td>
                            <td style="color: #ce9178; padding: 2px 0;" id="quick-manager">-</td>
                        </tr>
                        <tr>
                            <td style="color: #9cdcfe; padding: 2px 0;">Consistent:</td>
                            <td style="font-weight: bold; padding: 2px 0;" id="quick-consistent">-</td>
                        </tr>
                    </table>
                </div>

                <!-- Actions -->
                <div style="padding: 10px; background: #2d2d30; border-bottom: 1px solid #3e3e42;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                        <button onclick="persistentDebugConsole.snapshot()" style="
                            background: #0e639c;
                            color: white;
                            border: none;
                            padding: 6px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">📸 Snapshot</button>

                        <button onclick="persistentDebugConsole.compare()" style="
                            background: #0e639c;
                            color: white;
                            border: none;
                            padding: 6px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">🔄 Compare</button>

                        <button onclick="persistentDebugConsole.copyAll()" style="
                            background: #0e639c;
                            color: white;
                            border: none;
                            padding: 6px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                        ">📋 Copy</button>
                    </div>
                </div>

                <!-- Comparison Results -->
                <div id="comparison-results" style="padding: 10px; background: #1e1e1e; border-bottom: 1px solid #3e3e42; display: none;">
                    <div style="font-weight: bold; color: #f48771; margin-bottom: 8px; font-size: 11px;">⚠️ Inconsistencies Detected</div>
                    <div id="comparison-details" style="font-size: 10px; color: #d4d4d4;"></div>
                </div>

                <!-- Snapshots List -->
                <div style="padding: 10px; background: #252526;">
                    <div style="font-weight: bold; color: #4ec9b0; margin-bottom: 8px; font-size: 12px;">📊 Snapshots (<span id="snapshot-count">0</span>)</div>
                    <div id="snapshots-list" style="max-height: 200px; overflow-y: auto;">
                        <div style="color: #6e7681; font-size: 10px; text-align: center; padding: 10px;">
                            Click "Snapshot" to capture current state
                        </div>
                    </div>
                </div>

                <!-- Event Log -->
                <div style="padding: 10px; background: #1e1e1e;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="font-weight: bold; color: #4ec9b0; font-size: 12px;">📝 Event Log</div>
                        <button onclick="persistentDebugConsole.clearLogs()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 4px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 9px;
                        ">Clear</button>
                    </div>
                    <div id="debug-logs" style="
                        background: #0d0d0d;
                        border: 1px solid #3e3e42;
                        border-radius: 4px;
                        padding: 8px;
                        max-height: 150px;
                        overflow-y: auto;
                        font-size: 10px;
                    ">
                        <div style="color: #4ec9b0;">Console loaded. Navigate between pages to track persistence.</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inject HTML
    document.body.insertAdjacentHTML('beforeend', consoleHTML);

    // Make draggable
    const consoleEl = document.getElementById('persistent-debug-console');
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
            consoleEl.style.bottom = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Core functions
    window.persistentDebugConsole = {
        log(message, type = 'info') {
            const logsEl = document.getElementById('debug-logs');
            const timestamp = new Date().toLocaleTimeString();

            const colors = {
                info: '#4ec9b0',
                warn: '#dcdcaa',
                error: '#f48771',
                success: '#6a9955',
                nav: '#bc8cff'
            };

            const entry = document.createElement('div');
            entry.style.color = colors[type] || colors.info;
            entry.style.marginBottom = '3px';
            entry.textContent = `[${timestamp}] ${message}`;
            logsEl.appendChild(entry);
            logsEl.scrollTop = logsEl.scrollHeight;

            logs.push({ timestamp, message, type });
            console.log(`[PersistentDebug ${type.toUpperCase()}] ${message}`);
        },

        refresh() {
            const htmlTheme = document.documentElement.getAttribute('data-theme');
            const lsAppearance = localStorage.getItem('appearance_settings');
            let appearanceTheme = null;
            let colorPalette = null;

            if (lsAppearance) {
                try {
                    const parsed = JSON.parse(lsAppearance);
                    appearanceTheme = parsed.theme;
                    colorPalette = parsed.colorPalette;
                } catch (e) {
                    this.log('Failed to parse appearance_settings', 'error');
                }
            }

            const managerLoaded = typeof appearanceModalManager !== 'undefined';
            const managerTheme = managerLoaded ? appearanceModalManager.settings?.theme : null;

            // Update quick snapshot
            document.getElementById('current-page-path').textContent = window.location.pathname;
            document.getElementById('quick-html-theme').textContent = htmlTheme || 'NOT SET';
            document.getElementById('quick-ls-theme').textContent = appearanceTheme || 'NOT SET';
            document.getElementById('quick-manager').textContent = managerLoaded ? (managerTheme || 'NOT SET') : 'NOT LOADED';

            // Check consistency
            const consistent = htmlTheme === appearanceTheme ||
                              (appearanceTheme === 'system' && (htmlTheme === 'light' || htmlTheme === 'dark'));

            const consistentEl = document.getElementById('quick-consistent');
            if (consistent) {
                consistentEl.textContent = '✅ YES';
                consistentEl.style.color = '#6a9955';
            } else {
                consistentEl.textContent = '❌ NO';
                consistentEl.style.color = '#f48771';
            }

            return {
                page: window.location.pathname,
                htmlTheme,
                appearanceTheme,
                colorPalette,
                managerLoaded,
                managerTheme,
                consistent,
                timestamp: new Date().toISOString()
            };
        },

        snapshot() {
            const state = this.refresh();
            snapshots.push(state);

            this.log(`Snapshot #${snapshots.length} captured on ${state.page}`, 'success');

            // Update snapshots list
            const listEl = document.getElementById('snapshots-list');
            if (snapshots.length === 1) {
                listEl.innerHTML = '';
            }

            const snapshotEl = document.createElement('div');
            snapshotEl.style.cssText = 'background: #0d0d0d; padding: 8px; margin-bottom: 6px; border-radius: 4px; border-left: 3px solid ' + (state.consistent ? '#6a9955' : '#f48771');
            snapshotEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #9cdcfe; font-weight: bold;">#${snapshots.length}</span>
                    <span style="color: #6e7681; font-size: 9px;">${new Date().toLocaleTimeString()}</span>
                </div>
                <div style="color: #ce9178; font-size: 9px; margin-bottom: 2px;">${state.page}</div>
                <div style="font-size: 9px;">
                    <span style="color: #9cdcfe;">HTML:</span> <span style="color: ${state.consistent ? '#6a9955' : '#f48771'}">${state.htmlTheme || 'NOT SET'}</span> |
                    <span style="color: #9cdcfe;">LS:</span> <span style="color: #ce9178;">${state.appearanceTheme || 'NOT SET'}</span>
                </div>
                ${state.colorPalette ? `<div style="font-size: 9px; color: #bc8cff;">Palette: ${state.colorPalette}</div>` : ''}
            `;
            listEl.appendChild(snapshotEl);
            listEl.scrollTop = listEl.scrollHeight;

            document.getElementById('snapshot-count').textContent = snapshots.length;
        },

        compare() {
            if (snapshots.length < 2) {
                this.log('Need at least 2 snapshots to compare', 'warn');
                alert('Take at least 2 snapshots first.\n\n1. Set theme in advertiser-profile\n2. Click Snapshot\n3. Navigate to tutor-profile\n4. Click Snapshot\n5. Click Compare');
                return;
            }

            const prev = snapshots[snapshots.length - 2];
            const curr = snapshots[snapshots.length - 1];

            const issues = [];

            // Check theme consistency
            if (prev.appearanceTheme !== curr.appearanceTheme) {
                issues.push(`❌ localStorage theme CHANGED: "${prev.appearanceTheme}" → "${curr.appearanceTheme}"`);
            }

            // Check if HTML matches localStorage
            if (curr.htmlTheme !== curr.appearanceTheme && curr.appearanceTheme !== 'system') {
                issues.push(`❌ HTML theme (${curr.htmlTheme}) does NOT match localStorage (${curr.appearanceTheme})`);
            }

            // Check color palette
            if (prev.colorPalette !== curr.colorPalette) {
                issues.push(`⚠️ Color palette CHANGED: "${prev.colorPalette}" → "${curr.colorPalette}"`);
            }

            // Check manager
            if (!curr.managerLoaded) {
                issues.push(`⚠️ Manager NOT loaded on ${curr.page}`);
            }

            const resultsEl = document.getElementById('comparison-results');
            const detailsEl = document.getElementById('comparison-details');

            if (issues.length > 0) {
                resultsEl.style.display = 'block';
                detailsEl.innerHTML = issues.map(issue => `<div style="margin-bottom: 4px;">${issue}</div>`).join('');
                this.log(`Comparison: ${issues.length} issue(s) found`, 'error');
            } else {
                resultsEl.style.display = 'block';
                resultsEl.querySelector('div').style.color = '#6a9955';
                resultsEl.querySelector('div').textContent = '✅ Consistency Verified';
                detailsEl.innerHTML = `
                    <div style="color: #6a9955;">✅ Theme persisted correctly</div>
                    <div style="color: #6a9955;">✅ HTML matches localStorage</div>
                    <div style="color: #6a9955;">✅ Color palette preserved</div>
                `;
                this.log('Comparison: All checks passed!', 'success');
            }
        },

        copyAll() {
            const report = `
=== PERSISTENT DEBUG CONSOLE REPORT ===
Generated: ${new Date().toLocaleString()}

--- SNAPSHOTS (${snapshots.length}) ---
${snapshots.map((s, i) => `
Snapshot #${i + 1} - ${new Date(s.timestamp).toLocaleTimeString()}
Page: ${s.page}
HTML theme: ${s.htmlTheme || 'NOT SET'}
localStorage theme: ${s.appearanceTheme || 'NOT SET'}
Color palette: ${s.colorPalette || 'NOT SET'}
Manager loaded: ${s.managerLoaded ? 'YES' : 'NO'}
Consistent: ${s.consistent ? 'YES ✓' : 'NO ✗'}
`).join('\n')}

--- EVENT LOG (Last 20) ---
${logs.slice(-20).map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n')}

=== END REPORT ===
            `.trim();

            navigator.clipboard.writeText(report).then(() => {
                this.log('Report copied to clipboard!', 'success');
            }).catch(() => {
                alert('Copy failed. Report:\n\n' + report);
            });
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
            document.getElementById('persistent-debug-console').remove();
            delete window.persistentDebugConsole;
        }
    };

    // Auto-refresh on load
    setTimeout(() => window.persistentDebugConsole.refresh(), 100);

    // Track navigation
    let lastPath = window.location.pathname;
    setInterval(() => {
        if (window.location.pathname !== lastPath) {
            window.persistentDebugConsole.log(`Navigation: ${lastPath} → ${window.location.pathname}`, 'nav');
            lastPath = window.location.pathname;
            window.persistentDebugConsole.refresh();
        }
    }, 500);

    // Monitor theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                const newTheme = document.documentElement.getAttribute('data-theme');
                window.persistentDebugConsole.log(`Theme changed to: ${newTheme}`, 'warn');
                window.persistentDebugConsole.refresh();
            }
        });
    });

    observer.observe(document.documentElement, { attributes: true });

    // Track page load events
    window.persistentDebugConsole.log(`Console loaded on ${window.location.pathname}`, 'info');

    console.log('%c✅ Persistent Debug Console Loaded', 'color: #7ee787; font-size: 14px; font-weight: bold;');
    console.log('%cWorkflow:\n1. Open advertiser-profile\n2. Set color palette\n3. Click "Snapshot"\n4. Navigate to tutor-profile\n5. Click "Snapshot"\n6. Click "Compare"', 'color: #6366f1; font-size: 12px;');
})();
