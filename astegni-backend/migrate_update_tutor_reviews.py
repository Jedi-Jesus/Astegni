"""
Database migration to update tutor_reviews table:
1. Rename subject_matter_rating to subject_understanding_rating
2. Remove retention_rating field
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def migrate_tutor_reviews():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("Starting tutor_reviews table migration...")

            # Step 1: Rename subject_matter_rating to subject_understanding_rating
            print("1. Renaming subject_matter_rating to subject_understanding_rating...")
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                RENAME COLUMN subject_matter_rating TO subject_understanding_rating;
            """))
            print("   [OK] Column renamed successfully")

            # Step 2: Remove retention_rating column
            print("2. Removing retention_rating column...")
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                DROP COLUMN IF EXISTS retention_rating;
            """))
            print("   [OK] Column removed successfully")

            # Commit transaction
            trans.commit()
            print("\n[SUCCESS] Migration completed successfully!")
            print("\nUpdated tutor_reviews table structure:")
            print("  - subject_understanding_rating (renamed from subject_matter_rating)")
            print("  - retention_rating (REMOVED)")
            print("  - discipline_rating (unchanged)")
            print("  - punctuality_rating (unchanged)")
            print("  - communication_rating (unchanged)")

        except Exception as e:
            trans.rollback()
            print(f"\n[ERROR] Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    migrate_tutor_reviews()
