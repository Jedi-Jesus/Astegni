"""
Migration: Add partnership_type_category column to partner_requests table
Description: Adds a category column to distinguish between pre-defined types and custom "other" types
"""

import psycopg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def add_partnership_type_category_column():
    """Add partnership_type_category column to partner_requests table"""
    try:
        # Connect to database
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Adding partnership_type_category column to partner_requests table...")

                # Add the new column
                cur.execute("""
                    ALTER TABLE partner_requests
                    ADD COLUMN IF NOT EXISTS partnership_type_category VARCHAR(50);
                """)

                # Update existing rows to have category = partnership_type
                cur.execute("""
                    UPDATE partner_requests
                    SET partnership_type_category = partnership_type
                    WHERE partnership_type_category IS NULL;
                """)

                # Make the column NOT NULL after populating existing data
                cur.execute("""
                    ALTER TABLE partner_requests
                    ALTER COLUMN partnership_type_category SET NOT NULL;
                """)

                # Create index on partnership_type_category
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_partner_requests_type_category
                    ON partner_requests(partnership_type_category);
                """)

                conn.commit()
                print("✅ Successfully added partnership_type_category column!")

                # Show updated table structure
                cur.execute("""
                    SELECT column_name, data_type, character_maximum_length, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'partner_requests'
                    AND column_name IN ('partnership_type', 'partnership_type_category')
                    ORDER BY ordinal_position;
                """)

                columns = cur.fetchall()
                print("\n📋 Updated columns:")
                print("-" * 80)
                print(f"{'Column':<30} {'Type':<20} {'Max Length':<15} {'Nullable':<10}")
                print("-" * 80)
                for col in columns:
                    col_name, data_type, max_len, nullable = col
                    max_len_str = str(max_len) if max_len else 'N/A'
                    print(f"{col_name:<30} {data_type:<20} {max_len_str:<15} {nullable:<10}")
                print("-" * 80)

    except Exception as e:
        print(f"❌ Error adding partnership_type_category column: {e}")
        raise

if __name__ == "__main__":
    print("=" * 80)
    print("ADD PARTNERSHIP_TYPE_CATEGORY COLUMN MIGRATION")
    print("=" * 80)
    add_partnership_type_category_column()
    print("\n✅ Migration completed successfully!")
    print("\nNew Field:")
    print("  - partnership_type_category: Stores the selected category")
    print("    ('educational_institution', 'technology', 'other')")
    print("\nExisting Field:")
    print("  - partnership_type: Stores actual type value")
    print("    (predefined value OR custom text if 'other' selected)")
    print("\nExample:")
    print("  Category: 'other'")
    print("  Type: 'Content Provider' (custom text entered by user)")
    print("=" * 80)
