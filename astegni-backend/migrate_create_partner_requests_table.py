"""
Migration: Create partner_requests table
Description: Table to store partnership request submissions from companies/institutions
"""

import psycopg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def create_partner_requests_table():
    """Create the partner_requests table"""
    try:
        # Connect to database
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Creating partner_requests table...")

                # Create partner_requests table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS partner_requests (
                        id SERIAL PRIMARY KEY,
                        company_name VARCHAR(255) NOT NULL,
                        contact_person VARCHAR(255) NOT NULL,
                        emails JSONB NOT NULL,  -- Array of email addresses
                        phones JSONB NOT NULL,  -- Array of phone numbers
                        partnership_type VARCHAR(50) NOT NULL,  -- 'educational_institution', 'technology', 'other'
                        description TEXT NOT NULL,  -- Brief company description
                        proposal_file_path VARCHAR(500),  -- Path to uploaded proposal file (optional)
                        status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'under_review', 'approved', 'rejected'
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        reviewed_by INTEGER,  -- Admin user who reviewed
                        reviewed_at TIMESTAMP,
                        admin_notes TEXT  -- Internal notes from admin team
                    );
                """)

                # Create index on status for filtering
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_partner_requests_status
                    ON partner_requests(status);
                """)

                # Create index on created_at for sorting
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_partner_requests_created_at
                    ON partner_requests(created_at DESC);
                """)

                # Create index on partnership_type for filtering
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_partner_requests_type
                    ON partner_requests(partnership_type);
                """)

                conn.commit()
                print("✅ Successfully created partner_requests table with indexes!")

                # Show table structure
                cur.execute("""
                    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'partner_requests'
                    ORDER BY ordinal_position;
                """)

                columns = cur.fetchall()
                print("\n📋 Table structure:")
                print("-" * 100)
                print(f"{'Column':<25} {'Type':<20} {'Max Length':<15} {'Nullable':<10} {'Default':<20}")
                print("-" * 100)
                for col in columns:
                    col_name, data_type, max_len, nullable, default = col
                    max_len_str = str(max_len) if max_len else 'N/A'
                    default_str = str(default)[:20] if default else 'NULL'
                    print(f"{col_name:<25} {data_type:<20} {max_len_str:<15} {nullable:<10} {default_str:<20}")
                print("-" * 100)

    except Exception as e:
        print(f"❌ Error creating partner_requests table: {e}")
        raise

if __name__ == "__main__":
    print("=" * 100)
    print("PARTNER REQUESTS TABLE MIGRATION")
    print("=" * 100)
    create_partner_requests_table()
    print("\n✅ Migration completed successfully!")
    print("\nTable: partner_requests")
    print("Purpose: Store partnership requests from companies and institutions")
    print("\nFields:")
    print("  - id: Auto-incrementing primary key")
    print("  - company_name: Name of company/institution")
    print("  - contact_person: Primary contact name")
    print("  - emails: JSON array of email addresses")
    print("  - phones: JSON array of phone numbers")
    print("  - partnership_type: 'educational_institution', 'technology', 'other'")
    print("  - description: Brief company description")
    print("  - proposal_file_path: Path to uploaded proposal (optional)")
    print("  - status: 'pending', 'under_review', 'approved', 'rejected'")
    print("  - created_at: Submission timestamp")
    print("  - updated_at: Last update timestamp")
    print("  - reviewed_by: Admin user ID who reviewed")
    print("  - reviewed_at: Review timestamp")
    print("  - admin_notes: Internal notes from admin team")
    print("=" * 100)
