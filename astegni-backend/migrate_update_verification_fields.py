"""
Migration: Update verification fields in student enhancement tables

Changes:
1. Add is_verified BOOLEAN (replaces verification_status)
2. Add verified_by_admin_id INTEGER (FK to admin who verified)
3. Add rejection_reason TEXT (reason if rejected)
4. Add verified_at TIMESTAMP (when verification happened)
5. Rename verification_document_url to document_url

Run this migration:
    cd astegni-backend
    python migrate_update_verification_fields.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def update_verification_fields():
    """Update verification fields in all three tables"""

    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("="*70)
        print("UPDATING VERIFICATION FIELDS")
        print("="*70)

        # 1. Update student_achievements
        print("\n1. Updating student_achievements...")

        # Add new columns
        cursor.execute("""
            ALTER TABLE student_achievements
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("  - Added verification columns")

        # Rename document_url column
        cursor.execute("""
            ALTER TABLE student_achievements
            RENAME COLUMN verification_document_url TO document_url
        """)
        print("  - Renamed verification_document_url to document_url")

        # Migrate existing data from verification_status to is_verified
        cursor.execute("""
            UPDATE student_achievements
            SET is_verified = CASE
                WHEN verification_status = 'verified' THEN TRUE
                ELSE FALSE
            END
        """)
        print("  - Migrated verification_status to is_verified")

        # Drop old verification_status column
        cursor.execute("""
            ALTER TABLE student_achievements
            DROP COLUMN IF EXISTS verification_status
        """)
        print("  - Dropped old verification_status column")

        # 2. Update student_certifications
        print("\n2. Updating student_certifications...")

        # Add new columns
        cursor.execute("""
            ALTER TABLE student_certifications
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("  - Added verification columns")

        # Rename document_url column
        cursor.execute("""
            ALTER TABLE student_certifications
            RENAME COLUMN certificate_document_url TO document_url
        """)
        print("  - Renamed certificate_document_url to document_url")

        # Migrate existing data
        cursor.execute("""
            UPDATE student_certifications
            SET is_verified = CASE
                WHEN verification_status = 'verified' THEN TRUE
                ELSE FALSE
            END
        """)
        print("  - Migrated verification_status to is_verified")

        # Drop old verification_status column
        cursor.execute("""
            ALTER TABLE student_certifications
            DROP COLUMN IF EXISTS verification_status
        """)
        print("  - Dropped old verification_status column")

        # 3. Update student_extracurricular_activities
        print("\n3. Updating student_extracurricular_activities...")

        # Add new columns
        cursor.execute("""
            ALTER TABLE student_extracurricular_activities
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("  - Added verification columns")

        # Rename document_url column
        cursor.execute("""
            ALTER TABLE student_extracurricular_activities
            RENAME COLUMN verification_document_url TO document_url
        """)
        print("  - Renamed verification_document_url to document_url")

        # Migrate existing data
        cursor.execute("""
            UPDATE student_extracurricular_activities
            SET is_verified = CASE
                WHEN verification_status = 'verified' THEN TRUE
                ELSE FALSE
            END
        """)
        print("  - Migrated verification_status to is_verified")

        # Drop old verification_status column
        cursor.execute("""
            ALTER TABLE student_extracurricular_activities
            DROP COLUMN IF EXISTS verification_status
        """)
        print("  - Dropped old verification_status column")

        # Create indexes for new columns
        print("\n4. Creating indexes for new fields...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_verified
            ON student_achievements(is_verified) WHERE is_verified = TRUE
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_admin
            ON student_achievements(verified_by_admin_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_certifications_verified
            ON student_certifications(is_verified) WHERE is_verified = TRUE
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_certifications_admin
            ON student_certifications(verified_by_admin_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_verified
            ON student_extracurricular_activities(is_verified) WHERE is_verified = TRUE
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_admin
            ON student_extracurricular_activities(verified_by_admin_id)
        """)
        print("  - Created indexes for verification fields")

        # Drop old indexes
        print("\n5. Cleaning up old indexes...")
        cursor.execute("DROP INDEX IF EXISTS idx_achievements_verification")
        cursor.execute("DROP INDEX IF EXISTS idx_certifications_verification")
        cursor.execute("DROP INDEX IF EXISTS idx_extracurricular_verification")
        print("  - Dropped old verification_status indexes")

        # Commit changes
        conn.commit()

        print("\n" + "="*70)
        print("MIGRATION COMPLETE!")
        print("="*70)
        print("\nChanges Applied:")
        print("\nAll three tables now have:")
        print("  - is_verified (BOOLEAN) - TRUE if verified, FALSE if pending/rejected")
        print("  - verified_by_admin_id (INTEGER) - Admin who verified (FK to users)")
        print("  - rejection_reason (TEXT) - Reason if rejected")
        print("  - verified_at (TIMESTAMP) - When verification happened")
        print("  - document_url (TEXT) - Renamed from verification_document_url")
        print("\nRemoved:")
        print("  - verification_status column (migrated to is_verified)")
        print("\nData Migration:")
        print("  - verification_status='verified' -> is_verified=TRUE")
        print("  - verification_status='pending'/'rejected' -> is_verified=FALSE")
        print("\nNew Indexes:")
        print("  - idx_achievements_verified")
        print("  - idx_achievements_admin")
        print("  - idx_certifications_verified")
        print("  - idx_certifications_admin")
        print("  - idx_extracurricular_verified")
        print("  - idx_extracurricular_admin")
        print("="*70)

        # Show verification statistics
        print("\nVerification Statistics:")
        cursor.execute("SELECT COUNT(*), SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) FROM student_achievements")
        total, verified = cursor.fetchone()
        print(f"  Achievements: {verified}/{total} verified")

        cursor.execute("SELECT COUNT(*), SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) FROM student_certifications")
        total, verified = cursor.fetchone()
        print(f"  Certifications: {verified}/{total} verified")

        cursor.execute("SELECT COUNT(*), SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) FROM student_extracurricular_activities")
        total, verified = cursor.fetchone()
        print(f"  Extracurricular: {verified}/{total} verified")

        print("\n" + "="*70)

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    update_verification_fields()
