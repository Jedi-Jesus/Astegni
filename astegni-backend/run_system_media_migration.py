#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple migration script to create system_media table
"""

import sys
import os
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add the app.py modules directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import create_engine, text
from config import DATABASE_URL
from models import Base, SystemMedia

def migrate():
    """Create system_media table"""
    print("="*60)
    print("SYSTEM MEDIA TABLE MIGRATION")
    print("="*60)

    try:
        # Create engine
        engine = create_engine(DATABASE_URL)

        print(f"\n✓ Connected to database")

        # Check if table already exists
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'system_media'
                );
            """))
            table_exists = result.scalar()

        if table_exists:
            print("\n✓ system_media table already exists")
            return

        # Create the table
        print("\n📦 Creating system_media table...")
        SystemMedia.__table__.create(engine, checkfirst=True)
        print("✓ system_media table created successfully")

        # Verify table structure
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'system_media'
                ORDER BY ordinal_position;
            """))

            print("\n📋 Table structure:")
            print("-" * 60)
            for row in result:
                print(f"  {row[0]:<30} {row[1]}")

        print("\n" + "="*60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    migrate()
