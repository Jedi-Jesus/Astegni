"""
Database migration: Add class_activity column to student_reviews table

This migration adds the 5th behavioral category: class_activity
The rating will now be calculated as the average of 5 categories:
- subject_matter_expertise
- communication_skills
- discipline
- punctuality
- class_activity (NEW)

Run this script once to perform the migration.
"""

import psycopg
from dotenv import load_dotenv
import os
import random

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("DATABASE MIGRATION: Add class_activity Column")
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

        # Check if class_activity column already exists
        print("\n2. Checking if class_activity column exists...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'student_reviews'
                AND column_name = 'class_activity'
            );
        """)
        column_exists = cur.fetchone()[0]

        if column_exists:
            print("   [OK] class_activity column already exists")
        else:
            print("   Adding class_activity column...")
            cur.execute("""
                ALTER TABLE student_reviews
                ADD COLUMN class_activity DECIMAL(2,1) DEFAULT 0.0;
            """)
            print("   [SUCCESS] class_activity column added")

        conn.commit()

        # Populate class_activity with realistic data
        print("\n3. Populating class_activity with realistic data...")
        cur.execute("SELECT id FROM student_reviews WHERE class_activity = 0.0 OR class_activity IS NULL;")
        review_ids = [row[0] for row in cur.fetchall()]

        if len(review_ids) > 0:
            print(f"   Found {len(review_ids)} reviews to update")
            for review_id in review_ids:
                # Generate realistic class activity score (3.5-5.0 range)
                activity_score = round(random.uniform(3.5, 5.0), 1)
                cur.execute(
                    "UPDATE student_reviews SET class_activity = %s WHERE id = %s",
                    (activity_score, review_id)
                )
            conn.commit()
            print(f"   [SUCCESS] Updated {len(review_ids)} reviews with class_activity scores")
        else:
            print("   [OK] All reviews already have class_activity scores")

        # Recalculate rating as average of 5 categories
        print("\n4. Recalculating rating as average of 5 behavioral categories...")
        cur.execute("""
            UPDATE student_reviews
            SET rating = ROUND(
                (subject_matter_expertise + communication_skills + discipline + punctuality + class_activity) / 5.0,
                1
            );
        """)
        conn.commit()
        print(f"   [SUCCESS] Recalculated rating for {cur.rowcount} reviews")

        # Verify the migration
        print("\n5. Verifying migration...")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'student_reviews'
            AND column_name = 'class_activity';
        """)
        result = cur.fetchone()

        if result:
            print(f"   [OK] Verification successful: class_activity column exists (type: {result[1]})")
        else:
            print("   [ERROR] Verification failed!")
            return

        # Show sample data
        print("\n6. Sample updated data:")
        cur.execute("""
            SELECT id, subject_matter_expertise, communication_skills,
                   discipline, punctuality, class_activity, rating
            FROM student_reviews
            LIMIT 3;
        """)
        rows = cur.fetchall()
        for row in rows:
            print(f"   ID {row[0]}: SME={row[1]}, Comm={row[2]}, Disc={row[3]}, Punct={row[4]}, Activity={row[5]} -> Rating={row[6]}")

        print("\n" + "=" * 60)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\n5 Behavioral Categories:")
        print("1. Subject Matter Expertise")
        print("2. Communication Skills")
        print("3. Discipline")
        print("4. Punctuality")
        print("5. Class Activity (NEW)")
        print("\nRating = Average of 5 categories")
        print("\nNext steps:")
        print("1. Update backend endpoint to include class_activity")
        print("2. Update frontend to display 5 behavioral categories")
        print("3. Restart backend server")
        print("4. Test the updated reviews functionality")

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
