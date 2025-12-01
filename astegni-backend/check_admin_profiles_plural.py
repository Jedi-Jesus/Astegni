"""
Check admin_profiles (plural) table structure
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

# Get table structure
cur.execute("""
    SELECT
        a.attname as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
    FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = (
        SELECT c.oid FROM pg_catalog.pg_class c
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'admin_profiles'
        AND pg_catalog.pg_table_is_visible(c.oid)
    )
    AND a.attnum > 0
    AND NOT a.attisdropped
    ORDER BY a.attnum;
""")

print('Table: admin_profiles (plural)')
print('=' * 80)
print(f"{'Column Name':<30} {'Data Type':<30}")
print('-' * 80)

for row in cur.fetchall():
    print(f"{row[0]:<30} {row[1]:<30}")

print('=' * 80)

# Check for 'name' column specifically
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_profiles' AND column_name = 'name'
""")
has_name = cur.fetchone()
print(f"\n'name' column exists in admin_profiles: {bool(has_name)}")

# Check for name-related columns
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_profiles'
    AND column_name IN ('first_name', 'father_name', 'grandfather_name', 'admin_username', 'username')
    ORDER BY column_name
""")
name_cols = cur.fetchall()
print(f"Name-related columns: {[row[0] for row in name_cols]}")

# Get sample data
cur.execute("SELECT * FROM admin_profiles LIMIT 1")
columns = [desc[0] for desc in cur.description]
row = cur.fetchone()

print('\nSample record:')
print('-' * 80)
if row:
    for col, val in zip(columns, row):
        val_str = str(val)[:50] if val else 'NULL'
        print(f"  {col}: {val_str}")
else:
    print("  No records found")

# Count records
cur.execute("SELECT COUNT(*) FROM admin_profiles")
count = cur.fetchone()[0]
print(f"\nTotal records in admin_profiles: {count}")

cur.close()
conn.close()
