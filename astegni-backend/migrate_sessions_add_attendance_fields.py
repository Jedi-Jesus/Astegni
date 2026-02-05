"""
Migration: Sessions Table - Add Enhanced Attendance Tracking Fields

PURPOSE:
- Add fields to track WHO marked attendance and WHEN
- Add field to track HOW attendance was determined (manual vs automated)
- Add notes field for attendance explanations
- Make attendance tracking auditable and transparent

NEW FIELDS:
1. attendance_marked_by - user_id of who marked the attendance
2. attendance_marked_at - timestamp when attendance was marked
3. attendance_source - how was attendance determined
   - 'manual' = Tutor/admin manually marked
   - 'whiteboard_auto' = Auto-suggested from whiteboard connection data
   - 'parent_reported' = Parent reported attendance
   - 'admin_override' = Admin override decision
   - 'system_default' = Default 'present' status
4. attendance_notes - Optional explanation (e.g., "Student had emergency")

EXISTING FIELDS (already in sessions table):
- tutor_attendance_status (present/absent/late)
- student_attendance_status (present/absent/late)
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
            print("SESSIONS TABLE: Add Enhanced Attendance Tracking Fields")
            print("=" * 80)

            # ============================================
            # Step 1: Check current schema
            # ============================================
            print("\n[Step 1] Checking current sessions table schema...")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'sessions'
                ORDER BY ordinal_position
            """)
            current_columns = cur.fetchall()
            print(f"  Current columns: {len(current_columns)}")

            column_names = [col[0] for col in current_columns]

            # Verify existing attendance fields
            if 'tutor_attendance_status' in column_names:
                print("  ✅ tutor_attendance_status exists")
            else:
                print("  ⚠️  tutor_attendance_status NOT FOUND (should exist)")

            if 'student_attendance_status' in column_names:
                print("  ✅ student_attendance_status exists")
            else:
                print("  ⚠️  student_attendance_status NOT FOUND (should exist)")

            # ============================================
            # Step 2: Add attendance_marked_by
            # ============================================
            print("\n[Step 2] Adding attendance_marked_by field...")
            if 'attendance_marked_by' not in column_names:
                cur.execute("""
                    ALTER TABLE sessions
                    ADD COLUMN attendance_marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL
                """)
                print("  ✅ Added attendance_marked_by (references users)")
            else:
                print("  ℹ️  attendance_marked_by already exists")

            # ============================================
            # Step 3: Add attendance_marked_at
            # ============================================
            print("\n[Step 3] Adding attendance_marked_at field...")
            if 'attendance_marked_at' not in column_names:
                cur.execute("""
                    ALTER TABLE sessions
                    ADD COLUMN attendance_marked_at TIMESTAMP
                """)
                print("  ✅ Added attendance_marked_at")
            else:
                print("  ℹ️  attendance_marked_at already exists")

            # ============================================
            # Step 4: Add attendance_source
            # ============================================
            print("\n[Step 4] Adding attendance_source field...")
            if 'attendance_source' not in column_names:
                cur.execute("""
                    ALTER TABLE sessions
                    ADD COLUMN attendance_source VARCHAR(30) DEFAULT 'system_default'
                """)
                print("  ✅ Added attendance_source")
                print("     Valid values: manual, whiteboard_auto, parent_reported,")
                print("                   admin_override, system_default")
            else:
                print("  ℹ️  attendance_source already exists")

            # ============================================
            # Step 5: Add attendance_notes
            # ============================================
            print("\n[Step 5] Adding attendance_notes field...")
            if 'attendance_notes' not in column_names:
                cur.execute("""
                    ALTER TABLE sessions
                    ADD COLUMN attendance_notes TEXT
                """)
                print("  ✅ Added attendance_notes")
            else:
                print("  ℹ️  attendance_notes already exists")

            # ============================================
            # Step 6: Add check constraint for attendance_source
            # ============================================
            print("\n[Step 6] Adding check constraint for attendance_source...")
            cur.execute("""
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'sessions'::regclass
                AND conname = 'sessions_attendance_source_check'
            """)

            if not cur.fetchone():
                cur.execute("""
                    ALTER TABLE sessions
                    ADD CONSTRAINT sessions_attendance_source_check
                    CHECK (attendance_source IN (
                        'manual',
                        'whiteboard_auto',
                        'parent_reported',
                        'admin_override',
                        'system_default'
                    ))
                """)
                print("  ✅ Added check constraint for attendance_source")
            else:
                print("  ℹ️  Check constraint already exists")

            # ============================================
            # Step 7: Add column comments
            # ============================================
            print("\n[Step 7] Adding column comments for documentation...")

            comments = [
                ("attendance_marked_by", "User ID who marked the attendance (tutor/parent/admin)"),
                ("attendance_marked_at", "Timestamp when attendance was marked"),
                ("attendance_source", "How attendance was determined: manual, whiteboard_auto, parent_reported, admin_override, system_default"),
                ("attendance_notes", "Optional notes explaining attendance status (e.g., Student had emergency)"),
                ("tutor_attendance_status", "Tutor attendance: present, absent, late"),
                ("student_attendance_status", "Student attendance: present, absent, late")
            ]

            for column_name, comment in comments:
                # Check if column exists before adding comment
                if column_name in column_names or column_name in ['attendance_marked_by', 'attendance_marked_at', 'attendance_source', 'attendance_notes']:
                    # Escape single quotes in comments
                    escaped_comment = comment.replace("'", "''")
                    cur.execute(f"""
                        COMMENT ON COLUMN sessions.{column_name}
                        IS '{escaped_comment}'
                    """)

            print(f"  ✅ Added {len(comments)} column comments")

            # ============================================
            # Step 8: Create indexes for performance
            # ============================================
            print("\n[Step 8] Creating indexes for attendance queries...")

            indexes = [
                ("idx_sessions_attendance_marked_by", "attendance_marked_by"),
                ("idx_sessions_attendance_source", "attendance_source"),
                ("idx_sessions_attendance_statuses", "tutor_attendance_status, student_attendance_status")
            ]

            for index_name, columns in indexes:
                cur.execute(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON sessions ({columns})
                """)
                print(f"  ✅ Created index: {index_name}")

            # ============================================
            # Step 9: Update existing records
            # ============================================
            print("\n[Step 9] Updating existing records with default values...")

            # Set attendance_source to 'system_default' for existing records
            # that have default attendance but no source
            cur.execute("""
                UPDATE sessions
                SET attendance_source = 'system_default'
                WHERE attendance_source IS NULL
            """)
            updated_count = cur.rowcount
            print(f"  ✅ Updated {updated_count} existing sessions with default source")

            # ============================================
            # Step 10: Verify final schema
            # ============================================
            print("\n[Step 10] Verifying final schema...")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'sessions'
                AND column_name IN (
                    'tutor_attendance_status', 'student_attendance_status',
                    'attendance_marked_by', 'attendance_marked_at',
                    'attendance_source', 'attendance_notes'
                )
                ORDER BY column_name
            """)
            attendance_columns = cur.fetchall()

            print(f"  ✅ Verified {len(attendance_columns)} attendance-related columns:")
            for col in attendance_columns:
                nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                default = f" DEFAULT {col[3]}" if col[3] else ""
                print(f"     - {col[0]} ({col[1]}, {nullable}{default})")

            conn.commit()

            print("\n" + "=" * 80)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 80)
            print("\nSummary:")
            print("  ✅ Added: attendance_marked_by (tracks WHO marked)")
            print("  ✅ Added: attendance_marked_at (tracks WHEN marked)")
            print("  ✅ Added: attendance_source (tracks HOW determined)")
            print("  ✅ Added: attendance_notes (tracks WHY/explanation)")
            print("  ✅ Added: Check constraint for attendance_source values")
            print("  ✅ Added: Performance indexes (3 indexes)")
            print("  ✅ Added: Documentation comments")
            print(f"  ✅ Updated: {updated_count} existing sessions with default source")
            print("\nAttendance Source Values:")
            print("  - manual: Tutor/admin manually marked")
            print("  - whiteboard_auto: Auto-suggested from whiteboard data")
            print("  - parent_reported: Parent reported attendance")
            print("  - admin_override: Admin override decision")
            print("  - system_default: Default 'present' status")
            print("\nNext Steps:")
            print("  1. Create whiteboard WebSocket connection tracking endpoints")
            print("  2. Create attendance suggestion endpoint (GET /api/tutor/sessions/{id}/attendance-suggestion)")
            print("  3. Update attendance marking endpoint (PUT /api/tutor/sessions/{id})")
            print("  4. Add attendance analytics/reporting")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
