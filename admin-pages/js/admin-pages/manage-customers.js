// Customer Service Functions
// Page-specific JavaScript for manage-customers.html

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Customer Service page loaded');

    // Initialize panel manager
    if (typeof initializePanelManager === 'function') {
        initializePanelManager();
    }

    // Set active sidebar link
    updateActiveSidebarLink();

    // Initialize live chat if on live-chat panel
    const currentPanel = new URLSearchParams(window.location.search).get('panel');
    if (currentPanel === 'live-chat') {
        initializeLiveChat();
    }
});

// Update active sidebar link based on current panel
function updateActiveSidebarLink() {
    const currentPanel = new URLSearchParams(window.location.search).get('panel') || 'dashboard';
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkText = link.textContent.toLowerCase();

        if (currentPanel === 'dashboard' && linkText.includes('dashboard')) {
            link.classList.add('active');
        } else if (currentPanel === 'active-tickets' && linkText.includes('active tickets')) {
            link.classList.add('active');
        } else if (currentPanel === 'resolved-tickets' && linkText.includes('resolved tickets')) {
            link.classList.add('active');
        } else if (currentPanel === 'messages' && linkText.includes('customer messages')) {
            link.classList.add('active');
        } else if (currentPanel === 'live-chat' && linkText.includes('live chat')) {
            link.classList.add('active');
        } else if (currentPanel === 'feedback' && linkText.includes('customer feedback')) {
            link.classList.add('active');
        }
    });
}

// FAQ Manager Modal
function openFAQManager() {
    console.log('Opening FAQ Manager...');
    alert('Opening FAQ Manager...');
    // TODO: Implement FAQ manager modal
}

// Canned Responses Modal
function openCannedResponses() {
    console.log('Opening Canned Responses...');
    alert('Opening Canned Responses Manager...');
    // TODO: Implement canned responses modal
}

// Customer Analytics Modal
function openCustomerAnalytics() {
    console.log('Opening Customer Analytics...');
    alert('Opening Customer Analytics Dashboard...');
    // TODO: Implement analytics modal
}

// Create New Ticket Function
function createNewTicket() {
    console.log('Creating new ticket...');
    // TODO: Implement new ticket modal
    alert('Opening new ticket form...');
}

// View Ticket Details
function viewTicket(ticketId) {
    console.log('Viewing ticket:', ticketId);
    // TODO: Implement ticket view modal
    alert(`Opening ticket #${ticketId}`);
}

// Assign Ticket to Agent
function assignTicket(ticketId) {
    console.log('Assigning ticket:', ticketId);
    // TODO: Implement ticket assignment
    const agent = prompt('Assign ticket to agent:');
    if (agent) {
        alert(`Ticket #${ticketId} assigned to ${agent}`);
    }
}

// Handle Reply to Ticket
function replyToTicket(ticketId) {
    console.log('Replying to ticket:', ticketId);
    // TODO: Implement reply functionality
}

// Mark Ticket as Resolved
function resolveTicket(ticketId) {
    if (confirm(`Mark ticket #${ticketId} as resolved?`)) {
        console.log('Resolving ticket:', ticketId);
        // TODO: Implement ticket resolution
        alert(`Ticket #${ticketId} has been resolved!`);
    }
}

// Escalate Ticket
function escalateTicket(ticketId) {
    if (confirm(`Escalate ticket #${ticketId} to higher support?`)) {
        console.log('Escalating ticket:', ticketId);
        // TODO: Implement escalation
        alert(`Ticket #${ticketId} has been escalated!`);
    }
}

// Live Chat Functions
let activeChatSession = null;
let chatQueue = [];

function initializeLiveChat() {
    console.log('Initializing live chat system...');
    // TODO: Connect to WebSocket for real-time chat
    simulateChatQueue();
}

function simulateChatQueue() {
    // Simulate incoming chat requests
    chatQueue = [
        { id: 'chat_001', customer: 'parent_234', waitTime: 2 },
        { id: 'chat_002', customer: 'tutor_567', waitTime: 5 }
    ];
    updateChatQueue();
}

function updateChatQueue() {
    // Update the waiting queue display
    console.log('Updating chat queue:', chatQueue);
}

function acceptChat(chatId) {
    console.log('Accepting chat:', chatId);
    activeChatSession = chatId;
    // TODO: Implement chat acceptance
    alert(`Chat session started with ${chatId}`);
}

function endChatSession() {
    if (confirm('End current chat session?')) {
        console.log('Ending chat session:', activeChatSession);
        activeChatSession = null;
        // TODO: Implement chat ending
    }
}

function sendChatMessage(message) {
    console.log('Sending message:', message);
    // TODO: Implement message sending
}

// Customer Message Functions
function openMessage(messageId) {
    console.log('Opening message:', messageId);
    // TODO: Load and display message content
}

function replyToMessage(messageId) {
    console.log('Replying to message:', messageId);
    // TODO: Implement reply functionality
}

function markMessageAsRead(messageId) {
    console.log('Marking message as read:', messageId);
    // TODO: Update message status
}

// Feedback Functions
function replyToFeedback(feedbackId) {
    console.log('Replying to feedback:', feedbackId);
    const reply = prompt('Enter your reply to the customer feedback:');
    if (reply) {
        // TODO: Send reply
        alert('Reply sent successfully!');
    }
}

function markAsFeatured(feedbackId) {
    console.log('Marking feedback as featured:', feedbackId);
    // TODO: Mark feedback as featured
    alert('Feedback marked as featured!');
}

function forwardToTeam(feedbackId) {
    console.log('Forwarding feedback to team:', feedbackId);
    const team = prompt('Forward to which team? (Technical/Product/Management)');
    if (team) {
        // TODO: Forward feedback
        alert(`Feedback forwarded to ${team} team!`);
    }
}

// Broadcast Message Function
function sendBroadcastMessage() {
    console.log('Sending broadcast message...');
    // TODO: Implement broadcast modal
    alert('Opening broadcast message composer...');
}

// Generate Support Report
function generateSupportReport() {
    console.log('Generating support report...');
    // TODO: Implement report generation
    alert('Generating support report...');
}

// Search Functions
function searchTickets(query) {
    console.log('Searching tickets:', query);
    // TODO: Implement search
}

function filterTickets(filter) {
    console.log('Filtering tickets by:', filter);
    // TODO: Implement filtering
}

// Profile Modal Functions (shared with other admin pages)
function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle Profile Update
function handleProfileUpdate(event) {
    event.preventDefault();
    console.log('Updating profile...');
    // TODO: Implement profile update
    alert('Profile updated successfully!');
    closeEditProfileModal();
}

// Preview Profile Picture
function previewProfilePicture(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            const previewImg = document.getElementById('profilePreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Handle Profile Picture Upload
function handleProfilePictureUpload() {
    console.log('Uploading profile picture...');
    // TODO: Implement upload
    alert('Profile picture uploaded successfully!');
    closeUploadProfileModal();
}

// Preview Cover Image
function previewCoverImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('coverPreview');
            const previewImg = document.getElementById('coverPreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Handle Cover Image Upload
function handleCoverImageUpload() {
    console.log('Uploading cover image...');
    // TODO: Implement upload
    alert('Cover image uploaded successfully!');
    closeUploadCoverModal();
}

// Customer Satisfaction Metrics
function updateSatisfactionMetrics() {
    console.log('Updating satisfaction metrics...');
    // TODO: Fetch and update metrics from API
}

// Auto-save Draft Messages
let draftTimer;
function autoSaveDraft(ticketId, message) {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
        console.log('Auto-saving draft for ticket:', ticketId);
        localStorage.setItem(`draft_${ticketId}`, message);
    }, 1000);
}

// Load Draft Message
function loadDraft(ticketId) {
    const draft = localStorage.getItem(`draft_${ticketId}`);
    if (draft) {
        console.log('Loading draft for ticket:', ticketId);
        return draft;
    }
    return '';
}

// Logout Function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        // TODO: Implement logout
        window.location.href = '/login';
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K: Quick search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Search"]')?.focus();
    }

    // Ctrl/Cmd + N: New ticket
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewTicket();
    }

    // ESC: Close modals
    if (e.key === 'Escape') {
        closeEditProfileModal();
        closeUploadProfileModal();
        closeUploadCoverModal();
    }
});