# Connected Accounts Implementation - Complete Guide

## Overview

This implementation adds full Google account connection tracking to the Astegni platform. Users can now see if their account is connected to Google, link their Google account to an existing account, and unlink it if they have a password set.

## Features Implemented

### 1. **Database Schema Updates**
- Added `google_email` column to `users` table (VARCHAR, nullable)
- Added `oauth_provider` column to `users` table (VARCHAR(20), nullable)
- These fields track which email was used for Google OAuth and the provider type

### 2. **Backend Endpoints**

#### New File: `connected_accounts_endpoints.py`

**GET `/api/user/connected-accounts`**
- Returns user's connected accounts status
- Response includes:
  - `google_connected`: boolean
  - `google_email`: string or null
  - `has_password`: boolean
  - `can_unlink_google`: boolean (true only if has password)

**POST `/api/user/unlink-google`**
- Unlinks Google account from user profile
- Requires password verification if user has password
- Cannot unlink if user has no password (prevents lockout)

**POST `/api/user/set-password`**
- Allows OAuth-only users to set a password
- Validates password length (minimum 8 characters)
- Sets `has_password` to true

#### Updated: `google_oauth_endpoints.py`
- **New users**: Automatically saves `google_email` and sets `oauth_provider = 'google'`
- **Existing users**: Updates `google_email` and `oauth_provider` on login if not already set

### 3. **Frontend Updates**

#### Updated: `js/common-modals/settings-manager.js`

**`loadConnectedAccounts()` function:**
- Now calls `/api/user/connected-accounts` API
- Displays Google email if connected
- Shows/hides "Connect" vs "Connected" state
- Displays warning if user has only Google login (no password)

**`linkGoogleAccount()` function:**
- Triggers Google OAuth flow using `window.googleOAuthManager`
- Closes connected accounts modal during OAuth flow
- Reopens modal after successful connection
- Uses current user's active role for OAuth

**`confirmUnlinkGoogle()` function:**
- Calls `/api/user/unlink-google` endpoint
- Reloads connected accounts status after unlinking

**`saveNewPassword()` function:**
- Already implemented - calls `/api/user/set-password`

## User Flows

### Flow 1: User Signs In with Google (New Account)
1. User clicks "Continue with Google" on login/register modal
2. Google OAuth completes successfully
3. Backend creates new user with:
   - `email`: Google email
   - `google_email`: Google email
   - `oauth_provider`: "google"
   - `has_password`: false
   - `email_verified`: true
4. User can now access their profile

### Flow 2: User with Google Account Views Connected Accounts
1. User navigates to Settings → Connected Accounts
2. `loadConnectedAccounts()` calls `/api/user/connected-accounts`
3. Backend returns:
   ```json
   {
     "google_connected": true,
     "google_email": "user@gmail.com",
     "has_password": false,
     "can_unlink_google": false
   }
   ```
4. UI shows:
   - Google: **Connected** (user@gmail.com)
   - Warning: "Google is your only sign-in method. Set up a password as backup."

### Flow 3: User Wants to Add Password (Google-only account)
1. User clicks "Set up password" in the warning banner
2. `openSetPasswordModal()` shows password input modal
3. User enters and confirms password
4. `saveNewPassword()` calls `/api/user/set-password`
5. Backend updates:
   - `password_hash`: hashed password
   - `has_password`: true
6. User can now login with either Google OR email/password

### Flow 4: User Wants to Link Google to Existing Account
1. User with email/password account goes to Connected Accounts
2. Clicks "Connect" button next to Google
3. `linkGoogleAccount()` triggers Google OAuth flow
4. After Google authorization, backend checks:
   - If Google email matches user's email → links account
   - Updates `google_email` and `oauth_provider`
5. User can now login with either method

### Flow 5: User Wants to Unlink Google Account
1. User clicks unlink icon next to Google
2. `unlinkGoogleAccount()` checks if user has password
   - **If no password**: Shows warning "You must set a password first"
   - **If has password**: Shows confirmation modal
3. User confirms unlinking
4. `confirmUnlinkGoogle()` calls `/api/user/unlink-google`
5. Backend clears `google_email` and `oauth_provider`
6. User can only login with email/password now

## Database Migration

Run the migration to add the new fields:

```bash
cd astegni-backend
python migrate_add_google_oauth_fields.py
```

Expected output:
```
[OK] Added google_email column
[OK] Added oauth_provider column

[SUCCESS] Migration completed successfully!

=== Verification ===
google_email: character varying (nullable: YES)
oauth_provider: character varying (nullable: YES)
```

## Files Modified

### Backend
1. **`app.py modules/models.py`**
   - Added `google_email` and `oauth_provider` columns to User model

2. **`google_oauth_endpoints.py`**
   - Updated user creation to save Google email and provider
   - Updated login to save Google connection info

3. **`connected_accounts_endpoints.py`** (NEW)
   - Three endpoints for managing connected accounts

4. **`app.py`**
   - Registered `connected_accounts_router`

5. **`migrate_add_google_oauth_fields.py`** (NEW)
   - Migration script for database updates

### Frontend
1. **`js/common-modals/settings-manager.js`**
   - Updated `loadConnectedAccounts()` to use API
   - Updated `linkGoogleAccount()` to trigger OAuth flow
   - Functions already existed: `confirmUnlinkGoogle()`, `saveNewPassword()`

2. **`modals/common-modals/connected-accounts-modal.html`** (EXISTING)
   - Already has all UI elements needed
   - Shows Google connection status
   - Shows "Connect" button or "Connected" badge
   - Shows warning for Google-only accounts

## Testing Checklist

- [ ] **New User Registration with Google**
  - Sign up with Google
  - Check database: `google_email` and `oauth_provider` should be set
  - Open Connected Accounts modal: Should show "Connected"

- [ ] **Existing User Login with Google**
  - User who registered with email/password
  - Login with Google
  - Check database: `google_email` and `oauth_provider` should be updated

- [ ] **Connect Google to Existing Account**
  - Create account with email/password
  - Go to Connected Accounts
  - Click "Connect" on Google
  - Complete OAuth flow
  - Verify Google is now connected

- [ ] **Set Password for Google-only Account**
  - Sign up with Google only
  - Go to Connected Accounts
  - See warning banner
  - Click "Set up password"
  - Enter new password
  - Verify `has_password` is now true

- [ ] **Unlink Google Account**
  - User with both Google and password
  - Go to Connected Accounts
  - Click unlink icon
  - Confirm unlinking
  - Verify `google_email` and `oauth_provider` are null

- [ ] **Prevent Unlinking Without Password**
  - User with only Google login
  - Try to unlink Google
  - Should see error: "You must set a password first"
  - Unlink button should be disabled

## Security Considerations

1. **Cannot lock out user**: System prevents unlinking Google if user has no password
2. **Password verification**: Unlinking requires password confirmation (if password exists)
3. **OAuth tokens**: Backend verifies Google ID tokens before accepting them
4. **Email verification**: Google-authenticated emails are automatically verified

## API Documentation

### GET /api/user/connected-accounts
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "google_connected": true,
  "google_email": "user@gmail.com",
  "has_password": true,
  "can_unlink_google": true
}
```

### POST /api/user/unlink-google
**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body** (optional):
```json
{
  "password": "user_password"
}
```

**Response**:
```json
{
  "message": "Google account unlinked successfully"
}
```

### POST /api/user/set-password
**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "password": "new_password_min_8_chars"
}
```

**Response**:
```json
{
  "message": "Password set successfully"
}
```

## Future Enhancements

1. **Multiple OAuth Providers**
   - Add Facebook, Apple, Microsoft support
   - Update `oauth_provider` to support multiple values (JSON array)
   - Show all connected providers in modal

2. **Primary Email Management**
   - Allow users to set primary email
   - Allow different email for Google vs platform

3. **Account Merge**
   - Detect duplicate accounts (same email, different OAuth)
   - Offer to merge accounts

4. **OAuth Scopes**
   - Store OAuth scopes granted
   - Show what data is shared with platform

## Support & Troubleshooting

### Issue: "Google sign-in not available"
**Solution**: Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`

### Issue: Migration fails
**Solution**: Check PostgreSQL connection, ensure user has ALTER TABLE permissions

### Issue: "Cannot unlink Google account" error
**Solution**: User must set a password first. Direct them to the warning banner.

### Issue: Google OAuth returns 404
**Solution**: Check that `google_oauth_router` is registered in `app.py` before generic routes

## Conclusion

The Connected Accounts system is now fully functional. Users can:
- ✅ Sign up/login with Google
- ✅ See their Google connection status
- ✅ Link Google to existing accounts
- ✅ Set a password for Google-only accounts
- ✅ Unlink Google (if they have a password)

All changes are backward compatible and non-breaking.
