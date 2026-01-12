"""
Migration: Add Company Verification Fields to advertiser_profiles table

This migration adds fields needed for company/business verification:
- company_name: Official company/business name
- industry: Business industry/sector
- company_size: Number of employees
- business_reg_no: Business registration number
- tin_number: Tax Identification Number
- website: Company website URL
- contact_email: Business contact email
- contact_phone: Business contact phone
- address: Business address
- city: City location
- company_description: Brief description of the company
- company_logo: Company logo URL
- business_license_url: Uploaded business license document
- tin_certificate_url: Uploaded TIN certificate document
- verification_status: pending, in_review, verified, rejected
- verification_submitted_at: When verification was submitted
- verification_reviewed_at: When verification was reviewed
- verification_notes: Admin notes on verification
"""

import psycopg2
from psycopg2 import sql

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Starting migration: Add Company Verification Fields...")

        # Check which columns already exist
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'advertiser_profiles'
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        print(f"Existing columns: {len(existing_columns)}")

        # Define new columns to add
        new_columns = [
            ("company_name", "VARCHAR(255)"),
            ("industry", "VARCHAR(100)"),
            ("company_size", "VARCHAR(50)"),
            ("business_reg_no", "VARCHAR(100)"),
            ("tin_number", "VARCHAR(50)"),
            ("website", "VARCHAR(500)"),
            ("contact_email", "VARCHAR(255)"),
            ("contact_phone", "VARCHAR(50)"),
            ("address", "TEXT"),
            ("city", "VARCHAR(100)"),
            ("company_description", "TEXT"),
            ("company_logo", "VARCHAR(500)"),
            ("business_license_url", "VARCHAR(500)"),
            ("tin_certificate_url", "VARCHAR(500)"),
            ("additional_docs_urls", "JSONB DEFAULT '[]'::jsonb"),
            ("verification_status", "VARCHAR(20) DEFAULT 'pending'"),
            ("verification_submitted_at", "TIMESTAMP"),
            ("verification_reviewed_at", "TIMESTAMP"),
            ("verification_notes", "TEXT"),
        ]

        columns_added = 0
        for column_name, column_type in new_columns:
            if column_name not in existing_columns:
                try:
                    cur.execute(f"ALTER TABLE advertiser_profiles ADD COLUMN {column_name} {column_type}")
                    print(f"  [OK] Added column: {column_name} ({column_type})")
                    columns_added += 1
                except Exception as e:
                    print(f"  [WARN] Could not add {column_name}: {e}")
            else:
                print(f"  [SKIP] Column already exists: {column_name}")

        conn.commit()
        print(f"\n[OK] Migration completed! Added {columns_added} new columns.")

        # Show final table structure
        print("\nUpdated advertiser_profiles columns:")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'advertiser_profiles'
            ORDER BY ordinal_position
        """)
        for row in cur.fetchall():
            print(f"   - {row[0]}: {row[1]}")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
