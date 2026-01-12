"""
Migration: Rename contact_email/contact_phone to company_email/company_phone as JSON arrays

This migration:
1. Renames contact_email -> company_email (converts to JSONB array)
2. Adds company_phone as JSONB array (contact_phone may not exist)
3. Preserves existing data by converting single values to arrays
"""

import psycopg2
import json

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Starting migration: Rename contact columns to company columns (JSON arrays)...")

        # Check existing columns
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'advertiser_profiles'
        """)
        existing_columns = {row[0]: row[1] for row in cur.fetchall()}
        print(f"Existing columns: {list(existing_columns.keys())}")

        # Step 1: Handle contact_email -> company_email
        if 'contact_email' in existing_columns:
            print("\n[1] Converting contact_email to company_email (JSONB array)...")

            # First, get existing data
            cur.execute("SELECT id, contact_email FROM advertiser_profiles WHERE contact_email IS NOT NULL")
            rows = cur.fetchall()

            # Add new column if it doesn't exist
            if 'company_email' not in existing_columns:
                cur.execute("ALTER TABLE advertiser_profiles ADD COLUMN company_email JSONB DEFAULT '[]'::jsonb")
                print("  [OK] Added company_email column (JSONB)")

            # Migrate data - convert single email to array
            for row_id, email in rows:
                if email:
                    email_array = json.dumps([email])
                    cur.execute(
                        "UPDATE advertiser_profiles SET company_email = %s WHERE id = %s",
                        (email_array, row_id)
                    )
            print(f"  [OK] Migrated {len(rows)} email records to array format")

            # Drop old column
            cur.execute("ALTER TABLE advertiser_profiles DROP COLUMN contact_email")
            print("  [OK] Dropped old contact_email column")

        elif 'company_email' not in existing_columns:
            # Neither exists, create new
            cur.execute("ALTER TABLE advertiser_profiles ADD COLUMN company_email JSONB DEFAULT '[]'::jsonb")
            print("[OK] Added company_email column (JSONB)")
        else:
            print("[SKIP] company_email already exists")

        # Step 2: Handle contact_phone -> company_phone
        if 'contact_phone' in existing_columns:
            print("\n[2] Converting contact_phone to company_phone (JSONB array)...")

            # First, get existing data
            cur.execute("SELECT id, contact_phone FROM advertiser_profiles WHERE contact_phone IS NOT NULL")
            rows = cur.fetchall()

            # Add new column if it doesn't exist
            if 'company_phone' not in existing_columns:
                cur.execute("ALTER TABLE advertiser_profiles ADD COLUMN company_phone JSONB DEFAULT '[]'::jsonb")
                print("  [OK] Added company_phone column (JSONB)")

            # Migrate data - convert single phone to array
            for row_id, phone in rows:
                if phone:
                    phone_array = json.dumps([phone])
                    cur.execute(
                        "UPDATE advertiser_profiles SET company_phone = %s WHERE id = %s",
                        (phone_array, row_id)
                    )
            print(f"  [OK] Migrated {len(rows)} phone records to array format")

            # Drop old column
            cur.execute("ALTER TABLE advertiser_profiles DROP COLUMN contact_phone")
            print("  [OK] Dropped old contact_phone column")

        elif 'company_phone' not in existing_columns:
            # Neither exists, create new
            cur.execute("ALTER TABLE advertiser_profiles ADD COLUMN company_phone JSONB DEFAULT '[]'::jsonb")
            print("[OK] Added company_phone column (JSONB)")
        else:
            print("[SKIP] company_phone already exists")

        conn.commit()
        print("\n[OK] Migration completed successfully!")

        # Show final table structure
        print("\nUpdated advertiser_profiles columns (contact/company related):")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'advertiser_profiles'
            AND column_name LIKE '%email%' OR column_name LIKE '%phone%'
            ORDER BY ordinal_position
        """)
        for row in cur.fetchall():
            print(f"   - {row[0]}: {row[1]}")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
