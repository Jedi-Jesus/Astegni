# Email Setup Guide for Astegni Platform

## Issues Fixed

### ✅ 1. JavaScript Error (FIXED)
**Error**: `Cannot read properties of undefined (reading 'target')`
**Location**: `manage-system-settings.js:1350`
**Fix Applied**: Added `event` parameter to `testEmailConfig()` function with null-safety checks

### ⚠️ 2. SMTP Authentication Failure (ACTION REQUIRED)
**Error**: `(535, b'5.7.8 Username and Password not accepted')`
**Cause**: App Password is incorrect or expired
**Solution**: Generate new App Password (steps below)

---

## Current Configuration

Your email is configured to use **Google Workspace** with these settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contact@astegni.com
SMTP_PASSWORD=uicqsrxlgxknnljf  ⚠️ This needs to be updated!
FROM_EMAIL=contact@astegni.com
FROM_NAME=Astegni Educational Platform
```

---

## Step-by-Step: Generate Google App Password

### 1. Enable 2-Step Verification (Required First!)

1. Go to: https://myaccount.google.com/security
2. Find "2-Step Verification" section
3. Click "Get started" and follow the setup
4. Choose verification method (Phone, Authenticator app, etc.)
5. Complete the 2-Step Verification setup

### 2. Generate App Password

#### Option A: Direct Link
Go directly to: https://myaccount.google.com/apppasswords

#### Option B: Manual Navigation
1. Go to https://myaccount.google.com
2. Click "Security" in left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Scroll down to find "App passwords"
5. Click "App passwords"

### 3. Create New App Password

1. You may need to re-enter your Google account password
2. At the "App passwords" page:
   - **Select app**: Choose "Mail"
   - **Select device**: Choose "Other (Custom name)"
   - **Enter custom name**: Type "Astegni Backend"
3. Click "Generate"

### 4. Copy the 16-Character Password

You'll see a popup with a 16-character password like:
```
abcd efgh ijkl mnop
```

**IMPORTANT**:
- Copy this password immediately (you won't see it again!)
- Remove the spaces when pasting into .env: `abcdefghijklmnop`
- This replaces your regular Gmail password

### 5. Update Your .env File

Open `astegni-backend/.env` and update line 67:

**Before:**
```env
SMTP_PASSWORD=uicqsrxlgxknnljf
```

**After:**
```env
SMTP_PASSWORD=your_new_16_char_app_password_here
```

**Important**: Remove any spaces from the App Password!

---

## Testing Your Configuration

### Method 1: Using Test Script (Recommended)

Run the test script from the backend directory:

```bash
cd astegni-backend
python test_smtp_connection.py
```

This will:
- ✓ Test connection to smtp.gmail.com
- ✓ Test TLS encryption
- ✓ Test authentication with your credentials
- ✓ Optionally send a test email

**Expected Output (Success):**
```
============================================================
SMTP Configuration Test
============================================================
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: contact@astegni.com
From Email: contact@astegni.com
From Name: Astegni
Password: ****************
============================================================

🔌 Step 1: Connecting to SMTP server...
✅ Connected to SMTP server

🔒 Step 2: Starting TLS encryption...
✅ TLS encryption started

🔑 Step 3: Authenticating as contact@astegni.com...
✅ Authentication successful!

============================================================
✅ ALL TESTS PASSED - SMTP Configuration is working!
============================================================
```

### Method 2: Using Admin Panel

1. Restart backend server:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. Open frontend:
   ```
   http://localhost:8080/admin-pages/manage-system-settings.html?panel=email
   ```

3. Click "Test Email Configuration" button
4. Enter your email address
5. Check your inbox for test email

---

## Troubleshooting

### Problem: "Username and Password not accepted"

**Causes & Solutions:**

1. **Using regular password instead of App Password**
   - ✓ Generate App Password (see steps above)
   - ✓ Use the 16-character App Password, not your Gmail password

2. **2-Step Verification not enabled**
   - ✓ Enable 2FA first (required for App Passwords)
   - ✓ Go to https://myaccount.google.com/security

3. **Spaces in App Password**
   - ✓ Remove all spaces from the password
   - Wrong: `abcd efgh ijkl mnop`
   - Correct: `abcdefghijklmnop`

4. **Wrong email address**
   - ✓ Use `contact@astegni.com` (your custom domain email)
   - ✓ Make sure the email exists in Google Workspace

5. **App Password expired or revoked**
   - ✓ Generate a new App Password
   - ✓ Delete old App Passwords if you created multiple

### Problem: "Less secure app access" message

**Solution**: Ignore this - App Passwords are the correct modern approach. Google Workspace accounts should use App Passwords, not "less secure app access".

### Problem: Email sent but not received

**Possible Causes:**

1. **Check Spam folder** - Gmail may flag test emails as spam
2. **SPF/DKIM records** - For production, configure DNS records:
   - See: https://support.google.com/a/answer/33786
3. **Domain verification** - Verify your domain in Google Workspace

---

## Alternative: Port 465 with SSL

If port 587 doesn't work, try port 465 with SSL:

Update `.env`:
```env
SMTP_PORT=465
# Note: Code will automatically use SSL for port 465
```

---

## Complete Working Configuration Example

After following all steps, your `.env` should have:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contact@astegni.com
SMTP_PASSWORD=abcdefghijklmnop  # Your 16-char App Password (no spaces)
FROM_EMAIL=contact@astegni.com
FROM_NAME=Astegni Educational Platform
```

---

## Email Features Enabled After Setup

Once SMTP is working, these features will work:

✅ **OTP Verification**
- Users receive OTP codes via email
- 5-minute expiration
- HTML-formatted emails

✅ **Password Reset**
- Password reset links sent via email
- Secure token-based links

✅ **Admin Invitations**
- Send invitation emails to new admins
- Custom welcome messages

✅ **Notifications**
- Course approval notifications
- System alerts
- User notifications

✅ **Test Email Panel**
- Test configuration from admin panel
- Verify emails are being sent

---

## Quick Reference: Gmail App Password Setup

```
1. Enable 2FA → https://myaccount.google.com/security
2. Generate App Password → https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (Astegni Backend)"
4. Copy 16-character password (remove spaces)
5. Update .env file: SMTP_PASSWORD=your_password_here
6. Restart backend server
7. Test with: python test_smtp_connection.py
```

---

## Support Resources

- **Google Workspace SMTP Guide**: https://support.google.com/a/answer/176600
- **App Passwords**: https://support.google.com/accounts/answer/185833
- **SPF/DKIM Setup**: https://support.google.com/a/answer/33786
- **Troubleshoot sending**: https://support.google.com/mail/answer/7126229

---

## Next Steps

1. ✅ Generate new App Password
2. ✅ Update `.env` file with new password
3. ✅ Restart backend: `python app.py`
4. ✅ Test connection: `python test_smtp_connection.py`
5. ✅ Test from admin panel: Email Configuration → Test button
6. ✅ Verify test email received

---

**Need Help?**

If you continue to have issues after following this guide:
1. Double-check the App Password has no spaces
2. Verify 2FA is enabled on Google account
3. Make sure you're logged into admin.google.com with the correct account
4. Try generating a fresh App Password and delete old ones
5. Check backend logs for detailed error messages
