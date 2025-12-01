"""
Add OTP code and expiration tracking to admin_profile table
This allows admin invitations to use OTP with 7-day expiration
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_add_admin_otp_expiry():
    """Add otp_code and otp_expires_at columns to admin_profile table"""

    database_url = os.getenv('DATABASE_URL')

    try:
        conn = psycopg.connect(database_url)
        cursor = conn.cursor()

        print("Adding OTP expiration fields to admin_profile table...")

        # Add otp_code column (nullable, for pending invitations)
        cursor.execute("""
            ALTER TABLE admin_profile
            ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
        """)

        # Add otp_expires_at column (nullable)
        cursor.execute("""
            ALTER TABLE admin_profile
            ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
        """)

        # Add is_otp_verified column to track if admin has verified OTP
        cursor.execute("""
            ALTER TABLE admin_profile
            ADD COLUMN IF NOT EXISTS is_otp_verified BOOLEAN DEFAULT FALSE;
        """)

        conn.commit()
        print("[SUCCESS] Added otp_code, otp_expires_at, and is_otp_verified columns")

        # Verify the changes
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'admin_profile'
            AND column_name IN ('otp_code', 'otp_expires_at', 'is_otp_verified')
            ORDER BY column_name;
        """)

        print("\nVerifying new columns:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (nullable: {row[2]})")

        cursor.close()
        conn.close()

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nNow admin invitations will:")
        print("  - Store OTP in otp_code field")
        print("  - Track expiration in otp_expires_at (7 days)")
        print("  - Mark as verified when OTP is confirmed")

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        raise

if __name__ == "__main__":
    migrate_add_admin_otp_expiry()
