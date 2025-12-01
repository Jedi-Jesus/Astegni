"""
Migration: Remove coparent_ids from parent_profiles
- Remove: coparent_ids array (redundant - can be derived from children's parent_id arrays)

REASONING:
Co-parent relationships are already stored in student_profiles.parent_id arrays.
No need to duplicate this data in parent_profiles.coparent_ids.

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
        print("🚀 Starting Remove coparent_ids Migration...")

        # Remove coparent_ids from parent_profiles
        print("\n📝 Removing coparent_ids from parent_profiles...")
        db.execute(text("ALTER TABLE parent_profiles DROP COLUMN IF EXISTS coparent_ids;"))
        print("   ✅ Removed coparent_ids column")

        # Commit changes
        db.commit()

        print("\n✨ Migration completed successfully!")
        print("\n📊 Summary:")
        print("   • Removed: coparent_ids array from parent_profiles")
        print("\n🎯 Why This Is Better:")
        print("   • No data duplication")
        print("   • Single source of truth: student_profiles.parent_id")
        print("   • Co-parents can still be found via children's parent_id arrays")
        print("\n💡 To Find Co-Parents:")
        print("   1. Get parent's children_ids")
        print("   2. Query children's parent_id arrays")
        print("   3. Extract unique parent IDs (excluding current parent)")

    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
