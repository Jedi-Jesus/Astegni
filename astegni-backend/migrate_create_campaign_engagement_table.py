"""
Migration: Create campaign_engagement table for social engagement tracking

Creates a new table to track social engagements (likes, shares, comments, saves, bookmarks)
on campaign ads. This separates social engagement from impressions and allows rich
engagement features like comment threads, engagement timing, and user tracking.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate():
    """Create campaign_engagement table"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Create campaign_engagement table")
        print("=" * 80)
        print()

        # Step 1: Check if table already exists
        print("Step 1: Checking if table exists...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'campaign_engagement'
            );
        """)
        exists = cursor.fetchone()[0]

        if exists:
            print("   Table already exists. Skipping creation.")
            print()
            return

        print("   Table does not exist. Creating...")
        print()

        # Step 2: Create campaign_engagement table
        print("Step 2: Creating campaign_engagement table...")
        cursor.execute("""
            CREATE TABLE campaign_engagement (
                id SERIAL PRIMARY KEY,

                -- Campaign reference
                campaign_id INTEGER NOT NULL REFERENCES campaign_profile(id) ON DELETE CASCADE,

                -- Optional impression reference (if engagement came from specific impression)
                impression_id INTEGER REFERENCES campaign_impressions(id) ON DELETE SET NULL,

                -- Brand reference
                brand_id INTEGER NOT NULL,

                -- User who engaged
                user_id INTEGER NOT NULL,
                profile_id INTEGER NOT NULL,
                profile_type VARCHAR(50) NOT NULL,

                -- Engagement type
                engagement_type VARCHAR(20) NOT NULL,

                -- Comment-specific data
                comment_text TEXT,
                parent_comment_id INTEGER REFERENCES campaign_engagement(id) ON DELETE CASCADE,

                -- Context metadata
                device_type VARCHAR(50),
                location VARCHAR(100),

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CHECK (engagement_type IN ('like', 'share', 'comment', 'save', 'bookmark')),
                CHECK (engagement_type != 'comment' OR comment_text IS NOT NULL)
            );
        """)
        print("   Created table: campaign_engagement")
        print()

        # Step 3: Create indexes
        print("Step 3: Creating indexes...")

        indexes = [
            ("idx_campaign_engagement_campaign", "campaign_id"),
            ("idx_campaign_engagement_user", "user_id, profile_id"),
            ("idx_campaign_engagement_profile", "profile_id, profile_type"),
            ("idx_campaign_engagement_type", "engagement_type"),
            ("idx_campaign_engagement_impression", "impression_id"),
            ("idx_campaign_engagement_brand", "brand_id"),
            ("idx_campaign_engagement_parent", "parent_comment_id"),
            ("idx_campaign_engagement_created", "created_at")
        ]

        for idx_name, columns in indexes:
            cursor.execute(f"""
                CREATE INDEX {idx_name} ON campaign_engagement({columns});
            """)
            print(f"   Created index: {idx_name}")

        print()

        # Step 4: Create helper function to prevent duplicate engagements
        print("Step 4: Creating helper functions...")

        # Function to check if user already engaged
        cursor.execute("""
            CREATE OR REPLACE FUNCTION has_user_engaged(
                p_campaign_id INTEGER,
                p_user_id INTEGER,
                p_engagement_type VARCHAR
            )
            RETURNS BOOLEAN AS $$
            BEGIN
                RETURN EXISTS (
                    SELECT 1 FROM campaign_engagement
                    WHERE campaign_id = p_campaign_id
                    AND user_id = p_user_id
                    AND engagement_type = p_engagement_type
                );
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("   Created function: has_user_engaged(campaign_id, user_id, engagement_type)")

        # Function to get engagement counts
        cursor.execute("""
            CREATE OR REPLACE FUNCTION get_campaign_engagement_counts(p_campaign_id INTEGER)
            RETURNS TABLE(
                likes_count BIGINT,
                shares_count BIGINT,
                comments_count BIGINT,
                saves_count BIGINT,
                bookmarks_count BIGINT,
                total_engagements BIGINT
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT
                    COUNT(CASE WHEN engagement_type = 'like' THEN 1 END) as likes_count,
                    COUNT(CASE WHEN engagement_type = 'share' THEN 1 END) as shares_count,
                    COUNT(CASE WHEN engagement_type = 'comment' THEN 1 END) as comments_count,
                    COUNT(CASE WHEN engagement_type = 'save' THEN 1 END) as saves_count,
                    COUNT(CASE WHEN engagement_type = 'bookmark' THEN 1 END) as bookmarks_count,
                    COUNT(*) as total_engagements
                FROM campaign_engagement
                WHERE campaign_id = p_campaign_id;
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("   Created function: get_campaign_engagement_counts(campaign_id)")
        print()

        conn.commit()

        # Step 5: Verify table structure
        print("Step 5: Verifying table structure...")
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'campaign_engagement'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print(f"   Total columns: {len(columns)}")
        print()

        print("   Table structure:")
        for col, dtype, length in columns:
            type_str = f"{dtype}({length})" if length else dtype
            print(f"     - {col}: {type_str}")
        print()

        print("=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Summary:")
        print(f"  - Created table: campaign_engagement ({len(columns)} columns)")
        print(f"  - Created {len(indexes)} indexes")
        print(f"  - Created 2 helper functions")
        print()
        print("Table Features:")
        print("  - Track likes, shares, comments, saves, bookmarks")
        print("  - Store comment text and threads (parent_comment_id)")
        print("  - Link to specific impression (optional)")
        print("  - Track user, device, location, timestamp")
        print("  - Prevent duplicate engagements (helper function)")
        print()
        print("Helper Functions:")
        print("  1. has_user_engaged(campaign_id, user_id, engagement_type)")
        print("     - Check if user already liked/shared/etc.")
        print()
        print("  2. get_campaign_engagement_counts(campaign_id)")
        print("     - Get all engagement counts for campaign")
        print()
        print("Next Steps:")
        print("  1. Run migrate_remove_campaign_aggregate_metrics.py")
        print("  2. Update backend endpoints to use campaign_engagement")
        print("  3. Update frontend to display engagement data")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def rollback_migration():
    """Rollback: Drop campaign_engagement table"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("ROLLING BACK MIGRATION...")
        print()

        # Drop helper functions
        cursor.execute("""
            DROP FUNCTION IF EXISTS has_user_engaged(INTEGER, INTEGER, VARCHAR);
            DROP FUNCTION IF EXISTS get_campaign_engagement_counts(INTEGER);
        """)
        print("Dropped functions")

        # Drop table (CASCADE will drop all dependent objects)
        cursor.execute("""
            DROP TABLE IF EXISTS campaign_engagement CASCADE;
        """)
        print("Dropped table: campaign_engagement")

        conn.commit()
        print()
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
