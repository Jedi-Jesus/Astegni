"""
Drop tutor_student_bookings and tutor_student_enrollments tables
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

def drop_tables():
    """Drop the booking and enrollment tables"""
    with engine.connect() as conn:
        try:
            print("=" * 70)
            print("DROP TABLES - tutor_student_bookings & tutor_student_enrollments")
            print("=" * 70)
            print()

            # Check current state
            print("Current state:")
            for table_name in ['tutor_student_bookings', 'tutor_student_enrollments']:
                try:
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    count = count_result.fetchone()[0]
                    print(f"  {table_name}: {count} rows")
                except Exception:
                    print(f"  {table_name}: Does not exist")
            print()

            # Drop tutor_student_bookings
            print("Step 1: Dropping tutor_student_bookings...")
            conn.execute(text("DROP TABLE IF EXISTS tutor_student_bookings CASCADE;"))
            conn.commit()
            print("[OK] Dropped tutor_student_bookings")
            print()

            # Drop tutor_student_enrollments
            print("Step 2: Dropping tutor_student_enrollments...")
            conn.execute(text("DROP TABLE IF EXISTS tutor_student_enrollments CASCADE;"))
            conn.commit()
            print("[OK] Dropped tutor_student_enrollments")
            print()

            # Verify deletion
            print("Step 3: Verifying deletion...")
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND (table_name = 'tutor_student_bookings' OR table_name = 'tutor_student_enrollments')
                ORDER BY table_name;
            """))
            remaining_tables = result.fetchall()

            if len(remaining_tables) == 0:
                print("[OK] Both tables successfully deleted")
            else:
                print("[WARNING] Some tables still exist:")
                for table in remaining_tables:
                    print(f"  - {table[0]}")
            print()

            print("=" * 70)
            print("SUCCESS! Tables dropped")
            print("=" * 70)
            print()
            print("Summary:")
            print("  [OK] tutor_student_bookings - DELETED")
            print("  [OK] tutor_student_enrollments - DELETED")
            print()

        except Exception as e:
            print(f"[ERROR] Error during table drop: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    drop_tables()
