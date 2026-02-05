"""
Migration: Whiteboard Sessions - Remove attendance_status, Add Connection Tracking

PURPOSE:
- Remove attendance_status field (redundant, now in sessions table)
- Add real-time connection tracking fields (WebSocket-based)
- Track actual participant connection times, not just session open times

CHANGES:
1. DROP: attendance_status (moved to sessions table)
2. ADD: tutor_connected_at - When tutor WebSocket connects
3. ADD: student_connected_at - When student WebSocket connects
4. ADD: tutor_disconnected_at - When tutor WebSocket disconnects
5. ADD: student_disconnected_at - When student WebSocket disconnects
6. ADD: tutor_last_activity_at - Last interaction from tutor
7. ADD: student_last_activity_at - Last interaction from student
8. ADD: tutor_total_active_seconds - Total active time (tracked via heartbeat)
9. ADD: student_total_active_seconds - Total active time (tracked via heartbeat)
10. ADD: connection_logs - JSONB array of all connect/disconnect events for audit

PHILOSOPHY:
Connection = Presence. Only WebSocket connections prove actual attendance.
"""

import psycopg
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def migrate():
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("=" * 80)
            print("WHITEBOARD SESSIONS: Remove attendance_status, Add Connection Tracking")
            print("=" * 80)

            # ============================================
            # Step 1: Check current schema
            # ============================================
            print("\n[Step 1] Checking current whiteboard_sessions schema...")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'whiteboard_sessions'
                ORDER BY ordinal_position
            """)
            current_columns = cur.fetchall()
            print(f"  Current columns: {len(current_columns)}")

            column_names = [col[0] for col in current_columns]

            # ============================================
            # Step 2: Drop attendance_status if exists
            # ============================================
            print("\n[Step 2] Removing attendance_status field...")
            if 'attendance_status' in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    DROP COLUMN IF EXISTS attendance_status
                """)
                print("  ✅ Dropped attendance_status column")
            else:
                print("  ℹ️  attendance_status column does not exist (already removed)")

            # ============================================
            # Step 3: Add connection tracking fields
            # ============================================
            print("\n[Step 3] Adding connection tracking fields...")

            # Tutor connection tracking
            if 'tutor_connected_at' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN tutor_connected_at TIMESTAMP
                """)
                print("  ✅ Added tutor_connected_at")
            else:
                print("  ℹ️  tutor_connected_at already exists")

            if 'tutor_disconnected_at' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN tutor_disconnected_at TIMESTAMP
                """)
                print("  ✅ Added tutor_disconnected_at")
            else:
                print("  ℹ️  tutor_disconnected_at already exists")

            if 'tutor_last_activity_at' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN tutor_last_activity_at TIMESTAMP
                """)
                print("  ✅ Added tutor_last_activity_at")
            else:
                print("  ℹ️  tutor_last_activity_at already exists")

            if 'tutor_total_active_seconds' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN tutor_total_active_seconds INTEGER DEFAULT 0
                """)
                print("  ✅ Added tutor_total_active_seconds")
            else:
                print("  ℹ️  tutor_total_active_seconds already exists")

            # Student connection tracking
            if 'student_connected_at' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN student_connected_at TIMESTAMP
                """)
                print("  ✅ Added student_connected_at")
            else:
                print("  ℹ️  student_connected_at already exists")

            if 'student_disconnected_at' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN student_disconnected_at TIMESTAMP
                """)
                print("  ✅ Added student_disconnected_at")
            else:
                print("  ℹ️  student_disconnected_at already exists")

            if 'student_last_activity_at' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN student_last_activity_at TIMESTAMP
                """)
                print("  ✅ Added student_last_activity_at")
            else:
                print("  ℹ️  student_last_activity_at already exists")

            if 'student_total_active_seconds' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN student_total_active_seconds INTEGER DEFAULT 0
                """)
                print("  ✅ Added student_total_active_seconds")
            else:
                print("  ℹ️  student_total_active_seconds already exists")

            # ============================================
            # Step 4: Add connection logs (audit trail)
            # ============================================
            print("\n[Step 4] Adding connection logs field for audit trail...")
            if 'connection_logs' not in column_names:
                cur.execute("""
                    ALTER TABLE whiteboard_sessions
                    ADD COLUMN connection_logs JSONB DEFAULT '[]'::jsonb
                """)
                print("  ✅ Added connection_logs (JSONB array)")
                print("     Format: [{user_id, user_type, event, timestamp}, ...]")
            else:
                print("  ℹ️  connection_logs already exists")

            # ============================================
            # Step 5: Add comments for documentation
            # ============================================
            print("\n[Step 5] Adding column comments...")

            comments = [
                ("tutor_connected_at", "Timestamp when tutor WebSocket first connects"),
                ("tutor_disconnected_at", "Timestamp when tutor WebSocket disconnects"),
                ("tutor_last_activity_at", "Last time tutor performed any action (draw, type, etc)"),
                ("tutor_total_active_seconds", "Total seconds tutor was actively engaged (heartbeat tracking)"),
                ("student_connected_at", "Timestamp when student WebSocket first connects"),
                ("student_disconnected_at", "Timestamp when student WebSocket disconnects"),
                ("student_last_activity_at", "Last time student performed any action (draw, type, etc)"),
                ("student_total_active_seconds", "Total seconds student was actively engaged (heartbeat tracking)"),
                ("connection_logs", "Audit trail: [{user_id, user_type, event: connect/disconnect, timestamp}, ...]")
            ]

            for column_name, comment in comments:
                cur.execute(f"""
                    COMMENT ON COLUMN whiteboard_sessions.{column_name}
                    IS '{comment}'
                """)

            print(f"  ✅ Added {len(comments)} column comments")

            # ============================================
            # Step 6: Create indexes for performance
            # ============================================
            print("\n[Step 6] Creating indexes for connection tracking queries...")

            indexes = [
                ("idx_whiteboard_tutor_connected", "tutor_connected_at"),
                ("idx_whiteboard_student_connected", "student_connected_at"),
                ("idx_whiteboard_last_activity", "tutor_last_activity_at, student_last_activity_at")
            ]

            for index_name, columns in indexes:
                cur.execute(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON whiteboard_sessions ({columns})
                """)
                print(f"  ✅ Created index: {index_name}")

            # ============================================
            # Step 7: Verify final schema
            # ============================================
            print("\n[Step 7] Verifying final schema...")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'whiteboard_sessions'
                AND column_name IN (
                    'tutor_connected_at', 'tutor_disconnected_at', 'tutor_last_activity_at',
                    'tutor_total_active_seconds', 'student_connected_at', 'student_disconnected_at',
                    'student_last_activity_at', 'student_total_active_seconds', 'connection_logs'
                )
                ORDER BY column_name
            """)
            new_columns = cur.fetchall()

            print(f"  ✅ Verified {len(new_columns)} new columns exist")
            for col in new_columns:
                print(f"     - {col[0]} ({col[1]})")

            # Verify attendance_status is gone
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'whiteboard_sessions'
                AND column_name = 'attendance_status'
            """)
            if cur.fetchone():
                print("  ⚠️  WARNING: attendance_status still exists!")
            else:
                print("  ✅ Confirmed: attendance_status removed")

            conn.commit()

            print("\n" + "=" * 80)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 80)
            print("\nSummary:")
            print("  ✅ Removed: attendance_status (redundant)")
            print("  ✅ Added: Connection tracking fields (8 fields)")
            print("  ✅ Added: connection_logs (audit trail)")
            print("  ✅ Added: Performance indexes (3 indexes)")
            print("  ✅ Added: Documentation comments")
            print("\nNext Steps:")
            print("  1. Run: python migrate_sessions_add_attendance_fields.py")
            print("  2. Update whiteboard WebSocket handlers to track connections")
            print("  3. Implement attendance suggestion endpoint")
            print("  4. Test WebSocket connection/disconnection events")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
