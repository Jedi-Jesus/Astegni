"""
Migration: Add coparent_ids to parent_profiles
- Add: coparent_ids array to parent_profiles (array of co-parent user IDs)

This makes it easier to query co-parents directly without traversing children.

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
        print("🚀 Starting Co-Parent IDs Migration...")

        # Add coparent_ids array to parent_profiles
        print("\n📝 Adding coparent_ids array to parent_profiles...")
        db.execute(text("""
            ALTER TABLE parent_profiles
            ADD COLUMN IF NOT EXISTS coparent_ids INTEGER[] DEFAULT '{}';
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_parent_profiles_coparent_ids ON parent_profiles USING GIN(coparent_ids);"))
        print("   ✅ Added coparent_ids array")

        # Commit all changes
        db.commit()

        print("\n✨ Migration completed successfully!")
        print("\n📊 Summary of changes:")
        print("   • Added: coparent_ids array to parent_profiles")
        print("\n🎯 Usage:")
        print("   • When adding a co-parent, both parents add each other to coparent_ids")
        print("   • Parent A: coparent_ids = [parent_B_user_id, parent_C_user_id]")
        print("   • Parent B: coparent_ids = [parent_A_user_id, parent_C_user_id]")
        print("   • Makes querying co-parents much faster!")

    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
