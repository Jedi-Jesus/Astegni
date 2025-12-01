"""
Create tutor_teaching_schedules table
Separate from tutor_schedules (which is for session bookings)
"""

import psycopg

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg.connect(
            host="localhost",
            port=5432,
            dbname="astegni_db",
            user="astegni_user",
            password="Astegni2025"
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise

def migrate():
    """Create tutor_teaching_schedules table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("Creating tutor_teaching_schedules table...")

            # Create tutor_teaching_schedules table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutor_teaching_schedules (
                    id SERIAL PRIMARY KEY,
                    tutor_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    subject VARCHAR(255) NOT NULL,
                    subject_type VARCHAR(100) NOT NULL,
                    grade_level VARCHAR(100) NOT NULL,
                    year INTEGER NOT NULL,
                    schedule_type VARCHAR(20) DEFAULT 'recurring' CHECK (schedule_type IN ('recurring', 'specific')),
                    months TEXT[] NOT NULL DEFAULT '{}',
                    days TEXT[] NOT NULL DEFAULT '{}',
                    specific_dates TEXT[] DEFAULT '{}',
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    notes TEXT,
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft')),
                    alarm_enabled BOOLEAN DEFAULT FALSE,
                    alarm_before_minutes INTEGER,
                    notification_browser BOOLEAN DEFAULT FALSE,
                    notification_sound BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)

            # Create indexes for better query performance
            print("Creating indexes...")

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_teaching_schedules_tutor_id
                ON tutor_teaching_schedules(tutor_id);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_teaching_schedules_status
                ON tutor_teaching_schedules(status);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_teaching_schedules_created_at
                ON tutor_teaching_schedules(created_at DESC);
            """)

            conn.commit()
            print("SUCCESS: tutor_teaching_schedules table created!")
            print("SUCCESS: Indexes created!")

    except psycopg.Error as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 50)
    print("TUTOR TEACHING SCHEDULES TABLE MIGRATION")
    print("=" * 50)

    try:
        migrate()
        print("\n" + "=" * 50)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 50)
        print("\nTable: tutor_teaching_schedules")
        print("Purpose: Store tutor teaching schedules (recurring/specific)")
        print("\nNote: Separate from 'tutor_schedules' which is for session bookings")

    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        exit(1)
