"""
Migration: Add Missing Columns to Department Profile Tables

This migration adds missing columns to all department profile tables:
- position (VARCHAR) - Admin's role/position in the department
- rating (DECIMAL) - Average performance rating
- total_reviews (INTEGER) - Number of reviews received
- permissions (JSONB) - Department-specific permissions
- joined_date (TIMESTAMP) - When admin joined this department

Tables affected:
- manage_system_settings_profile
- manage_schools_profile
- manage_contents_profile
- manage_courses_profile
- manage_credentials_profile
- manage_tutors_profile
- manage_customers_profile
- manage_campaigns_profile
- manage_admins_profile
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db?sslmode=disable'
)

# Department profile tables that need the missing columns
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

def add_missing_columns():
    """Add missing columns to all department profile tables"""
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

            columns_added = 0

            # Add position column (VARCHAR 100)
            if not check_column_exists(cursor, table, 'position'):
                print(f"  [ADD] Adding 'position' column...")
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN position VARCHAR(100)
                """)
                columns_added += 1
            else:
                print(f"  [OK] 'position' column already exists")

            # Add rating column (DECIMAL with default 0.0)
            if not check_column_exists(cursor, table, 'rating'):
                print(f"  [ADD] Adding 'rating' column...")
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN rating DECIMAL(3, 1) DEFAULT 0.0
                """)
                columns_added += 1
            else:
                print(f"  [OK] 'rating' column already exists")

            # Add total_reviews column (INTEGER with default 0)
            if not check_column_exists(cursor, table, 'total_reviews'):
                print(f"  [ADD] Adding 'total_reviews' column...")
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN total_reviews INTEGER DEFAULT 0
                """)
                columns_added += 1
            else:
                print(f"  [OK] 'total_reviews' column already exists")

            # Add permissions column (JSONB with default {})
            if not check_column_exists(cursor, table, 'permissions'):
                print(f"  [ADD] Adding 'permissions' column...")
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN permissions JSONB DEFAULT '{{}}'::jsonb
                """)
                columns_added += 1
            else:
                print(f"  [OK] 'permissions' column already exists")

            # Add joined_date column (TIMESTAMP)
            if not check_column_exists(cursor, table, 'joined_date'):
                print(f"  [ADD] Adding 'joined_date' column...")
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN joined_date TIMESTAMP
                """)
                columns_added += 1
            else:
                print(f"  [OK] 'joined_date' column already exists")

            if columns_added > 0:
                print(f"\n  [SUCCESS] Added {columns_added} column(s) to {table}")
            else:
                print(f"\n  [SUCCESS] All columns already exist in {table}")

        conn.commit()
        print(f"\n{'='*60}")
        print("[SUCCESS] Migration completed successfully!")
        print(f"{'='*60}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Add missing columns to department profile tables")
    print(f"Database: {ADMIN_DATABASE_URL}")
    add_missing_columns()
