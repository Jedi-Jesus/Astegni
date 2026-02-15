"""
Utility Script: Sync campaign_profile.file_url with campaign_media table

This script updates campaign_profile.file_url to match the first media file
from the campaign_media table. Useful for keeping legacy file_url field in sync.

Note: The campaign_media table is the source of truth for all campaign media.
The campaign_profile.file_url is a legacy field that may be used for backward compatibility.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def sync_file_urls(campaign_id=None, dry_run=False):
    """
    Sync campaign_profile.file_url with first media from campaign_media table

    Args:
        campaign_id: Specific campaign to update (None = all campaigns)
        dry_run: If True, show what would be updated without making changes
    """
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Get campaigns that have media but no file_url, or specific campaign
        if campaign_id:
            query = """
                SELECT DISTINCT c.id, c.name, c.file_url as current_url
                FROM campaign_profile c
                WHERE c.id = %s
            """
            cursor.execute(query, (campaign_id,))
        else:
            query = """
                SELECT DISTINCT c.id, c.name, c.file_url as current_url
                FROM campaign_profile c
                INNER JOIN campaign_media cm ON c.id = cm.campaign_id
                WHERE c.file_url IS NULL OR c.file_url = ''
                ORDER BY c.id
            """
            cursor.execute(query)

        campaigns = cursor.fetchall()

        if not campaigns:
            print("No campaigns found to update.")
            return

        print(f"Found {len(campaigns)} campaign(s) to process")
        print("=" * 80)

        updated_count = 0
        skipped_count = 0

        for camp_id, camp_name, current_url in campaigns:
            # Get first media file for this campaign (prefer images, then videos)
            cursor.execute("""
                SELECT file_url, file_name, media_type, placement
                FROM campaign_media
                WHERE campaign_id = %s
                ORDER BY
                    CASE WHEN media_type = 'image' THEN 0 ELSE 1 END,
                    created_at ASC
                LIMIT 1
            """, (camp_id,))

            media = cursor.fetchone()

            if not media:
                print(f"Campaign: {camp_name} (ID: {camp_id})")
                print(f"  Status: SKIPPED - No media found")
                print()
                skipped_count += 1
                continue

            new_url, file_name, media_type, placement = media

            print(f"Campaign: {camp_name} (ID: {camp_id})")
            print(f"  Current file_url: {current_url or 'NULL'}")
            print(f"  New file_url: {new_url}")
            print(f"  Media: {file_name} ({media_type}, {placement})")

            if dry_run:
                print(f"  Status: DRY RUN - Would update")
            else:
                cursor.execute("""
                    UPDATE campaign_profile
                    SET file_url = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (new_url, camp_id))
                conn.commit()
                print(f"  Status: UPDATED")
                updated_count += 1

            print()

        print("=" * 80)
        if dry_run:
            print(f"DRY RUN - Would update {len(campaigns)} campaign(s)")
        else:
            print(f"Summary:")
            print(f"  Updated: {updated_count}")
            print(f"  Skipped: {skipped_count}")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def sync_all_campaigns(dry_run=True):
    """Sync file_url for ALL campaigns that have media"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Get all campaigns with media
        cursor.execute("""
            SELECT DISTINCT c.id, c.name, c.file_url as current_url
            FROM campaign_profile c
            INNER JOIN campaign_media cm ON c.id = cm.campaign_id
            ORDER BY c.id
        """)

        campaigns = cursor.fetchall()

        if not campaigns:
            print("No campaigns with media found.")
            return

        print(f"Found {len(campaigns)} campaign(s) with media")
        print("=" * 80)

        updated_count = 0
        unchanged_count = 0

        for camp_id, camp_name, current_url in campaigns:
            # Get first media file
            cursor.execute("""
                SELECT file_url, file_name, media_type
                FROM campaign_media
                WHERE campaign_id = %s
                ORDER BY
                    CASE WHEN media_type = 'image' THEN 0 ELSE 1 END,
                    created_at ASC
                LIMIT 1
            """, (camp_id,))

            media = cursor.fetchone()
            if not media:
                continue

            new_url, file_name, media_type = media

            # Only update if different
            if current_url != new_url:
                print(f"Campaign: {camp_name} (ID: {camp_id})")
                print(f"  Current: {current_url or 'NULL'}")
                print(f"  New: {new_url}")

                if not dry_run:
                    cursor.execute("""
                        UPDATE campaign_profile
                        SET file_url = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (new_url, camp_id))
                    conn.commit()
                    print(f"  Status: UPDATED")
                else:
                    print(f"  Status: DRY RUN - Would update")

                print()
                updated_count += 1
            else:
                unchanged_count += 1

        print("=" * 80)
        if dry_run:
            print(f"DRY RUN Summary:")
            print(f"  Would update: {updated_count}")
            print(f"  Already correct: {unchanged_count}")
        else:
            print(f"Summary:")
            print(f"  Updated: {updated_count}")
            print(f"  Unchanged: {unchanged_count}")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        # Sync specific campaign
        campaign_id = int(sys.argv[1])
        dry_run = '--dry-run' in sys.argv
        print(f"Syncing campaign {campaign_id}...")
        if dry_run:
            print("DRY RUN MODE - No changes will be made")
        print()
        sync_file_urls(campaign_id, dry_run=dry_run)
    else:
        # Default: sync all campaigns with missing file_url (dry run)
        print("Syncing all campaigns with missing file_url...")
        print("DRY RUN MODE - No changes will be made")
        print("Run with '--force' to apply changes")
        print()

        force = '--force' in sys.argv
        sync_all_campaigns(dry_run=not force)
