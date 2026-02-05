"""
Migration: Add Google OAuth fields to users table
Adds: google_email, oauth_provider
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # Add google_email column
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS google_email VARCHAR NULL
            """))
            print("[OK] Added google_email column")
        except Exception as e:
            print(f"[WARN] google_email column: {e}")

        # Add oauth_provider column
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) NULL
            """))
            print("[OK] Added oauth_provider column")
        except Exception as e:
            print(f"[WARN] oauth_provider column: {e}")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")

        # Verify columns were added
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('google_email', 'oauth_provider')
            ORDER BY column_name
        """))

        print("\n=== Verification ===")
        for row in result:
            print(f"{row.column_name}: {row.data_type} (nullable: {row.is_nullable})")

if __name__ == "__main__":
    migrate()
