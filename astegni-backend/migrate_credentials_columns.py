"""
Migration script to add missing columns to the credentials table.

This adds the columns needed for the admin verification workflow:
- verified_by_admin_id: ID of the admin who verified/rejected
- rejection_reason: Reason for rejection or suspension
- rejected_at: Timestamp of rejection
- is_verified: Boolean flag for verification status
- is_featured: Boolean flag for featured credentials

Also renames existing columns for consistency with the API:
- user_id -> uploader_id
- user_role -> uploader_role
- credential_type -> document_type
- issuer -> issued_by
- issue_date -> date_of_issue
- file_url -> document_url

And adds new columns:
- file_name, file_type, file_size for file metadata

Run with: python migrate_credentials_columns.py
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')


def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def column_exists(cur, table_name, column_name):
    """Check if a column exists in a table"""
    cur.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
        )
    """, (table_name, column_name))
    return cur.fetchone()['exists']


def run_migration():
    """Run the migration to update credentials table"""
    print("\n" + "=" * 60)
    print("MIGRATING CREDENTIALS TABLE")
    print("=" * 60)

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'credentials'
            )
        """)

        if not cur.fetchone()['exists']:
            print("[ERROR] credentials table does not exist. Run migrate_create_all_missing_tables.py first.")
            return False

        print("\n[1/3] Adding new columns...")

        # Add verified_by_admin_id column
        if not column_exists(cur, 'credentials', 'verified_by_admin_id'):
            print("  Adding verified_by_admin_id...")
            cur.execute("ALTER TABLE credentials ADD COLUMN verified_by_admin_id INTEGER")
            conn.commit()
            print("  [OK] verified_by_admin_id added")
        else:
            print("  [SKIP] verified_by_admin_id already exists")

        # Add rejection_reason column
        if not column_exists(cur, 'credentials', 'rejection_reason'):
            print("  Adding rejection_reason...")
            cur.execute("ALTER TABLE credentials ADD COLUMN rejection_reason TEXT")
            conn.commit()
            print("  [OK] rejection_reason added")
        else:
            print("  [SKIP] rejection_reason already exists")

        # Add rejected_at column
        if not column_exists(cur, 'credentials', 'rejected_at'):
            print("  Adding rejected_at...")
            cur.execute("ALTER TABLE credentials ADD COLUMN rejected_at TIMESTAMP")
            conn.commit()
            print("  [OK] rejected_at added")
        else:
            print("  [SKIP] rejected_at already exists")

        # Add is_verified column
        if not column_exists(cur, 'credentials', 'is_verified'):
            print("  Adding is_verified...")
            cur.execute("ALTER TABLE credentials ADD COLUMN is_verified BOOLEAN DEFAULT FALSE")
            conn.commit()
            print("  [OK] is_verified added")
        else:
            print("  [SKIP] is_verified already exists")

        # Add is_featured column
        if not column_exists(cur, 'credentials', 'is_featured'):
            print("  Adding is_featured...")
            cur.execute("ALTER TABLE credentials ADD COLUMN is_featured BOOLEAN DEFAULT FALSE")
            conn.commit()
            print("  [OK] is_featured added")
        else:
            print("  [SKIP] is_featured already exists")

        # Add file_name column
        if not column_exists(cur, 'credentials', 'file_name'):
            print("  Adding file_name...")
            cur.execute("ALTER TABLE credentials ADD COLUMN file_name VARCHAR(255)")
            conn.commit()
            print("  [OK] file_name added")
        else:
            print("  [SKIP] file_name already exists")

        # Add file_type column
        if not column_exists(cur, 'credentials', 'file_type'):
            print("  Adding file_type...")
            cur.execute("ALTER TABLE credentials ADD COLUMN file_type VARCHAR(100)")
            conn.commit()
            print("  [OK] file_type added")
        else:
            print("  [SKIP] file_type already exists")

        # Add file_size column
        if not column_exists(cur, 'credentials', 'file_size'):
            print("  Adding file_size...")
            cur.execute("ALTER TABLE credentials ADD COLUMN file_size INTEGER")
            conn.commit()
            print("  [OK] file_size added")
        else:
            print("  [SKIP] file_size already exists")

        print("\n[2/3] Renaming columns for API consistency...")

        # Rename user_id to uploader_id (if needed)
        if column_exists(cur, 'credentials', 'user_id') and not column_exists(cur, 'credentials', 'uploader_id'):
            print("  Renaming user_id to uploader_id...")
            cur.execute("ALTER TABLE credentials RENAME COLUMN user_id TO uploader_id")
            conn.commit()
            print("  [OK] user_id renamed to uploader_id")
        elif column_exists(cur, 'credentials', 'uploader_id'):
            print("  [SKIP] uploader_id already exists")
        else:
            # Add uploader_id if neither exists
            print("  Adding uploader_id...")
            cur.execute("ALTER TABLE credentials ADD COLUMN uploader_id INTEGER")
            conn.commit()
            print("  [OK] uploader_id added")

        # Rename user_role to uploader_role (if needed)
        if column_exists(cur, 'credentials', 'user_role') and not column_exists(cur, 'credentials', 'uploader_role'):
            print("  Renaming user_role to uploader_role...")
            cur.execute("ALTER TABLE credentials RENAME COLUMN user_role TO uploader_role")
            conn.commit()
            print("  [OK] user_role renamed to uploader_role")
        elif column_exists(cur, 'credentials', 'uploader_role'):
            print("  [SKIP] uploader_role already exists")
        else:
            # Add uploader_role if neither exists
            print("  Adding uploader_role...")
            cur.execute("ALTER TABLE credentials ADD COLUMN uploader_role VARCHAR(50)")
            conn.commit()
            print("  [OK] uploader_role added")

        # Rename credential_type to document_type (if needed)
        if column_exists(cur, 'credentials', 'credential_type') and not column_exists(cur, 'credentials', 'document_type'):
            print("  Renaming credential_type to document_type...")
            cur.execute("ALTER TABLE credentials RENAME COLUMN credential_type TO document_type")
            conn.commit()
            print("  [OK] credential_type renamed to document_type")
        elif column_exists(cur, 'credentials', 'document_type'):
            print("  [SKIP] document_type already exists")
        else:
            # Add document_type if neither exists
            print("  Adding document_type...")
            cur.execute("ALTER TABLE credentials ADD COLUMN document_type VARCHAR(50)")
            conn.commit()
            print("  [OK] document_type added")

        # Rename issuer to issued_by (if needed)
        if column_exists(cur, 'credentials', 'issuer') and not column_exists(cur, 'credentials', 'issued_by'):
            print("  Renaming issuer to issued_by...")
            cur.execute("ALTER TABLE credentials RENAME COLUMN issuer TO issued_by")
            conn.commit()
            print("  [OK] issuer renamed to issued_by")
        elif column_exists(cur, 'credentials', 'issued_by'):
            print("  [SKIP] issued_by already exists")
        else:
            # Add issued_by if neither exists
            print("  Adding issued_by...")
            cur.execute("ALTER TABLE credentials ADD COLUMN issued_by VARCHAR(255)")
            conn.commit()
            print("  [OK] issued_by added")

        # Rename issue_date to date_of_issue (if needed)
        if column_exists(cur, 'credentials', 'issue_date') and not column_exists(cur, 'credentials', 'date_of_issue'):
            print("  Renaming issue_date to date_of_issue...")
            cur.execute("ALTER TABLE credentials RENAME COLUMN issue_date TO date_of_issue")
            conn.commit()
            print("  [OK] issue_date renamed to date_of_issue")
        elif column_exists(cur, 'credentials', 'date_of_issue'):
            print("  [SKIP] date_of_issue already exists")
        else:
            # Add date_of_issue if neither exists
            print("  Adding date_of_issue...")
            cur.execute("ALTER TABLE credentials ADD COLUMN date_of_issue DATE")
            conn.commit()
            print("  [OK] date_of_issue added")

        # Rename file_url to document_url (if needed)
        if column_exists(cur, 'credentials', 'file_url') and not column_exists(cur, 'credentials', 'document_url'):
            print("  Renaming file_url to document_url...")
            cur.execute("ALTER TABLE credentials RENAME COLUMN file_url TO document_url")
            conn.commit()
            print("  [OK] file_url renamed to document_url")
        elif column_exists(cur, 'credentials', 'document_url'):
            print("  [SKIP] document_url already exists")
        else:
            # Add document_url if neither exists
            print("  Adding document_url...")
            cur.execute("ALTER TABLE credentials ADD COLUMN document_url TEXT")
            conn.commit()
            print("  [OK] document_url added")

        print("\n[3/3] Updating existing data...")

        # Update is_verified based on verification_status
        print("  Syncing is_verified with verification_status...")
        cur.execute("""
            UPDATE credentials
            SET is_verified = (verification_status = 'verified')
            WHERE is_verified IS NULL OR is_verified != (verification_status = 'verified')
        """)
        updated = cur.rowcount
        conn.commit()
        print(f"  [OK] Updated {updated} rows")

        # Verify final table structure
        print("\n" + "=" * 60)
        print("FINAL TABLE STRUCTURE")
        print("=" * 60)

        cur.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'credentials'
            ORDER BY ordinal_position
        """)

        columns = cur.fetchall()
        for col in columns:
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            nullable = " NOT NULL" if col['is_nullable'] == 'NO' else ""
            print(f"  {col['column_name']}: {col['data_type']}{default}{nullable}")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    run_migration()
