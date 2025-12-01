/*

async function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                window.currentUser = await response.json();
                enableAuthFeatures();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
}

*/

// 3. Fixed profile picture handling in enableAuthFeatures
function enableAuthFeatures() {
    // Enable comment input
    const commentInput = document.getElementById("new-comment");
    const submitButton = document.getElementById("submit-comment");
    if (commentInput) commentInput.disabled = false;
    if (submitButton) submitButton.disabled = false;

    // Show profile
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer && window.currentUser) {
        profileContainer.classList.remove('hidden');

        // Update profile info with null safety
        const profilePic = document.getElementById('profile-pic');
        const profileName = document.getElementById('profile-name');
        
        if (profilePic) {
            profilePic.src = UrlHelper.getProfilePictureUrl(
                window.currentUser.profile_picture,
                window.currentUser.first_name
            );
        }
        
        if (profileName) {
            profileName.textContent = window.currentUser.first_name || 'User';
        }

        // Also update dropdown profile info
        const dropdownPic = document.getElementById('dropdown-profile-pic');
        const dropdownName = document.getElementById('dropdown-user-name');
        const dropdownEmail = document.getElementById('dropdown-user-email');
        const dropdownRole = document.getElementById('dropdown-user-role');
        
        if (dropdownPic) {
            dropdownPic.src = UrlHelper.getProfilePictureUrl(
                window.currentUser.profile_picture,
                window.currentUser.first_name
            );
        }
        
        if (dropdownName) {
            dropdownName.textContent = `${window.currentUser.first_name || ''} ${window.currentUser.father_name || ''}`.trim() || 'User';
        }
        
        if (dropdownEmail) {
            dropdownEmail.textContent = window.currentUser.email || '';
        }
        
        if (dropdownRole) {
            dropdownRole.textContent = window.currentUser.active_role || 'user';
        }
    }
}

