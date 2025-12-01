"""
Migration: Use Profile IDs Instead of User IDs
- Update: children_ids to store student_profile.id (not user_id)
- Update: coparent_ids to store parent_profile.id (not user_id)
- Update: parent_id in student_profiles to store parent_profile.id (not user_id)

PERFORMANCE IMPROVEMENT:
- Before: Multiple queries to get profile from user_id
- After: Direct profile lookup by ID (single query with IN clause)

Date: 2025-11-25
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
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
        print("🚀 Starting Profile IDs Migration...")
        print("\n📝 Converting existing data from user_ids to profile_ids...")

        # Step 1: Update parent_profiles.children_ids (user_id → student_profile.id)
        print("\n1️⃣ Updating parent_profiles.children_ids...")
        result = db.execute(text("""
            UPDATE parent_profiles pp
            SET children_ids = (
                SELECT ARRAY_AGG(sp.id)
                FROM student_profiles sp
                WHERE sp.user_id = ANY(pp.children_ids)
            )
            WHERE children_ids IS NOT NULL AND array_length(children_ids, 1) > 0;
        """))
        print(f"   ✅ Updated children_ids for {result.rowcount} parent profiles")

        # Step 2: SKIPPED - coparent_ids field removed (single source of truth: student_profiles.parent_id)
        print("\n2️⃣ Skipping coparent_ids (field removed - using single source of truth)")
        print("   ℹ️  Co-parent relationships now derived from children's parent_id arrays")

        # Step 3: Update student_profiles.parent_id (user_id → parent_profile.id)
        print("\n3️⃣ Updating student_profiles.parent_id...")
        result = db.execute(text("""
            UPDATE student_profiles sp
            SET parent_id = (
                SELECT ARRAY_AGG(pp.id)
                FROM parent_profiles pp
                WHERE pp.user_id = ANY(sp.parent_id)
            )
            WHERE parent_id IS NOT NULL AND array_length(parent_id, 1) > 0;
        """))
        print(f"   ✅ Updated parent_id for {result.rowcount} student profiles")

        # Commit all changes
        db.commit()

        print("\n✨ Migration completed successfully!")
        print("\n📊 Summary:")
        print("   • parent_profiles.children_ids now stores student_profile.id")
        print("   • student_profiles.parent_id now stores parent_profile.id")
        print("   ℹ️  Note: coparent_ids field removed (single source of truth architecture)")
        print("\n🚀 Performance Improvement:")
        print("   • Before: N queries to get profiles from user_ids")
        print("   • After: 1 query with IN clause for direct profile lookup")
        print("   • Example: WHERE id IN (100, 101, 102)")

    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("⚠️  WARNING: This migration will convert all existing user_ids to profile_ids")
    print("⚠️  Make sure you have a backup before proceeding!")
    print("\n🚀 Running migration automatically...")
    run_migration()
