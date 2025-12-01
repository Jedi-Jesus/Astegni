"""
Migration: Rename tutor_session_requests to requested_sessions and remove redundant columns

Changes:
1. Rename table: tutor_session_requests -> requested_sessions
2. Remove columns: package_name, student_name, student_grade, contact_phone, contact_email
   (These can be fetched via JOINs from student_profiles, users, and tutor_packages tables)

Run: python migrate_rename_session_requests_table.py
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("MIGRATION: Rename tutor_session_requests to requested_sessions")
        print("=" * 60)

        # Step 1: Check if old table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_session_requests'
            )
        """)
        old_table_exists = cur.fetchone()[0]

        # Check if new table already exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'requested_sessions'
            )
        """)
        new_table_exists = cur.fetchone()[0]

        if new_table_exists:
            print("✅ Table 'requested_sessions' already exists. Migration may have already run.")
            print("   Checking if old table still exists for cleanup...")
            if old_table_exists:
                print("   ⚠️  Old table 'tutor_session_requests' still exists.")
                print("   Run manual cleanup if needed.")
            return

        if not old_table_exists:
            print("❌ Table 'tutor_session_requests' does not exist. Nothing to migrate.")
            return

        # Step 2: Show current table structure
        print("\n📊 Current table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tutor_session_requests'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

        # Step 3: Rename the table
        print("\n🔄 Step 1: Renaming table tutor_session_requests -> requested_sessions...")
        cur.execute("ALTER TABLE tutor_session_requests RENAME TO requested_sessions")
        conn.commit()
        print("✅ Table renamed successfully")

        # Step 4: Drop redundant columns
        columns_to_drop = ['package_name', 'student_name', 'student_grade', 'contact_phone', 'contact_email']

        print(f"\n🗑️  Step 2: Removing redundant columns: {', '.join(columns_to_drop)}")

        for col in columns_to_drop:
            # Check if column exists before dropping
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'requested_sessions' AND column_name = %s
                )
            """, (col,))
            if cur.fetchone()[0]:
                cur.execute(f"ALTER TABLE requested_sessions DROP COLUMN IF EXISTS {col}")
                print(f"   ✅ Dropped column: {col}")
            else:
                print(f"   ⏭️  Column '{col}' doesn't exist, skipping")

        conn.commit()
        print("✅ Columns removed successfully")

        # Step 5: Update any indexes that reference old table name
        print("\n🔄 Step 3: Updating indexes...")
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'requested_sessions'
            AND indexname LIKE '%tutor_session_requests%'
        """)
        old_indexes = cur.fetchall()

        for (old_idx_name,) in old_indexes:
            new_idx_name = old_idx_name.replace('tutor_session_requests', 'requested_sessions')
            cur.execute(f"ALTER INDEX IF EXISTS {old_idx_name} RENAME TO {new_idx_name}")
            print(f"   ✅ Renamed index: {old_idx_name} -> {new_idx_name}")

        conn.commit()

        # Step 6: Show new table structure
        print("\n📊 New table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

        # Step 7: Count records
        cur.execute("SELECT COUNT(*) FROM requested_sessions")
        count = cur.fetchone()[0]
        print(f"\n📈 Total records in requested_sessions: {count}")

        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\n⚠️  IMPORTANT: Update your backend code to use:")
        print("   - Table name: 'requested_sessions' (was 'tutor_session_requests')")
        print("   - Remove references to dropped columns")
        print("   - Fetch student_name, contact info via JOINs")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
