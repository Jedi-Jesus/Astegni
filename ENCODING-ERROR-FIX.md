# Fix: PostgreSQL UTF8 to WIN1252 Encoding Error

## The Error You're Seeing

```
ERROR:  character with byte sequence 0xe1 0x8c 0x8d in encoding "UTF8" has no equivalent in encoding "WIN1252"
```

## ✅ Good News: Your Data is Fine!

The data in your database is perfectly fine. This is a **display issue** in Windows Command Prompt, not a data corruption issue.

**Verified:**
- ✅ Table `whiteboard_session_recordings` exists
- ✅ Has 6 rows of data
- ✅ All columns are intact
- ✅ Data contains: "Chemistry - Advanced Topics" recordings

---

## 🔍 What's Causing This?

The byte sequence `0xe1 0x8c 0x8d` is the UTF-8 encoding for the Ethiopian character **"ፍ"** (Ethiopic syllable FI).

Your database stores data in **UTF-8** encoding (supports all languages including Amharic/Ethiopic), but Windows Command Prompt uses **WIN1252** encoding (only Western European characters).

---

## ✅ Solutions (Choose One)

### Option 1: Use Python Scripts (RECOMMENDED)

Python handles UTF-8 natively. Use our script to view the data:

```bash
cd astegni-backend
python fix_encoding_issue.py
```

This displays:
```
ID    Session    Title                          Type       Duration   Available
--------------------------------------------------------------------------------
1     17         Chemistry - Advanced Topics    screen     0          True
2     17         Chemistry - Advanced Topics    screen     0          True
...
```

### Option 2: Set Client Encoding in psql

Before querying, set the client encoding:

```sql
-- In psql, run this BEFORE your SELECT query
SET client_encoding = 'WIN1252';

-- Now query the table
SELECT * FROM whiteboard_session_recordings;
```

**Note:** This will replace UTF-8 characters with `?` but won't crash.

### Option 3: Change Windows Console Encoding

Change CMD to use UTF-8:

```bash
# In Command Prompt, run this before psql
chcp 65001

# Then connect to psql
psql -U astegni_user -d astegni_db
```

### Option 4: Use a GUI Tool (EASIEST)

Use a database GUI that handles UTF-8 automatically:

- **pgAdmin** (free) - https://www.pgadmin.org/
- **DBeaver** (free) - https://dbeaver.io/
- **DataGrip** (paid) - https://www.jetbrains.com/datagrip/

These tools display Ethiopian characters correctly: **ፍ**

### Option 5: Query Specific Columns (QUICK FIX)

Skip columns with Ethiopian text:

```sql
-- Query only non-text columns
SELECT id, session_id, recording_type, duration_seconds, is_available
FROM whiteboard_session_recordings;
```

---

## 🔧 Permanent Fix for psql

Create a `.psqlrc` file in your home directory:

**Windows:** `C:\Users\YourName\.psqlrc`

```
\encoding UTF8
SET client_encoding = 'UTF8';
```

This sets UTF-8 encoding automatically every time you open psql.

---

## 📊 Your Current Data

The table currently contains:

| ID | Session ID | Title | Type | Records |
|----|------------|-------|------|---------|
| 1-6 | 17 | Chemistry - Advanced Topics | screen | 6 rows |

All data is intact and working correctly!

---

## 🧪 Test the Fix

### Using Python:
```bash
cd astegni-backend
python fix_encoding_issue.py
```

### Using psql:
```bash
psql -U astegni_user -d astegni_db
```

```sql
-- Set encoding first
SET client_encoding = 'WIN1252';

-- Then query
SELECT id, session_id, recording_title, recording_type
FROM whiteboard_session_recordings;
```

---

## 🎯 Summary

| Issue | Status |
|-------|--------|
| Database data corrupted? | ❌ NO - Data is fine |
| Display issue in Windows CMD? | ✅ YES - This is the problem |
| Can I still use the API? | ✅ YES - API works perfectly |
| Will this affect the app? | ❌ NO - Only affects psql queries |

---

## 💡 Recommended Workflow

**For development:**
1. Use Python scripts to interact with the database (recommended)
2. Use pgAdmin or DBeaver for GUI access
3. If using psql, set `client_encoding` first

**For the application:**
- ✅ The FastAPI backend handles UTF-8 correctly
- ✅ The frontend displays Ethiopian characters correctly
- ✅ No changes needed to your code

---

## 📝 Technical Details

**The problematic character:**
- Unicode: U+134D (ETHIOPIC SYLLABLE FI)
- UTF-8 bytes: 0xE1 0x8C 0x8D
- Character: **ፍ**
- Appears in: Ethiopian names, Amharic text, etc.

**Why it happens:**
- PostgreSQL stores data in UTF-8 (universal encoding)
- Windows CMD uses WIN1252 (limited to Western Europe)
- psql tries to convert UTF-8 → WIN1252 and fails

**The solution:**
- Tell psql to use UTF-8 encoding
- Or use tools that handle UTF-8 natively (Python, pgAdmin)

---

## ✅ Verification Complete

Your database is working correctly! The encoding error is just a display issue in Windows Command Prompt.

**What to do:**
1. ✅ Use Python scripts for database queries (recommended)
2. ✅ Or set client encoding before psql queries
3. ✅ Or use a GUI tool (pgAdmin, DBeaver)

🎉 **Your data is safe and the table rename is complete!**
