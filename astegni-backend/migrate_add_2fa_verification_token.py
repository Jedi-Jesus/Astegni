"""
Migration: Add 2FA verification token columns to users table
These columns store temporary verification tokens for protected actions (valid for 10 minutes)
"""

import psycopg

# Database connection
DATABASE_URL = 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'

def run_migration():
    """Add two_factor_verification_token and two_factor_verification_expiry columns"""
    print("[MIGRATION] Adding 2FA verification token columns to users table...")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check if columns already exist
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('two_factor_verification_token', 'two_factor_verification_expiry')
        """)

        existing_columns = [row[0] for row in cur.fetchall()]

        if 'two_factor_verification_token' in existing_columns and 'two_factor_verification_expiry' in existing_columns:
            print("[MIGRATION] Columns already exist. Skipping.")
            return

        # Add the columns
        if 'two_factor_verification_token' not in existing_columns:
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN two_factor_verification_token VARCHAR NULL
            """)
            print("[MIGRATION] Added two_factor_verification_token column")

        if 'two_factor_verification_expiry' not in existing_columns:
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN two_factor_verification_expiry TIMESTAMP NULL
            """)
            print("[MIGRATION] Added two_factor_verification_expiry column")

        conn.commit()
        print("[MIGRATION] SUCCESS - Successfully added 2FA verification token columns")

    except Exception as e:
        conn.rollback()
        print(f"[MIGRATION] ERROR - {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
    print("[MIGRATION] Migration complete!")
