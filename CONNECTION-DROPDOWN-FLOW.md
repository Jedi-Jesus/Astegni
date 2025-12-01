# Connection Dropdown Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTION FLOW DIAGRAM                       │
└─────────────────────────────────────────────────────────────────┘

START: User Views Tutor Profile
         │
         ▼
    ┌─────────┐
    │🔗 Connect│  ← Initial state
    └─────────┘
         │
         │ User clicks "Connect"
         ▼
    ┌──────────────┐
    │⏳ Sending... │  ← Temporary loading state
    └──────────────┘
         │
         │ Backend: POST /api/connections
         │ Response: { status: "connecting", id: 123 }
         ▼
    ┌──────────────────┐
    │⏳ Connecting... ▼│  ← NEW! Dropdown button
    └──────────────────┘
         │
         │ User has 2 options:
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Option A]  [Option B]
 Click      Click
 Arrow     Outside
    │         │
    │         └─→ Dropdown closes (no action)
    │                   │
    │                   └─→ Back to "⏳ Connecting... ▼"
    │
    ▼
┌──────────────────┐
│⏳ Connecting... ▲│  ← Dropdown open (arrow rotated)
├──────────────────┤
│✗ Cancel Connection│  ← Red text, clickable
└──────────────────┘
    │
    │ User clicks "Cancel Connection"
    ▼
┌───────────────────┐
│⏳ Cancelling...   │  ← Temporary loading state
└───────────────────┘
    │
    │ Backend: DELETE /api/connections/123
    │ Response: Success
    ▼
┌─────────┐
│🔗 Connect│  ← Back to initial state!
└─────────┘
    │
    │ Notification: "Connection request cancelled"
    │
   END
```

## Detailed State Machine

```
╔═══════════════════════════════════════════════════════════════╗
║                    CONNECTION STATES                          ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────┐
│   null      │  No connection exists
│ 🔗 Connect  │  Button: Regular button, no dropdown
└──────┬──────┘
       │
       │ sendConnectionRequest()
       ▼
┌──────────────────┐
│   connecting     │  Connection request pending (outgoing)
│ Connecting... ▼  │  Button: DROPDOWN (main + menu)
└──────┬───────────┘
       │
       │ Options:
       │ 1. cancelConnectionRequest() → goes to null
       │ 2. Tutor accepts → goes to connected
       │ 3. Tutor rejects → goes to connection_failed
       │
       ├─(cancel)──────────┐
       │                   ▼
       │              ┌─────────────┐
       │              │   null      │
       │              │ 🔗 Connect  │
       │              └─────────────┘
       │
       ├─(accepted)────────┐
       │                   ▼
       │              ┌─────────────┐
       │              │  connected  │
       │              │ ✓ Connected │
       │              └─────────────┘
       │
       └─(rejected)────────┐
                           ▼
                      ┌──────────────────┐
                      │connection_failed │
                      │✗ Request Declined│
                      └──────────────────┘
```

## Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                  DROPDOWN COMPONENT                          │
└─────────────────────────────────────────────────────────────┘

.connection-dropdown-wrapper (flex: 1; position: relative;)
│
├─ .connection-dropdown-btn (main button)
│  │
│  ├─ <span>⏳ Connecting...</span>
│  │
│  └─ <svg> ▼ (rotates to ▲ when open)
│
└─ .connection-dropdown-menu (absolutely positioned)
   │
   └─ .connection-dropdown-option (cancel button)
      │
      └─ "✗ Cancel Connection"
```

## Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT LISTENERS                           │
└─────────────────────────────────────────────────────────────┘

1. connectTutor() clicked
   └─→ Check authentication
       └─→ Check current status
           └─→ If null/disconnect: sendConnectionRequest()
               └─→ updateConnectionButtonUI()
                   └─→ createConnectingDropdown()
                       └─→ Attach event listeners:
                           │
                           ├─ mainButton.click → toggle dropdown
                           │
                           ├─ cancelOption.click → handleCancelConnection()
                           │   └─→ cancelConnectionRequest(connectionId)
                           │       └─→ DELETE /api/connections/{id}
                           │           └─→ updateConnectionButtonUI()
                           │               └─→ createNewConnectButton()
                           │
                           └─ document.click → close dropdown if outside
```

## API Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS USED                        │
└─────────────────────────────────────────────────────────────┘

1. Send Connection
   POST /api/connections
   Body: {
     target_user_id: 123,
     connection_type: "connect",
     connection_message: null
   }
   Response: {
     id: 456,
     status: "connecting",
     direction: "outgoing"
   }

2. Cancel Connection
   DELETE /api/connections/456
   Headers: { Authorization: "Bearer <token>" }
   Response: { success: true }

3. Check Status
   POST /api/connections/check
   Body: { target_user_id: 123 }
   Response: {
     is_connected: false,
     status: null,
     connection_id: null,
     direction: null
   }
```

## CSS Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                    ANIMATIONS                                │
└─────────────────────────────────────────────────────────────┘

Dropdown Menu:
  Open:
    opacity: 0 → 1
    visibility: hidden → visible
    transform: translateY(-10px) → translateY(0)
    duration: 0.3s ease

  Close:
    (reverse of open)

Dropdown Arrow:
  Closed: rotate(0deg)
  Open: rotate(180deg)
  duration: 0.2s

Cancel Option Hover:
  background: transparent → rgba(244, 67, 54, 0.1)
  duration: 0.2s ease
```

## Color Scheme

```
┌─────────────────────────────────────────────────────────────┐
│                    COLORS USED                               │
└─────────────────────────────────────────────────────────────┘

Connecting State (Yellow):
  Background: rgba(255, 193, 7, 0.1)
  Border: 2px solid #FFC107
  Text: #FFC107

Cancel Option (Red):
  Text: #F44336
  Hover Background: rgba(244, 67, 54, 0.1)

Dropdown Menu:
  Background: var(--card-bg)
  Border: 2px solid #FFC107
  Shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                           │
└─────────────────────────────────────────────────────────────┘

1. No authentication token
   └─→ Show notification: "Please log in to connect with tutors"
       └─→ Open auth modal if available

2. Connection ID missing
   └─→ Show notification: "No connection to cancel"

3. Cancel request fails
   └─→ Show notification: "Failed to cancel connection"
       └─→ Keep dropdown state

4. Network error
   └─→ Show notification: Error message
       └─→ Reset to previous state
```

## Success Paths

```
┌─────────────────────────────────────────────────────────────┐
│                    HAPPY PATHS                               │
└─────────────────────────────────────────────────────────────┘

Path 1: Send and Cancel
  Click Connect
    → "Sending..."
      → "Connecting... ▼"
        → Click dropdown
          → Click "Cancel Connection"
            → "Cancelling..."
              → "Connect"
                → Notification: "Connection request cancelled"

Path 2: Send and Wait for Acceptance
  Click Connect
    → "Sending..."
      → "Connecting... ▼"
        → (Tutor accepts in background)
          → Auto-update to "✓ Connected"
            → Notification: "Connection accepted!"

Path 3: Close Dropdown Without Action
  "Connecting... ▼"
    → Click dropdown
      → Dropdown opens
        → Click outside
          → Dropdown closes
            → Still "Connecting... ▼"
```

This comprehensive flow diagram shows all possible states, transitions, and user interactions with the new dropdown feature!
