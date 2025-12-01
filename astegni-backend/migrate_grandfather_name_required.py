#!/usr/bin/env python3
"""
Migration Script: Make grandfather_name required
Adds NOT NULL constraint to grandfather_name column and sets default value for existing NULL rows
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

# Convert to psycopg format if needed
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

def migrate():
    """Run migration to make grandfather_name required"""
    print("🔄 Starting migration: Make grandfather_name required...")

    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Step 1: Update existing NULL values with a default
            print("  ➤ Updating NULL grandfather_name values...")
            result = conn.execute(text("""
                UPDATE users
                SET grandfather_name = 'Undefined'
                WHERE grandfather_name IS NULL
            """))
            conn.commit()
            print(f"  ✓ Updated {result.rowcount} rows with NULL grandfather_name")

            # Step 2: Add NOT NULL constraint
            print("  ➤ Adding NOT NULL constraint to grandfather_name...")
            conn.execute(text("""
                ALTER TABLE users
                ALTER COLUMN grandfather_name SET NOT NULL
            """))
            conn.commit()
            print("  ✓ NOT NULL constraint added successfully")

        print("✅ Migration completed successfully!")
        print("\n📝 IMPORTANT: Users with 'Undefined' grandfather_name should update their profile.")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    migrate()
