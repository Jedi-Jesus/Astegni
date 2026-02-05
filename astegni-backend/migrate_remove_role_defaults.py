"""
Migration: Remove default values from roles and active_role columns
Makes registration work without requiring role selection
Users will be created with NULL roles and active_role
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("Starting migration: Remove role defaults...")

        # Remove default from active_role column
        print("1. Removing default from active_role column...")
        conn.execute(text("""
            ALTER TABLE users
            ALTER COLUMN active_role DROP DEFAULT
        """))
        conn.commit()
        print("   [OK] active_role default removed")

        # Remove default from roles column
        print("2. Removing default from roles column...")
        conn.execute(text("""
            ALTER TABLE users
            ALTER COLUMN roles DROP DEFAULT
        """))
        conn.commit()
        print("   [OK] roles default removed")

        # Verify changes
        print("\n3. Verifying changes...")
        result = conn.execute(text("""
            SELECT column_name, is_nullable, column_default, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('roles', 'active_role')
            ORDER BY column_name
        """))

        print("\nCurrent schema:")
        print("-" * 80)
        for row in result:
            print(f"Column: {row[0]}")
            print(f"  Nullable: {row[1]}")
            print(f"  Default: {row[2]}")
            print(f"  Type: {row[3]}")
            print()

        print("[OK] Migration completed successfully!")
        print("\nNote: New users will be created with NULL roles and active_role.")
        print("Users can add roles later through the role management system.")

if __name__ == "__main__":
    migrate()
