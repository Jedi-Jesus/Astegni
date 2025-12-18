"""Check admin_profile_stats table structure"""
import psycopg
from psycopg.rows import dict_row

conn = psycopg.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db", row_factory=dict_row)
cur = conn.cursor()

# Find admin tables
cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE '%admin%'
    ORDER BY table_name
""")
print("Admin-related tables in astegni_admin_db:")
print("-" * 50)
for row in cur.fetchall():
    print(f"  - {row['table_name']}")

# Check for admin_profile_stats
print("\n" + "=" * 60)
cur.execute("""
    SELECT EXISTS(
        SELECT FROM information_schema.tables
        WHERE table_name = 'admin_profile_stats'
    )
""")
if cur.fetchone()['exists']:
    print("admin_profile_stats structure:")
    print("-" * 60)
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'admin_profile_stats'
        ORDER BY ordinal_position
    """)
    for row in cur.fetchall():
        col = row['column_name']
        dtype = row['data_type']
        nullable = 'NULL' if row['is_nullable'] == 'YES' else 'NOT NULL'
        print(f"  {col:30} {dtype:20} {nullable}")

    # Sample data
    print("\nSample data:")
    print("-" * 60)
    cur.execute("SELECT * FROM admin_profile_stats LIMIT 3")
    for row in cur.fetchall():
        print(row)
else:
    # Maybe it's admin_profiles?
    print("admin_profile_stats not found. Checking admin_profiles...")
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'admin_profiles'
        ORDER BY ordinal_position
    """)
    print("\nadmin_profiles structure:")
    print("-" * 60)
    for row in cur.fetchall():
        col = row['column_name']
        dtype = row['data_type']
        nullable = 'NULL' if row['is_nullable'] == 'YES' else 'NOT NULL'
        print(f"  {col:30} {dtype:20} {nullable}")

    # Sample data
    print("\nSample data:")
    print("-" * 60)
    cur.execute("SELECT * FROM admin_profiles LIMIT 2")
    for row in cur.fetchall():
        print(row)

cur.close()
conn.close()
