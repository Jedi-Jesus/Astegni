"""
Migration: Cleanup admin_profile table and update admin_invitations

Changes:
1. Add is_otp_verified to admin_invitations table
2. Remove otp_code, otp_expires_at, is_otp_verified, last_login from admin_profile
   (OTP data is now in 'otps' table, invitation verification is in 'admin_invitations')

Flow now works as:
1. Invitation sent -> saved to admin_invitations (status=pending) + OTP to otps table
2. User verifies OTP -> admin_invitations.is_otp_verified = TRUE
3. User sets password -> admin_profile created with real data
"""
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def run_migration():
    print("=" * 60)
    print("Migration: Cleanup admin_profile and update admin_invitations")
    print("=" * 60)

    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Step 1: Add is_otp_verified to admin_invitations
        print("\n[1/5] Adding is_otp_verified to admin_invitations...")
        try:
            cursor.execute("""
                ALTER TABLE admin_invitations
                ADD COLUMN IF NOT EXISTS is_otp_verified BOOLEAN DEFAULT FALSE
            """)
            print("  [OK] Added is_otp_verified column")
        except Exception as e:
            print(f"  [SKIP] Column may already exist: {e}")

        # Step 2: Remove otp_code from admin_profile
        print("\n[2/5] Removing otp_code from admin_profile...")
        try:
            cursor.execute("""
                ALTER TABLE admin_profile
                DROP COLUMN IF EXISTS otp_code
            """)
            print("  [OK] Removed otp_code column")
        except Exception as e:
            print(f"  [SKIP] Column may not exist: {e}")

        # Step 3: Remove otp_expires_at from admin_profile
        print("\n[3/5] Removing otp_expires_at from admin_profile...")
        try:
            cursor.execute("""
                ALTER TABLE admin_profile
                DROP COLUMN IF EXISTS otp_expires_at
            """)
            print("  [OK] Removed otp_expires_at column")
        except Exception as e:
            print(f"  [SKIP] Column may not exist: {e}")

        # Step 4: Remove is_otp_verified from admin_profile
        print("\n[4/5] Removing is_otp_verified from admin_profile...")
        try:
            cursor.execute("""
                ALTER TABLE admin_profile
                DROP COLUMN IF EXISTS is_otp_verified
            """)
            print("  [OK] Removed is_otp_verified column")
        except Exception as e:
            print(f"  [SKIP] Column may not exist: {e}")

        # Step 5: Remove last_login from admin_profile
        print("\n[5/5] Removing last_login from admin_profile...")
        try:
            cursor.execute("""
                ALTER TABLE admin_profile
                DROP COLUMN IF EXISTS last_login
            """)
            print("  [OK] Removed last_login column")
        except Exception as e:
            print(f"  [SKIP] Column may not exist: {e}")

        conn.commit()

        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
        print("\nChanges made:")
        print("  - admin_invitations: Added is_otp_verified column")
        print("  - admin_profile: Removed otp_code, otp_expires_at, is_otp_verified, last_login")
        print("\nNew flow:")
        print("  1. Invitation -> admin_invitations (pending) + otps table")
        print("  2. OTP verified -> admin_invitations.is_otp_verified = TRUE")
        print("  3. Password set -> admin_profile created")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
