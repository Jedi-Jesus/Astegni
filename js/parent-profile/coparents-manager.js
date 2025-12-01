/**
 * Co-Parents Manager for Parent Profile
 * Handles co-parent management functionality
 */

const API_BASE_URL = 'https://api.astegni.com';

// Modal Management
function openAddCoParentModal() {
    document.getElementById('addCoParentModal').style.display = 'flex';
}

function closeAddCoParentModal() {
    document.getElementById('addCoParentModal').style.display = 'none';
    document.getElementById('addCoParentForm').reset();
}

// Save Co-Parent
async function saveCoParent() {
    const firstName = document.getElementById('coparentFirstName').value.trim();
    const fatherName = document.getElementById('coparentFatherName').value.trim();
    const grandfatherName = document.getElementById('coparentGrandfatherName').value.trim();
    const email = document.getElementById('coparentEmail').value.trim();
    const phone = document.getElementById('coparentPhone').value.trim();
    const gender = document.getElementById('coparentGender').value;
    const relationshipType = document.getElementById('coparentRelationshipType').value;

    // Validation
    if (!firstName || !fatherName || !grandfatherName) {
        showNotification('Please fill in all required fields (First Name, Father Name, Grandfather Name)', 'error');
        return;
    }

    if (!email && !phone) {
        showNotification('Please provide either email or phone number', 'error');
        return;
    }

    if (!relationshipType) {
        showNotification('Please select a relationship type', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login first', 'error');
            return;
        }

        // Show loading state
        const submitButton = event.target;
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Adding Co-Parent...';
        submitButton.disabled = true;

        // Prepare request body as FormData
        const formData = new URLSearchParams();
        formData.append('first_name', firstName);
        formData.append('father_name', fatherName);
        formData.append('grandfather_name', grandfatherName);
        if (email) formData.append('email', email);
        if (phone) formData.append('phone', phone);
        if (gender) formData.append('gender', gender);
        formData.append('relationship_type', relationshipType);

        const response = await fetch(`${API_BASE_URL}/api/parent/add-coparent?${formData.toString()}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(
                `Co-parent added successfully! ${data.existing ? 'Existing user linked.' : 'Login credentials sent via email/SMS.'}`,
                'success'
            );
            closeAddCoParentModal();

            // Refresh co-parents list
            await loadCoParents();

            // Show temp password in development (remove in production)
            if (data.temp_password && !data.existing) {
                console.log('🔑 Temporary Password:', data.temp_password);
                console.log('⚠️ This password will be sent via email/SMS in production');
            }
        } else {
            showNotification(data.detail || 'Failed to add co-parent', 'error');
        }

        // Restore button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;

    } catch (error) {
        console.error('Error adding co-parent:', error);
        showNotification('An error occurred while adding co-parent', 'error');

        // Restore button state
        const submitButton = document.querySelector('#addCoParentModal .btn-primary');
        submitButton.textContent = 'Add Co-Parent';
        submitButton.disabled = false;
    }
}

// Load Co-Parents
async function loadCoParents() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, skipping co-parents load');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/parent/coparents`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayCoParents(data.coparents || []);

            // Update badge count
            const badgeCount = document.getElementById('coparents-count');
            if (badgeCount) {
                badgeCount.textContent = data.total || 0;
                badgeCount.style.display = data.total > 0 ? 'inline-block' : 'none';
            }
        } else {
            console.error('Failed to load co-parents:', response.status);
        }
    } catch (error) {
        console.error('Error loading co-parents:', error);
    }
}

// Display Co-Parents
function displayCoParents(coparents) {
    const grid = document.getElementById('coparents-grid');
    const emptyState = document.getElementById('coparents-empty-state');

    if (!coparents || coparents.length === 0) {
        // Show empty state
        if (emptyState) emptyState.style.display = 'block';
        // Clear grid except empty state
        Array.from(grid.children).forEach(child => {
            if (child.id !== 'coparents-empty-state') {
                child.remove();
            }
        });
        return;
    }

    // Hide empty state
    if (emptyState) emptyState.style.display = 'none';

    // Clear grid
    grid.innerHTML = '';

    // Add co-parent cards
    coparents.forEach(coparent => {
        const card = createCoParentCard(coparent);
        grid.appendChild(card);
    });
}

// Create Co-Parent Card
function createCoParentCard(coparent) {
    const card = document.createElement('div');
    card.className = 'child-card'; // Reusing child-card styles

    card.innerHTML = `
        <div class="child-card-header">
            <img src="${coparent.profile_picture || 'https://via.placeholder.com/80'}"
                 alt="${coparent.name}"
                 class="child-avatar">
            <div class="child-info">
                <h3 class="child-name">${coparent.name || 'Unknown'}</h3>
                <p class="child-grade">${coparent.relationship_type || 'Co-parent'} • ${coparent.gender || ''}</p>
            </div>
        </div>

        <div class="child-stats" style="grid-template-columns: 1fr 1fr;">
            <div class="child-stat-item">
                <span class="child-stat-icon">📧</span>
                <span class="child-stat-label">${coparent.email || 'No email'}</span>
            </div>
            <div class="child-stat-item">
                <span class="child-stat-icon">📱</span>
                <span class="child-stat-label">${coparent.phone || 'No phone'}</span>
            </div>
        </div>

        <div class="child-actions">
            <button class="child-action-btn view-details-btn"
                    onclick="viewCoParentProfile(${coparent.user_id})">
                <i class="fas fa-eye"></i> View Profile
            </button>
            <button class="child-action-btn quick-message-btn">
                <i class="fas fa-comment"></i> Message
            </button>
        </div>
    `;

    return card;
}

// View Co-Parent Profile
function viewCoParentProfile(userId) {
    // Navigate to view-parent.html with user ID
    window.location.href = `../view-profiles/view-parent.html?user_id=${userId}`;
}

// Notification Helper (reuse existing notification system if available)
function showNotification(message, type = 'info') {
    // Check if there's an existing notification system
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }

    // Fallback: Simple alert-based notification
    if (type === 'error') {
        alert('❌ ' + message);
    } else if (type === 'success') {
        alert('✅ ' + message);
    } else {
        alert('ℹ️ ' + message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load co-parents when navigating to co-parents panel
    const coparentsLink = document.querySelector('[onclick*="co-parents"]');
    if (coparentsLink) {
        coparentsLink.addEventListener('click', () => {
            loadCoParents();
        });
    }

    // Initial load if we're on the co-parents panel
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('panel') === 'co-parents') {
        loadCoParents();
    }

    console.log('✅ Co-Parents Manager initialized');
});
