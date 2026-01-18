/**
 * Floating Debug Console for Admin Right Widgets
 * Monitors and displays CSS properties in real-time
 */

class DebugConsole {
    constructor() {
        this.isMinimized = false;
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.createConsole();
        this.attachEventListeners();
        this.startMonitoring();
    }

    createConsole() {
        const consoleHTML = `
            <div id="debug-console" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 400px;
                max-height: 600px;
                background: rgba(0, 0, 0, 0.95);
                color: #00ff00;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                border: 2px solid #00ff00;
                border-radius: 8px;
                z-index: 99999;
                box-shadow: 0 8px 32px rgba(0, 255, 0, 0.3);
                overflow: hidden;
            ">
                <!-- Header -->
                <div id="debug-header" style="
                    background: #00ff00;
                    color: #000;
                    padding: 8px 12px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                ">
                    <span>🔍 Widget Debug Console</span>
                    <div style="display: flex; gap: 8px;">
                        <button id="debug-copy" style="
                            background: #000;
                            color: #00ff00;
                            border: 1px solid #00ff00;
                            padding: 2px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 10px;
                        " title="Copy debug info to clipboard">📋</button>
                        <button id="debug-toggle" style="
                            background: #000;
                            color: #00ff00;
                            border: 1px solid #00ff00;
                            padding: 2px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 10px;
                        ">_</button>
                        <button id="debug-close" style="
                            background: #ff0000;
                            color: #fff;
                            border: none;
                            padding: 2px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 10px;
                        ">✕</button>
                    </div>
                </div>

                <!-- Content -->
                <div id="debug-content" style="
                    padding: 12px;
                    overflow-y: auto;
                    max-height: 540px;
                ">
                    <div id="debug-screen-info" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #00ff00;">
                        <div style="color: #ffff00; margin-bottom: 4px;">📱 Screen Info:</div>
                    </div>

                    <div id="debug-container-info" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #00ff00;">
                        <div style="color: #ffff00; margin-bottom: 4px;">📦 Container (.admin-right-widgets):</div>
                    </div>

                    <div id="debug-widgets-info" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #00ff00;">
                        <div style="color: #ffff00; margin-bottom: 4px;">🎴 Widget Cards:</div>
                    </div>

                    <div id="debug-issues" style="margin-bottom: 12px;">
                        <div style="color: #ff6b6b; margin-bottom: 4px;">⚠️ Detected Issues:</div>
                        <div id="debug-issues-list"></div>
                    </div>

                    <div id="debug-suggestions" style="margin-bottom: 12px;">
                        <div style="color: #51cf66; margin-bottom: 4px;">💡 Suggestions:</div>
                        <div id="debug-suggestions-list"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', consoleHTML);
    }

    attachEventListeners() {
        const consoleEl = document.getElementById('debug-console');
        const header = document.getElementById('debug-header');
        const copyBtn = document.getElementById('debug-copy');
        const toggleBtn = document.getElementById('debug-toggle');
        const closeBtn = document.getElementById('debug-close');
        const content = document.getElementById('debug-content');

        // Copy button
        copyBtn.addEventListener('click', () => {
            this.copyDebugInfo(copyBtn);
        });

        // Draggable
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

        // Toggle minimize
        toggleBtn.addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            content.style.display = this.isMinimized ? 'none' : 'block';
            toggleBtn.textContent = this.isMinimized ? '□' : '_';
        });

        // Close
        closeBtn.addEventListener('click', () => {
            consoleEl.remove();
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
        });
    }

    startMonitoring() {
        this.updateDebugInfo();

        // Update every 500ms
        this.updateInterval = setInterval(() => {
            this.updateDebugInfo();
        }, 500);

        // Also update on resize
        window.addEventListener('resize', () => {
            this.updateDebugInfo();
        });
    }

    updateDebugInfo() {
        this.updateScreenInfo();
        this.updateContainerInfo();
        this.updateWidgetsInfo();
        this.detectIssues();
    }

    updateScreenInfo() {
        const screenInfo = document.getElementById('debug-screen-info');
        const width = window.innerWidth;
        const height = window.innerHeight;

        let breakpoint = '';
        if (width > 1024) breakpoint = 'Desktop (>1024px)';
        else if (width > 768) breakpoint = 'Tablet Landscape (≤1024px)';
        else if (width > 640) breakpoint = 'Tablet Portrait (≤768px)';
        else breakpoint = 'Mobile (≤640px)';

        screenInfo.innerHTML = `
            <div style="color: #ffff00; margin-bottom: 4px;">📱 Screen Info:</div>
            <div>Width: <span style="color: #51cf66;">${width}px</span></div>
            <div>Height: <span style="color: #51cf66;">${height}px</span></div>
            <div>Breakpoint: <span style="color: #ffd43b;">${breakpoint}</span></div>
        `;
    }

    updateContainerInfo() {
        const containerInfo = document.getElementById('debug-container-info');
        const container = document.querySelector('.admin-right-widgets');

        if (!container) {
            containerInfo.innerHTML = `
                <div style="color: #ffff00; margin-bottom: 4px;">📦 Container (.admin-right-widgets):</div>
                <div style="color: #ff6b6b;">❌ Container not found!</div>
            `;
            return;
        }

        const computed = window.getComputedStyle(container);
        const rect = container.getBoundingClientRect();

        containerInfo.innerHTML = `
            <div style="color: #ffff00; margin-bottom: 4px;">📦 Container (.admin-right-widgets):</div>
            <div>Display: <span style="color: #51cf66;">${computed.display}</span></div>
            <div>Grid Template Columns: <span style="color: #51cf66;">${computed.gridTemplateColumns}</span></div>
            <div>Gap: <span style="color: #51cf66;">${computed.gap}</span></div>
            <div>Width: <span style="color: #51cf66;">${rect.width.toFixed(2)}px</span></div>
            <div>Position: <span style="color: #51cf66;">${computed.position}</span></div>
            <div>Margin Top: <span style="color: #51cf66;">${computed.marginTop}</span></div>
            <div>Padding: <span style="color: #51cf66;">${computed.padding}</span></div>
        `;
    }

    updateWidgetsInfo() {
        const widgetsInfo = document.getElementById('debug-widgets-info');
        const widgets = document.querySelectorAll('.admin-right-widgets > *');

        if (widgets.length === 0) {
            widgetsInfo.innerHTML = `
                <div style="color: #ffff00; margin-bottom: 4px;">🎴 Widget Cards:</div>
                <div style="color: #ff6b6b;">❌ No widgets found!</div>
            `;
            return;
        }

        let widgetsHTML = `<div style="color: #ffff00; margin-bottom: 4px;">🎴 Widget Cards (${widgets.length} total):</div>`;

        widgets.forEach((widget, index) => {
            const computed = window.getComputedStyle(widget);
            const rect = widget.getBoundingClientRect();

            widgetsHTML += `
                <div style="margin: 8px 0; padding: 6px; background: rgba(0, 255, 0, 0.1); border-left: 2px solid #00ff00;">
                    <div style="color: #ffd43b;">Card ${index + 1}:</div>
                    <div style="margin-left: 8px;">
                        <div>Width: <span style="color: #51cf66;">${rect.width.toFixed(2)}px</span></div>
                        <div>Max-Width: <span style="color: #51cf66;">${computed.maxWidth}</span></div>
                        <div>Min-Width: <span style="color: #51cf66;">${computed.minWidth}</span></div>
                        <div>Padding: <span style="color: #51cf66;">${computed.padding}</span></div>
                        <div>Margin: <span style="color: #51cf66;">${computed.margin}</span></div>
                        <div>Box-Sizing: <span style="color: #51cf66;">${computed.boxSizing}</span></div>
                        <div>Flex: <span style="color: #51cf66;">${computed.flex}</span></div>
                    </div>
                </div>
            `;
        });

        widgetsInfo.innerHTML = widgetsHTML;
    }

    copyDebugInfo(button) {
        const container = document.querySelector('.admin-right-widgets');
        const widgets = document.querySelectorAll('.admin-right-widgets > *');

        let debugText = '═══════════════════════════════════════\n';
        debugText += '   WIDGET DEBUG CONSOLE - REPORT\n';
        debugText += '═══════════════════════════════════════\n\n';

        // Screen Info
        debugText += '📱 SCREEN INFORMATION\n';
        debugText += '─────────────────────────────────────\n';
        debugText += `Width: ${window.innerWidth}px\n`;
        debugText += `Height: ${window.innerHeight}px\n`;

        let breakpoint = '';
        if (window.innerWidth > 1024) breakpoint = 'Desktop (>1024px)';
        else if (window.innerWidth > 768) breakpoint = 'Tablet Landscape (≤1024px)';
        else if (window.innerWidth > 640) breakpoint = 'Tablet Portrait (≤768px)';
        else breakpoint = 'Mobile (≤640px)';
        debugText += `Breakpoint: ${breakpoint}\n\n`;

        // Container Info
        if (container) {
            const computed = window.getComputedStyle(container);
            const rect = container.getBoundingClientRect();

            debugText += '📦 CONTAINER (.admin-right-widgets)\n';
            debugText += '─────────────────────────────────────\n';
            debugText += `Display: ${computed.display}\n`;
            debugText += `Grid Template Columns: ${computed.gridTemplateColumns}\n`;
            debugText += `Gap: ${computed.gap}\n`;
            debugText += `Width: ${rect.width.toFixed(2)}px\n`;
            debugText += `Position: ${computed.position}\n`;
            debugText += `Margin Top: ${computed.marginTop}\n`;
            debugText += `Padding: ${computed.padding}\n`;

            // Check for inline styles
            if (container.hasAttribute('style')) {
                debugText += `⚠️ Inline Style: ${container.getAttribute('style')}\n`;
            }
            debugText += '\n';
        } else {
            debugText += '📦 CONTAINER (.admin-right-widgets)\n';
            debugText += '─────────────────────────────────────\n';
            debugText += '❌ Container not found!\n\n';
        }

        // Widget Cards Info
        debugText += `🎴 WIDGET CARDS (${widgets.length} total)\n`;
        debugText += '─────────────────────────────────────\n';

        if (widgets.length === 0) {
            debugText += '❌ No widgets found!\n\n';
        } else {
            widgets.forEach((widget, index) => {
                const computed = window.getComputedStyle(widget);
                const rect = widget.getBoundingClientRect();

                debugText += `\nCard ${index + 1}:\n`;
                debugText += `  Width: ${rect.width.toFixed(2)}px\n`;
                debugText += `  Max-Width: ${computed.maxWidth}\n`;
                debugText += `  Min-Width: ${computed.minWidth}\n`;
                debugText += `  Padding: ${computed.padding}\n`;
                debugText += `  Margin: ${computed.margin}\n`;
                debugText += `  Box-Sizing: ${computed.boxSizing}\n`;
                debugText += `  Flex: ${computed.flex}\n`;

                if (widget.hasAttribute('style')) {
                    debugText += `  ⚠️ Inline Style: ${widget.getAttribute('style')}\n`;
                }
            });
            debugText += '\n';
        }

        // Issues
        const issues = this.getIssuesList();
        debugText += '⚠️ DETECTED ISSUES\n';
        debugText += '─────────────────────────────────────\n';
        if (issues.length === 0) {
            debugText += '✅ No issues detected!\n\n';
        } else {
            issues.forEach(issue => {
                debugText += `• ${issue}\n`;
            });
            debugText += '\n';
        }

        // Suggestions
        const suggestions = this.getSuggestionsList();
        debugText += '💡 SUGGESTIONS\n';
        debugText += '─────────────────────────────────────\n';
        if (suggestions.length === 0) {
            debugText += '✅ All good!\n\n';
        } else {
            suggestions.forEach(suggestion => {
                debugText += `→ ${suggestion}\n`;
            });
            debugText += '\n';
        }

        debugText += '═══════════════════════════════════════\n';
        debugText += `Generated: ${new Date().toLocaleString()}\n`;
        debugText += '═══════════════════════════════════════\n';

        // Copy to clipboard
        navigator.clipboard.writeText(debugText).then(() => {
            // Success feedback
            const originalText = button.textContent;
            button.textContent = '✓';
            button.style.background = '#51cf66';
            button.style.color = '#000';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '#000';
                button.style.color = '#00ff00';
            }, 1500);

            console.log('✅ Debug info copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard. Check console.');
        });
    }

    getIssuesList() {
        const issues = [];
        const container = document.querySelector('.admin-right-widgets');
        const widgets = document.querySelectorAll('.admin-right-widgets > *');

        if (!container) {
            issues.push('Container .admin-right-widgets not found');
            return issues;
        }

        const computed = window.getComputedStyle(container);
        const rect = container.getBoundingClientRect();

        // Check if display is grid
        if (computed.display !== 'grid' && window.innerWidth <= 1024) {
            issues.push('Display is not set to grid on tablet/mobile');
        }

        // Check grid template columns
        if (computed.gridTemplateColumns === 'none' && window.innerWidth <= 1024) {
            issues.push('Grid template columns not defined');
        }

        // Check width
        if (rect.width < window.innerWidth * 0.8 && window.innerWidth <= 1024) {
            issues.push(`Container width (${rect.width.toFixed(0)}px) is less than 80% of screen width`);
        }

        // Check for inline styles overriding
        if (container.hasAttribute('style')) {
            const inlineStyle = container.getAttribute('style');
            if (inlineStyle.includes('width') && !inlineStyle.includes('width: 100%')) {
                issues.push('Inline width style may be overriding responsive CSS');
            }
        }

        // Check widgets
        if (widgets.length > 0) {
            widgets.forEach((widget, index) => {
                const wComputed = window.getComputedStyle(widget);

                // Check if widget has max-width constraint
                if (wComputed.maxWidth !== 'none' && wComputed.maxWidth !== '100%') {
                    issues.push(`Card ${index + 1} has max-width: ${wComputed.maxWidth}`);
                }

                // Check if widget has fixed width
                if (wComputed.width !== 'auto' && !wComputed.width.includes('%')) {
                    const widthPx = parseFloat(wComputed.width);
                    if (widthPx < rect.width * 0.4 && window.innerWidth <= 1024) {
                        issues.push(`Card ${index + 1} width (${widthPx.toFixed(0)}px) seems too narrow`);
                    }
                }

                // Check for margin-bottom on widgets
                if (parseFloat(wComputed.marginBottom) > 0) {
                    issues.push(`Card ${index + 1} has margin-bottom: ${wComputed.marginBottom}`);
                }
            });
        }

        return issues;
    }

    getSuggestionsList() {
        const suggestions = [];
        const issues = this.getIssuesList();

        issues.forEach(issue => {
            if (issue.includes('Display is not set to grid')) {
                suggestions.push('Add: display: grid !important;');
            }
            if (issue.includes('Grid template columns not defined')) {
                suggestions.push('Add grid-template-columns property');
            }
            if (issue.includes('Container width') && issue.includes('less than 80%')) {
                suggestions.push('Set width: 100% !important;');
            }
            if (issue.includes('Inline width style')) {
                suggestions.push('Remove inline width or set to 100%');
            }
            if (issue.includes('has max-width')) {
                const cardNum = issue.match(/Card (\d+)/)?.[1];
                suggestions.push(`Remove max-width on card ${cardNum} or set to none`);
            }
            if (issue.includes('seems too narrow')) {
                suggestions.push('Check for width constraints on cards');
            }
            if (issue.includes('margin-bottom')) {
                suggestions.push('Set margin-bottom: 0 !important; on cards');
            }
        });

        return [...new Set(suggestions)]; // Remove duplicates
    }

    detectIssues() {
        const issuesList = document.getElementById('debug-issues-list');
        const suggestionsList = document.getElementById('debug-suggestions-list');
        const issues = this.getIssuesList();
        const suggestions = this.getSuggestionsList();

        const container = document.querySelector('.admin-right-widgets');
        const widgets = document.querySelectorAll('.admin-right-widgets > *');

        if (!container) {
            issues.push('Container .admin-right-widgets not found');
        } else {
            const computed = window.getComputedStyle(container);
            const rect = container.getBoundingClientRect();

            // Check if display is grid
            if (computed.display !== 'grid' && window.innerWidth <= 1024) {
                issues.push('Display is not set to grid on tablet/mobile');
                suggestions.push('Add: display: grid !important;');
            }

            // Check grid template columns
            if (computed.gridTemplateColumns === 'none' && window.innerWidth <= 1024) {
                issues.push('Grid template columns not defined');
                suggestions.push('Add grid-template-columns property');
            }

            // Check width
            if (rect.width < window.innerWidth * 0.8 && window.innerWidth <= 1024) {
                issues.push(`Container width (${rect.width.toFixed(0)}px) is less than 80% of screen width`);
                suggestions.push('Set width: 100% !important;');
            }

        }

        // Display issues
        if (issues.length === 0) {
            issuesList.innerHTML = '<div style="color: #51cf66;">✅ No issues detected!</div>';
        } else {
            issuesList.innerHTML = issues.map(issue =>
                `<div style="margin: 4px 0; padding-left: 8px; border-left: 2px solid #ff6b6b;">• ${issue}</div>`
            ).join('');
        }

        // Display suggestions
        if (suggestions.length === 0) {
            suggestionsList.innerHTML = '<div style="color: #51cf66;">✅ All good!</div>';
        } else {
            suggestionsList.innerHTML = suggestions.map(suggestion =>
                `<div style="margin: 4px 0; padding-left: 8px; border-left: 2px solid #51cf66;">→ ${suggestion}</div>`
            ).join('');
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.debugConsole = new DebugConsole();
    });
} else {
    window.debugConsole = new DebugConsole();
}

console.log('🔍 Debug Console loaded! Check bottom-right corner.');
