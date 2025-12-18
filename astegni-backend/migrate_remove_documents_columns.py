"""
Migration: Remove Documents (Tutor Documents) Columns from admin_portfolio

Removes all document-related columns as there is no manage-tutor-documents page:
- documents_verified (counter)
- documents_rejected (counter)
- documents_verified_ids (array)
- documents_rejected_ids (array)
- documents_rejected_reasons (JSONB)

Reason: The manage-tutor-documents department has no dedicated admin page,
        so these tracking columns are unnecessary.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db?sslmode=disable'
)

# Columns to remove from admin_portfolio
COLUMNS_TO_REMOVE = [
    'documents_verified',
    'documents_rejected',
    'documents_verified_ids',
    'documents_rejected_ids',
    'documents_rejected_reasons'
]

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
        )
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def remove_documents_columns():
    """Remove documents-related columns from admin_portfolio table"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print(f"\n{'='*60}")
        print("Removing Documents columns from admin_portfolio")
        print(f"{'='*60}\n")

        columns_removed = 0

        for column in COLUMNS_TO_REMOVE:
            if check_column_exists(cursor, 'admin_portfolio', column):
                print(f"[REMOVE] Dropping '{column}' column...")
                cursor.execute(f"""
                    ALTER TABLE admin_portfolio
                    DROP COLUMN {column}
                """)
                columns_removed += 1
            else:
                print(f"[OK] '{column}' column doesn't exist")

        conn.commit()

        print(f"\n{'='*60}")
        print(f"[SUCCESS] Migration completed!")
        print(f"[SUCCESS] Removed {columns_removed} column(s) from admin_portfolio")
        print(f"{'='*60}\n")

        # Display remaining column count
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'admin_portfolio'
        """)
        remaining_columns = cursor.fetchone()[0]
        print(f"[INFO] admin_portfolio now has {remaining_columns} columns (was 75)\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Remove Documents columns from admin_portfolio")
    print(f"Database: {ADMIN_DATABASE_URL}\n")
    remove_documents_columns()
