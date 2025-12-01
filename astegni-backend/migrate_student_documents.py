"""
Migration script to create student_documents table.

This migration:
1. Creates new unified table: student_documents
2. Supports document types: 'achievement', 'certification', 'extracurricular'
3. No verification workflow (students manage their own documents)
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
        print("Starting migration: student_documents table creation...")

        # Create new unified student_documents table
        print("Creating student_documents table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS student_documents (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('achievement', 'certification', 'extracurricular')),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                issued_by VARCHAR(255) NOT NULL,
                date_of_issue DATE NOT NULL,
                expiry_date DATE,
                document_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("[OK] student_documents table created")

        # Create indexes for performance
        print("Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_student_documents_type ON student_documents(document_type);")
        print("[OK] Indexes created")

        # Create trigger for updated_at timestamp
        print("Creating trigger for updated_at...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_student_documents_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        cursor.execute("""
            DROP TRIGGER IF EXISTS trigger_update_student_documents_updated_at ON student_documents;
        """)

        cursor.execute("""
            CREATE TRIGGER trigger_update_student_documents_updated_at
            BEFORE UPDATE ON student_documents
            FOR EACH ROW
            EXECUTE FUNCTION update_student_documents_updated_at();
        """)
        print("[OK] Trigger created")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")
        print("\nNew table structure:")
        print("  - student_documents (unified table for all document types)")
        print("  - Document types: 'achievement', 'certification', 'extracurricular'")
        print("  - No verification workflow (student-managed)")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
