"""
Migration: Add employee_id and joined_in columns to all department profile tables

This migration adds:
- employee_id VARCHAR(50) - Stores the unique employee identifier (e.g., "Emp-adm-1234-25")
- joined_in TIMESTAMP - Stores when the admin joined this department
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

# All department profile tables that need the columns
DEPARTMENT_TABLES = [
    'manage_tutor_documents_profile',
    'manage_courses_profile',
    'manage_campaigns_profile',
    'manage_schools_profile',
    'manage_customers_profile',
    'manage_system_settings_profile',
    'manage_contents_profile'
]

def migrate():
    """Add employee_id and joined_in columns to all department profile tables"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("=" * 70)
        print("MIGRATION: Add employee_id and joined_in to Department Profiles")
        print("=" * 70)
        print()

        for table_name in DEPARTMENT_TABLES:
            print(f"Processing table: {table_name}")
            print("-" * 70)

            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table_name,))

            table_exists = cursor.fetchone()[0]

            if not table_exists:
                print(f"[WARNING] Table '{table_name}' does not exist - SKIPPING")
                print()
                continue

            # Add employee_id column
            try:
                cursor.execute(f"""
                    ALTER TABLE {table_name}
                    ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50)
                """)
                print(f"[OK] Added column: employee_id")
            except Exception as e:
                print(f"[ERROR] Error adding employee_id: {e}")

            # Add joined_in column
            try:
                cursor.execute(f"""
                    ALTER TABLE {table_name}
                    ADD COLUMN IF NOT EXISTS joined_in TIMESTAMP
                """)
                print(f"[OK] Added column: joined_in")
            except Exception as e:
                print(f"[ERROR] Error adding joined_in: {e}")

            # Verify columns were added
            cursor.execute(f"""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = %s
                AND column_name IN ('employee_id', 'joined_in')
                ORDER BY column_name
            """, (table_name,))

            columns = cursor.fetchall()
            print(f"\nVerification - Columns in {table_name}:")
            for col_name, col_type in columns:
                print(f"  - {col_name}: {col_type}")

            print()

        # Commit all changes
        conn.commit()
        print("=" * 70)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] MIGRATION FAILED: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
