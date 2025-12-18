"""
Migrate admin tables using pg_dump style approach
"""
import psycopg
from psycopg.rows import dict_row
import subprocess
import os

USER_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
ADMIN_DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

print("=" * 70)
print("ADMIN TABLES MIGRATION (Method 2)")
print("=" * 70)

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

user_conn = psycopg.connect(USER_DB_URL, row_factory=dict_row)
user_cur = user_conn.cursor()

admin_conn = psycopg.connect(ADMIN_DB_URL, row_factory=dict_row)
admin_cur = admin_conn.cursor()

for table in admin_tables:
    try:
        # Check if table exists
        user_cur.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = '{table}'
            )
        """)
        if not user_cur.fetchone()['exists']:
            print(f"[SKIP] {table} not found in user_db")
            continue

        print(f"\n[{table}]")

        # Get column info
        user_cur.execute(f"""
            SELECT column_name, data_type, character_maximum_length,
                   is_nullable, column_default, udt_name
            FROM information_schema.columns
            WHERE table_name = '{table}'
            ORDER BY ordinal_position
        """)
        columns = user_cur.fetchall()

        # Build CREATE TABLE
        col_defs = []
        for col in columns:
            col_name = col['column_name']
            data_type = col['data_type']
            udt_name = col['udt_name']
            max_len = col['character_maximum_length']
            nullable = col['is_nullable']
            default = col['column_default']

            # Build type string
            if data_type == 'character varying':
                type_str = f"VARCHAR({max_len})" if max_len else "VARCHAR(255)"
            elif data_type == 'ARRAY':
                # Handle array types
                base_type = udt_name.lstrip('_')
                type_str = f"{base_type.upper()}[]"
            elif data_type == 'USER-DEFINED':
                type_str = udt_name.upper()
            else:
                type_str = data_type.upper()

            # Build column definition
            col_def = f"{col_name} {type_str}"

            # Add NOT NULL
            if nullable == 'NO':
                col_def += " NOT NULL"

            # Add DEFAULT (skip sequences, we'll use SERIAL)
            if default:
                if 'nextval' in str(default):
                    # Replace with SERIAL
                    if 'INTEGER' in type_str or 'integer' in type_str.lower():
                        col_def = f"{col_name} SERIAL"
                        if nullable == 'NO':
                            col_def += " NOT NULL"
                else:
                    col_def += f" DEFAULT {default}"

            col_defs.append(col_def)

        # Add primary key if 'id' column exists
        has_id = any(col['column_name'] == 'id' for col in columns)

        create_sql = f"CREATE TABLE IF NOT EXISTS {table} (\n  " + ",\n  ".join(col_defs)
        if has_id:
            create_sql += f",\n  PRIMARY KEY (id)"
        create_sql += "\n)"

        # Create table in admin_db
        admin_cur.execute(create_sql)
        admin_conn.commit()
        print(f"   Created table")

        # Copy data
        user_cur.execute(f"SELECT * FROM {table}")
        rows = user_cur.fetchall()

        if rows:
            col_names = [col['column_name'] for col in columns]
            # Skip 'id' for SERIAL
            insert_cols = [c for c in col_names if c != 'id'] if has_id else col_names

            placeholders = ', '.join(['%s'] * len(insert_cols))
            insert_sql = f"INSERT INTO {table} ({', '.join(insert_cols)}) VALUES ({placeholders})"

            inserted = 0
            for row in rows:
                try:
                    values = [row[col] for col in insert_cols]
                    admin_cur.execute(insert_sql, values)
                    inserted += 1
                except Exception as e:
                    print(f"   Row error: {e}")

            admin_conn.commit()
            print(f"   Copied {inserted}/{len(rows)} rows")
        else:
            print(f"   No data to copy")

        # Drop from user_db
        user_cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
        user_conn.commit()
        print(f"   Dropped from user_db")

    except Exception as e:
        print(f"   [ERROR] {e}")
        admin_conn.rollback()
        user_conn.rollback()
        import traceback
        traceback.print_exc()

# Verify
print("\n" + "=" * 70)
print("VERIFICATION")
print("=" * 70)

user_cur.execute("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'")
print(f"\nastegni_user_db: {user_cur.fetchone()['count']} tables")

admin_cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
admin_tables_result = [row['table_name'] for row in admin_cur.fetchall()]
print(f"astegni_admin_db: {len(admin_tables_result)} tables")
for t in admin_tables_result:
    print(f"   - {t}")

user_cur.close()
user_conn.close()
admin_cur.close()
admin_conn.close()

print("\nDone!")
