"""
Create student_details table for storing comprehensive student information
"""
import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def create_student_details_table():
    """Create student_details table with comprehensive fields"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 80)
        print("CREATING student_details TABLE")
        print("=" * 80)

        # Create the table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS student_details (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
                student_profile_id INTEGER NOT NULL,

                -- Basic Info
                student_name VARCHAR(255) NOT NULL,
                student_grade VARCHAR(50),
                profile_picture TEXT,

                -- Package Information
                package_id INTEGER REFERENCES tutor_packages(id) ON DELETE SET NULL,
                package_name VARCHAR(255),

                -- Progress Metrics
                overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
                attendance_rate INTEGER DEFAULT 0 CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
                improvement_rate INTEGER DEFAULT 0 CHECK (improvement_rate >= 0 AND improvement_rate <= 100),

                -- Assignment Tracking
                total_assignments INTEGER DEFAULT 0,
                completed_assignments INTEGER DEFAULT 0,
                pending_assignments INTEGER DEFAULT 0,
                overdue_assignments INTEGER DEFAULT 0,

                -- Attendance Tracking
                total_sessions INTEGER DEFAULT 0,
                attended_sessions INTEGER DEFAULT 0,
                absent_sessions INTEGER DEFAULT 0,
                late_sessions INTEGER DEFAULT 0,

                -- Academic Performance
                average_grade DECIMAL(5,2),
                grade_letter VARCHAR(5),

                -- Tuition & Payments
                monthly_tuition DECIMAL(10,2),
                outstanding_balance DECIMAL(10,2) DEFAULT 0,
                next_payment_due DATE,

                -- Parent Information
                parent_name VARCHAR(255),
                parent_phone VARCHAR(20),
                parent_email VARCHAR(255),
                parent_relationship VARCHAR(50),

                -- Timestamps
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_session_at TIMESTAMP,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                UNIQUE(tutor_id, student_profile_id)
            );
        """)

        print("✅ Created student_details table")

        # Create indexes for performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_details_tutor
            ON student_details(tutor_id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_details_student
            ON student_details(student_profile_id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_details_package
            ON student_details(package_id);
        """)

        print("✅ Created indexes for student_details table")

        conn.commit()

        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETE!")
        print("=" * 80)
        print("\nNext steps:")
        print("1. Run seed script to populate initial data from tutor_students")
        print("2. Update backend endpoints to read from student_details")
        print("3. Test the student details modal")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating student_details table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_student_details_table()
