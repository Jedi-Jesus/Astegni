# SMTP Configuration System Explained

## How Email Configuration Works in Astegni Platform

---

## Overview

Your Astegni platform now has **two** ways to configure email settings:

1. **`.env` file** (Backend environment variables - fallback)
2. **Database** (`system_email_config` table - **primary**)

---

## Configuration Priority

### The system loads settings in this order:

```
1. Try Database first ✅ (PRIMARY)
   ↓
2. If database fails → Use .env file ✅ (FALLBACK)
   ↓
3. If both fail → Email disabled ❌
```

---

## What Happens When You Change Settings in Admin Panel?

### Step-by-Step Flow:

**1. Admin Opens Email Panel:**
```
http://localhost:8080/admin-pages/manage-system-settings.html?panel=email
```

**2. Page Loads Current Settings:**
- JavaScript calls: `GET /api/admin/system/email-config`
- Backend reads from **database** (`system_email_config` table)
- Form fields populate with current values

**3. Admin Changes Settings:**
- Edit SMTP Host, Port, Username, Password, etc.
- Click "Save Settings"

**4. Settings Saved to Database:**
- JavaScript calls: `PUT /api/admin/system/email-config`
- Backend saves to **database only**
- `.env` file is **NOT changed**

**5. Next Email Sent:**
- `email_service.py` initializes
- Reads configuration from **database** (not `.env`)
- Uses new settings immediately! ✅

---

## Does Changing Admin Panel Settings Change `.env`?

### ❌ NO - `.env` file is never modified

The `.env` file remains unchanged and serves as:
- **Fallback** if database is unavailable
- **Initial configuration** for first setup
- **Backup** if database config is deleted

---

## What Does the Admin Panel Actually Do?

### ✅ It Changes the **Database Configuration**

When you click "Save Settings" in the admin panel:

**Database Table Updated:**
```sql
UPDATE system_email_config SET
  smtp_host = 'new.smtp.com',
  smtp_port = 465,
  smtp_username = 'new@email.com',
  smtp_password = 'new_password',
  from_email = 'new@email.com',
  from_name = 'New Name',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

**`.env` File Status:**
```
✅ Remains unchanged
✅ Still used as fallback
✅ Original settings preserved
```

---

## How EmailService Works Now

### Updated Flow (After Our Changes):

```python
class EmailService:
    def __init__(self):
        self._load_config()  # Load from database OR .env

    def _load_config(self):
        try:
            # Step 1: Try database first
            conn = psycopg.connect(DATABASE_URL)
            cursor.execute("SELECT * FROM system_email_config WHERE enabled = true")
            row = cursor.fetchone()

            if row:
                # ✅ Use database configuration
                self.smtp_host = row[0]
                self.smtp_port = row[1]
                # ... etc
                print("[EMAIL] Configuration loaded from database")
            else:
                # ⚠️ No database config, use .env
                self._load_from_env()

        except Exception:
            # ❌ Database error, use .env
            self._load_from_env()
```

---

## Current Configuration Sources

### 1. Database (PRIMARY) ✅

**Table**: `system_email_config`

**Current Values:**
```sql
smtp_host: smtp.gmail.com
smtp_port: 587
smtp_username: noreplay@astegni.com
smtp_password: htjxqsnvljzszkbe  (App Password)
from_email: noreplay@astegni.com
from_name: Astegni Educational Platform
enabled: true
```

**How to View:**
```bash
cd astegni-backend
python -c "import psycopg, os; from dotenv import load_dotenv; load_dotenv(); \
conn = psycopg.connect(os.getenv('DATABASE_URL')); cursor = conn.cursor(); \
cursor.execute('SELECT * FROM system_email_config'); print(cursor.fetchone())"
```

### 2. .env File (FALLBACK) ✅

**Location**: `astegni-backend/.env`

**Current Values:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreplay@astegni.com
SMTP_PASSWORD=htjxqsnvljzszkbe
FROM_EMAIL=noreplay@astegni.com
FROM_NAME=Astegni Educational Platform
```

**When Used:**
- Database connection fails
- `system_email_config` table is empty
- `enabled` field is `false` in database

---

## Benefits of This Dual-System Approach

### ✅ Advantages:

1. **Dynamic Configuration**
   - Change email settings without restarting server
   - No need to edit files manually
   - Admin panel provides easy interface

2. **Fallback Safety**
   - If database fails, `.env` still works
   - System never completely breaks
   - Emails continue to send

3. **Security**
   - Database credentials can be encrypted
   - `.env` file not exposed to web interface
   - Password changes don't require code deployment

4. **Flexibility**
   - Different environments (dev/staging/prod) can use different configs
   - Easy to test new SMTP providers
   - Rollback by disabling database config

5. **Audit Trail**
   - Database has `updated_at` timestamp
   - Can track configuration changes
   - Can revert to previous settings

---

## Testing the System

### Test 1: Current Configuration (Database)

```bash
cd astegni-backend
python test_send_email.py your.email@example.com
```

**Expected Output:**
```
[EMAIL] Configuration loaded from database
Sending test email from noreplay@astegni.com to your.email@example.com...
SUCCESS! Test email sent to your.email@example.com
```

### Test 2: Disable Database Config

```bash
# Disable in database
python -c "import psycopg, os; from dotenv import load_dotenv; load_dotenv(); \
conn = psycopg.connect(os.getenv('DATABASE_URL')); cursor = conn.cursor(); \
cursor.execute('UPDATE system_email_config SET enabled = false WHERE id = 1'); \
conn.commit(); print('Database config disabled')"

# Test email - should use .env
python test_send_email.py your.email@example.com
```

**Expected Output:**
```
[EMAIL] Configuration loaded from .env file
Sending test email from noreplay@astegni.com to your.email@example.com...
SUCCESS! Test email sent to your.email@example.com
```

### Test 3: Re-enable Database Config

```bash
# Re-enable in database
python -c "import psycopg, os; from dotenv import load_dotenv; load_dotenv(); \
conn = psycopg.connect(os.getenv('DATABASE_URL')); cursor = conn.cursor(); \
cursor.execute('UPDATE system_email_config SET enabled = true WHERE id = 1'); \
conn.commit(); print('Database config enabled')"
```

---

## Changing Email Settings via Admin Panel

### Complete Workflow:

**1. Open Admin Panel:**
```
http://localhost:8080/admin-pages/manage-system-settings.html?panel=email
```

**2. Current Settings Displayed:**
- SMTP Host: `smtp.gmail.com`
- SMTP Port: `587`
- Username: `noreplay@astegni.com`
- From Email: `noreplay@astegni.com`
- From Name: `Astegni Educational Platform`

**3. Make Changes:**
- Example: Change "From Name" to "Astegni Platform"
- Example: Change Port to `465` (SSL)
- Example: Change SMTP Host to `smtp.office365.com`

**4. Click "Save Settings":**
- JavaScript calls API: `PUT /api/admin/system/email-config`
- Database table updated
- Success message shown

**5. Changes Take Effect:**
- **Immediately** on next email sent
- **No server restart** required
- **No code changes** required
- **`.env` unchanged** (still works as fallback)

**6. Test New Settings:**
- Click "Test Email Configuration" button
- Enter your email address
- Email sent using new configuration
- Check inbox to verify

---

## What If You Want to Use a Different Email Provider?

### Example: Switch from Gmail to Office365

**Via Admin Panel:**

1. Open Email Panel
2. Change settings:
   ```
   SMTP Host: smtp.office365.com
   SMTP Port: 587
   SMTP Username: hello@yourdomain.com
   SMTP Password: your_office365_password
   From Email: hello@yourdomain.com
   ```
3. Click "Save Settings"
4. Click "Test Email Configuration"
5. If successful, all future emails use Office365!

**What happens:**
- ✅ Database config updated
- ✅ Next email uses Office365
- ✅ `.env` still has Gmail (as fallback)
- ✅ Can switch back anytime by changing settings again

---

## Security Considerations

### Password Storage:

**Database:**
- Passwords stored in plain text (currently)
- Should be encrypted in production
- Only accessible via admin panel

**`.env` File:**
- Passwords in plain text
- File not committed to git (in `.gitignore`)
- Only accessible on server

### Best Practices:

1. ✅ Use App Passwords (not regular passwords)
2. ✅ Restrict database access
3. ✅ Use HTTPS for admin panel
4. ✅ Implement admin authentication
5. ⚠️ Consider encrypting passwords in database (future enhancement)

---

## Common Scenarios

### Scenario 1: Change "From Name"

**Admin Panel:**
```
From Name: "Astegni Platform" → "Astegni Learning"
```

**Result:**
```
Emails now show: "From: Astegni Learning <noreplay@astegni.com>"
```

### Scenario 2: Change SMTP Provider

**Admin Panel:**
```
SMTP Host: smtp.gmail.com → smtp.sendgrid.net
SMTP Port: 587 → 587
Username: noreplay@astegni.com → apikey
Password: (App Password) → (SendGrid API Key)
```

**Result:**
```
All emails now sent via SendGrid instead of Gmail
```

### Scenario 3: Temporarily Disable Email

**Admin Panel:**
```
Email Enabled: ✅ → ❌ (unchecked)
```

**Result:**
```
No emails sent (all email functions return fallback messages)
System uses .env if you re-enable
```

### Scenario 4: Database Goes Down

**What Happens:**
```
1. EmailService tries to load from database
2. Database connection fails
3. Automatically falls back to .env
4. Emails continue to work! ✅
```

---

## Admin Panel Features

### Current Features:

✅ **View Current Settings**
- See all SMTP configuration
- Password hidden for security
- Encryption type displayed
- Daily send limit shown

✅ **Edit Settings**
- Change any SMTP parameter
- Save to database
- Instant feedback on save

✅ **Test Configuration**
- Send test email button
- Enter recipient email
- Real-time test results

✅ **Enable/Disable Email**
- Toggle email functionality
- Fallback to .env when disabled

### Future Enhancements (Optional):

- ⭐ **Multiple SMTP Profiles** (Gmail, SendGrid, etc.)
- ⭐ **Email Templates Management**
- ⭐ **Send History / Logs**
- ⭐ **Delivery Statistics**
- ⭐ **Password Encryption**
- ⭐ **Bounce Handling**
- ⭐ **Email Queue Management**

---

## Summary

### What You Need to Know:

1. **Admin Panel Changes Database** (not `.env`)
2. **Database is Primary**, `.env` is Fallback
3. **Changes Take Effect Immediately** (no restart)
4. **`.env` File Never Modified** (always safe)
5. **Both Sources Work** (redundancy = reliability)

### Quick Reference:

| Action | Changes | Takes Effect | Restart Needed? |
|--------|---------|--------------|----------------|
| Edit `.env` | Environment | After restart | ✅ Yes |
| Edit Admin Panel | Database | Immediately | ❌ No |
| Disable in Panel | Database (`enabled=false`) | Immediately | ❌ No |
| Delete DB config | Falls back to `.env` | Immediately | ❌ No |

---

## Troubleshooting

### Problem: Email not sending after changing settings

**Solution:**
1. Check database: `SELECT * FROM system_email_config WHERE enabled = true`
2. Check if `enabled = true` in database
3. Verify SMTP credentials are correct
4. Test with "Test Email Configuration" button
5. Check backend logs for errors

### Problem: Changes in admin panel don't take effect

**Solution:**
1. Check if save was successful (check for success message)
2. Verify database was updated: `SELECT * FROM system_email_config`
3. Check if `enabled = true`
4. Try sending a new email (not using cached instance)

### Problem: Want to revert to `.env` settings

**Solution:**
```bash
# Disable database config
UPDATE system_email_config SET enabled = false WHERE id = 1;

# Or delete database config entirely
DELETE FROM system_email_config WHERE id = 1;
```

### Problem: Want to use both `.env` and database

**Current Behavior:**
- Database takes priority when `enabled = true`
- `.env` used when database disabled or fails
- This is the intended design!

---

**Configuration System: ✅ FULLY OPERATIONAL**

Your email system now supports dynamic configuration through the admin panel while maintaining `.env` as a reliable fallback!
