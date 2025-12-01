"""
Migration: Add separate image and video storage limit fields to system_media_settings
Adds max_image_storage_mb and max_video_storage_mb columns to allow independent storage limits
"""

import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Add separate storage limit columns for images and videos"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("[*] Adding separate storage limit columns...")

        # Add new columns for separate image and video storage limits
        cursor.execute("""
            ALTER TABLE system_media_settings
            ADD COLUMN IF NOT EXISTS max_image_storage_mb INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS max_video_storage_mb INTEGER DEFAULT 0
        """)

        print("[+] Columns added successfully")

        # Migrate existing data: split storage_limit_gb equally between images and videos
        print("[*] Migrating existing data (splitting storage 50/50)...")
        cursor.execute("""
            UPDATE system_media_settings
            SET
                max_image_storage_mb = ROUND(storage_limit_gb * 1024 / 2),
                max_video_storage_mb = ROUND(storage_limit_gb * 1024 / 2)
            WHERE max_image_storage_mb = 0 AND max_video_storage_mb = 0
        """)

        rows_updated = cursor.rowcount
        print(f"[+] Updated {rows_updated} rows with default 50/50 split")

        conn.commit()
        print("[SUCCESS] Migration completed successfully!")

        # Show updated data
        print("\n[DATA] Current storage settings:")
        cursor.execute("""
            SELECT tier_name, max_image_size_mb, max_video_size_mb,
                   storage_limit_gb, max_image_storage_mb, max_video_storage_mb
            FROM system_media_settings
            ORDER BY tier_name
        """)

        rows = cursor.fetchall()
        for row in rows:
            tier, img_size, vid_size, total_gb, img_storage, vid_storage = row
            print(f"  {tier.upper()}:")
            print(f"    Single file limits: Image={img_size}MB, Video={vid_size}MB")
            print(f"    Storage limits: Image={img_storage}MB, Video={vid_storage}MB (Total={total_gb}GB)")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
