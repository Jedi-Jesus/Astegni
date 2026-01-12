"""
Test Platform Reviews Endpoints
Quick test to verify the clean schema is working
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def test_table_structure():
    """Verify the astegni_reviews table structure"""

    ADMIN_DATABASE_URL = os.getenv(
        'ADMIN_DATABASE_URL',
        'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
    )

    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    print('Testing astegni_reviews table structure...\n')

    try:
        # Get table columns
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'astegni_reviews'
            ORDER BY ordinal_position;
        """)

        columns = cursor.fetchall()

        print(f'Total columns: {len(columns)}\n')
        print('Column Structure:')
        print('-' * 80)

        expected_columns = [
            'id', 'reviewer_id', 'reviewer_role', 'rating',
            'ease_of_use', 'features_quality', 'support_quality', 'overall_value',
            'review_text', 'would_recommend', 'is_featured', 'count',
            'created_at', 'updated_at'
        ]

        actual_columns = []
        for col in columns:
            col_name = col[0]
            actual_columns.append(col_name)
            nullable = 'NULL' if col[2] == 'YES' else 'NOT NULL'
            print(f'  {col_name:20} {col[1]:25} {nullable:10}')

        print('\n' + '-' * 80)

        # Verify expected columns
        print('\nColumn Verification:')
        missing = set(expected_columns) - set(actual_columns)
        extra = set(actual_columns) - set(expected_columns)

        if not missing and not extra:
            print('  [OK] All expected columns present!')
            print('  [OK] No unexpected columns!')
        else:
            if missing:
                print(f'  [ERROR] Missing columns: {missing}')
            if extra:
                print(f'  [WARN] Extra columns: {extra}')

        # Check indexes
        print('\nIndexes:')
        cursor.execute("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'astegni_reviews';
        """)

        indexes = cursor.fetchall()
        for idx in indexes:
            print(f'  - {idx[0]}')

        # Check constraints
        print('\nConstraints:')
        cursor.execute("""
            SELECT conname, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'astegni_reviews'::regclass;
        """)

        constraints = cursor.fetchall()
        for const in constraints:
            print(f'  - {const[0]}: {const[1]}')

        print('\n' + '=' * 80)
        print('[SUCCESS] Table structure test completed!')

    except Exception as e:
        print(f'[ERROR] Error: {str(e)}')

    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    test_table_structure()
