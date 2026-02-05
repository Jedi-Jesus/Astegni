"""
Migration: Add last_name column to users table

This migration adds a last_name field to support international naming conventions
alongside the Ethiopian naming system (first_name, father_name, grandfather_name).
"""

import sys
sys.path.insert(0, 'app.py modules')
from sqlalchemy import create_engine, text
from config import DATABASE_URL

def migrate():
    """Add last_name column to users table"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("Starting migration: Adding last_name column...")

        # Add last_name column
        print("1. Adding last_name column...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS last_name VARCHAR;
        """))
        conn.commit()
        print("   [OK] last_name column added")

        print("\n[SUCCESS] Migration completed successfully!")
        print("Users table now supports both Ethiopian and international naming systems.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        raise
