"""
Migration: Add CASCADE delete to tutor_packages foreign key

This migration modifies the foreign key constraint on tutor_packages.tutor_id
to use CASCADE delete, so that when a tutor profile is deleted, all their
packages are automatically deleted as well.

IMPORTANT: This is required for role removal to work properly.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import text
from models import SessionLocal

def migrate():
    db = SessionLocal()

    try:
        print("=" * 80)
        print("MIGRATION: Add CASCADE delete to tutor_packages foreign key")
        print("=" * 80)

        # Step 1: Check current constraint
        print("\n1. Checking current foreign key constraint...")
        result = db.execute(text("""
            SELECT tc.constraint_name, rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.referential_constraints AS rc
                ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'tutor_packages'
                AND tc.constraint_name = 'tutor_packages_tutor_id_fkey';
        """)).fetchone()

        if result:
            print(f"   Found constraint: {result[0]}")
            print(f"   Current delete_rule: {result[1]}")
        else:
            print("   [WARN] Constraint not found!")
            return

        # Step 2: Drop the old constraint
        print("\n2. Dropping old foreign key constraint...")
        db.execute(text("""
            ALTER TABLE tutor_packages
            DROP CONSTRAINT IF EXISTS tutor_packages_tutor_id_fkey;
        """))
        print("   [OK] Old constraint dropped")

        # Step 3: Add new constraint with CASCADE delete
        print("\n3. Adding new foreign key constraint with CASCADE delete...")
        db.execute(text("""
            ALTER TABLE tutor_packages
            ADD CONSTRAINT tutor_packages_tutor_id_fkey
            FOREIGN KEY (tutor_id)
            REFERENCES tutor_profiles(id)
            ON DELETE CASCADE;
        """))
        print("   [OK] New constraint added with CASCADE delete")

        # Step 4: Commit changes
        db.commit()
        print("\n4. Committing changes...")
        print("   [OK] Changes committed")

        # Step 5: Verify new constraint
        print("\n5. Verifying new constraint...")
        result = db.execute(text("""
            SELECT tc.constraint_name, rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.referential_constraints AS rc
                ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'tutor_packages'
                AND tc.constraint_name = 'tutor_packages_tutor_id_fkey';
        """)).fetchone()

        if result:
            print(f"   Constraint name: {result[0]}")
            print(f"   Delete rule: {result[1]}")
            if result[1] == 'CASCADE':
                print("   [OK] CASCADE delete verified!")
            else:
                print(f"   [WARN] Expected CASCADE but got {result[1]}")
        else:
            print("   [WARN] Constraint not found after migration!")

        print("\n" + "=" * 80)
        print("MIGRATION COMPLETE")
        print("=" * 80)
        print("\nNow when a tutor profile is deleted, all their packages will be")
        print("automatically deleted as well. Role removal should work properly.")

    except Exception as e:
        print(f"\n[ERROR] during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
