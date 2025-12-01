"""
Check admin_profile table structure
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
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'admin_profile'
    ORDER BY ordinal_position
""")

print('Current admin_profile table structure:')
print('=' * 80)
print(f"{'Column Name':<30} {'Data Type':<20} {'Nullable':<10} {'Default':<20}")
print('-' * 80)

for row in cur.fetchall():
    col_name, data_type, nullable, default = row
    default_str = str(default)[:18] if default else ''
    print(f"{col_name:<30} {data_type:<20} {nullable:<10} {default_str:<20}")

print('=' * 80)

# Check if 'name' column exists
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_profile' AND column_name = 'name'
""")
has_name = cur.fetchone()

print(f"\n'name' column exists: {bool(has_name)}")

# Check if 'admin_username' column exists
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_profile' AND column_name = 'admin_username'
""")
has_admin_username = cur.fetchone()

print(f"'admin_username' column exists: {bool(has_admin_username)}")

# Check existing columns
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin_profile' AND column_name IN ('first_name', 'father_name', 'grandfather_name')
""")
name_columns = cur.fetchall()
print(f"\nName-related columns found: {[row[0] for row in name_columns]}")

# Check sample data if name column exists
if has_name:
    cur.execute("SELECT id, name FROM admin_profile LIMIT 5")
    print("\nSample data in 'name' column:")
    for row in cur.fetchall():
        print(f"  ID {row[0]}: {row[1]}")

cur.close()
conn.close()
