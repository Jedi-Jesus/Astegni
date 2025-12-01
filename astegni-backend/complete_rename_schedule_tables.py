"""
Complete the table rename operation (continuing from step 2)
Current state:
  - temp_teaching_schedule (13 rows) - needs to become tutor_teaching_schedule (empty)
  - tutor_schedules (603 rows) - needs to become tutor_teaching_schedules
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

def complete_rename():
    """Complete the table rename operation"""
    with engine.connect() as conn:
        try:
            print("Completing table rename operation...")
            print()

            # Step 2: Rename tutor_schedules to tutor_teaching_schedules
            print("Step 2: Renaming tutor_schedules -> tutor_teaching_schedules...")
            conn.execute(text("""
                ALTER TABLE tutor_schedules
                RENAME TO tutor_teaching_schedules;
            """))
            conn.commit()
            print("[OK] Renamed tutor_schedules -> tutor_teaching_schedules (603 rows preserved)")
            print()

            # Step 3: Rename temp_teaching_schedule to tutor_teaching_schedule
            print("Step 3: Renaming temp_teaching_schedule -> tutor_teaching_schedule...")
            conn.execute(text("""
                ALTER TABLE temp_teaching_schedule
                RENAME TO tutor_teaching_schedule;
            """))
            conn.commit()
            print("[OK] Renamed temp_teaching_schedule -> tutor_teaching_schedule")
            print()

            # Step 4: Clear all data from tutor_teaching_schedule
            print("Step 4: Clearing data from tutor_teaching_schedule...")
            result = conn.execute(text("DELETE FROM tutor_teaching_schedule;"))
            conn.commit()
            print(f"[OK] Deleted {result.rowcount} rows from tutor_teaching_schedule")
            print()

            # Step 5: Verify the changes
            print("Step 5: Verifying changes...")
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND (table_name = 'tutor_teaching_schedule' OR table_name = 'tutor_teaching_schedules')
                ORDER BY table_name;
            """))
            tables = result.fetchall()
            print("Current tables:")
            for table in tables:
                table_name = table[0]
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = count_result.fetchone()[0]
                print(f"  - {table_name}: {count} rows")
            print()

            print("=" * 60)
            print("SUCCESS! Table rename complete.")
            print("=" * 60)
            print()
            print("Summary:")
            print("  [OK] tutor_teaching_schedules -> tutor_teaching_schedule (empty)")
            print("  [OK] tutor_schedules -> tutor_teaching_schedules (603 rows)")
            print()

        except Exception as e:
            print(f"[ERROR] Error during rename: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    complete_rename()
