"""
Migration: Drop daily_budget column from campaign_profile table

This migration removes the deprecated daily_budget column since we now use campaign_budget.
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    """Drop daily_budget column from campaign_profile table"""
    print("Starting migration: Drop daily_budget column...")

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check if column exists
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_profile' AND column_name = 'daily_budget'
                """)
                column_exists = cur.fetchone()

                if column_exists:
                    # Drop the daily_budget column
                    cur.execute("""
                        ALTER TABLE campaign_profile
                        DROP COLUMN IF EXISTS daily_budget;
                    """)
                    conn.commit()
                    print("[OK] Successfully dropped 'daily_budget' column from campaign_profile table")
                else:
                    print("[INFO] Column 'daily_budget' does not exist - nothing to drop")

                # Verify the change
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_profile'
                    ORDER BY ordinal_position
                """)
                columns = [row[0] for row in cur.fetchall()]

                print("\nCurrent campaign_profile columns:")
                for col in columns:
                    print(f"  - {col}")

                if 'daily_budget' not in columns and 'campaign_budget' in columns:
                    print("\n[OK] Migration complete! 'campaign_budget' is the only budget column.")
                elif 'daily_budget' in columns:
                    print("\n[WARNING] 'daily_budget' column still exists!")

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
