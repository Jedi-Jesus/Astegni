"""
Migration Script: Create manage_admins_profile table

This script creates the manage_admins_profile table in astegni_admin_db
Structure matches manage_courses_profile and manage_credentials_profile

Run: python migrate_manage_admins_profile.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def get_connection():
    """Get admin database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL)

def create_manage_admins_profile():
    """Create manage_admins_profile table"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("=" * 60)
        print("CREATING MANAGE_ADMINS_PROFILE TABLE")
        print("=" * 60)

        # Check if table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'manage_admins_profile'
            )
        """)

        if cursor.fetchone()[0]:
            print("[SKIP] Table manage_admins_profile already exists")
        else:
            cursor.execute("""
                CREATE TABLE manage_admins_profile (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER REFERENCES admin_profile(id),
                    username VARCHAR(100),
                    bio TEXT,
                    quote TEXT,
                    location VARCHAR(255),
                    cover_image TEXT,
                    profile_image TEXT,
                    languages JSONB DEFAULT '[]'::jsonb,
                    hero_title VARCHAR(255),
                    hero_subtitle VARCHAR(255),
                    position VARCHAR(100) DEFAULT 'Admin Manager',
                    joined_date DATE DEFAULT CURRENT_DATE,
                    rating NUMERIC DEFAULT 0.0,
                    total_reviews INTEGER DEFAULT 0,
                    badges JSONB DEFAULT '[]'::jsonb,

                    -- Admin management specific stats
                    admins_invited INTEGER DEFAULT 0,
                    admins_approved INTEGER DEFAULT 0,
                    admins_rejected INTEGER DEFAULT 0,
                    admins_suspended INTEGER DEFAULT 0,
                    pending_invitations INTEGER DEFAULT 0,
                    roles_assigned INTEGER DEFAULT 0,
                    avg_onboarding_time_hours INTEGER DEFAULT 24,

                    -- Permissions
                    permissions JSONB DEFAULT '{"can_invite": false, "can_approve": false, "can_reject": false, "can_suspend": false, "can_assign_roles": false}'::jsonb,

                    -- Timestamps
                    employee_id VARCHAR(50),
                    joined_in TIMESTAMP WITHOUT TIME ZONE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
                )
            """)
            print("[OK] Created table manage_admins_profile")

        conn.commit()
        print("\n" + "=" * 60)
        print("[OK] manage_admins_profile table ready!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Failed to create manage_admins_profile: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def verify_table():
    """Verify table structure"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("\n" + "=" * 60)
        print("VERIFYING TABLE STRUCTURE")
        print("=" * 60)

        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'manage_admins_profile'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print("\nColumns in manage_admins_profile:")
        for col in columns:
            nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
            print(f"  - {col[0]}: {col[1]} ({nullable})")

        print("\n" + "=" * 60)
        print("[OK] Verification complete!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("\nStarting manage_admins_profile Table Migration...\n")

    # Step 1: Create table
    create_manage_admins_profile()

    # Step 2: Verify
    verify_table()

    print("\nMigration completed successfully!\n")
