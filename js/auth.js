        // Verify authentication on profile pages
        async function checkAuth() {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '../index.html';
                return;
            }

            try {
                const response = await fetch('http://localhost:8000/api/verify-token', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    // Token invalid, redirect to login
                    localStorage.clear();
                    window.location.href = '../index.html';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        // Check auth on page load
        checkAuth();
    