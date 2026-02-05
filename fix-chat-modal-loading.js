// ============================================
// IMMEDIATE FIX: Load ChatModalManager
// Paste this in your browser console
// ============================================

console.log('Loading ChatModalManager...');

// Check if already loaded
if (typeof ChatModalManager !== 'undefined') {
    console.log('ChatModalManager already exists!');
    console.log('Trying to initialize...');
    ChatModalManager.init();
    console.log('Done! Try opening: ChatModalManager.open()');
} else {
    // Load the script
    console.log('ChatModalManager not found, loading script...');

    const script = document.createElement('script');
    script.src = '../js/common-modals/chat-modal.js';

    script.onload = () => {
        console.log('OK - chat-modal.js loaded successfully!');

        // Wait a moment for script to execute
        setTimeout(() => {
            if (typeof ChatModalManager !== 'undefined') {
                console.log('OK - ChatModalManager is now available!');

                // Initialize it
                try {
                    ChatModalManager.init();
                    console.log('OK - ChatModalManager initialized!');
                    console.log('\nYou can now open chat with: ChatModalManager.open()');
                    console.log('Or click the Message button again.');
                } catch (error) {
                    console.error('ERROR initializing ChatModalManager:', error);
                }
            } else {
                console.error('ERROR - ChatModalManager still not defined after loading script');
                console.log('The script might have errors. Check the Network tab.');
            }
        }, 100);
    };

    script.onerror = (error) => {
        console.error('ERROR - Failed to load chat-modal.js');
        console.error('Error:', error);
        console.log('\nTroubleshooting:');
        console.log('1. Check if file exists: /js/common-modals/chat-modal.js');
        console.log('2. Check browser Network tab for 404 errors');
        console.log('3. Check browser Console for JavaScript errors');
    };

    document.head.appendChild(script);
    console.log('Script tag added, waiting for load...');
}
