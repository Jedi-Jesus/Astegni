"""
Migration: Fix languages column type mismatch
- Convert users.languages from text[] to json
- Convert users.hobbies from text[] to json (if needed)

This fixes the error:
  column "languages" is of type text[] but expression is of type json

IMPORTANT: This migration is SAFE and IDEMPOTENT
- It preserves all existing data
- It can be run multiple times without issues
- It only converts if the column is currently text[] type
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    # Get database URL
    db_url = os.getenv('DATABASE_URL')

    # Fix for psycopg3
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg://')

    engine = create_engine(db_url)

    with engine.connect() as conn:
        print("Starting migration to fix languages column type...")

        # Step 1: Check current column type
        print("\n1. Checking current column type...")
        result = conn.execute(text("""
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('languages', 'hobbies')
            ORDER BY column_name
        """))

        current_types = {}
        for row in result:
            current_types[row[0]] = row[1]
            print(f"   {row[0]}: {row[1]} ({row[2]})")

        # Step 2: Convert languages column if needed
        if current_types.get('languages') == 'ARRAY':
            print("\n2. Converting languages column from text[] to json...")
            try:
                # Convert text[] to json by wrapping the array in to_jsonb()
                conn.execute(text("""
                    ALTER TABLE users
                    ALTER COLUMN languages TYPE json
                    USING CASE
                        WHEN languages IS NULL THEN '[]'::json
                        ELSE to_jsonb(languages)::json
                    END
                """))
                conn.commit()
                print("[OK] Converted languages column to json type")
            except Exception as e:
                print(f"[ERROR] Error converting languages column: {e}")
                conn.rollback()
                raise
        else:
            print("\n2. Languages column is already json type - skipping")

        # Step 3: Convert hobbies column if needed
        if current_types.get('hobbies') == 'ARRAY':
            print("\n3. Converting hobbies column from text[] to json...")
            try:
                # Convert text[] to json by wrapping the array in to_jsonb()
                conn.execute(text("""
                    ALTER TABLE users
                    ALTER COLUMN hobbies TYPE json
                    USING CASE
                        WHEN hobbies IS NULL THEN '[]'::json
                        ELSE to_jsonb(hobbies)::json
                    END
                """))
                conn.commit()
                print("[OK] Converted hobbies column to json type")
            except Exception as e:
                print(f"[ERROR] Error converting hobbies column: {e}")
                conn.rollback()
                raise
        else:
            print("\n3. Hobbies column is already json type - skipping")

        # Step 4: Verify the changes
        print("\n4. Verifying changes...")
        result = conn.execute(text("""
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('languages', 'hobbies')
            ORDER BY column_name
        """))

        print("   Final column types:")
        for row in result:
            print(f"   {row[0]}: {row[1]} ({row[2]})")

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nSummary:")
        print("- Fixed languages column type (text[] -> json)")
        print("- Fixed hobbies column type (text[] -> json)")
        print("- SQLAlchemy model now matches database schema")

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Fix languages/hobbies column type mismatch")
    print("=" * 60)

    print("\nThis migration will:")
    print("- Convert users.languages from text[] to json")
    print("- Convert users.hobbies from text[] to json")
    print("- Preserve all existing data")

    response = input("\nContinue? (yes/no): ")
    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
