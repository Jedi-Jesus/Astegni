"""
Cleanup and migrate tables between databases
1. Drop unnecessary tables from astegni_user_db
2. Move admin tables to astegni_admin_db
"""
import psycopg
from psycopg.rows import dict_row

USER_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
ADMIN_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

print("=" * 70)
print("DATABASE CLEANUP AND MIGRATION")
print("=" * 70)

# ============================================================
# STEP 1: Drop unnecessary tables from user_db
# ============================================================
print("\n[STEP 1] Dropping unnecessary tables from astegni_user_db...")

tables_to_drop = [
    'blog_posts',           # Duplicate - we have 'blogs' table
    'child_profiles',       # Not needed
    'event_attendees',      # Keep event_registrations instead
    'favorite_tutors',      # Not needed (use connections)
    'playlist_videos',      # Not needed
    'club_memberships',     # Duplicate - keep club_members
    'contents',             # Not needed
    'coparent_invitations', # Not needed
]

user_conn = psycopg.connect(USER_DB_URL, row_factory=dict_row)
user_cur = user_conn.cursor()

for table in tables_to_drop:
    try:
        user_cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
        print(f"   [OK] Dropped {table}")
    except Exception as e:
        print(f"   [ERROR] Failed to drop {table}: {e}")

user_conn.commit()

# ============================================================
# STEP 2: Get admin table structures and data
# ============================================================
print("\n[STEP 2] Migrating admin tables to astegni_admin_db...")

admin_tables = [
    'admin_credentials',
    'admin_profile',
    'admin_profile_stats',
    'admin_reviews',
    'manage_campaigns_profile',
    'manage_contents_profile',
    'manage_courses_profile',
    'manage_customers_profile',
    'manage_schools_profile',
    'manage_system_settings_profile',
    'manage_tutors_profile',
    'manage_uploads',
]

admin_conn = psycopg.connect(ADMIN_DB_URL, row_factory=dict_row)
admin_cur = admin_conn.cursor()

for table in admin_tables:
    try:
        # Check if table exists in user_db
        user_cur.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = '{table}'
            )
        """)
        if not user_cur.fetchone()['exists']:
            print(f"   [SKIP] {table} not found in user_db")
            continue

        # Get CREATE TABLE statement
        user_cur.execute(f"""
            SELECT
                'CREATE TABLE IF NOT EXISTS ' || '{table}' || ' (' ||
                string_agg(
                    column_name || ' ' ||
                    CASE
                        WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                        WHEN data_type = 'integer' THEN 'INTEGER'
                        WHEN data_type = 'bigint' THEN 'BIGINT'
                        WHEN data_type = 'text' THEN 'TEXT'
                        WHEN data_type = 'boolean' THEN 'BOOLEAN'
                        WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
                        WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                        WHEN data_type = 'date' THEN 'DATE'
                        WHEN data_type = 'json' THEN 'JSON'
                        WHEN data_type = 'jsonb' THEN 'JSONB'
                        WHEN data_type = 'numeric' THEN 'NUMERIC'
                        WHEN data_type = 'double precision' THEN 'DOUBLE PRECISION'
                        WHEN data_type = 'real' THEN 'REAL'
                        ELSE data_type
                    END ||
                    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                    ', '
                    ORDER BY ordinal_position
                ) || ')' as create_stmt
            FROM information_schema.columns
            WHERE table_name = '{table}'
            GROUP BY table_name
        """)
        result = user_cur.fetchone()

        if result:
            # Create table in admin_db
            admin_cur.execute(result['create_stmt'])

            # Copy data
            user_cur.execute(f"SELECT * FROM {table}")
            rows = user_cur.fetchall()

            if rows:
                # Get column names
                columns = list(rows[0].keys())
                placeholders = ', '.join(['%s'] * len(columns))
                col_names = ', '.join(columns)

                for row in rows:
                    values = [row[col] for col in columns]
                    admin_cur.execute(
                        f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                        values
                    )

            admin_conn.commit()
            print(f"   [OK] Migrated {table} ({len(rows)} rows)")

            # Drop from user_db
            user_cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
            user_conn.commit()
            print(f"        Dropped from user_db")

    except Exception as e:
        print(f"   [ERROR] Failed to migrate {table}: {e}")
        admin_conn.rollback()
        user_conn.rollback()

# ============================================================
# STEP 3: Verify results
# ============================================================
print("\n[STEP 3] Verification...")

# Count tables in user_db
user_cur.execute("""
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_schema = 'public'
""")
user_count = user_cur.fetchone()['count']

# Count tables in admin_db
admin_cur.execute("""
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_schema = 'public'
""")
admin_count = admin_cur.fetchone()['count']

print(f"\n   astegni_user_db: {user_count} tables")
print(f"   astegni_admin_db: {admin_count} tables")

# List admin_db tables
admin_cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
""")
admin_tables_list = [row['table_name'] for row in admin_cur.fetchall()]
print(f"\n   Admin tables: {admin_tables_list}")

user_cur.close()
user_conn.close()
admin_cur.close()
admin_conn.close()

print("\n" + "=" * 70)
print("CLEANUP AND MIGRATION COMPLETE!")
print("=" * 70)
