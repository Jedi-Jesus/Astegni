"""
Migration: Remove redundant media fields from campaign_profile table

Now that we have the campaign_media table as the source of truth,
these fields in campaign_profile are redundant:
- file_url: Single URL, but campaigns have multiple media files
- thumbnail_url: Should query campaign_media for first image
- file_size: Each media file has its own size

This migration:
1. Backs up current values to a temporary table (safety)
2. Drops the redundant columns
3. Creates helper views/functions for backward compatibility
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate():
    """Remove redundant media fields from campaign_profile"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Remove redundant media fields from campaign_profile")
        print("=" * 80)
        print()

        # Step 1: Create backup table with current values
        print("Step 1: Creating backup of current values...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_profile_media_backup (
                campaign_id INTEGER PRIMARY KEY,
                file_url VARCHAR(500),
                thumbnail_url VARCHAR(500),
                file_size BIGINT,
                backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("""
            INSERT INTO campaign_profile_media_backup (campaign_id, file_url, thumbnail_url, file_size)
            SELECT id, file_url, thumbnail_url, file_size
            FROM campaign_profile
            ON CONFLICT (campaign_id) DO UPDATE
            SET file_url = EXCLUDED.file_url,
                thumbnail_url = EXCLUDED.thumbnail_url,
                file_size = EXCLUDED.file_size,
                backed_up_at = CURRENT_TIMESTAMP;
        """)

        cursor.execute("SELECT COUNT(*) FROM campaign_profile_media_backup")
        backup_count = cursor.fetchone()[0]
        print(f"   Backed up {backup_count} campaigns")
        print()

        # Step 2: Drop redundant columns
        print("Step 2: Dropping redundant columns...")

        # Check if columns exist before dropping
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN ('file_url', 'thumbnail_url', 'file_size')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]

        for column in ['file_url', 'thumbnail_url', 'file_size']:
            if column in existing_columns:
                print(f"   Dropping {column}...")
                cursor.execute(f"""
                    ALTER TABLE campaign_profile
                    DROP COLUMN IF EXISTS {column};
                """)
            else:
                print(f"   {column} already removed")

        print()

        # Step 3: Create helper view for backward compatibility
        print("Step 3: Creating helper view for easy media access...")
        cursor.execute("""
            CREATE OR REPLACE VIEW campaign_with_media AS
            SELECT
                c.*,
                (
                    SELECT file_url
                    FROM campaign_media
                    WHERE campaign_id = c.id
                    AND media_type = 'image'
                    ORDER BY created_at ASC
                    LIMIT 1
                ) AS first_image_url,
                (
                    SELECT file_url
                    FROM campaign_media
                    WHERE campaign_id = c.id
                    AND media_type = 'video'
                    ORDER BY created_at ASC
                    LIMIT 1
                ) AS first_video_url,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', id,
                            'type', media_type,
                            'url', file_url,
                            'placement', placement,
                            'size', file_size
                        )
                        ORDER BY created_at DESC
                    )
                    FROM campaign_media
                    WHERE campaign_id = c.id
                ) AS all_media
            FROM campaign_profile c;
        """)
        print("   Created view: campaign_with_media")
        print()

        # Step 4: Create helper function
        print("Step 4: Creating helper function...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION get_campaign_primary_image(p_campaign_id INTEGER)
            RETURNS VARCHAR AS $$
            BEGIN
                RETURN (
                    SELECT file_url
                    FROM campaign_media
                    WHERE campaign_id = p_campaign_id
                    AND media_type = 'image'
                    ORDER BY
                        CASE WHEN placement = 'widget' THEN 0
                             WHEN placement = 'placeholder' THEN 1
                             WHEN placement = 'popup' THEN 2
                             WHEN placement = 'insession' THEN 3
                             ELSE 4
                        END,
                        created_at ASC
                    LIMIT 1
                );
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("   Created function: get_campaign_primary_image(campaign_id)")
        print()

        conn.commit()

        # Step 5: Verify changes
        print("Step 5: Verifying changes...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN ('file_url', 'thumbnail_url', 'file_size')
        """)
        remaining = cursor.fetchall()

        if remaining:
            print(f"   WARNING: {len(remaining)} columns still exist: {[r[0] for r in remaining]}")
        else:
            print("   SUCCESS: All redundant columns removed")

        print()
        print("=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Summary:")
        print(f"  - Backed up {backup_count} campaigns to campaign_profile_media_backup")
        print("  - Removed: file_url, thumbnail_url, file_size")
        print("  - Created view: campaign_with_media")
        print("  - Created function: get_campaign_primary_image()")
        print()
        print("How to access media now:")
        print("  1. Direct query: SELECT * FROM campaign_media WHERE campaign_id = 3")
        print("  2. Use view: SELECT * FROM campaign_with_media WHERE id = 3")
        print("  3. Use function: SELECT get_campaign_primary_image(3)")
        print()
        print("Backup table: campaign_profile_media_backup (can be dropped after verification)")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def rollback_migration():
    """Rollback: Restore columns from backup"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("ROLLING BACK MIGRATION...")
        print()

        # Add columns back
        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD COLUMN IF NOT EXISTS file_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS file_size BIGINT;
        """)

        # Restore data from backup
        cursor.execute("""
            UPDATE campaign_profile c
            SET
                file_url = b.file_url,
                thumbnail_url = b.thumbnail_url,
                file_size = b.file_size
            FROM campaign_profile_media_backup b
            WHERE c.id = b.campaign_id;
        """)

        conn.commit()
        print("SUCCESS: Migration rolled back")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Rollback failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        rollback_migration()
    else:
        migrate()
