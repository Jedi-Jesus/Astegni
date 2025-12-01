"""
Migration: Update Parent Profile Schema
- Remove: education_focus, active_children, currency from parent_profiles
- Add: child_id to parent_profiles (references users.id)
- Add: parent_id (array) to student_profiles
- Create: parent_reviews table

Date: 2025-11-25
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, DateTime, ARRAY, ForeignKey, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import sys
from dotenv import load_dotenv

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    """Execute the migration"""
    db = SessionLocal()

    try:
        print("🚀 Starting Parent Profile Schema Migration...")

        # Step 1: Remove columns from parent_profiles
        print("\n📝 Step 1: Removing columns from parent_profiles...")
        db.execute(text("ALTER TABLE parent_profiles DROP COLUMN IF EXISTS education_focus;"))
        print("   ✅ Removed education_focus")

        db.execute(text("ALTER TABLE parent_profiles DROP COLUMN IF EXISTS active_children;"))
        print("   ✅ Removed active_children")

        db.execute(text("ALTER TABLE parent_profiles DROP COLUMN IF EXISTS currency;"))
        print("   ✅ Removed currency")

        # Step 2: Add child_id to parent_profiles
        print("\n📝 Step 2: Adding child_id to parent_profiles...")
        db.execute(text("""
            ALTER TABLE parent_profiles
            ADD COLUMN IF NOT EXISTS child_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_parent_profiles_child_id ON parent_profiles(child_id);"))
        print("   ✅ Added child_id column with foreign key to users.id")

        # Step 3: Add parent_id array to student_profiles
        print("\n📝 Step 3: Adding parent_id array to student_profiles...")
        db.execute(text("""
            ALTER TABLE student_profiles
            ADD COLUMN IF NOT EXISTS parent_id INTEGER[] DEFAULT '{}';
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_student_profiles_parent_id ON student_profiles USING GIN(parent_id);"))
        print("   ✅ Added parent_id array column")

        # Step 4: Create parent_reviews table
        print("\n📝 Step 4: Creating parent_reviews table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS parent_reviews (
                id SERIAL PRIMARY KEY,
                parent_id INTEGER NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
                reviewer_id INTEGER NOT NULL,
                user_role VARCHAR(20) NOT NULL,

                -- Review Details
                rating FLOAT NOT NULL,
                title VARCHAR(255),
                review_text TEXT NOT NULL,

                -- Detailed Ratings (4-Factor Rating System for Parents)
                engagement_with_tutor_rating FLOAT DEFAULT 0.0,
                engagement_with_child_rating FLOAT DEFAULT 0.0,
                responsiveness_rating FLOAT DEFAULT 0.0,
                payment_consistency_rating FLOAT DEFAULT 0.0,

                -- Metadata
                is_verified BOOLEAN DEFAULT FALSE,
                helpful_count INTEGER DEFAULT 0,
                is_featured BOOLEAN DEFAULT FALSE,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Indexes
                CONSTRAINT parent_reviews_rating_check CHECK (rating >= 0 AND rating <= 5),
                CONSTRAINT parent_reviews_engagement_tutor_check CHECK (engagement_with_tutor_rating >= 0 AND engagement_with_tutor_rating <= 5),
                CONSTRAINT parent_reviews_engagement_child_check CHECK (engagement_with_child_rating >= 0 AND engagement_with_child_rating <= 5),
                CONSTRAINT parent_reviews_responsiveness_check CHECK (responsiveness_rating >= 0 AND responsiveness_rating <= 5),
                CONSTRAINT parent_reviews_payment_check CHECK (payment_consistency_rating >= 0 AND payment_consistency_rating <= 5)
            );
        """))

        # Create indexes for parent_reviews
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_parent_reviews_parent_id ON parent_reviews(parent_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_parent_reviews_reviewer_id ON parent_reviews(reviewer_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_parent_reviews_created_at ON parent_reviews(created_at);"))
        print("   ✅ Created parent_reviews table with indexes")

        # Commit all changes
        db.commit()

        print("\n✨ Migration completed successfully!")
        print("\n📊 Summary of changes:")
        print("   • Removed: education_focus, active_children, currency from parent_profiles")
        print("   • Added: child_id to parent_profiles (references users.id)")
        print("   • Added: parent_id array to student_profiles")
        print("   • Created: parent_reviews table with 4-factor rating system")
        print("\n🎯 Parent Review Rating System:")
        print("   1. Engagement with Tutor - How involved the parent is with the tutor")
        print("   2. Engagement with Child - How involved the parent is with their child's education")
        print("   3. Responsiveness - How quickly the parent responds to messages/updates")
        print("   4. Payment Consistency - How consistent the parent is with payments")

    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
