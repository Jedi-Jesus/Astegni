"""
Add is_verified and verified_at fields to student_profiles, parent_profiles, and advertiser_profiles tables.
This migration adds missing verification columns needed for KYC auto-verification.

Fields to add:
- student_profiles: is_verified (boolean, default False), verified_at (timestamp)
- parent_profiles: verified_at (timestamp) - already has is_verified
- advertiser_profiles: verified_at (timestamp) - already has is_verified
"""

import psycopg
import os
from dotenv import load_dotenv

def migrate():
    load_dotenv()

    # Use DATABASE_URL from .env
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env")
        return

    # Convert to psycopg format if needed
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql://', 1)

    conn = psycopg.connect(db_url)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("MIGRATION: Add verification fields to profile tables")
        print("=" * 60)

        # Add is_verified and verified_at to student_profiles
        print("\n1. Adding verification fields to student_profiles...")
        cur.execute("""
            ALTER TABLE student_profiles
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("   ✓ SUCCESS: student_profiles updated")

        # Add verified_at to parent_profiles (already has is_verified)
        print("\n2. Adding verified_at to parent_profiles...")
        cur.execute("""
            ALTER TABLE parent_profiles
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("   ✓ SUCCESS: parent_profiles updated")

        # Add verified_at to advertiser_profiles (already has is_verified)
        print("\n3. Adding verified_at to advertiser_profiles...")
        cur.execute("""
            ALTER TABLE advertiser_profiles
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("   ✓ SUCCESS: advertiser_profiles updated")

        # Create indexes for faster queries on is_verified
        print("\n4. Creating indexes for verification status...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_profiles_is_verified ON student_profiles(is_verified);
            CREATE INDEX IF NOT EXISTS idx_parent_profiles_is_verified ON parent_profiles(is_verified);
            CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_is_verified ON advertiser_profiles(is_verified);
        """)
        print("   ✓ SUCCESS: Indexes created")

        conn.commit()

        print("\n" + "=" * 60)
        print("✓ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nChanges made:")
        print("  - student_profiles: Added is_verified, verified_at columns")
        print("  - parent_profiles: Added verified_at column")
        print("  - advertiser_profiles: Added verified_at column")
        print("  - Created indexes on is_verified for all three tables")
        print("\nThese columns are required for KYC auto-verification to work.")

    except Exception as e:
        conn.rollback()
        print(f"\n{'='*60}")
        print(f"✗ ERROR: Migration failed!")
        print(f"{'='*60}")
        print(f"Error details: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
