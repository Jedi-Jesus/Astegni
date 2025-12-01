"""
Migration: Add missing columns to ad_campaigns table
- campaign_socials (JSONB): Social media links for the campaign
- verified_date (TIMESTAMP): When the campaign was verified
- submitted_reason (TEXT): Reason/note provided during submission
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Starting migration: Add campaign_socials, verified_date, and submitted_reason columns...")

        # Check if columns already exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'ad_campaigns'
            AND column_name IN ('campaign_socials', 'verified_date', 'submitted_reason')
        """)

        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")

        # Add campaign_socials column if it doesn't exist
        if 'campaign_socials' not in existing_columns:
            print("Adding campaign_socials column...")
            cursor.execute("""
                ALTER TABLE ad_campaigns
                ADD COLUMN campaign_socials JSONB DEFAULT '{}'::jsonb
            """)
            print("✓ campaign_socials column added")
        else:
            print("✓ campaign_socials column already exists")

        # Add verified_date column if it doesn't exist
        if 'verified_date' not in existing_columns:
            print("Adding verified_date column...")
            cursor.execute("""
                ALTER TABLE ad_campaigns
                ADD COLUMN verified_date TIMESTAMP
            """)
            print("✓ verified_date column added")
        else:
            print("✓ verified_date column already exists")

        # Add submitted_reason column if it doesn't exist
        if 'submitted_reason' not in existing_columns:
            print("Adding submitted_reason column...")
            cursor.execute("""
                ALTER TABLE ad_campaigns
                ADD COLUMN submitted_reason TEXT
            """)
            print("✓ submitted_reason column added")
        else:
            print("✓ submitted_reason column already exists")

        # Update verified_date for already verified campaigns
        print("\nUpdating verified_date for existing verified campaigns...")
        cursor.execute("""
            UPDATE ad_campaigns
            SET verified_date = created_at
            WHERE verification_status = 'verified' AND verified_date IS NULL
        """)
        updated_count = cursor.rowcount
        print(f"✓ Updated {updated_count} verified campaigns")

        conn.commit()
        print("\n✅ Migration completed successfully!")

        # Show sample data
        print("\nSample data from ad_campaigns:")
        cursor.execute("""
            SELECT id, name, verification_status,
                   campaign_socials, verified_date, submitted_reason
            FROM ad_campaigns
            LIMIT 5
        """)

        for row in cursor.fetchall():
            print(f"  ID: {row[0]}, Name: {row[1]}, Status: {row[2]}")
            print(f"    Socials: {row[3]}")
            print(f"    Verified: {row[4]}, Submitted Reason: {row[5]}")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
