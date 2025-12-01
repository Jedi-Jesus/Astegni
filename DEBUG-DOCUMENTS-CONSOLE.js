// ============================================
// STUDENT DOCUMENTS DEBUG SCRIPT - BROWSER CONSOLE
// ============================================
// Copy and paste this entire script into your browser console (F12)
// while on the student-profile.html page

console.log('🔍 Starting Student Documents Debug...\n');

// ============================================
// 1. CHECK AUTHENTICATION
// ============================================
console.log('📋 1. AUTHENTICATION CHECK:');
console.log('----------------------------');

const token = localStorage.getItem('token');
const currentUser = localStorage.getItem('currentUser');
const userRole = localStorage.getItem('userRole');

console.log('Token exists:', !!token);
console.log('Token length:', token ? token.length : 0);
console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'MISSING');

console.log('\nUser data exists:', !!currentUser);
if (currentUser) {
    try {
        const user = JSON.parse(currentUser);
        console.log('User ID:', user.id);
        console.log('User name:', user.name || `${user.first_name} ${user.father_name}`);
        console.log('User role:', user.role);
        console.log('User active_role:', user.active_role);
        console.log('User roles array:', user.roles);
    } catch (e) {
        console.error('Error parsing user:', e);
    }
}

console.log('\nStored userRole:', userRole);

// Check AuthManager
console.log('\nAuthManager exists:', typeof window.AuthManager !== 'undefined');
if (window.AuthManager) {
    console.log('AuthManager.isAuthenticated():', window.AuthManager.isAuthenticated());
    console.log('AuthManager.getUserRole():', window.AuthManager.getUserRole());
    console.log('AuthManager.getUserId():', window.AuthManager.getUserId());
    console.log('AuthManager.getActiveRoleId():', window.AuthManager.getActiveRoleId());
}

// ============================================
// 2. TEST API ENDPOINTS
// ============================================
console.log('\n\n📋 2. TESTING API ENDPOINTS:');
console.log('----------------------------');

async function testDocumentsAPI() {
    if (!token) {
        console.error('❌ No token found! Cannot test API.');
        return;
    }

    const API_BASE_URL = 'http://localhost:8000';

    // Test 1: Get all documents
    console.log('\n🔹 Test 1: GET /api/student/documents');
    try {
        const response = await fetch(`${API_BASE_URL}/api/student/documents`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS - All documents:', data);
            console.log('Total documents:', data.length);
        } else {
            const error = await response.json();
            console.error('❌ ERROR:', error);
        }
    } catch (error) {
        console.error('❌ FETCH ERROR:', error);
    }

    // Test 2: Get achievements only
    console.log('\n🔹 Test 2: GET /api/student/documents?document_type=achievement');
    try {
        const response = await fetch(`${API_BASE_URL}/api/student/documents?document_type=achievement`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS - Achievements:', data);
            console.log('Total achievements:', data.length);
        } else {
            const error = await response.json();
            console.error('❌ ERROR:', error);
        }
    } catch (error) {
        console.error('❌ FETCH ERROR:', error);
    }

    // Test 3: Get academic certificates
    console.log('\n🔹 Test 3: GET /api/student/documents?document_type=academic_certificate');
    try {
        const response = await fetch(`${API_BASE_URL}/api/student/documents?document_type=academic_certificate`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS - Certificates:', data);
            console.log('Total certificates:', data.length);
        } else {
            const error = await response.json();
            console.error('❌ ERROR:', error);
        }
    } catch (error) {
        console.error('❌ FETCH ERROR:', error);
    }

    // Test 4: Get stats
    console.log('\n🔹 Test 4: GET /api/student/documents/stats');
    try {
        const response = await fetch(`${API_BASE_URL}/api/student/documents/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS - Stats:', data);
        } else {
            const error = await response.json();
            console.error('❌ ERROR:', error);
        }
    } catch (error) {
        console.error('❌ FETCH ERROR:', error);
    }
}

// Run API tests
testDocumentsAPI();

// ============================================
// 3. CHECK DOM ELEMENTS
// ============================================
console.log('\n\n📋 3. DOM ELEMENTS CHECK:');
console.log('----------------------------');

setTimeout(() => {
    console.log('\n🔹 Document grids/lists:');
    console.log('achievements-grid exists:', !!document.getElementById('achievements-grid'));
    console.log('certificates-grid exists:', !!document.getElementById('certificates-grid'));
    console.log('extracurricular-list exists:', !!document.getElementById('extracurricular-list'));

    console.log('\n🔹 Empty states:');
    console.log('achievements-empty-state exists:', !!document.getElementById('achievements-empty-state'));
    console.log('certificates-empty-state exists:', !!document.getElementById('certificates-empty-state'));
    console.log('extracurricular-empty-state exists:', !!document.getElementById('extracurricular-empty-state'));

    console.log('\n🔹 Document sections:');
    console.log('doc-section-achievement exists:', !!document.getElementById('doc-section-achievement'));
    console.log('doc-section-academics exists:', !!document.getElementById('doc-section-academics'));
    console.log('doc-section-extracurricular exists:', !!document.getElementById('doc-section-extracurricular'));

    console.log('\n🔹 Current section visibility:');
    const sections = document.querySelectorAll('.document-section');
    sections.forEach(section => {
        console.log(`${section.id}: hidden=${section.classList.contains('hidden')}`);
    });

    console.log('\n🔹 Document cards currently in DOM:');
    const cards = document.querySelectorAll('.document-card');
    console.log('Total document cards:', cards.length);
    cards.forEach((card, index) => {
        console.log(`Card ${index + 1}:`, card.textContent.substring(0, 50) + '...');
    });
}, 2000);

// ============================================
// 4. CHECK FUNCTIONS
// ============================================
console.log('\n\n📋 4. FUNCTIONS CHECK:');
console.log('----------------------------');

setTimeout(() => {
    console.log('renderDocuments function exists:', typeof renderDocuments !== 'undefined');
    console.log('loadDocumentsByType function exists:', typeof loadDocumentsByType !== 'undefined');
    console.log('loadDocumentStats function exists:', typeof loadDocumentStats !== 'undefined');
    console.log('switchDocumentSection function exists:', typeof switchDocumentSection !== 'undefined');
    console.log('createDocumentCard function exists:', typeof createDocumentCard !== 'undefined');
    console.log('createExtracurricularListItem function exists:', typeof createExtracurricularListItem !== 'undefined');
    console.log('deleteDocument function exists:', typeof deleteDocument !== 'undefined');
    console.log('escapeHtml function exists:', typeof escapeHtml !== 'undefined');
}, 1000);

// ============================================
// 5. MANUAL TRIGGER
// ============================================
console.log('\n\n📋 5. MANUAL TRIGGER TEST:');
console.log('----------------------------');
console.log('Manually triggering document load in 3 seconds...');

setTimeout(() => {
    console.log('\n🔹 Triggering switchDocumentSection("achievement")...');
    try {
        if (typeof switchDocumentSection !== 'undefined') {
            switchDocumentSection('achievement');
            console.log('✅ Function called successfully');
        } else {
            console.error('❌ switchDocumentSection function not found');
        }
    } catch (error) {
        console.error('❌ Error calling function:', error);
    }
}, 3000);

console.log('\n✅ Debug script loaded! Check console output above and wait for async tests to complete.\n');
