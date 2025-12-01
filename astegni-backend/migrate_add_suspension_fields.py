"""
Migration: Add suspension fields to tutor_profiles table
Adds: suspension_reason, suspended_at, suspended_by, is_suspended
"""

import psycopg
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def run_migration():
    print("Starting migration to add suspension fields...")

    try:
        # Connect using psycopg (version 3)
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Add suspension fields
        print("Adding suspension_reason column...")
        cursor.execute("""
            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
        """)

        print("Adding suspended_at column...")
        cursor.execute("""
            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
        """)

        print("Adding suspended_by column...")
        cursor.execute("""
            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS suspended_by INTEGER;
        """)

        print("Adding is_suspended column...")
        cursor.execute("""
            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
        """)

        # Commit the changes
        conn.commit()
        print("✅ Migration completed successfully!")

        # Verify the columns were added
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name IN ('suspension_reason', 'suspended_at', 'suspended_by', 'is_suspended')
            ORDER BY column_name;
        """)

        columns = cursor.fetchall()
        print("\n✅ Verified new columns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
