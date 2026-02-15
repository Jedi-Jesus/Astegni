"""
Migration: Remove redundant invoice/payment fields from campaign_profile

Removes 18 redundant fields:
- 12 invoice/payment tracking fields (now in campaign_invoices)
- 6 unused pricing model fields (CPI only, don't need CPC/CPV/CPE)

Keeps 3 essential campaign configuration fields:
- billing_frequency: How often to bill
- campaign_budget: Total budget limit
- cost_per_impression: CPI rate
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate():
    """Remove redundant invoice/payment fields from campaign_profile"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Remove redundant invoice/payment fields")
        print("=" * 80)
        print()

        # Step 1: Create backup table
        print("Step 1: Creating backup of current values...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_profile_invoice_backup (
                campaign_id INTEGER PRIMARY KEY,
                invoice_id INTEGER,
                invoice_status VARCHAR,
                invoice_due_date TIMESTAMP,
                payment_status VARCHAR,
                payment_transaction_id INTEGER,
                paid_at TIMESTAMP,
                deposit_paid BOOLEAN,
                deposit_transaction_id INTEGER,
                final_settlement_paid BOOLEAN,
                final_settlement_transaction_id INTEGER,
                last_billing_at TIMESTAMP,
                payment_model VARCHAR,
                cost_per_click NUMERIC,
                cost_per_view NUMERIC,
                cost_per_engagement NUMERIC,
                cost_per_conversion_rate NUMERIC,
                backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("""
            INSERT INTO campaign_profile_invoice_backup (
                campaign_id, invoice_id, invoice_status, invoice_due_date,
                payment_status, payment_transaction_id, paid_at,
                deposit_paid, deposit_transaction_id,
                final_settlement_paid, final_settlement_transaction_id,
                last_billing_at, payment_model, cost_per_click, cost_per_view,
                cost_per_engagement, cost_per_conversion_rate
            )
            SELECT
                id, invoice_id, invoice_status, invoice_due_date,
                payment_status, payment_transaction_id, paid_at,
                deposit_paid, deposit_transaction_id,
                final_settlement_paid, final_settlement_transaction_id,
                last_billing_at, payment_model, cost_per_click, cost_per_view,
                cost_per_engagement, cost_per_conversion_rate
            FROM campaign_profile
            ON CONFLICT (campaign_id) DO UPDATE SET
                invoice_id = EXCLUDED.invoice_id,
                invoice_status = EXCLUDED.invoice_status,
                invoice_due_date = EXCLUDED.invoice_due_date,
                payment_status = EXCLUDED.payment_status,
                payment_transaction_id = EXCLUDED.payment_transaction_id,
                paid_at = EXCLUDED.paid_at,
                deposit_paid = EXCLUDED.deposit_paid,
                deposit_transaction_id = EXCLUDED.deposit_transaction_id,
                final_settlement_paid = EXCLUDED.final_settlement_paid,
                final_settlement_transaction_id = EXCLUDED.final_settlement_transaction_id,
                last_billing_at = EXCLUDED.last_billing_at,
                payment_model = EXCLUDED.payment_model,
                cost_per_click = EXCLUDED.cost_per_click,
                cost_per_view = EXCLUDED.cost_per_view,
                cost_per_engagement = EXCLUDED.cost_per_engagement,
                cost_per_conversion_rate = EXCLUDED.cost_per_conversion_rate,
                backed_up_at = CURRENT_TIMESTAMP;
        """)

        cursor.execute("SELECT COUNT(*) FROM campaign_profile_invoice_backup")
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
                'invoice_id', 'invoice_status', 'invoice_due_date',
                'payment_status', 'payment_transaction_id', 'paid_at',
                'deposit_paid', 'deposit_transaction_id',
                'final_settlement_paid', 'final_settlement_transaction_id',
                'last_billing_at', 'payment_model', 'cost_per_click',
                'cost_per_view', 'cost_per_engagement', 'cost_per_conversion_rate'
            )
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"   Found {len(existing_columns)} columns to remove")
        print()

        # Step 3: Drop campaign_with_media view first (it depends on these columns)
        print("Step 3: Dropping dependent views...")
        cursor.execute("""
            DROP VIEW IF EXISTS campaign_with_media CASCADE;
        """)
        print("   Dropped view: campaign_with_media")
        print()

        # Step 4: Drop columns
        print("Step 4: Removing redundant columns...")

        columns_to_remove = [
            # Redundant invoice/payment tracking (12 fields)
            'invoice_id',
            'invoice_status',
            'invoice_due_date',
            'payment_status',
            'payment_transaction_id',
            'paid_at',
            'deposit_paid',
            'deposit_transaction_id',
            'final_settlement_paid',
            'final_settlement_transaction_id',
            'last_billing_at',
            # Unused pricing models (6 fields - CPI only)
            'payment_model',
            'cost_per_click',
            'cost_per_view',
            'cost_per_engagement',
            'cost_per_conversion_rate'
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

        # Step 5: Recreate campaign_with_media view (without invoice fields)
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

        # Step 6: Create helper view for payment summary
        print("Step 6: Creating payment summary view...")
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
        print("   Created view: campaign_with_payment_summary")
        print()

        # Step 7: Create helper function
        print("Step 7: Creating helper function...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION get_campaign_payment_status(p_campaign_id INTEGER)
            RETURNS VARCHAR AS $$
            DECLARE
                v_outstanding NUMERIC;
                v_deposit_paid BOOLEAN;
            BEGIN
                SELECT
                    SUM(outstanding_amount),
                    COALESCE(MAX(CASE WHEN invoice_type = 'deposit' AND status = 'paid' THEN TRUE ELSE FALSE END), FALSE)
                INTO v_outstanding, v_deposit_paid
                FROM campaign_invoices
                WHERE campaign_id = p_campaign_id;

                IF v_outstanding IS NULL THEN
                    RETURN 'no_invoices';
                ELSIF v_outstanding = 0 THEN
                    RETURN 'fully_paid';
                ELSIF NOT v_deposit_paid THEN
                    RETURN 'deposit_pending';
                ELSE
                    RETURN 'partially_paid';
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("   Created function: get_campaign_payment_status(campaign_id)")
        print()

        conn.commit()

        # Step 8: Verify changes
        print("Step 8: Verifying changes...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
            AND column_name IN (
                'invoice_id', 'invoice_status', 'invoice_due_date',
                'payment_status', 'payment_transaction_id', 'paid_at',
                'deposit_paid', 'deposit_transaction_id',
                'final_settlement_paid', 'final_settlement_transaction_id',
                'last_billing_at', 'payment_model', 'cost_per_click',
                'cost_per_view', 'cost_per_engagement', 'cost_per_conversion_rate'
            )
        """)
        remaining = cursor.fetchall()

        if remaining:
            print(f"   WARNING: {len(remaining)} columns still exist: {[r[0] for r in remaining]}")
        else:
            print("   SUCCESS: All redundant columns removed")

        # Count final columns
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
        """)
        final_count = cursor.fetchone()[0]
        print(f"   Final column count: {final_count}")

        print()
        print("=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Summary:")
        print(f"  - Backed up {backup_count} campaigns")
        print(f"  - Removed {removed_count} columns")
        print(f"  - Final column count: {final_count}")
        print()
        print("Removed Fields:")
        print("  Invoice/Payment Tracking (12):")
        print("    - invoice_id, invoice_status, invoice_due_date")
        print("    - payment_status, payment_transaction_id, paid_at")
        print("    - deposit_paid, deposit_transaction_id")
        print("    - final_settlement_paid, final_settlement_transaction_id")
        print("    - last_billing_at")
        print()
        print("  Unused Pricing Models (6):")
        print("    - payment_model, cost_per_click, cost_per_view")
        print("    - cost_per_engagement, cost_per_conversion_rate")
        print()
        print("Kept Fields (Campaign Configuration):")
        print("  - billing_frequency: How often to bill")
        print("  - campaign_budget: Total budget limit")
        print("  - cost_per_impression: CPI rate")
        print()
        print("Helper Tools Created:")
        print("  1. View: campaign_with_payment_summary")
        print("     SELECT * FROM campaign_with_payment_summary WHERE id = 3;")
        print()
        print("  2. Function: get_campaign_payment_status(campaign_id)")
        print("     SELECT get_campaign_payment_status(3);")
        print()
        print("Backup: campaign_profile_invoice_backup (can be dropped after verification)")

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
            ADD COLUMN IF NOT EXISTS invoice_id INTEGER,
            ADD COLUMN IF NOT EXISTS invoice_status VARCHAR,
            ADD COLUMN IF NOT EXISTS invoice_due_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS payment_status VARCHAR,
            ADD COLUMN IF NOT EXISTS payment_transaction_id INTEGER,
            ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN,
            ADD COLUMN IF NOT EXISTS deposit_transaction_id INTEGER,
            ADD COLUMN IF NOT EXISTS final_settlement_paid BOOLEAN,
            ADD COLUMN IF NOT EXISTS final_settlement_transaction_id INTEGER,
            ADD COLUMN IF NOT EXISTS last_billing_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS payment_model VARCHAR,
            ADD COLUMN IF NOT EXISTS cost_per_click NUMERIC,
            ADD COLUMN IF NOT EXISTS cost_per_view NUMERIC,
            ADD COLUMN IF NOT EXISTS cost_per_engagement NUMERIC,
            ADD COLUMN IF NOT EXISTS cost_per_conversion_rate NUMERIC;
        """)

        # Restore data from backup
        cursor.execute("""
            UPDATE campaign_profile c
            SET
                invoice_id = b.invoice_id,
                invoice_status = b.invoice_status,
                invoice_due_date = b.invoice_due_date,
                payment_status = b.payment_status,
                payment_transaction_id = b.payment_transaction_id,
                paid_at = b.paid_at,
                deposit_paid = b.deposit_paid,
                deposit_transaction_id = b.deposit_transaction_id,
                final_settlement_paid = b.final_settlement_paid,
                final_settlement_transaction_id = b.final_settlement_transaction_id,
                last_billing_at = b.last_billing_at,
                payment_model = b.payment_model,
                cost_per_click = b.cost_per_click,
                cost_per_view = b.cost_per_view,
                cost_per_engagement = b.cost_per_engagement,
                cost_per_conversion_rate = b.cost_per_conversion_rate
            FROM campaign_profile_invoice_backup b
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
