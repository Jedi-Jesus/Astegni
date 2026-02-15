"""
Migration: Add existing Backblaze campaign media files to database

This script scans Backblaze for existing campaign media files
and adds their metadata to the campaign_media table.
"""

import psycopg
import os
from dotenv import load_dotenv
from b2sdk.v2 import B2Api, InMemoryAccountInfo

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')
BUCKET_NAME = os.getenv('BACKBLAZE_BUCKET_NAME')

def migrate():
    """Migrate existing campaign media from Backblaze to database"""

    # Initialize B2
    info = InMemoryAccountInfo()
    b2_api = B2Api(info)
    b2_api.authorize_account('production', os.getenv('BACKBLAZE_KEY_ID'), os.getenv('BACKBLAZE_APPLICATION_KEY'))

    # Get bucket
    bucket = b2_api.get_bucket_by_name(BUCKET_NAME)

    # Connect to database
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("Scanning Backblaze for campaign media files...")
    print("=" * 80)

    added_count = 0
    skipped_count = 0

    # Scan for campaign media files (images/profile_*/brand/campaign/placement/)
    for file_info, _ in bucket.ls('images/', latest_only=True, recursive=True):
        if not file_info:
            continue

        file_path = file_info.file_name

        # Check if it matches campaign media pattern: images/profile_{id}/{brand}/{campaign}/{placement}/
        if file_path.startswith('images/profile_') and file_path.count('/') >= 4:
            parts = file_path.split('/')

            if len(parts) >= 5:
                # Parse path components
                profile_part = parts[1]  # profile_5
                brand_name = parts[2]
                campaign_name = parts[3]
                placement = parts[4]
                file_name = parts[-1]

                # Extract advertiser_id from profile_part
                try:
                    advertiser_id = int(profile_part.split('_')[1])
                except:
                    print(f"Skipping {file_path} - can't parse advertiser_id")
                    skipped_count += 1
                    continue

                # Look up campaign_id and brand_id from database
                cursor.execute("""
                    SELECT c.id as campaign_id, c.brand_id
                    FROM campaign_profile c
                    JOIN brand_profile b ON c.brand_id = b.id
                    WHERE c.advertiser_id = %s
                    AND LOWER(REPLACE(c.name, ' ', '_')) = LOWER(%s)
                    AND LOWER(REPLACE(b.name, ' ', '_')) = LOWER(%s)
                    LIMIT 1
                """, (advertiser_id, campaign_name, brand_name))

                result = cursor.fetchone()

                if not result:
                    print(f"Skipping {file_path} - campaign not found in database")
                    skipped_count += 1
                    continue

                campaign_id, brand_id = result

                # Check if media already exists
                cursor.execute("""
                    SELECT id FROM campaign_media
                    WHERE file_name = %s AND campaign_id = %s
                """, (file_name, campaign_id))

                if cursor.fetchone():
                    print(f"Skipping {file_path} - already in database")
                    skipped_count += 1
                    continue

                # Construct file URL
                file_url = f"https://f005.backblazeb2.com/file/{BUCKET_NAME}/{file_path}"

                # Insert into database
                cursor.execute("""
                    INSERT INTO campaign_media (
                        campaign_id, brand_id, advertiser_id, media_type,
                        file_url, file_name, file_size, placement,
                        folder_path
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    campaign_id,
                    brand_id,
                    advertiser_id,
                    'image',  # Scanning images folder
                    file_url,
                    file_name,
                    file_info.size,
                    placement,
                    '/'.join(parts[:-1]) + '/'
                ))

                media_id = cursor.fetchone()[0]
                conn.commit()

                print(f"Added: {file_name} (ID: {media_id})")
                print(f"  Campaign: {campaign_name} (ID: {campaign_id})")
                print(f"  Placement: {placement}")
                print(f"  Size: {file_info.size} bytes")
                added_count += 1

    # Scan videos folder too
    for file_info, _ in bucket.ls('videos/', latest_only=True, recursive=True):
        if not file_info:
            continue

        file_path = file_info.file_name

        if file_path.startswith('videos/profile_') and file_path.count('/') >= 4:
            parts = file_path.split('/')

            if len(parts) >= 5:
                profile_part = parts[1]
                brand_name = parts[2]
                campaign_name = parts[3]
                placement = parts[4]
                file_name = parts[-1]

                try:
                    advertiser_id = int(profile_part.split('_')[1])
                except:
                    print(f"Skipping {file_path} - can't parse advertiser_id")
                    skipped_count += 1
                    continue

                cursor.execute("""
                    SELECT c.id as campaign_id, c.brand_id
                    FROM campaign_profile c
                    JOIN brand_profile b ON c.brand_id = b.id
                    WHERE c.advertiser_id = %s
                    AND LOWER(REPLACE(c.name, ' ', '_')) = LOWER(%s)
                    AND LOWER(REPLACE(b.name, ' ', '_')) = LOWER(%s)
                    LIMIT 1
                """, (advertiser_id, campaign_name, brand_name))

                result = cursor.fetchone()

                if not result:
                    print(f"Skipping {file_path} - campaign not found")
                    skipped_count += 1
                    continue

                campaign_id, brand_id = result

                cursor.execute("""
                    SELECT id FROM campaign_media
                    WHERE file_name = %s AND campaign_id = %s
                """, (file_name, campaign_id))

                if cursor.fetchone():
                    print(f"Skipping {file_path} - already in database")
                    skipped_count += 1
                    continue

                file_url = f"https://f005.backblazeb2.com/file/{BUCKET_NAME}/{file_path}"

                cursor.execute("""
                    INSERT INTO campaign_media (
                        campaign_id, brand_id, advertiser_id, media_type,
                        file_url, file_name, file_size, placement,
                        folder_path
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    campaign_id,
                    brand_id,
                    advertiser_id,
                    'video',
                    file_url,
                    file_name,
                    file_info.size,
                    placement,
                    '/'.join(parts[:-1]) + '/'
                ))

                media_id = cursor.fetchone()[0]
                conn.commit()

                print(f"Added: {file_name} (ID: {media_id})")
                print(f"  Campaign: {campaign_name} (ID: {campaign_id})")
                print(f"  Placement: {placement}")
                print(f"  Size: {file_info.size} bytes")
                added_count += 1

    cursor.close()
    conn.close()

    print()
    print("=" * 80)
    print(f"Migration complete!")
    print(f"Added: {added_count} files")
    print(f"Skipped: {skipped_count} files")

if __name__ == "__main__":
    migrate()
