"""
Add discount_12_month column to tutor_packages table
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
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print('Adding discount_12_month column to tutor_packages table...')

        # Add the column if it doesn't exist
        cur.execute("""
            ALTER TABLE tutor_packages
            ADD COLUMN IF NOT EXISTS discount_12_month DECIMAL(5,2) DEFAULT 0
        """)

        conn.commit()
        print('✅ Successfully added discount_12_month column!')

        # Verify the column was added
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
            AND column_name LIKE 'discount%'
            ORDER BY column_name
        """)

        print('\nDiscount columns in tutor_packages:')
        for row in cur.fetchall():
            print(f'  - {row[0]}: {row[1]}')

    except Exception as e:
        print(f'❌ Error: {e}')
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
