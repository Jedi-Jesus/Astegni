"""
Migration: Add lab_id field to whiteboard table
Adds lab_id column to reference Digital Lab sessions
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        trans = conn.begin()

        try:
            print("Adding lab_id field to whiteboard table...")
            print("=" * 60)

            # Check if column already exists
            print("\n1. Checking if lab_id column exists...")
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'whiteboard' AND column_name = 'lab_id'
                );
            """))
            column_exists = result.scalar()

            if column_exists:
                print("   lab_id column already exists, skipping...")
            else:
                # Add lab_id column
                print("\n2. Adding lab_id column...")
                conn.execute(text("""
                    ALTER TABLE whiteboard
                    ADD COLUMN lab_id INTEGER;
                """))
                print("   Column added successfully")

                # Add index for lab_id
                print("\n3. Creating index on lab_id...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_whiteboard_lab_id ON whiteboard(lab_id);
                """))
                print("   Index created")

            trans.commit()

            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("=" * 60)

            # Display updated table schema
            print("\nUPDATED WHITEBOARD TABLE SCHEMA:")
            print("-" * 60)
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'whiteboard'
                ORDER BY ordinal_position;
            """))

            for row in result:
                nullable = "NULL" if row[2] == "YES" else "NOT NULL"
                default = row[3] if row[3] else "None"
                print(f"  {row[0]:<25} {row[1]:<20} {nullable:<10} DEFAULT: {default}")

            print("\n" + "=" * 60)

        except Exception as e:
            trans.rollback()
            print(f"\nMigration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    migrate()
