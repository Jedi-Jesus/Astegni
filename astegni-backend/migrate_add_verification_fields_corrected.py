"""
Migration: Add verification fields to student enhancement tables (CORRECTED)

Changes:
1. KEEP verification_status (for filtering: 'verified', 'pending', 'rejected')
2. ADD is_verified BOOLEAN (for quick true/false checks)
3. ADD verified_by_admin_id INTEGER (FK to manage_uploads table, not users)
4. ADD rejection_reason TEXT
5. ADD verified_at TIMESTAMP
6. RENAME verification_document_url to document_url

Run this migration:
    cd astegni-backend
    python migrate_add_verification_fields_corrected.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def add_verification_fields():
    """Add verification fields while keeping verification_status"""

    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("="*70)
        print("ADDING VERIFICATION FIELDS (CORRECTED)")
        print("="*70)

        # First, check if manage_uploads table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'manage_uploads'
            )
        """)
        manage_uploads_exists = cursor.fetchone()[0]

        if not manage_uploads_exists:
            print("\nWARNING: manage_uploads table does not exist!")
            print("Creating manage_uploads table first...")

            # Create manage_uploads table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS manage_uploads (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    admin_name VARCHAR(255),
                    department VARCHAR(100),
                    role VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Created manage_uploads table")

        # 1. Update student_achievements
        print("\n1. Updating student_achievements...")

        # Add new columns (keep verification_status)
        cursor.execute("""
            ALTER TABLE student_achievements
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER REFERENCES manage_uploads(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("  - Added verification columns (kept verification_status)")

        # Rename document_url column if it hasn't been renamed yet
        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'student_achievements'
                    AND column_name = 'verification_document_url'
                ) THEN
                    ALTER TABLE student_achievements
                    RENAME COLUMN verification_document_url TO document_url;
                END IF;
            END $$;
        """)
        print("  - Renamed verification_document_url to document_url")

        # Sync is_verified with verification_status
        cursor.execute("""
            UPDATE student_achievements
            SET is_verified = CASE
                WHEN verification_status = 'verified' THEN TRUE
                ELSE FALSE
            END
        """)
        print("  - Synced is_verified with verification_status")

        # 2. Update student_certifications
        print("\n2. Updating student_certifications...")

        # Add new columns
        cursor.execute("""
            ALTER TABLE student_certifications
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER REFERENCES manage_uploads(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("  - Added verification columns (kept verification_status)")

        # Rename document_url column
        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'student_certifications'
                    AND column_name = 'certificate_document_url'
                ) THEN
                    ALTER TABLE student_certifications
                    RENAME COLUMN certificate_document_url TO document_url;
                END IF;
            END $$;
        """)
        print("  - Renamed certificate_document_url to document_url")

        # Sync is_verified with verification_status
        cursor.execute("""
            UPDATE student_certifications
            SET is_verified = CASE
                WHEN verification_status = 'verified' THEN TRUE
                ELSE FALSE
            END
        """)
        print("  - Synced is_verified with verification_status")

        # 3. Update student_extracurricular_activities
        print("\n3. Updating student_extracurricular_activities...")

        # Add new columns
        cursor.execute("""
            ALTER TABLE student_extracurricular_activities
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verified_by_admin_id INTEGER REFERENCES manage_uploads(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        """)
        print("  - Added verification columns (kept verification_status)")

        # Rename document_url column
        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'student_extracurricular_activities'
                    AND column_name = 'verification_document_url'
                ) THEN
                    ALTER TABLE student_extracurricular_activities
                    RENAME COLUMN verification_document_url TO document_url;
                END IF;
            END $$;
        """)
        print("  - Renamed verification_document_url to document_url")

        # Sync is_verified with verification_status
        cursor.execute("""
            UPDATE student_extracurricular_activities
            SET is_verified = CASE
                WHEN verification_status = 'verified' THEN TRUE
                ELSE FALSE
            END
        """)
        print("  - Synced is_verified with verification_status")

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

        # Commit changes
        conn.commit()

        print("\n" + "="*70)
        print("MIGRATION COMPLETE!")
        print("="*70)
        print("\nChanges Applied:")
        print("\nAll three tables now have:")
        print("  - verification_status (VARCHAR) - KEPT for filtering ('verified', 'pending', 'rejected')")
        print("  - is_verified (BOOLEAN) - NEW for quick true/false checks")
        print("  - verified_by_admin_id (INTEGER) - FK to manage_uploads table")
        print("  - rejection_reason (TEXT) - Reason if rejected")
        print("  - verified_at (TIMESTAMP) - When verification happened")
        print("  - document_url (TEXT) - Renamed from verification_document_url/certificate_document_url")
        print("\nVerification System:")
        print("  - verification_status = 'verified' -> is_verified = TRUE")
        print("  - verification_status = 'pending' -> is_verified = FALSE")
        print("  - verification_status = 'rejected' -> is_verified = FALSE")
        print("\nForeign Keys:")
        print("  - verified_by_admin_id -> manage_uploads(id)")
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
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
                SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM student_achievements
        """)
        total, verified, pending, rejected = cursor.fetchone()
        print(f"  Achievements: {total} total ({verified} verified, {pending} pending, {rejected} rejected)")

        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
                SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM student_certifications
        """)
        total, verified, pending, rejected = cursor.fetchone()
        print(f"  Certifications: {total} total ({verified} verified, {pending} pending, {rejected} rejected)")

        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
                SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM student_extracurricular_activities
        """)
        total, verified, pending, rejected = cursor.fetchone()
        print(f"  Extracurricular: {total} total ({verified} verified, {pending} pending, {rejected} rejected)")

        print("\n" + "="*70)

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_verification_fields()
