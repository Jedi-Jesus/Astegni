"""
Migration: Consolidate Verification and Suspension to Users Table

This migration moves all verification and suspension columns from profile tables
to the users table, creating a single source of truth for user status.

Steps:
1. Add missing columns to users table
2. Migrate existing data from profile tables to users table
3. Drop columns from profile tables

Author: Claude Sonnet 4.5
Date: 2026-01-15
"""

import sys
import psycopg
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def get_connection():
    """Get database connection"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)


def add_columns_to_users(conn):
    """Step 1: Add missing columns to users table"""
    print("\n[Step 1] Adding missing columns to users table...")

    cur = conn.cursor()

    # Add columns if they don't exist
    columns_to_add = [
        ("verification_status", "VARCHAR(20)", "NULL"),  # 'pending', 'approved', 'rejected'
        ("rejected_at", "TIMESTAMP", "NULL"),
        ("suspended_at", "TIMESTAMP", "NULL"),
        ("suspension_reason", "TEXT", "NULL"),
        ("suspended_by", "INTEGER", "NULL"),  # FK to admin_users.id
        ("is_suspended", "BOOLEAN", "DEFAULT FALSE"),
    ]

    for col_name, col_type, col_default in columns_to_add:
        try:
            if col_default and col_default != "NULL":
                cur.execute(f"""
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type} {col_default}
                """)
            else:
                cur.execute(f"""
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                """)
            print(f"  OK Added column: {col_name}")
        except Exception as e:
            print(f"  X Error adding {col_name}: {e}")
            conn.rollback()
            return False

    conn.commit()
    print("[Step 1] OK Successfully added columns to users table")
    return True


def migrate_tutor_profiles_data(conn):
    """Step 2a: Migrate data from tutor_profiles to users"""
    print("\n[Step 2a] Migrating data from tutor_profiles to users...")

    cur = conn.cursor()

    # Get tutor profiles with verification/suspension data
    cur.execute("""
        SELECT
            tp.user_id,
            tp.is_verified,
            tp.verified_at,
            tp.verification_status,
            tp.rejected_at,
            tp.suspended_at,
            tp.suspension_reason,
            tp.suspended_by,
            tp.is_suspended
        FROM tutor_profiles tp
        WHERE tp.is_verified IS NOT NULL
           OR tp.verification_status IS NOT NULL
           OR tp.is_suspended IS NOT NULL
    """)

    tutors = cur.fetchall()
    print(f"  Found {len(tutors)} tutor profiles with data to migrate")

    migrated = 0
    for tutor in tutors:
        user_id, is_verified, verified_at, verification_status, rejected_at, suspended_at, suspension_reason, suspended_by, is_suspended = tutor

        try:
            # Only update if users table doesn't already have the data
            cur.execute("""
                UPDATE users
                SET
                    is_verified = COALESCE(users.is_verified, %s),
                    verified_at = COALESCE(users.verified_at, %s),
                    verification_status = COALESCE(users.verification_status, %s),
                    rejected_at = COALESCE(users.rejected_at, %s),
                    suspended_at = COALESCE(users.suspended_at, %s),
                    suspension_reason = COALESCE(users.suspension_reason, %s),
                    suspended_by = COALESCE(users.suspended_by, %s),
                    is_suspended = COALESCE(users.is_suspended, %s)
                WHERE id = %s
            """, (is_verified, verified_at, verification_status, rejected_at, suspended_at, suspension_reason, suspended_by, is_suspended, user_id))

            migrated += 1
        except Exception as e:
            print(f"  X Error migrating user {user_id}: {e}")

    conn.commit()
    print(f"[Step 2a] OK Migrated {migrated} tutor profiles")
    return True


def migrate_advertiser_profiles_data(conn):
    """Step 2b: Migrate data from advertiser_profiles to users"""
    print("\n[Step 2b] Migrating data from advertiser_profiles to users...")

    cur = conn.cursor()

    # Get advertiser profiles with verification data
    cur.execute("""
        SELECT
            ap.user_id,
            ap.is_verified,
            ap.verification_status
        FROM advertiser_profiles ap
        WHERE ap.is_verified IS NOT NULL
           OR ap.verification_status IS NOT NULL
    """)

    advertisers = cur.fetchall()
    print(f"  Found {len(advertisers)} advertiser profiles with data to migrate")

    migrated = 0
    for advertiser in advertisers:
        user_id, is_verified, verification_status = advertiser

        try:
            cur.execute("""
                UPDATE users
                SET
                    is_verified = COALESCE(users.is_verified, %s),
                    verification_status = COALESCE(users.verification_status, %s)
                WHERE id = %s
            """, (is_verified, verification_status, user_id))

            migrated += 1
        except Exception as e:
            print(f"  X Error migrating user {user_id}: {e}")

    conn.commit()
    print(f"[Step 2b] OK Migrated {migrated} advertiser profiles")
    return True


def migrate_parent_profiles_data(conn):
    """Step 2c: Migrate data from parent_profiles to users"""
    print("\n[Step 2c] Migrating data from parent_profiles to users...")

    cur = conn.cursor()

    # Get parent profiles with verification data
    cur.execute("""
        SELECT
            pp.user_id,
            pp.is_verified
        FROM parent_profiles pp
        WHERE pp.is_verified IS NOT NULL
    """)

    parents = cur.fetchall()
    print(f"  Found {len(parents)} parent profiles with data to migrate")

    migrated = 0
    for parent in parents:
        user_id, is_verified = parent

        try:
            cur.execute("""
                UPDATE users
                SET is_verified = COALESCE(users.is_verified, %s)
                WHERE id = %s
            """, (is_verified, user_id))

            migrated += 1
        except Exception as e:
            print(f"  X Error migrating user {user_id}: {e}")

    conn.commit()
    print(f"[Step 2c] OK Migrated {migrated} parent profiles")
    return True


def drop_columns_from_profiles(conn):
    """Step 3: Drop verification/suspension columns from profile tables"""
    print("\n[Step 3] Dropping columns from profile tables...")

    cur = conn.cursor()

    tables_and_columns = {
        'tutor_profiles': [
            'is_verified', 'verified_at', 'verification_status', 'rejected_at',
            'suspended_at', 'suspension_reason', 'suspended_by', 'is_suspended'
        ],
        'student_profiles': [
            'is_verified', 'verified_at'
        ],
        'parent_profiles': [
            'is_verified', 'verified_at'
        ],
        'advertiser_profiles': [
            'is_verified', 'verified_at', 'verification_status'
        ]
    }

    for table, columns in tables_and_columns.items():
        print(f"\n  Dropping columns from {table}:")
        for col in columns:
            try:
                # Check if column exists first
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = %s AND column_name = %s
                """, (table, col))

                if cur.fetchone():
                    cur.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col}")
                    print(f"    OK Dropped: {col}")
                else:
                    print(f"    - Skipped: {col} (doesn't exist)")
            except Exception as e:
                print(f"    X Error dropping {col}: {e}")
                conn.rollback()
                return False

    conn.commit()
    print("\n[Step 3] OK Successfully dropped columns from profile tables")
    return True


def verify_migration(conn):
    """Step 4: Verify the migration was successful"""
    print("\n[Step 4] Verifying migration...")

    cur = conn.cursor()

    # Check users table has all required columns
    print("\n  Checking users table columns:")
    required_columns = [
        'is_verified', 'verified_at', 'verification_method', 'verification_status',
        'rejected_at', 'suspended_at', 'suspension_reason', 'suspended_by', 'is_suspended'
    ]

    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY column_name
    """)

    user_columns = [row[0] for row in cur.fetchall()]

    for col in required_columns:
        if col in user_columns:
            print(f"    OK {col}")
        else:
            print(f"    X {col} MISSING!")
            return False

    # Check profile tables don't have verification columns
    print("\n  Checking profile tables (should have NO verification columns):")

    profile_tables = ['tutor_profiles', 'student_profiles', 'parent_profiles', 'advertiser_profiles']
    verification_columns = [
        'is_verified', 'verified_at', 'verification_method', 'verification_status',
        'rejected_at', 'suspended_at', 'suspension_reason', 'suspended_by', 'is_suspended'
    ]

    all_clean = True
    for table in profile_tables:
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
              AND column_name = ANY(%s)
        """, (table, verification_columns))

        remaining_cols = cur.fetchall()
        if remaining_cols:
            print(f"    X {table} still has: {[col[0] for col in remaining_cols]}")
            all_clean = False
        else:
            print(f"    OK {table} (clean)")

    if not all_clean:
        return False

    # Count verified users
    cur.execute("SELECT COUNT(*) FROM users WHERE is_verified = TRUE")
    verified_count = cur.fetchone()[0]

    print(f"\n  Statistics:")
    print(f"    - Verified users in users table: {verified_count}")

    print("\n[Step 4] OK Migration verified successfully!")
    return True


def main():
    """Main migration function"""
    print("=" * 80)
    print("MIGRATION: Consolidate Verification/Suspension to Users Table")
    print("=" * 80)
    print("\nThis migration will:")
    print("  1. Add missing columns to users table")
    print("  2. Migrate data from profile tables to users table")
    print("  3. Drop verification/suspension columns from profile tables")
    print("\nWARNING: This is a destructive migration. Make sure you have a backup!")
    print("\nColumns to be moved:")
    print("  - is_verified, verified_at, verification_method, verification_status")
    print("  - rejected_at, suspended_at, suspension_reason, suspended_by, is_suspended")

    response = input("\nDo you want to continue? (yes/no): ")

    if response.lower() != 'yes':
        print("\nMigration cancelled.")
        sys.exit(0)

    print("\nStarting migration...")
    print("-" * 80)

    conn = get_connection()

    try:
        # Step 1: Add columns to users table
        if not add_columns_to_users(conn):
            print("\nX Migration failed at Step 1")
            sys.exit(1)

        # Step 2: Migrate data from profile tables
        if not migrate_tutor_profiles_data(conn):
            print("\nX Migration failed at Step 2a")
            sys.exit(1)

        if not migrate_advertiser_profiles_data(conn):
            print("\nX Migration failed at Step 2b")
            sys.exit(1)

        if not migrate_parent_profiles_data(conn):
            print("\nX Migration failed at Step 2c")
            sys.exit(1)

        # Step 3: Drop columns from profile tables
        if not drop_columns_from_profiles(conn):
            print("\nX Migration failed at Step 3")
            sys.exit(1)

        # Step 4: Verify migration
        if not verify_migration(conn):
            print("\nX Migration verification failed")
            sys.exit(1)

        print("\n" + "=" * 80)
        print("OK MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\nNext steps:")
        print("  1. Run this migration on production server")
        print("  2. Update backend code to use users.is_verified instead of profile.is_verified")
        print("  3. Update models.py to remove verification columns from profile models")
        print("  4. Test verification and suspension functionality")

    except Exception as e:
        print(f"\nX Migration failed with error: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
