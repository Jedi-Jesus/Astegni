"""
Rollback Migration: Remove the columns added by migrate_add_missing_profile_columns.py

This will remove: position, rating, total_reviews, permissions, joined_date
from all department profile tables.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db?sslmode=disable'
)

# Department profile tables
DEPARTMENT_TABLES = [
    'manage_system_settings_profile',
    'manage_schools_profile',
    'manage_contents_profile',
    'manage_courses_profile',
    'manage_credentials_profile',
    'manage_tutors_profile',
    'manage_customers_profile',
    'manage_campaigns_profile',
    'manage_admins_profile'
]

# Columns to remove
COLUMNS_TO_REMOVE = ['position', 'rating', 'total_reviews', 'permissions', 'joined_date']

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
        )
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def rollback_columns():
    """Remove the added columns from all department profile tables"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        for table in DEPARTMENT_TABLES:
            print(f"\n{'='*60}")
            print(f"Processing table: {table}")
            print(f"{'='*60}")

            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if not cursor.fetchone()[0]:
                print(f"[SKIP] Table {table} does not exist, skipping...")
                continue

            columns_removed = 0

            for column in COLUMNS_TO_REMOVE:
                if check_column_exists(cursor, table, column):
                    print(f"  [REMOVE] Dropping '{column}' column...")
                    cursor.execute(f"""
                        ALTER TABLE {table}
                        DROP COLUMN {column}
                    """)
                    columns_removed += 1
                else:
                    print(f"  [OK] '{column}' column doesn't exist")

            if columns_removed > 0:
                print(f"\n  [SUCCESS] Removed {columns_removed} column(s) from {table}")
            else:
                print(f"\n  [SUCCESS] No columns to remove from {table}")

        conn.commit()
        print(f"\n{'='*60}")
        print("[SUCCESS] Rollback completed successfully!")
        print(f"{'='*60}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Rollback failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting rollback: Remove added columns from department profile tables")
    print(f"Database: {ADMIN_DATABASE_URL}")
    rollback_columns()
