"""
Migration: Update astegni_reviews table structure
Changes:
1. Remove overall rating (will be calculated from category averages)
2. Rename customer_service → support_quality
3. Rename platform_satisfaction → ease_of_use
4. Rename employee_satisfaction → features_quality
5. Add value_rating → overall_value
6. Add would_recommend (boolean)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def update_astegni_reviews_structure():
    """Update astegni_reviews table structure in admin database"""

    # Get admin database URL from environment
    ADMIN_DATABASE_URL = os.getenv(
        'ADMIN_DATABASE_URL',
        'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
    )

    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    print('Updating astegni_reviews table structure...')

    try:
        # Add new columns if they don't exist
        print('Adding new columns...')

        # Add support_quality (replaces customer_service)
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name='astegni_reviews' AND column_name='support_quality') THEN
                    ALTER TABLE astegni_reviews ADD COLUMN support_quality INTEGER CHECK (support_quality >= 1 AND support_quality <= 5);
                END IF;
            END $$;
        """)

        # Add ease_of_use (replaces platform_satisfaction)
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name='astegni_reviews' AND column_name='ease_of_use') THEN
                    ALTER TABLE astegni_reviews ADD COLUMN ease_of_use INTEGER CHECK (ease_of_use >= 1 AND ease_of_use <= 5);
                END IF;
            END $$;
        """)

        # Add features_quality (replaces employee_satisfaction)
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name='astegni_reviews' AND column_name='features_quality') THEN
                    ALTER TABLE astegni_reviews ADD COLUMN features_quality INTEGER CHECK (features_quality >= 1 AND features_quality <= 5);
                END IF;
            END $$;
        """)

        # Add overall_value (new field)
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name='astegni_reviews' AND column_name='overall_value') THEN
                    ALTER TABLE astegni_reviews ADD COLUMN overall_value INTEGER CHECK (overall_value >= 1 AND overall_value <= 5);
                END IF;
            END $$;
        """)

        # Add would_recommend
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name='astegni_reviews' AND column_name='would_recommend') THEN
                    ALTER TABLE astegni_reviews ADD COLUMN would_recommend BOOLEAN;
                END IF;
            END $$;
        """)

        # Migrate data from old columns to new columns
        print('Migrating data from old columns...')

        cursor.execute("""
            UPDATE astegni_reviews
            SET support_quality = customer_service
            WHERE customer_service IS NOT NULL AND support_quality IS NULL;
        """)

        cursor.execute("""
            UPDATE astegni_reviews
            SET ease_of_use = platform_satisfaction
            WHERE platform_satisfaction IS NOT NULL AND ease_of_use IS NULL;
        """)

        cursor.execute("""
            UPDATE astegni_reviews
            SET features_quality = employee_satisfaction
            WHERE employee_satisfaction IS NOT NULL AND features_quality IS NULL;
        """)

        # Make rating column nullable (it will be calculated)
        print('Making rating column nullable...')
        cursor.execute("""
            ALTER TABLE astegni_reviews ALTER COLUMN rating DROP NOT NULL;
        """)

        conn.commit()
        print('astegni_reviews table structure updated successfully!')

        # Show current structure
        print('\nCurrent table structure:')
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'astegni_reviews'
            ORDER BY ordinal_position;
        """)

        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (nullable: {row[2]})")

    except Exception as e:
        print(f'Error updating table: {str(e)}')
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()
        print('Admin database connection closed')


if __name__ == '__main__':
    update_astegni_reviews_structure()
    print('\nMigration completed successfully!')
    print('\nNote: Old columns (customer_service, platform_satisfaction, employee_satisfaction) are kept for backward compatibility.')
    print('   You can drop them manually if needed after verifying the migration.')
