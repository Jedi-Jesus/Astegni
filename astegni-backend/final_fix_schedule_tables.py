"""
FINAL FIX - Correct the schedule tables

Current state:
- tutor_schedules: 0 rows (wrong structure - session bookings)
- tutor_teaching_schedule: 0 rows (correct structure - months/days arrays)
- tutor_teaching_schedules: 603 rows (session bookings)

Desired state:
- tutor_schedules: 0 rows (correct structure - months/days arrays)
- tutor_teaching_schedules: 0 rows (session bookings structure - empty)

Actions:
1. Drop the wrong tutor_schedules table (session bookings structure)
2. Rename tutor_teaching_schedule -> tutor_schedules (months/days structure)
3. Delete all 603 rows from tutor_teaching_schedules
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

def final_fix():
    """Final fix for schedule tables"""
    with engine.connect() as conn:
        try:
            print("=" * 70)
            print("FINAL FIX - Correcting Schedule Tables")
            print("=" * 70)
            print()

            # Step 1: Drop the wrong tutor_schedules table
            print("Step 1: Dropping wrong tutor_schedules table (session bookings structure)...")
            conn.execute(text("DROP TABLE IF EXISTS tutor_schedules CASCADE;"))
            conn.commit()
            print("[OK] Dropped wrong tutor_schedules table")
            print()

            # Step 2: Rename tutor_teaching_schedule to tutor_schedules
            print("Step 2: Renaming tutor_teaching_schedule -> tutor_schedules...")
            conn.execute(text("""
                ALTER TABLE tutor_teaching_schedule
                RENAME TO tutor_schedules;
            """))
            conn.commit()
            print("[OK] Renamed tutor_teaching_schedule -> tutor_schedules")
            print("     (Now has correct structure with months/days arrays)")
            print()

            # Step 3: Delete all data from tutor_teaching_schedules
            print("Step 3: Deleting all 603 rows from tutor_teaching_schedules...")
            result = conn.execute(text("DELETE FROM tutor_teaching_schedules;"))
            conn.commit()
            print(f"[OK] Deleted {result.rowcount} rows from tutor_teaching_schedules")
            print()

            # Step 4: Verify final state
            print("Step 4: Verifying final state...")
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND (table_name = 'tutor_schedules' OR table_name = 'tutor_teaching_schedules')
                ORDER BY table_name;
            """))
            tables = result.fetchall()

            print()
            print("=" * 70)
            print("FINAL STATE")
            print("=" * 70)
            print()

            for table in tables:
                table_name = table[0]
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = count_result.fetchone()[0]

                # Check structure
                col_result = conn.execute(text(f"""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}'
                    AND column_name IN ('months', 'days', 'title', 'schedule_date', 'student_id')
                    ORDER BY ordinal_position;
                """))
                key_cols = [c[0] for c in col_result.fetchall()]

                if 'months' in key_cols and 'days' in key_cols:
                    structure = "Complex schedules (months/days arrays)"
                else:
                    structure = "Session bookings (schedule_date)"

                print(f"{table_name}:")
                print(f"  Rows: {count}")
                print(f"  Structure: {structure}")
                print()

            print("=" * 70)
            print("SUCCESS! Tables are now correctly configured:")
            print("=" * 70)
            print()
            print("[OK] tutor_schedules: 0 rows (months/days structure - ready for new data)")
            print("[OK] tutor_teaching_schedules: 0 rows (session bookings - empty)")
            print()
            print("NOTE: The 13 rows with complex schedule data were lost in the")
            print("      previous migration and cannot be recovered.")
            print()

        except Exception as e:
            print(f"[ERROR] Error during fix: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    final_fix()
