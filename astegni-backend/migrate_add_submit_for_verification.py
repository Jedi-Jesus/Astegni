"""
Migration: Add submit_for_verification field to campaign_profile table

This field tracks whether a campaign has been submitted for admin verification.
When true, the campaign is ready for admin review in manage-advertisers.html.
When false (default), the campaign needs to be submitted by the advertiser.

Field automatically resets to false whenever a campaign is edited.
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def migrate():
    """Add submit_for_verification field to campaign_profile table"""
    try:
        conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)

        with conn.cursor() as cur:
            # Add submit_for_verification field
            cur.execute("""
                ALTER TABLE campaign_profile
                ADD COLUMN IF NOT EXISTS submit_for_verification BOOLEAN DEFAULT false;
            """)

            # Create index for admin queries
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_campaign_submit_for_verification
                ON campaign_profile (submit_for_verification)
                WHERE submit_for_verification = true;
            """)

            # Add comment to explain the field
            cur.execute("""
                COMMENT ON COLUMN campaign_profile.submit_for_verification IS
                'Indicates if campaign has been submitted for admin verification. Resets to false on campaign edit.';
            """)

            conn.commit()
            print("[SUCCESS] Successfully added submit_for_verification field to campaign_profile table")
            print("[SUCCESS] Created index on submit_for_verification for faster admin queries")

        conn.close()

    except Exception as e:
        print(f"[ERROR] Error during migration: {str(e)}")
        raise

if __name__ == "__main__":
    print("Starting migration: Add submit_for_verification field...")
    migrate()
    print("Migration complete!")
