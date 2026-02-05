# Cron Job Setup Guide: Automatic Deletion of Expired Roles and Accounts

## Overview

This guide explains how to set up automatic permanent deletion of roles and accounts after their 90-day grace period expires.

**What gets deleted:**
- **Role deletions**: Roles scheduled for deletion via "Manage Role" modal
- **Account deletions**: Accounts scheduled for deletion via "Leave Astegni" modal

**When it runs:**
- Recommended: Daily at 2:00 AM (low traffic time)
- Processes all deletions past their `scheduled_deletion_at` timestamp

---

## Cron Job Script

**File**: [astegni-backend/cron_delete_expired_roles.py](astegni-backend/cron_delete_expired_roles.py)

This script:
1. Checks all profile tables for expired `scheduled_deletion_at` timestamps
2. Permanently deletes expired role profiles (CASCADE handles related data)
3. Removes role from user's `roles` array
4. Processes expired account deletions (complete user deletion)
5. Logs all deletions with timestamps

---

## Setup Instructions

### Option 1: Linux/Mac (Cron)

#### 1. Make script executable
```bash
cd /var/www/astegni/astegni-backend
chmod +x cron_delete_expired_roles.py
```

#### 2. Test the script manually
```bash
python cron_delete_expired_roles.py
```

Expected output:
```
[2026-01-26 14:30:00] ================================================================================
[2026-01-26 14:30:00] CRON JOB: Delete Expired Roles and Accounts
[2026-01-26 14:30:00] ================================================================================

[2026-01-26 14:30:00] [1/2] Checking for expired role deletions...
[2026-01-26 14:30:01] [SUMMARY] No expired roles found

[2026-01-26 14:30:01] [2/2] Checking for expired account deletions...
[2026-01-26 14:30:02] [SUMMARY] No expired accounts found

[2026-01-26 14:30:02] ================================================================================
[2026-01-26 14:30:02] COMPLETED: 0 roles and 0 accounts deleted
[2026-01-26 14:30:02] ================================================================================
```

#### 3. Set up cron job
```bash
# Open crontab editor
crontab -e

# Add this line (runs daily at 2:00 AM)
0 2 * * * cd /var/www/astegni/astegni-backend && /usr/bin/python3 cron_delete_expired_roles.py >> /var/log/astegni/cron_deletions.log 2>&1
```

**Explanation:**
- `0 2 * * *` - Run at 2:00 AM every day
- `cd /var/www/astegni/astegni-backend` - Navigate to backend directory
- `/usr/bin/python3 cron_delete_expired_roles.py` - Execute script with full Python path
- `>> /var/log/astegni/cron_deletions.log 2>&1` - Log output to file

#### 4. Create log directory
```bash
sudo mkdir -p /var/log/astegni
sudo chown $USER:$USER /var/log/astegni
```

#### 5. Verify cron job is scheduled
```bash
crontab -l
```

#### 6. Monitor logs
```bash
tail -f /var/log/astegni/cron_deletions.log
```

---

### Option 2: Windows (Task Scheduler)

#### 1. Test the script manually
```cmd
cd C:\Users\zenna\Downloads\Astegni\astegni-backend
python cron_delete_expired_roles.py
```

#### 2. Open Task Scheduler
- Press `Win + R`
- Type `taskschd.msc` and press Enter

#### 3. Create a new task
1. Click "Create Basic Task" in the Actions panel
2. **Name**: `Astegni Delete Expired Roles`
3. **Description**: `Automatically delete roles and accounts past 90-day grace period`

#### 4. Set trigger
1. Select "Daily"
2. Start date: Today
3. Start time: `02:00:00` (2:00 AM)
4. Recur every: `1` days

#### 5. Set action
1. Select "Start a program"
2. **Program/script**: `python` (or full path: `C:\Users\zenna\AppData\Local\Programs\Python\Python313\python.exe`)
3. **Add arguments**: `cron_delete_expired_roles.py`
4. **Start in**: `C:\Users\zenna\Downloads\Astegni\astegni-backend`

#### 6. Configure additional settings
1. Check "Open the Properties dialog for this task when I click Finish"
2. In the Properties dialog:
   - **General tab**:
     - Check "Run whether user is logged on or not"
     - Check "Run with highest privileges"
   - **Conditions tab**:
     - Uncheck "Start the task only if the computer is on AC power"
   - **Settings tab**:
     - Check "Allow task to be run on demand"
     - Check "Run task as soon as possible after a scheduled start is missed"

#### 7. Test the scheduled task
1. Right-click the task in Task Scheduler
2. Click "Run"
3. Check "History" tab to see execution logs

#### 8. View logs
Check the output in Task Scheduler's History tab, or redirect output to a file:

Modify the task action to:
```
cmd /c "python cron_delete_expired_roles.py >> C:\astegni-logs\cron_deletions.log 2>&1"
```

Create the log directory first:
```cmd
mkdir C:\astegni-logs
```

---

### Option 3: Production Server (Systemd Timer)

For production servers using systemd (more reliable than cron):

#### 1. Create service file
```bash
sudo nano /etc/systemd/system/astegni-delete-expired.service
```

Content:
```ini
[Unit]
Description=Astegni Delete Expired Roles and Accounts
After=network.target postgresql.service

[Service]
Type=oneshot
User=www-data
WorkingDirectory=/var/www/astegni/astegni-backend
ExecStart=/usr/bin/python3 cron_delete_expired_roles.py
StandardOutput=append:/var/log/astegni/cron_deletions.log
StandardError=append:/var/log/astegni/cron_deletions.log

[Install]
WantedBy=multi-user.target
```

#### 2. Create timer file
```bash
sudo nano /etc/systemd/system/astegni-delete-expired.timer
```

Content:
```ini
[Unit]
Description=Run Astegni deletion cleanup daily at 2 AM
Requires=astegni-delete-expired.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

#### 3. Enable and start the timer
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer to start on boot
sudo systemctl enable astegni-delete-expired.timer

# Start timer now
sudo systemctl start astegni-delete-expired.timer

# Check timer status
sudo systemctl status astegni-delete-expired.timer

# List all timers
sudo systemctl list-timers --all | grep astegni
```

#### 4. Test the service manually
```bash
sudo systemctl start astegni-delete-expired.service
sudo journalctl -u astegni-delete-expired.service -f
```

#### 5. View logs
```bash
# View recent logs
sudo journalctl -u astegni-delete-expired.service -n 50

# Follow logs in real-time
sudo journalctl -u astegni-delete-expired.service -f

# View log file directly
tail -f /var/log/astegni/cron_deletions.log
```

---

## Testing the Cron Job

### Test with Fake Data

To test the cron job without waiting 90 days:

#### 1. Create a test role deletion
```sql
-- Connect to database
psql -U astegni_user -d astegni_user_db

-- Set a tutor role to expire immediately
UPDATE tutor_profiles
SET scheduled_deletion_at = NOW() - INTERVAL '1 day',
    is_active = FALSE
WHERE user_id = 123;  -- Replace with test user ID
```

#### 2. Run the cron job
```bash
python cron_delete_expired_roles.py
```

#### 3. Verify deletion
```sql
-- Check if tutor profile was deleted
SELECT * FROM tutor_profiles WHERE user_id = 123;
-- Should return no rows

-- Check if role was removed from user
SELECT roles FROM users WHERE id = 123;
-- Should not include 'tutor' in the array
```

---

## Monitoring and Alerts

### Option 1: Email Notifications (Linux)

Install mail utility:
```bash
sudo apt-get install mailutils
```

Modify cron job to send email:
```bash
0 2 * * * cd /var/www/astegni/astegni-backend && /usr/bin/python3 cron_delete_expired_roles.py | mail -s "Astegni Daily Deletion Report" admin@astegni.com
```

### Option 2: Slack Notifications

Add to cron script:
```python
import requests

def send_slack_notification(message):
    webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    requests.post(webhook_url, json={"text": message})

# In main():
send_slack_notification(f"Deleted {len(deleted_roles)} roles and {deleted_accounts} accounts")
```

### Option 3: Database Logging

Create a deletions log table:
```sql
CREATE TABLE deletion_audit_log (
    id SERIAL PRIMARY KEY,
    deletion_type VARCHAR(20),  -- 'role' or 'account'
    user_id INTEGER,
    user_email VARCHAR(255),
    role_name VARCHAR(50),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    automated BOOLEAN DEFAULT TRUE
);
```

Update cron script to log to database:
```python
cursor.execute("""
    INSERT INTO deletion_audit_log (deletion_type, user_id, user_email, role_name)
    VALUES ('role', %s, %s, %s)
""", (user_id, user_email, role_name))
```

---

## Troubleshooting

### Cron job not running

**Check cron service status:**
```bash
sudo systemctl status cron
```

**Check cron logs:**
```bash
grep CRON /var/log/syslog
```

**Verify Python path:**
```bash
which python3
# Use this full path in crontab
```

### Database connection errors

**Check database connectivity:**
```bash
cd astegni-backend
python -c "import psycopg; from dotenv import load_dotenv; import os; load_dotenv(); print('OK')"
```

**Verify .env file:**
```bash
cat .env | grep DATABASE_URL
```

### Permission errors

**Check file ownership:**
```bash
ls -l cron_delete_expired_roles.py
# Should be owned by the user running cron
```

**Fix permissions:**
```bash
sudo chown www-data:www-data cron_delete_expired_roles.py
sudo chmod 755 cron_delete_expired_roles.py
```

---

## Production Deployment Checklist

- [ ] Test script manually in production environment
- [ ] Verify database backups are working (before first run!)
- [ ] Set up cron job or systemd timer
- [ ] Create log directory with proper permissions
- [ ] Configure log rotation (prevent disk space issues)
- [ ] Set up monitoring/alerts for failures
- [ ] Document in operations manual
- [ ] Test with fake data first
- [ ] Monitor first few runs closely

---

## Log Rotation (Prevent Log Files from Growing Too Large)

### Linux Log Rotation

Create logrotate config:
```bash
sudo nano /etc/logrotate.d/astegni-cron
```

Content:
```
/var/log/astegni/cron_deletions.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
}
```

Test rotation:
```bash
sudo logrotate -d /etc/logrotate.d/astegni-cron
```

---

## Security Considerations

1. **Database Backups**: Always ensure automated backups are running before enabling automatic deletion
2. **Audit Trail**: Consider logging all deletions to a separate audit table
3. **Notification**: Send alerts when deletions occur (especially for accounts)
4. **Dry Run Mode**: Consider adding a `--dry-run` flag for testing
5. **Manual Review**: For high-value accounts, consider requiring manual approval before permanent deletion

---

## Alternative: Manual Execution

If you prefer not to automate, you can run the script manually:

```bash
# Weekly manual execution
cd astegni-backend
python cron_delete_expired_roles.py

# View summary
tail -n 20 /var/log/astegni/cron_deletions.log
```

---

## Questions or Issues?

If the cron job fails:
1. Check logs: `tail -f /var/log/astegni/cron_deletions.log`
2. Test manually: `python cron_delete_expired_roles.py`
3. Verify database connection: `python test_connection.py`
4. Check scheduled_deletion_at timestamps: `SELECT * FROM tutor_profiles WHERE scheduled_deletion_at IS NOT NULL`

**Last Updated**: 2026-01-26
