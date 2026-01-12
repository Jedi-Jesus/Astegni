"""
Migration: Add tier and referred user columns to advertisement_earnings table
"""
import psycopg
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    print("Adding tier and referred user columns to advertisement_earnings...")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Add referred user columns
        cur.execute("""
            ALTER TABLE advertisement_earnings
            ADD COLUMN IF NOT EXISTS referred_user_id INTEGER,
            ADD COLUMN IF NOT EXISTS referred_user_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS referred_user_profile_picture TEXT,
            ADD COLUMN IF NOT EXISTS tier_level INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS referral_chain TEXT;
        """)
        print("  - Added columns to advertisement_earnings table")

        conn.commit()
        print("\nMigration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
