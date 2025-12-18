"""
Migration: Remove Duplicate Columns from credentials Table

Removes duplicate rejection/status columns from credentials table:
- rejection_reason (duplicate of status_reason)
- rejected_at (duplicate of status_at)

These columns are redundant as we already have status_reason and status_at
which serve the same purpose.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db?sslmode=disable'
)

# Columns to remove from credentials table
COLUMNS_TO_REMOVE = [
    'rejection_reason',
    'rejected_at'
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

def remove_duplicate_columns():
    """Remove duplicate rejection columns from credentials table"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print(f"\n{'='*60}")
        print("Removing duplicate columns from credentials table")
        print(f"{'='*60}\n")

        columns_removed = 0

        for column in COLUMNS_TO_REMOVE:
            if check_column_exists(cursor, 'credentials', column):
                print(f"[REMOVE] Dropping '{column}' column...")
                cursor.execute(f"""
                    ALTER TABLE credentials
                    DROP COLUMN {column}
                """)
                columns_removed += 1
            else:
                print(f"[OK] '{column}' column doesn't exist")

        conn.commit()

        print(f"\n{'='*60}")
        print(f"[SUCCESS] Migration completed!")
        print(f"[SUCCESS] Removed {columns_removed} column(s) from credentials table")
        print(f"{'='*60}\n")

        # Display remaining column count
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'credentials'
        """)
        remaining_columns = cursor.fetchone()[0]
        print(f"[INFO] credentials table now has {remaining_columns} columns (was {remaining_columns + columns_removed})\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Remove duplicate columns from credentials table")
    print(f"Database: {DATABASE_URL}\n")

    confirmation = input("Are you sure you want to remove rejection_reason and rejected_at columns? (yes/no): ")
    if confirmation.lower() == 'yes':
        remove_duplicate_columns()
    else:
        print("[CANCELLED] Migration cancelled by user")
