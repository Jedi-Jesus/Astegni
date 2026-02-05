/**
 * COMPLETE DIAGNOSTIC - Run this to see what's wrong
 */

console.log('🔬 STARTING COMPLETE DIAGNOSTIC');
console.log('═'.repeat(80));

// 1. Check if script is loaded
console.log('\n📋 STEP 1: Check Script Loading');
console.log('─'.repeat(80));
const scripts = document.querySelectorAll('script[src*="share-profile"]');
console.log('Share profile scripts found:', scripts.length);
scripts.forEach((script, i) => {
    console.log(`  Script ${i+1}:`, script.src);
});

// 2. Check if function exists
console.log('\n📋 STEP 2: Check Function Exists');
console.log('─'.repeat(80));
console.log('shareProfile function exists?', typeof window.shareProfile);
if (typeof window.shareProfile === 'function') {
    console.log('✅ Function exists');
    console.log('Function signature:', window.shareProfile.toString().substring(0, 200) + '...');
} else {
    console.error('❌ shareProfile function NOT FOUND!');
}

// 3. Check if modal HTML exists
console.log('\n📋 STEP 3: Check Modal HTML in DOM');
console.log('─'.repeat(80));
const modal = document.getElementById('shareProfileModal');
if (modal) {
    console.log('✅ Modal exists in DOM');
    console.log('  Current display:', modal.style.display);
    console.log('  Current visibility:', modal.style.visibility);
    console.log('  Parent:', modal.parentElement?.tagName);
} else {
    console.error('❌ Modal NOT in DOM yet');
}

// 4. Check authentication
console.log('\n📋 STEP 4: Check Authentication');
console.log('─'.repeat(80));
const diagToken = localStorage.getItem('token');
const diagCurrentUser = localStorage.getItem('currentUser');
const diagActiveRole = localStorage.getItem('active_role');
console.log('Token exists?', !!diagToken);
console.log('CurrentUser exists?', !!diagCurrentUser);
console.log('Active role:', diagActiveRole);

if (diagCurrentUser) {
    try {
        const user = JSON.parse(diagCurrentUser);
        console.log('User email:', user.email);
        console.log('User active_role:', user.active_role);
    } catch (e) {
        console.error('Error parsing currentUser:', e);
    }
}

// 5. Try to manually load modal
console.log('\n📋 STEP 5: Try Manual Modal Load');
console.log('─'.repeat(80));

fetch('../modals/common-modals/share-profile-modal.html')
    .then(response => {
        console.log('Fetch response status:', response.status);
        if (response.ok) {
            console.log('✅ Modal HTML file is accessible');
            return response.text();
        } else {
            console.error('❌ Modal HTML fetch failed:', response.status);
            throw new Error('Failed to load modal');
        }
    })
    .then(html => {
        console.log('Modal HTML length:', html.length, 'characters');
        console.log('HTML preview:', html.substring(0, 200) + '...');

        // Check if modal was already injected
        if (!document.getElementById('shareProfileModal')) {
            console.log('Injecting modal into DOM...');
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container);
            console.log('✅ Modal injected');

            // Check again
            const newModal = document.getElementById('shareProfileModal');
            console.log('Modal now exists?', !!newModal);
        } else {
            console.log('⚠️ Modal already exists in DOM');
        }
    })
    .catch(error => {
        console.error('❌ Error loading modal:', error);
    });

// 6. Set up a wrapper to see if function is called
console.log('\n📋 STEP 6: Wrap shareProfile to Monitor Calls');
console.log('─'.repeat(80));

if (typeof window.shareProfile === 'function') {
    const original = window.shareProfile;
    window.shareProfile = async function(...args) {
        console.log('\n🚀 ═══════════════════════════════════════');
        console.log('🚀 shareProfile() CALLED!');
        console.log('🚀 Arguments:', args);
        console.log('🚀 ═══════════════════════════════════════\n');

        try {
            const result = await original.apply(this, args);
            console.log('✅ shareProfile() completed');

            // Check modal state after
            const modal = document.getElementById('shareProfileModal');
            if (modal) {
                console.log('Modal state after call:');
                console.log('  display:', modal.style.display);
                console.log('  visibility:', modal.style.visibility);
                console.log('  opacity:', modal.style.opacity);
                console.log('  offsetWidth:', modal.offsetWidth);
                console.log('  offsetHeight:', modal.offsetHeight);
            }

            return result;
        } catch (error) {
            console.error('❌ Error in shareProfile():', error);
            console.error(error.stack);
            throw error;
        }
    };
    console.log('✅ Wrapper installed');
}

console.log('\n═'.repeat(80));
console.log('🔬 DIAGNOSTIC COMPLETE');
console.log('═'.repeat(80));
console.log('\n💡 Now click the "Share Profile" button and watch the console\n');
