"""
Migration: Change coursework_answers and coursework_submissions to use student_profiles.id

This migration changes the student_id foreign key in:
- coursework_answers
- coursework_submissions

From referencing users.id to referencing student_profiles.id

This makes it consistent with courseworks.student_id which already uses student_profiles.id
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_db_connection():
    """Get database connection"""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def migrate():
    """Run the migration"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("=" * 60)
        print("Migration: coursework student_id to student_profiles.id")
        print("=" * 60)

        # Step 1: Check current state
        print("\n1. Checking current foreign key constraints...")

        cursor.execute("""
            SELECT tc.constraint_name, tc.table_name, kcu.column_name,
                   ccu.table_name AS foreign_table_name,
                   ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name IN ('coursework_answers', 'coursework_submissions')
              AND kcu.column_name = 'student_id'
        """)

        constraints = cursor.fetchall()
        print(f"   Found {len(constraints)} foreign key constraints on student_id:")
        for c in constraints:
            print(f"   - {c['table_name']}.{c['column_name']} -> {c['foreign_table_name']}.{c['foreign_column_name']} ({c['constraint_name']})")

        # Step 2: Update existing data - convert users.id to student_profiles.id
        print("\n2. Updating existing data...")

        # Update coursework_answers
        cursor.execute("""
            SELECT COUNT(*) as count FROM coursework_answers
        """)
        answers_count = cursor.fetchone()['count']
        print(f"   coursework_answers has {answers_count} records")

        if answers_count > 0:
            print("   Converting student_id from users.id to student_profiles.id in coursework_answers...")
            cursor.execute("""
                UPDATE coursework_answers ca
                SET student_id = sp.id
                FROM student_profiles sp
                WHERE ca.student_id = sp.user_id
            """)
            print(f"   Updated {cursor.rowcount} rows in coursework_answers")

        # Update coursework_submissions
        cursor.execute("""
            SELECT COUNT(*) as count FROM coursework_submissions
        """)
        submissions_count = cursor.fetchone()['count']
        print(f"   coursework_submissions has {submissions_count} records")

        if submissions_count > 0:
            print("   Converting student_id from users.id to student_profiles.id in coursework_submissions...")
            cursor.execute("""
                UPDATE coursework_submissions cs
                SET student_id = sp.id
                FROM student_profiles sp
                WHERE cs.student_id = sp.user_id
            """)
            print(f"   Updated {cursor.rowcount} rows in coursework_submissions")

        # Step 3: Drop old foreign key constraints
        print("\n3. Dropping old foreign key constraints...")

        for c in constraints:
            print(f"   Dropping {c['constraint_name']}...")
            cursor.execute(f"ALTER TABLE {c['table_name']} DROP CONSTRAINT IF EXISTS {c['constraint_name']}")

        # Step 4: Add new foreign key constraints referencing student_profiles
        print("\n4. Adding new foreign key constraints to student_profiles...")

        # For coursework_answers
        print("   Adding FK on coursework_answers.student_id -> student_profiles.id...")
        cursor.execute("""
            ALTER TABLE coursework_answers
            ADD CONSTRAINT coursework_answers_student_id_fkey
            FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        """)

        # For coursework_submissions
        print("   Adding FK on coursework_submissions.student_id -> student_profiles.id...")
        cursor.execute("""
            ALTER TABLE coursework_submissions
            ADD CONSTRAINT coursework_submissions_student_id_fkey
            FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        """)

        # Step 5: Verify new constraints
        print("\n5. Verifying new constraints...")

        cursor.execute("""
            SELECT tc.constraint_name, tc.table_name, kcu.column_name,
                   ccu.table_name AS foreign_table_name,
                   ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name IN ('coursework_answers', 'coursework_submissions')
              AND kcu.column_name = 'student_id'
        """)

        new_constraints = cursor.fetchall()
        print(f"   New foreign key constraints:")
        for c in new_constraints:
            print(f"   - {c['table_name']}.{c['column_name']} -> {c['foreign_table_name']}.{c['foreign_column_name']} ({c['constraint_name']})")

        # Commit the transaction
        conn.commit()

        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
        print("\nSummary:")
        print("- coursework_answers.student_id now references student_profiles.id")
        print("- coursework_submissions.student_id now references student_profiles.id")
        print("- This is now consistent with courseworks.student_id")

    except Exception as e:
        conn.rollback()
        print(f"\nError during migration: {e}")
        print("Migration rolled back.")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
