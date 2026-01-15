"""
Migration: Add is_verified to users table and sync from profile tables

This migration consolidates verification logic by:
1. Adding users.is_verified column (boolean, default false)
2. Adding users.verified_at column (timestamp, nullable)
3. Adding users.verification_method column (varchar, nullable)
4. Syncing existing verification data from profile tables
5. Keeping profile.is_verified for backward compatibility (will deprecate later)

IMPORTANT: This is a NON-DESTRUCTIVE migration.
- Does NOT remove is_verified from profile tables (for backward compatibility)
- Does NOT remove kyc_verified (for backward compatibility)
- Adds new is_verified as the canonical verification field

Run this script once to migrate your database.
"""

import psycopg
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def run_migration():
    """Run the migration to add is_verified to users table"""

    print("=" * 80)
    print("MIGRATION: Add is_verified to users table")
    print("=" * 80)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Step 1: Add new columns to users table
        print("\n[1/5] Adding new columns to users table...")

        # Check if columns already exist
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('is_verified', 'verified_at', 'verification_method')
        """)
        existing_columns = [row[0] for row in cur.fetchall()]

        if 'is_verified' not in existing_columns:
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL
            """)
            print("   [OK] Added users.is_verified (boolean, default false)")
        else:
            print("   [SKIP] users.is_verified already exists, skipping...")

        if 'verified_at' not in existing_columns:
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN verified_at TIMESTAMP
            """)
            print("   [OK] Added users.verified_at (timestamp, nullable)")
        else:
            print("   [SKIP] users.verified_at already exists, skipping...")

        if 'verification_method' not in existing_columns:
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN verification_method VARCHAR(20)
            """)
            print("   [OK] Added users.verification_method (varchar, nullable)")
        else:
            print("   [SKIP] users.verification_method already exists, skipping...")

        conn.commit()

        # Step 2: Sync from kyc_verified
        print("\n[2/5] Syncing verification from kyc_verified...")
        cur.execute("""
            UPDATE users
            SET
                is_verified = TRUE,
                verified_at = kyc_verified_at,
                verification_method = 'kyc'
            WHERE kyc_verified = TRUE
            AND is_verified = FALSE
        """)
        kyc_synced = cur.rowcount
        print(f"   [OK] Synced {kyc_synced} users from kyc_verified = true")
        conn.commit()

        # Step 3: Sync from tutor_profiles.is_verified
        print("\n[3/5] Syncing verification from tutor_profiles...")
        cur.execute("""
            UPDATE users
            SET
                is_verified = TRUE,
                verified_at = tp.verified_at,
                verification_method = COALESCE(users.verification_method, 'profile_tutor')
            FROM tutor_profiles tp
            WHERE users.id = tp.user_id
            AND tp.is_verified = TRUE
            AND users.is_verified = FALSE
        """)
        tutor_synced = cur.rowcount
        print(f"   [OK] Synced {tutor_synced} users from tutor_profiles.is_verified = true")
        conn.commit()

        # Step 4: Sync from parent_profiles.is_verified (no verified_at in parent_profiles)
        print("\n[4/5] Syncing verification from parent_profiles...")
        cur.execute("""
            UPDATE users
            SET
                is_verified = TRUE,
                verification_method = COALESCE(users.verification_method, 'profile_parent')
            FROM parent_profiles pp
            WHERE users.id = pp.user_id
            AND pp.is_verified = TRUE
            AND users.is_verified = FALSE
        """)
        parent_synced = cur.rowcount
        print(f"   [OK] Synced {parent_synced} users from parent_profiles.is_verified = true")
        conn.commit()

        # Step 5: Sync from advertiser_profiles.is_verified (no verified_at in advertiser_profiles)
        print("\n[5/5] Syncing verification from advertiser_profiles...")
        cur.execute("""
            UPDATE users
            SET
                is_verified = TRUE,
                verification_method = COALESCE(users.verification_method, 'profile_advertiser')
            FROM advertiser_profiles ap
            WHERE users.id = ap.user_id
            AND ap.is_verified = TRUE
            AND users.is_verified = FALSE
        """)
        advertiser_synced = cur.rowcount
        print(f"   [OK] Synced {advertiser_synced} users from advertiser_profiles.is_verified = true")
        conn.commit()

        # Summary
        print("\n" + "=" * 80)
        print("MIGRATION SUMMARY")
        print("=" * 80)

        cur.execute("SELECT COUNT(*) FROM users WHERE is_verified = TRUE")
        total_verified = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]

        print(f"Total users: {total_users}")
        print(f"Verified users: {total_verified}")
        print(f"\nBreakdown:")
        print(f"  - From KYC: {kyc_synced}")
        print(f"  - From tutor profiles: {tutor_synced}")
        print(f"  - From parent profiles: {parent_synced}")
        print(f"  - From advertiser profiles: {advertiser_synced}")

        # Show verification methods distribution
        print(f"\nVerification methods:")
        cur.execute("""
            SELECT verification_method, COUNT(*)
            FROM users
            WHERE is_verified = TRUE
            GROUP BY verification_method
            ORDER BY COUNT(*) DESC
        """)
        for method, count in cur.fetchall():
            print(f"  - {method or 'NULL'}: {count}")

        print("\n" + "=" * 80)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\nNext steps:")
        print("1. Update models.py to include is_verified field")
        print("2. Update backend code to use users.is_verified")
        print("3. Update frontend code to check users.is_verified")
        print("4. Test the verification flow end-to-end")
        print("5. (Optional) Deprecate profile.is_verified in future migration")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("\nWARNING: This migration will modify the users table structure.")
    print("    Make sure you have a database backup before proceeding.")

    response = input("\nDo you want to continue? (yes/no): ")

    if response.lower() in ['yes', 'y']:
        run_migration()
    else:
        print("\nMigration cancelled by user.")
