"""
Migration: Drop Conflicting Tables
Removes tutoring_sessions and tutor_student_enrollments tables that conflict with the whiteboard system.

The whiteboard system uses:
- tutor_student_bookings (student enrollments with tutors)
- whiteboard_sessions (actual sessions)

These conflicting tables are:
- tutor_student_enrollments (duplicate of tutor_student_bookings)
- tutoring_sessions (duplicate of whiteboard_sessions)
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def drop_conflicting_tables():
    """Drop the conflicting tables"""
    engine = create_engine(DATABASE_URL)

    print("=" * 60)
    print("DROPPING CONFLICTING TABLES")
    print("=" * 60)

    with engine.connect() as conn:
        # Check if tables exist
        result = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('tutoring_sessions', 'tutor_student_enrollments')
        """))
        existing_tables = [row[0] for row in result]

        if not existing_tables:
            print("\n[OK] Tables do not exist. Nothing to drop.")
            return

        print(f"\nFound tables to drop: {existing_tables}")

        # Drop tutoring_sessions first (has foreign key to tutor_student_enrollments)
        if 'tutoring_sessions' in existing_tables:
            print("\n1. Dropping tutoring_sessions table...")
            conn.execute(text("DROP TABLE IF EXISTS tutoring_sessions CASCADE"))
            conn.commit()
            print("   [OK] tutoring_sessions dropped")

        # Drop tutor_student_enrollments
        if 'tutor_student_enrollments' in existing_tables:
            print("\n2. Dropping tutor_student_enrollments table...")
            conn.execute(text("DROP TABLE IF EXISTS tutor_student_enrollments CASCADE"))
            conn.commit()
            print("   [OK] tutor_student_enrollments dropped")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETE")
        print("=" * 60)
        print("\nConflicting tables removed successfully!")
        print("\nThe whiteboard system uses:")
        print("  - tutor_student_bookings (for enrollments)")
        print("  - whiteboard_sessions (for sessions)")

if __name__ == "__main__":
    drop_conflicting_tables()
