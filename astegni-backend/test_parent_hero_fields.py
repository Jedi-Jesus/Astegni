"""
Test script for parent hero fields

This script:
1. Verifies the database schema has the new columns
2. Tests reading and writing hero_title and hero_subtitle
3. Demonstrates example usage

Usage:
    python test_parent_hero_fields.py
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

def test_parent_hero_fields():
    """Test parent hero fields"""

    print("=" * 60)
    print("TESTING PARENT HERO FIELDS")
    print("=" * 60)

    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # 1. Verify schema
            print("\n[1/4] Verifying schema...")
            verify_query = text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'parent_profiles'
                AND column_name IN ('hero_title', 'hero_subtitle')
                ORDER BY column_name
            """)

            results = conn.execute(verify_query).fetchall()

            if len(results) == 2:
                print("✓ Schema verified - both columns exist:")
                for row in results:
                    print(f"  - {row[0]}: {row[1]}")
            else:
                print("❌ Schema verification failed")
                return False

            # 2. Check if we have any parent profiles
            print("\n[2/4] Checking for parent profiles...")
            count_query = text("SELECT COUNT(*) FROM parent_profiles")
            count = conn.execute(count_query).scalar()
            print(f"✓ Found {count} parent profiles in database")

            if count > 0:
                # 3. Update first parent profile with sample hero data
                print("\n[3/4] Updating first parent with sample hero data...")

                update_query = text("""
                    UPDATE parent_profiles
                    SET hero_title = ARRAY['Supporting My Children', 'Building Their Future', 'Together We Learn'],
                        hero_subtitle = 'Dedicated parent committed to educational excellence and holistic child development'
                    WHERE id = (SELECT id FROM parent_profiles LIMIT 1)
                    RETURNING id, hero_title, hero_subtitle
                """)

                result = conn.execute(update_query)
                conn.commit()
                updated = result.fetchone()

                if updated:
                    print(f"✓ Updated parent profile ID: {updated[0]}")
                    print(f"  Hero Title: {updated[1]}")
                    print(f"  Hero Subtitle: {updated[2]}")

                # 4. Read back the data
                print("\n[4/4] Reading data from database...")

                read_query = text("""
                    SELECT id, username, hero_title, hero_subtitle
                    FROM parent_profiles
                    WHERE hero_title IS NOT NULL
                    LIMIT 3
                """)

                results = conn.execute(read_query).fetchall()

                if results:
                    print(f"✓ Found {len(results)} parent(s) with hero data:")
                    for row in results:
                        print(f"\n  Parent ID: {row[0]} (@{row[1]})")
                        print(f"  Hero Title: {row[2]}")
                        print(f"  Hero Subtitle: {row[3]}")
                else:
                    print("⚠ No parents with hero data found")
            else:
                print("\n⚠ No parent profiles found in database")
                print("  Skipping data update tests")

            # Show example usage
            print("\n" + "=" * 60)
            print("EXAMPLE USAGE IN API")
            print("=" * 60)
            print("""
# Example 1 - Update parent profile via API endpoint
PUT /api/parent/profile
{
    "hero_title": [
        "Empowering Young Minds",
        "One Child at a Time",
        "Through Quality Education"
    ],
    "hero_subtitle": "Passionate about holistic child development and academic excellence"
}

# Example 2 - Multiple title lines for emphasis
PUT /api/parent/profile
{
    "hero_title": [
        "Supporting My 3 Children",
        "Active in the Astegni Community"
    ],
    "hero_subtitle": "Believer in the power of great tutoring and personalized learning"
}

# Example 3 - Single line title
PUT /api/parent/profile
{
    "hero_title": ["Dedicated Parent & Educator"],
    "hero_subtitle": "Committed to finding the best tutors for my children"
}
            """)

            print("\n" + "=" * 60)
            print("TESTS COMPLETED SUCCESSFULLY!")
            print("=" * 60)

            return True

    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        engine.dispose()

if __name__ == "__main__":
    success = test_parent_hero_fields()
    sys.exit(0 if success else 1)
