"""
Verification: Check that all foreign keys to profile tables use CASCADE delete
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import text
from models import SessionLocal

def verify():
    db = SessionLocal()

    try:
        print("=" * 80)
        print("VERIFICATION: Foreign Key CASCADE Delete Settings")
        print("=" * 80)

        profile_tables = ['tutor_profiles', 'student_profiles', 'parent_profiles', 'advertiser_profiles']

        for profile_table in profile_tables:
            print(f"\n{profile_table.upper()}")
            print("-" * 80)

            # Get all foreign keys pointing to this profile table
            result = db.execute(text(f"""
                SELECT tc.table_name, tc.constraint_name, kcu.column_name, rc.delete_rule
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                JOIN information_schema.referential_constraints AS rc
                    ON tc.constraint_name = rc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND ccu.table_name = '{profile_table}'
                    AND ccu.column_name = 'id'
                ORDER BY tc.table_name;
            """)).fetchall()

            if not result:
                print("   No foreign keys found")
                continue

            # Count by delete rule
            cascade_count = 0
            no_action_count = 0
            set_null_count = 0

            for row in result:
                table_name = row[0]
                delete_rule = row[3]

                if delete_rule == 'CASCADE':
                    cascade_count += 1
                    status = "[OK]"
                elif delete_rule == 'SET NULL':
                    set_null_count += 1
                    status = "[OK]"
                elif delete_rule in ('NO ACTION', 'RESTRICT'):
                    no_action_count += 1
                    status = "[WARN]"
                else:
                    status = "[???]"

                print(f"   {status} {table_name:30} -> {delete_rule}")

            print(f"\n   Summary:")
            print(f"   - CASCADE: {cascade_count}")
            print(f"   - SET NULL: {set_null_count}")
            print(f"   - NO ACTION/RESTRICT: {no_action_count}")
            print(f"   - Total: {cascade_count + no_action_count + set_null_count}")

        print("\n" + "=" * 80)
        print("VERIFICATION COMPLETE")
        print("=" * 80)

    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    verify()
