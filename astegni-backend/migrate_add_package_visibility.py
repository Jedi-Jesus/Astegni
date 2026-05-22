"""
Migration: Add tutor_packages.visibility column and fix enrolled_students FK.

Why:
  - Tutors should be able to "delete" a package that still has active
    enrollments by hiding it from public listings while keeping the package
    row intact so existing enrolled students continue on it.
  - The previous schema declared enrolled_students.package_id NOT NULL with
    an ON DELETE SET NULL foreign key, which is self-contradictory: any
    attempt to delete a referenced package raised a NOT NULL violation.

Changes:
  1. Add tutor_packages.visibility VARCHAR(16) NOT NULL DEFAULT 'public'
     with a CHECK constraint allowing only 'public' or 'private'.
  2. Backfill all existing packages to 'public'.
  3. Drop the existing ON DELETE SET NULL FK on enrolled_students.package_id
     and replace it with ON DELETE RESTRICT, so DELETEs against packages
     with enrollments fail loudly (the API now soft-deletes instead).
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')


def migrate():
    engine = create_engine(DATABASE_URL)
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                print("1. Adding tutor_packages.visibility column...")
                conn.execute(text("""
                    ALTER TABLE tutor_packages
                    ADD COLUMN IF NOT EXISTS visibility VARCHAR(16)
                        NOT NULL DEFAULT 'public'
                """))
                print("   ✓ visibility column ensured")

                print("\n2. Backfilling existing packages to 'public'...")
                conn.execute(text("""
                    UPDATE tutor_packages
                    SET visibility = 'public'
                    WHERE visibility IS NULL OR visibility = ''
                """))
                print("   ✓ backfill complete")

                print("\n3. Adding visibility CHECK constraint...")
                conn.execute(text("""
                    ALTER TABLE tutor_packages
                    DROP CONSTRAINT IF EXISTS tutor_packages_visibility_check
                """))
                conn.execute(text("""
                    ALTER TABLE tutor_packages
                    ADD CONSTRAINT tutor_packages_visibility_check
                    CHECK (visibility IN ('public', 'private'))
                """))
                print("   ✓ CHECK constraint added")

                print("\n4. Replacing enrolled_students.package_id FK"
                      " (SET NULL -> RESTRICT)...")
                conn.execute(text("""
                    ALTER TABLE enrolled_students
                    DROP CONSTRAINT IF EXISTS enrolled_students_package_id_fkey
                """))
                conn.execute(text("""
                    ALTER TABLE enrolled_students
                    DROP CONSTRAINT IF EXISTS fk_enrolled_students_package
                """))
                conn.execute(text("""
                    ALTER TABLE enrolled_students
                    ADD CONSTRAINT enrolled_students_package_id_fkey
                    FOREIGN KEY (package_id)
                    REFERENCES tutor_packages(id)
                    ON DELETE RESTRICT
                """))
                print("   ✓ FK replaced with ON DELETE RESTRICT")

                print("\n5. Indexing tutor_packages.visibility...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_tutor_packages_visibility
                    ON tutor_packages(visibility)
                """))
                print("   ✓ index ensured")

                trans.commit()
                print("\n✅ Migration completed successfully")
            except Exception as e:
                trans.rollback()
                print(f"\n✗ Error during migration: {e}")
                raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    migrate()
