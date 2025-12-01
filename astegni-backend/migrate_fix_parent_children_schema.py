"""
Migration: Fix Parent-Children Schema
- Remove: child_id from parent_profiles (single reference)
- Add: children_ids array to parent_profiles (multiple children support)

This allows one parent to have multiple children, matching the real-world scenario.

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
        print("🚀 Starting Parent-Children Schema Fix...")

        # Step 1: Remove child_id from parent_profiles
        print("\n📝 Step 1: Removing child_id from parent_profiles...")
        db.execute(text("ALTER TABLE parent_profiles DROP COLUMN IF EXISTS child_id;"))
        print("   ✅ Removed child_id (single child reference)")

        # Step 2: Add children_ids array to parent_profiles
        print("\n📝 Step 2: Adding children_ids array to parent_profiles...")
        db.execute(text("""
            ALTER TABLE parent_profiles
            ADD COLUMN IF NOT EXISTS children_ids INTEGER[] DEFAULT '{}';
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_parent_profiles_children_ids ON parent_profiles USING GIN(children_ids);"))
        print("   ✅ Added children_ids array (supports multiple children)")

        # Commit all changes
        db.commit()

        print("\n✨ Migration completed successfully!")
        print("\n📊 Summary of changes:")
        print("   • Removed: child_id from parent_profiles")
        print("   • Added: children_ids array to parent_profiles")
        print("\n🎯 New Architecture:")
        print("   • Parents can have multiple children (children_ids array)")
        print("   • Students can have multiple parents (parent_id array)")
        print("   • Both relationships are now many-to-many")

    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
