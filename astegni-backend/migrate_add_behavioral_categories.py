"""
Database migration: Add behavioral category columns to student_reviews table

This migration adds the 4 behavioral categories requested by the user:
- subject_matter_expertise (maps to existing subject_understanding)
- communication_skills (new column)
- discipline (already exists)
- punctuality (already exists)

The rating column will be calculated as the average of these 4 categories.

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
        print("DATABASE MIGRATION: Add Behavioral Categories")
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

        # Check if communication_skills column already exists
        print("\n2. Checking if communication_skills column exists...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'student_reviews'
                AND column_name = 'communication_skills'
            );
        """)
        comm_skills_exists = cur.fetchone()[0]

        if comm_skills_exists:
            print("   [OK] communication_skills column already exists")
        else:
            print("   Adding communication_skills column...")
            cur.execute("""
                ALTER TABLE student_reviews
                ADD COLUMN communication_skills DECIMAL(2,1) DEFAULT 0.0;
            """)
            print("   [SUCCESS] communication_skills column added")

        # Check if subject_matter_expertise column already exists
        print("\n3. Checking if subject_matter_expertise column exists...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'student_reviews'
                AND column_name = 'subject_matter_expertise'
            );
        """)
        sme_exists = cur.fetchone()[0]

        if sme_exists:
            print("   [OK] subject_matter_expertise column already exists")
        else:
            print("   Adding subject_matter_expertise column...")
            cur.execute("""
                ALTER TABLE student_reviews
                ADD COLUMN subject_matter_expertise DECIMAL(2,1) DEFAULT 0.0;
            """)
            print("   [SUCCESS] subject_matter_expertise column added")

            # Copy data from subject_understanding to subject_matter_expertise
            print("   Copying data from subject_understanding to subject_matter_expertise...")
            cur.execute("""
                UPDATE student_reviews
                SET subject_matter_expertise = subject_understanding;
            """)
            print("   [SUCCESS] Data copied")

        conn.commit()

        # Verify the migration
        print("\n4. Verifying migration...")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'student_reviews'
            AND column_name IN ('subject_matter_expertise', 'communication_skills', 'discipline', 'punctuality')
            ORDER BY column_name;
        """)
        results = cur.fetchall()

        if len(results) == 4:
            print("   [OK] Verification successful: All 4 behavioral category columns exist")
            for col, dtype in results:
                print(f"      - {col}: {dtype}")
        else:
            print(f"   [ERROR] Verification failed! Only {len(results)} columns found")
            return

        print("\n" + "=" * 60)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nBehavioral categories available:")
        print("1. subject_matter_expertise (copied from subject_understanding)")
        print("2. communication_skills (new column, defaults to 0.0)")
        print("3. discipline (already existed)")
        print("4. punctuality (already existed)")
        print("\nNext steps:")
        print("1. Update backend code to calculate rating from these 4 columns")
        print("2. Create API endpoint /api/student/{student_id}/reviews")
        print("3. Update frontend to display behavioral categories")

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
