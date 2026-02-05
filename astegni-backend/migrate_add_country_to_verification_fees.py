"""
Migration: Add country column to verification_fee table
Adds GPS-based country detection support to verification fees
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL for admin database
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')

if not ADMIN_DATABASE_URL:
    raise ValueError("ADMIN_DATABASE_URL not found in environment variables")

# Create engine
engine = create_engine(ADMIN_DATABASE_URL)

def migrate():
    """Add country column to verification_fee table"""

    with engine.connect() as conn:
        print("Starting migration: Add country column to verification_fee table")

        try:
            # Add country column
            print("Adding country column...")
            conn.execute(text("""
                ALTER TABLE verification_fee
                ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'all'
            """))
            conn.commit()
            print("[OK] Country column added")

            # Create index for better query performance
            print("Creating index on country column...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_verification_fee_country
                ON verification_fee(country)
            """))
            conn.commit()
            print("[OK] Index created")

            # Update existing rows to have 'all' for country
            print("Updating existing records...")
            conn.execute(text("""
                UPDATE verification_fee
                SET country = 'all'
                WHERE country IS NULL
            """))
            conn.commit()
            print("[OK] Existing records updated")

            print("\n[SUCCESS] Migration completed successfully!")
            print("\nVerification fees now support country-specific pricing:")
            print("- Country codes: ET, CM, KE, MX, NG, GH, ZA, EG, TZ, UG, US, CA, GB, FR, DE, etc.")
            print("- 'all' = Global (applies to all countries)")
            print("- GPS auto-detection in admin panel")

        except Exception as e:
            conn.rollback()
            print(f"\n[ERROR] Migration failed: {e}")
            raise

def verify():
    """Verify the migration was successful"""

    with engine.connect() as conn:
        print("\nVerifying migration...")

        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'verification_fee'
            AND column_name = 'country'
        """))

        row = result.fetchone()
        if row:
            print(f"[OK] Column 'country' exists: {row[1]} with default: {row[2]}")
        else:
            print("[FAIL] Column 'country' not found")
            return False

        # Check index
        result = conn.execute(text("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'verification_fee'
            AND indexname = 'idx_verification_fee_country'
        """))

        if result.fetchone():
            print("[OK] Index 'idx_verification_fee_country' exists")
        else:
            print("[FAIL] Index not found")
            return False

        # Count records
        result = conn.execute(text("""
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN country = 'all' THEN 1 END) as global_count,
                   COUNT(CASE WHEN country != 'all' THEN 1 END) as country_specific_count
            FROM verification_fee
        """))

        row = result.fetchone()
        if row:
            print(f"\nVerification fees summary:")
            print(f"  Total: {row[0]}")
            print(f"  Global ('all'): {row[1]}")
            print(f"  Country-specific: {row[2]}")

        print("\n[SUCCESS] Verification completed successfully!")
        return True

if __name__ == "__main__":
    try:
        migrate()
        verify()
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        exit(1)
