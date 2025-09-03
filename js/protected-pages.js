// js/protected-page.js
async function enforceAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Please login to access this page');
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            localStorage.clear();
            alert('Your session has expired. Please login again.');
            window.location.href = '../index.html';
            return false;
        }
        
        const data = await response.json();
        // Store user info for the page to use
        window.currentUser = data.user;
        return true;
        
    } catch (error) {
        console.error('Auth verification failed:', error);
        alert('Unable to verify authentication. Please try again.');
        window.location.href = '../index.html';
        return false;
    }
}

// Run immediately when script loads
enforceAuth();