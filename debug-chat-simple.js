// ============================================
// CHAT MODAL DEBUG - Simple Version
// ============================================

console.log('=== CHAT MODAL DIAGNOSTICS ===');

// 1. Check ChatModalManager
console.log('\n1. ChatModalManager Status:');
if (typeof ChatModalManager !== 'undefined') {
    console.log('OK - ChatModalManager is defined');
    console.log('   State:', ChatModalManager.state);
    console.log('   Initialized:', ChatModalManager._initialized);
} else {
    console.log('ERROR - ChatModalManager is NOT defined');
}

// 2. Check openChatModal function
console.log('\n2. openChatModal Function:');
if (typeof openChatModal === 'function') {
    console.log('OK - openChatModal function exists');
} else {
    console.log('ERROR - openChatModal function missing');
}

// 3. Check modal HTML
console.log('\n3. Modal HTML in DOM:');
const modal = document.getElementById('chatModal');
if (modal) {
    console.log('OK - Chat modal found');
    console.log('   Classes:', modal.className);
    console.log('   Display:', modal.style.display);
    console.log('   Hidden class:', modal.classList.contains('hidden'));
} else {
    console.log('ERROR - Chat modal NOT found in DOM');
}

// 4. Check authentication
console.log('\n4. Authentication:');
const token = localStorage.getItem('token') || localStorage.getItem('access_token');
if (token) {
    console.log('OK - Token found');
} else {
    console.log('WARNING - No token found');
}

// 5. Check user data
console.log('\n5. User Data:');
const user = localStorage.getItem('user');
if (user) {
    try {
        const userData = JSON.parse(user);
        console.log('OK - User data:', userData);
    } catch (e) {
        console.log('WARNING - User data exists but invalid JSON');
    }
} else {
    console.log('WARNING - No user data');
}

// 6. Check currentUser in ChatModalManager
if (typeof ChatModalManager !== 'undefined') {
    console.log('\n6. ChatModalManager.state.currentUser:');
    if (ChatModalManager.state?.currentUser) {
        console.log('OK - Current user loaded:', ChatModalManager.state.currentUser);
    } else {
        console.log('WARNING - Current user NOT loaded');
    }
}

// 7. Try to open modal
console.log('\n7. Test Opening Modal:');
console.log('Run this command to test: ChatModalManager.open()');

// Quick fix functions
console.log('\n=== QUICK FIX FUNCTIONS ===');
console.log('Copy and run these if needed:\n');

window.debugChatModal = {
    // Force load modal HTML
    loadModalHTML: async function() {
        console.log('Loading chat modal HTML...');
        try {
            const response = await fetch('../modals/common-modals/chat-modal.html');
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            console.log('OK - Modal HTML loaded!');

            // Try to initialize
            if (typeof ChatModalManager !== 'undefined') {
                ChatModalManager.init();
                console.log('OK - ChatModalManager initialized!');
            }
        } catch (error) {
            console.error('ERROR - Failed to load modal:', error);
        }
    },

    // Force load ChatModalManager script
    loadChatScript: function() {
        console.log('Loading chat-modal.js...');
        const script = document.createElement('script');
        script.src = '../js/common-modals/chat-modal.js';
        script.onload = () => console.log('OK - chat-modal.js loaded!');
        script.onerror = () => console.error('ERROR - Failed to load chat-modal.js');
        document.head.appendChild(script);
    },

    // Force initialize ChatModalManager
    forceInit: function() {
        if (typeof ChatModalManager !== 'undefined') {
            console.log('Initializing ChatModalManager...');
            ChatModalManager.init();
            console.log('OK - Initialized!');
        } else {
            console.error('ERROR - ChatModalManager not loaded');
        }
    },

    // Force open modal
    forceOpen: function() {
        if (typeof ChatModalManager !== 'undefined') {
            console.log('Opening chat modal...');
            ChatModalManager.open();
        } else if (typeof openChatModal === 'function') {
            console.log('Using openChatModal function...');
            openChatModal();
        } else {
            console.error('ERROR - No chat opening method available');
        }
    },

    // Check if modal is visible
    isVisible: function() {
        const modal = document.getElementById('chatModal');
        if (!modal) {
            console.log('ERROR - Modal not in DOM');
            return false;
        }
        const isVisible = modal.style.display !== 'none' && !modal.classList.contains('hidden');
        console.log(isVisible ? 'OK - Modal is visible' : 'ERROR - Modal is hidden');
        return isVisible;
    },

    // Show modal directly (bypass JS)
    showModal: function() {
        const modal = document.getElementById('chatModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            console.log('OK - Modal shown directly');
        } else {
            console.error('ERROR - Modal not found');
        }
    }
};

console.log('\n=== AVAILABLE COMMANDS ===');
console.log('  debugChatModal.loadModalHTML()   - Load modal HTML');
console.log('  debugChatModal.loadChatScript()  - Load chat script');
console.log('  debugChatModal.forceInit()       - Force initialization');
console.log('  debugChatModal.forceOpen()       - Force open modal');
console.log('  debugChatModal.isVisible()       - Check if visible');
console.log('  debugChatModal.showModal()       - Show modal directly');

console.log('\n=== DIAGNOSTICS COMPLETE ===\n');
