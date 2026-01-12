"""
Migration: Add targeting array columns to campaign_profile table

This migration adds:
- target_audiences: TEXT[] (array of audience types: tutor, student, parent, advertiser, user)
- target_regions: TEXT[] (array of region IDs)
- target_placements: TEXT[] (array of placement types: placeholder, widget, popup, insession)

The existing target_audience (singular, TEXT) and target_location (TEXT) columns remain for backwards compatibility.
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def migrate():
    print("=" * 60)
    print("Migration: Add Targeting Array Columns to campaign_profile")
    print("=" * 60)

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN ('target_audiences', 'target_regions', 'target_placements')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]

        # Add target_audiences column (array of audience types)
        if 'target_audiences' not in existing_columns:
            print("Adding target_audiences column...")
            cursor.execute("""
                ALTER TABLE campaign_profile
                ADD COLUMN target_audiences TEXT[] DEFAULT ARRAY['tutor', 'student', 'parent', 'advertiser', 'user']
            """)
            print("  -> Added target_audiences (TEXT[])")
        else:
            print("  -> target_audiences already exists, skipping")

        # Add target_regions column (array of region IDs)
        if 'target_regions' not in existing_columns:
            print("Adding target_regions column...")
            cursor.execute("""
                ALTER TABLE campaign_profile
                ADD COLUMN target_regions TEXT[] DEFAULT ARRAY[]::TEXT[]
            """)
            print("  -> Added target_regions (TEXT[])")
        else:
            print("  -> target_regions already exists, skipping")

        # Add target_placements column (array of placement types)
        if 'target_placements' not in existing_columns:
            print("Adding target_placements column...")
            cursor.execute("""
                ALTER TABLE campaign_profile
                ADD COLUMN target_placements TEXT[] DEFAULT ARRAY['placeholder', 'widget', 'popup', 'insession']
            """)
            print("  -> Added target_placements (TEXT[])")
        else:
            print("  -> target_placements already exists, skipping")

        conn.commit()
        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

        # Show updated table structure
        print("\nUpdated campaign_profile targeting columns:")
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN ('target_audience', 'target_location', 'target_audiences', 'target_regions', 'target_placements')
            ORDER BY column_name
        """)
        for row in cursor.fetchall():
            default = row[2][:50] + '...' if row[2] and len(row[2]) > 50 else row[2]
            print(f"  - {row[0]}: {row[1]} (default: {default})")

    except Exception as e:
        conn.rollback()
        print(f"\nError during migration: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
