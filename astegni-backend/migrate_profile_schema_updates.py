"""
Database Migration: Profile Schema Updates

Changes:
1. Move 'username' from users table to tutor_profiles table
2. Remove 'gender' from tutor_profiles table (keep in users table)
3. Remove 'rating' and 'rating_count' from tutor_profiles table (calculate dynamically from tutor_reviews)
4. Ensure all profile-header-section fields are database-driven

Run this migration ONCE to update the schema.
"""

import os
from sqlalchemy import create_engine, text, MetaData, Table, Column, String, Integer, Float, inspect
from sqlalchemy.exc import ProgrammingError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Create engine
engine = create_engine(DATABASE_URL)

def check_column_exists(engine, table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def migrate_username_to_tutor_profiles():
    """Move username from users table to tutor_profiles table"""
    with engine.connect() as conn:
        print("\n" + "="*60)
        print("STEP 1: Migrate username to tutor_profiles table")
        print("="*60)

        # Check if username already exists in tutor_profiles
        if check_column_exists(engine, 'tutor_profiles', 'username'):
            print("✅ username column already exists in tutor_profiles table")
        else:
            # Add username column to tutor_profiles (it should already exist, but just in case)
            print("📝 Adding username column to tutor_profiles table...")
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE
            """))
            conn.commit()
            print("✅ username column added to tutor_profiles table")

        # Copy username data from users to tutor_profiles for tutors who don't have it
        print("\n📝 Copying username data from users to tutor_profiles...")
        result = conn.execute(text("""
            UPDATE tutor_profiles tp
            SET username = u.username
            FROM users u
            WHERE tp.user_id = u.id
            AND (tp.username IS NULL OR tp.username = '')
            AND u.username IS NOT NULL
        """))
        conn.commit()
        print(f"✅ Updated {result.rowcount} tutor profiles with username from users table")

        # Note: We keep username in users table for now as other roles may need it
        # If you want to remove it from users, uncomment the following:
        # print("\n📝 Removing username column from users table...")
        # conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS username"))
        # conn.commit()
        # print("✅ username column removed from users table")

def remove_gender_from_tutor_profiles():
    """Remove gender column from tutor_profiles table (keep in users table)"""
    with engine.connect() as conn:
        print("\n" + "="*60)
        print("STEP 2: Remove gender from tutor_profiles table")
        print("="*60)

        # Check if gender exists in tutor_profiles
        if not check_column_exists(engine, 'tutor_profiles', 'gender'):
            print("✅ gender column already removed from tutor_profiles table")
            return

        # First, copy any gender data from tutor_profiles to users if missing
        print("📝 Copying gender data from tutor_profiles to users (if missing)...")
        result = conn.execute(text("""
            UPDATE users u
            SET gender = tp.gender
            FROM tutor_profiles tp
            WHERE u.id = tp.user_id
            AND (u.gender IS NULL OR u.gender = '')
            AND tp.gender IS NOT NULL
        """))
        conn.commit()
        print(f"✅ Updated {result.rowcount} users with gender from tutor_profiles")

        # Drop gender column from tutor_profiles
        print("\n📝 Removing gender column from tutor_profiles table...")
        conn.execute(text("ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS gender"))
        conn.commit()
        print("✅ gender column removed from tutor_profiles table")

def remove_rating_columns_from_tutor_profiles():
    """Remove rating and rating_count from tutor_profiles table"""
    with engine.connect() as conn:
        print("\n" + "="*60)
        print("STEP 3: Remove rating and rating_count from tutor_profiles")
        print("="*60)

        # Check if columns exist
        rating_exists = check_column_exists(engine, 'tutor_profiles', 'rating')
        rating_count_exists = check_column_exists(engine, 'tutor_profiles', 'rating_count')

        if not rating_exists and not rating_count_exists:
            print("✅ rating and rating_count columns already removed from tutor_profiles table")
            return

        # Drop rating column
        if rating_exists:
            print("📝 Removing rating column from tutor_profiles table...")
            conn.execute(text("ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS rating"))
            conn.commit()
            print("✅ rating column removed")

        # Drop rating_count column
        if rating_count_exists:
            print("📝 Removing rating_count column from tutor_profiles table...")
            conn.execute(text("ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS rating_count"))
            conn.commit()
            print("✅ rating_count column removed")

        print("\n💡 NOTE: Ratings will now be calculated dynamically from tutor_reviews table")
        print("   - Overall rating: AVG of all review ratings")
        print("   - Rating count: COUNT of reviews")
        print("   - 4-factor metrics: AVG of subject_understanding, communication, discipline, punctuality")

def verify_tutor_reviews_table():
    """Verify that tutor_reviews table exists with required columns"""
    with engine.connect() as conn:
        print("\n" + "="*60)
        print("STEP 4: Verify tutor_reviews table structure")
        print("="*60)

        inspector = inspect(engine)

        # Check if tutor_reviews table exists
        if 'tutor_reviews' not in inspector.get_table_names():
            print("⚠️  WARNING: tutor_reviews table does not exist!")
            print("   Creating tutor_reviews table...")

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tutor_reviews (
                    id SERIAL PRIMARY KEY,
                    tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
                    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
                    overall_rating FLOAT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
                    subject_understanding_rating FLOAT CHECK (subject_understanding_rating >= 1 AND subject_understanding_rating <= 5),
                    communication_rating FLOAT CHECK (communication_rating >= 1 AND communication_rating <= 5),
                    discipline_rating FLOAT CHECK (discipline_rating >= 1 AND discipline_rating <= 5),
                    punctuality_rating FLOAT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
                    review_text TEXT,
                    tutor_response TEXT,
                    is_featured BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("✅ tutor_reviews table created")
        else:
            print("✅ tutor_reviews table exists")

            # Verify required columns
            columns = [col['name'] for col in inspector.get_columns('tutor_reviews')]
            required_columns = [
                'tutor_id', 'student_id', 'overall_rating',
                'subject_understanding_rating', 'communication_rating',
                'discipline_rating', 'punctuality_rating'
            ]

            missing_columns = [col for col in required_columns if col not in columns]
            if missing_columns:
                print(f"⚠️  WARNING: Missing columns in tutor_reviews: {missing_columns}")
            else:
                print("✅ All required columns exist in tutor_reviews table")

def add_social_links_to_tutor_profiles():
    """Ensure social_links column exists in tutor_profiles"""
    with engine.connect() as conn:
        print("\n" + "="*60)
        print("STEP 5: Verify social_links column in tutor_profiles")
        print("="*60)

        if check_column_exists(engine, 'tutor_profiles', 'social_links'):
            print("✅ social_links column already exists in tutor_profiles table")
        else:
            print("📝 Adding social_links column to tutor_profiles table...")
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN social_links JSON DEFAULT '{}'
            """))
            conn.commit()
            print("✅ social_links column added to tutor_profiles table")

def verify_quote_column():
    """Ensure quote column exists in tutor_profiles"""
    with engine.connect() as conn:
        print("\n" + "="*60)
        print("STEP 6: Verify quote column in tutor_profiles")
        print("="*60)

        if check_column_exists(engine, 'tutor_profiles', 'quote'):
            print("✅ quote column already exists in tutor_profiles table")
        else:
            print("📝 Adding quote column to tutor_profiles table...")
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN quote TEXT
            """))
            conn.commit()
            print("✅ quote column added to tutor_profiles table")

def display_summary():
    """Display migration summary"""
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)

    inspector = inspect(engine)

    print("\n📊 USERS TABLE:")
    users_cols = [col['name'] for col in inspector.get_columns('users')]
    print(f"   - username: {'✅ EXISTS' if 'username' in users_cols else '❌ MISSING'}")
    print(f"   - gender: {'✅ EXISTS' if 'gender' in users_cols else '❌ MISSING'}")
    print(f"   - email: {'✅ EXISTS' if 'email' in users_cols else '❌ MISSING'}")
    print(f"   - phone: {'✅ EXISTS' if 'phone' in users_cols else '❌ MISSING'}")

    print("\n📊 TUTOR_PROFILES TABLE:")
    tutor_cols = [col['name'] for col in inspector.get_columns('tutor_profiles')]
    print(f"   - username: {'✅ EXISTS' if 'username' in tutor_cols else '❌ MISSING'}")
    print(f"   - gender: {'❌ EXISTS (should be removed)' if 'gender' in tutor_cols else '✅ REMOVED'}")
    print(f"   - rating: {'❌ EXISTS (should be removed)' if 'rating' in tutor_cols else '✅ REMOVED'}")
    print(f"   - rating_count: {'❌ EXISTS (should be removed)' if 'rating_count' in tutor_cols else '✅ REMOVED'}")
    print(f"   - quote: {'✅ EXISTS' if 'quote' in tutor_cols else '❌ MISSING'}")
    print(f"   - social_links: {'✅ EXISTS' if 'social_links' in tutor_cols else '❌ MISSING'}")
    print(f"   - bio: {'✅ EXISTS' if 'bio' in tutor_cols else '❌ MISSING'}")
    print(f"   - location: {'✅ EXISTS' if 'location' in tutor_cols else '❌ MISSING'}")
    print(f"   - teaches_at: {'✅ EXISTS' if 'teaches_at' in tutor_cols else '❌ MISSING'}")
    print(f"   - languages: {'✅ EXISTS' if 'languages' in tutor_cols else '❌ MISSING'}")
    print(f"   - grades: {'✅ EXISTS' if 'grades' in tutor_cols else '❌ MISSING'}")
    print(f"   - courses: {'✅ EXISTS' if 'courses' in tutor_cols else '❌ MISSING'}")
    print(f"   - course_type: {'✅ EXISTS' if 'course_type' in tutor_cols else '❌ MISSING'}")
    print(f"   - sessionFormat: {'✅ EXISTS' if 'sessionFormat' in tutor_cols else '❌ MISSING'}")

    print("\n📊 TUTOR_REVIEWS TABLE:")
    if 'tutor_reviews' in inspector.get_table_names():
        reviews_cols = [col['name'] for col in inspector.get_columns('tutor_reviews')]
        print(f"   - tutor_id: {'✅ EXISTS' if 'tutor_id' in reviews_cols else '❌ MISSING'}")
        print(f"   - overall_rating: {'✅ EXISTS' if 'overall_rating' in reviews_cols else '❌ MISSING'}")
        print(f"   - subject_understanding_rating: {'✅ EXISTS' if 'subject_understanding_rating' in reviews_cols else '❌ MISSING'}")
        print(f"   - communication_rating: {'✅ EXISTS' if 'communication_rating' in reviews_cols else '❌ MISSING'}")
        print(f"   - discipline_rating: {'✅ EXISTS' if 'discipline_rating' in reviews_cols else '❌ MISSING'}")
        print(f"   - punctuality_rating: {'✅ EXISTS' if 'punctuality_rating' in reviews_cols else '❌ MISSING'}")
    else:
        print("   ❌ TABLE DOES NOT EXIST")

    print("\n" + "="*60)
    print("✅ MIGRATION COMPLETE!")
    print("="*60)
    print("\nNEXT STEPS:")
    print("1. Update backend models in 'app.py modules/models.py'")
    print("2. Update API endpoints in 'app.py modules/routes.py'")
    print("3. Update frontend JavaScript in 'tutor-profile.html'")
    print("4. Restart backend server: python app.py")
    print("5. Test all profile-header-section fields")
    print("="*60)

def main():
    """Run all migration steps"""
    print("\n" + "="*60)
    print("DATABASE MIGRATION: PROFILE SCHEMA UPDATES")
    print("="*60)
    print("\nThis migration will:")
    print("1. Move 'username' from users → tutor_profiles")
    print("2. Remove 'gender' from tutor_profiles (keep in users)")
    print("3. Remove 'rating' and 'rating_count' from tutor_profiles")
    print("4. Verify tutor_reviews table for dynamic rating calculation")
    print("5. Add social_links and quote columns if missing")
    print("\n⚠️  IMPORTANT: Make sure you have a database backup!")

    response = input("\nProceed with migration? (yes/no): ").strip().lower()
    if response != 'yes':
        print("❌ Migration cancelled")
        return

    try:
        # Run migrations
        migrate_username_to_tutor_profiles()
        remove_gender_from_tutor_profiles()
        remove_rating_columns_from_tutor_profiles()
        verify_tutor_reviews_table()
        add_social_links_to_tutor_profiles()
        verify_quote_column()

        # Display summary
        display_summary()

    except Exception as e:
        print(f"\n❌ ERROR during migration: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    main()
