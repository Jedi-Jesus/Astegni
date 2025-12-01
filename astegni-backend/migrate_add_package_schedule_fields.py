"""
Migration: Add Schedule and Session Format Fields to Tutor Packages
Adds new fields for session format, schedule type, and scheduling details
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Fix Unicode output for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Add schedule and session format fields to tutor_packages table"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print('Starting migration: Add package schedule fields...')

        # Check if columns already exist
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
            AND column_name IN (
                'session_format', 'schedule_type', 'schedule_days',
                'start_time', 'end_time', 'start_date', 'end_date',
                'session_time', 'session_duration'
            )
        """)
        existing_columns = [row[0] for row in cur.fetchall()]

        if existing_columns:
            print(f'Found existing columns: {", ".join(existing_columns)}')

        # Add session_format column
        if 'session_format' not in existing_columns:
            print('Adding session_format column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN session_format VARCHAR(255)
            """)
            print('  - session_format column added')
        else:
            print('  - session_format column already exists')

        # Add schedule_type column
        if 'schedule_type' not in existing_columns:
            print('Adding schedule_type column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN schedule_type VARCHAR(20) DEFAULT 'recurring'
            """)
            print('  - schedule_type column added (default: recurring)')
        else:
            print('  - schedule_type column already exists')

        # Add schedule_days column
        if 'schedule_days' not in existing_columns:
            print('Adding schedule_days column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN schedule_days TEXT
            """)
            print('  - schedule_days column added')
        else:
            print('  - schedule_days column already exists')

        # Add start_time column
        if 'start_time' not in existing_columns:
            print('Adding start_time column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN start_time TIME
            """)
            print('  - start_time column added')
        else:
            print('  - start_time column already exists')

        # Add end_time column
        if 'end_time' not in existing_columns:
            print('Adding end_time column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN end_time TIME
            """)
            print('  - end_time column added')
        else:
            print('  - end_time column already exists')

        # Add start_date column
        if 'start_date' not in existing_columns:
            print('Adding start_date column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN start_date DATE
            """)
            print('  - start_date column added')
        else:
            print('  - start_date column already exists')

        # Add end_date column
        if 'end_date' not in existing_columns:
            print('Adding end_date column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN end_date DATE
            """)
            print('  - end_date column added')
        else:
            print('  - end_date column already exists')

        # Add session_time column
        if 'session_time' not in existing_columns:
            print('Adding session_time column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN session_time TIME
            """)
            print('  - session_time column added')
        else:
            print('  - session_time column already exists')

        # Add session_duration column
        if 'session_duration' not in existing_columns:
            print('Adding session_duration column...')
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN session_duration DECIMAL(3,1)
            """)
            print('  - session_duration column added')
        else:
            print('  - session_duration column already exists')

        conn.commit()

        # Verify the changes
        print('\nVerifying column additions...')
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
            AND column_name IN (
                'session_format', 'schedule_type', 'schedule_days',
                'start_time', 'end_time', 'start_date', 'end_date',
                'session_time', 'session_duration'
            )
            ORDER BY column_name
        """)

        print('\nNew columns in tutor_packages:')
        print('-' * 80)
        print(f'{"Column Name":<25} {"Data Type":<25} {"Default":<30}')
        print('-' * 80)
        for row in cur.fetchall():
            column_name = row[0]
            data_type = row[1]
            default = row[2] if row[2] else 'NULL'
            print(f'{column_name:<25} {data_type:<25} {default:<30}')
        print('-' * 80)

        # Show total columns
        cur.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
        """)
        total_columns = cur.fetchone()[0]
        print(f'\nTotal columns in tutor_packages: {total_columns}')

        print('\nMigration completed successfully!')

    except Exception as e:
        print(f'ERROR: Migration failed: {e}')
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
