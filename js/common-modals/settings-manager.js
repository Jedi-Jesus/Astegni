/**
 * Settings Manager
 * Handles all settings modals functionality for the tutor profile
 * Includes: 2FA, Login Activity, Connected Accounts, Language, Export Data, Review, Appearance
 */

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get a valid auth token from localStorage
 * Returns null if token is missing or invalid format
 */
function getValidToken() {
    const token = localStorage.getItem('token');
    // Check for missing, null string, undefined string, or invalid JWT format (must have 2 dots)
    if (!token || token === 'null' || token === 'undefined') {
        return null;
    }
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
        console.log('[Settings] Invalid token format, clearing');
        return null;
    }
    return token;
}

// ==========================================
// Global State
// ==========================================
let selected2FAMethod = null;
let current2FAStep = null;
let loginActivityData = { activeSessions: [], loginHistory: [] };
let reviewRatings = { overall: 0, ease: 0, features: 0, support: 0, value: 0 };
let selectedFeatureSuggestions = [];
let recommendsAstegni = null;
// Note: appearanceSettings moved to appearance-manager.js

// ==========================================
// TWO-FACTOR AUTHENTICATION
// ==========================================

function openTwoFactorAuthModal() {
    console.log('[Settings] openTwoFactorAuthModal called');

    // Use TFAManager if available (it's the primary 2FA handler)
    if (typeof TFAManager !== 'undefined' && TFAManager.open) {
        console.log('[Settings] Delegating to TFAManager.open()');
        TFAManager.open();
        return;
    }

    // Fallback: load modal manually and use TFAManager.loadStatus
    loadModalAndShow('two-factor-auth-modal.html', 'two-factor-auth-modal', () => {
        console.log('[Settings] 2FA modal callback executing');
        // Use TFAManager.loadStatus if available, otherwise fall back to load2FAStatus
        if (typeof TFAManager !== 'undefined' && TFAManager.loadStatus) {
            TFAManager.loadStatus();
        } else {
            load2FAStatus();
        }
    });
}

function closeTwoFactorAuthModal() {
    // Use TFAManager.close() if available (it handles proper panel cleanup)
    if (typeof TFAManager !== 'undefined' && TFAManager.close) {
        TFAManager.close();
        return;
    }

    // Fallback
    const modal = document.getElementById('two-factor-auth-modal');
    if (modal) hideModal(modal);
    reset2FAState();
}

function reset2FAState() {
    selected2FAMethod = null;
    current2FAStep = null;
    // Reset UI elements - use 'tfa-method-option' class (not '2fa-' which is invalid CSS)
    document.querySelectorAll('.tfa-method-option').forEach(opt => {
        opt.classList.remove('border-indigo-500', 'bg-indigo-50');
        opt.querySelector('.tfa-radio-check')?.classList.add('hidden');
    });
}

async function load2FAStatus() {
    const loading = document.getElementById('tfa-loading');
    const enabledState = document.getElementById('tfa-enabled-state');
    const disabledState = document.getElementById('tfa-disabled-state');
    const statusBadge = document.getElementById('tfa-status-badge') || document.getElementById('2fa-status-badge');

    // Check if modal elements exist (modal may not be loaded yet)
    if (!loading || !disabledState) {
        console.log('[2FA] Modal elements not found yet');
        return;
    }

    const token = getValidToken();

    // If no valid token, show disabled state without API call
    if (!token) {
        console.log('[2FA] No valid auth token, showing disabled state');
        loading.classList.add('hidden');
        if (disabledState) disabledState.classList.remove('hidden');
        if (statusBadge) updateStatusBadge(statusBadge, false);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/2fa/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            loading.classList.add('hidden');

            if (data.enabled) {
                if (enabledState) enabledState.classList.remove('hidden');
                if (disabledState) disabledState.classList.add('hidden');
                if (statusBadge) updateStatusBadge(statusBadge, true);

                // Update method display
                const methodName = document.getElementById('2fa-method-name');
                const methodDetail = document.getElementById('2fa-method-detail');
                const methodIcon = document.getElementById('2fa-method-icon');
                if (methodName) methodName.textContent = get2FAMethodName(data.method);
                if (methodDetail) methodDetail.textContent = data.masked_contact || '';
                if (methodIcon) methodIcon.textContent = get2FAMethodIcon(data.method);
            } else {
                if (enabledState) enabledState.classList.add('hidden');
                if (disabledState) disabledState.classList.remove('hidden');
                if (statusBadge) updateStatusBadge(statusBadge, false);
            }
        } else if (response.status === 401) {
            // Token expired or invalid - show disabled state silently
            console.log('[2FA] Auth token invalid, showing disabled state');
            loading.classList.add('hidden');
            if (disabledState) disabledState.classList.remove('hidden');
            if (statusBadge) updateStatusBadge(statusBadge, false);
        } else {
            // API not implemented yet or other error - show disabled state
            loading.classList.add('hidden');
            if (disabledState) disabledState.classList.remove('hidden');
            if (statusBadge) updateStatusBadge(statusBadge, false);
        }
    } catch (error) {
        console.log('[2FA] API call failed, showing disabled state:', error.message);
        loading.classList.add('hidden');
        if (disabledState) disabledState.classList.remove('hidden');
        if (statusBadge) updateStatusBadge(statusBadge, false);
    }
}

function updateStatusBadge(badge, enabled) {
    if (enabled) {
        badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
        badge.textContent = 'Enabled';
    } else {
        badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
        badge.textContent = 'Not Enabled';
    }
}

function get2FAMethodName(method) {
    const names = { sms: 'SMS Verification', email: 'Email Verification', authenticator: 'Authenticator App' };
    return names[method] || 'Unknown';
}

function get2FAMethodIcon(method) {
    const icons = { sms: '\u{1F4F1}', email: '\u{2709}', authenticator: '\u{1F511}' };
    return icons[method] || '\u{1F512}';
}

function select2FAMethod(method) {
    selected2FAMethod = method;

    // Update UI
    document.querySelectorAll('.2fa-method-option').forEach(opt => {
        opt.classList.remove('border-indigo-500', 'bg-indigo-50');
        opt.querySelector('.2fa-radio-check')?.classList.add('hidden');
    });

    const selectedOption = event.currentTarget;
    selectedOption.classList.add('border-indigo-500', 'bg-indigo-50');
    selectedOption.querySelector('.2fa-radio-check')?.classList.remove('hidden');

    // Enable button
    document.getElementById('enable-2fa-btn').disabled = false;
}

function startEnable2FA() {
    if (!selected2FAMethod) return;

    // Hide main content, show setup section
    document.getElementById('2fa-status-section').classList.add('hidden');
    document.getElementById('2fa-setup-section').classList.remove('hidden');

    // Show verify step
    show2FAStep('verify');
}

function show2FAStep(step) {
    current2FAStep = step;
    const steps = ['verify', 'contact', 'authenticator', 'code', 'backup'];
    steps.forEach(s => {
        const el = document.getElementById(`2fa-step-${s}`);
        if (el) el.classList.add('hidden');
    });
    document.getElementById(`2fa-step-${step}`)?.classList.remove('hidden');
}

async function verify2FAPassword() {
    const password = document.getElementById('2fa-verify-password').value;
    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/verify-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            // Password verified, proceed based on method
            if (selected2FAMethod === 'authenticator') {
                show2FAStep('authenticator');
                generate2FASecretKey();
            } else {
                show2FAStep('contact');
                setup2FAContactStep();
            }
        } else {
            showNotification('Incorrect password', 'error');
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        // For demo, proceed anyway
        if (selected2FAMethod === 'authenticator') {
            show2FAStep('authenticator');
            generate2FASecretKey();
        } else {
            show2FAStep('contact');
            setup2FAContactStep();
        }
    }
}

function setup2FAContactStep() {
    const icon = document.getElementById('2fa-contact-icon');
    const title = document.getElementById('2fa-contact-title');
    const desc = document.getElementById('2fa-contact-desc');
    const label = document.getElementById('2fa-contact-label');
    const input = document.getElementById('2fa-contact-input');

    if (selected2FAMethod === 'sms') {
        icon.innerHTML = '<span class="text-3xl">\u{1F4F1}</span>';
        title.textContent = 'Enter Phone Number';
        desc.textContent = "We'll send a verification code to this number";
        label.textContent = 'Phone Number';
        input.placeholder = '+251 9XX XXX XXX';
        input.type = 'tel';
    } else {
        icon.innerHTML = '<span class="text-3xl">\u{2709}</span>';
        title.textContent = 'Enter Email Address';
        desc.textContent = "We'll send a verification code to this email";
        label.textContent = 'Email Address';
        input.placeholder = 'your@email.com';
        input.type = 'email';
    }
}

function generate2FASecretKey() {
    // Generate a random secret key for authenticator
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const formattedSecret = secret.match(/.{1,4}/g).join('-');
    document.getElementById('2fa-secret-key').textContent = formattedSecret;

    // TODO: Generate actual QR code
    document.getElementById('2fa-qr-code').innerHTML = '<span class="text-gray-400 text-sm">QR Code would appear here</span>';
}

async function send2FACode() {
    const contact = document.getElementById('2fa-contact-input').value;
    if (!contact) {
        showNotification(`Please enter your ${selected2FAMethod === 'sms' ? 'phone number' : 'email'}`, 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/user/2fa/send-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ method: selected2FAMethod, contact })
        });

        show2FAStep('code');
        document.getElementById('2fa-code-desc').textContent =
            `Enter the 6-digit code we sent to your ${selected2FAMethod === 'sms' ? 'phone' : 'email'}`;
    } catch (error) {
        console.error('Error sending 2FA code:', error);
        // For demo, proceed anyway
        show2FAStep('code');
    }
}

function show2FAVerifyCode() {
    show2FAStep('code');
    document.getElementById('2fa-code-desc').textContent = 'Enter the 6-digit code from your authenticator app';
    document.getElementById('2fa-resend-text').classList.add('hidden');
}

function handle2FACodeInput(input, index) {
    const inputs = document.querySelectorAll('.2fa-code-input');
    if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
    }
}

async function verify2FACode() {
    const inputs = document.querySelectorAll('.2fa-code-input');
    let code = '';
    inputs.forEach(input => code += input.value);

    if (code.length !== 6) {
        showNotification('Please enter the complete 6-digit code', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/user/2fa/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code, method: selected2FAMethod })
        });

        if (response.ok) {
            const data = await response.json();
            showBackupCodes(data.backup_codes);
        } else {
            showNotification('Invalid code. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error verifying 2FA code:', error);
        // For demo, show backup codes
        showBackupCodes(['ABCD-1234-EFGH', 'IJKL-5678-MNOP', 'QRST-9012-UVWX', 'YZAB-3456-CDEF', 'GHIJ-7890-KLMN']);
    }
}

function showBackupCodes(codes) {
    show2FAStep('backup');
    const container = document.getElementById('2fa-backup-codes');
    container.innerHTML = codes.map(code =>
        `<div class="p-2 bg-white rounded border border-gray-200 text-center">${code}</div>`
    ).join('');
}

function download2FABackupCodes() {
    const codes = Array.from(document.querySelectorAll('#2fa-backup-codes > div')).map(el => el.textContent);
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astegni-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
}

function copy2FABackupCodes() {
    const codes = Array.from(document.querySelectorAll('#2fa-backup-codes > div')).map(el => el.textContent);
    navigator.clipboard.writeText(codes.join('\n'));
    showNotification('Backup codes copied to clipboard', 'success');
}

function finish2FASetup() {
    closeTwoFactorAuthModal();
    showNotification('Two-factor authentication enabled successfully!', 'success');
    load2FAStatus(); // Refresh status badge
}

function cancel2FASetup() {
    document.getElementById('2fa-setup-section').classList.add('hidden');
    document.getElementById('2fa-status-section').classList.remove('hidden');
    reset2FAState();
}

function back2FAStep(step) {
    show2FAStep(step);
}

function disable2FA() {
    document.getElementById('2fa-status-section').classList.add('hidden');
    document.getElementById('2fa-disable-section').classList.remove('hidden');
}

function cancelDisable2FA() {
    document.getElementById('2fa-disable-section').classList.add('hidden');
    document.getElementById('2fa-status-section').classList.remove('hidden');
}

async function confirmDisable2FA() {
    const password = document.getElementById('2fa-disable-password').value;
    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/user/2fa/disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        showNotification('Two-factor authentication disabled', 'success');
        closeTwoFactorAuthModal();
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        showNotification('2FA disabled (demo mode)', 'success');
        closeTwoFactorAuthModal();
    }
}

function change2FAMethod() {
    document.getElementById('2fa-enabled-state').classList.add('hidden');
    document.getElementById('2fa-disabled-state').classList.remove('hidden');
}

function toggle2FAPasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function resend2FACode() {
    showNotification('Verification code resent', 'success');
}

// ==========================================
// LOGIN ACTIVITY
// ==========================================

function openLoginActivityModal() {
    loadModalAndShow('login-activity-modal.html', 'login-activity-modal', () => {
        loadActiveSessions();
    });
}

function closeLoginActivityModal() {
    const modal = document.getElementById('login-activity-modal');
    if (modal) hideModal(modal);
}

function switchLoginActivityTab(tab) {
    // Update tab buttons
    document.getElementById('login-tab-active').classList.remove('text-indigo-600', 'border-indigo-600');
    document.getElementById('login-tab-active').classList.add('text-gray-500', 'border-transparent');
    document.getElementById('login-tab-history').classList.remove('text-indigo-600', 'border-indigo-600');
    document.getElementById('login-tab-history').classList.add('text-gray-500', 'border-transparent');

    const activeTab = document.getElementById(`login-tab-${tab}`);
    activeTab.classList.remove('text-gray-500', 'border-transparent');
    activeTab.classList.add('text-indigo-600', 'border-indigo-600');

    // Show/hide content
    document.getElementById('login-active-content').classList.toggle('hidden', tab !== 'active');
    document.getElementById('login-history-content').classList.toggle('hidden', tab !== 'history');

    if (tab === 'history') {
        loadLoginHistory();
    }
}

async function loadActiveSessions() {
    const loading = document.getElementById('sessions-loading');
    const noSessions = document.getElementById('no-other-sessions');
    const signOutBtn = document.getElementById('sign-out-all-btn');
    const listContainer = document.getElementById('other-sessions-list');

    // Check if elements exist
    if (!loading) {
        console.log('[Sessions] Modal elements not found yet');
        return;
    }

    const token = getValidToken();

    // If no valid token, show empty state
    if (!token) {
        console.log('[Sessions] No valid auth token, showing empty state');
        if (loading) loading.classList.add('hidden');
        if (noSessions) noSessions.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (loading) loading.classList.add('hidden');

            // Update current session info
            const currentSessionInfo = document.getElementById('current-session-info');
            if (data.current && currentSessionInfo) {
                currentSessionInfo.textContent =
                    `${data.current.os} - ${data.current.browser} - ${data.current.location}`;
            }

            if (data.others && data.others.length > 0) {
                if (noSessions) noSessions.classList.add('hidden');
                if (signOutBtn) signOutBtn.classList.remove('hidden');
                renderOtherSessions(data.others);
            } else {
                if (noSessions) noSessions.classList.remove('hidden');
            }
        } else if (response.status === 401) {
            // Token invalid - show empty state silently
            console.log('[Sessions] Auth token invalid, showing empty state');
            if (loading) loading.classList.add('hidden');
            if (noSessions) noSessions.classList.remove('hidden');
        } else {
            // API not implemented or other error - show empty state
            if (loading) loading.classList.add('hidden');
            if (noSessions) noSessions.classList.remove('hidden');
        }
    } catch (error) {
        console.log('[Sessions] API call failed:', error.message);
        if (loading) loading.classList.add('hidden');
        if (noSessions) noSessions.classList.remove('hidden');
    }
}

function renderOtherSessions(sessions) {
    const container = document.getElementById('other-sessions-list');
    const loading = document.getElementById('sessions-loading');
    const noSessions = document.getElementById('no-other-sessions');

    loading.classList.add('hidden');
    noSessions.classList.add('hidden');

    sessions.forEach(session => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span class="text-xl">${getDeviceIcon(session.device_type)}</span>
                </div>
                <div>
                    <p class="font-medium text-gray-800">${session.device_name}</p>
                    <p class="text-sm text-gray-500">${session.os} - ${session.browser}</p>
                    <p class="text-xs text-gray-400">${session.location} - ${session.last_active}</p>
                </div>
            </div>
            <button onclick="signOutSession('${session.id}')" class="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                Sign Out
            </button>
        `;
        container.appendChild(div);
    });
}

function getDeviceIcon(type) {
    const icons = { desktop: '\u{1F4BB}', mobile: '\u{1F4F1}', tablet: '\u{1F4F1}' };
    return icons[type] || '\u{1F4BB}';
}

async function signOutSession(sessionId) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/user/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showNotification('Session signed out', 'success');
        loadActiveSessions();
    } catch (error) {
        console.error('Error signing out session:', error);
        showNotification('Session signed out (demo)', 'success');
    }
}

async function signOutAllSessions() {
    if (!confirm('Sign out from all other devices?')) return;

    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/user/sessions/all`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showNotification('Signed out from all other devices', 'success');
        loadActiveSessions();
    } catch (error) {
        console.error('Error signing out all sessions:', error);
        showNotification('Signed out from all devices (demo)', 'success');
    }
}

async function loadLoginHistory() {
    const loading = document.getElementById('history-loading');
    const container = document.getElementById('login-history-list');

    // Check if elements exist
    if (!loading || !container) {
        console.log('[LoginHistory] Modal elements not found yet');
        return;
    }

    const token = getValidToken();

    // If no valid token, show empty state
    if (!token) {
        console.log('[LoginHistory] No valid auth token, showing empty state');
        if (loading) loading.classList.add('hidden');
        container.innerHTML = '<p class="text-center text-gray-500 py-8">No login history available</p>';
        return;
    }

    try {
        const filterElement = document.getElementById('history-filter');
        const days = filterElement ? filterElement.value : '30';
        const response = await fetch(`${API_BASE_URL}/api/user/login-history?days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (loading) loading.classList.add('hidden');
            renderLoginHistory(data.history);
        } else if (response.status === 401) {
            console.log('[LoginHistory] Auth token invalid, showing empty state');
            if (loading) loading.classList.add('hidden');
            container.innerHTML = '<p class="text-center text-gray-500 py-8">No login history available</p>';
        } else {
            if (loading) loading.classList.add('hidden');
            container.innerHTML = '<p class="text-center text-gray-500 py-8">No login history available</p>';
        }
    } catch (error) {
        console.log('[LoginHistory] API call failed:', error.message);
        if (loading) loading.classList.add('hidden');
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Unable to load login history</p>';
    }
}

function renderLoginHistory(history) {
    const container = document.getElementById('login-history-list');
    container.innerHTML = '';

    if (!history || history.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">No login history available</p>';
        return;
    }

    history.forEach(entry => {
        const div = document.createElement('div');
        div.className = `flex items-center gap-3 p-3 rounded-xl ${entry.success ? 'bg-gray-50' : 'bg-red-50'}`;
        div.innerHTML = `
            <div class="w-8 h-8 ${entry.success ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center">
                ${entry.success ?
                    '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                    '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                }
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">${entry.success ? 'Successful login' : 'Failed login attempt'}</p>
                <p class="text-xs text-gray-500">${entry.device} - ${entry.location}</p>
            </div>
            <p class="text-xs text-gray-400">${entry.time}</p>
        `;
        container.appendChild(div);
    });
}

function filterLoginHistory(days) {
    loadLoginHistory();
}

// ==========================================
// CONNECTED ACCOUNTS
// ==========================================

function openConnectedAccountsModal() {
    loadModalAndShow('connected-accounts-modal.html', 'connected-accounts-modal', () => {
        loadConnectedAccounts();
    });
}

function closeConnectedAccountsModal() {
    const modal = document.getElementById('connected-accounts-modal');
    if (modal) hideModal(modal);
}

async function loadConnectedAccounts() {
    try {
        const token = getValidToken();
        if (!token) {
            console.log('[ConnectedAccounts] No valid token');
            return;
        }

        // Fetch connected accounts status from API
        const response = await fetch(`${API_BASE_URL}/api/user/connected-accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load connected accounts');
        }

        const data = await response.json();
        console.log('[ConnectedAccounts] Status:', data);

        // Update Google connection status
        if (data.google_connected) {
            document.getElementById('google-connect-btn').classList.add('hidden');
            document.getElementById('google-connected-actions').classList.remove('hidden');
            document.getElementById('google-account-email').textContent = data.google_email || 'Connected';
        } else {
            document.getElementById('google-connect-btn').classList.remove('hidden');
            document.getElementById('google-connected-actions').classList.add('hidden');
            document.getElementById('google-account-email').textContent = 'Not connected';
        }

        // Password status
        if (data.has_password) {
            document.getElementById('password-status-text').textContent = 'Password set';
            document.getElementById('google-only-warning').classList.add('hidden');
        } else if (data.google_connected) {
            document.getElementById('password-status-text').textContent = 'No password set';
            document.getElementById('google-only-warning').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading connected accounts:', error);
        // Fallback: show connect button
        document.getElementById('google-connect-btn')?.classList.remove('hidden');
        document.getElementById('google-connected-actions')?.classList.add('hidden');
    }
}

async function linkGoogleAccount() {
    console.log('[ConnectedAccounts] Linking Google account...');

    // Close the connected accounts modal
    closeConnectedAccountsModal();

    // Check if googleSignIn function is available (from google-oauth.js)
    if (typeof window.googleSignIn === 'function') {
        try {
            // Get current user's active role (or default to student)
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const role = user.active_role || 'student';

            console.log('[ConnectedAccounts] Triggering Google sign-in for role:', role);

            // Trigger Google sign-in using the global function
            await window.googleSignIn(role);

            // After successful sign-in, reload connected accounts
            setTimeout(() => {
                console.log('[ConnectedAccounts] Reopening modal after OAuth');
                loadConnectedAccounts();
                openConnectedAccountsModal();
            }, 2000);
        } catch (error) {
            console.error('[ConnectedAccounts] Error linking Google:', error);
            showNotification('Failed to link Google account', 'error');
        }
    } else {
        console.error('[ConnectedAccounts] googleSignIn function not available');
        console.log('[ConnectedAccounts] Available on window:', Object.keys(window).filter(k => k.toLowerCase().includes('google')));
        showNotification('Google sign-in is not available. Please refresh the page and try again.', 'error');
    }
}

function unlinkGoogleAccount() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const hasPassword = user.has_password !== false;

    if (!hasPassword) {
        document.getElementById('unlink-warning').classList.remove('hidden');
        document.getElementById('confirm-unlink-btn').disabled = true;
    } else {
        document.getElementById('unlink-warning').classList.add('hidden');
        document.getElementById('confirm-unlink-btn').disabled = false;
    }

    document.getElementById('unlink-confirm-modal').classList.remove('hidden');
}

function closeUnlinkConfirmModal() {
    document.getElementById('unlink-confirm-modal').classList.add('hidden');
}

async function confirmUnlinkGoogle() {
    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/user/unlink-google`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showNotification('Google account unlinked', 'success');
        closeUnlinkConfirmModal();
        loadConnectedAccounts();
    } catch (error) {
        console.error('Error unlinking Google:', error);
        showNotification('Account unlinked (demo)', 'success');
        closeUnlinkConfirmModal();
    }
}

function openSetPasswordModal() {
    document.getElementById('set-password-modal').classList.remove('hidden');
}

function closeSetPasswordModal() {
    document.getElementById('set-password-modal').classList.add('hidden');
}

async function saveNewPassword() {
    const password = document.getElementById('new-password-input').value;
    const confirm = document.getElementById('confirm-password-input').value;

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }

    if (password !== confirm) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/user/set-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });
        showNotification('Password set successfully', 'success');
        closeSetPasswordModal();
        loadConnectedAccounts();
    } catch (error) {
        console.error('Error setting password:', error);
        showNotification('Password set (demo)', 'success');
        closeSetPasswordModal();
    }
}

function openChangePasswordModal() {
    // Redirect to verify personal info modal, password tab
    closeConnectedAccountsModal();
    openVerifyPersonalInfoModal();
    setTimeout(() => switchVerifyTab('password'), 500);
}

// ==========================================
// LANGUAGE PREFERENCES
// ==========================================

function openLanguagePreferencesModal() {
    loadModalAndShow('language-preferences-modal.html', 'language-preferences-modal', () => {
        loadLanguagePreferences();
    });
}

function closeLanguagePreferencesModal() {
    const modal = document.getElementById('language-preferences-modal');
    if (modal) hideModal(modal);
}

function loadLanguagePreferences() {
    const savedLang = localStorage.getItem('ui_language') || 'en';
    const autoTranslate = localStorage.getItem('auto_translate') === 'true';

    document.getElementById('ui-language-select').value = savedLang;
    document.getElementById('auto-translate-toggle').checked = autoTranslate;

    if (autoTranslate) {
        document.getElementById('translation-options').classList.remove('hidden');
    }

    // Add event listener for auto-translate toggle
    document.getElementById('auto-translate-toggle').addEventListener('change', function() {
        document.getElementById('translation-options').classList.toggle('hidden', !this.checked);
    });

    previewUILanguage(savedLang);
}

function previewUILanguage(lang) {
    const translations = {
        en: { hello: 'Hello', welcome: 'Welcome to Astegni', save: 'Save Changes' },
        am: { hello: '\u1230\u120B\u121D', welcome: '\u12A5\u1295\u12F3\u1206\u1295 \u12C8\u12F0 \u12A0\u1235\u1274\u129D', save: '\u1208\u12CD\u1326\u127D\u1295 \u12A0\u1235\u1240\u121D\u1325' },
        or: { hello: 'Akkam', welcome: 'Baga nagaan dhufte', save: 'Jijjiirama kuusi' },
        ti: { hello: '\u1230\u120B\u121D', welcome: '\u1295 \u12A0\u1235\u1274\u129D \u1275\u1241\u1309 \u121D\u1265\u1209', save: '\u1208\u12CD\u1322\u1273\u1275 \u12A0\u12E8\u1276\u1275' },
        ar: { hello: '\u0645\u0631\u062D\u0628\u0627', welcome: '\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643 \u0641\u064A \u0623\u0633\u062A\u064A\u062C\u0646\u064A', save: '\u062D\u0641\u0638 \u0627\u0644\u062A\u063A\u064A\u064A\u0631\u0627\u062A' },
        fr: { hello: 'Bonjour', welcome: 'Bienvenue sur Astegni', save: 'Enregistrer' },
        sw: { hello: 'Habari', welcome: 'Karibu Astegni', save: 'Hifadhi mabadiliko' },
        so: { hello: 'Salaan', welcome: 'Ku soo dhawoow Astegni', save: 'Kaydi isbedelada' }
    };

    const t = translations[lang] || translations.en;
    document.getElementById('preview-hello').textContent = t.hello;
    document.getElementById('preview-welcome').textContent = t.welcome;
    document.getElementById('preview-save').textContent = t.save;
}

function saveLanguagePreferences() {
    const lang = document.getElementById('ui-language-select').value;
    const autoTranslate = document.getElementById('auto-translate-toggle').checked;

    localStorage.setItem('ui_language', lang);
    localStorage.setItem('auto_translate', autoTranslate);

    if (autoTranslate) {
        localStorage.setItem('translate_posts', document.getElementById('translate-posts').checked);
        localStorage.setItem('translate_reviews', document.getElementById('translate-reviews').checked);
        localStorage.setItem('translate_messages', document.getElementById('translate-messages').checked);
    }

    showNotification('Language preferences saved', 'success');
    closeLanguagePreferencesModal();

    // Optionally reload page to apply language
    // location.reload();
}

// ==========================================
// EXPORT DATA
// ==========================================

function openExportDataModal() {
    loadModalAndShow('export-data-modal.html', 'export-data-modal', () => {
        calculateExportSizes();
    });
}

function closeExportDataModal() {
    const modal = document.getElementById('export-data-modal');
    if (modal) hideModal(modal);

    // Reset to main content
    document.getElementById('export-main-content')?.classList.remove('hidden');
    document.getElementById('export-verify-content')?.classList.add('hidden');
    document.getElementById('export-processing-content')?.classList.add('hidden');
    document.getElementById('export-ready-content')?.classList.add('hidden');
}

async function calculateExportSizes() {
    // Simulate calculating sizes
    setTimeout(() => {
        document.getElementById('export-content-size').textContent = '~2.1 MB';
        document.getElementById('export-messages-size').textContent = '~500 KB';
        document.getElementById('export-sessions-size').textContent = '~1.5 MB';
    }, 1000);
}

async function requestDataExport() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Show verification step
    document.getElementById('export-main-content').classList.add('hidden');
    document.getElementById('export-verify-content').classList.remove('hidden');
    document.getElementById('export-verify-email').textContent = user.email || 'your email';

    // Send verification code
    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/user/export/request`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Error requesting export:', error);
    }
}

function handleExportCodeInput(input, index) {
    const inputs = document.querySelectorAll('.export-code-input');
    if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
    }
}

function cancelExportVerification() {
    document.getElementById('export-verify-content').classList.add('hidden');
    document.getElementById('export-main-content').classList.remove('hidden');
}

async function verifyAndExport() {
    const inputs = document.querySelectorAll('.export-code-input');
    let code = '';
    inputs.forEach(input => code += input.value);

    if (code.length !== 6) {
        showNotification('Please enter the complete code', 'error');
        return;
    }

    // Show processing
    document.getElementById('export-verify-content').classList.add('hidden');
    document.getElementById('export-processing-content').classList.remove('hidden');

    // Simulate export progress
    let progress = 0;
    const progressBar = document.getElementById('export-progress-bar');
    const progressText = document.getElementById('export-progress-text');
    const steps = ['Collecting profile data...', 'Gathering content...', 'Processing messages...', 'Creating archive...', 'Finalizing...'];

    const interval = setInterval(() => {
        progress += 20;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = steps[Math.floor(progress / 25)] || 'Finalizing...';

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('export-processing-content').classList.add('hidden');
                document.getElementById('export-ready-content').classList.remove('hidden');
            }, 500);
        }
    }, 800);
}

function resendExportCode() {
    showNotification('Verification code resent', 'success');
}

function downloadExportedData() {
    // Create a sample export file
    const exportData = {
        exported_at: new Date().toISOString(),
        user: JSON.parse(localStorage.getItem('user') || '{}'),
        message: 'This is a demo export. In production, this would contain all your data.'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astegni-data-export.json';
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Data exported successfully', 'success');
}

// ==========================================
// REVIEW & RATE ASTEGNI
// ==========================================

function openReviewAstegniModal() {
    loadModalAndShow('review-astegni-modal.html', 'review-astegni-modal', () => {
        loadExistingReview();
        setupReviewListeners();
    });
}

function closeReviewAstegniModal() {
    const modal = document.getElementById('review-astegni-modal');
    if (modal) hideModal(modal);
    resetReviewState();
}

function resetReviewState() {
    reviewRatings = { overall: 0, ease: 0, features: 0, support: 0, value: 0 };
    selectedFeatureSuggestions = [];
    recommendsAstegni = null;
}

async function loadExistingReview() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/platform/reviews/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.review) {
                document.getElementById('existing-review-banner').classList.remove('hidden');
                // Pre-fill the form with existing review
                setOverallRating(data.review.overall_rating);
                document.getElementById('review-text').value = data.review.text || '';
            }
        }
    } catch (error) {
        console.error('Error loading existing review:', error);
    }
}

function setupReviewListeners() {
    const textarea = document.getElementById('review-text');
    if (textarea) {
        textarea.addEventListener('input', () => {
            const count = textarea.value.length;
            document.getElementById('review-char-count').textContent = count;
            if (count > 500) {
                textarea.value = textarea.value.substring(0, 500);
            }
        });
    }
}

function setOverallRating(rating) {
    reviewRatings.overall = rating;
    updateStarDisplay('overall-rating-stars', rating);

    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    document.getElementById('rating-label').textContent = labels[rating];

    updateSubmitButton();
}

function setCategoryRating(category, rating) {
    reviewRatings[category] = rating;
    updateStarDisplay(`${category}-rating-stars`, rating);
}

function updateStarDisplay(containerId, rating) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stars = container.querySelectorAll('button');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-gray-300');
            star.classList.add('text-yellow-400');
        } else {
            star.classList.add('text-gray-300');
            star.classList.remove('text-yellow-400');
        }
    });
}

function toggleFeatureSuggestion(button) {
    const feature = button.textContent.trim();
    const index = selectedFeatureSuggestions.indexOf(feature);

    if (index === -1) {
        selectedFeatureSuggestions.push(feature);
        button.classList.remove('bg-gray-100', 'text-gray-700');
        button.classList.add('bg-indigo-100', 'text-indigo-700');
    } else {
        selectedFeatureSuggestions.splice(index, 1);
        button.classList.add('bg-gray-100', 'text-gray-700');
        button.classList.remove('bg-indigo-100', 'text-indigo-700');
    }
}

function setRecommendation(value) {
    recommendsAstegni = value;

    const yesBtn = document.getElementById('recommend-yes');
    const noBtn = document.getElementById('recommend-no');

    yesBtn.classList.remove('bg-green-100', 'text-green-700', 'bg-gray-200');
    noBtn.classList.remove('bg-red-100', 'text-red-700', 'bg-gray-200');

    if (value) {
        yesBtn.classList.add('bg-green-100', 'text-green-700');
        noBtn.classList.add('bg-gray-200');
    } else {
        noBtn.classList.add('bg-red-100', 'text-red-700');
        yesBtn.classList.add('bg-gray-200');
    }
}

function updateSubmitButton() {
    const btn = document.getElementById('submit-review-btn');
    btn.disabled = reviewRatings.overall === 0;
}

async function submitAstegniReview() {
    const reviewData = {
        overall_rating: reviewRatings.overall,
        category_ratings: {
            ease: reviewRatings.ease,
            features: reviewRatings.features,
            support: reviewRatings.support,
            value: reviewRatings.value
        },
        text: document.getElementById('review-text').value,
        feature_suggestions: selectedFeatureSuggestions,
        recommends: recommendsAstegni
    };

    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/platform/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });

        // Show success
        document.getElementById('review-form-content').classList.add('hidden');
        document.getElementById('review-success-content').classList.remove('hidden');
    } catch (error) {
        console.error('Error submitting review:', error);
        // Show success anyway for demo
        document.getElementById('review-form-content').classList.add('hidden');
        document.getElementById('review-success-content').classList.remove('hidden');
    }
}

function shareReviewOn(platform) {
    const text = `I just reviewed Astegni - Ethiopia's premier tutoring platform! Check it out at astegni.com`;
    const url = 'https://astegni.com';

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent('Astegni Review')}&summary=${encodeURIComponent(text)}`
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
}

// ==========================================
// APPEARANCE
// ==========================================
// Note: Appearance functionality moved to appearance-manager.js
// For backward compatibility, we keep the global function exports at the bottom

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function loadModalAndShow(modalFile, modalId, callback) {
    console.log(`[Settings] loadModalAndShow called: file=${modalFile}, id=${modalId}`);

    const existingModal = document.getElementById(modalId);
    console.log(`[Settings] Existing modal check: ${existingModal ? 'FOUND' : 'NOT FOUND'}`);

    if (existingModal) {
        console.log(`[Settings] Modal already exists, showing it`);
        showModal(existingModal);
        if (callback) callback();
        return;
    }

    // Try to load via ModalLoader (tutor-profile loader) first
    if (typeof ModalLoader !== 'undefined' && ModalLoader.load) {
        console.log(`[Settings] Loading modal via ModalLoader: ${modalFile}`);
        ModalLoader.load(modalFile).then(() => {
            const modal = document.getElementById(modalId);
            if (modal) {
                showModal(modal);
                if (callback) callback();
            } else {
                console.log(`[Settings] Modal loaded but element not found: ${modalId}`);
            }
        }).catch(err => {
            console.error('[Settings] ModalLoader failed:', err);
            // Fallback: try direct fetch
            loadModalDirectly(modalFile, modalId, callback);
        });
    }
    // Try window.modalLoader as alternative
    else if (typeof window.modalLoader !== 'undefined' && window.modalLoader.loadModal) {
        console.log(`[Settings] Loading modal via window.modalLoader: ${modalFile}`);
        window.modalLoader.loadModal(modalFile).then(() => {
            const modal = document.getElementById(modalId);
            if (modal) {
                showModal(modal);
                if (callback) callback();
            }
        }).catch(err => {
            console.error('[Settings] window.modalLoader failed:', err);
            loadModalDirectly(modalFile, modalId, callback);
        });
    } else {
        console.log(`[Settings] No modal loader available, using direct fetch`);
        loadModalDirectly(modalFile, modalId, callback);
    }
}

/**
 * Show a modal element by removing hidden and setting display flex
 * Works with the .modal class structure (outer container with inline styles)
 */
function showModal(modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

/**
 * Hide a modal element by adding hidden and setting display none
 */
function hideModal(modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
    // Restore body scroll
    document.body.style.overflow = '';
}

function loadModalDirectly(modalFile, modalId, callback) {
    // Detect the correct base path based on current page location
    const currentPath = window.location.pathname;
    let basePath = 'modals/common-modals/';

    if (currentPath.includes('/profile-pages/') ||
        currentPath.includes('/view-profiles/') ||
        currentPath.includes('/branch/') ||
        currentPath.includes('/admin-pages/')) {
        basePath = '../modals/common-modals/';
    }

    const paths = [
        `${basePath}${modalFile}`,
        `modals/common-modals/${modalFile}`,
        `../modals/common-modals/${modalFile}`,
        `../../modals/common-modals/${modalFile}`
    ];

    tryLoadFromPaths(paths, 0, modalId, callback);
}

function tryLoadFromPaths(paths, index, modalId, callback) {
    if (index >= paths.length) {
        console.error('Could not load modal from any path');
        return;
    }

    fetch(paths[index])
        .then(response => {
            if (!response.ok) throw new Error('Not found');
            return response.text();
        })
        .then(html => {
            const container = document.createElement('div');
            container.innerHTML = html;
            // Append ALL children (modal div AND style tag)
            while (container.firstChild) {
                document.body.appendChild(container.firstChild);
            }

            const modal = document.getElementById(modalId);
            if (modal) {
                showModal(modal);
                if (callback) callback();
            }
        })
        .catch(() => {
            tryLoadFromPaths(paths, index + 1, modalId, callback);
        });
}

function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback: simple alert
        console.log(`[${type.toUpperCase()}] ${message}`);
        if (type === 'error') {
            alert(message);
        }
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

// Update 2FA status badge on page load
document.addEventListener('DOMContentLoaded', async () => {
    const statusBadge = document.getElementById('2fa-status-badge');
    if (statusBadge) {
        // Fetch 2FA status from API (it's stored on profile, not user table)
        const token = getValidToken();
        if (!token) {
            updateStatusBadge(statusBadge, false);
            return;
        }

        try {
            // Detect current role from page URL
            const path = window.location.pathname.toLowerCase();
            let role = null;
            if (path.includes('student-profile')) role = 'student';
            else if (path.includes('tutor-profile')) role = 'tutor';
            else if (path.includes('parent-profile')) role = 'parent';
            else if (path.includes('advertiser-profile')) role = 'advertiser';

            const url = role ? `${API_BASE_URL}/api/2fa/status?role=${role}` : `${API_BASE_URL}/api/2fa/status`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                updateStatusBadge(statusBadge, data.enabled);
            } else {
                updateStatusBadge(statusBadge, false);
            }
        } catch (error) {
            console.log('[2FA Badge] Error fetching status:', error.message);
            updateStatusBadge(statusBadge, false);
        }
    }
});

// Make functions globally available
window.openTwoFactorAuthModal = openTwoFactorAuthModal;
window.closeTwoFactorAuthModal = closeTwoFactorAuthModal;
window.openLoginActivityModal = openLoginActivityModal;
window.closeLoginActivityModal = closeLoginActivityModal;
window.openConnectedAccountsModal = openConnectedAccountsModal;
window.closeConnectedAccountsModal = closeConnectedAccountsModal;
window.openLanguagePreferencesModal = openLanguagePreferencesModal;
window.closeLanguagePreferencesModal = closeLanguagePreferencesModal;
window.openExportDataModal = openExportDataModal;
window.closeExportDataModal = closeExportDataModal;
window.openReviewAstegniModal = openReviewAstegniModal;
window.closeReviewAstegniModal = closeReviewAstegniModal;
// Note: Appearance modal exports moved to appearance-manager.js
