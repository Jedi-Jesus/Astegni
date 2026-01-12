"""
Migration: Create account deletion requests table
Purpose: Track account deletion requests with 90-day grace period

Flow:
1. User initiates deletion (Panel 1: types DELETE)
2. User selects reasons (Panel 2: checkboxes)
3. User acknowledges 90-day period and 200 ETB fee (Panel 3)
4. User confirms with password (Panel 4)
5. Account is deactivated, deletion scheduled for 90 days (Panel 5)

If user logs in within 90 days, account is automatically restored.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)

def run_migration():
    """Create account_deletion_requests and deletion_reasons tables"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Create deletion_reasons table (for analytics)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deletion_reasons (
                id SERIAL PRIMARY KEY,
                reason_code VARCHAR(50) NOT NULL UNIQUE,
                reason_label VARCHAR(100) NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Created deletion_reasons table")

        # Insert default deletion reasons
        cursor.execute("""
            INSERT INTO deletion_reasons (reason_code, reason_label, description, display_order)
            VALUES
                ('not_useful', 'Not useful', 'User found the platform not useful for their needs', 1),
                ('too_expensive', 'Too expensive', 'User found the pricing too high', 2),
                ('found_alternative', 'Found alternative', 'User found a better alternative platform', 3),
                ('privacy_concerns', 'Privacy concerns', 'User has concerns about data privacy', 4),
                ('not_satisfied', 'Not satisfied', 'User is not satisfied with the service quality', 5),
                ('other', 'Other', 'Other reason specified by user', 6)
            ON CONFLICT (reason_code) DO NOTHING;
        """)
        print("Inserted default deletion reasons")

        # Create account_deletion_requests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS account_deletion_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Deletion status
                status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, cancelled, completed

                -- Reasons for leaving (from Panel 2) - stored as JSON array of reason_codes
                reasons JSON DEFAULT '[]',
                other_reason TEXT,  -- Free text if "other" selected

                -- Fee information
                deletion_fee DECIMAL(10, 2) DEFAULT 200.00,  -- 200 ETB
                fee_paid BOOLEAN DEFAULT FALSE,
                fee_paid_at TIMESTAMP,

                -- Timestamps
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scheduled_deletion_at TIMESTAMP,  -- 90 days from requested_at
                cancelled_at TIMESTAMP,
                completed_at TIMESTAMP,

                -- Cancellation info (if user logs back in)
                cancelled_by_login BOOLEAN DEFAULT FALSE,
                cancellation_reason TEXT,

                -- Additional metadata
                ip_address VARCHAR(45),
                user_agent TEXT
            );
        """)
        print("Created account_deletion_requests table")

        # Create deletion_reason_stats table (for analytics aggregation)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deletion_reason_stats (
                id SERIAL PRIMARY KEY,
                reason_code VARCHAR(50) NOT NULL,
                month DATE NOT NULL,  -- First day of month for aggregation
                count INTEGER DEFAULT 0,
                UNIQUE(reason_code, month)
            );
        """)
        print("Created deletion_reason_stats table")

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id
            ON account_deletion_requests(user_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_deletion_requests_status
            ON account_deletion_requests(status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled
            ON account_deletion_requests(scheduled_deletion_at)
            WHERE status = 'pending';
        """)
        print("Created indexes")

        # Add columns to users table for soft delete
        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';
        """)
        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;
        """)
        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
        """)
        print("Added account_status, deactivated_at, scheduled_deletion_at columns to users table")

        # Create index on account_status
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_account_status
            ON users(account_status);
        """)
        print("Created index on users.account_status")

        conn.commit()
        print("\n Migration completed successfully!")
        print("\nNew table: account_deletion_requests")
        print("New columns in users: account_status, deactivated_at, scheduled_deletion_at")
        print("\nAccount status values: 'active', 'pending_deletion', 'deleted'")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def verify_migration():
    """Verify the migration was successful"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Check table exists
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'account_deletion_requests'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()

        print("\n=== account_deletion_requests table structure ===")
        for col in columns:
            print(f"  {col['column_name']}: {col['data_type']} (default: {col['column_default']})")

        # Check users table new columns
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('account_status', 'deactivated_at', 'scheduled_deletion_at')
            ORDER BY ordinal_position;
        """)
        user_columns = cursor.fetchall()

        print("\n=== New columns in users table ===")
        for col in user_columns:
            print(f"  {col['column_name']}: {col['data_type']} (default: {col['column_default']})")

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Running account deletion migration...")
    print("=" * 50)
    run_migration()
    print("\n" + "=" * 50)
    print("Verifying migration...")
    verify_migration()
