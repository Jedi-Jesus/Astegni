"""
Remove gender, email, and phone columns from student_profiles table
These fields are managed at the user/account level, not in the student profile
"""

import psycopg
from psycopg.rows import dict_row
import os
import sys
from dotenv import load_dotenv

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def remove_columns():
    """Remove gender, email, phone columns from student_profiles"""

    print("\n" + "="*60)
    print("REMOVING GENDER, EMAIL, PHONE FROM STUDENT_PROFILES")
    print("="*60)

    columns_to_remove = ['gender', 'email', 'phone']

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            print("\n🗑️  Dropping columns...\n")

            for column in columns_to_remove:
                try:
                    # Check if column exists first
                    cur.execute(f"""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'student_profiles'
                        AND column_name = '{column}'
                    """)

                    if cur.fetchone():
                        # Drop the column
                        cur.execute(f"""
                            ALTER TABLE student_profiles
                            DROP COLUMN IF EXISTS {column} CASCADE
                        """)
                        print(f"  ✓ Dropped: {column}")
                    else:
                        print(f"  ⊘ Already removed: {column}")

                except Exception as e:
                    print(f"  ⚠️ Could not drop {column}: {str(e)}")

            # Commit changes
            conn.commit()

            print("\n" + "="*60)
            print("✅ Columns removed successfully!")
            print("="*60)

def show_final_structure():
    """Show final table structure"""

    print("\n" + "="*60)
    print("FINAL STUDENT_PROFILES STRUCTURE")
    print("="*60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'student_profiles'
                ORDER BY ordinal_position
            """)

            columns = cur.fetchall()

            print(f"\n{'Column Name':<30} {'Data Type':<25}")
            print("-"*60)

            for col in columns:
                print(f"{col['column_name']:<30} {col['data_type']:<25}")

            print("-"*60)
            print(f"Total columns: {len(columns)}")
            print("="*60 + "\n")

def main():
    """Run the migration"""
    try:
        print("\n🧹 Removing gender, email, phone from student_profiles...")
        print("\nThese fields are managed at the account level (users table).")
        print("Student profiles focus on academic/learning preferences.\n")

        import time
        time.sleep(2)  # Give user time to read

        remove_columns()
        show_final_structure()

        print("✅ Migration complete!")
        print("\n📝 Next steps:")
        print("  1. Restart backend: cd astegni-backend && python app.py")
        print("  2. Test profile editing")
        print()

    except KeyboardInterrupt:
        print("\n\n❌ Migration cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
