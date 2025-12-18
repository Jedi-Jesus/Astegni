"""Create admin_portfolio table to track admin activities across departments"""
import psycopg
from psycopg.rows import dict_row

conn = psycopg.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db", row_factory=dict_row)
cur = conn.cursor()

print("=" * 70)
print("UPDATING admin_profile_stats AND CREATING admin_portfolio")
print("=" * 70)

# 1. Remove fields from admin_profile_stats
print("\n[1] Removing action fields from admin_profile_stats...")
fields_to_remove = ['total_actions', 'courses_managed', 'tutors_verified', 'reviews_moderated']
for field in fields_to_remove:
    cur.execute(f"ALTER TABLE admin_profile_stats DROP COLUMN IF EXISTS {field}")
    print(f"    [OK] Removed: {field}")
conn.commit()

# 2. Create admin_portfolio table
print("\n[2] Creating admin_portfolio table...")
cur.execute("DROP TABLE IF EXISTS admin_portfolio CASCADE")
cur.execute("""
    CREATE TABLE admin_portfolio (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL,

        -- Departments this admin works in
        departments JSONB DEFAULT '[]'::jsonb,

        -- Overall stats
        total_actions INTEGER DEFAULT 0,

        -- Courses actions
        courses_verified INTEGER DEFAULT 0,
        courses_rejected INTEGER DEFAULT 0,
        courses_suspended INTEGER DEFAULT 0,
        courses_reactivated INTEGER DEFAULT 0,

        -- Schools actions
        schools_verified INTEGER DEFAULT 0,
        schools_rejected INTEGER DEFAULT 0,
        schools_suspended INTEGER DEFAULT 0,
        schools_reactivated INTEGER DEFAULT 0,

        -- Tutors actions
        tutors_verified INTEGER DEFAULT 0,
        tutors_rejected INTEGER DEFAULT 0,
        tutors_suspended INTEGER DEFAULT 0,
        tutors_reactivated INTEGER DEFAULT 0,

        -- Students actions
        students_verified INTEGER DEFAULT 0,
        students_suspended INTEGER DEFAULT 0,
        students_reactivated INTEGER DEFAULT 0,

        -- Contents actions
        contents_approved INTEGER DEFAULT 0,
        contents_rejected INTEGER DEFAULT 0,
        contents_flagged INTEGER DEFAULT 0,
        contents_removed INTEGER DEFAULT 0,

        -- Reviews actions
        reviews_approved INTEGER DEFAULT 0,
        reviews_rejected INTEGER DEFAULT 0,
        reviews_flagged INTEGER DEFAULT 0,

        -- Campaigns actions
        campaigns_approved INTEGER DEFAULT 0,
        campaigns_rejected INTEGER DEFAULT 0,
        campaigns_paused INTEGER DEFAULT 0,

        -- Advertisers actions
        advertisers_verified INTEGER DEFAULT 0,
        advertisers_rejected INTEGER DEFAULT 0,
        advertisers_suspended INTEGER DEFAULT 0,

        -- Documents actions
        documents_verified INTEGER DEFAULT 0,
        documents_rejected INTEGER DEFAULT 0,

        -- Support actions
        tickets_resolved INTEGER DEFAULT 0,
        tickets_escalated INTEGER DEFAULT 0,

        -- Activity log (recent actions as JSON array)
        recent_actions JSONB DEFAULT '[]'::jsonb,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
conn.commit()
print("    [OK] Created admin_portfolio table")

# 3. Create indexes
print("\n[3] Creating indexes...")
cur.execute("CREATE INDEX idx_admin_portfolio_admin_id ON admin_portfolio(admin_id)")
cur.execute("CREATE INDEX idx_admin_portfolio_departments ON admin_portfolio USING GIN(departments)")
conn.commit()
print("    [OK] Created indexes")

# 4. Show new structure
print("\n[4] admin_portfolio structure:")
print("-" * 70)
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'admin_portfolio'
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    col = row['column_name']
    dtype = row['data_type']
    print(f"  {col:30} {dtype}")

# 5. Show updated admin_profile_stats
print("\n[5] Updated admin_profile_stats structure:")
print("-" * 70)
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'admin_profile_stats'
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    col = row['column_name']
    dtype = row['data_type']
    print(f"  {col:30} {dtype}")

cur.close()
conn.close()
print("\n" + "=" * 70)
print("DONE!")
print("=" * 70)
