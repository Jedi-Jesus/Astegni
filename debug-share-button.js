/**
 * Share Button Debug Script
 * Copy and paste this into the browser console on any profile page
 */

console.log('=== SHARE BUTTON DEBUG ===');

// 1. Check if shareProfile function exists
console.log('\n1. Function Check:');
console.log('shareProfile exists:', typeof shareProfile !== 'undefined');
console.log('shareProfile type:', typeof shareProfile);

// 2. Check if share-profile-manager.js is loaded
console.log('\n2. Script Loading Check:');
const scripts = Array.from(document.querySelectorAll('script'));
const shareManagerScript = scripts.find(s => s.src.includes('share-profile-manager'));
console.log('share-profile-manager.js loaded:', !!shareManagerScript);
if (shareManagerScript) {
    console.log('Script src:', shareManagerScript.src);
}

// 3. Check modal loaders
console.log('\n3. Modal Loaders:');
console.log('ModalLoader exists:', typeof ModalLoader !== 'undefined');
console.log('CommonModalLoader exists:', typeof CommonModalLoader !== 'undefined');
console.log('window.modalLoader exists:', typeof window.modalLoader !== 'undefined');

// 4. Check if modal is in DOM
console.log('\n4. Modal in DOM:');
const modal = document.getElementById('shareProfileModal');
console.log('shareProfileModal exists:', !!modal);
if (modal) {
    console.log('Modal display:', window.getComputedStyle(modal).display);
    console.log('Modal visibility:', window.getComputedStyle(modal).visibility);
    console.log('Modal z-index:', window.getComputedStyle(modal).zIndex);
}

// 5. Check available modals in loader
console.log('\n5. Available Modals in Loader:');
if (typeof ModalLoader !== 'undefined' && ModalLoader.getAvailableModals) {
    const available = ModalLoader.getAvailableModals();
    console.log('Common modals includes share-profile:', available.common.includes('share-profile-modal.html'));
    console.log('All common modals:', available.common);
}
if (typeof CommonModalLoader !== 'undefined') {
    console.log('CommonModalLoader initialized');
}

// 6. Check share button
console.log('\n6. Share Button:');
const shareButtons = document.querySelectorAll('button');
const shareBtn = Array.from(shareButtons).find(btn =>
    btn.textContent.includes('Share Profile') ||
    btn.onclick?.toString().includes('shareProfile')
);
console.log('Share button found:', !!shareBtn);
if (shareBtn) {
    console.log('Button onclick:', shareBtn.onclick?.toString());
    console.log('Button text:', shareBtn.textContent.trim());
}

// 7. Check authentication
console.log('\n7. Authentication:');
const user = localStorage.getItem('currentUser') || localStorage.getItem('user');
const token = localStorage.getItem('token');
const activeRole = localStorage.getItem('active_role') || localStorage.getItem('userRole');
console.log('User exists:', !!user);
console.log('Token exists:', !!token);
console.log('Active role:', activeRole);

// 8. Try to manually trigger shareProfile
console.log('\n8. Manual Trigger Test:');
console.log('Attempting to call shareProfile()...');
try {
    if (typeof shareProfile !== 'undefined') {
        // Don't actually call it, just log that we could
        console.log('✓ shareProfile() is callable');
    } else {
        console.error('✗ shareProfile() is NOT defined');
    }
} catch (error) {
    console.error('Error:', error);
}

// 9. Check for console errors
console.log('\n9. Console Errors Check:');
console.log('Check the console above for any red error messages');

// 10. Modal container check
console.log('\n10. Modal Container:');
const modalContainer = document.getElementById('modal-container');
console.log('Modal container exists:', !!modalContainer);
if (modalContainer) {
    const modalsInContainer = modalContainer.querySelectorAll('[id*="Modal"], [id*="modal"]');
    console.log('Modals in container:', modalsInContainer.length);
    console.log('Modal IDs:', Array.from(modalsInContainer).map(m => m.id));
}

// 11. Test modal loading
console.log('\n11. Test Modal Loading:');
if (typeof ModalLoader !== 'undefined') {
    console.log('Attempting to load share-profile-modal...');
    ModalLoader.load('share-profile-modal.html')
        .then(() => {
            console.log('✓ Modal loaded successfully');
            const modalCheck = document.getElementById('shareProfileModal');
            console.log('Modal now in DOM:', !!modalCheck);
        })
        .catch(err => {
            console.error('✗ Failed to load modal:', err);
        });
} else if (typeof CommonModalLoader !== 'undefined') {
    console.log('Attempting to load share-profile-modal via CommonModalLoader...');
    CommonModalLoader.load('share-profile-modal.html')
        .then(() => {
            console.log('✓ Modal loaded successfully');
            const modalCheck = document.getElementById('shareProfileModal');
            console.log('Modal now in DOM:', !!modalCheck);
        })
        .catch(err => {
            console.error('✗ Failed to load modal:', err);
        });
}

console.log('\n=== DEBUG COMPLETE ===');
console.log('\nNext steps:');
console.log('1. Look for any red error messages above');
console.log('2. Check if shareProfile function exists');
console.log('3. Check if modal loaded into DOM');
console.log('4. Try clicking the Share Profile button and watch for errors');
