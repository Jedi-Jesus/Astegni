"""
Migration: Add date_of_birth (dob) field to users table
=======================================================

This migration adds a required date_of_birth field to the users table.
For existing users, we set a placeholder date that they must update.

Run: python migrate_add_dob_to_users.py
"""

import psycopg2
from datetime import date

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "database": "astegni_user_db",
    "user": "astegni_user",
    "password": "Astegni2025"
}

def run_migration():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        print("=" * 60)
        print("Migration: Add date_of_birth to users table")
        print("=" * 60)

        # Check if column already exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'date_of_birth'
        """)

        if cur.fetchone():
            print("[OK] Column 'date_of_birth' already exists in users table")
        else:
            # Step 1: Add the column as nullable first
            print("\n1. Adding date_of_birth column (nullable)...")
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN date_of_birth DATE
            """)
            print("   [OK] Column added")

            # Step 2: Set a placeholder date for existing users (1900-01-01 means "needs update")
            print("\n2. Setting placeholder date for existing users...")
            cur.execute("""
                UPDATE users
                SET date_of_birth = '1900-01-01'
                WHERE date_of_birth IS NULL
            """)
            updated_count = cur.rowcount
            print(f"   [OK] Updated {updated_count} existing users with placeholder date")

            # Step 3: Make the column NOT NULL
            print("\n3. Making date_of_birth column NOT NULL...")
            cur.execute("""
                ALTER TABLE users
                ALTER COLUMN date_of_birth SET NOT NULL
            """)
            print("   [OK] Column is now NOT NULL")

            # Step 4: Add a check constraint for reasonable dates
            print("\n4. Adding check constraint for valid dates...")
            try:
                cur.execute("""
                    ALTER TABLE users
                    ADD CONSTRAINT users_dob_valid
                    CHECK (date_of_birth >= '1900-01-01' AND date_of_birth <= CURRENT_DATE)
                """)
                print("   [OK] Check constraint added")
            except psycopg2.errors.DuplicateObject:
                print("   [WARN] Check constraint already exists")
                conn.rollback()
                conn = psycopg2.connect(**DB_CONFIG)
                cur = conn.cursor()

        conn.commit()

        # Verify the change
        print("\n" + "=" * 60)
        print("Verification")
        print("=" * 60)

        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'date_of_birth'
        """)
        result = cur.fetchone()
        if result:
            print(f"Column: {result[0]}")
            print(f"Type: {result[1]}")
            print(f"Nullable: {result[2]}")
            print(f"Default: {result[3]}")

        # Count users needing DOB update
        cur.execute("""
            SELECT COUNT(*) FROM users WHERE date_of_birth = '1900-01-01'
        """)
        placeholder_count = cur.fetchone()[0]
        if placeholder_count > 0:
            print(f"\n[WARN] {placeholder_count} users have placeholder DOB and need to update their profile")

        print("\n[OK] Migration completed successfully!")
        print("\nNote: Users with DOB = 1900-01-01 should be prompted to update their date of birth.")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
