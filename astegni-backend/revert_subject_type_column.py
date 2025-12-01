"""
Revert Migration: Remove subject_type column from tutor_schedules table

This script removes the subject_type column that was added by mistake.
We're reverting to match the actual database schema.
"""

import psycopg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

def revert_subject_type():
    """Remove subject_type column from tutor_schedules table"""

    # Convert DATABASE_URL to psycopg format
    db_url = DATABASE_URL.replace('postgresql://', '').replace('postgresql+psycopg://', '')

    try:
        # Connect to database
        conn = psycopg.connect(f"postgresql://{db_url}")
        cursor = conn.cursor()

        print("[CHECK] Checking if subject_type column exists...")

        # Check if column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='tutor_schedules'
            AND column_name='subject_type'
        """)

        if not cursor.fetchone():
            print("[OK] Column subject_type does not exist - nothing to revert")
            cursor.close()
            conn.close()
            return

        print("[REMOVE] Dropping subject_type column from tutor_schedules table...")

        # Drop the subject_type column
        cursor.execute("""
            ALTER TABLE tutor_schedules
            DROP COLUMN subject_type
        """)

        # Commit changes
        conn.commit()

        print("[SUCCESS] Revert completed successfully!")
        print("   - Removed subject_type column from tutor_schedules table")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"[ERROR] Revert failed: {e}")
        raise

if __name__ == "__main__":
    print("\n" + "="*60)
    print("REVERT: Remove subject_type column from tutor_schedules")
    print("="*60 + "\n")

    revert_subject_type()

    print("\n" + "="*60)
    print("DONE! Column removed from database.")
    print("="*60 + "\n")
