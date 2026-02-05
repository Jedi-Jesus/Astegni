"""
Migration: Add Grade Level Range to Base Price Rules
Adds min_grade_level and max_grade_level columns to base_price_rules table
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
    """Add grade level range columns to base_price_rules table"""

    db = AdminSessionLocal()

    try:
        print("[*] Starting migration: Add grade level range to base_price_rules...")

        # Check if columns already exist
        check_columns = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'base_price_rules'
            AND column_name IN ('min_grade_level', 'max_grade_level')
        """)

        existing_columns = db.execute(check_columns).fetchall()
        existing_column_names = [col[0] for col in existing_columns]

        if 'min_grade_level' in existing_column_names and 'max_grade_level' in existing_column_names:
            print("[OK] Columns already exist. Migration skipped.")
            return

        # Add min_grade_level column (nullable, default to 1 for "all grades")
        if 'min_grade_level' not in existing_column_names:
            print("   Adding min_grade_level column...")
            add_min_grade = text("""
                ALTER TABLE base_price_rules
                ADD COLUMN min_grade_level INTEGER DEFAULT 1
            """)
            db.execute(add_min_grade)
            print("   [+] min_grade_level column added")

        # Add max_grade_level column (nullable, default to 12 for "all grades")
        if 'max_grade_level' not in existing_column_names:
            print("   Adding max_grade_level column...")
            add_max_grade = text("""
                ALTER TABLE base_price_rules
                ADD COLUMN max_grade_level INTEGER DEFAULT 12
            """)
            db.execute(add_max_grade)
            print("   [+] max_grade_level column added")

        # Add check constraint to ensure min <= max
        print("   Adding check constraint...")
        add_constraint = text("""
            ALTER TABLE base_price_rules
            ADD CONSTRAINT check_grade_level_range
            CHECK (min_grade_level <= max_grade_level
                   AND min_grade_level >= 1
                   AND max_grade_level <= 12)
        """)
        try:
            db.execute(add_constraint)
            print("   [+] Check constraint added")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("   [i] Check constraint already exists")
            else:
                print(f"   [!] Warning: Could not add constraint: {e}")

        # Commit changes
        db.commit()

        # Verify the changes
        print("\n[*] Verifying migration...")
        verify_query = text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'base_price_rules'
            AND column_name IN ('min_grade_level', 'max_grade_level')
            ORDER BY column_name
        """)

        columns = db.execute(verify_query).fetchall()
        print("\n   New columns:")
        for col in columns:
            print(f"   - {col[0]} ({col[1]}): default = {col[2]}")

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
                grade_range = f"Grades {rule[4]}-{rule[5]}" if rule[4] and rule[5] else "All Grades"
                status = "[Active]" if rule[7] else "[Inactive]"
                print(f"   - [{rule[0]}] {rule[1]}: {rule[2]} + {rule[3]} | {grade_range} | {rule[6]} ETB/hr | {status}")
        else:
            print("   No rules found in database")

        print("\n[OK] Migration completed successfully!")
        print("\n[i] Grade Level Range Features:")
        print("   - min_grade_level: Minimum grade level (1-12, default: 1)")
        print("   - max_grade_level: Maximum grade level (1-12, default: 12)")
        print("   - Values 1-12 for specific grade range")
        print("   - Both set to default (1-12) means 'All Grades'")
        print("   - System will match rules based on tutor's teaching grade levels")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
