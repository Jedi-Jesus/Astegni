"""
Check existing 2FA columns and add two_factor_protected_panels column
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def check_and_migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check existing columns in tutor_profiles
        print("Checking existing 2FA columns in tutor_profiles...")
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'tutor_profiles' AND column_name LIKE 'two%'
        """)
        columns = [row[0] for row in cur.fetchall()]
        print(f"Existing 2FA columns: {columns}")

        # Check if two_factor_protected_panels already exists
        if 'two_factor_protected_panels' in columns:
            print("Column two_factor_protected_panels already exists!")
            return

        # Add column to tutor_profiles
        print("\nAdding two_factor_protected_panels to tutor_profiles...")
        cur.execute("""
            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS two_factor_protected_panels JSONB
            DEFAULT '["settings", "packages", "requests", "earnings-investments"]'::jsonb
        """)

        # Add column to student_profiles
        print("Adding two_factor_protected_panels to student_profiles...")
        cur.execute("""
            ALTER TABLE student_profiles
            ADD COLUMN IF NOT EXISTS two_factor_protected_panels JSONB
            DEFAULT '["settings", "credentials", "earnings-investments"]'::jsonb
        """)

        # Add column to parent_profiles
        print("Adding two_factor_protected_panels to parent_profiles...")
        cur.execute("""
            ALTER TABLE parent_profiles
            ADD COLUMN IF NOT EXISTS two_factor_protected_panels JSONB
            DEFAULT '["settings", "my-children", "co-parents"]'::jsonb
        """)

        # Add column to advertiser_profiles
        print("Adding two_factor_protected_panels to advertiser_profiles...")
        cur.execute("""
            ALTER TABLE advertiser_profiles
            ADD COLUMN IF NOT EXISTS two_factor_protected_panels JSONB
            DEFAULT '["settings", "team", "brands"]'::jsonb
        """)

        conn.commit()
        print("\n[OK] Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    check_and_migrate()
