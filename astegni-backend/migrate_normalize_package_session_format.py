"""
Normalize session_format in tutor_packages table
- Ensures only single values: 'Online' or 'In-person'
- Converts 'None' strings to NULL
- Standardizes capitalization
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print('=== Normalizing Session Format in tutor_packages ===\n')

with engine.begin() as conn:
    # First, show current state
    result = conn.execute(text('''
        SELECT DISTINCT session_format, COUNT(*) as count
        FROM tutor_packages
        GROUP BY session_format
        ORDER BY session_format NULLS LAST
    '''))

    current_formats = result.fetchall()
    print('BEFORE Migration:')
    for fmt in current_formats:
        print(f'  "{fmt.session_format}": {fmt.count} packages')
    print()

    try:
        # 1. Convert string "None" to NULL
        result = conn.execute(text('''
            UPDATE tutor_packages
            SET session_format = NULL
            WHERE session_format = 'None'
            RETURNING id, tutor_id
        '''))
        none_fixed = result.fetchall()
        if none_fixed:
            print(f'[1] Converted {len(none_fixed)} "None" strings to NULL')
            for pkg in none_fixed:
                print(f'    Package {pkg.id} (Tutor {pkg.tutor_id})')

        # 2. Standardize 'online' -> 'Online'
        result = conn.execute(text('''
            UPDATE tutor_packages
            SET session_format = 'Online'
            WHERE LOWER(session_format) = 'online'
            AND session_format != 'Online'
            RETURNING id, tutor_id
        '''))
        online_fixed = result.fetchall()
        if online_fixed:
            print(f'[2] Standardized {len(online_fixed)} "online" to "Online"')
            for pkg in online_fixed:
                print(f'    Package {pkg.id} (Tutor {pkg.tutor_id})')

        # 3. Standardize 'in-person' variants -> 'In-person'
        result = conn.execute(text('''
            UPDATE tutor_packages
            SET session_format = 'In-person'
            WHERE (
                LOWER(session_format) = 'in-person'
                OR LOWER(session_format) = 'in person'
                OR LOWER(session_format) = 'inperson'
            )
            AND session_format != 'In-person'
            RETURNING id, tutor_id
        '''))
        inperson_fixed = result.fetchall()
        if inperson_fixed:
            print(f'[3] Standardized {len(inperson_fixed)} in-person variants to "In-person"')
            for pkg in inperson_fixed:
                print(f'    Package {pkg.id} (Tutor {pkg.tutor_id})')

        # 4. Handle comma-separated values (split into separate packages or take first)
        # For now, we'll just take the first value and warn
        result = conn.execute(text('''
            SELECT id, tutor_id, name, session_format
            FROM tutor_packages
            WHERE session_format LIKE '%,%'
        '''))
        multi_format_packages = result.fetchall()

        if multi_format_packages:
            print(f'[4] Found {len(multi_format_packages)} packages with comma-separated formats')
            print('    WARNING: These need manual review!')
            for pkg in multi_format_packages:
                formats = pkg.session_format.split(',')
                first_format = formats[0].strip()

                # Normalize the first format
                if first_format.lower() == 'online':
                    first_format = 'Online'
                elif first_format.lower() in ['in-person', 'in person']:
                    first_format = 'In-person'

                print(f'    Package {pkg.id} (Tutor {pkg.tutor_id}): "{pkg.session_format}"')
                print(f'      -> Will use: "{first_format}"')
                print(f'      -> RECOMMENDATION: Create separate package for other format')

                # Update to use only first format
                conn.execute(text('''
                    UPDATE tutor_packages
                    SET session_format = :format
                    WHERE id = :pkg_id
                '''), {'format': first_format, 'pkg_id': pkg.id})

        # 5. Handle 'both' format
        result = conn.execute(text('''
            SELECT id, tutor_id, name, session_format
            FROM tutor_packages
            WHERE LOWER(session_format) = 'both'
        '''))
        both_packages = result.fetchall()

        if both_packages:
            print(f'[5] Found {len(both_packages)} packages with "both" format')
            print('    Converting to "Online" (create separate package for In-person)')
            for pkg in both_packages:
                print(f'    Package {pkg.id} (Tutor {pkg.tutor_id}): "{pkg.session_format}"')
                print(f'      -> Converting to: "Online"')

                conn.execute(text('''
                    UPDATE tutor_packages
                    SET session_format = 'Online'
                    WHERE id = :pkg_id
                '''), {'pkg_id': pkg.id})

        print('\n[SUCCESS] All changes committed')

    except Exception as e:
        print(f'\n[ERROR] Migration failed: {e}')
        print('All changes will be rolled back')
        raise

    # Show final state
    result = conn.execute(text('''
        SELECT DISTINCT session_format, COUNT(*) as count
        FROM tutor_packages
        GROUP BY session_format
        ORDER BY session_format NULLS LAST
    '''))

    final_formats = result.fetchall()
    print('\nAFTER Migration:')
    for fmt in final_formats:
        print(f'  "{fmt.session_format}": {fmt.count} packages')

    # Show packages that still need attention
    result = conn.execute(text('''
        SELECT id, tutor_id, name, session_format
        FROM tutor_packages
        WHERE session_format IS NOT NULL
        AND session_format NOT IN ('Online', 'In-person')
        ORDER BY tutor_id, id
    '''))

    non_standard = result.fetchall()
    if non_standard:
        print('\n=== Non-standard values remaining ===')
        for pkg in non_standard:
            print(f'  Package {pkg.id} (Tutor {pkg.tutor_id}): "{pkg.session_format}"')
    else:
        print('\n=== All session formats are now standardized! ===')

print('\nMigration complete!')
