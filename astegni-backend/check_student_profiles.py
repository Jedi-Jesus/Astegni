"""Check student_profiles table structure"""
import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        # Check student_profiles columns
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'student_profiles'
            ORDER BY ordinal_position
        """)
        rows = cur.fetchall()

        print("\n" + "="*70)
        print("STUDENT_PROFILES TABLE STRUCTURE")
        print("="*70)
        print(f"{'Column Name':<30} {'Data Type':<25} {'Nullable'}")
        print("-"*70)

        for row in rows:
            print(f"{row['column_name']:<30} {row['data_type']:<25} {row['is_nullable']}")

        print("="*70)
        print(f"Total columns: {len(rows)}")

        # Check for new columns
        new_columns = ['hero_title', 'hero_subtitle', 'interested_in', 'hobbies',
                      'languages', 'learning_method', 'studying_at', 'about', 'quote']

        found_new_cols = [row['column_name'] for row in rows if row['column_name'] in new_columns]

        print("\n" + "="*70)
        print("NEW COLUMNS STATUS")
        print("="*70)
        for col in new_columns:
            status = "✅ EXISTS" if col in found_new_cols else "❌ MISSING"
            print(f"{col:<30} {status}")

        # Check new tables
        print("\n" + "="*70)
        print("NEW TABLES STATUS")
        print("="*70)

        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('student_overall_progress', 'student_guardian', 'student_courses')
        """)
        tables = cur.fetchall()

        new_tables = ['student_overall_progress', 'student_guardian', 'student_courses']
        found_tables = [t['table_name'] for t in tables]

        for table in new_tables:
            status = "✅ EXISTS" if table in found_tables else "❌ MISSING"
            print(f"{table:<30} {status}")

        print("="*70 + "\n")
