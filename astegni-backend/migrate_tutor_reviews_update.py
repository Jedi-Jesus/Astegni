"""
Migration: Update tutor_reviews table structure
- Rename student_id to reviewer_id
- Add user_role column
- Remove session_id column
- reviewer_id references student_profiles, tutor_profiles, or parent_profiles based on user_role
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# Get database URL and convert for psycopg3
database_url = os.getenv('DATABASE_URL')
if database_url.startswith('postgresql://'):
    database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)

engine = create_engine(database_url)

def run_migration():
    """Run the migration to update tutor_reviews table"""
    with engine.connect() as conn:
        print("Starting tutor_reviews table migration...")

        try:
            # Step 1: Add user_role column
            print("Adding user_role column...")
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                ADD COLUMN IF NOT EXISTS user_role VARCHAR(20);
            """))
            conn.commit()
            print("[OK] user_role column added")

            # Step 2: Set default user_role to 'student' for existing records
            print("Setting default user_role for existing records...")
            conn.execute(text("""
                UPDATE tutor_reviews
                SET user_role = 'student'
                WHERE user_role IS NULL;
            """))
            conn.commit()
            print("[OK] Default user_role set to 'student'")

            # Step 3: Rename student_id to reviewer_id
            print("Renaming student_id to reviewer_id...")
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                RENAME COLUMN student_id TO reviewer_id;
            """))
            conn.commit()
            print("[OK] student_id renamed to reviewer_id")

            # Step 4: Drop session_id column
            print("Dropping session_id column...")
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                DROP COLUMN IF EXISTS session_id;
            """))
            conn.commit()
            print("[OK] session_id column dropped")

            # Step 5: Add NOT NULL constraint to user_role
            print("Adding NOT NULL constraint to user_role...")
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                ALTER COLUMN user_role SET NOT NULL;
            """))
            conn.commit()
            print("[OK] user_role set to NOT NULL")

            # Step 6: Add check constraint for user_role
            print("Adding check constraint for user_role...")
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                DROP CONSTRAINT IF EXISTS check_user_role;
            """))
            conn.execute(text("""
                ALTER TABLE tutor_reviews
                ADD CONSTRAINT check_user_role
                CHECK (user_role IN ('student', 'tutor', 'parent'));
            """))
            conn.commit()
            print("[OK] Check constraint added for user_role")

            print("\n[SUCCESS] Migration completed successfully!")
            print("\nNew tutor_reviews table structure:")
            print("- reviewer_id (INTEGER) - References student_profiles, tutor_profiles, or parent_profiles")
            print("- user_role (VARCHAR) - 'student', 'tutor', or 'parent'")
            print("- session_id (REMOVED)")

            # Verify the migration
            print("\nVerifying migration...")
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'tutor_reviews'
                ORDER BY ordinal_position;
            """))
            print("\nCurrent columns:")
            for row in result:
                print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")

        except Exception as e:
            print(f"\n[ERROR] Migration failed: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    run_migration()
