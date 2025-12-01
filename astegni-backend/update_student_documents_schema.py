"""
Update student_documents table to add verification and featured fields
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def update_schema():
    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("=" * 60)
        print("UPDATING STUDENT_DOCUMENTS SCHEMA")
        print("=" * 60)

        # Rename document_date to date_of_issue
        print("\n[1/7] Renaming document_date to date_of_issue...")
        try:
            cur.execute("ALTER TABLE student_documents RENAME COLUMN document_date TO date_of_issue")
            print("  ✓ Renamed document_date to date_of_issue")
        except Exception as e:
            print(f"  ⚠ Column might already be renamed: {e}")

        conn.commit()

        # Rename file_url to document_url
        print("\n[2/7] Renaming file_url to document_url...")
        try:
            cur.execute("ALTER TABLE student_documents RENAME COLUMN file_url TO document_url")
            print("  ✓ Renamed file_url to document_url")
        except Exception as e:
            print(f"  ⚠ Column might already be renamed: {e}")

        conn.commit()

        # Add expiry_date
        print("\n[3/7] Adding expiry_date column...")
        try:
            cur.execute("ALTER TABLE student_documents ADD COLUMN expiry_date DATE")
            print("  ✓ Added expiry_date column")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        conn.commit()

        # Add verification_status
        print("\n[4/7] Adding verification_status column...")
        try:
            cur.execute("""
                ALTER TABLE student_documents
                ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending'
                CHECK (verification_status IN ('pending', 'verified', 'rejected'))
            """)
            print("  ✓ Added verification_status column")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        conn.commit()

        # Add is_verified
        print("\n[5/7] Adding is_verified column...")
        try:
            cur.execute("ALTER TABLE student_documents ADD COLUMN is_verified BOOLEAN DEFAULT FALSE")
            print("  ✓ Added is_verified column")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        conn.commit()

        # Add verified_by_admin_id
        print("\n[6/7] Adding verified_by_admin_id column...")
        try:
            cur.execute("""
                ALTER TABLE student_documents
                ADD COLUMN verified_by_admin_id INTEGER REFERENCES admin_profile(id) ON DELETE SET NULL
            """)
            print("  ✓ Added verified_by_admin_id column")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        conn.commit()

        # Add rejection fields
        print("\n[7/7] Adding rejection_reason, rejected_at, is_featured columns...")
        try:
            cur.execute("ALTER TABLE student_documents ADD COLUMN rejection_reason TEXT")
            print("  ✓ Added rejection_reason column")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        try:
            cur.execute("ALTER TABLE student_documents ADD COLUMN rejected_at TIMESTAMP")
            print("  ✓ Added rejected_at column")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        try:
            cur.execute("ALTER TABLE student_documents ADD COLUMN is_featured BOOLEAN DEFAULT FALSE")
            print("  ✓ Added is_featured column")
        except Exception as e:
            print(f"  ⚠ Column might already exist: {e}")

        conn.commit()

        # Make certain columns nullable
        print("\n[8/8] Making date_of_issue and document_url nullable...")
        try:
            cur.execute("ALTER TABLE student_documents ALTER COLUMN date_of_issue DROP NOT NULL")
            print("  ✓ Made date_of_issue nullable")
        except Exception as e:
            print(f"  ⚠ Already nullable: {e}")

        try:
            cur.execute("ALTER TABLE student_documents ALTER COLUMN document_url DROP NOT NULL")
            print("  ✓ Made document_url nullable")
        except Exception as e:
            print(f"  ⚠ Already nullable: {e}")

        conn.commit()

        # Verify final schema
        print("\n" + "=" * 60)
        print("FINAL SCHEMA VERIFICATION")
        print("=" * 60)

        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'student_documents'
            ORDER BY ordinal_position
        """)

        columns = cur.fetchall()
        print(f"\nFinal schema ({len(columns)} columns):")
        for col in columns:
            nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col[3]}" if col[3] else ""
            print(f"  - {col[0]}: {col[1]} ({nullable}){default}")

        print("\n" + "=" * 60)
        print("SCHEMA UPDATE COMPLETED!")
        print("=" * 60)

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    update_schema()
