"""
Migration: Add hero_title (array) and hero_subtitle to parent_profiles table

This migration adds:
- hero_title: ARRAY of strings for multiple hero title lines
- hero_subtitle: String for a single hero subtitle

Usage:
    python migrate_add_parent_hero_fields.py
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Add hero_title and hero_subtitle columns to parent_profiles table"""

    print("=" * 60)
    print("MIGRATION: Add hero_title and hero_subtitle to parent_profiles")
    print("=" * 60)

    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Check if columns already exist
            check_hero_title = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'parent_profiles'
                AND column_name = 'hero_title'
            """)

            check_hero_subtitle = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'parent_profiles'
                AND column_name = 'hero_subtitle'
            """)

            hero_title_exists = conn.execute(check_hero_title).fetchone()
            hero_subtitle_exists = conn.execute(check_hero_subtitle).fetchone()

            # Add hero_title column (ARRAY type)
            if not hero_title_exists:
                print("\n[1/2] Adding hero_title column (TEXT[])...")
                add_hero_title = text("""
                    ALTER TABLE parent_profiles
                    ADD COLUMN hero_title TEXT[] DEFAULT ARRAY[]::TEXT[]
                """)
                conn.execute(add_hero_title)
                conn.commit()
                print("✓ hero_title column added successfully")
            else:
                print("\n[1/2] hero_title column already exists - skipping")

            # Add hero_subtitle column (TEXT type)
            if not hero_subtitle_exists:
                print("\n[2/2] Adding hero_subtitle column (TEXT)...")
                add_hero_subtitle = text("""
                    ALTER TABLE parent_profiles
                    ADD COLUMN hero_subtitle TEXT
                """)
                conn.execute(add_hero_subtitle)
                conn.commit()
                print("✓ hero_subtitle column added successfully")
            else:
                print("\n[2/2] hero_subtitle column already exists - skipping")

            # Verify the changes
            print("\n" + "=" * 60)
            print("VERIFICATION: Checking parent_profiles schema")
            print("=" * 60)

            verify_query = text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'parent_profiles'
                AND column_name IN ('hero_title', 'hero_subtitle')
                ORDER BY column_name
            """)

            results = conn.execute(verify_query).fetchall()

            if results:
                print("\nColumns found:")
                for row in results:
                    print(f"  - {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
            else:
                print("\n⚠ Warning: Could not verify columns")

            # Show sample data structure
            print("\n" + "=" * 60)
            print("SAMPLE USAGE")
            print("=" * 60)
            print("""
Example 1 - Setting hero fields for a parent:
    UPDATE parent_profiles
    SET hero_title = ARRAY['Supporting My Children', 'Building Their Future'],
        hero_subtitle = 'Dedicated parent committed to educational excellence'
    WHERE id = 1;

Example 2 - Python/SQLAlchemy:
    parent.hero_title = ['Empowering Young Minds', 'One Child at a Time']
    parent.hero_subtitle = 'Passionate about holistic child development'
    session.commit()

Example 3 - FastAPI endpoint update:
    {
        "hero_title": ["Nurturing Tomorrow's Leaders", "Through Quality Education"],
        "hero_subtitle": "Active parent in the Astegni community"
    }
            """)

            print("\n" + "=" * 60)
            print("MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("\nNext steps:")
            print("1. Update ParentProfile model in app.py modules/models.py")
            print("2. Update ParentProfileUpdate Pydantic schema")
            print("3. Update ParentProfileResponse Pydantic schema")
            print("4. Update parent profile endpoints to handle hero fields")
            print("5. Update frontend parent-profile.html to display hero section")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)
    finally:
        engine.dispose()

if __name__ == "__main__":
    run_migration()
