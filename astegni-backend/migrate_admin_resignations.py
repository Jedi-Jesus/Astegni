"""
Migration: Create admin_resignations table for admin resignation management
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
    print("Starting migration: Create admin_resignations table...")

    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Create admin_resignations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_resignations (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL REFERENCES admin_profile(id) ON DELETE CASCADE,
                reason VARCHAR(100) NOT NULL,
                reason_details TEXT,
                comments TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                reviewed_by INTEGER REFERENCES admin_profile(id),
                reviewed_at TIMESTAMP,
                last_working_day DATE,
                exit_interview_completed BOOLEAN DEFAULT FALSE,
                exit_interview_notes TEXT,
                assets_returned BOOLEAN DEFAULT FALSE,
                access_revoked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  - Created admin_resignations table")

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_resignations_admin_id ON admin_resignations(admin_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_resignations_status ON admin_resignations(status)
        """)
        print("  - Created indexes")

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
