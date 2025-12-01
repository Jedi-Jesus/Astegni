"""
Migration: Drop Old Document Tables

This migration removes the legacy tutor_documents and student_documents tables
now that all data has been migrated to the unified 'documents' table.

WARNING: This is a DESTRUCTIVE operation. Make sure:
1. You have run migrate_create_unified_documents.py first
2. All data has been successfully migrated to the 'documents' table
3. You have verified the new documents system works correctly
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Drop the old tutor_documents and student_documents tables"""
    print("=" * 60)
    print("MIGRATION: Drop Old Document Tables")
    print("=" * 60)
    print("\n⚠️  WARNING: This will permanently delete the old tables!")
    print("    Make sure you have migrated all data first.\n")

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cursor = conn.cursor()

    try:
        # Step 1: Verify unified documents table exists and has data
        print("[Step 1] Verifying unified documents table...")

        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'documents'
            );
        """)
        documents_exists = cursor.fetchone()['exists']

        if not documents_exists:
            print("   ❌ ERROR: 'documents' table does not exist!")
            print("   Please run migrate_create_unified_documents.py first.")
            return

        cursor.execute("SELECT COUNT(*) as count FROM documents;")
        doc_count = cursor.fetchone()['count']
        print(f"   ✅ 'documents' table exists with {doc_count} records")

        # Step 2: Check old tables exist
        print("\n[Step 2] Checking old tables...")

        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_documents'
            );
        """)
        tutor_docs_exists = cursor.fetchone()['exists']

        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'student_documents'
            );
        """)
        student_docs_exists = cursor.fetchone()['exists']

        if not tutor_docs_exists and not student_docs_exists:
            print("   ℹ️  Both old tables already dropped. Nothing to do.")
            return

        # Step 3: Drop tutor_documents table
        if tutor_docs_exists:
            print("\n[Step 3] Dropping tutor_documents table...")
            cursor.execute("SELECT COUNT(*) as count FROM tutor_documents;")
            tutor_count = cursor.fetchone()['count']
            print(f"   Found {tutor_count} records in tutor_documents")

            cursor.execute("DROP TABLE IF EXISTS tutor_documents CASCADE;")
            print("   ✅ tutor_documents table dropped")
        else:
            print("\n[Step 3] tutor_documents table already dropped, skipping...")

        # Step 4: Drop student_documents table
        if student_docs_exists:
            print("\n[Step 4] Dropping student_documents table...")
            cursor.execute("SELECT COUNT(*) as count FROM student_documents;")
            student_count = cursor.fetchone()['count']
            print(f"   Found {student_count} records in student_documents")

            cursor.execute("DROP TABLE IF EXISTS student_documents CASCADE;")
            print("   ✅ student_documents table dropped")
        else:
            print("\n[Step 4] student_documents table already dropped, skipping...")

        conn.commit()

        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nOld tables have been removed.")
        print("The unified 'documents' table is now the only document storage.")

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
