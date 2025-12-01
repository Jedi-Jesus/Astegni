"""
Migration: Create Unified Documents Table

This migration:
1. Creates a new 'documents' table that combines tutor_documents and student_documents
2. Migrates existing data from both tables
3. Keeps the old tables for backup (can be dropped later)

The new table supports:
- Multiple uploader roles (tutor, student, parent, admin, etc.)
- Comprehensive document metadata
- Verification workflow
- Featured documents
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Run the migration to create unified documents table"""
    print("=" * 60)
    print("MIGRATION: Create Unified Documents Table")
    print("=" * 60)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cursor = conn.cursor()

    try:
        # Step 1: Create the new unified documents table
        print("\n[Step 1] Creating 'documents' table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,

                -- Uploader Information
                uploader_id INTEGER NOT NULL,
                uploader_role VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent', 'admin', 'advertiser'

                -- Document Details
                document_type VARCHAR(100) NOT NULL,  -- 'academic', 'achievement', 'experience', 'academic_certificate', 'extracurricular', 'certification', etc.
                title VARCHAR(255) NOT NULL,
                description TEXT,
                issued_by VARCHAR(255),
                date_of_issue DATE,
                expiry_date DATE,

                -- File Information
                document_url TEXT,
                file_name VARCHAR(255),
                file_type VARCHAR(100),
                file_size INTEGER,

                -- Timestamps
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                -- Verification Workflow
                verification_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
                is_verified BOOLEAN DEFAULT FALSE,
                verified_by_admin_id INTEGER,
                rejection_reason TEXT,
                rejected_at TIMESTAMP WITH TIME ZONE,

                -- Featured Document
                is_featured BOOLEAN DEFAULT FALSE
            );
        """)
        print("   ✅ Table 'documents' created successfully")

        # Step 2: Create indexes for better performance
        print("\n[Step 2] Creating indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON documents(uploader_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_uploader_role ON documents(uploader_role);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON documents(verification_status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_is_featured ON documents(is_featured);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
        """)
        print("   ✅ Indexes created successfully")

        # Step 3: Migrate data from tutor_documents
        print("\n[Step 3] Migrating data from tutor_documents...")

        # Check if tutor_documents exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_documents'
            );
        """)
        tutor_docs_exists = cursor.fetchone()['exists']

        if tutor_docs_exists:
            cursor.execute("""
                SELECT COUNT(*) as count FROM tutor_documents;
            """)
            tutor_count = cursor.fetchone()['count']
            print(f"   Found {tutor_count} tutor documents to migrate")

            if tutor_count > 0:
                cursor.execute("""
                    INSERT INTO documents (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, expiry_date, document_url, file_name,
                        file_type, file_size, created_at, updated_at, verification_status,
                        is_verified, verified_by_admin_id, rejection_reason, rejected_at, is_featured
                    )
                    SELECT
                        tutor_id,
                        'tutor',
                        document_type,
                        title,
                        description,
                        issued_by,
                        date_of_issue,
                        expiry_date,
                        document_url,
                        COALESCE(SPLIT_PART(document_url, '/', -1), 'document'),
                        NULL,
                        NULL,
                        created_at,
                        updated_at,
                        COALESCE(verification_status, 'pending'),
                        COALESCE(is_verified, FALSE),
                        verified_by_admin_id,
                        rejection_reason,
                        rejected_at,
                        COALESCE(is_featured, FALSE)
                    FROM tutor_documents;
                """)
                print(f"   ✅ Migrated {tutor_count} tutor documents")
        else:
            print("   ⚠️ tutor_documents table does not exist, skipping")

        # Step 4: Migrate data from student_documents
        print("\n[Step 4] Migrating data from student_documents...")

        # Check if student_documents exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'student_documents'
            );
        """)
        student_docs_exists = cursor.fetchone()['exists']

        if student_docs_exists:
            cursor.execute("""
                SELECT COUNT(*) as count FROM student_documents;
            """)
            student_count = cursor.fetchone()['count']
            print(f"   Found {student_count} student documents to migrate")

            if student_count > 0:
                cursor.execute("""
                    INSERT INTO documents (
                        uploader_id, uploader_role, document_type, title, description,
                        issued_by, date_of_issue, expiry_date, document_url, file_name,
                        file_type, file_size, created_at, updated_at, verification_status,
                        is_verified, verified_by_admin_id, rejection_reason, rejected_at, is_featured
                    )
                    SELECT
                        student_id,
                        'student',
                        document_type,
                        title,
                        description,
                        issued_by,
                        date_of_issue,
                        expiry_date,
                        document_url,
                        COALESCE(file_name, SPLIT_PART(document_url, '/', -1), 'document'),
                        file_type,
                        file_size,
                        created_at,
                        updated_at,
                        COALESCE(verification_status, 'pending'),
                        COALESCE(is_verified, FALSE),
                        verified_by_admin_id,
                        rejection_reason,
                        rejected_at,
                        COALESCE(is_featured, FALSE)
                    FROM student_documents;
                """)
                print(f"   ✅ Migrated {student_count} student documents")
        else:
            print("   ⚠️ student_documents table does not exist, skipping")

        # Step 5: Verify migration
        print("\n[Step 5] Verifying migration...")
        cursor.execute("SELECT COUNT(*) as count FROM documents;")
        total_docs = cursor.fetchone()['count']
        print(f"   Total documents in new table: {total_docs}")

        cursor.execute("""
            SELECT uploader_role, COUNT(*) as count
            FROM documents
            GROUP BY uploader_role;
        """)
        role_counts = cursor.fetchall()
        for rc in role_counts:
            print(f"   - {rc['uploader_role']}: {rc['count']} documents")

        conn.commit()

        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Test the new documents endpoints")
        print("2. Update frontend to use new endpoints")
        print("3. Once verified, drop old tables with:")
        print("   DROP TABLE IF EXISTS tutor_documents;")
        print("   DROP TABLE IF EXISTS student_documents;")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
