# Astegni Connect - Smart UI Guide

## Context-Aware Button States (Smart Design!)

The UI should show **different buttons** depending on whether you're the **sender** or **receiver** of a connection request.

---

## Connection Status from Different Perspectives

### When YOU send a request (Outgoing)

```javascript
// Check if you're the sender
if (connection.initiated_by === currentUserId) {
    // You sent the request
    if (connection.status === 'connecting') {
        button.text = 'Connecting...';
        button.disabled = true;
        button.class = 'btn-secondary';
    }
}
```

**Visual:**
```
┌─────────────────────────┐
│    [Connecting...]      │  ← Gray, disabled
│  (You sent the request) │
└─────────────────────────┘
```

### When THEY send you a request (Incoming)

```javascript
// Check if they sent you the request
if (connection.user_id_2 === currentUserId && connection.status === 'connecting') {
    // They want to connect with you - show action buttons
    showButtons(['Accept Connection', 'Decline']);
}
```

**Visual:**
```
┌─────────────────────────────────────┐
│  [Accept Connection]  [Decline]     │  ← Green + Red
│  (They want to connect with you)    │
└─────────────────────────────────────┘
```

---

## Complete Button State Logic

### State 1: Not Connected
```javascript
if (!connection) {
    button.text = '+ Connect';
    button.class = 'btn-primary';
    button.onclick = () => sendConnectionRequest();
}
```

**Display:**
```
┌──────────────┐
│  + Connect   │  ← Blue, clickable
└──────────────┘
```

---

### State 2: Connecting - YOU Sent Request (Outgoing)
```javascript
if (connection.status === 'connecting' && connection.initiated_by === currentUserId) {
    button.text = 'Connecting...';
    button.class = 'btn-secondary';
    button.disabled = true;

    // Optional: Add cancel button
    showCancelButton();
}
```

**Display:**
```
┌─────────────────────────────┐
│  [Connecting...] [Cancel]   │  ← Gray + Red outline
└─────────────────────────────┘
```

---

### State 3: Connecting - THEY Sent Request (Incoming)
```javascript
if (connection.status === 'connecting' && connection.user_id_2 === currentUserId) {
    // Show accept/decline buttons
    showActionButtons([
        { text: 'Accept Connection', class: 'btn-success', action: acceptConnection },
        { text: 'Decline', class: 'btn-outline-danger', action: declineConnection }
    ]);
}
```

**Display:**
```
┌────────────────────────────────────────┐
│  [Accept Connection]  [Decline]        │  ← Green + Red outline
└────────────────────────────────────────┘

With optional message:
┌────────────────────────────────────────┐
│  "John Doe wants to connect with you"  │
│  [Accept Connection]  [Decline]        │
└────────────────────────────────────────┘
```

---

### State 4: Connected
```javascript
if (connection.status === 'connected') {
    button.text = 'Connected ✓';
    button.class = 'btn-success';

    // Add dropdown for disconnect/block
    showDropdown([
        { text: 'Disconnect', action: disconnect },
        { text: 'Block User', action: blockUser }
    ]);
}
```

**Display:**
```
┌──────────────────────┐
│  Connected ✓  ▼     │  ← Green with dropdown
└──────────────────────┘
    ↓ (when clicked)
┌──────────────────────┐
│  Disconnect          │
│  Block User          │
└──────────────────────┘
```

---

### State 5: Disconnected
```javascript
if (connection.status === 'disconnect') {
    button.text = 'Reconnect';
    button.class = 'btn-outline-primary';
    button.onclick = () => sendConnectionRequest();
}
```

**Display:**
```
┌──────────────┐
│  Reconnect   │  ← Blue outline
└──────────────┘
```

---

### State 6: Connection Failed
```javascript
if (connection.status === 'connection_failed') {
    button.text = 'Request Declined';
    button.class = 'btn-outline-secondary';
    button.disabled = true;

    // Optional: Allow retry after some time
    setTimeout(() => {
        button.text = 'Try Again';
        button.disabled = false;
    }, 60000); // 1 minute
}
```

**Display:**
```
┌──────────────────────┐
│  Request Declined    │  ← Gray outline, disabled
└──────────────────────┘
```

---

### State 7: Blocked
```javascript
if (connection.status === 'blocked') {
    if (connection.initiated_by === currentUserId) {
        // You blocked them
        button.text = 'Blocked';
        button.class = 'btn-danger';
        button.onclick = () => unblockUser();
    } else {
        // They blocked you - hide button or show nothing
        hideButton();
    }
}
```

**Display (if you blocked them):**
```
┌──────────────┐
│  Blocked     │  ← Red, clickable to unblock
└──────────────┘
```

---

## Complete JavaScript Implementation

```javascript
/**
 * Render smart connection button based on context
 * @param {Object} connection - Connection object from API
 * @param {number} currentUserId - Current logged-in user ID
 * @param {number} targetUserId - Profile being viewed
 */
function renderConnectionButton(connection, currentUserId, targetUserId) {
    const container = document.getElementById('connection-button-container');

    // Case 1: No connection exists
    if (!connection) {
        container.innerHTML = `
            <button class="btn btn-primary" onclick="sendConnectionRequest(${targetUserId})">
                <i class="fas fa-user-plus"></i> Connect
            </button>
        `;
        return;
    }

    // Determine if current user is sender or receiver
    const isSender = connection.initiated_by === currentUserId;
    const isReceiver = connection.user_id_2 === currentUserId;

    // Case 2: Connecting - YOU sent the request (outgoing)
    if (connection.status === 'connecting' && isSender) {
        container.innerHTML = `
            <button class="btn btn-secondary" disabled>
                <i class="fas fa-clock"></i> Connecting...
            </button>
            <button class="btn btn-outline-danger btn-sm ms-2"
                    onclick="cancelConnectionRequest(${connection.id})">
                Cancel
            </button>
        `;
        return;
    }

    // Case 3: Connecting - THEY sent you the request (incoming)
    if (connection.status === 'connecting' && isReceiver) {
        const senderName = connection.user_1_name || 'This user';
        container.innerHTML = `
            <div class="connection-request-card">
                <p class="mb-2">
                    <strong>${senderName}</strong> wants to connect with you
                    ${connection.connection_message ?
                        `<br><small class="text-muted">"${connection.connection_message}"</small>` :
                        ''}
                </p>
                <button class="btn btn-success"
                        onclick="acceptConnection(${connection.id})">
                    <i class="fas fa-check"></i> Accept Connection
                </button>
                <button class="btn btn-outline-danger ms-2"
                        onclick="declineConnection(${connection.id})">
                    <i class="fas fa-times"></i> Decline
                </button>
            </div>
        `;
        return;
    }

    // Case 4: Connected
    if (connection.status === 'connected') {
        container.innerHTML = `
            <div class="btn-group">
                <button class="btn btn-success" disabled>
                    <i class="fas fa-check-circle"></i> Connected
                </button>
                <button class="btn btn-success dropdown-toggle dropdown-toggle-split"
                        data-bs-toggle="dropdown">
                </button>
                <ul class="dropdown-menu">
                    <li>
                        <a class="dropdown-item"
                           onclick="disconnectConnection(${connection.id})">
                            <i class="fas fa-unlink"></i> Disconnect
                        </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item text-danger"
                           onclick="blockUser(${targetUserId})">
                            <i class="fas fa-ban"></i> Block User
                        </a>
                    </li>
                </ul>
            </div>
        `;
        return;
    }

    // Case 5: Disconnected
    if (connection.status === 'disconnect') {
        container.innerHTML = `
            <button class="btn btn-outline-primary"
                    onclick="sendConnectionRequest(${targetUserId})">
                <i class="fas fa-redo"></i> Reconnect
            </button>
        `;
        return;
    }

    // Case 6: Connection Failed
    if (connection.status === 'connection_failed') {
        container.innerHTML = `
            <button class="btn btn-outline-secondary" disabled>
                <i class="fas fa-times-circle"></i> Request Declined
            </button>
            <button class="btn btn-outline-primary btn-sm ms-2"
                    onclick="sendConnectionRequest(${targetUserId})">
                Try Again
            </button>
        `;
        return;
    }

    // Case 7: Blocked
    if (connection.status === 'blocked') {
        if (isSender) {
            // You blocked them
            container.innerHTML = `
                <button class="btn btn-danger"
                        onclick="unblockUser(${connection.id})">
                    <i class="fas fa-ban"></i> Blocked (Click to Unblock)
                </button>
            `;
        } else {
            // They blocked you - don't show button
            container.innerHTML = '';
        }
        return;
    }
}

/**
 * Check connection status and render appropriate button
 */
async function loadConnectionButton(targetUserId) {
    try {
        const response = await fetch('http://localhost:8000/api/connections/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ target_user_id: targetUserId })
        });

        const data = await response.json();
        const currentUserId = getCurrentUserId(); // Get from auth state

        if (data.is_connected || data.status) {
            // Connection exists - get full details
            const connResponse = await fetch(
                `http://localhost:8000/api/connections/${data.connection_id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            const connection = await connResponse.json();
            renderConnectionButton(connection, currentUserId, targetUserId);
        } else {
            // No connection
            renderConnectionButton(null, currentUserId, targetUserId);
        }
    } catch (error) {
        console.error('Error loading connection button:', error);
    }
}

/**
 * Send connection request
 */
async function sendConnectionRequest(targetUserId) {
    try {
        const response = await fetch('http://localhost:8000/api/connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                target_user_id: targetUserId,
                connection_type: 'connect',
                connection_message: 'Hi! Let\'s connect on Astegni!'
            })
        });

        if (response.ok) {
            showNotification('Connection request sent!', 'success');
            loadConnectionButton(targetUserId); // Refresh button
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Failed to send request', 'error');
        }
    } catch (error) {
        console.error('Error sending connection request:', error);
        showNotification('Network error', 'error');
    }
}

/**
 * Accept connection request
 */
async function acceptConnection(connectionId) {
    try {
        const response = await fetch(`http://localhost:8000/api/connections/${connectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: 'connected' })
        });

        if (response.ok) {
            showNotification('Connection accepted!', 'success');
            location.reload(); // Refresh to update UI
        }
    } catch (error) {
        console.error('Error accepting connection:', error);
    }
}

/**
 * Decline connection request
 */
async function declineConnection(connectionId) {
    try {
        const response = await fetch(`http://localhost:8000/api/connections/${connectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: 'connection_failed' })
        });

        if (response.ok) {
            showNotification('Connection request declined', 'info');
            location.reload();
        }
    } catch (error) {
        console.error('Error declining connection:', error);
    }
}

/**
 * Disconnect from user
 */
async function disconnectConnection(connectionId) {
    if (!confirm('Are you sure you want to disconnect?')) return;

    try {
        const response = await fetch(`http://localhost:8000/api/connections/${connectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: 'disconnect' })
        });

        if (response.ok) {
            showNotification('Disconnected', 'info');
            location.reload();
        }
    } catch (error) {
        console.error('Error disconnecting:', error);
    }
}
```

---

## CSS Styles

```css
/* Connection button container */
#connection-button-container {
    margin: 1rem 0;
}

/* Connection request card (for incoming requests) */
.connection-request-card {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #28a745;
}

.connection-request-card p {
    margin-bottom: 0.5rem;
}

/* Button states */
.btn-primary {
    background-color: #007bff;
    border-color: #007bff;
}

.btn-success {
    background-color: #28a745;
    border-color: #28a745;
}

.btn-secondary {
    background-color: #6c757d;
    border-color: #6c757d;
}

.btn-danger {
    background-color: #dc3545;
    border-color: #dc3545;
}

/* Disabled state */
.btn:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}

/* Connected button with dropdown */
.btn-group .btn-success {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.btn-group .dropdown-toggle-split {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}
```

---

## Example HTML Structure

```html
<!-- Profile header with connection button -->
<div class="profile-header">
    <div class="profile-info">
        <img src="profile-picture.jpg" alt="Profile" class="profile-picture">
        <div>
            <h2>John Doe</h2>
            <p>Mathematics Tutor</p>
        </div>
    </div>

    <!-- Smart connection button renders here -->
    <div id="connection-button-container">
        <!-- Button will be rendered by JavaScript -->
    </div>
</div>

<script>
    // Load button when page loads
    document.addEventListener('DOMContentLoaded', () => {
        const profileUserId = 75; // Get from page data
        loadConnectionButton(profileUserId);
    });
</script>
```

---

## Summary: Smart Button States

| Your Perspective | Status | Button Display |
|-----------------|--------|----------------|
| You sent request | `connecting` | "Connecting..." (disabled) |
| They sent request | `connecting` | "Accept Connection" \| "Decline" |
| Either party | `connected` | "Connected ✓" (with dropdown) |
| Either party | `disconnect` | "Reconnect" |
| You sent request | `connection_failed` | "Request Declined" |
| You blocked them | `blocked` | "Blocked" (click to unblock) |
| They blocked you | `blocked` | (hide button) |
| No connection | - | "+ Connect" |

---

**This is what makes Astegni Connect smart and user-friendly!** 🧠✨

The button **adapts** based on:
1. ✅ Who initiated the connection
2. ✅ Current connection status
3. ✅ User's role (sender vs receiver)

**Your smartness observation is spot-on!** 🎯
