# OTP Email Change - User Guide

## How to Change Your Email Address

This guide shows you step-by-step how to change your email address in the Astegni admin system.

---

## Step 1: Open Edit Profile

1. Navigate to **manage-courses.html** (or any admin page)
2. Click the **"Edit Profile"** button in the profile header section
3. The Edit Profile modal will open

---

## Step 2: Start Email Change

In the Edit Profile modal, you'll see:

```
┌─────────────────────────────────────────┐
│ Email:                                  │
│ ┌───────────────────┐  ┌──────────────┐│
│ │ test1@example.com │  │ Change Email ││
│ └───────────────────┘  └──────────────┘│
│ ℹ️ Email changes require OTP verification│
└─────────────────────────────────────────┘
```

- Email field is **read-only** (you cannot type in it)
- Click the **"Change Email"** button to start the process

---

## Step 3: Verify Current Email (Step 1)

The OTP Verification Modal will open:

```
┌────────────────────────────────────────────────┐
│    🔐 Email Change Verification                │
│                                                 │
│    Step 1: Verify Current Email                │
│                                                 │
│    Current Email:                              │
│    ┌─────────────────────────────────────┐    │
│    │ test1@example.com                   │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    ┌────────────────────────────────────┐     │
│    │ Send OTP to Current Email         │     │
│    └────────────────────────────────────┘     │
│                                                 │
└────────────────────────────────────────────────┘
```

**Actions:**

1. Click **"Send OTP to Current Email"** button
2. An OTP code will be sent to your current email address
3. Check your email inbox for the 6-digit code

---

## Step 4: Enter Current Email OTP

After clicking "Send OTP", the modal updates:

```
┌────────────────────────────────────────────────┐
│    🔐 Email Change Verification                │
│                                                 │
│    Step 1: Verify Current Email                │
│                                                 │
│    Current Email:                              │
│    ┌─────────────────────────────────────┐    │
│    │ test1@example.com                   │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    ✅ OTP sent to tes***xample.com            │
│                                                 │
│    Enter OTP Code:                             │
│    ┌─────────────────────────────────────┐    │
│    │ [ ][ ][ ][ ][ ][ ]                  │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    ⏱️ OTP expires in 4:58                      │
│                                                 │
│    ┌────────────────────────────────────┐     │
│    │ Verify OTP                         │     │
│    └────────────────────────────────────┘     │
│                                                 │
└────────────────────────────────────────────────┘
```

**Actions:**

1. Open your email inbox
2. Find the email with subject: "OTP Verification Code"
3. Copy the 6-digit OTP code
4. Paste it into the OTP input field
5. Click **"Verify OTP"** button

---

## Step 5: OTP Verified - Moving to Step 2

After successful verification:

```
┌────────────────────────────────────────────────┐
│    🔐 Email Change Verification                │
│                                                 │
│    Step 1: Verify Current Email                │
│                                                 │
│    Current Email:                              │
│    ┌─────────────────────────────────────┐    │
│    │ test1@example.com                   │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    ✅ Current email verified successfully!     │
│                                                 │
│    (Moving to Step 2...)                       │
│                                                 │
└────────────────────────────────────────────────┘
```

The modal will automatically transition to Step 2 after 1.5 seconds.

---

## Step 6: Enter New Email (Step 2)

Step 2 screen appears:

```
┌────────────────────────────────────────────────┐
│    🔐 Email Change Verification                │
│                                                 │
│    Step 2: Verify New Email                    │
│                                                 │
│    New Email Address:                          │
│    ┌─────────────────────────────────────┐    │
│    │ newemail@example.com                │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    ┌────────────────────────────────────┐     │
│    │ Send OTP to New Email              │     │
│    └────────────────────────────────────┘     │
│                                                 │
└────────────────────────────────────────────────┘
```

**Actions:**

1. Type your **new email address** in the input field
2. Click **"Send OTP to New Email"** button
3. Check the **new email inbox** for the OTP code

---

## Step 7: Verify New Email OTP

After sending OTP to new email:

```
┌────────────────────────────────────────────────┐
│    🔐 Email Change Verification                │
│                                                 │
│    Step 2: Verify New Email                    │
│                                                 │
│    New Email Address:                          │
│    ┌─────────────────────────────────────┐    │
│    │ newemail@example.com                │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    ✅ OTP sent to new***xample.com            │
│                                                 │
│    Enter OTP Code:                             │
│    ┌─────────────────────────────────────┐    │
│    │ [ ][ ][ ][ ][ ][ ]                  │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    ⏱️ OTP expires in 4:55                      │
│                                                 │
│    ┌────────────────────────────────────┐     │
│    │ Verify & Update Email              │     │
│    └────────────────────────────────────┘     │
│                                                 │
└────────────────────────────────────────────────┘
```

**Actions:**

1. Open your **new email** inbox
2. Find the OTP verification email
3. Copy the 6-digit code
4. Paste it into the OTP input field
5. Click **"Verify & Update Email"** button

---

## Step 8: Success!

After successful verification and update:

```
┌────────────────────────────────────────────────┐
│    ✅ Email Changed Successfully!              │
│                                                 │
│    Your email has been updated to:             │
│    newemail@example.com                        │
│                                                 │
│    You can now use this email to log in.       │
│                                                 │
│    ┌────────────────────────────────────┐     │
│    │ Close                              │     │
│    └────────────────────────────────────┘     │
│                                                 │
└────────────────────────────────────────────────┘
```

**What Happens Next:**

1. ✅ Email updated in database
2. ✅ Edit Profile modal email field updated
3. ✅ Profile header shows new email
4. ✅ localStorage updated
5. ✅ You can close the modal

---

## Important Notes

### ⏱️ OTP Expiration
- Each OTP is valid for **5 minutes**
- A countdown timer shows you how much time is left
- If OTP expires, click "Send OTP" again to get a new code

### 🔒 Security Features
- **Two-step verification**: You must verify both old and new emails
- **Single-use OTPs**: Each code can only be used once
- **Email uniqueness**: New email must not already be in use by another admin

### 📧 Email Validation
- New email must be different from current email
- Valid email format required (e.g., user@domain.com)
- Email is checked for availability

### ❌ Common Errors

**"Invalid OTP code"**
- You entered the wrong code
- Double-check the code in your email
- Make sure you're using the most recent OTP

**"OTP has expired. Please request a new one."**
- Your 5-minute window expired
- Click "Send OTP" button again to get a fresh code

**"This email is already in use"**
- Another admin account uses this email
- Choose a different email address

**"Current email does not match"**
- The email you're trying to verify doesn't match your account
- Contact system administrator if you believe this is an error

---

## Troubleshooting

### Not Receiving OTP Emails?

1. **Check Spam/Junk Folder**
   - OTP emails might be filtered as spam
   - Look for sender: noreply@astegni.com

2. **Wait 30 Seconds**
   - Email delivery can take a moment
   - Don't request multiple OTPs rapidly

3. **Verify Email Address**
   - Make sure you entered the correct email
   - Check for typos

4. **Contact Administrator**
   - If emails still don't arrive, contact your system admin
   - Email service may need configuration

### Modal Not Appearing?

1. **Refresh the Page**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Browser Console**
   - Press F12 to open developer tools
   - Look for JavaScript errors

3. **Clear Browser Cache**
   - Sometimes cached files cause issues

---

## For System Administrators

### Email Service Configuration

The system uses SMTP email service configured in `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@astegni.com
SMTP_FROM_NAME=Astegni Admin System
```

### Development Mode

In development mode, OTP codes are returned in the API response for testing purposes. This is controlled by:

```python
include_otp = os.getenv("ENVIRONMENT", "development") == "development"
```

Set `ENVIRONMENT=production` in `.env` to disable OTP in API responses.

### Testing

Run the automated test:
```bash
cd astegni-backend
python test_otp_email_change.py
```

---

## Security Best Practices

### For Users:
1. ✅ Never share your OTP codes with anyone
2. ✅ Use a secure email provider
3. ✅ Log out after changing email
4. ✅ Verify the change was successful

### For Administrators:
1. ✅ Configure email service properly
2. ✅ Set ENVIRONMENT=production in production
3. ✅ Monitor failed OTP attempts
4. ✅ Implement rate limiting if needed

---

## Quick Reference

| Step | Action | What to Do |
|------|--------|------------|
| 1 | Open Edit Profile | Click "Edit Profile" button |
| 2 | Start Email Change | Click "Change Email" button |
| 3 | Send Current Email OTP | Click "Send OTP to Current Email" |
| 4 | Verify Current Email | Enter 6-digit code from current email |
| 5 | Enter New Email | Type new email address |
| 6 | Send New Email OTP | Click "Send OTP to New Email" |
| 7 | Verify New Email | Enter 6-digit code from new email |
| 8 | Complete | Click "Verify & Update Email" |

**Total Time:** Approximately 2-3 minutes (including email delivery)

---

## Support

If you encounter any issues not covered in this guide:

1. Check the [OTP-EMAIL-CHANGE-TESTING-COMPLETE.md](OTP-EMAIL-CHANGE-TESTING-COMPLETE.md) documentation
2. Contact your system administrator
3. Report bugs at: https://github.com/your-org/astegni/issues

**Last Updated:** October 18, 2025
