"""
Migration: Create admin_leave_requests table for admin leave management
"""
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def run_migration():
    print("Starting migration: Create admin_leave_requests table...")

    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Create admin_leave_requests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_leave_requests (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL REFERENCES admin_profile(id) ON DELETE CASCADE,
                leave_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                approved_by INTEGER REFERENCES admin_profile(id),
                approved_at TIMESTAMP,
                rejection_reason TEXT,
                emergency_contact_name VARCHAR(255),
                emergency_contact_phone VARCHAR(50),
                handover_notes TEXT,
                attachments JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  - Created admin_leave_requests table")

        # Create indexes for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_id ON admin_leave_requests(admin_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON admin_leave_requests(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON admin_leave_requests(start_date, end_date)
        """)
        print("  - Created indexes")

        # Add leave balance columns to admin_profile if they don't exist
        try:
            cursor.execute("""
                ALTER TABLE admin_profile
                ADD COLUMN IF NOT EXISTS annual_leave_balance INTEGER DEFAULT 20,
                ADD COLUMN IF NOT EXISTS sick_leave_balance INTEGER DEFAULT 10,
                ADD COLUMN IF NOT EXISTS personal_leave_balance INTEGER DEFAULT 5
            """)
            print("  - Added leave balance columns to admin_profile")
        except Exception as e:
            print(f"  - Leave balance columns may already exist: {e}")

        conn.commit()
        print("\nMigration completed successfully!")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
