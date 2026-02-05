# Daily Cron Job Setup - Payment Overdue Calculator

**Date:** January 20, 2026

This guide shows how to set up the daily cron job to automatically update overdue payment calculations.

---

## 🎯 What It Does

The `update_days_overdue()` PostgreSQL function:
1. Calculates `days_overdue` for all overdue payments
2. Updates `payment_status` from 'pending' to 'late' if past due date
3. Runs automatically every day at 2 AM

---

## 🐧 Linux/Mac Production Server Setup

### Option 1: User Crontab (Recommended)

```bash
# SSH into production server
ssh root@128.140.122.215

# Edit crontab for current user
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * cd /var/www/astegni/astegni-backend && /usr/bin/psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();" >> /var/log/astegni/payment_updates.log 2>&1
```

**Explanation:**
- `0 2 * * *` - Run at 2:00 AM every day
- `cd /var/www/astegni/astegni-backend` - Go to project directory
- `/usr/bin/psql` - Full path to psql command
- `-U astegni_user` - Database user
- `-d astegni_user_db` - Database name
- `-c "SELECT update_days_overdue();"` - SQL command to execute
- `>> /var/log/astegni/payment_updates.log 2>&1` - Log output and errors

### Option 2: System Crontab

```bash
# Edit system crontab
sudo nano /etc/crontab

# Add this line
0 2 * * * astegni_user cd /var/www/astegni/astegni-backend && /usr/bin/psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();" >> /var/log/astegni/payment_updates.log 2>&1
```

### Create Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/astegni

# Set permissions
sudo chown astegni_user:astegni_user /var/log/astegni
sudo chmod 755 /var/log/astegni
```

### Verify Cron Job

```bash
# List cron jobs for current user
crontab -l

# Check if cron service is running
sudo systemctl status cron

# View cron logs
sudo tail -f /var/log/cron
# OR
sudo journalctl -u cron -f
```

### Test Manually

```bash
# Test the command manually first
cd /var/www/astegni/astegni-backend
psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"

# Should output: update_days_overdue
#                --------------------
#
#                (1 row)
```

---

## 🪟 Windows Development Setup

### Option 1: Task Scheduler GUI

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create Basic Task**
   - Click "Create Basic Task" in right panel
   - Name: "Astegni Payment Overdue Calculator"
   - Description: "Updates overdue payment calculations daily"

3. **Set Trigger**
   - Trigger: Daily
   - Start: Tomorrow at 2:00 AM
   - Recur every: 1 days

4. **Set Action**
   - Action: Start a program
   - Program/script: `C:\Program Files\PostgreSQL\16\bin\psql.exe`
   - Add arguments: `-U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"`
   - Start in: `C:\Users\zenna\Downloads\Astegni\astegni-backend`

5. **Finish**
   - Check "Open Properties dialog" before clicking Finish
   - In Properties → Settings, check "Run task as soon as possible after a scheduled start is missed"

### Option 2: PowerShell Script

Create `update_payments.ps1`:

```powershell
# update_payments.ps1
$pgPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$dbUser = "astegni_user"
$dbName = "astegni_user_db"
$logPath = "C:\Users\zenna\Downloads\Astegni\logs\payment_updates.log"

# Create log directory if not exists
$logDir = Split-Path -Parent $logPath
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force
}

# Run SQL command
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logPath -Value "[$timestamp] Running update_days_overdue()"

& $pgPath -U $dbUser -d $dbName -c "SELECT update_days_overdue();" 2>&1 | Add-Content -Path $logPath

Add-Content -Path $logPath -Value "[$timestamp] Completed`n"
```

Then schedule it:

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Users\zenna\Downloads\Astegni\astegni-backend\update_payments.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "Astegni Payment Overdue Calculator" -Action $action -Trigger $trigger -Principal $principal -Settings $settings
```

### Test Windows Task

```powershell
# Run task manually
Start-ScheduledTask -TaskName "Astegni Payment Overdue Calculator"

# Check task status
Get-ScheduledTask -TaskName "Astegni Payment Overdue Calculator"

# View last run result
Get-ScheduledTaskInfo -TaskName "Astegni Payment Overdue Calculator"

# View logs
Get-Content C:\Users\zenna\Downloads\Astegni\logs\payment_updates.log -Tail 20
```

---

## 🔍 Monitoring & Troubleshooting

### Check If Job Ran

```sql
-- Check last time payment statuses were updated
SELECT
    COUNT(*) as total_late_payments,
    MAX(updated_at) as last_update_time
FROM user_investments
WHERE payment_status = 'late';
```

### View Overdue Payments

```sql
SELECT * FROM overdue_payments;
```

### Manual Execution

```bash
# Linux/Mac
psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"

# Windows
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"
```

### Common Issues

**Issue: "psql: command not found"**
```bash
# Find psql location
which psql  # Linux/Mac
where psql  # Windows

# Use full path in cron job
/usr/bin/psql ...  # Linux
C:\Program Files\PostgreSQL\16\bin\psql.exe ...  # Windows
```

**Issue: "authentication failed"**
```bash
# Set up .pgpass file (Linux/Mac)
echo "localhost:5432:astegni_user_db:astegni_user:Astegni2025" > ~/.pgpass
chmod 600 ~/.pgpass

# Or use environment variables
export PGPASSWORD='Astegni2025'
```

**Issue: Cron job not running**
```bash
# Check cron service
sudo systemctl status cron  # Linux
sudo service cron status     # Older Linux

# Restart cron
sudo systemctl restart cron

# Check cron logs
tail -f /var/log/syslog | grep CRON  # Ubuntu/Debian
tail -f /var/log/cron                 # CentOS/RHEL
```

---

## 📊 Expected Results

After the cron job runs, you should see:

1. **Late payments marked:**
   ```sql
   SELECT payment_status, COUNT(*)
   FROM user_investments
   WHERE due_date < CURRENT_DATE
   GROUP BY payment_status;

   -- Result:
   -- payment_status | count
   -- late           | 5
   -- paid           | 12
   ```

2. **Days overdue calculated:**
   ```sql
   SELECT id, due_date, days_overdue, payment_status
   FROM user_investments
   WHERE payment_status = 'late'
   ORDER BY days_overdue DESC;

   -- Result:
   -- id | due_date   | days_overdue | payment_status
   -- 45 | 2026-01-05 | 15           | late
   -- 67 | 2026-01-10 | 10           | late
   ```

3. **Overdue view populated:**
   ```sql
   SELECT COUNT(*) FROM overdue_payments;

   -- Result: 5
   ```

---

## 🔄 Alternative: Python Scheduler (Development)

For development or if cron is not available:

Create `scheduled_payment_updater.py`:

```python
"""
Scheduled payment updater - runs continuously
Alternative to cron for development
"""
import schedule
import time
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def update_payments():
    """Run payment updates"""
    print(f"[{datetime.now()}] Running update_days_overdue()...")

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT update_days_overdue()"))
            conn.commit()
        print(f"[{datetime.now()}] ✅ Payment updates completed")
    except Exception as e:
        print(f"[{datetime.now()}] ❌ Error: {e}")

# Schedule daily at 2 AM
schedule.every().day.at("02:00").do(update_payments)

print("Payment updater started. Will run daily at 2:00 AM.")
print("Press Ctrl+C to stop.")

# For testing: run every minute
# schedule.every(1).minutes.do(update_payments)

while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute
```

Run it:

```bash
# Install schedule
pip install schedule

# Run continuously
python scheduled_payment_updater.py

# Or run in background (Linux)
nohup python scheduled_payment_updater.py > payment_updater.log 2>&1 &
```

---

## ✅ Verification Checklist

- [ ] Cron job created and scheduled
- [ ] Log directory created with proper permissions
- [ ] Manual test successful
- [ ] Cron job appears in `crontab -l`
- [ ] First automated run completed successfully
- [ ] Logs show successful execution
- [ ] Database shows updated `days_overdue` values
- [ ] `overdue_payments` view populated correctly

---

**Last Updated:** January 20, 2026
**Status:** ✅ Ready for Production
