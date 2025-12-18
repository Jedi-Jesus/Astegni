"""
Migration: Add Manage-Admins Department Stats to admin_portfolio

Adds stats columns for the manage-admins department:
- admins_invited (count)
- admins_verified (count)
- admins_suspended (count)
- admins_removed (count)
- admins_invited_ids (array)
- admins_verified_ids (array)
- admins_suspended_ids (array)
- admins_removed_ids (array)
- admins_suspended_reasons (JSONB)
- admins_removed_reasons (JSONB)
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

def add_admins_stats():
    """Add manage-admins department stats to admin_portfolio"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print(f"\n{'='*60}")
        print("Adding Manage-Admins stats to admin_portfolio")
        print(f"{'='*60}\n")

        columns_added = 0

        # admins_invited - total admins invited by this admin
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_invited'):
            print("[ADD] Adding 'admins_invited' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_invited INTEGER DEFAULT 0
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_invited' already exists")

        # admins_verified - total admins verified/approved
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_verified'):
            print("[ADD] Adding 'admins_verified' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_verified INTEGER DEFAULT 0
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_verified' already exists")

        # admins_suspended - total admins suspended
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_suspended'):
            print("[ADD] Adding 'admins_suspended' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_suspended INTEGER DEFAULT 0
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_suspended' already exists")

        # admins_removed - total admins removed/deleted
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_removed'):
            print("[ADD] Adding 'admins_removed' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_removed INTEGER DEFAULT 0
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_removed' already exists")

        # admins_invited_ids - array of invited admin IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_invited_ids'):
            print("[ADD] Adding 'admins_invited_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_invited_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_invited_ids' already exists")

        # admins_verified_ids - array of verified admin IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_verified_ids'):
            print("[ADD] Adding 'admins_verified_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_verified_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_verified_ids' already exists")

        # admins_suspended_ids - array of suspended admin IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_suspended_ids'):
            print("[ADD] Adding 'admins_suspended_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_suspended_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_suspended_ids' already exists")

        # admins_removed_ids - array of removed admin IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_removed_ids'):
            print("[ADD] Adding 'admins_removed_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_removed_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_removed_ids' already exists")

        # admins_suspended_reasons - JSONB array [{id, reason, date}, ...]
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_suspended_reasons'):
            print("[ADD] Adding 'admins_suspended_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_suspended_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_suspended_reasons' already exists")

        # admins_removed_reasons - JSONB array [{id, reason, date}, ...]
        if not check_column_exists(cursor, 'admin_portfolio', 'admins_removed_reasons'):
            print("[ADD] Adding 'admins_removed_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN admins_removed_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'admins_removed_reasons' already exists")

        conn.commit()

        print(f"\n{'='*60}")
        print(f"[SUCCESS] Migration completed!")
        print(f"[SUCCESS] Added {columns_added} new column(s) to admin_portfolio")
        print(f"{'='*60}\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Add Manage-Admins stats to admin_portfolio")
    print(f"Database: {ADMIN_DATABASE_URL}\n")
    add_admins_stats()
