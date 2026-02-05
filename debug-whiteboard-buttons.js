/**
 * Whiteboard Button Debug Script
 * Paste this into the browser console to diagnose why buttons aren't responding
 */

console.log('🔍 === WHITEBOARD DEBUG SCRIPT ===');

// 1. Check if whiteboard manager exists
console.log('\n1️⃣ Checking WhiteboardManager...');
if (typeof whiteboardManager !== 'undefined') {
    console.log('✅ whiteboardManager exists');
    console.log('   - Type:', typeof whiteboardManager);
    console.log('   - Event listeners setup flag:', whiteboardManager._eventListenersSetup);
} else {
    console.error('❌ whiteboardManager is NOT defined!');
}

// 2. Check if modal exists in DOM
console.log('\n2️⃣ Checking whiteboard modal in DOM...');
const modal = document.getElementById('whiteboardModal');
if (modal) {
    console.log('✅ Whiteboard modal found in DOM');
    console.log('   - Classes:', modal.className);
    console.log('   - Display:', window.getComputedStyle(modal).display);
} else {
    console.error('❌ Whiteboard modal NOT found in DOM!');
}

// 3. Check specific buttons
console.log('\n3️⃣ Checking specific buttons...');
const buttons = {
    'Close Button': 'closeWhiteboard',
    'Minimize Button': 'minimizeWhiteboard',
    'Maximize Button': 'maximizeWhiteboard',
    'Mobile Toggle': 'mobileToggleHistory',
    'Right Sidebar Toggle': 'rightSidebarToggle',
    'Prev Page': 'prevPageBtn',
    'Next Page': 'nextPageBtn',
    'Add Page': 'addPageBtn',
    'Undo': 'undoBtn',
    'Clear': 'clearBtn',
    'Save': 'saveBtn'
};

for (const [name, id] of Object.entries(buttons)) {
    const btn = document.getElementById(id);
    if (btn) {
        console.log(`✅ ${name} (${id}):`, btn);
    } else {
        console.error(`❌ ${name} (${id}): NOT FOUND`);
    }
}

// 4. Check canvas
console.log('\n4️⃣ Checking canvas...');
const canvas = document.getElementById('whiteboardCanvas');
if (canvas) {
    console.log('✅ Canvas found');
    console.log('   - Width:', canvas.width);
    console.log('   - Height:', canvas.height);
} else {
    console.error('❌ Canvas NOT found!');
}

// 5. Check tool buttons
console.log('\n5️⃣ Checking tool buttons...');
const toolButtons = document.querySelectorAll('.tool-button[data-tool]');
console.log(`   Found ${toolButtons.length} tool buttons`);
toolButtons.forEach((btn, index) => {
    console.log(`   - Tool ${index + 1}:`, btn.dataset.tool, btn);
});

// 6. Check sidebar icon buttons
console.log('\n6️⃣ Checking sidebar icon buttons...');
const sidebarBtns = document.querySelectorAll('.sidebar-icon-btn');
console.log(`   Found ${sidebarBtns.length} sidebar icon buttons`);
sidebarBtns.forEach((btn, index) => {
    console.log(`   - Sidebar ${index + 1}:`, btn.dataset.panel, btn);
});

// 7. Check ModalLoader
console.log('\n7️⃣ Checking ModalLoader...');
if (typeof ModalLoader !== 'undefined') {
    console.log('✅ ModalLoader exists');
    console.log('   - Is whiteboard modal loaded:', ModalLoader.isLoaded('whiteboardModal'));
} else {
    console.error('❌ ModalLoader NOT defined!');
}

// 8. Manual event listener test
console.log('\n8️⃣ Manual Event Listener Test...');
console.log('   Attempting to setup event listeners manually...');

if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
    // Force reset the flag
    whiteboardManager._eventListenersSetup = false;

    // Try to setup listeners
    whiteboardManager.setupEventListeners();

    console.log('   ✅ Manual setup complete');
    console.log('   - Event listeners setup flag:', whiteboardManager._eventListenersSetup);
} else {
    console.error('   ❌ Cannot setup - whiteboardManager not available');
}

// 9. Test button click
console.log('\n9️⃣ Testing button click...');
const closeBtn = document.getElementById('closeWhiteboard');
if (closeBtn) {
    console.log('   Simulating click on close button...');
    closeBtn.click();
    console.log('   ✅ Click simulated (check if modal closed)');
} else {
    console.error('   ❌ Close button not found');
}

console.log('\n🔍 === DEBUG COMPLETE ===');
console.log('If buttons still don\'t work after manual setup, there may be a deeper issue.');
