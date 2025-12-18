"""Verify database setup"""
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
cur = conn.cursor()

# List all tables
cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
""")
tables = [row['table_name'] for row in cur.fetchall()]

print(f"Total tables: {len(tables)}")
print("\nAll tables:")
for t in tables:
    print(f"  - {t}")

# Check admin_credentials exists
print("\n" + "=" * 50)
if 'admin_credentials' in tables:
    print("✓ admin_credentials table exists")
    cur.execute("SELECT COUNT(*) as count FROM admin_credentials")
    print(f"  Records: {cur.fetchone()['count']}")
else:
    print("✗ admin_credentials table NOT found")

# Check backup tables are gone
backup_tables = ['admin_profile_old_backup', 'admin_profile_stats_backup', 'connections_backup']
for bt in backup_tables:
    if bt in tables:
        print(f"✗ {bt} still exists (should be dropped)")
    else:
        print(f"✓ {bt} dropped")

cur.close()
conn.close()
