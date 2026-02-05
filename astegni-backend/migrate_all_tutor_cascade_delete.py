"""
Migration: Add CASCADE delete to all tutor_profiles foreign keys

This migration modifies all foreign key constraints pointing to tutor_profiles
to use CASCADE delete, so that when a tutor profile is deleted, all related
data is automatically deleted as well.

IMPORTANT: This is required for role removal to work properly.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import text
from models import SessionLocal

# Tables that need CASCADE delete when tutor is deleted
CONSTRAINTS_TO_UPDATE = [
    {
        'table': 'tutor_reviews',
        'constraint': 'tutor_reviews_tutor_id_fkey',
        'column': 'tutor_id',
        'references': 'tutor_profiles(id)'
    },
    {
        'table': 'tutor_activities',
        'constraint': 'tutor_activities_tutor_id_fkey',
        'column': 'tutor_id',
        'references': 'tutor_profiles(id)'
    },
    {
        'table': 'video_reels',
        'constraint': 'video_reels_tutor_id_fkey',
        'column': 'tutor_id',
        'references': 'tutor_profiles(id)'
    },
    {
        'table': 'tutoring_earnings',
        'constraint': 'tutoring_earnings_tutor_profile_id_fkey',
        'column': 'tutor_profile_id',
        'references': 'tutor_profiles(id)'
    },
    {
        'table': 'monthly_earnings_summary',
        'constraint': 'monthly_earnings_summary_tutor_profile_id_fkey',
        'column': 'tutor_profile_id',
        'references': 'tutor_profiles(id)'
    },
    {
        'table': 'favorite_tutors',
        'constraint': 'favorite_tutors_tutor_id_fkey',
        'column': 'tutor_id',
        'references': 'tutor_profiles(id)'
    },
    {
        'table': 'direct_affiliate_earnings',
        'constraint': 'direct_affiliate_earnings_tutor_profile_id_fkey',
        'column': 'tutor_profile_id',
        'references': 'tutor_profiles(id)'
    },
    {
        'table': 'indirect_affiliate_earnings',
        'constraint': 'indirect_affiliate_earnings_tutor_profile_id_fkey',
        'column': 'tutor_profile_id',
        'references': 'tutor_profiles(id)'
    }
]

def migrate():
    db = SessionLocal()

    try:
        print("=" * 80)
        print("MIGRATION: Add CASCADE delete to all tutor_profiles foreign keys")
        print("=" * 80)

        success_count = 0
        skip_count = 0
        error_count = 0

        for i, constraint_info in enumerate(CONSTRAINTS_TO_UPDATE, 1):
            table = constraint_info['table']
            constraint = constraint_info['constraint']
            column = constraint_info['column']
            references = constraint_info['references']

            print(f"\n[{i}/{len(CONSTRAINTS_TO_UPDATE)}] Processing: {table}.{column}")

            # Check if constraint exists
            result = db.execute(text(f"""
                SELECT tc.constraint_name, rc.delete_rule
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.referential_constraints AS rc
                    ON tc.constraint_name = rc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_name = '{table}'
                    AND tc.constraint_name = '{constraint}';
            """)).fetchone()

            if not result:
                print(f"   [SKIP] Constraint not found")
                skip_count += 1
                continue

            current_delete_rule = result[1]
            print(f"   Current delete_rule: {current_delete_rule}")

            if current_delete_rule == 'CASCADE':
                print(f"   [SKIP] Already has CASCADE delete")
                skip_count += 1
                continue

            try:
                # Drop old constraint
                print(f"   Dropping old constraint...")
                db.execute(text(f"""
                    ALTER TABLE {table}
                    DROP CONSTRAINT IF EXISTS {constraint};
                """))

                # Add new constraint with CASCADE
                print(f"   Adding new constraint with CASCADE...")
                db.execute(text(f"""
                    ALTER TABLE {table}
                    ADD CONSTRAINT {constraint}
                    FOREIGN KEY ({column})
                    REFERENCES {references}
                    ON DELETE CASCADE;
                """))

                # Verify
                verify_result = db.execute(text(f"""
                    SELECT rc.delete_rule
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.referential_constraints AS rc
                        ON tc.constraint_name = rc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                        AND tc.table_name = '{table}'
                        AND tc.constraint_name = '{constraint}';
                """)).fetchone()

                if verify_result and verify_result[0] == 'CASCADE':
                    print(f"   [OK] CASCADE delete applied successfully")
                    success_count += 1
                else:
                    print(f"   [ERROR] Verification failed")
                    error_count += 1

            except Exception as e:
                print(f"   [ERROR] {e}")
                error_count += 1
                # Continue with other constraints even if one fails

        # Commit all changes
        print("\n" + "=" * 80)
        print("Committing all changes...")
        db.commit()
        print("[OK] Changes committed")

        print("\n" + "=" * 80)
        print("MIGRATION SUMMARY")
        print("=" * 80)
        print(f"Total constraints: {len(CONSTRAINTS_TO_UPDATE)}")
        print(f"Successfully updated: {success_count}")
        print(f"Skipped (already CASCADE): {skip_count}")
        print(f"Errors: {error_count}")

        if error_count == 0:
            print("\n[OK] All tutor_profiles foreign keys now have CASCADE delete!")
            print("Role removal should work properly now.")
        else:
            print(f"\n[WARN] {error_count} constraint(s) failed to update.")
            print("Check the output above for details.")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
