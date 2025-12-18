"""Get table structure for credentials table"""
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
cur = conn.cursor()

# Get credentials table structure
cur.execute("""
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'credentials'
    ORDER BY ordinal_position
""")
columns = cur.fetchall()

print("credentials table structure:")
print("-" * 80)
for col in columns:
    print(f"{col['column_name']:30} {col['data_type']:20} nullable:{col['is_nullable']}")

cur.close()
conn.close()
