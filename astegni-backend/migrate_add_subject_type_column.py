"""
Migration: Add subject_type column to tutor_schedules table

This migration adds the missing subject_type column to the tutor_schedules table.
The column stores the original subject selection before it was processed.
"""

import psycopg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

def migrate_add_subject_type():
    """Add subject_type column to tutor_schedules table"""

    # Convert DATABASE_URL to psycopg format
    db_url = DATABASE_URL.replace('postgresql://', '').replace('postgresql+psycopg://', '')

    try:
        # Connect to database
        conn = psycopg.connect(f"postgresql://{db_url}")
        cursor = conn.cursor()

        print("[CHECK] Checking if subject_type column exists...")

        # Check if column already exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='tutor_schedules'
            AND column_name='subject_type'
        """)

        if cursor.fetchone():
            print("[OK] Column subject_type already exists in tutor_schedules table")
            cursor.close()
            conn.close()
            return

        print("[ADD] Adding subject_type column to tutor_schedules table...")

        # Add the subject_type column
        cursor.execute("""
            ALTER TABLE tutor_schedules
            ADD COLUMN subject_type VARCHAR(100)
        """)

        print("[UPDATE] Setting default values for existing records...")

        # Set default values for existing records (copy from subject field)
        cursor.execute("""
            UPDATE tutor_schedules
            SET subject_type = subject
            WHERE subject_type IS NULL
        """)

        print("[ALTER] Making subject_type NOT NULL...")

        # Make the column NOT NULL after setting default values
        cursor.execute("""
            ALTER TABLE tutor_schedules
            ALTER COLUMN subject_type SET NOT NULL
        """)

        # Commit changes
        conn.commit()

        print("[SUCCESS] Migration completed successfully!")
        print("   - Added subject_type column (VARCHAR(100), NOT NULL)")
        print("   - Set default values from subject column for existing records")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    print("\n" + "="*60)
    print("MIGRATION: Add subject_type column to tutor_schedules")
    print("="*60 + "\n")

    migrate_add_subject_type()

    print("\n" + "="*60)
    print("DONE! You can now restart your backend server.")
    print("="*60 + "\n")
