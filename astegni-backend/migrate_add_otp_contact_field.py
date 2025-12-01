"""
Migration: Add contact field to OTP table and make user_id nullable
Purpose: Support registration OTPs before user account is created
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
    return psycopg.connect(database_url)

def run_migration():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print("[*] Starting OTP table migration...")

        # Make user_id nullable
        cursor.execute("""
            ALTER TABLE otps
            ALTER COLUMN user_id DROP NOT NULL;
        """)
        print("[OK] Made user_id nullable")

        # Add contact column if it doesn't exist
        cursor.execute("""
            ALTER TABLE otps
            ADD COLUMN IF NOT EXISTS contact VARCHAR(255);
        """)
        print("[OK] Added contact column")

        # Add index on contact column for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_otps_contact
            ON otps(contact);
        """)
        print("[OK] Added index on contact column")

        conn.commit()
        print("[OK] Migration completed successfully!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    run_migration()
