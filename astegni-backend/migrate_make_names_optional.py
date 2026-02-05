"""
Migration: Make first_name, father_name, and grandfather_name optional in users table

This migration updates the users table to allow NULL values for:
- first_name
- father_name
- grandfather_name

These fields are no longer required during registration.
"""

import sys
sys.path.insert(0, 'app.py modules')
from sqlalchemy import create_engine, text
from config import DATABASE_URL

def migrate():
    """Make name fields nullable in users table"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("Starting migration: Making name fields nullable...")

        # Make first_name nullable
        print("1. Making first_name nullable...")
        conn.execute(text("""
            ALTER TABLE users
            ALTER COLUMN first_name DROP NOT NULL;
        """))
        conn.commit()
        print("   [OK] first_name is now nullable")

        # Make father_name nullable
        print("2. Making father_name nullable...")
        conn.execute(text("""
            ALTER TABLE users
            ALTER COLUMN father_name DROP NOT NULL;
        """))
        conn.commit()
        print("   [OK] father_name is now nullable")

        # Make grandfather_name nullable
        print("3. Making grandfather_name nullable...")
        conn.execute(text("""
            ALTER TABLE users
            ALTER COLUMN grandfather_name DROP NOT NULL;
        """))
        conn.commit()
        print("   [OK] grandfather_name is now nullable")

        print("\n[SUCCESS] Migration completed successfully!")
        print("Name fields (first_name, father_name, grandfather_name) are now optional.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        raise
