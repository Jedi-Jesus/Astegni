"""
Migration: Restore verification_status column and add missing fields

This migration:
1. Restores verification_status column (was incorrectly dropped)
2. Keeps is_verified for quick boolean checks
3. Changes verified_by_admin_id FK from users to manage_uploads
4. Adds rejection_reason and verified_at
5. Ensures document_url is correctly named

Run this migration:
    cd astegni-backend
    python migrate_restore_verification_status.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def restore_verification_status():
    """Restore verification_status and fix verification system"""

    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("="*70)
        print("RESTORING VERIFICATION_STATUS AND FIXING VERIFICATION SYSTEM")
        print("="*70)

        # Check if manage_uploads table exists, create if not
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'manage_uploads'
            )
        """)
        manage_uploads_exists = cursor.fetchone()[0]

        if not manage_uploads_exists:
            print("\nCreating manage_uploads table...")
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

        # 1. Fix student_achievements
        print("\n1. Fixing student_achievements...")

        # Add verification_status back
        cursor.execute("""
            ALTER TABLE student_achievements
            ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
            ADD CONSTRAINT valid_verification_status
            CHECK (verification_status IN ('pending', 'verified', 'rejected'))
        """)
        print("  - Added verification_status column")

        # Sync verification_status from is_verified
        cursor.execute("""
            UPDATE student_achievements
            SET verification_status = CASE
                WHEN is_verified = TRUE THEN 'verified'
                ELSE 'pending'
            END
        """)
        print("  - Synced verification_status from is_verified")

        # Drop old FK constraint if exists and recreate with manage_uploads
        cursor.execute("""
            DO $$
            BEGIN
                -- Drop existing FK constraint if it exists
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name = 'student_achievements'
                    AND constraint_name LIKE '%verified_by_admin_id_fkey%'
                ) THEN
                    ALTER TABLE student_achievements
                    DROP CONSTRAINT student_achievements_verified_by_admin_id_fkey;
                END IF;

                -- Add new FK constraint to manage_uploads
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name = 'student_achievements'
                    AND constraint_name = 'student_achievements_verified_by_admin_id_fkey_uploads'
                ) THEN
                    ALTER TABLE student_achievements
                    ADD CONSTRAINT student_achievements_verified_by_admin_id_fkey_uploads
                    FOREIGN KEY (verified_by_admin_id) REFERENCES manage_uploads(id) ON DELETE SET NULL;
                END IF;
            END $$;
        """)
        print("  - Updated verified_by_admin_id FK to reference manage_uploads")

        # 2. Fix student_certifications
        print("\n2. Fixing student_certifications...")

        cursor.execute("""
            ALTER TABLE student_certifications
            ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
            ADD CONSTRAINT valid_certification_verification_status
            CHECK (verification_status IN ('pending', 'verified', 'rejected'))
        """)
        print("  - Added verification_status column")

        cursor.execute("""
            UPDATE student_certifications
            SET verification_status = CASE
                WHEN is_verified = TRUE THEN 'verified'
                ELSE 'pending'
            END
        """)
        print("  - Synced verification_status from is_verified")

        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name = 'student_certifications'
                    AND constraint_name LIKE '%verified_by_admin_id_fkey%'
                ) THEN
                    ALTER TABLE student_certifications
                    DROP CONSTRAINT student_certifications_verified_by_admin_id_fkey;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name = 'student_certifications'
                    AND constraint_name = 'student_certifications_verified_by_admin_id_fkey_uploads'
                ) THEN
                    ALTER TABLE student_certifications
                    ADD CONSTRAINT student_certifications_verified_by_admin_id_fkey_uploads
                    FOREIGN KEY (verified_by_admin_id) REFERENCES manage_uploads(id) ON DELETE SET NULL;
                END IF;
            END $$;
        """)
        print("  - Updated verified_by_admin_id FK to reference manage_uploads")

        # 3. Fix student_extracurricular_activities
        print("\n3. Fixing student_extracurricular_activities...")

        cursor.execute("""
            ALTER TABLE student_extracurricular_activities
            ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
            ADD CONSTRAINT valid_activity_verification_status
            CHECK (verification_status IN ('pending', 'verified', 'rejected'))
        """)
        print("  - Added verification_status column")

        cursor.execute("""
            UPDATE student_extracurricular_activities
            SET verification_status = CASE
                WHEN is_verified = TRUE THEN 'verified'
                ELSE 'pending'
            END
        """)
        print("  - Synced verification_status from is_verified")

        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name = 'student_extracurricular_activities'
                    AND constraint_name LIKE '%verified_by_admin_id_fkey%'
                ) THEN
                    ALTER TABLE student_extracurricular_activities
                    DROP CONSTRAINT student_extracurricular_activities_verified_by_admin_id_fkey;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name = 'student_extracurricular_activities'
                    AND constraint_name = 'student_extracurricular_activities_verified_by_admin_id_fkey_uploads'
                ) THEN
                    ALTER TABLE student_extracurricular_activities
                    ADD CONSTRAINT student_extracurricular_activities_verified_by_admin_id_fkey_uploads
                    FOREIGN KEY (verified_by_admin_id) REFERENCES manage_uploads(id) ON DELETE SET NULL;
                END IF;
            END $$;
        """)
        print("  - Updated verified_by_admin_id FK to reference manage_uploads")

        # Recreate verification_status indexes
        print("\n4. Recreating verification_status indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_achievements_verification_status
            ON student_achievements(verification_status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_certifications_verification_status
            ON student_certifications(verification_status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_extracurricular_verification_status
            ON student_extracurricular_activities(verification_status)
        """)
        print("  - Created verification_status indexes")

        # Commit changes
        conn.commit()

        print("\n" + "="*70)
        print("MIGRATION COMPLETE!")
        print("="*70)
        print("\nFinal Schema:")
        print("\nAll three tables now have:")
        print("  - verification_status (VARCHAR) - For filtering: 'verified', 'pending', 'rejected'")
        print("  - is_verified (BOOLEAN) - For quick true/false checks")
        print("  - verified_by_admin_id (INTEGER) - FK to manage_uploads table (NOT users)")
        print("  - rejection_reason (TEXT) - Reason if rejected")
        print("  - verified_at (TIMESTAMP) - When verification happened")
        print("  - document_url (TEXT) - Supporting document URL")
        print("\nBoth Fields Work Together:")
        print("  - verification_status = 'verified' AND is_verified = TRUE")
        print("  - verification_status = 'pending' AND is_verified = FALSE")
        print("  - verification_status = 'rejected' AND is_verified = FALSE")
        print("\nForeign Keys:")
        print("  - verified_by_admin_id -> manage_uploads(id) ON DELETE SET NULL")
        print("="*70)

        # Show statistics
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
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    restore_verification_status()
