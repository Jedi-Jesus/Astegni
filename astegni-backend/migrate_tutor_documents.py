"""
Migration script to consolidate tutor achievements, certifications, and experiences into tutor_documents table.

This migration:
1. Drops old tables: tutor_achievements, tutor_certifications, tutor_experiences
2. Creates new unified table: tutor_documents with verification workflow
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Starting migration: tutor_documents table creation...")

        # Drop old tables if they exist
        print("Dropping old tables (tutor_achievements, tutor_certificates, tutor_experience)...")
        cursor.execute("DROP TABLE IF EXISTS tutor_achievements CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS tutor_certificates CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS tutor_experience CASCADE;")
        print("[OK] Old tables dropped")

        # Create new unified tutor_documents table
        print("Creating tutor_documents table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tutor_documents (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('academic', 'achievement', 'experience')),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                issued_by VARCHAR(255) NOT NULL,
                date_of_issue DATE NOT NULL,
                expiry_date DATE,
                document_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
                is_verified BOOLEAN DEFAULT FALSE,
                verified_by_admin_id INTEGER REFERENCES admin_profile(id),
                rejection_reason TEXT,
                rejected_at TIMESTAMP,
                is_featured BOOLEAN DEFAULT FALSE
            );
        """)
        print("[OK] tutor_documents table created")

        # Create indexes for performance
        print("Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tutor_documents_tutor_id ON tutor_documents(tutor_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tutor_documents_type ON tutor_documents(document_type);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tutor_documents_verification ON tutor_documents(verification_status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tutor_documents_featured ON tutor_documents(is_featured);")
        print("[OK] Indexes created")

        # Create trigger for updated_at timestamp
        print("Creating trigger for updated_at...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_tutor_documents_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        cursor.execute("""
            DROP TRIGGER IF EXISTS trigger_update_tutor_documents_updated_at ON tutor_documents;
        """)

        cursor.execute("""
            CREATE TRIGGER trigger_update_tutor_documents_updated_at
            BEFORE UPDATE ON tutor_documents
            FOR EACH ROW
            EXECUTE FUNCTION update_tutor_documents_updated_at();
        """)
        print("[OK] Trigger created")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")
        print("\nNew table structure:")
        print("  - tutor_documents (unified table for all document types)")
        print("  - Document types: 'academic', 'achievement', 'experience'")
        print("  - Verification workflow: pending -> verified/rejected")
        print("  - Admin verification tracking")
        print("  - Featured document support")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
