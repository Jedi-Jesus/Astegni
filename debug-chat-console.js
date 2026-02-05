// ============================================
// CHAT MODAL DEBUG - Paste this in browser console
// ============================================

console.log('%c🔍 CHAT MODAL DIAGNOSTICS', 'color: #0f0; font-size: 20px; font-weight: bold;');

// 1. Check ChatModalManager
console.log('\n1️⃣ ChatModalManager Status:');
if (typeof ChatModalManager !== 'undefined') {
    console.log('✅ ChatModalManager is defined');
    console.log('   State:', ChatModalManager.state);
    console.log('   Initialized:', ChatModalManager._initialized);
} else {
    console.log('❌ ChatModalManager is NOT defined');
}

// 2. Check openChatModal function
console.log('\n2️⃣ openChatModal Function:');
if (typeof openChatModal === 'function') {
    console.log('✅ openChatModal function exists');
} else {
    console.log('❌ openChatModal function missing');
}

// 3. Check modal HTML
console.log('\n3️⃣ Modal HTML in DOM:');
const modal = document.getElementById('chatModal');
if (modal) {
    console.log('✅ Chat modal found');
    console.log('   Classes:', modal.className);
    console.log('   Display:', modal.style.display);
    console.log('   Hidden class:', modal.classList.contains('hidden'));
} else {
    console.log('❌ Chat modal NOT found in DOM');
}

// 4. Check authentication
console.log('\n4️⃣ Authentication:');
const token = localStorage.getItem('token') || localStorage.getItem('access_token');
if (token) {
    console.log('✅ Token found');
} else {
    console.log('⚠️ No token found');
}

// 5. Check user data
console.log('\n5️⃣ User Data:');
const user = localStorage.getItem('user');
if (user) {
    try {
        const userData = JSON.parse(user);
        console.log('✅ User data:', userData);
    } catch (e) {
        console.log('⚠️ User data exists but invalid JSON');
    }
} else {
    console.log('⚠️ No user data');
}

// 6. Check currentUser in ChatModalManager
if (typeof ChatModalManager !== 'undefined') {
    console.log('\n6️⃣ ChatModalManager.state.currentUser:');
    if (ChatModalManager.state?.currentUser) {
        console.log('✅ Current user loaded:', ChatModalManager.state.currentUser);
    } else {
        console.log('⚠️ Current user NOT loaded');
    }
}

// 7. Try to open modal
console.log('\n7️⃣ Test Opening Modal:');
console.log('Run this command to test: ChatModalManager.open()');

// Quick fix functions
console.log('\n🛠️ QUICK FIX FUNCTIONS:');
console.log('Copy and run these if needed:\n');

window.debugChatModal = {
    // Force load modal HTML
    loadModalHTML: async function() {
        console.log('Loading chat modal HTML...');
        try {
            const response = await fetch('../modals/common-modals/chat-modal.html');
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            console.log('✅ Modal HTML loaded!');

            // Try to initialize
            if (typeof ChatModalManager !== 'undefined') {
                ChatModalManager.init();
                console.log('✅ ChatModalManager initialized!');
            }
        } catch (error) {
            console.error('❌ Failed to load modal:', error);
        }
    },

    // Force load ChatModalManager script
    loadChatScript: function() {
        console.log('Loading chat-modal.js...');
        const script = document.createElement('script');
        script.src = '../js/common-modals/chat-modal.js';
        script.onload = () => console.log('✅ chat-modal.js loaded!');
        script.onerror = () => console.error('❌ Failed to load chat-modal.js');
        document.head.appendChild(script);
    },

    // Force initialize ChatModalManager
    forceInit: function() {
        if (typeof ChatModalManager !== 'undefined') {
            console.log('Initializing ChatModalManager...');
            ChatModalManager.init();
            console.log('✅ Initialized!');
        } else {
            console.error('❌ ChatModalManager not loaded');
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
            console.error('❌ No chat opening method available');
        }
    },

    // Check if modal is visible
    isVisible: function() {
        const modal = document.getElementById('chatModal');
        if (!modal) {
            console.log('❌ Modal not in DOM');
            return false;
        }
        const isVisible = modal.style.display !== 'none' && !modal.classList.contains('hidden');
        console.log(isVisible ? '✅ Modal is visible' : '❌ Modal is hidden');
        return isVisible;
    },

    // Show modal directly (bypass JS)
    showModal: function() {
        const modal = document.getElementById('chatModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            console.log('✅ Modal shown directly');
        } else {
            console.error('❌ Modal not found');
        }
    }
};

console.log('\n📝 AVAILABLE COMMANDS:');
console.log('  debugChatModal.loadModalHTML()   - Load modal HTML');
console.log('  debugChatModal.loadChatScript()  - Load chat script');
console.log('  debugChatModal.forceInit()       - Force initialization');
console.log('  debugChatModal.forceOpen()       - Force open modal');
console.log('  debugChatModal.isVisible()       - Check if visible');
console.log('  debugChatModal.showModal()       - Show modal directly');

console.log('\n✨ DIAGNOSTICS COMPLETE ✨\n');
