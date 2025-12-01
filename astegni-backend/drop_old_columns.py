"""
Drop old columns from student_profiles table
This removes the old columns that have been replaced by new ones
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

def drop_old_columns():
    """Drop old columns that have been replaced"""

    print("\n" + "="*60)
    print("DROPPING OLD COLUMNS FROM STUDENT_PROFILES")
    print("="*60)

    # Columns to drop (old columns that have been replaced)
    columns_to_drop = [
        'date_of_birth',           # Not needed
        'school_address',          # Not needed
        'subjects',                # Replaced by interested_in
        'weak_subjects',           # Moved to student_overall_progress
        'strong_subjects',         # Moved to student_overall_progress
        'interests',               # Replaced by hobbies
        'learning_style',          # Replaced by learning_method
        'preferred_session_time',  # Not needed
        'preferred_learning_mode', # Duplicate of learning_method
        'academic_goals',          # Moved to student_overall_progress
        'current_gpa',             # Moved to student_overall_progress
        'target_gpa',              # Moved to student_overall_progress
        'guardian_name',           # Moved to student_guardian
        'guardian_phone',          # Moved to student_guardian
        'guardian_email',          # Moved to student_guardian
        'guardian_relationship',   # Moved to student_guardian
        'total_sessions',          # Calculated from student_courses
        'total_hours',             # Calculated from student_courses
        'courses_enrolled',        # Calculated from student_courses
        'is_active',               # Not needed
        'profile_complete',        # Not needed
        'profile_completion',      # Not needed
        'bio',                     # Replaced by about
        'school_name',             # Replaced by studying_at
        'preferred_languages',     # Replaced by languages
        'rating',                  # Not needed in student_profiles
        'rating_count',            # Not needed in student_profiles
        'gpa',                     # Duplicate of current_gpa
        'attendance_rate',         # Moved to student_overall_progress
        'total_connections'        # Calculated from connections table
    ]

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            print("\nDropping old columns...\n")

            dropped_count = 0
            skipped_count = 0

            for column in columns_to_drop:
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
                        dropped_count += 1
                    else:
                        print(f"  ⊘ Already removed: {column}")
                        skipped_count += 1

                except Exception as e:
                    print(f"  ⚠️ Could not drop {column}: {str(e)}")

            # Commit all changes
            conn.commit()

            print("\n" + "="*60)
            print(f"✅ Cleanup completed!")
            print(f"   Dropped: {dropped_count} columns")
            print(f"   Skipped: {skipped_count} columns (already removed)")
            print("="*60)

def show_remaining_columns():
    """Show the final structure after cleanup"""

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

            # Highlight new columns
            new_cols = ['hero_title', 'hero_subtitle', 'username', 'email', 'phone',
                       'interested_in', 'hobbies', 'languages', 'learning_method',
                       'studying_at', 'about', 'quote']

            found_new = [c['column_name'] for c in columns if c['column_name'] in new_cols]

            print(f"\nNew/Restructured columns present: {len(found_new)}/{len(new_cols)}")
            print("="*60 + "\n")

def main():
    """Run the cleanup"""
    try:
        print("\n🧹 Starting cleanup of old student_profiles columns...")
        print("\nThis will remove old columns that have been:")
        print("  • Replaced by new columns (subjects → interested_in, etc.)")
        print("  • Moved to other tables (guardian info, academic progress)")
        print("  • No longer needed (duplicates, calculated fields)")
        print("\nPress Ctrl+C to cancel...\n")

        import time
        time.sleep(2)  # Give user time to cancel

        drop_old_columns()
        show_remaining_columns()

        print("✅ All done! Your student_profiles table is now clean and optimized.")

    except KeyboardInterrupt:
        print("\n\n❌ Cleanup cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Cleanup failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
