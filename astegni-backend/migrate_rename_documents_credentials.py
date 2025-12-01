"""
Migration: Rename Tables for Better Clarity

This migration:
1. Renames 'documents' table to 'credentials' (achievements, experience, certificates)
2. Renames 'learning_materials' table to 'documents' (teaching/learning materials)

Final Table Structure:
- credentials: For credentials (achievements, experience, certificates)
- documents: For teaching/learning documents (PDFs, worksheets, assignments)
- videos: For video content
- images: For image content
- audios: For audio content (lectures, podcasts)
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
import sys

# Fix Windows encoding issue
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')


def run_migration():
    """Run the migration to rename tables"""

    print("=" * 60)
    print("MIGRATION: Rename Documents/Learning Materials Tables")
    print("=" * 60)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        # Step 1: Check current table structure
        print("\n[1/4] Checking current table structure...")

        # Check if documents table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'documents'
            )
        """)
        documents_exists = cur.fetchone()['exists']
        print(f"   - 'documents' table exists: {documents_exists}")

        # Check if learning_materials table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'learning_materials'
            )
        """)
        learning_materials_exists = cur.fetchone()['exists']
        print(f"   - 'learning_materials' table exists: {learning_materials_exists}")

        # Check if credentials table already exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'credentials'
            )
        """)
        credentials_exists = cur.fetchone()['exists']
        print(f"   - 'credentials' table exists: {credentials_exists}")

        # Step 2: Rename documents to credentials
        print("\n[2/4] Renaming 'documents' to 'credentials'...")

        if credentials_exists:
            print("   [SKIP] 'credentials' table already exists")
        elif documents_exists:
            # First rename to a temp name to avoid conflicts
            cur.execute("ALTER TABLE documents RENAME TO credentials")
            print("   [OK] Renamed 'documents' to 'credentials'")
        else:
            print("   [SKIP] 'documents' table does not exist")

        # Step 3: Rename learning_materials to documents
        print("\n[3/4] Renaming 'learning_materials' to 'documents'...")

        # Check again if documents exists (it shouldn't after rename)
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'documents'
            )
        """)
        documents_exists_now = cur.fetchone()['exists']

        if documents_exists_now:
            print("   [SKIP] 'documents' table already exists (from previous step or other source)")
        elif learning_materials_exists:
            cur.execute("ALTER TABLE learning_materials RENAME TO documents")
            print("   [OK] Renamed 'learning_materials' to 'documents'")
        else:
            print("   [SKIP] 'learning_materials' table does not exist")

        # Step 4: Verify final structure
        print("\n[4/4] Verifying final table structure...")

        tables_to_check = ['credentials', 'documents', 'videos', 'images', 'audios']
        for table in tables_to_check:
            cur.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = '{table}'
                )
            """)
            exists = cur.fetchone()['exists']
            status = "[OK]" if exists else "[MISSING]"
            print(f"   {status} {table}")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nFinal Table Structure:")
        print("  - credentials  : Achievements, experience, certificates")
        print("  - documents    : Teaching/learning materials (PDFs, worksheets)")
        print("  - videos       : Video content")
        print("  - images       : Image content")
        print("  - audios       : Audio content (lectures, podcasts)")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
