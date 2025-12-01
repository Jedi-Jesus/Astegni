"""
Add campaign_socials field to ad_campaigns table
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Add campaign_socials JSON field to ad_campaigns table"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Adding campaign_socials field to ad_campaigns table...")

        # Add campaign_socials column (JSON type for storing social media links)
        cursor.execute("""
            ALTER TABLE ad_campaigns
            ADD COLUMN IF NOT EXISTS campaign_socials JSONB DEFAULT '{}'::jsonb;
        """)

        conn.commit()
        print("✓ Successfully added campaign_socials field")

    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
