"""
Fix quote column in student_profiles table
"""

import psycopg
from psycopg.rows import dict_row
import os
import sys
from dotenv import load_dotenv

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        print("🔧 Fixing quote column...")

        # Drop the quote column
        cur.execute("""
            ALTER TABLE student_profiles
            DROP COLUMN IF EXISTS quote CASCADE
        """)

        # Recreate as TEXT[] array
        cur.execute("""
            ALTER TABLE student_profiles
            ADD COLUMN quote TEXT[] DEFAULT '{}'
        """)

        # Create all indexes
        indexes = [
            ('idx_student_profiles_user_id', 'student_profiles', 'user_id'),
            ('idx_student_profiles_username', 'student_profiles', 'username'),
            ('idx_student_overall_progress_student_id', 'student_overall_progress', 'student_id'),
            ('idx_student_guardian_student_id', 'student_guardian', 'student_id'),
            ('idx_student_courses_student_id', 'student_courses', 'student_id'),
            ('idx_student_courses_tutor_id', 'student_courses', 'tutor_id'),
            ('idx_student_courses_status', 'student_courses', 'status')
        ]

        for idx_name, table_name, column_name in indexes:
            try:
                cur.execute(f"""
                    CREATE INDEX IF NOT EXISTS {idx_name}
                    ON {table_name} ({column_name})
                """)
                print(f"  ✓ Created index: {idx_name}")
            except Exception as e:
                print(f"  ⚠️ Could not create index {idx_name}: {str(e)}")

        conn.commit()
        print("✅ Quote column fixed and indexes created!")
