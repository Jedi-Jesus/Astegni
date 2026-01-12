"""
Migration: Create payment_methods table
Purpose: Store user payment methods for receiving earnings (bank, mobile money)
Date: January 2026

This migration creates a table for storing payment methods linked to users.
Each user can have multiple payment methods.
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def run_migration():
    """Create the payment_methods table"""

    # Convert SQLAlchemy URL to psycopg2 format
    db_url = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    try:
        # Create payment_methods table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_methods (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Payment Method Type
                method_type VARCHAR(50) NOT NULL,  -- 'bank', 'mobile_money'

                -- Bank Transfer Fields
                bank_name VARCHAR(100),
                bank_code VARCHAR(20),  -- Bank identifier code (e.g., 'cbe', 'dashen', 'awash')
                account_number VARCHAR(50),
                account_holder_name VARCHAR(200),
                swift_code VARCHAR(20),

                -- Mobile Money Fields (TeleBirr, CBE Birr, M-Pesa, M-Birr, HelloCash, Amole)
                phone_number VARCHAR(20),
                provider VARCHAR(50),  -- 'telebirr', 'cbe-birr', 'm-pesa', 'm-birr', 'hello-cash', 'amole'
                registered_name VARCHAR(200),

                -- Status & Verification
                is_primary BOOLEAN DEFAULT FALSE,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
                verification_date TIMESTAMP,
                verification_notes TEXT,

                -- Metadata
                nickname VARCHAR(100),  -- User-friendly name like "My CBE Account"
                is_active BOOLEAN DEFAULT TRUE,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create indexes for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id
            ON payment_methods(user_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_payment_methods_primary
            ON payment_methods(user_id, is_primary)
            WHERE is_primary = TRUE;
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_payment_methods_method_type
            ON payment_methods(method_type);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_payment_methods_active
            ON payment_methods(user_id, is_active)
            WHERE is_active = TRUE;
        """)

        conn.commit()
        print("SUCCESS: Created payment_methods table and indexes")

        # Verify table exists
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'payment_methods'
            ORDER BY ordinal_position;
        """)

        columns = cursor.fetchall()
        print("\nTable structure:")
        print("-" * 70)
        for col in columns:
            print(f"  {col[0]:<25} {col[1]:<20} {'NULL' if col[2] == 'YES' else 'NOT NULL':<10} {col[3] or ''}")
        print("-" * 70)
        print(f"Total columns: {len(columns)}")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def rollback_migration():
    """Drop the payment_methods table (for rollback)"""

    db_url = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    try:
        cursor.execute("DROP TABLE IF EXISTS payment_methods CASCADE;")
        conn.commit()
        print("SUCCESS: Dropped payment_methods table")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: Rollback failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--rollback":
        print("Rolling back payment_methods migration...")
        rollback_migration()
    else:
        print("Running payment_methods migration...")
        run_migration()
