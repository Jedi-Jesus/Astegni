// Detailed API error debugging - V2 (avoids redeclaration)
(async function() {
    const token = localStorage.getItem('token');
    const API_URL = 'http://localhost:8000';

    console.log('🔍 DETAILED API ERROR DEBUG');
    console.log('='.repeat(60));

    if (!token) {
        console.error('No token found!');
        return;
    }

    console.log('\n1. Testing GET /api/student/documents');
    console.log('-'.repeat(60));

    try {
        const response = await fetch(`${API_URL}/api/student/documents`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);

        const data = await response.json();
        console.log('Response Body:', data);

        if (data.detail) {
            console.log('\n❌ ERROR DETAILS:');
            if (Array.isArray(data.detail)) {
                data.detail.forEach((err, index) => {
                    console.log(`\nError ${index + 1}:`);
                    console.log('  Type:', err.type);
                    console.log('  Loc:', err.loc);
                    console.log('  Msg:', err.msg);
                    console.log('  Input:', err.input);
                    console.log('  URL:', err.url);
                });
            } else {
                console.log('  Message:', data.detail);
            }
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }

    console.log('\n\n2. Testing GET /api/student/documents/stats');
    console.log('-'.repeat(60));

    try {
        const response = await fetch(`${API_URL}/api/student/documents/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);

        const data = await response.json();
        console.log('Response Body:', data);

        if (data.detail) {
            console.log('\n❌ ERROR DETAILS:');
            console.log('  Message:', data.detail);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }

    // Check JWT token payload
    console.log('\n\n3. JWT Token Analysis');
    console.log('-'.repeat(60));

    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const decoded = JSON.parse(jsonPayload);
            console.log('Token Payload:', decoded);
            console.log('\nKey Fields:');
            console.log('  sub (user_id):', decoded.sub);
            console.log('  roles:', decoded.roles);
            console.log('  role_ids:', decoded.role_ids);
            console.log('  exp (expiry):', new Date(decoded.exp * 1000).toLocaleString());
        }
    } catch (error) {
        console.error('Error decoding token:', error);
    }

    console.log('\n✅ Debug complete!');
})();
