"""
Migration: Add two_factor_protected_panels column to all profile tables
This allows users to choose which panels require 2FA verification
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Default protected panels for each role (recommended panels pre-selected)
DEFAULT_PROTECTED_PANELS = {
    'tutor': ['settings', 'packages', 'requests', 'earnings-investments'],
    'student': ['settings', 'credentials', 'earnings-investments'],
    'parent': ['settings', 'my-children', 'co-parents'],
    'advertiser': ['settings', 'team', 'brands']
}

def migrate():
    """Add two_factor_protected_panels column to all profile tables"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Add column to tutor_profiles
        print("Adding two_factor_protected_panels to tutor_profiles...")
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
        print("Added two_factor_protected_panels column to:")
        print("  - tutor_profiles (default: settings, packages, requests, earnings-investments)")
        print("  - student_profiles (default: settings, credentials, earnings-investments)")
        print("  - parent_profiles (default: settings, my-children, co-parents)")
        print("  - advertiser_profiles (default: settings, team, brands)")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
