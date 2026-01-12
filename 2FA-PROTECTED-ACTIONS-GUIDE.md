# 2FA Protected Actions - Implementation Guide

## Overview

The system now supports protecting sensitive actions (Settings Panel, Packages Panel, Requests Panel) with Two-Factor Authentication. Users with 2FA enabled must verify their identity before performing these actions.

### Protected Panels:
- **Settings Panel**: Account configuration and preferences
- **Packages Panel**: Create, edit, delete tutoring packages
- **Requests Panel**: View, accept, reject session requests and package actions

## Backend Implementation ✅

### 1. Database Changes

**New Columns Added to `users` table:**
```sql
two_factor_verification_token VARCHAR NULL  -- Temporary token for protected actions
two_factor_verification_expiry TIMESTAMP NULL  -- Token expiration (10 minutes)
```

**Migration:** `migrate_add_2fa_verification_token.py` (already run)

### 2. New API Endpoints

#### **Send OTP for Protected Action**
```
POST /api/2fa/send-action-otp
Authorization: Bearer <token>
```

**Response:**
```json
{
    "success": true,
    "message": "OTP sent to j***@gmail.com",
    "email": "j***@gmail.com",
    "expires_in": 300
}
```

**Only works for Email 2FA users.** Sends OTP to user's email with purpose: "Verify Protected Action"

---

#### **Verify 2FA for Protected Action**
```
POST /api/2fa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
    "method": "email|authenticator|inapp",
    "code": "123456",      // For email/authenticator
    "password": "mypass"   // For in-app 2FA
}
```

**Response:**
```json
{
    "success": true,
    "verified": true,
    "message": "2FA verification successful",
    "verification_token": "abc123...xyz789",
    "expires_in": 600
}
```

**Verification Methods:**
- **Email:** Requires 6-digit OTP (sent via `/send-action-otp`)
- **Authenticator:** Requires current TOTP code from authenticator app
- **In-App:** Requires 2FA password (or login password if using that option)

**The verification_token is valid for 10 minutes** and can be used to access protected endpoints.

---

### 3. Protecting Endpoints

**Option A: Using the Middleware (Recommended)**

```python
from utils import require_2fa_verification
from fastapi import Depends, Header

@router.post("/api/packages/create")
async def create_package(
    package_data: PackageCreate,
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """
    Create a new tutoring package (2FA protected)
    Requires X-2FA-Token header with valid verification token if 2FA is enabled
    """
    # Your package creation logic here
    ...
    return {"success": True, "package_id": package.id}
```

**How it works:**
- If user has 2FA disabled → Allows action immediately
- If user has 2FA enabled + valid token → Allows action
- If user has 2FA enabled + no token → Returns 403 with message: "2FA verification required"
- If user has 2FA enabled + invalid/expired token → Returns 401 with appropriate error

---

**Option B: Manual Check (More Control)**

```python
@router.post("/api/settings/update")
async def update_settings(
    settings: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    db: Session = Depends(get_db)
):
    """Update user settings (2FA protected)"""
    user = db.query(User).filter(User.id == current_user.id).first()

    # Check if 2FA verification is required
    if user.two_factor_enabled:
        if not verification_token:
            raise HTTPException(
                status_code=403,
                detail="2FA verification required"
            )

        # Verify token
        if (not user.two_factor_verification_token or
            user.two_factor_verification_token != verification_token):
            raise HTTPException(
                status_code=401,
                detail="Invalid verification token"
            )

        # Check expiry
        if (user.two_factor_verification_expiry and
            user.two_factor_verification_expiry < datetime.utcnow()):
            user.two_factor_verification_token = None
            user.two_factor_verification_expiry = None
            db.commit()
            raise HTTPException(
                status_code=401,
                detail="Verification token expired"
            )

    # Your settings update logic here
    ...
    return {"success": True}
```

---

### 4. Example: Protecting Existing Endpoints

#### **Settings Panel Access**
```python
# In routes.py or settings_endpoints.py

@router.get("/api/settings")
async def get_settings(
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Get user settings (2FA protected if enabled)"""
    # Return settings
    ...
```

#### **Packages Panel Access**
```python
# In package_endpoints.py or routes.py

@router.get("/api/packages")
async def get_packages(
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Get user's packages (2FA protected if enabled)"""
    # Return packages
    ...

@router.post("/api/packages")
async def create_package(
    package: PackageCreate,
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Create tutoring package (2FA protected)"""
    # Create package logic
    ...

@router.put("/api/packages/{package_id}")
async def update_package(
    package_id: int,
    package: PackageUpdate,
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Update package (2FA protected)"""
    # Update package logic
    ...

@router.delete("/api/packages/{package_id}")
async def delete_package(
    package_id: int,
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Delete package (2FA protected)"""
    # Delete package logic
    ...
```

#### **Requests Panel Access (includes all request actions)**
```python
# In session_request_endpoints.py or routes.py

@router.get("/api/session-requests")
async def get_session_requests(
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Get session requests (2FA protected if enabled)"""
    # Return session requests
    ...

@router.post("/api/session-requests/{request_id}/accept")
async def accept_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Accept session request (2FA protected)"""
    # Accept request logic
    ...

@router.post("/api/session-requests/{request_id}/reject")
async def reject_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    verification_token: str | None = Header(default=None, alias="X-2FA-Token"),
    verified: bool = Depends(require_2fa_verification(verification_token)),
    db: Session = Depends(get_db)
):
    """Reject session request (2FA protected)"""
    # Reject request logic
    ...
```

---

## Frontend Implementation (TODO)

### 1. Detection & Verification Flow

```javascript
// Example: Before accessing settings panel
async function accessSettings() {
    const token = localStorage.getItem('token');

    // Step 1: Try to access settings
    const response = await fetch('http://localhost:8000/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 403) {
        // 2FA verification required
        const errorData = await response.json();
        if (errorData.detail === "2FA verification required. Please verify your identity first.") {
            // Show 2FA verification modal
            await showTFAVerificationModal('access_settings');
        }
    } else if (response.ok) {
        // Access granted
        const settings = await response.json();
        displaySettings(settings);
    }
}
```

---

### 2. 2FA Verification Modal

**Reuse existing TFAManager for verification:**

```javascript
const TFAManager = {
    // ... existing methods ...

    // NEW: Verify for protected action
    async verifyForAction(action) {
        // action = 'access_settings', 'create_package', 'accept_package', etc.
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!user.two_factor_enabled) {
            return null; // No verification needed
        }

        // Show verification modal based on method
        if (user.two_factor_method === 'email') {
            return await this.verifyEmailForAction(action);
        } else if (user.two_factor_method === 'authenticator') {
            return await this.verifyAuthenticatorForAction(action);
        } else if (user.two_factor_method === 'inapp') {
            return await this.verifyInAppForAction(action);
        }
    },

    async verifyEmailForAction(action) {
        // Step 1: Send OTP
        const sendResponse = await fetch('http://localhost:8000/api/2fa/send-action-otp', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!sendResponse.ok) return null;

        // Step 2: Show OTP input modal
        const otp = await this.showOTPInputModal(action);

        // Step 3: Verify OTP
        const verifyResponse = await fetch('http://localhost:8000/api/2fa/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method: 'email', code: otp })
        });

        if (verifyResponse.ok) {
            const data = await verifyResponse.json();
            // Store verification token (valid for 10 minutes)
            sessionStorage.setItem('2fa_verification_token', data.verification_token);
            sessionStorage.setItem('2fa_verification_expiry', Date.now() + (data.expires_in * 1000));
            return data.verification_token;
        }

        return null;
    },

    async verifyInAppForAction(action) {
        // Show password input modal
        const password = await this.showPasswordInputModal(action);

        // Verify password
        const response = await fetch('http://localhost:8000/api/2fa/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method: 'inapp', password })
        });

        if (response.ok) {
            const data = await response.json();
            sessionStorage.setItem('2fa_verification_token', data.verification_token);
            sessionStorage.setItem('2fa_verification_expiry', Date.now() + (data.expires_in * 1000));
            return data.verification_token;
        }

        return null;
    }
};
```

---

### 3. Making Protected API Calls

```javascript
// Helper function to make 2FA-protected API calls
async function protectedAPICall(url, options = {}, action = 'protected_action') {
    const token = localStorage.getItem('token');
    let verificationToken = sessionStorage.getItem('2fa_verification_token');
    const expiry = sessionStorage.getItem('2fa_verification_expiry');

    // Check if token has expired
    if (verificationToken && expiry && Date.now() > parseInt(expiry)) {
        verificationToken = null;
        sessionStorage.removeItem('2fa_verification_token');
        sessionStorage.removeItem('2fa_verification_expiry');
    }

    // Add headers
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add verification token if available
    if (verificationToken) {
        headers['X-2FA-Token'] = verificationToken;
    }

    // Make request
    let response = await fetch(url, { ...options, headers });

    // If 403 (2FA required), verify and retry
    if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.detail?.includes("2FA verification required")) {
            // Show 2FA verification modal
            verificationToken = await TFAManager.verifyForAction(action);
            if (verificationToken) {
                // Retry with verification token
                headers['X-2FA-Token'] = verificationToken;
                response = await fetch(url, { ...options, headers });
            }
        }
    }

    return response;
}
```

---

### 4. Usage Examples

#### **Access Settings Panel**
```javascript
async function openSettingsPanel() {
    const response = await protectedAPICall(
        'http://localhost:8000/api/settings',
        { method: 'GET' },
        'access_settings'
    );

    if (response.ok) {
        const settings = await response.json();
        displaySettings(settings);
    }
}
```

#### **Access Packages Panel**
```javascript
async function openPackagesPanel() {
    const response = await protectedAPICall(
        'http://localhost:8000/api/packages',
        { method: 'GET' },
        'access_packages'
    );

    if (response.ok) {
        const packages = await response.json();
        displayPackagesPanel(packages);
    }
}

async function createPackage(packageData) {
    const response = await protectedAPICall(
        'http://localhost:8000/api/packages',
        {
            method: 'POST',
            body: JSON.stringify(packageData)
        },
        'create_package'
    );

    if (response.ok) {
        showToast('Package created successfully!', 'success');
    }
}

async function updatePackage(packageId, packageData) {
    const response = await protectedAPICall(
        `http://localhost:8000/api/packages/${packageId}`,
        {
            method: 'PUT',
            body: JSON.stringify(packageData)
        },
        'update_package'
    );

    if (response.ok) {
        showToast('Package updated successfully!', 'success');
    }
}

async function deletePackage(packageId) {
    const response = await protectedAPICall(
        `http://localhost:8000/api/packages/${packageId}`,
        { method: 'DELETE' },
        'delete_package'
    );

    if (response.ok) {
        showToast('Package deleted successfully!', 'success');
    }
}
```

#### **Access Requests Panel (includes accept/reject actions)**
```javascript
async function openRequestsPanel() {
    const response = await protectedAPICall(
        'http://localhost:8000/api/session-requests',
        { method: 'GET' },
        'access_requests'
    );

    if (response.ok) {
        const requests = await response.json();
        displayRequestsPanel(requests);
    }
}

async function acceptRequest(requestId) {
    const response = await protectedAPICall(
        `http://localhost:8000/api/session-requests/${requestId}/accept`,
        { method: 'POST' },
        'accept_request'
    );

    if (response.ok) {
        showToast('Request accepted!', 'success');
    }
}

async function rejectRequest(requestId) {
    const response = await protectedAPICall(
        `http://localhost:8000/api/session-requests/${requestId}/reject`,
        { method: 'POST' },
        'reject_request'
    );

    if (response.ok) {
        showToast('Request rejected!', 'success');
    }
}
```

---

## Testing Flow

### 1. Without 2FA Enabled
- User can access all panels (Settings, Packages, Requests) **without any verification**
- No 2FA prompts shown

### 2. With Email 2FA Enabled
1. User clicks "Open Settings"
2. Frontend makes GET request to `/api/settings`
3. Backend responds: `403 Forbidden - 2FA verification required`
4. Frontend shows 2FA verification modal
5. User clicks "Send Code"
6. Frontend calls `/api/2fa/send-action-otp`
7. User receives OTP email
8. User enters 6-digit OTP
9. Frontend calls `/api/2fa/verify` with OTP
10. Backend returns `verification_token` (valid for 10 minutes)
11. Frontend stores token in `sessionStorage`
12. Frontend retries GET `/api/settings` with `X-2FA-Token` header
13. Backend allows access
14. Settings panel opens

### 3. With In-App 2FA Enabled
1. User clicks "Open Packages Panel"
2. Frontend makes GET request to `/api/packages`
3. Backend responds: `403 Forbidden - 2FA verification required`
4. Frontend shows password input modal
5. User enters 2FA password
6. Frontend calls `/api/2fa/verify` with password
7. Backend returns `verification_token`
8. Frontend retries GET with `X-2FA-Token` header
9. Packages panel opens
10. User can now create/edit/delete packages within the 10-minute window without re-verification

---

## Security Benefits

✅ **Settings Panel Protected:** Prevents unauthorized changes to account settings
✅ **Packages Panel Protected:** Prevents unauthorized creation, modification, and deletion of tutoring packages
✅ **Requests Panel Protected:** Prevents unauthorized access to session requests and all request actions (accept/reject)
✅ **Token Expiry:** Verification tokens expire after 10 minutes
✅ **Method-Specific Verification:** Email OTP, Authenticator TOTP, or In-App Password
✅ **Seamless UX:** Users without 2FA aren't affected
✅ **Reusable Token:** Same verification token can be used for multiple actions within 10 minutes
✅ **Comprehensive Protection:** All CRUD operations on protected panels require verification

---

## Next Steps

1. ✅ Backend infrastructure complete
2. ✅ Database migration run
3. ✅ API endpoints ready
4. ✅ Middleware/helper functions created
5. ✅ **DONE:** Protect existing endpoints (Settings Panel, Packages Panel, Requests Panel)
6. ✅ **DONE:** Frontend verification modal implementation
7. ✅ **DONE:** Protected API call wrapper implementation (`js/common-modals/protected-api-wrapper.js`)
8. ⏳ **TODO:** Testing with all 3 2FA methods (Email, Authenticator, In-App)

---

## Frontend Usage Guide

### 1. Include the Protected API Wrapper

Add the script to your HTML pages:

```html
<!-- After TailwindCSS and before page-specific scripts -->
<script src="../js/common-modals/protected-api-wrapper.js"></script>
```

### 2. Use ProtectedAPI Instead of fetch()

Replace regular `fetch()` calls with `ProtectedAPI.call()` for protected endpoints:

**Before:**
```javascript
async function getSettings() {
    const response = await fetch('http://localhost:8000/api/user/settings/appearance', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const settings = await response.json();
}
```

**After:**
```javascript
async function getSettings() {
    const response = await ProtectedAPI.call(
        'http://localhost:8000/api/user/settings/appearance',
        { method: 'GET' },
        'access_settings'
    );

    if (response.ok) {
        const settings = await response.json();
        // Use settings
    }
}
```

### 3. How It Works

1. **First Call**: If 2FA is enabled and no token exists:
   - Makes API call → Gets `403 Forbidden`
   - Automatically shows verification modal based on user's 2FA method
   - Gets verification token from `/api/2fa/verify`
   - Retries the original request with token
   - Stores token in sessionStorage (valid for 10 minutes)

2. **Subsequent Calls** (within 10 minutes):
   - Uses cached token from sessionStorage
   - No verification needed
   - Seamless user experience

3. **After 10 Minutes**:
   - Token expires automatically
   - Next protected action triggers new verification

### 4. Complete Example

```javascript
// Settings Panel
async function openSettingsPanel() {
    try {
        const response = await ProtectedAPI.call(
            'http://localhost:8000/api/user/settings/appearance',
            { method: 'GET' },
            'access_settings'
        );

        if (response.ok) {
            const settings = await response.json();
            displaySettings(settings);
        } else {
            showToast('Failed to load settings', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

// Packages Panel
async function createPackage(packageData) {
    try {
        const response = await ProtectedAPI.call(
            'http://localhost:8000/api/tutor/packages',
            {
                method: 'POST',
                body: JSON.stringify(packageData)
            },
            'create_package'
        );

        if (response.ok) {
            const result = await response.json();
            showToast('Package created successfully!', 'success');
            loadPackages(); // Refresh list
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

// Requests Panel
async function acceptRequest(requestId) {
    try {
        const response = await ProtectedAPI.call(
            `http://localhost:8000/api/session-requests/tutor/${requestId}`,
            {
                method: 'PATCH',
                body: JSON.stringify({ status: 'accepted' })
            },
            'accept_request'
        );

        if (response.ok) {
            showToast('Request accepted!', 'success');
            loadRequests(); // Refresh list
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}
```

### 5. API Reference

#### `ProtectedAPI.call(url, options, action)`

**Parameters:**
- `url` (string): API endpoint URL
- `options` (object): Fetch options (method, body, headers, etc.)
- `action` (string): Action name for logging/debugging (e.g., 'access_settings', 'create_package')

**Returns:** Promise<Response>

**Examples:**
```javascript
// GET request
await ProtectedAPI.call('/api/user/settings/appearance', { method: 'GET' }, 'get_settings');

// POST request
await ProtectedAPI.call('/api/tutor/packages', {
    method: 'POST',
    body: JSON.stringify({ name: 'Math Package' })
}, 'create_package');

// PUT request
await ProtectedAPI.call(`/api/tutor/packages/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Updated Name' })
}, 'update_package');

// DELETE request
await ProtectedAPI.call(`/api/tutor/packages/${id}`, { method: 'DELETE' }, 'delete_package');
```

---

**Ready to use! All protected endpoints now require 2FA verification when enabled.**
