"""
Migration: Refactor tutor_sessions to sessions table

MAJOR CHANGES:
1. Rename table: tutor_sessions → sessions
2. Simplified schema with only essential fields
3. Links to course_enrollments instead of direct tutor/student references
4. Removed redundant fields (objectives, materials_used, homework_assigned, etc.)
5. Added review system integration (student_review_id, tutor_review_id, parent_review_id)
6. Changed field names to match new convention

NEW SCHEMA:
- id (primary key)
- course_enrollment_id (references enrolled_students table)
- topics (JSON array - topics planned for this session)
- session_date (date)
- start_time (time)
- end_time (time)
- duration (integer - minutes)
- session_mode (varchar - online/in-person/hybrid)
- location (varchar - physical location if in-person)
- whiteboard_id (integer - references whiteboard_sessions table)
- topics_covered (JSON array - topics actually covered)
- student_review_id (integer - reference to student's review of this session)
- tutor_review_id (integer - reference to tutor's review of student performance)
- parent_review_id (integer - reference to parent's review)
- tutor_attendance_status (varchar - present/absent/late)
- student_attendance_status (varchar - present/absent/late)
- priority_level (varchar - low/medium/high/urgent)
- is_recurring (boolean)
- session_frequency (varchar - one-time/weekly/bi-weekly/monthly)
- recurring_pattern (JSON - {days: [], months: [], specific_dates: []})
- notification_enabled (boolean)
- alarm_enabled (boolean)
- alarm_before_minutes (integer)
- is_featured (boolean)
- status (varchar - scheduled/in-progress/completed/cancelled)
- created_at (timestamp)
- updated_at (timestamp)
"""

import psycopg
import os
import json
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment")
    return psycopg.connect(database_url)

def migrate():
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("=" * 80)
            print("MIGRATION: Refactor tutor_sessions -> sessions")
            print("=" * 80)
            print()

            # Step 1: Check if old table exists
            print("Step 1: Checking existing tables...")
            cur.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('tutor_sessions', 'sessions')
                ORDER BY table_name
            """)

            existing_tables = [row[0] for row in cur.fetchall()]
            print(f"  Found tables: {existing_tables}")

            # Step 2: Backup old data if tutor_sessions exists
            backup_data = []
            if 'tutor_sessions' in existing_tables:
                print("\nStep 2: Backing up existing tutor_sessions data...")
                cur.execute("SELECT COUNT(*) FROM tutor_sessions")
                count = cur.fetchone()[0]
                print(f"  Found {count} existing sessions to migrate")

                if count > 0:
                    cur.execute("""
                        SELECT id, enrollment_id, tutor_id, student_id, subject, topic,
                               session_date, start_time, end_time, duration, mode, location,
                               status, student_attended, tutor_attended,
                               session_frequency, is_recurring, recurring_pattern,
                               notification_enabled, alarm_enabled, alarm_before_minutes, is_featured,
                               created_at, updated_at
                        FROM tutor_sessions
                    """)
                    backup_data = cur.fetchall()
                    print(f"  [OK] Backed up {len(backup_data)} sessions")
            else:
                print("\nStep 2: No existing tutor_sessions table to backup")

            # Step 3: Drop old sessions table if it exists
            if 'sessions' in existing_tables:
                print("\nStep 3: Dropping existing sessions table...")
                cur.execute("DROP TABLE IF EXISTS sessions CASCADE")
                print("  [OK] Dropped old sessions table")

            # Step 4: Create new sessions table with refactored schema
            print("\nStep 4: Creating new sessions table...")
            cur.execute("""
                CREATE TABLE sessions (
                    id SERIAL PRIMARY KEY,

                    -- Enrollment reference (replaces direct tutor_id/student_id)
                    course_enrollment_id INTEGER REFERENCES enrolled_students(id) ON DELETE CASCADE,

                    -- Session planning and execution
                    topics JSON DEFAULT '[]',  -- Topics planned for this session
                    topics_covered JSON DEFAULT '[]',  -- Topics actually covered

                    -- Date and time
                    session_date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    duration INTEGER,  -- Duration in minutes

                    -- Session logistics
                    session_mode VARCHAR(50) DEFAULT 'online',  -- online, in-person, hybrid
                    location VARCHAR(255),  -- Physical location if in-person
                    whiteboard_id INTEGER,  -- Reference to whiteboard_sessions table

                    -- Review system integration
                    student_review_id INTEGER,  -- Student's review of this session
                    tutor_review_id INTEGER,  -- Tutor's review of student performance
                    parent_review_id INTEGER,  -- Parent's review (if applicable)

                    -- Attendance tracking
                    tutor_attendance_status VARCHAR(20) DEFAULT 'present',  -- present, absent, late
                    student_attendance_status VARCHAR(20) DEFAULT 'present',  -- present, absent, late

                    -- Priority and scheduling
                    priority_level VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, urgent
                    is_recurring BOOLEAN DEFAULT FALSE,
                    session_frequency VARCHAR(50) DEFAULT 'one-time',  -- one-time, weekly, bi-weekly, monthly
                    recurring_pattern JSON,  -- {days: [], months: [], specific_dates: []}

                    -- Notifications and alarms
                    notification_enabled BOOLEAN DEFAULT FALSE,
                    alarm_enabled BOOLEAN DEFAULT FALSE,
                    alarm_before_minutes INTEGER DEFAULT 15,

                    -- Featured sessions
                    is_featured BOOLEAN DEFAULT FALSE,

                    -- Status tracking
                    status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, in-progress, completed, cancelled

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("  [OK] Created sessions table with new schema")

            # Step 5: Add indexes for performance
            print("\nStep 5: Adding indexes...")
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_enrollment ON sessions(course_enrollment_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
                CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
                CREATE INDEX IF NOT EXISTS idx_sessions_featured ON sessions(is_featured);
                CREATE INDEX IF NOT EXISTS idx_sessions_recurring ON sessions(is_recurring);
            """)
            print("  [OK] Added 5 indexes")

            # Step 6: Add comments to columns
            print("\nStep 6: Adding column comments...")
            comments = [
                ("course_enrollment_id", "Reference to enrolled_students table (replaces direct tutor_id/student_id)"),
                ("topics", "JSON array of topics planned for this session"),
                ("topics_covered", "JSON array of topics actually covered during session"),
                ("session_mode", "Mode of session: online, in-person, or hybrid"),
                ("whiteboard_id", "Reference to whiteboard_sessions table if whiteboard was used"),
                ("student_review_id", "Reference to student's review of this session"),
                ("tutor_review_id", "Reference to tutor's review of student performance"),
                ("parent_review_id", "Reference to parent's review (if applicable)"),
                ("tutor_attendance_status", "Tutor attendance: present, absent, late"),
                ("student_attendance_status", "Student attendance: present, absent, late"),
                ("priority_level", "Priority level: low, medium, high, urgent"),
                ("session_frequency", "Frequency: one-time, weekly, bi-weekly, monthly"),
                ("recurring_pattern", "JSON pattern for recurring sessions: {days: [], months: [], specific_dates: []}"),
            ]

            for column, comment in comments:
                # Escape single quotes in comment
                escaped_comment = comment.replace("'", "''")
                cur.execute(f"""
                    COMMENT ON COLUMN sessions.{column} IS '{escaped_comment}'
                """)
            print(f"  [OK] Added {len(comments)} column comments")

            # Step 7: Migrate old data if exists (with mapping)
            migrated_count = 0
            if backup_data:
                print(f"\nStep 7: Migrating {len(backup_data)} old sessions to new schema...")
                print("  Note: This migration will attempt to map old fields to new schema")
                print("  - enrollment_id will be mapped to course_enrollment_id")
                print("  - subject/topic will be combined into topics array")
                print("  - student_attended/tutor_attended mapped to attendance_status")

                for row in backup_data:
                    try:
                        (old_id, enrollment_id, tutor_id, student_id, subject, topic,
                         session_date, start_time, end_time, duration, mode, location,
                         status, student_attended, tutor_attended,
                         session_frequency, is_recurring, recurring_pattern,
                         notification_enabled, alarm_enabled, alarm_before_minutes, is_featured,
                         created_at, updated_at) = row

                        # Map old fields to new schema
                        topics = [subject] if subject else []
                        if topic:
                            topics.append(topic)

                        # Convert topics to JSON string
                        topics_json = json.dumps(topics)

                        # Map attendance boolean to status
                        student_attendance = 'present' if student_attended else 'absent'
                        tutor_attendance = 'present' if tutor_attended else 'absent'

                        # Convert recurring_pattern to JSON string if it's a dict
                        recurring_pattern_json = json.dumps(recurring_pattern) if isinstance(recurring_pattern, dict) else recurring_pattern

                        cur.execute("""
                            INSERT INTO sessions (
                                course_enrollment_id, topics, session_date, start_time, end_time,
                                duration, session_mode, location, student_attendance_status,
                                tutor_attendance_status, session_frequency, is_recurring,
                                recurring_pattern, notification_enabled, alarm_enabled,
                                alarm_before_minutes, is_featured, status, created_at, updated_at
                            ) VALUES (
                                %s, %s::json, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::json, %s, %s, %s, %s, %s, %s, %s
                            )
                        """, (
                            enrollment_id, topics_json, session_date, start_time, end_time,
                            duration, mode or 'online', location, student_attendance,
                            tutor_attendance, session_frequency or 'one-time', is_recurring or False,
                            recurring_pattern_json, notification_enabled or False, alarm_enabled or False,
                            alarm_before_minutes or 15, is_featured or False, status or 'scheduled',
                            created_at, updated_at
                        ))
                        migrated_count += 1
                    except Exception as e:
                        print(f"  [WARN]  Failed to migrate session {old_id}: {e}")
                        conn.rollback()
                        conn.commit()  # Start new transaction
                        continue

                print(f"  [OK] Migrated {migrated_count}/{len(backup_data)} sessions")
            else:
                print("\nStep 7: No data to migrate")

            # Step 8: Drop old tutor_sessions table
            if 'tutor_sessions' in existing_tables:
                print("\nStep 8: Dropping old tutor_sessions table...")
                cur.execute("DROP TABLE IF EXISTS tutor_sessions CASCADE")
                print("  [OK] Dropped tutor_sessions table")
            else:
                print("\nStep 8: No tutor_sessions table to drop")

            # Step 9: Verify new table
            print("\nStep 9: Verifying new sessions table...")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'sessions'
                ORDER BY ordinal_position
            """)

            columns = cur.fetchall()
            print(f"  [OK] Sessions table has {len(columns)} columns:")
            for col in columns:
                nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
                default = f"DEFAULT {col[3]}" if col[3] else ""
                print(f"     - {col[0]:<30} {col[1]:<20} {nullable:<10} {default}")

            # Step 10: Count records
            cur.execute("SELECT COUNT(*) FROM sessions")
            final_count = cur.fetchone()[0]
            print(f"\n  [INFO] Total sessions in new table: {final_count}")

            # Commit all changes
            conn.commit()

            print("\n" + "=" * 80)
            print("[OK] MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 80)
            print("\nSummary:")
            print(f"  - Renamed table: tutor_sessions -> sessions")
            print(f"  - Refactored schema: {len(columns)} fields")
            print(f"  - Migrated records: {migrated_count}")
            print(f"  - Final record count: {final_count}")
            print(f"  - Added indexes: 5")
            print(f"  - Added comments: {len(comments)}")
            print("\nNext Steps:")
            print("  1. Update tutor_sessions_endpoints.py to use new schema")
            print("  2. Update frontend JavaScript to match new field names")
            print("  3. Test all session-related endpoints")
            print("  4. Update any other code referencing tutor_sessions table")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
