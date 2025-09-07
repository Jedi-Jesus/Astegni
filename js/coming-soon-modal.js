// ============================================
//   COMING SOON MODAL - ENHANCED WITH AUTH
// ============================================

function openComingSoonModal(feature) {
    const modal = document.getElementById('coming-soon-modal');
    const message = document.getElementById('coming-soon-message');

    if (!modal || !message) return;

    // Customize message based on feature
    const messages = {
        'news': 'Our news section is being crafted to bring you the latest updates in education and technology!',
        'store': 'Our bookstore is being stocked with amazing educational resources. Get ready to explore!',
        'find-jobs': 'Our job portal is being designed to connect talented individuals with great opportunities!',
        'market': 'Our market place is being '
    };

    message.textContent = messages[feature] || "We're working hard to bring you this feature. Stay tuned!";

    // Update modal content based on authentication and page type
    updateComingSoonModalForCurrentPage();

    openModal('coming-soon-modal');
}

function updateComingSoonModalForCurrentPage() {
    const form = document.getElementById('coming-soon-form');
    const authFooter = document.querySelector('.auth-footer');
    
    // Check if we're on an authenticated page (where form was deleted)
    const isAuthenticatedPage = window.location.pathname.includes('find-tutors') || 
                                window.location.pathname.includes('reels') ||
                                window.location.pathname.includes('profile') ||
                                !form; // If form doesn't exist, it's an authenticated page
    
    if (isAuthenticatedPage) {
        // For authenticated pages - always show logged-in state
        showLoggedInContent();
    } else {
        // For public pages - check if user is logged in
        if (typeof APP_STATE !== 'undefined' && APP_STATE.isLoggedIn && APP_STATE.currentUser) {
            form.style.display = 'none';
            showLoggedInContent();
        } else {
            // Show form for non-logged-in users
            if (form) {
                form.style.display = 'block';
            }
            // Remove any logged-in message if it exists
            const loggedInMessage = document.getElementById('coming-soon-logged-in-message');
            if (loggedInMessage) {
                loggedInMessage.remove();
            }
            // Standard footer text
            if (authFooter) {
                authFooter.innerHTML = `Expected launch: <strong>Q2 2025</strong>`;
            }
        }
    }
}

function showLoggedInContent() {
    const form = document.getElementById('coming-soon-form');
    const authFooter = document.querySelector('.auth-footer');
    
    // Hide form if it exists
    if (form) {
        form.style.display = 'none';
    }
    
    // Get user data from APP_STATE or localStorage
    let currentUser = null;
    if (typeof APP_STATE !== 'undefined' && APP_STATE.currentUser) {
        currentUser = APP_STATE.currentUser;
    } else {
        // Fallback to localStorage if APP_STATE isn't available
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                currentUser = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored user data:', e);
            }
        }
    }
    
    // Extract user info
    const userName = currentUser?.first_name || 
                    currentUser?.name?.split(' ')[0] || 
                    'there';
    const userEmail = currentUser?.email || 'your registered email';
    
    // Check if logged-in message already exists
    let loggedInMessage = document.getElementById('coming-soon-logged-in-message');
    
    if (!loggedInMessage) {
        loggedInMessage = document.createElement('div');
        loggedInMessage.id = 'coming-soon-logged-in-message';
        loggedInMessage.className = 'logged-in-message';
        
        // Find where to insert the message
        const modalContent = document.querySelector('.coming-soon-content');
        const featuresSection = document.querySelector('.coming-soon-features');
        
        if (form && form.parentNode) {
            // If form exists, insert before it
            form.parentNode.insertBefore(loggedInMessage, form);
        } else if (featuresSection && featuresSection.nextSibling) {
            // If no form but features section exists, insert after features
            featuresSection.parentNode.insertBefore(loggedInMessage, featuresSection.nextSibling);
        } else if (modalContent) {
            // Otherwise, append to modal content
            modalContent.appendChild(loggedInMessage);
        }
    }
    
    // Update the logged-in message content
    loggedInMessage.innerHTML = `
        <div class="success-check">
            <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
                </path>
            </svg>
        </div>
        <h3 class="logged-in-title">You're all set, ${userName}!</h3>
        <p class="logged-in-text">
            We'll notify you at <strong>${userEmail}</strong> when this feature launches.
        </p>
        <div class="logged-in-benefits">
            <div class="benefit-item">
                <span class="benefit-icon">✨</span>
                <span>Early access guaranteed</span>
            </div>
            <div class="benefit-item">
                <span class="benefit-icon">🎯</span>
                <span>Priority notifications</span>
            </div>
            <div class="benefit-item">
                <span class="benefit-icon">🎁</span>
                <span>Exclusive launch offers</span>
            </div>
        </div>
                            <p class="auth-footer">
                Expected launch: <strong>Q2 2025</strong>
            </p>
    `;
    
    // Update footer text for logged-in users
    if (authFooter) {
        authFooter.innerHTML = `You're on the list! Expected launch: <strong>Q2 2025</strong>`;
    }
}

function handleComingSoonNotification(e) {
    e.preventDefault();
    
    // Check if user is already logged in
    if (typeof APP_STATE !== 'undefined' && APP_STATE.isLoggedIn) {
        showToast('You are already on the notification list!', 'info');
        return;
    }
    
    const email = document.getElementById('notify-email')?.value;

    if (!email) {
        showToast('Please enter your email address', 'warning');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing...';

    // Simulate API call
    setTimeout(() => {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        // Show success message
        showToast('You will be notified when this feature launches!', 'success');

        // Clear form
        document.getElementById('notify-email').value = '';

        // Close modal
        setTimeout(() => {
            closeModal('coming-soon-modal');
        }, 2000);
    }, 1500);
}

// Line 161 in coming-soon-modal.js should be:
window.handleNavLinkClick = function (e, link) {
    // Define coming soon features
    const comingSoonFeatures = ['news', 'store', 'find-jobs'];

    // Check if it's a coming soon feature
    if (comingSoonFeatures.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        openComingSoonModal(link);
        return false;
    }

    // For all other links (reels, find-tutors, etc.), allow normal navigation
    // Since these pages are only accessible to authenticated users,
    // authentication is already handled at the page level
    return true;
};



// Generic modal open function
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Add animation classes if using animate.css
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate__animated', 'animate__zoomIn');
        }
    }
}

// Generic modal close function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        
        // Add closing animation
        if (modalContent) {
            modalContent.classList.remove('animate__zoomIn');
            modalContent.classList.add('animate__zoomOut');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('active');
                document.body.style.overflow = '';
                modalContent.classList.remove('animate__animated', 'animate__zoomOut');
            }, 300);
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Toast container not found');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate__animated animate__slideInRight`;
    
    // Set background color based on type
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    toast.innerHTML = `
        <div class="flex items-center p-4 rounded-lg shadow-lg text-white ${colors[type] || colors.info}">
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('animate__slideInRight');
        toast.classList.add('animate__slideOutRight');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for form if it exists
    const comingSoonForm = document.getElementById('coming-soon-form');
    if (comingSoonForm) {
        comingSoonForm.addEventListener('submit', handleComingSoonNotification);
    }
    
    // Add close button functionality for coming soon modal
    const closeButtons = document.querySelectorAll('.modal-close-enhanced');
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Close modal when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // If on an authenticated page, ensure content is set up correctly
    const isAuthenticatedPage = window.location.pathname.includes('find-tutors') || 
                                window.location.pathname.includes('reels') ||
                                window.location.pathname.includes('profile');
    
    if (isAuthenticatedPage) {
        // Pre-setup the modal for authenticated pages
        const modal = document.getElementById('coming-soon-modal');
        if (modal) {
            showLoggedInContent();
        }
    }
});