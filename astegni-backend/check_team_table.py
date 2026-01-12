"""Check advertiser_team_members table structure"""
import psycopg
from psycopg.rows import dict_row

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db', row_factory=dict_row)
cur = conn.cursor()

print("=== ADVERTISER_TEAM_MEMBERS COLUMNS ===")
cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'advertiser_team_members'
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f"  {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']})")

print("\n=== CONSTRAINTS ===")
cur.execute("""
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'advertiser_team_members'::regclass
""")
for row in cur.fetchall():
    print(f"  {row['conname']}: {row['pg_get_constraintdef']}")

print("\n=== DATA COUNT ===")
cur.execute('SELECT COUNT(*) as cnt FROM advertiser_team_members')
print(f"  Total rows: {cur.fetchone()['cnt']}")

print("\n=== SAMPLE DATA ===")
cur.execute('SELECT id, role, status, email FROM advertiser_team_members LIMIT 5')
for row in cur.fetchall():
    print(f"  ID: {row['id']}, Role: {row['role']}, Status: {row['status']}, Email: {row['email']}")

conn.close()
print("\nDone!")
