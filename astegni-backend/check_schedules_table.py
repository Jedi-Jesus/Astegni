import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.py modules'))
from config import DATABASE_URL
from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    # Check if table exists
    result = conn.execute(text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'tutor_schedules'
        ORDER BY ordinal_position
    """))
    columns = list(result)

    if columns:
        print('tutor_schedules table exists with columns:')
        for col_name, col_type in columns:
            print(f'  - {col_name}: {col_type}')
    else:
        print('tutor_schedules table does not exist')

    # Try to drop and recreate if it's incomplete
    if columns and len(columns) < 10:  # Should have more columns
        print('\nTable seems incomplete. Dropping and will recreate...')
        conn.execute(text('DROP TABLE IF EXISTS tutor_schedules CASCADE'))
        conn.commit()
        print('Table dropped successfully.')
