"""
Migration: Add credentials_reactivated tracking to admin_portfolio

Adds missing columns for tracking reactivated credentials:
- credentials_reactivated (counter)
- credentials_reactivated_ids (array)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db?sslmode=disable'
)

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

def add_credentials_reactivated_columns():
    """Add credentials_reactivated tracking columns to admin_portfolio table"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print(f"\n{'='*60}")
        print("Adding credentials_reactivated columns to admin_portfolio")
        print(f"{'='*60}\n")

        columns_added = 0

        # Add credentials_reactivated counter
        if not check_column_exists(cursor, 'admin_portfolio', 'credentials_reactivated'):
            print("[ADD] Adding 'credentials_reactivated' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN credentials_reactivated INTEGER DEFAULT 0
            """)
            columns_added += 1
        else:
            print("[OK] 'credentials_reactivated' column already exists")

        # Add credentials_reactivated_ids array
        if not check_column_exists(cursor, 'admin_portfolio', 'credentials_reactivated_ids'):
            print("[ADD] Adding 'credentials_reactivated_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN credentials_reactivated_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'credentials_reactivated_ids' column already exists")

        conn.commit()

        print(f"\n{'='*60}")
        print(f"[SUCCESS] Migration completed!")
        print(f"[SUCCESS] Added {columns_added} column(s) to admin_portfolio")
        print(f"{'='*60}\n")

        # Display column count
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'admin_portfolio'
        """)
        total_columns = cursor.fetchone()[0]
        print(f"[INFO] admin_portfolio now has {total_columns} columns\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Add credentials_reactivated columns to admin_portfolio")
    print(f"Database: {ADMIN_DATABASE_URL}\n")
    add_credentials_reactivated_columns()
