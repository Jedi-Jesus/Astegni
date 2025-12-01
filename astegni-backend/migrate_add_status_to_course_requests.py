"""
Migration: Add status tracking to course_requests table
Adds: status, reviewed_by, review_started_at columns
"""

import os
import sys
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def run_migration():
    """Add status tracking columns to course_requests table"""
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

        print("\n📋 Adding status tracking to course_requests table...")

        # Check if columns already exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'course_requests'
            AND column_name IN ('status', 'reviewed_by', 'review_started_at')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]

        # Add status column if it doesn't exist
        if 'status' not in existing_columns:
            print("  Adding 'status' column...")
            cursor.execute("""
                ALTER TABLE course_requests
                ADD COLUMN status VARCHAR(20) DEFAULT 'new'
                CHECK (status IN ('new', 'under_review'))
            """)
            print("  ✅ 'status' column added")
        else:
            print("  ⚠️  'status' column already exists")

        # Add reviewed_by column if it doesn't exist
        if 'reviewed_by' not in existing_columns:
            print("  Adding 'reviewed_by' column...")
            cursor.execute("""
                ALTER TABLE course_requests
                ADD COLUMN reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
            """)
            print("  ✅ 'reviewed_by' column added")
        else:
            print("  ⚠️  'reviewed_by' column already exists")

        # Add review_started_at column if it doesn't exist
        if 'review_started_at' not in existing_columns:
            print("  Adding 'review_started_at' column...")
            cursor.execute("""
                ALTER TABLE course_requests
                ADD COLUMN review_started_at TIMESTAMP
            """)
            print("  ✅ 'review_started_at' column added")
        else:
            print("  ⚠️  'review_started_at' column already exists")

        # Create index on status for better query performance
        print("\n📊 Creating index on status column...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_course_requests_status
            ON course_requests(status)
        """)
        print("  ✅ Index created")

        conn.commit()
        print("\n✅ Migration completed successfully!")

        # Show current status distribution
        print("\n📊 Current course requests status distribution:")
        cursor.execute("""
            SELECT status, COUNT(*)
            FROM course_requests
            GROUP BY status
        """)
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} requests")

        # Show total count
        cursor.execute("SELECT COUNT(*) FROM course_requests")
        total = cursor.fetchone()[0]
        print(f"\n  Total course requests: {total}")

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
    print("ADD STATUS TRACKING TO COURSE_REQUESTS TABLE")
    print("=" * 60)
    run_migration()
