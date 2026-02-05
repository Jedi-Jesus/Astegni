"""
Check which tutors are showing incorrect session format
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print('=== Checking Session Format Display Issue ===\n')

with engine.connect() as conn:
    # Get all tutors with their session formats
    result = conn.execute(text('''
        SELECT
            t.id as tutor_id,
            u.email,
            u.first_name,
            COUNT(tp.id) as package_count,
            ARRAY_AGG(DISTINCT tp.session_format) FILTER
                (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as session_formats
        FROM tutor_profiles t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN tutor_packages tp ON tp.tutor_id = t.id
        WHERE t.is_active = true
        GROUP BY t.id, u.email, u.first_name
        ORDER BY t.id
    '''))

    tutors = result.fetchall()

    print(f'Found {len(tutors)} active tutors\n')

    for row in tutors:
        formats = row.session_formats or []

        # Determine what backend SHOULD send
        if not formats:
            expected_display = 'None (frontend shows: "Not specified")'
            status = '[ISSUE?]' if False else '[OK]'
        elif len(formats) == 1:
            expected_display = formats[0]
            status = '[OK]'
        elif 'Online' in formats and 'In-person' in formats:
            expected_display = 'Hybrid'
            status = '[OK]'
        else:
            expected_display = 'multiple'
            status = '[OK]'

        print(f'{status} Tutor {row.tutor_id} ({row.email}):')
        print(f'     Packages: {row.package_count}')
        print(f'     Formats in DB: {formats}')
        print(f'     Backend should send: {expected_display}')

        # Check if this might be the problematic one
        if not formats and row.package_count > 0:
            print(f'     [WARNING] Has packages but no session_format!')

        print()
