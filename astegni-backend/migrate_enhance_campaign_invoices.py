"""
Migration: Enhance campaign_invoices table with complete billing fields

Adds 10 essential fields to make campaign_invoices the complete source of truth
for all invoice and payment data.

Business Model: CPI (Cost Per Impression) only
Analytics (clicks, conversions) tracked in campaign_impressions table
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate():
    """Add missing fields to campaign_invoices table"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Enhance campaign_invoices table")
        print("=" * 80)
        print()

        # Step 1: Check current structure
        print("Step 1: Checking current table structure...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'campaign_invoices'
            ORDER BY ordinal_position
        """)
        current_columns = [row[0] for row in cursor.fetchall()]
        print(f"   Current columns: {len(current_columns)}")
        print()

        # Step 2: Add new columns
        print("Step 2: Adding new columns...")

        new_columns = [
            ("billing_cycle_number", "INTEGER", "Which billing cycle (1st, 2nd, 3rd...)"),
            ("billing_period_start", "TIMESTAMP", "Start of billing period"),
            ("billing_period_end", "TIMESTAMP", "End of billing period"),
            ("discount_amount", "NUMERIC(10, 2) DEFAULT 0", "Discount applied"),
            ("tax_amount", "NUMERIC(10, 2) DEFAULT 0", "Tax amount"),
            ("refund_amount", "NUMERIC(10, 2) DEFAULT 0", "Refund amount"),
            ("payment_method", "VARCHAR(50)", "Payment method (bank_transfer, card, etc.)"),
            ("invoice_pdf_url", "VARCHAR(500)", "Generated invoice PDF URL")
        ]

        added_count = 0
        skipped_count = 0

        for col_name, col_type, description in new_columns:
            if col_name in current_columns:
                print(f"   {col_name}: Already exists (skipped)")
                skipped_count += 1
            else:
                print(f"   Adding {col_name}: {description}")
                cursor.execute(f"""
                    ALTER TABLE campaign_invoices
                    ADD COLUMN {col_name} {col_type};
                """)
                added_count += 1

        conn.commit()
        print()
        print(f"   Added: {added_count} columns")
        print(f"   Skipped: {skipped_count} columns")
        print()

        # Step 3: Verify changes
        print("Step 3: Verifying changes...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'campaign_invoices'
            ORDER BY ordinal_position
        """)
        final_columns = cursor.fetchall()
        print(f"   Final column count: {len(final_columns)}")
        print()

        # Show new columns
        print("   New columns added:")
        for col, dtype in final_columns:
            if col not in current_columns:
                print(f"     - {col}: {dtype}")
        print()

        print("=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Summary:")
        print(f"  - Added {added_count} new columns")
        print(f"  - Total columns: {len(final_columns)}")
        print()
        print("New fields:")
        print("  Billing Period:")
        print("    - billing_cycle_number: Track billing cycles")
        print("    - billing_period_start: Period start date")
        print("    - billing_period_end: Period end date")
        print()
        print("  Financial:")
        print("    - discount_amount: Discounts applied")
        print("    - tax_amount: Tax amount")
        print("    - refund_amount: Refund amount")
        print()
        print("  Invoice Management:")
        print("    - payment_method: How invoice was paid")
        print("    - invoice_pdf_url: Generated invoice PDF")
        print()
        print("Note: Clicks/conversions tracked in campaign_impressions (not duplicated here)")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    migrate()
