#!/usr/bin/env python3
"""
Migration script to create system_media table for platform-wide media assets
Run this script to add the system_media table to your database
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Import from the modules directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))

try:
    from config import DATABASE_URL
    from models import Base, SystemMedia
except ImportError:
    # Try importing from app.py modules directory
    from importlib import import_module
    config = import_module('app.py modules.config')
    models = import_module('app.py modules.models')
    DATABASE_URL = config.DATABASE_URL
    Base = models.Base
    SystemMedia = models.SystemMedia

def migrate():
    """Create system_media table"""
    print("="*60)
    print("SYSTEM MEDIA TABLE MIGRATION")
    print("="*60)

    try:
        # Create engine
        engine = create_engine(DATABASE_URL)

        print(f"\n✓ Connected to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")

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
            print("\n⚠️  WARNING: system_media table already exists")
            response = input("Do you want to drop and recreate it? (yes/no): ")

            if response.lower() == 'yes':
                with engine.connect() as conn:
                    conn.execute(text("DROP TABLE IF EXISTS system_media CASCADE"))
                    conn.commit()
                print("✓ Dropped existing system_media table")
            else:
                print("Migration cancelled.")
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
        print("\nThe system_media table is now ready to store:")
        print("  • System images (logos, favicons, covers, profile pics)")
        print("  • System videos (ads, alerts)")
        print("  • With user_id='system' in Backblaze B2")
        print("\nYou can now use the upload endpoints:")
        print("  • POST /api/upload/system-image")
        print("  • POST /api/upload/system-video")
        print("  • GET /api/system-media")
        print("\n")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    migrate()
