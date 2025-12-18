"""Check system_media table structure"""
import psycopg
from psycopg.rows import dict_row

conn = psycopg.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db", row_factory=dict_row)
cur = conn.cursor()

# Get table structure
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'system_media'
    ORDER BY ordinal_position
""")

print("system_media table structure:")
print("-" * 70)
for row in cur.fetchall():
    col = row['column_name']
    dtype = row['data_type']
    nullable = row['is_nullable']
    default = str(row['column_default'])[:40] if row['column_default'] else ''
    print(f"  {col:20} {dtype:20} {nullable:5} {default}")

# Check if there's any data
cur.execute("SELECT * FROM system_media LIMIT 5")
rows = cur.fetchall()
print(f"\nSample data ({len(rows)} rows):")
if rows:
    for row in rows:
        print(row)
else:
    print("(table is empty)")

cur.close()
conn.close()
