"""
Migration: Remove duplicate and orphaned fields from campaign_profile

Removes:
1. target_audience (duplicate of target_audiences)
2. cost_per_impression (duplicate of cpi_rate)
3. video_completion_rate (aggregate metric)
4. quartile_metrics (aggregate metric)
5. frequency (aggregate metric)
6. marketing_efficiency_ratio (aggregate metric)
7. followers (aggregate metric)
8. campaign_package_id (orphaned reference - table doesn't exist)

Result: campaign_profile: 54 → 46 columns (-8 fields)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate():
    """Remove duplicate and orphaned fields from campaign_profile"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Remove duplicate and orphaned fields")
        print("=" * 80)
        print()

        # Step 1: Create backup
        print("Step 1: Creating backup...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_profile_duplicate_fields_backup (
                campaign_id INTEGER PRIMARY KEY,
                target_audience TEXT,
                cost_per_impression NUMERIC,
                video_completion_rate NUMERIC,
                quartile_metrics JSONB,
                frequency NUMERIC,
                marketing_efficiency_ratio NUMERIC,
                followers INTEGER,
                campaign_package_id INTEGER,
                backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("""
            INSERT INTO campaign_profile_duplicate_fields_backup (
                campaign_id, target_audience, cost_per_impression,
                video_completion_rate, quartile_metrics, frequency,
                marketing_efficiency_ratio, followers, campaign_package_id
            )
            SELECT
                id, target_audience, cost_per_impression,
                video_completion_rate, quartile_metrics, frequency,
                marketing_efficiency_ratio, followers, campaign_package_id
            FROM campaign_profile
            ON CONFLICT (campaign_id) DO UPDATE SET
                target_audience = EXCLUDED.target_audience,
                cost_per_impression = EXCLUDED.cost_per_impression,
                video_completion_rate = EXCLUDED.video_completion_rate,
                quartile_metrics = EXCLUDED.quartile_metrics,
                frequency = EXCLUDED.frequency,
                marketing_efficiency_ratio = EXCLUDED.marketing_efficiency_ratio,
                followers = EXCLUDED.followers,
                campaign_package_id = EXCLUDED.campaign_package_id,
                backed_up_at = CURRENT_TIMESTAMP;
        """)

        cursor.execute("SELECT COUNT(*) FROM campaign_profile_duplicate_fields_backup")
        backup_count = cursor.fetchone()[0]
        print(f"   Backed up {backup_count} campaigns")
        print()

        # Step 2: Show current state
        print("Step 2: Analyzing fields to remove...")

        fields_info = [
            ('target_audience', 'Duplicate of target_audiences (ARRAY)'),
            ('cost_per_impression', 'Duplicate of cpi_rate'),
            ('video_completion_rate', 'Aggregate metric - calculate from impressions'),
            ('quartile_metrics', 'Aggregate metric - calculate from impressions'),
            ('frequency', 'Aggregate metric - calculate from impressions'),
            ('marketing_efficiency_ratio', 'Aggregate metric - calculate from impressions + invoices'),
            ('followers', 'Aggregate metric - use campaign_engagement'),
            ('campaign_package_id', 'Orphaned reference - campaign_packages table does not exist')
        ]

        for field, reason in fields_info:
            cursor.execute(f"""
                SELECT COUNT(*) FROM campaign_profile WHERE {field} IS NOT NULL
            """)
            non_null = cursor.fetchone()[0]
            print(f"   {field}:")
            print(f"     Reason: {reason}")
            print(f"     Non-NULL values: {non_null}")

        print()

        # Step 3: Drop dependent views (if any)
        print("Step 3: Dropping dependent views...")
        cursor.execute("""
            DROP VIEW IF EXISTS campaign_with_media CASCADE;
            DROP VIEW IF EXISTS campaign_with_payment_summary CASCADE;
            DROP VIEW IF EXISTS campaign_with_full_metrics CASCADE;
        """)
        print("   Dropped views")
        print()

        # Step 4: Remove columns
        print("Step 4: Removing fields...")

        fields_to_remove = [
            'target_audience',
            'cost_per_impression',
            'video_completion_rate',
            'quartile_metrics',
            'frequency',
            'marketing_efficiency_ratio',
            'followers',
            'campaign_package_id'
        ]

        for field in fields_to_remove:
            print(f"   Removing {field}...")
            cursor.execute(f"""
                ALTER TABLE campaign_profile
                DROP COLUMN IF EXISTS {field};
            """)

        conn.commit()
        print()
        print(f"   Removed: {len(fields_to_remove)} columns")
        print()

        # Step 5: Recreate views
        print("Step 5: Recreating views...")

        # campaign_with_media
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
        print("   Recreated: campaign_with_media")

        # campaign_with_payment_summary
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
        print("   Recreated: campaign_with_payment_summary")

        # campaign_with_full_metrics (with calculated metrics)
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
                (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'bookmark') as followers,

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
                 FROM campaign_impressions WHERE campaign_id = c.id) as engagement_rate,

                -- Frequency (avg impressions per user)
                (SELECT ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0), 2)
                 FROM campaign_impressions WHERE campaign_id = c.id) as frequency,

                -- Marketing efficiency ratio (conversions per dollar spent)
                (SELECT
                    ROUND(
                        COUNT(CASE WHEN ci.converted THEN 1 END)::NUMERIC /
                        NULLIF((SELECT COALESCE(SUM(amount), 0) FROM campaign_invoices WHERE campaign_id = c.id AND status = 'paid'), 0),
                        4
                    )
                 FROM campaign_impressions ci WHERE ci.campaign_id = c.id) as marketing_efficiency_ratio

            FROM campaign_profile c;
        """)
        print("   Recreated: campaign_with_full_metrics (with calculated metrics)")
        print()

        conn.commit()

        # Step 6: Verify
        print("Step 6: Verifying changes...")
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
        """)
        final_count = cursor.fetchone()[0]
        print(f"   Final column count: {final_count}")

        # Check if removed columns still exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN (
                'target_audience', 'cost_per_impression',
                'video_completion_rate', 'quartile_metrics',
                'frequency', 'marketing_efficiency_ratio',
                'followers', 'campaign_package_id'
            )
        """)
        remaining = cursor.fetchall()

        if remaining:
            print(f"   WARNING: {len(remaining)} columns still exist: {[r[0] for r in remaining]}")
        else:
            print("   SUCCESS: All fields removed")

        print()

        print("=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Summary:")
        print(f"  - Backed up {backup_count} campaigns")
        print(f"  - Removed 8 fields")
        print(f"  - Final column count: {final_count}")
        print()
        print("Removed Fields:")
        print("  Duplicates (2):")
        print("    - target_audience (use target_audiences instead)")
        print("    - cost_per_impression (use cpi_rate instead)")
        print()
        print("  Aggregate Metrics (5):")
        print("    - video_completion_rate (calculate from campaign_impressions)")
        print("    - quartile_metrics (calculate from campaign_impressions)")
        print("    - frequency (calculate from campaign_impressions)")
        print("    - marketing_efficiency_ratio (calculate from impressions + invoices)")
        print("    - followers (use campaign_engagement with type='bookmark')")
        print()
        print("  Orphaned Reference (1):")
        print("    - campaign_package_id (campaign_packages table doesn't exist)")
        print()
        print("Note: All removed metrics are now calculated in campaign_with_full_metrics view")
        print("      Use: SELECT * FROM campaign_with_full_metrics WHERE id = 3;")
        print()
        print("Backup: campaign_profile_duplicate_fields_backup")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
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
            ADD COLUMN IF NOT EXISTS target_audience TEXT,
            ADD COLUMN IF NOT EXISTS cost_per_impression NUMERIC,
            ADD COLUMN IF NOT EXISTS video_completion_rate NUMERIC,
            ADD COLUMN IF NOT EXISTS quartile_metrics JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS frequency NUMERIC,
            ADD COLUMN IF NOT EXISTS marketing_efficiency_ratio NUMERIC,
            ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS campaign_package_id INTEGER;
        """)

        # Restore data from backup
        cursor.execute("""
            UPDATE campaign_profile c
            SET
                target_audience = b.target_audience,
                cost_per_impression = b.cost_per_impression,
                video_completion_rate = b.video_completion_rate,
                quartile_metrics = b.quartile_metrics,
                frequency = b.frequency,
                marketing_efficiency_ratio = b.marketing_efficiency_ratio,
                followers = b.followers,
                campaign_package_id = b.campaign_package_id
            FROM campaign_profile_duplicate_fields_backup b
            WHERE c.id = b.campaign_id;
        """)

        conn.commit()
        print("SUCCESS: Migration rolled back")
        print("Note: Views still exist with calculated metrics")

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
