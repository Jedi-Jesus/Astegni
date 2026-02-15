"""
Migration: Add target_pages field to campaign_profile table

This separates page targeting (which pages to show ads on) from
geographic targeting (global/national/regional).

Fields:
- target_location: Geographic scope (global, national, regional)
- target_pages: Array of page names where ad should show (home, profile, etc.)
  If NULL or empty, ad shows on all pages.
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

def run_migration():
    """Add target_pages field to campaign_profile table"""

    try:
        # Connect to database
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("=" * 80)
        print("MIGRATION: Add target_pages to campaign_profile")
        print("=" * 80)

        # Check if column already exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name = 'target_pages'
        """)

        if cursor.fetchone():
            print("WARNING: Column 'target_pages' already exists. Skipping migration.")
            return

        print("\n1. Adding target_pages column...")
        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD COLUMN target_pages TEXT[]
        """)
        print("SUCCESS: Column added successfully")

        print("\n2. Adding comment to document the field...")
        cursor.execute("""
            COMMENT ON COLUMN campaign_profile.target_pages IS
            'Array of page names where ad should appear (e.g., [''home'', ''tutor_profile'', ''find_tutors'']). NULL or empty = show on all pages.'
        """)
        print("SUCCESS: Comment added")

        print("\n3. Verifying column creation...")
        cursor.execute("""
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name = 'target_pages'
        """)

        result = cursor.fetchone()
        if result:
            print("SUCCESS: Verification successful:")
            print(f"   Column: {result[0]}")
            print(f"   Type: {result[1]}")
            print(f"   Nullable: {result[2]}")
            print(f"   Default: {result[3]}")

        print("\n" + "=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\nUsage Examples:")
        print("  - Show on all pages: target_pages = NULL or []")
        print("  - Show only on homepage: target_pages = ['home']")
        print("  - Show on profile pages: target_pages = ['tutor_profile', 'student_profile', 'parent_profile']")
        print("  - Show on specific pages: target_pages = ['home', 'find_tutors', 'videos']")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
