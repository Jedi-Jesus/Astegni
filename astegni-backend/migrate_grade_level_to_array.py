"""
Migrate tutor_packages.grade_level from VARCHAR to TEXT[] array
- Converts comma-separated strings to arrays
- Handles single values
- Converts NULL/empty to empty array
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print('=== Migrating grade_level to Array in tutor_packages ===\n')

with engine.begin() as conn:
    # Show current state
    result = conn.execute(text('''
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'tutor_packages' AND column_name = 'grade_level'
    '''))

    col_info = result.fetchone()
    print('BEFORE Migration:')
    print(f'  Column: {col_info.column_name}')
    print(f'  Data Type: {col_info.data_type}')
    print()

    # Check current data
    result = conn.execute(text('''
        SELECT id, tutor_id, grade_level
        FROM tutor_packages
        ORDER BY id
    '''))

    current_data = result.fetchall()
    print('Current Data:')
    for pkg in current_data:
        print(f'  Package {pkg.id}: "{pkg.grade_level}"')
    print()

    try:
        # Step 1: Create a temporary column for the array data
        print('[1] Creating temporary array column...')
        conn.execute(text('''
            ALTER TABLE tutor_packages
            ADD COLUMN grade_level_array TEXT[]
        '''))
        print('    [OK] Temporary column created')

        # Step 2: Migrate data from VARCHAR to array
        print('[2] Migrating data to array format...')

        # Handle NULL and empty strings -> empty array
        result = conn.execute(text('''
            UPDATE tutor_packages
            SET grade_level_array = ARRAY[]::TEXT[]
            WHERE grade_level IS NULL OR grade_level = ''
            RETURNING id
        '''))
        null_count = len(result.fetchall())
        if null_count > 0:
            print(f'    [OK] Converted {null_count} NULL/empty values to empty array')

        # Handle comma-separated values -> array
        result = conn.execute(text('''
            UPDATE tutor_packages
            SET grade_level_array = string_to_array(grade_level, ',')
            WHERE grade_level IS NOT NULL
            AND grade_level != ''
            AND grade_level LIKE '%,%'
            RETURNING id, grade_level, grade_level_array
        '''))
        comma_sep = result.fetchall()
        if comma_sep:
            print(f'    [OK] Converted {len(comma_sep)} comma-separated values:')
            for pkg in comma_sep:
                print(f'      Package {pkg.id}: "{pkg.grade_level}" -> {pkg.grade_level_array}')

        # Handle single values -> array with one element
        result = conn.execute(text('''
            UPDATE tutor_packages
            SET grade_level_array = ARRAY[grade_level]::TEXT[]
            WHERE grade_level IS NOT NULL
            AND grade_level != ''
            AND grade_level NOT LIKE '%,%'
            AND grade_level_array IS NULL
            RETURNING id, grade_level, grade_level_array
        '''))
        single_vals = result.fetchall()
        if single_vals:
            print(f'    [OK] Converted {len(single_vals)} single values:')
            for pkg in single_vals:
                print(f'      Package {pkg.id}: "{pkg.grade_level}" -> {pkg.grade_level_array}')

        # Step 3: Drop old column
        print('[3] Dropping old VARCHAR column...')
        conn.execute(text('''
            ALTER TABLE tutor_packages
            DROP COLUMN grade_level
        '''))
        print('    [OK] Old column dropped')

        # Step 4: Rename new column to grade_level
        print('[4] Renaming new column to grade_level...')
        conn.execute(text('''
            ALTER TABLE tutor_packages
            RENAME COLUMN grade_level_array TO grade_level
        '''))
        print('    [OK] Column renamed')

        # Step 5: Trim whitespace from array elements
        print('[5] Cleaning up array elements (trim whitespace)...')
        conn.execute(text('''
            UPDATE tutor_packages
            SET grade_level = (
                SELECT ARRAY_AGG(TRIM(elem))
                FROM unnest(grade_level) AS elem
                WHERE TRIM(elem) != ''
            )
            WHERE grade_level IS NOT NULL
            AND array_length(grade_level, 1) > 0
        '''))
        print('    [OK] Whitespace trimmed')

        print('\n[SUCCESS] Migration completed successfully!')

    except Exception as e:
        print(f'\n[ERROR] Migration failed: {e}')
        print('All changes will be rolled back')
        raise

    # Show final state
    print('\nAFTER Migration:')
    result = conn.execute(text('''
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'tutor_packages' AND column_name = 'grade_level'
    '''))

    col_info = result.fetchone()
    print(f'  Column: {col_info.column_name}')
    print(f'  Data Type: {col_info.data_type}')
    print(f'  UDT Name: {col_info.udt_name}')
    print()

    # Show migrated data
    result = conn.execute(text('''
        SELECT id, tutor_id, grade_level
        FROM tutor_packages
        ORDER BY id
    '''))

    packages = result.fetchall()
    print('Final Data:')
    for pkg in packages:
        print(f'  Package {pkg.id}: {pkg.grade_level}')

print('\nMigration complete!')
