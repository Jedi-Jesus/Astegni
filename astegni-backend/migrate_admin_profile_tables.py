"""
Migration Script: Update Admin Profile Tables with Complete Schema

This script adds missing columns to all manage_*_profile tables in astegni_admin_db:
- manage_courses_profile
- manage_schools_profile
- manage_campaigns_profile
- manage_contents_profile
- manage_customers_profile
- manage_system_settings_profile
- manage_tutors_profile (if exists)

Also creates manage_credentials_profile table.

Columns to add to each profile table:
- bio, quote, location, cover_image, profile_image
- languages, hero_title, hero_subtitle

Run: python migrate_admin_profile_tables.py
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

def add_columns_if_not_exists(cursor, table_name, columns):
    """Add columns to a table if they don't exist"""
    for column_name, column_def in columns.items():
        try:
            cursor.execute(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
            """, (table_name, column_name))

            if not cursor.fetchone():
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}")
                print(f"  [OK] Added column '{column_name}' to {table_name}")
            else:
                print(f"  [SKIP] Column '{column_name}' already exists in {table_name}")
        except Exception as e:
            print(f"  [ERROR] Error adding column '{column_name}' to {table_name}: {e}")

def migrate_profile_tables():
    """Add missing columns to all profile tables"""

    # Common columns to add to ALL profile tables
    common_columns = {
        'bio': "TEXT",
        'quote': "TEXT",
        'location': "VARCHAR(255)",
        'cover_image': "TEXT",
        'profile_image': "TEXT",
        'languages': "JSONB DEFAULT '[]'::jsonb",
        'hero_title': "VARCHAR(255)",
        'hero_subtitle': "VARCHAR(255)",
    }

    # List of profile tables to update
    profile_tables = [
        'manage_courses_profile',
        'manage_schools_profile',
        'manage_campaigns_profile',
        'manage_contents_profile',
        'manage_customers_profile',
        'manage_system_settings_profile',
        'manage_tutors_profile',
    ]

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("=" * 60)
        print("MIGRATING ADMIN PROFILE TABLES")
        print("=" * 60)

        for table in profile_tables:
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if cursor.fetchone()[0]:
                print(f"\n[TABLE] Updating {table}...")
                add_columns_if_not_exists(cursor, table, common_columns)
            else:
                print(f"\n[WARN] Table {table} does not exist, skipping...")

        # Fix manage_contents_profile if it has profile_id instead of id
        print(f"\n[TABLE] Checking manage_contents_profile for 'id' column...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'manage_contents_profile' AND column_name = 'id'
        """)
        if not cursor.fetchone():
            # Check if profile_id exists
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'manage_contents_profile' AND column_name = 'profile_id'
            """)
            if cursor.fetchone():
                cursor.execute("ALTER TABLE manage_contents_profile RENAME COLUMN profile_id TO id")
                print(f"  [OK] Renamed 'profile_id' to 'id' in manage_contents_profile")

        conn.commit()
        print("\n" + "=" * 60)
        print("[OK] Profile tables migration completed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def create_manage_credentials_profile():
    """Create manage_credentials_profile table"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("\n" + "=" * 60)
        print("CREATING MANAGE_CREDENTIALS_PROFILE TABLE")
        print("=" * 60)

        # Check if table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'manage_credentials_profile'
            )
        """)

        if cursor.fetchone()[0]:
            print("[SKIP] Table manage_credentials_profile already exists")
        else:
            cursor.execute("""
                CREATE TABLE manage_credentials_profile (
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
                    position VARCHAR(100) DEFAULT 'Staff',
                    joined_date DATE DEFAULT CURRENT_DATE,
                    rating NUMERIC DEFAULT 0.0,
                    total_reviews INTEGER DEFAULT 0,
                    badges JSONB DEFAULT '[]'::jsonb,

                    -- Credentials-specific stats
                    credentials_verified INTEGER DEFAULT 0,
                    credentials_rejected INTEGER DEFAULT 0,
                    credentials_pending INTEGER DEFAULT 0,
                    credentials_flagged INTEGER DEFAULT 0,
                    avg_verification_time_hours INTEGER DEFAULT 24,
                    verification_accuracy_rate NUMERIC DEFAULT 0.0,

                    -- Permissions
                    permissions JSONB DEFAULT '{"can_verify": false, "can_reject": false, "can_flag": false}'::jsonb,

                    -- Timestamps
                    employee_id VARCHAR(50),
                    joined_in TIMESTAMP WITHOUT TIME ZONE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
                )
            """)
            print("[OK] Created table manage_credentials_profile")

        conn.commit()
        print("\n" + "=" * 60)
        print("[OK] manage_credentials_profile table ready!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Failed to create manage_credentials_profile: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def verify_migration():
    """Verify all tables have the required columns"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("\n" + "=" * 60)
        print("VERIFYING MIGRATION")
        print("=" * 60)

        profile_tables = [
            'manage_courses_profile',
            'manage_schools_profile',
            'manage_campaigns_profile',
            'manage_contents_profile',
            'manage_customers_profile',
            'manage_system_settings_profile',
            'manage_tutors_profile',
            'manage_credentials_profile',
        ]

        required_columns = ['bio', 'quote', 'location', 'cover_image', 'profile_image', 'languages', 'hero_title', 'hero_subtitle']

        for table in profile_tables:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if not cursor.fetchone()[0]:
                print(f"\n[WARN] Table {table} does not exist")
                continue

            print(f"\n[TABLE] {table}:")

            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = %s
            """, (table,))

            existing_columns = [row[0] for row in cursor.fetchall()]

            all_present = True
            for col in required_columns:
                if col in existing_columns:
                    print(f"  [OK] {col}")
                else:
                    print(f"  [MISSING] {col}")
                    all_present = False

            if all_present:
                print(f"  -> All required columns present!")

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
    print("\nStarting Admin Profile Tables Migration...\n")

    # Step 1: Add missing columns to existing profile tables
    migrate_profile_tables()

    # Step 2: Create manage_credentials_profile table
    create_manage_credentials_profile()

    # Step 3: Verify migration
    verify_migration()

    print("\nMigration completed successfully!\n")
