"""
Verify actual admin_profile table structure with \d command equivalent
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

# Get exact table structure like \d command
cur.execute("""
    SELECT
        a.attname as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
        a.attnotnull as not_null,
        (SELECT substring(pg_catalog.pg_get_expr(d.adbin, d.adrelid) for 128)
         FROM pg_catalog.pg_attrdef d
         WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum AND a.atthasdef) as default_value
    FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = (
        SELECT c.oid FROM pg_catalog.pg_class c
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'admin_profile'
        AND pg_catalog.pg_table_is_visible(c.oid)
    )
    AND a.attnum > 0
    AND NOT a.attisdropped
    ORDER BY a.attnum;
""")

print('\\d admin_profile (actual structure):')
print('=' * 100)
print(f"{'Column':<25} {'Type':<30} {'Not Null':<10} {'Default':<30}")
print('-' * 100)

for row in cur.fetchall():
    col_name, data_type, not_null, default = row
    not_null_str = 'YES' if not_null else 'NO'
    default_str = str(default)[:28] if default else ''
    print(f"{col_name:<25} {data_type:<30} {not_null_str:<10} {default_str:<30}")

print('=' * 100)

# Get sample data
cur.execute("SELECT * FROM admin_profile LIMIT 1")
columns = [desc[0] for desc in cur.description]
row = cur.fetchone()

print('\nSample record (first row):')
print('-' * 100)
if row:
    for col, val in zip(columns, row):
        print(f"  {col}: {val}")
else:
    print("  No records found")

cur.close()
conn.close()
