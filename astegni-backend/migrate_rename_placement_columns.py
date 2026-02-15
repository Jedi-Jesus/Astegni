"""
Migration: Rename Ad Placement Columns
========================================
Renames placement columns in cpi_settings table from old names to new names:
- placeholder_premium -> leaderboard_banner_premium
- widget_premium -> logo_premium
- popup_premium -> in_session_skyscrapper_banner_premium
- insession_premium -> (REMOVED - no longer used)

Also updates any campaign data in advertiser_campaigns table that uses old placement names.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Database URLs
ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")
USER_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    """Run the migration"""
    admin_conn = None
    user_conn = None

    try:
        # Connect to admin database
        print("Connecting to admin database...")
        admin_conn = psycopg.connect(ADMIN_DATABASE_URL)
        admin_cursor = admin_conn.cursor()

        # Connect to user database
        print("Connecting to user database...")
        user_conn = psycopg.connect(USER_DATABASE_URL)
        user_cursor = user_conn.cursor()

        # ============================================
        # Step 1: Rename columns in cpi_settings table (admin_db)
        # ============================================
        print("\n=== Step 1: Updating cpi_settings table ===")

        # Check if old columns exist
        admin_cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cpi_settings'
            AND column_name IN ('placeholder_premium', 'widget_premium', 'popup_premium', 'insession_premium')
        """)
        existing_columns = [row[0] for row in admin_cursor.fetchall()]

        if existing_columns:
            print(f"Found old columns: {existing_columns}")

            # Rename columns
            if 'placeholder_premium' in existing_columns:
                print("Renaming placeholder_premium -> leaderboard_banner_premium")
                admin_cursor.execute("""
                    ALTER TABLE cpi_settings
                    RENAME COLUMN placeholder_premium TO leaderboard_banner_premium
                """)

            if 'widget_premium' in existing_columns:
                print("Renaming widget_premium -> logo_premium")
                admin_cursor.execute("""
                    ALTER TABLE cpi_settings
                    RENAME COLUMN widget_premium TO logo_premium
                """)

            if 'popup_premium' in existing_columns:
                print("Renaming popup_premium -> in_session_skyscrapper_banner_premium")
                admin_cursor.execute("""
                    ALTER TABLE cpi_settings
                    RENAME COLUMN popup_premium TO in_session_skyscrapper_banner_premium
                """)

            if 'insession_premium' in existing_columns:
                print("Dropping insession_premium column (no longer used)")
                admin_cursor.execute("""
                    ALTER TABLE cpi_settings
                    DROP COLUMN insession_premium
                """)

            admin_conn.commit()
            print("SUCCESS: cpi_settings table updated successfully")
        else:
            print("New columns already exist, skipping cpi_settings migration")

        # ============================================
        # Step 2: Update campaign_profile table (user_db)
        # ============================================
        print("\n=== Step 2: Updating campaign_profile table ===")

        # Check if campaign_profile table exists
        user_cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'campaign_profile'
            )
        """)
        table_exists = user_cursor.fetchone()[0]

        if table_exists:
            # Update target_placements array values
            user_cursor.execute("""
                SELECT id, target_placements
                FROM campaign_profile
                WHERE target_placements IS NOT NULL
            """)

            campaigns = user_cursor.fetchall()
            print(f"Found {len(campaigns)} campaigns to update")

            placement_mapping = {
                'placeholder': 'leaderboard-banner',
                'widget': 'logo',
                'popup': 'in-session-skyscrapper-banner',
                'insession': None  # Remove this placement
            }

            updated_count = 0
            for campaign_id, placements in campaigns:
                if placements:
                    # Update placement names
                    new_placements = []
                    for placement in placements:
                        if placement in placement_mapping:
                            new_placement = placement_mapping[placement]
                            if new_placement:  # Skip None (insession)
                                new_placements.append(new_placement)
                        else:
                            new_placements.append(placement)  # Keep unknown placements as-is

                    if new_placements != placements:
                        user_cursor.execute("""
                            UPDATE campaign_profile
                            SET target_placements = %s
                            WHERE id = %s
                        """, (new_placements, campaign_id))
                        updated_count += 1

            user_conn.commit()
            print(f"SUCCESS: Updated {updated_count} campaigns with new placement names")
        else:
            print("campaign_profile table not found, skipping")

        print("\n=== Migration completed successfully! ===")
        print("\nSummary:")
        print("- Renamed 3 columns in cpi_settings table")
        print("- Dropped insession_premium column")
        print(f"- Updated {updated_count if table_exists else 0} campaigns")

    except Exception as e:
        print(f"\nERROR: Error during migration: {e}")
        if admin_conn:
            admin_conn.rollback()
        if user_conn:
            user_conn.rollback()
        raise

    finally:
        if admin_conn:
            admin_conn.close()
        if user_conn:
            user_conn.close()

if __name__ == "__main__":
    print("=== Campaign Placement Renaming Migration ===\n")
    migrate()
