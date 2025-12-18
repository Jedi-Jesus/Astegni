"""
Migration: Add Reactivated IDs Tracking to admin_portfolio

Adds missing reactivated_ids array columns for all departments that support
reactivation/reinstatement actions:
- courses_reactivated_ids[]
- schools_reactivated_ids[]
- students_reactivated_ids[]

Note: credentials_reactivated_ids[] was already added by migrate_add_credentials_reactivated.py
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

def add_all_reactivated_ids_columns():
    """Add reactivated_ids tracking columns to admin_portfolio table"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print(f"\n{'='*60}")
        print("Adding reactivated_ids columns to admin_portfolio")
        print(f"{'='*60}\n")

        columns_to_add = [
            'courses_reactivated_ids',
            'schools_reactivated_ids',
            'students_reactivated_ids'
        ]

        columns_added = 0

        for column in columns_to_add:
            if not check_column_exists(cursor, 'admin_portfolio', column):
                print(f"[ADD] Adding '{column}' column...")
                cursor.execute(f"""
                    ALTER TABLE admin_portfolio
                    ADD COLUMN {column} INTEGER[] DEFAULT ARRAY[]::INTEGER[]
                """)
                columns_added += 1
            else:
                print(f"[OK] '{column}' column already exists")

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

        # Display summary of all reactivated tracking columns
        print(f"{'='*60}")
        print("Summary of Reactivated Tracking Columns")
        print(f"{'='*60}\n")

        reactivated_columns = [
            'courses_reactivated',
            'courses_reactivated_ids',
            'schools_reactivated',
            'schools_reactivated_ids',
            'credentials_reactivated',
            'credentials_reactivated_ids',
            'students_reactivated',
            'students_reactivated_ids'
        ]

        for col in reactivated_columns:
            exists = check_column_exists(cursor, 'admin_portfolio', col)
            status = "[OK] EXISTS" if exists else "[MISSING]"
            print(f"{status}: {col}")

        print(f"\n{'='*60}\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Add all reactivated_ids columns to admin_portfolio")
    print(f"Database: {ADMIN_DATABASE_URL}\n")
    add_all_reactivated_ids_columns()
