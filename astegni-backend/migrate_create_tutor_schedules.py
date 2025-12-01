"""
Migration: Create tutor_schedules table
Creates table for storing tutor teaching schedules
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
        print(f"❌ Database connection error: {e}")
        raise

def migrate():
    """Create tutor_schedules table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("📅 Creating tutor_schedules table...")

            # Create tutor_schedules table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutor_schedules (
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
            print("📊 Creating indexes...")

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tutor_schedules_tutor_id
                ON tutor_schedules(tutor_id);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tutor_schedules_status
                ON tutor_schedules(status);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tutor_schedules_created_at
                ON tutor_schedules(created_at DESC);
            """)

            conn.commit()
            print("✅ tutor_schedules table created successfully!")
            print("✅ Indexes created successfully!")

    except psycopg.Error as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 50)
    print("TUTOR SCHEDULES TABLE MIGRATION")
    print("=" * 50)

    try:
        migrate()
        print("\n" + "=" * 50)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 50)
        print("\nTable structure:")
        print("  - id: Serial primary key")
        print("  - tutor_id: Foreign key to users table")
        print("  - title: Schedule title")
        print("  - subject: Subject name (or custom if 'Other')")
        print("  - subject_type: Original subject selection")
        print("  - grade_level: Grade level")
        print("  - months: Array of selected months")
        print("  - days: Array of selected days")
        print("  - start_time: Schedule start time")
        print("  - end_time: Schedule end time")
        print("  - notes: Additional notes")
        print("  - status: 'active' or 'draft'")
        print("  - created_at: Creation timestamp")
        print("  - updated_at: Last update timestamp")
        print("\nIndexes created:")
        print("  - idx_tutor_schedules_tutor_id")
        print("  - idx_tutor_schedules_status")
        print("  - idx_tutor_schedules_created_at")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        exit(1)
