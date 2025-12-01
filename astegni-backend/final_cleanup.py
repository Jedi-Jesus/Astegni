"""
Final cleanup - Drop remaining obsolete tables
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def cleanup():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    print("=" * 70)
    print("FINAL CLEANUP - Dropping Obsolete Tables")
    print("=" * 70)
    print()

    try:
        # Drop tutoring_sessions (old name, we use tutor_sessions now)
        print("Dropping tutoring_sessions table...")
        cur.execute("DROP TABLE IF EXISTS tutoring_sessions CASCADE")
        print("  [SUCCESS] tutoring_sessions dropped")

        # Drop tutor_student_enrollments
        print("Dropping tutor_student_enrollments table...")
        cur.execute("DROP TABLE IF EXISTS tutor_student_enrollments CASCADE")
        print("  [SUCCESS] tutor_student_enrollments dropped")

        conn.commit()

        print()
        print("=" * 70)
        print("CLEANUP COMPLETE")
        print("=" * 70)
        print()

        # Verify
        print("Verifying remaining schedule/session tables:")
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND (table_name LIKE '%schedule%' OR table_name LIKE '%session%')
            ORDER BY table_name
        """)
        tables = [row[0] for row in cur.fetchall()]
        for table in tables:
            marker = " <-- ACTIVE" if table in ['tutor_schedules', 'tutor_sessions'] else ""
            print(f"  - {table}{marker}")

        print()
        print("SUCCESS: Cleanup complete!")
        print()
        print("Active tables for schedule panel:")
        print("  - tutor_schedules (teaching schedules/availability)")
        print("  - tutor_sessions (actual tutoring sessions)")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    cleanup()
