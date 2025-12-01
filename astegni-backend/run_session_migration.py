"""
Simple migration runner for adding session fields
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print('Step 1: Adding session_frequency column...')
        cur.execute('ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS session_frequency VARCHAR(50)')
        conn.commit()
        print('  Done')

        print('Step 2: Adding is_recurring column...')
        cur.execute('ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN')
        conn.commit()
        print('  Done')

        print('Step 3: Adding recurring_pattern column...')
        cur.execute('ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS recurring_pattern JSON')
        conn.commit()
        print('  Done')

        print('Step 4: Adding package_duration column...')
        cur.execute('ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS package_duration INTEGER')
        conn.commit()
        print('  Done')

        print('Step 5: Adding grade_level column...')
        cur.execute('ALTER TABLE tutoring_sessions ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50)')
        conn.commit()
        print('  Done')

        print('\nSUCCESS: All columns added to tutoring_sessions table')

        # Show the updated structure
        print('\nUpdated table structure:')
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutoring_sessions'
            ORDER BY ordinal_position
        """)
        for row in cur.fetchall():
            print(f'  - {row[0]}: {row[1]}')

    except Exception as e:
        print(f'ERROR: {e}')
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    run_migration()
