"""
Migration: Add trending/popularity tracking fields to tutor_profiles table

This migration adds:
- search_count: Total number of times this tutor has been searched/viewed
- trending_score: Calculated score based on recent searches (time-weighted)
- last_search_increment: Last time the search count was incremented
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

def migrate():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("MIGRATION: Add Trending Fields to tutor_profiles")
        print("=" * 60)

        # Add trending fields to tutor_profiles table
        migrations = [
            {
                "name": "Add search_count column",
                "query": """
                    ALTER TABLE tutor_profiles
                    ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0
                """
            },
            {
                "name": "Add trending_score column",
                "query": """
                    ALTER TABLE tutor_profiles
                    ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0.0
                """
            },
            {
                "name": "Add last_search_increment column",
                "query": """
                    ALTER TABLE tutor_profiles
                    ADD COLUMN IF NOT EXISTS last_search_increment TIMESTAMP
                """
            },
            {
                "name": "Create index on search_count",
                "query": """
                    CREATE INDEX IF NOT EXISTS idx_tutor_search_count
                    ON tutor_profiles(search_count DESC)
                """
            },
            {
                "name": "Create index on trending_score",
                "query": """
                    CREATE INDEX IF NOT EXISTS idx_tutor_trending_score
                    ON tutor_profiles(trending_score DESC)
                """
            }
        ]

        for migration in migrations:
            print(f"\n{migration['name']}...")
            try:
                db.execute(text(migration['query']))
                db.commit()
                print(f"✓ {migration['name']} - SUCCESS")
            except Exception as e:
                print(f"✗ {migration['name']} - FAILED: {str(e)}")
                db.rollback()

        print("\n" + "=" * 60)
        print("Migration completed!")
        print("=" * 60)

        # Verify the changes
        print("\nVerifying tutor_profiles table structure...")
        result = db.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name IN ('search_count', 'trending_score', 'last_search_increment')
            ORDER BY column_name
        """))

        columns = result.fetchall()
        if columns:
            print("\nNew columns added:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (default: {col[2]})")
        else:
            print("\n⚠️ Warning: Could not verify new columns")

    except Exception as e:
        print(f"\n✗ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
