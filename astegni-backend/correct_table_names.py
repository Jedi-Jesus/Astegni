"""
CORRECTIVE MIGRATION - Fix table names to what was actually requested

What user ACTUALLY wanted:
1. tutor_teaching_schedules (13 rows with months/days) -> tutor_schedules (KEEP data)
2. tutor_schedules (603 rows with bookings) -> tutor_teaching_schedules (DELETE data)

Current state:
- tutor_teaching_schedule: 0 rows (empty - the 13 rows were deleted - CANNOT RECOVER)
- tutor_teaching_schedules: 603 rows (session bookings)

What we can fix:
1. Rename tutor_teaching_schedule -> tutor_schedules (will be empty)
2. Keep tutor_teaching_schedules as is (603 rows)
3. Delete all data from tutor_teaching_schedules (as requested)

NOTE: The 13 rows with complex schedule data were deleted and cannot be recovered
unless there's a database backup.
"""

import sys
import io
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+psycopg://')

engine = create_engine(db_url)

def correct_table_names():
    """Fix the table names to what was actually requested"""
    with engine.connect() as conn:
        try:
            print("=" * 70)
            print("CORRECTIVE MIGRATION - Fixing table names")
            print("=" * 70)
            print()

            print("WARNING: The 13 rows with complex schedule data (months/days arrays)")
            print("         were deleted in the previous migration and CANNOT be recovered")
            print("         unless you have a database backup.")
            print()
            input("Press Enter to continue with the correction...")
            print()

            # Step 1: Rename tutor_teaching_schedule to tutor_schedules
            print("Step 1: Renaming tutor_teaching_schedule -> tutor_schedules...")
            try:
                conn.execute(text("""
                    ALTER TABLE tutor_teaching_schedule
                    RENAME TO tutor_schedules;
                """))
                conn.commit()
                print("[OK] Renamed tutor_teaching_schedule -> tutor_schedules (empty)")
            except Exception as e:
                print(f"[INFO] Table might not exist: {e}")
            print()

            # Step 2: Delete all data from tutor_teaching_schedules
            print("Step 2: Deleting all 603 rows from tutor_teaching_schedules...")
            result = conn.execute(text("DELETE FROM tutor_teaching_schedules;"))
            conn.commit()
            print(f"[OK] Deleted {result.rowcount} rows from tutor_teaching_schedules")
            print()

            # Step 3: Verify the final state
            print("Step 3: Verifying final state...")
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND (table_name = 'tutor_schedules' OR table_name = 'tutor_teaching_schedules')
                ORDER BY table_name;
            """))
            tables = result.fetchall()
            print("Final tables:")
            for table in tables:
                table_name = table[0]
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = count_result.fetchone()[0]
                print(f"  - {table_name}: {count} rows")
            print()

            print("=" * 70)
            print("CORRECTION COMPLETE")
            print("=" * 70)
            print()
            print("Final State:")
            print("  - tutor_schedules: 0 rows (empty - data lost)")
            print("  - tutor_teaching_schedules: 0 rows (empty - data deleted as requested)")
            print()
            print("NOTE: You will need to re-seed the tutor_schedules table with the")
            print("      13 rows of complex schedule data if you have a backup or seed script.")
            print()

        except Exception as e:
            print(f"[ERROR] Error during correction: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    correct_table_names()
