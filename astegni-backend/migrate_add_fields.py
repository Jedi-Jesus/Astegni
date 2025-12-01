#!/usr/bin/env python3
"""
Migration script to add grandfather_name, username, and social_links fields
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

def run_migration():
    """Run the migration to add new fields"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("🔄 Starting migration...")

        # Add grandfather_name to users table
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS grandfather_name VARCHAR;
            """))
            conn.commit()
            print("✅ Added grandfather_name to users table")
        except Exception as e:
            print(f"⚠️  grandfather_name column might already exist: {e}")

        # Add username to users table
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE;
            """))
            conn.commit()
            print("✅ Added username to users table")
        except Exception as e:
            print(f"⚠️  username column might already exist: {e}")

        # Create index for username
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
            """))
            conn.commit()
            print("✅ Created index for username")
        except Exception as e:
            print(f"⚠️  Index might already exist: {e}")

        # Add social_links to tutor_profiles table
        try:
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS social_links JSON DEFAULT '{}';
            """))
            conn.commit()
            print("✅ Added social_links to tutor_profiles table")
        except Exception as e:
            print(f"⚠️  social_links column might already exist: {e}")

        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
