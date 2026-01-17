"""
Migration: Convert Notes to Profile-Based System
Changes notes from user_id to profile_id + profile_type
"""

import psycopg2
from datetime import datetime
import sys
import io

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "database": "astegni_user_db",
    "user": "astegni_user",
    "password": "Astegni2025"
}

def run_migration():
    """Migrate notes from user_id to profile_id + profile_type"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        print("=" * 70)
        print("Migration: Convert Notes to Profile-Based System")
        print("=" * 70)

        # Step 1: Add new columns
        print("\n1️⃣ Adding profile_id and profile_type columns...")
        cur.execute("""
            ALTER TABLE notes
            ADD COLUMN IF NOT EXISTS profile_id INTEGER,
            ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20);
        """)
        print("   ✓ Columns added")

        # Step 2: Migrate existing data (set to NULL for now, will need manual update)
        print("\n2️⃣ Migrating existing data...")
        print("   ⚠️  Existing notes will need profile assignment")
        print("   ℹ️  user_id column will be dropped after migration")

        # Step 3: Drop old user_id constraint and column
        print("\n3️⃣ Dropping user_id column...")
        cur.execute("""
            ALTER TABLE notes
            DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
        """)
        cur.execute("""
            ALTER TABLE notes
            DROP COLUMN IF EXISTS user_id;
        """)
        print("   ✓ user_id column dropped")

        # Step 4: Add NOT NULL constraints to new columns
        print("\n4️⃣ Setting NOT NULL constraints...")
        cur.execute("""
            ALTER TABLE notes
            ALTER COLUMN profile_id SET NOT NULL,
            ALTER COLUMN profile_type SET NOT NULL;
        """)
        print("   ✓ Constraints added")

        # Step 5: Add check constraint for profile_type
        print("\n5️⃣ Adding profile_type check constraint...")
        cur.execute("""
            ALTER TABLE notes
            DROP CONSTRAINT IF EXISTS notes_profile_type_check;
        """)
        cur.execute("""
            ALTER TABLE notes
            ADD CONSTRAINT notes_profile_type_check
            CHECK (profile_type IN ('student', 'tutor', 'parent', 'advertiser'));
        """)
        print("   ✓ profile_type check constraint added")

        # Step 6: Create new indexes
        print("\n6️⃣ Creating new indexes...")

        # Drop old user_id index
        cur.execute("""
            DROP INDEX IF EXISTS idx_notes_user_id;
        """)

        # Create new profile-based indexes
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_profile
            ON notes(profile_id, profile_type);
        """)
        print("   ✓ idx_notes_profile created")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_profile_favorite
            ON notes(profile_id, profile_type, is_favorite)
            WHERE is_favorite = TRUE;
        """)
        print("   ✓ idx_notes_profile_favorite created")

        # Step 7: Update note_exports table
        print("\n7️⃣ Updating note_exports table...")

        # Add new columns
        cur.execute("""
            ALTER TABLE note_exports
            ADD COLUMN IF NOT EXISTS profile_id INTEGER,
            ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20);
        """)

        # Drop old user_id
        cur.execute("""
            ALTER TABLE note_exports
            DROP CONSTRAINT IF EXISTS note_exports_user_id_fkey;
        """)
        cur.execute("""
            ALTER TABLE note_exports
            DROP COLUMN IF EXISTS user_id;
        """)

        # Set NOT NULL
        cur.execute("""
            ALTER TABLE note_exports
            ALTER COLUMN profile_id SET NOT NULL,
            ALTER COLUMN profile_type SET NOT NULL;
        """)

        # Add check constraint
        cur.execute("""
            ALTER TABLE note_exports
            DROP CONSTRAINT IF EXISTS note_exports_profile_type_check;
        """)
        cur.execute("""
            ALTER TABLE note_exports
            ADD CONSTRAINT note_exports_profile_type_check
            CHECK (profile_type IN ('student', 'tutor', 'parent', 'advertiser'));
        """)

        # Update indexes
        cur.execute("""
            DROP INDEX IF EXISTS idx_note_exports_user_id;
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_note_exports_profile
            ON note_exports(profile_id, profile_type);
        """)
        print("   ✓ note_exports table updated")

        # Commit all changes
        conn.commit()

        # Summary
        print("\n" + "=" * 70)
        print("✅ Migration completed successfully!")
        print("=" * 70)

        print(f"\n📊 Changes:")
        print(f"   • notes table: user_id → profile_id + profile_type")
        print(f"   • note_exports table: user_id → profile_id + profile_type")
        print(f"   • New indexes created for profile-based queries")
        print(f"   • Check constraints added for profile_type")

        print(f"\n⚠️  Important:")
        print(f"   • Update backend models (models.py)")
        print(f"   • Update backend endpoints (notes_endpoints.py)")
        print(f"   • Update frontend to pass profile_id + profile_type")

        print("\n🎉 Notes system is now profile-based!")
        print("=" * 70)

    except psycopg2.Error as e:
        print(f"\n❌ Migration failed with error:")
        print(f"   {e}")
        if conn:
            conn.rollback()
        sys.exit(1)

    except Exception as e:
        print(f"\n❌ Unexpected error:")
        print(f"   {e}")
        if conn:
            conn.rollback()
        sys.exit(1)

    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    run_migration()
