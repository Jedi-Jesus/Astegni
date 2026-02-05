"""
Migration: Add University and Certification to Grade Levels
Updates base_price_rules to support grade levels 1-14 (adds University=13, Certification=14)
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import create_engine, text
from admin_models import AdminSessionLocal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Update grade level constraints to support University (13) and Certification (14)"""

    db = AdminSessionLocal()

    try:
        print("[*] Starting migration: Add University and Certification to grade levels...")

        # Drop the old constraint if it exists
        print("   Dropping old check constraint...")
        drop_constraint = text("""
            ALTER TABLE base_price_rules
            DROP CONSTRAINT IF EXISTS check_grade_level_range
        """)
        db.execute(drop_constraint)
        print("   [+] Old constraint dropped")

        # Add new constraint with extended range (1-14)
        print("   Adding new check constraint (1-14)...")
        add_constraint = text("""
            ALTER TABLE base_price_rules
            ADD CONSTRAINT check_grade_level_range
            CHECK (min_grade_level <= max_grade_level
                   AND min_grade_level >= 1
                   AND max_grade_level <= 14)
        """)
        db.execute(add_constraint)
        print("   [+] New constraint added (range: 1-14)")

        # Update existing rules that have max=12 to include all levels (1-14)
        print("   Updating existing 'All Grades' rules to include University and Certification...")
        update_rules = text("""
            UPDATE base_price_rules
            SET max_grade_level = 14
            WHERE min_grade_level = 1 AND max_grade_level = 12
        """)
        result = db.execute(update_rules)
        print(f"   [+] Updated {result.rowcount} rules to include University and Certification")

        # Commit changes
        db.commit()

        # Verify the changes
        print("\n[*] Verifying migration...")
        verify_constraint = text("""
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name = 'check_grade_level_range'
        """)

        constraints = db.execute(verify_constraint).fetchall()
        if constraints:
            print(f"   Constraint: {constraints[0][0]}")
            print(f"   Check: {constraints[0][1]}")

        # Show current rules
        print("\n[*] Current base price rules:")
        rules_query = text("""
            SELECT id, rule_name, subject_category, session_format,
                   min_grade_level, max_grade_level,
                   base_price_per_hour, is_active
            FROM base_price_rules
            ORDER BY priority, id
        """)

        rules = db.execute(rules_query).fetchall()
        if rules:
            print(f"   Found {len(rules)} rules:")
            for rule in rules:
                min_g = rule[4]
                max_g = rule[5]

                # Format grade range with new levels
                if min_g == 1 and max_g == 14:
                    grade_range = "All Levels (1-12, University, Certification)"
                elif min_g == 1 and max_g == 12:
                    grade_range = "Grades 1-12 Only"
                elif min_g == 13 and max_g == 14:
                    grade_range = "University & Certification"
                elif min_g == 13 and max_g == 13:
                    grade_range = "University Only"
                elif min_g == 14 and max_g == 14:
                    grade_range = "Certification Only"
                elif min_g == max_g:
                    grade_range = f"Grade {min_g}"
                else:
                    grade_range = f"Grades {min_g}-{max_g}"

                status = "[Active]" if rule[7] else "[Inactive]"
                print(f"   - [{rule[0]}] {rule[1]}: {rule[2]} + {rule[3]} | {grade_range} | {rule[6]} ETB/hr | {status}")
        else:
            print("   No rules found in database")

        print("\n[OK] Migration completed successfully!")
        print("\n[i] Grade Level System Updated:")
        print("   - Grades 1-12: Elementary, Middle, High School")
        print("   - Grade 13: University (College/Bachelor's/Master's/PhD)")
        print("   - Grade 14: Certification (Professional certifications, test prep)")
        print("   - Range: 1-14 (was 1-12)")
        print("   - Default 'All Levels' now: 1-14")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
