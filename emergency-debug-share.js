/**
 * EMERGENCY DEBUG - Run this in console to see what's happening
 */

console.log('🚨 EMERGENCY DEBUG ACTIVE');

// Override the modal immediately
setTimeout(() => {
    const modal = document.getElementById('shareProfileModal');

    if (!modal) {
        console.error('❌ Modal not found in DOM yet');
        return;
    }

    console.log('✅ Modal found, installing interceptor...');

    // Store original display setter
    const originalDisplayDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype.style, 'display');

    // Create a flag to track if we're inside shareProfile
    window._shareProfileOpening = false;

    // Intercept ALL display changes to this modal
    const originalSetAttribute = modal.setAttribute.bind(modal);
    modal.setAttribute = function(name, value) {
        if (name === 'style' && value.includes('display')) {
            console.log('🔴 setAttribute style with display:', value);
            console.trace();
        }
        return originalSetAttribute(name, value);
    };

    // Watch the style object
    const styleProxy = new Proxy(modal.style, {
        set(target, prop, value) {
            if (prop === 'display') {
                console.log(`🔴 [INTERCEPTED] modal.style.display = "${value}"`);
                console.log('📍 Current stack:');
                console.trace();

                // If someone tries to set display:none while we're opening, block it!
                if (value === 'none' && window._shareProfileOpening) {
                    console.warn('⛔ BLOCKED! Attempted to close modal while opening!');
                    return true; // Block the change
                }
            }
            target[prop] = value;
            return true;
        },
        get(target, prop) {
            return target[prop];
        }
    });

    // Replace style with proxy
    Object.defineProperty(modal, 'style', {
        get() { return styleProxy; },
        set(val) { console.warn('⚠️ Attempted to replace entire style object'); }
    });

    console.log('✅ Interceptor installed on modal');

}, 1000);

// Wrap shareProfile
const originalShareProfile = window.shareProfile;
if (originalShareProfile) {
    window.shareProfile = async function(event) {
        console.log('');
        console.log('🟢 ═══════════════════════════════════════');
        console.log('🟢 shareProfile() CALLED');
        console.log('🟢 ═══════════════════════════════════════');

        window._shareProfileOpening = true;

        try {
            const result = await originalShareProfile.call(this, event);

            setTimeout(() => {
                window._shareProfileOpening = false;
                console.log('🟢 shareProfile() completed, modal should be open now');

                const modal = document.getElementById('shareProfileModal');
                if (modal) {
                    console.log('Modal display:', modal.style.display);
                    console.log('Modal visibility:', modal.style.visibility);
                    console.log('Modal opacity:', modal.style.opacity);
                    console.log('Modal dimensions:', modal.offsetWidth, 'x', modal.offsetHeight);
                }
            }, 100);

            return result;
        } catch (error) {
            window._shareProfileOpening = false;
            console.error('❌ Error in shareProfile:', error);
            throw error;
        }
    };
    console.log('✅ shareProfile() wrapped');
}

// Monitor closeShareModal
const originalClose = window.closeShareModal;
if (originalClose) {
    window.closeShareModal = function() {
        console.log('🔴 ═══════════════════════════════════════');
        console.log('🔴 closeShareModal() CALLED');
        console.log('🔴 ═══════════════════════════════════════');
        console.trace();

        if (window._shareProfileOpening) {
            console.warn('⛔ BLOCKING closeShareModal - modal is still opening!');
            return; // Block it!
        }

        return originalClose.call(this);
    };
    console.log('✅ closeShareModal() wrapped');
}

// Monitor document clicks
document.addEventListener('click', (e) => {
    const modal = document.getElementById('shareProfileModal');
    if (modal && modal.style.display === 'block') {
        console.log('🖱️ Click while modal open');
        console.log('   Target:', e.target.tagName, e.target.className);
        console.log('   Is overlay?', e.target.classList.contains('modal-overlay'));
    }
}, true);

console.log('');
console.log('✅ Emergency debug installed');
console.log('💡 Now click the Share Profile button');
console.log('');
