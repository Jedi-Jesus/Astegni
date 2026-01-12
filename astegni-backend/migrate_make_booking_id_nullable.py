"""
Migration: Make booking_id nullable in whiteboard_sessions

This allows creating ad-hoc whiteboard sessions from video calls
without requiring a pre-existing tutor_student_booking.
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
import os

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("🎨 Making booking_id nullable in whiteboard_sessions...")

        # Alter booking_id column to allow NULL values
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            ALTER COLUMN booking_id DROP NOT NULL;
        """)

        print("✅ booking_id is now nullable")

        # Also make tutor_id and student_id nullable since we now use profile IDs
        print("\n🔧 Making legacy user_id columns nullable...")
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            ALTER COLUMN tutor_id DROP NOT NULL;
        """)
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            ALTER COLUMN student_id DROP NOT NULL;
        """)

        print("✅ tutor_id and student_id are now nullable")

        conn.commit()
        print("\n" + "="*60)
        print("🎉 Migration Complete!")
        print("="*60)
        print("\n✅ whiteboard_sessions.booking_id is now nullable")
        print("✅ Ad-hoc sessions can now be created from video calls")
        print("\nYou can now use /api/whiteboard/sessions/quick-create")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error during migration: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
