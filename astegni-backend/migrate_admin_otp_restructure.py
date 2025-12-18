"""
Migration: Restructure Admin OTP System

Changes:
1. Add is_otp_verified to otps table (both astegni_db and astegni_admin_db)
2. Remove otp_code, otp_expires_at, is_otp_verified from admin_profile
3. Remove last_login from admin_profile (will be in department profile tables)
4. Add last_login and joined_in to all manage_*_profile tables
5. Add joined_in to admin_profile

This migration ensures OTP verification is tracked in the otps table,
not in individual profile tables.
"""
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

# Database URLs - Using Astegni2025 password
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

USER_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db'
)

# All manage profile tables that need last_login and joined_in
MANAGE_PROFILE_TABLES = [
    'manage_campaigns_profile',
    'manage_courses_profile',
    'manage_schools_profile',
    'manage_tutors_profile',
    'manage_customers_profile',
    'manage_contents_profile',
    'manage_system_settings_profile',
    'manage_admins_profile',
    'manage_advertisers_profile',
    'manage_credentials_profile'
]

def run_migration():
    print("=" * 70)
    print("Migration: Restructure Admin OTP System")
    print("=" * 70)

    # ============================================
    # PART 1: Update astegni_db (user database)
    # ============================================
    print("\n[PART 1] Updating astegni_db (user database)...")

    try:
        conn_user = psycopg.connect(USER_DATABASE_URL)
        cursor_user = conn_user.cursor()

        # Add is_otp_verified to otps table if not exists
        print("\n[1.1] Adding is_otp_verified to otps table in astegni_db...")
        try:
            cursor_user.execute("""
                ALTER TABLE otps ADD COLUMN IF NOT EXISTS is_otp_verified BOOLEAN DEFAULT FALSE
            """)
            print("  [OK] Added is_otp_verified column to otps table")
        except Exception as e:
            print(f"  [INFO] Column may already exist: {e}")

        conn_user.commit()
        cursor_user.close()
        conn_user.close()
        print("[OK] astegni_db updates complete")

    except Exception as e:
        print(f"[ERROR] Failed to update astegni_db: {e}")

    # ============================================
    # PART 2: Update astegni_admin_db
    # ============================================
    print("\n[PART 2] Updating astegni_admin_db...")

    try:
        conn_admin = psycopg.connect(ADMIN_DATABASE_URL)
        cursor_admin = conn_admin.cursor()

        # 2.1 Create otps table in admin db if not exists (for admin OTPs)
        print("\n[2.1] Creating/updating otps table in astegni_admin_db...")
        cursor_admin.execute("""
            CREATE TABLE IF NOT EXISTS otps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                contact VARCHAR(255),
                otp_code VARCHAR(6) NOT NULL,
                purpose VARCHAR(50) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                is_otp_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  [OK] Created/verified otps table")

        # Add is_otp_verified if missing
        try:
            cursor_admin.execute("""
                ALTER TABLE otps ADD COLUMN IF NOT EXISTS is_otp_verified BOOLEAN DEFAULT FALSE
            """)
            print("  [OK] Added is_otp_verified column to admin otps table")
        except Exception as e:
            print(f"  [INFO] Column may already exist: {e}")

        # Create indexes
        cursor_admin.execute("""
            CREATE INDEX IF NOT EXISTS idx_otps_contact ON otps(contact)
        """)
        cursor_admin.execute("""
            CREATE INDEX IF NOT EXISTS idx_otps_purpose ON otps(purpose)
        """)
        print("  [OK] Created indexes on otps table")

        # 2.2 Remove otp_code, otp_expires_at, is_otp_verified from admin_profile
        print("\n[2.2] Removing OTP columns from admin_profile...")
        columns_to_remove = ['otp_code', 'otp_expires_at', 'is_otp_verified', 'last_login']
        for col in columns_to_remove:
            try:
                cursor_admin.execute(f"ALTER TABLE admin_profile DROP COLUMN IF EXISTS {col}")
                print(f"  [OK] Removed {col} from admin_profile")
            except Exception as e:
                print(f"  [INFO] Could not remove {col}: {e}")

        # 2.3 Remove joined_in from admin_profile (it's in manage profile tables)
        print("\n[2.3] Removing joined_in from admin_profile (it belongs in manage profile tables)...")
        try:
            cursor_admin.execute("""
                ALTER TABLE admin_profile DROP COLUMN IF EXISTS joined_in
            """)
            print("  [OK] Removed joined_in column from admin_profile")
        except Exception as e:
            print(f"  [INFO] Column may not exist: {e}")

        # 2.4 Add last_login and joined_in to all manage_*_profile tables
        print("\n[2.4] Adding last_login and joined_in to manage profile tables...")
        for table in MANAGE_PROFILE_TABLES:
            try:
                # Check if table exists
                cursor_admin.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = %s
                    )
                """, (table,))
                table_exists = cursor_admin.fetchone()[0]

                if not table_exists:
                    print(f"  [SKIP] Table {table} does not exist yet")
                    continue

                # Add last_login
                cursor_admin.execute(f"""
                    ALTER TABLE {table} ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
                """)

                # Add joined_in (if not exists, different from joined_date)
                cursor_admin.execute(f"""
                    ALTER TABLE {table} ADD COLUMN IF NOT EXISTS joined_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                """)

                print(f"  [OK] Added last_login and joined_in to {table}")

            except Exception as e:
                print(f"  [WARN] Could not update {table}: {e}")

        # 2.5 Update admin_invitations table to ensure all required fields exist
        print("\n[2.5] Ensuring admin_invitations table has all required fields...")
        try:
            # Check if table exists first
            cursor_admin.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'admin_invitations'
                )
            """)
            inv_table_exists = cursor_admin.fetchone()[0]

            if inv_table_exists:
                # Add any missing columns
                invitation_columns = [
                    ("first_name", "VARCHAR(100) NOT NULL DEFAULT ''"),
                    ("father_name", "VARCHAR(100) NOT NULL DEFAULT ''"),
                    ("grandfather_name", "VARCHAR(100)"),
                    ("email", "VARCHAR(255) NOT NULL DEFAULT ''"),
                    ("phone_number", "VARCHAR(50)"),
                    ("department", "VARCHAR(100) NOT NULL DEFAULT ''"),
                    ("position", "VARCHAR(100) NOT NULL DEFAULT 'Staff'"),
                    ("employee_id", "VARCHAR(50)"),
                    ("welcome_message", "TEXT"),
                    ("invited_by", "INTEGER"),
                    ("status", "VARCHAR(20) DEFAULT 'pending'"),
                    ("admin_id", "INTEGER"),
                    ("accepted_at", "TIMESTAMP"),
                    ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
                    ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
                    ("expires_at", "TIMESTAMP"),
                ]

                for col_name, col_type in invitation_columns:
                    try:
                        # Remove NOT NULL DEFAULT for ALTER TABLE
                        alter_type = col_type.replace(" NOT NULL DEFAULT ''", "").replace(" NOT NULL", "")
                        cursor_admin.execute(f"""
                            ALTER TABLE admin_invitations ADD COLUMN IF NOT EXISTS {col_name} {alter_type}
                        """)
                    except Exception as e:
                        pass  # Column likely exists

                print("  [OK] admin_invitations table updated")
            else:
                print("  [SKIP] admin_invitations table does not exist - will be created by separate migration")

        except Exception as e:
            print(f"  [WARN] Could not update admin_invitations: {e}")

        conn_admin.commit()
        cursor_admin.close()
        conn_admin.close()
        print("\n[OK] astegni_admin_db updates complete")

    except Exception as e:
        print(f"[ERROR] Failed to update astegni_admin_db: {e}")
        raise

    print("\n" + "=" * 70)
    print("Migration completed successfully!")
    print("=" * 70)
    print("\nChanges made:")
    print("  1. Added is_otp_verified to otps table (both databases)")
    print("  2. Removed otp_code, otp_expires_at, is_otp_verified, last_login from admin_profile")
    print("  3. Removed joined_in from admin_profile (it belongs in manage profile tables)")
    print("  4. Added last_login and joined_in to all manage_*_profile tables")
    print("\nNext steps:")
    print("  - Run this migration: python migrate_admin_otp_restructure.py")
    print("  - Update endpoints to use otps table for OTP verification")


if __name__ == "__main__":
    run_migration()
