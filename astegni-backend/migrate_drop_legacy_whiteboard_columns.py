"""
Migration: Drop Legacy tutor_id and student_id Columns from whiteboard_sessions

IMPORTANT: Run this ONLY after ensuring all code uses the new profile-based columns:
- host_profile_id, host_profile_type
- participant_profile_ids, participant_profile_types

This migration:
1. Verifies all sessions have the new columns populated
2. Backs up the old column data (in case of rollback)
3. Drops tutor_id and student_id columns
"""

import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def run_migration():
    print("=" * 80)
    print("MIGRATION: Drop Legacy tutor_id and student_id from whiteboard_sessions")
    print("=" * 80)

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Step 1: Check if columns exist
        print("\n1. Checking if legacy columns exist...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'whiteboard_sessions'
            AND column_name IN ('tutor_id', 'student_id')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]

        if not existing_columns:
            print("   ✅ Legacy columns already removed. Nothing to do.")
            return

        print(f"   Found legacy columns: {', '.join(existing_columns)}")

        # Step 2: Verify all sessions have profile-based data
        print("\n2. Verifying all sessions have profile-based columns populated...")
        cursor.execute("""
            SELECT COUNT(*)
            FROM whiteboard_sessions
            WHERE host_profile_id IS NULL OR host_profile_type IS NULL
        """)
        missing_count = cursor.fetchone()[0]

        if missing_count > 0:
            print(f"   ❌ ERROR: {missing_count} sessions have NULL host_profile_id or host_profile_type!")
            print("   Please populate these columns before dropping legacy columns.")
            print("   You may need to run a data migration script first.")
            return

        print("   ✅ All sessions have profile-based columns populated")

        # Step 3: Show statistics
        print("\n3. Current whiteboard_sessions statistics:")
        cursor.execute("SELECT COUNT(*) FROM whiteboard_sessions")
        total_sessions = cursor.fetchone()[0]
        print(f"   Total sessions: {total_sessions}")

        cursor.execute("""
            SELECT host_profile_type, COUNT(*)
            FROM whiteboard_sessions
            GROUP BY host_profile_type
        """)
        for row in cursor.fetchall():
            print(f"   - {row[0]} hosts: {row[1]}")

        # Step 4: Create backup table (optional safety measure)
        print("\n4. Creating backup of legacy column data...")
        backup_table = f"whiteboard_sessions_legacy_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        cursor.execute(f"""
            CREATE TABLE {backup_table} AS
            SELECT id, tutor_id, student_id, created_at
            FROM whiteboard_sessions
        """)

        cursor.execute(f"SELECT COUNT(*) FROM {backup_table}")
        backup_count = cursor.fetchone()[0]
        print(f"   ✅ Backed up {backup_count} rows to table: {backup_table}")

        # Step 5: Drop the legacy columns
        print("\n5. Dropping legacy columns...")

        if 'tutor_id' in existing_columns:
            print("   Dropping tutor_id column...")
            cursor.execute("ALTER TABLE whiteboard_sessions DROP COLUMN tutor_id")
            print("   ✅ tutor_id column dropped")

        if 'student_id' in existing_columns:
            print("   Dropping student_id column...")
            cursor.execute("ALTER TABLE whiteboard_sessions DROP COLUMN student_id")
            print("   ✅ student_id column dropped")

        conn.commit()

        # Step 6: Verify columns are gone
        print("\n6. Verifying columns were dropped...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'whiteboard_sessions'
            ORDER BY ordinal_position
        """)
        remaining_columns = [row[0] for row in cursor.fetchall()]

        print(f"   Remaining columns in whiteboard_sessions:")
        for col in remaining_columns:
            print(f"   - {col}")

        if 'tutor_id' not in remaining_columns and 'student_id' not in remaining_columns:
            print("\n" + "=" * 80)
            print("✅ MIGRATION SUCCESSFUL!")
            print("=" * 80)
            print(f"Legacy columns dropped. Backup saved in: {backup_table}")
            print("\nTo rollback (if needed):")
            print(f"  ALTER TABLE whiteboard_sessions ADD COLUMN tutor_id INTEGER;")
            print(f"  ALTER TABLE whiteboard_sessions ADD COLUMN student_id INTEGER[];")
            print(f"  UPDATE whiteboard_sessions ws SET")
            print(f"    tutor_id = b.tutor_id,")
            print(f"    student_id = b.student_id")
            print(f"  FROM {backup_table} b WHERE ws.id = b.id;")
        else:
            print("\n❌ ERROR: Some legacy columns still exist!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: Migration failed!")
        print(f"   {str(e)}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("\n⚠️  WARNING: This migration will drop tutor_id and student_id columns!")
    print("Make sure you have:")
    print("1. Updated ALL code to use host_profile_id/participant_profile_ids")
    print("2. Tested the updated code thoroughly")
    print("3. Have a recent database backup")
    print()

    response = input("Are you sure you want to proceed? (yes/no): ")

    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
