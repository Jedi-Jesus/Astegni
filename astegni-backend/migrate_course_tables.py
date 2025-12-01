"""
Migration Script for Course Management Tables
Creates: course_requests, active_courses, rejected_courses, suspended_courses
"""

import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def run_migration():
    """Create course management tables"""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

        # Parse connection string
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")

        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_part = host_db.split("/")

        # Remove query parameters from database name
        db_name = db_part.split("?")[0]

        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"

        print(f"🔄 Connecting to {host}:{port}/{db_name}")

        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )

        cursor = conn.cursor()

        print("\n📋 Creating Course Management Tables...")

        # 1. Course Requests Table (Pending)
        print("  Creating course_requests table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_requests (
                id SERIAL PRIMARY KEY,
                request_id VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                level VARCHAR(100),
                description TEXT,
                requested_by VARCHAR(255),
                requester_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✅ course_requests table created")

        # 2. Active Courses Table (Verified/Approved)
        print("  Creating active_courses table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS active_courses (
                id SERIAL PRIMARY KEY,
                course_id VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                level VARCHAR(100),
                description TEXT,
                requested_by VARCHAR(255),
                requester_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                enrolled_students INTEGER DEFAULT 0,
                rating DECIMAL(2, 1) DEFAULT 0.0,
                rating_count INTEGER DEFAULT 0,
                notification_sent BOOLEAN DEFAULT FALSE,
                notification_sent_at TIMESTAMP,
                notification_target_audience VARCHAR(100),
                approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✅ active_courses table created")

        # 3. Rejected Courses Table
        print("  Creating rejected_courses table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rejected_courses (
                id SERIAL PRIMARY KEY,
                rejected_id VARCHAR(50) UNIQUE NOT NULL,
                original_request_id VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                level VARCHAR(100),
                description TEXT,
                requested_by VARCHAR(255),
                requester_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                rejection_reason TEXT NOT NULL,
                rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✅ rejected_courses table created")

        # 4. Suspended Courses Table
        print("  Creating suspended_courses table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS suspended_courses (
                id SERIAL PRIMARY KEY,
                suspended_id VARCHAR(50) UNIQUE NOT NULL,
                original_course_id VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                level VARCHAR(100),
                description TEXT,
                requested_by VARCHAR(255),
                requester_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                enrolled_students INTEGER DEFAULT 0,
                rating DECIMAL(2, 1) DEFAULT 0.0,
                rating_count INTEGER DEFAULT 0,
                suspension_reason TEXT NOT NULL,
                suspended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                suspended_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✅ suspended_courses table created")

        # 5. Course Notification History Table
        print("  Creating course_notifications table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_notifications (
                id SERIAL PRIMARY KEY,
                course_id VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                target_audience VARCHAR(100) NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                delivery_methods JSONB DEFAULT '{"inApp": true, "email": false, "sms": false}'::jsonb
            );
        """)
        print("  ✅ course_notifications table created")

        # Create indexes for better performance
        print("\n📊 Creating indexes...")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_course_requests_request_id ON course_requests(request_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_active_courses_course_id ON active_courses(course_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rejected_courses_rejected_id ON rejected_courses(rejected_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_suspended_courses_suspended_id ON suspended_courses(suspended_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_active_courses_category ON active_courses(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_active_courses_level ON active_courses(level);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_course_notifications_course_id ON course_notifications(course_id);")

        print("  ✅ Indexes created")

        conn.commit()
        print("\n✅ Migration completed successfully!")

        # Show table counts
        print("\n📊 Current table status:")
        for table in ['course_requests', 'active_courses', 'rejected_courses', 'suspended_courses', 'course_notifications']:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} records")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("COURSE MANAGEMENT TABLES MIGRATION")
    print("=" * 60)
    run_migration()
