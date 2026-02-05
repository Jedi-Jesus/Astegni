"""
Database Migration: Add scheduled_deletion_at column to profile tables
Adds scheduled_deletion_at timestamp to support 90-day grace period for role removal
"""

import psycopg
from datetime import datetime

# Database configuration
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def run_migration():
    """Add scheduled_deletion_at column to all profile tables"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=" * 80)
    print("Migration: Add scheduled_deletion_at to Profile Tables")
    print("=" * 80)
    print()

    # Profile tables to update - CORRECT table names
    profile_tables = [
        'student_profiles',
        'tutor_profiles',
        'parent_profiles',
        'advertiser_profiles',
        'user_profiles'
    ]

    try:
        for table in profile_tables:
            print(f"Checking table: {table}")

            # Check if column already exists
            cursor.execute(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = '{table}'
                AND column_name = 'scheduled_deletion_at'
            """)

            if cursor.fetchone():
                print(f"  [OK] Column 'scheduled_deletion_at' already exists in {table}")
            else:
                # Add the column
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN scheduled_deletion_at TIMESTAMP DEFAULT NULL
                """)
                conn.commit()
                print(f"  [OK] Added 'scheduled_deletion_at' column to {table}")

            print()

        print("=" * 80)
        print("Migration completed successfully!")
        print("=" * 80)
        print()
        print("What this migration adds:")
        print("  - scheduled_deletion_at column to all profile tables")
        print("  - Allows 90-day grace period for role removal")
        print("  - NULL means no scheduled deletion")
        print("  - Timestamp indicates when role will be permanently deleted")
        print()

    except Exception as e:
        print(f"[ERROR] Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
