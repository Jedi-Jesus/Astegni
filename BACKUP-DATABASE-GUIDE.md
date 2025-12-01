# PostgreSQL Database Backup Guide for Windows

## Where to Run the Backup

You have two options:

---

## Option 1: Command Prompt (Recommended)

### Step 1: Open Command Prompt
- Press `Win + R`
- Type `cmd`
- Press Enter

### Step 2: Navigate to PostgreSQL bin directory
```cmd
cd "C:\Program Files\PostgreSQL\<version>\bin"
```

**Common paths:**
- PostgreSQL 16: `C:\Program Files\PostgreSQL\16\bin`
- PostgreSQL 15: `C:\Program Files\PostgreSQL\15\bin`
- PostgreSQL 14: `C:\Program Files\PostgreSQL\14\bin`

**Or if PostgreSQL is in PATH (check with):**
```cmd
where pg_dump
```

If this returns a path, you can skip the cd command above.

### Step 3: Run the backup
```cmd
pg_dump -U astegni_user -h localhost -p 5432 astegni_db > "C:\Users\zenna\Downloads\Astegni\backup_before_migration.sql"
```

**You'll be prompted for password:** `Astegni2025`

### Step 4: Verify backup was created
```cmd
dir "C:\Users\zenna\Downloads\Astegni\backup_before_migration.sql"
```

You should see the file with a size > 0 KB.

---

## Option 2: From Astegni Project Directory

### Step 1: Open Command Prompt in project directory
- Navigate to `C:\Users\zenna\Downloads\Astegni` in File Explorer
- Type `cmd` in the address bar
- Press Enter

### Step 2: Run backup command
```cmd
"C:\Program Files\PostgreSQL\16\bin\pg_dump" -U astegni_user -h localhost -p 5432 astegni_db > backup_before_migration.sql
```

**Replace `16` with your PostgreSQL version if different.**

**Enter password when prompted:** `Astegni2025`

---

## Option 3: Using pgAdmin (GUI - Easiest)

### Step 1: Open pgAdmin
- Find pgAdmin in your Start Menu
- Connect to your PostgreSQL server

### Step 2: Backup Database
1. In the left sidebar, expand **Servers** → **PostgreSQL** → **Databases**
2. Right-click on **astegni_db**
3. Select **Backup...**
4. In the dialog:
   - **Filename:** `C:\Users\zenna\Downloads\Astegni\backup_before_migration.sql`
   - **Format:** Plain (SQL format)
   - **Encoding:** UTF8
5. Click **Backup**

### Step 3: Wait for completion
You'll see a success message when done.

---

## Quick Method: Python Script

Create this file as `astegni-backend/backup_db.py`:

```python
import os
import subprocess
from datetime import datetime

# Database credentials
DB_USER = "astegni_user"
DB_NAME = "astegni_db"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_PASSWORD = "Astegni2025"

# Backup file path
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_file = f"../backup_before_migration_{timestamp}.sql"

# Set password environment variable (Windows)
os.environ['PGPASSWORD'] = DB_PASSWORD

# Run pg_dump
print(f"Creating backup: {backup_file}")
try:
    subprocess.run([
        "pg_dump",
        "-U", DB_USER,
        "-h", DB_HOST,
        "-p", DB_PORT,
        DB_NAME,
        "-f", backup_file
    ], check=True)

    print(f"✅ Backup created successfully: {backup_file}")
    print(f"File size: {os.path.getsize(backup_file) / 1024:.2f} KB")
except subprocess.CalledProcessError as e:
    print(f"❌ Backup failed: {e}")
except FileNotFoundError:
    print("❌ pg_dump not found. Make sure PostgreSQL bin is in your PATH.")
    print("   Or use full path: C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump")
finally:
    # Clear password from environment
    del os.environ['PGPASSWORD']
```

**Then run:**
```bash
cd astegni-backend
python backup_db.py
```

---

## Verify Backup

After creating the backup, verify it:

### Check file size:
```cmd
dir backup_before_migration.sql
```

Should be at least 100+ KB (depends on your data).

### Check first few lines:
```cmd
type backup_before_migration.sql | more
```

You should see SQL commands like:
```sql
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
...
```

---

## Restore Backup (If Needed)

If something goes wrong and you need to restore:

### Option 1: Command Prompt
```cmd
psql -U astegni_user -h localhost -p 5432 astegni_db < backup_before_migration.sql
```

### Option 2: pgAdmin
1. Right-click on **astegni_db**
2. Select **Restore...**
3. Select your backup file
4. Click **Restore**

---

## Common Errors & Solutions

### Error: "pg_dump is not recognized"
**Solution:** PostgreSQL bin is not in PATH. Use full path:
```cmd
"C:\Program Files\PostgreSQL\16\bin\pg_dump" -U astegni_user astegni_db > backup.sql
```

### Error: "password authentication failed"
**Solution:** Check password in command or use PGPASSWORD:
```cmd
set PGPASSWORD=Astegni2025
pg_dump -U astegni_user astegni_db > backup.sql
```

### Error: "could not connect to server"
**Solution:** Make sure PostgreSQL is running:
```cmd
services.msc
```
Look for "postgresql-x64-16" (or your version) and make sure it's Running.

---

## Summary - Recommended Method

**Easiest for you:**

1. Open Command Prompt in `C:\Users\zenna\Downloads\Astegni`
2. Run:
   ```cmd
   "C:\Program Files\PostgreSQL\16\bin\pg_dump" -U astegni_user -h localhost -p 5432 astegni_db > backup_before_migration.sql
   ```
3. Enter password: `Astegni2025`
4. Verify: `dir backup_before_migration.sql`

**Then proceed with migration:**
```bash
cd astegni-backend
python migrate_cleanup_connections_table.py
```

---

## Need Help?

If you get errors, let me know:
1. What command you ran
2. What error message you see
3. Your PostgreSQL version (check: `psql --version`)
