"""
Migration: Add currency column to base_price_rules table
Adds support for multi-currency base price rules
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
    """Add currency column to base_price_rules table"""

    with engine.connect() as conn:
        print("Starting migration: Add currency column to base_price_rules table")

        try:
            # Add currency column
            print("Adding currency column...")
            conn.execute(text("""
                ALTER TABLE base_price_rules
                ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ETB'
            """))
            conn.commit()
            print("[OK] Currency column added")

            # Create index for better query performance
            print("Creating index on currency column...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_base_price_rules_currency
                ON base_price_rules(currency)
            """))
            conn.commit()
            print("[OK] Index created")

            # Update existing rows to have 'ETB' for currency
            print("Updating existing records...")
            conn.execute(text("""
                UPDATE base_price_rules
                SET currency = 'ETB'
                WHERE currency IS NULL
            """))
            conn.commit()
            print("[OK] Existing records updated")

            print("\n[SUCCESS] Migration completed successfully!")
            print("\nBase price rules now support multi-currency:")
            print("- Currency codes: ETB, USD, EUR, GBP, etc.")
            print("- Default: ETB (Ethiopian Birr)")
            print("- Allows country-specific pricing in different currencies")

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
            WHERE table_name = 'base_price_rules'
            AND column_name = 'currency'
        """))

        row = result.fetchone()
        if row:
            print(f"[OK] Column 'currency' exists: {row[1]} with default: {row[2]}")
        else:
            print("[FAIL] Column 'currency' not found")
            return False

        # Check index
        result = conn.execute(text("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'base_price_rules'
            AND indexname = 'idx_base_price_rules_currency'
        """))

        if result.fetchone():
            print("[OK] Index 'idx_base_price_rules_currency' exists")
        else:
            print("[FAIL] Index not found")
            return False

        # Count records by currency
        result = conn.execute(text("""
            SELECT currency, COUNT(*) as count
            FROM base_price_rules
            GROUP BY currency
            ORDER BY count DESC
        """))

        rows = result.fetchall()
        if rows:
            print(f"\nBase price rules by currency:")
            for row in rows:
                print(f"  {row[0]}: {row[1]} rules")
        else:
            print("\nNo base price rules found")

        print("\n[SUCCESS] Verification completed successfully!")
        return True

if __name__ == "__main__":
    try:
        migrate()
        verify()
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        exit(1)
