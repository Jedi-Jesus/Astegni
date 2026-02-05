"""
Find all tutors with NULL or empty session formats
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print('=== Finding Tutors with NULL/Empty Session Formats ===\n')

with engine.connect() as conn:
    # Get ALL tutors (active and inactive) with their session formats
    result = conn.execute(text('''
        SELECT
            t.id as tutor_id,
            t.is_active,
            u.email,
            u.first_name,
            COUNT(tp.id) as package_count,
            ARRAY_AGG(tp.session_format) as all_session_formats,
            ARRAY_AGG(DISTINCT tp.session_format) FILTER
                (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as valid_session_formats
        FROM tutor_profiles t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN tutor_packages tp ON tp.tutor_id = t.id
        GROUP BY t.id, t.is_active, u.email, u.first_name
        ORDER BY t.id
    '''))

    tutors = result.fetchall()

    print(f'Found {len(tutors)} total tutors\n')

    issues_found = 0

    for row in tutors:
        valid_formats = row.valid_session_formats or []
        all_formats = row.all_session_formats or []

        # Check if there are any NULL or empty formats
        has_null_formats = None in all_formats or '' in all_formats or (row.package_count > 0 and not valid_formats)

        if has_null_formats:
            issues_found += 1
            print(f'[ISSUE] Tutor {row.tutor_id} ({row.email}):')
            print(f'        Active: {row.is_active}')
            print(f'        Packages: {row.package_count}')
            print(f'        All formats in DB: {all_formats}')
            print(f'        Valid formats: {valid_formats}')
            print(f'        Backend will send: {"None (null)" if not valid_formats else valid_formats}')
            print(f'        Frontend should show: {"Not specified" if not valid_formats else valid_formats}')
            print()

    if issues_found == 0:
        print('[OK] No tutors found with NULL or empty session formats!')
        print()
        print('Checking if there might be a different issue...')
        print()

        # Show what each tutor SHOULD display
        print('=== Expected Display for All Tutors ===\n')
        for row in tutors:
            valid_formats = row.valid_session_formats or []

            if not valid_formats:
                display = "None (frontend shows: Not specified)"
            elif len(valid_formats) == 1:
                display = valid_formats[0]
            elif 'Online' in valid_formats and 'In-person' in valid_formats:
                display = "Hybrid"
            else:
                display = "multiple"

            print(f'Tutor {row.tutor_id} ({row.email}): {display}')
    else:
        print(f'\n[SUMMARY] Found {issues_found} tutors with NULL/empty session formats')
