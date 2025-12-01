#!/usr/bin/env python3
"""
Migration Script: Make email and phone optional (but at least one required)
This script updates the users table to allow nullable email and phone fields.
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

def migrate():
    """Run the migration to make email and phone optional"""
    try:
        engine = create_engine(DATABASE_URL)

        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Starting migration: Making email and phone optional...")

                # Make email nullable
                print("1. Making email column nullable...")
                conn.execute(text("""
                    ALTER TABLE users
                    ALTER COLUMN email DROP NOT NULL;
                """))

                # Make phone unique and indexed (if not already)
                print("2. Making phone column unique and indexed...")
                try:
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD CONSTRAINT users_phone_key UNIQUE (phone);
                    """))
                except Exception as e:
                    if "already exists" in str(e):
                        print("   Phone unique constraint already exists, skipping...")
                    else:
                        raise

                try:
                    conn.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
                    """))
                except Exception as e:
                    if "already exists" in str(e):
                        print("   Phone index already exists, skipping...")
                    else:
                        raise

                # Add a check constraint to ensure at least one of email or phone is provided
                print("3. Adding check constraint for email OR phone...")
                try:
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD CONSTRAINT check_email_or_phone
                        CHECK (email IS NOT NULL OR phone IS NOT NULL);
                    """))
                except Exception as e:
                    if "already exists" in str(e):
                        print("   Check constraint already exists, skipping...")
                    else:
                        raise

                # Commit transaction
                trans.commit()
                print("\n✅ Migration completed successfully!")
                print("\nChanges made:")
                print("  - Email column is now nullable")
                print("  - Phone column is now unique and indexed")
                print("  - Added constraint: at least one of email or phone must be provided")

            except Exception as e:
                trans.rollback()
                print(f"\n❌ Migration failed: {e}")
                print("Rolling back changes...")
                raise

    except Exception as e:
        print(f"\n❌ Database connection failed: {e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("Database Migration: Email/Phone Optional")
    print("=" * 60)
    print()

    response = input("This will modify the users table. Continue? (yes/no): ")

    if response.lower() in ['yes', 'y']:
        migrate()
    else:
        print("Migration cancelled.")
