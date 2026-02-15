"""
Migration: Remove aggregate metric fields from campaign_profile

Removes 12 aggregate metric fields (9 impression metrics + 3 social metrics)
that are calculated from campaign_impressions and campaign_engagement tables.

campaign_profile should only contain campaign configuration, not calculated metrics.

Keeps 2 essential fields:
- cost_per_impression (CPI rate - pricing configuration)
- total_impressions_planned (planned impression budget - campaign planning)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate():
    """Remove aggregate metric fields from campaign_profile"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Remove aggregate metric fields from campaign_profile")
        print("=" * 80)
        print()

        # Step 1: Create backup table
        print("Step 1: Creating backup of current values...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_profile_metrics_backup (
                campaign_id INTEGER PRIMARY KEY,
                impressions INTEGER,
                viewability_rate NUMERIC,
                click_through_rate NUMERIC,
                conversions INTEGER,
                conversion_rate NUMERIC,
                engagement_rate NUMERIC,
                reach INTEGER,
                impressions_delivered BIGINT,
                impressions_charged BIGINT,
                likes INTEGER,
                shares INTEGER,
                comments INTEGER,
                backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("""
            INSERT INTO campaign_profile_metrics_backup (
                campaign_id, impressions, viewability_rate, click_through_rate,
                conversions, conversion_rate, engagement_rate, reach,
                impressions_delivered, impressions_charged,
                likes, shares, comments
            )
            SELECT
                id, impressions, viewability_rate, click_through_rate,
                conversions, conversion_rate, engagement_rate, reach,
                impressions_delivered, impressions_charged,
                likes, shares, comments
            FROM campaign_profile
            ON CONFLICT (campaign_id) DO UPDATE SET
                impressions = EXCLUDED.impressions,
                viewability_rate = EXCLUDED.viewability_rate,
                click_through_rate = EXCLUDED.click_through_rate,
                conversions = EXCLUDED.conversions,
                conversion_rate = EXCLUDED.conversion_rate,
                engagement_rate = EXCLUDED.engagement_rate,
                reach = EXCLUDED.reach,
                impressions_delivered = EXCLUDED.impressions_delivered,
                impressions_charged = EXCLUDED.impressions_charged,
                likes = EXCLUDED.likes,
                shares = EXCLUDED.shares,
                comments = EXCLUDED.comments,
                backed_up_at = CURRENT_TIMESTAMP;
        """)

        cursor.execute("SELECT COUNT(*) FROM campaign_profile_metrics_backup")
        backup_count = cursor.fetchone()[0]
        print(f"   Backed up {backup_count} campaigns")
        print()

        # Step 2: Check which columns exist
        print("Step 2: Checking existing columns...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN (
                'impressions', 'viewability_rate', 'click_through_rate',
                'conversions', 'conversion_rate', 'engagement_rate', 'reach',
                'impressions_delivered', 'impressions_charged',
                'likes', 'shares', 'comments'
            )
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"   Found {len(existing_columns)} columns to remove")
        print()

        # Step 3: Drop dependent views first
        print("Step 3: Dropping dependent views...")
        cursor.execute("""
            DROP VIEW IF EXISTS campaign_with_media CASCADE;
            DROP VIEW IF EXISTS campaign_with_payment_summary CASCADE;
        """)
        print("   Dropped views: campaign_with_media, campaign_with_payment_summary")
        print()

        # Step 4: Drop columns
        print("Step 4: Removing aggregate metric columns...")

        columns_to_remove = [
            # Impression/Analytics metrics (9 fields)
            'impressions',
            'viewability_rate',
            'click_through_rate',
            'conversions',
            'conversion_rate',
            'engagement_rate',
            'reach',
            'impressions_delivered',
            'impressions_charged',
            # Social engagement metrics (3 fields)
            'likes',
            'shares',
            'comments'
        ]

        removed_count = 0
        for column in columns_to_remove:
            if column in existing_columns:
                print(f"   Removing {column}...")
                cursor.execute(f"""
                    ALTER TABLE campaign_profile
                    DROP COLUMN IF EXISTS {column};
                """)
                removed_count += 1
            else:
                print(f"   {column}: Already removed")

        conn.commit()
        print()
        print(f"   Removed: {removed_count} columns")
        print()

        # Step 5: Recreate campaign_with_media view (without metric fields)
        print("Step 5: Recreating campaign_with_media view...")
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
        print("   Recreated view: campaign_with_media")
        print()

        # Step 6: Recreate campaign_with_payment_summary view
        print("Step 6: Recreating campaign_with_payment_summary view...")
        cursor.execute("""
            CREATE OR REPLACE VIEW campaign_with_payment_summary AS
            SELECT
                c.*,
                COUNT(i.id) as total_invoices,
                SUM(i.impressions_delivered) as total_impressions_billed,
                SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as total_paid,
                SUM(i.outstanding_amount) as total_outstanding,
                COALESCE(
                    (SELECT TRUE FROM campaign_invoices
                     WHERE campaign_id = c.id AND invoice_type = 'deposit' AND status = 'paid' LIMIT 1),
                    FALSE
                ) as deposit_paid,
                COALESCE(
                    (SELECT TRUE FROM campaign_invoices
                     WHERE campaign_id = c.id AND invoice_type = 'final_settlement' AND status = 'paid' LIMIT 1),
                    FALSE
                ) as final_settlement_paid,
                MAX(i.issued_at) as last_billed_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', id,
                            'invoice_number', invoice_number,
                            'type', invoice_type,
                            'amount', amount,
                            'impressions', impressions_delivered,
                            'cpi_rate', cpi_rate,
                            'status', status,
                            'due_date', due_date,
                            'paid_at', paid_at
                        )
                        ORDER BY issued_at DESC
                    )
                    FROM campaign_invoices
                    WHERE campaign_id = c.id
                ) as invoices
            FROM campaign_profile c
            LEFT JOIN campaign_invoices i ON c.id = i.campaign_id
            GROUP BY c.id;
        """)
        print("   Recreated view: campaign_with_payment_summary")
        print()

        # Step 7: Create comprehensive metrics view
        print("Step 7: Creating campaign_with_full_metrics view...")
        cursor.execute("""
            CREATE OR REPLACE VIEW campaign_with_full_metrics AS
            SELECT
                c.*,

                -- Impression metrics (from campaign_impressions)
                (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id) as impressions,
                (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND charged = TRUE) as impressions_delivered,
                (SELECT COUNT(DISTINCT user_id) FROM campaign_impressions WHERE campaign_id = c.id) as reach,

                -- Click/conversion metrics (from campaign_impressions)
                (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND clicked = TRUE) as clicks,
                (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND converted = TRUE) as conversions,

                -- Social engagement metrics (from campaign_engagement)
                (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'like') as likes,
                (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'share') as shares,
                (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'comment') as comments,
                (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'save') as saves,
                (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'bookmark') as bookmarks,

                -- Calculated rates (from campaign_impressions)
                (SELECT ROUND(COUNT(CASE WHEN is_viewable THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
                 FROM campaign_impressions WHERE campaign_id = c.id) as viewability_rate,
                (SELECT ROUND(COUNT(CASE WHEN clicked THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
                 FROM campaign_impressions WHERE campaign_id = c.id) as click_through_rate,
                (SELECT ROUND(COUNT(CASE WHEN converted THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
                 FROM campaign_impressions WHERE campaign_id = c.id) as conversion_rate,

                -- Total engagement rate (impressions + social)
                (SELECT ROUND(
                    (COUNT(CASE WHEN clicked OR converted THEN 1 END) +
                     COALESCE((SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id), 0))::NUMERIC
                    / NULLIF(COUNT(*), 0) * 100, 2)
                 FROM campaign_impressions WHERE campaign_id = c.id) as engagement_rate

            FROM campaign_profile c;
        """)
        print("   Created view: campaign_with_full_metrics")
        print()

        conn.commit()

        # Step 8: Verify changes
        print("Step 8: Verifying changes...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN (
                'impressions', 'viewability_rate', 'click_through_rate',
                'conversions', 'conversion_rate', 'engagement_rate', 'reach',
                'impressions_delivered', 'impressions_charged',
                'likes', 'shares', 'comments'
            )
        """)
        remaining = cursor.fetchall()

        if remaining:
            print(f"   WARNING: {len(remaining)} columns still exist: {[r[0] for r in remaining]}")
        else:
            print("   SUCCESS: All aggregate metric columns removed")

        # Count final columns
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
        """)
        final_count = cursor.fetchone()[0]
        print(f"   Final column count: {final_count}")

        # Verify kept columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN ('cost_per_impression', 'total_impressions_planned')
            ORDER BY column_name
        """)
        kept_columns = [row[0] for row in cursor.fetchall()]
        print(f"   Kept impression-related config fields: {', '.join(kept_columns)}")

        print()
        print("=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Summary:")
        print(f"  - Backed up {backup_count} campaigns")
        print(f"  - Removed {removed_count} aggregate metric columns")
        print(f"  - Final column count: {final_count}")
        print()
        print("Removed Fields (12 total):")
        print("  Impression/Analytics Metrics (9):")
        print("    - impressions, viewability_rate, click_through_rate")
        print("    - conversions, conversion_rate, engagement_rate")
        print("    - reach, impressions_delivered, impressions_charged")
        print()
        print("  Social Engagement Metrics (3):")
        print("    - likes, shares, comments")
        print()
        print("Kept Fields (Campaign Configuration):")
        print("  - cost_per_impression: CPI rate (pricing config)")
        print("  - total_impressions_planned: Planned impression budget")
        print()
        print("Views Created:")
        print("  1. campaign_with_full_metrics")
        print("     - Campaign with ALL calculated metrics")
        print("     - Includes impression, click, conversion, and social metrics")
        print("     SELECT * FROM campaign_with_full_metrics WHERE id = 3;")
        print()
        print("Single Source of Truth:")
        print("  - campaign_impressions: All impression/click/conversion data")
        print("  - campaign_engagement: All social engagement data (likes, shares, comments)")
        print("  - campaign_profile: Only campaign configuration")
        print()
        print("Backup: campaign_profile_metrics_backup (can be dropped after verification)")

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
            ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS viewability_rate NUMERIC,
            ADD COLUMN IF NOT EXISTS click_through_rate NUMERIC,
            ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC,
            ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC,
            ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS impressions_delivered BIGINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS impressions_charged BIGINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;
        """)

        # Restore data from backup
        cursor.execute("""
            UPDATE campaign_profile c
            SET
                impressions = b.impressions,
                viewability_rate = b.viewability_rate,
                click_through_rate = b.click_through_rate,
                conversions = b.conversions,
                conversion_rate = b.conversion_rate,
                engagement_rate = b.engagement_rate,
                reach = b.reach,
                impressions_delivered = b.impressions_delivered,
                impressions_charged = b.impressions_charged,
                likes = b.likes,
                shares = b.shares,
                comments = b.comments
            FROM campaign_profile_metrics_backup b
            WHERE c.id = b.campaign_id;
        """)

        # Drop the new view
        cursor.execute("""
            DROP VIEW IF EXISTS campaign_with_full_metrics;
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
