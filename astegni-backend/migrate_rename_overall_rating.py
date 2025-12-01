"""
Database migration: Rename overall_rating to rating in student_reviews table

This migration renames the 'overall_rating' column to 'rating' to better reflect
that the rating is calculated as the average of the 4 behavioral categories.

Run this script once to perform the migration.
"""

import psycopg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("DATABASE MIGRATION: Rename overall_rating to rating")
        print("=" * 60)

        # Check if student_reviews table exists
        print("\n1. Checking if student_reviews table exists...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'student_reviews'
            );
        """)
        table_exists = cur.fetchone()[0]

        if not table_exists:
            print("   [ERROR] student_reviews table does not exist!")
            print("   Please create the table first.")
            return

        print("   [OK] Table exists")

        # Check if overall_rating column exists
        print("\n2. Checking if overall_rating column exists...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'student_reviews'
                AND column_name = 'overall_rating'
            );
        """)
        column_exists = cur.fetchone()[0]

        if not column_exists:
            print("   [WARNING] Column 'overall_rating' does not exist.")
            print("   Checking if 'rating' column already exists...")

            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'student_reviews'
                    AND column_name = 'rating'
                );
            """)
            rating_exists = cur.fetchone()[0]

            if rating_exists:
                print("   [OK] Migration already completed (rating column exists)")
                return
            else:
                print("   [ERROR] Neither 'overall_rating' nor 'rating' column exists!")
                return

        print("   [OK] Column 'overall_rating' exists")

        # Perform the migration
        print("\n3. Renaming column overall_rating to rating...")
        cur.execute("""
            ALTER TABLE student_reviews
            RENAME COLUMN overall_rating TO rating;
        """)

        conn.commit()
        print("   [SUCCESS] Column renamed successfully!")

        # Verify the migration
        print("\n4. Verifying migration...")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'student_reviews'
            AND column_name = 'rating';
        """)
        result = cur.fetchone()

        if result:
            print(f"   [OK] Verification successful: rating column exists (type: {result[1]})")
        else:
            print("   [ERROR] Verification failed!")
            return

        print("\n" + "=" * 60)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Update backend code to use 'rating' instead of 'overall_rating'")
        print("2. Update frontend code to fetch and calculate ratings")
        print("3. Test the student reviews functionality")

    except Exception as e:
        print(f"\n[ERROR] ERROR during migration: {e}")
        print("\nRolling back changes...")
        conn.rollback()
        print("[SUCCESS] Rollback completed")

    finally:
        cur.close()
        conn.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    migrate()
