/**
 * Enhanced Debug: Intercept Modal Display Changes
 * This will catch WHAT is setting the modal to display:none
 */

(function() {
    console.log('🔥 [INTERCEPTOR] Modal Display Interceptor Active');
    console.log('─'.repeat(80));

    // Wait for modal to exist
    function waitForModal() {
        const modal = document.getElementById('shareProfileModal');
        if (!modal) {
            setTimeout(waitForModal, 100);
            return;
        }

        console.log('✅ [INTERCEPTOR] Found shareProfileModal, installing interceptors...');

        // Store original style setter
        const originalStyleSetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style');

        // Intercept style.display changes on the modal
        Object.defineProperty(modal, 'style', {
            get: function() {
                return this._style || (this._style = {});
            },
            set: function(value) {
                this._style = value;
            }
        });

        // Override the style property to catch display changes
        const actualStyle = modal.style;
        const styleProxy = new Proxy(actualStyle, {
            set: function(target, property, value) {
                if (property === 'display') {
                    console.log('');
                    console.log('🔴 [INTERCEPTOR] ══════════════════════════════════════════');
                    console.log('🔴 [INTERCEPTOR] Modal Display Being Changed!');
                    console.log('🔴 [INTERCEPTOR] ══════════════════════════════════════════');
                    console.log('🔴 Old Value:', target[property]);
                    console.log('🔴 New Value:', value);
                    console.log('🔴 Stack Trace:');
                    console.trace();
                    console.log('🔴 [INTERCEPTOR] ══════════════════════════════════════════');
                    console.log('');
                }
                target[property] = value;
                return true;
            }
        });

        // Replace modal.style with our proxy
        Object.defineProperty(modal, 'style', {
            get: function() {
                return styleProxy;
            },
            set: function(value) {
                console.warn('⚠️ [INTERCEPTOR] Someone tried to replace entire style object!');
                console.trace();
            }
        });

        console.log('✅ [INTERCEPTOR] Modal display interceptor installed');
        console.log('');
    }

    // Start monitoring
    waitForModal();

    // Also monitor for closeShareModal calls
    const originalClose = window.closeShareModal;
    if (originalClose) {
        window.closeShareModal = function() {
            console.log('');
            console.log('🔴 [INTERCEPTOR] ══════════════════════════════════════════');
            console.log('🔴 [INTERCEPTOR] closeShareModal() Called!');
            console.log('🔴 [INTERCEPTOR] ══════════════════════════════════════════');
            console.log('🔴 Stack Trace:');
            console.trace();
            console.log('🔴 [INTERCEPTOR] ══════════════════════════════════════════');
            console.log('');
            return originalClose.apply(this, arguments);
        };
    }

    // Monitor clicks on document to see if something is closing modal
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('shareProfileModal');
        if (modal && modal.style.display !== 'none') {
            console.log('🖱️ [INTERCEPTOR] Click detected while modal open');
            console.log('   Target:', e.target);
            console.log('   Target classes:', e.target.className);
            console.log('   Target id:', e.target.id);

            // Check if click is on overlay
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay && e.target === overlay) {
                console.log('   ⚠️ Click was on overlay! This might close modal.');
            }
        }
    }, true); // Use capture phase

    // Monitor escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('shareProfileModal');
            if (modal && modal.style.display !== 'none') {
                console.log('⌨️ [INTERCEPTOR] Escape key pressed while modal open');
                console.log('   This will close the modal');
            }
        }
    }, true);

    // Monitor for any CSS changes via classes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const modal = document.getElementById('shareProfileModal');
                if (mutation.target === modal) {
                    console.log('🔄 [INTERCEPTOR] Modal style attribute changed via setAttribute or direct manipulation');
                    console.log('   Current display:', modal.style.display);
                }
            }
        });
    });

    // Start observing once modal exists
    function startObserver() {
        const modal = document.getElementById('shareProfileModal');
        if (!modal) {
            setTimeout(startObserver, 100);
            return;
        }
        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
        console.log('✅ [INTERCEPTOR] MutationObserver installed');
        console.log('');
    }
    startObserver();

})();
