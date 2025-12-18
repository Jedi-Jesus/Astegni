"""
Migration: Enhance admin_portfolio with detailed tracking

Adds comprehensive tracking columns:
1. Created/Added counts (courses_created, schools_added, etc.)
2. ID arrays for tracking specific items (courses_verified_ids[], courses_rejected_ids[], etc.)
3. Reason arrays for rejections/suspensions with corresponding IDs
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

def enhance_admin_portfolio():
    """Add detailed tracking columns to admin_portfolio table"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print(f"\n{'='*60}")
        print("Enhancing admin_portfolio table with detailed tracking")
        print(f"{'='*60}\n")

        columns_added = 0

        # ========================================
        # COURSES - Enhanced tracking
        # ========================================

        # courses_created - total courses created
        if not check_column_exists(cursor, 'admin_portfolio', 'courses_created'):
            print("[ADD] Adding 'courses_created' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN courses_created INTEGER DEFAULT 0
            """)
            columns_added += 1
        else:
            print("[OK] 'courses_created' already exists")

        # courses_verified_ids - array of verified course IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'courses_verified_ids'):
            print("[ADD] Adding 'courses_verified_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN courses_verified_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'courses_verified_ids' already exists")

        # courses_rejected_ids - array of rejected course IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'courses_rejected_ids'):
            print("[ADD] Adding 'courses_rejected_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN courses_rejected_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'courses_rejected_ids' already exists")

        # courses_suspended_ids - array of suspended course IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'courses_suspended_ids'):
            print("[ADD] Adding 'courses_suspended_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN courses_suspended_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'courses_suspended_ids' already exists")

        # courses_rejected_reasons - JSONB array [{id: 123, reason: "..."}, ...]
        if not check_column_exists(cursor, 'admin_portfolio', 'courses_rejected_reasons'):
            print("[ADD] Adding 'courses_rejected_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN courses_rejected_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'courses_rejected_reasons' already exists")

        # courses_suspended_reasons - JSONB array [{id: 123, reason: "..."}, ...]
        if not check_column_exists(cursor, 'admin_portfolio', 'courses_suspended_reasons'):
            print("[ADD] Adding 'courses_suspended_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN courses_suspended_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'courses_suspended_reasons' already exists")

        # ========================================
        # SCHOOLS - Enhanced tracking
        # ========================================

        # schools_added - total schools added/created
        if not check_column_exists(cursor, 'admin_portfolio', 'schools_added'):
            print("[ADD] Adding 'schools_added' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN schools_added INTEGER DEFAULT 0
            """)
            columns_added += 1
        else:
            print("[OK] 'schools_added' already exists")

        # schools_verified_ids - array of verified school IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'schools_verified_ids'):
            print("[ADD] Adding 'schools_verified_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN schools_verified_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'schools_verified_ids' already exists")

        # schools_rejected_ids - array of rejected school IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'schools_rejected_ids'):
            print("[ADD] Adding 'schools_rejected_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN schools_rejected_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'schools_rejected_ids' already exists")

        # schools_suspended_ids - array of suspended school IDs
        if not check_column_exists(cursor, 'admin_portfolio', 'schools_suspended_ids'):
            print("[ADD] Adding 'schools_suspended_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN schools_suspended_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'schools_suspended_ids' already exists")

        # schools_rejected_reasons - JSONB array [{id: 456, reason: "..."}, ...]
        if not check_column_exists(cursor, 'admin_portfolio', 'schools_rejected_reasons'):
            print("[ADD] Adding 'schools_rejected_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN schools_rejected_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'schools_rejected_reasons' already exists")

        # schools_suspended_reasons - JSONB array [{id: 456, reason: "..."}, ...]
        if not check_column_exists(cursor, 'admin_portfolio', 'schools_suspended_reasons'):
            print("[ADD] Adding 'schools_suspended_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN schools_suspended_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'schools_suspended_reasons' already exists")

        # ========================================
        # CREDENTIALS - Enhanced tracking
        # ========================================

        # credentials_verified_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'credentials_verified_ids'):
            print("[ADD] Adding 'credentials_verified_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN credentials_verified_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'credentials_verified_ids' already exists")

        # credentials_rejected_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'credentials_rejected_ids'):
            print("[ADD] Adding 'credentials_rejected_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN credentials_rejected_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'credentials_rejected_ids' already exists")

        # credentials_suspended_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'credentials_suspended_ids'):
            print("[ADD] Adding 'credentials_suspended_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN credentials_suspended_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'credentials_suspended_ids' already exists")

        # credentials_rejected_reasons
        if not check_column_exists(cursor, 'admin_portfolio', 'credentials_rejected_reasons'):
            print("[ADD] Adding 'credentials_rejected_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN credentials_rejected_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'credentials_rejected_reasons' already exists")

        # credentials_suspended_reasons
        if not check_column_exists(cursor, 'admin_portfolio', 'credentials_suspended_reasons'):
            print("[ADD] Adding 'credentials_suspended_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN credentials_suspended_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'credentials_suspended_reasons' already exists")

        # ========================================
        # STUDENTS - Enhanced tracking
        # ========================================

        # students_verified_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'students_verified_ids'):
            print("[ADD] Adding 'students_verified_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN students_verified_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'students_verified_ids' already exists")

        # students_suspended_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'students_suspended_ids'):
            print("[ADD] Adding 'students_suspended_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN students_suspended_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'students_suspended_ids' already exists")

        # students_suspended_reasons
        if not check_column_exists(cursor, 'admin_portfolio', 'students_suspended_reasons'):
            print("[ADD] Adding 'students_suspended_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN students_suspended_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'students_suspended_reasons' already exists")

        # ========================================
        # CONTENTS - Enhanced tracking
        # ========================================

        # contents_approved_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'contents_approved_ids'):
            print("[ADD] Adding 'contents_approved_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN contents_approved_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'contents_approved_ids' already exists")

        # contents_rejected_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'contents_rejected_ids'):
            print("[ADD] Adding 'contents_rejected_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN contents_rejected_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'contents_rejected_ids' already exists")

        # contents_rejected_reasons
        if not check_column_exists(cursor, 'admin_portfolio', 'contents_rejected_reasons'):
            print("[ADD] Adding 'contents_rejected_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN contents_rejected_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'contents_rejected_reasons' already exists")

        # ========================================
        # DOCUMENTS (Tutor Documents) - Enhanced tracking
        # ========================================

        # documents_verified_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'documents_verified_ids'):
            print("[ADD] Adding 'documents_verified_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN documents_verified_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'documents_verified_ids' already exists")

        # documents_rejected_ids
        if not check_column_exists(cursor, 'admin_portfolio', 'documents_rejected_ids'):
            print("[ADD] Adding 'documents_rejected_ids' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN documents_rejected_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
            """)
            columns_added += 1
        else:
            print("[OK] 'documents_rejected_ids' already exists")

        # documents_rejected_reasons
        if not check_column_exists(cursor, 'admin_portfolio', 'documents_rejected_reasons'):
            print("[ADD] Adding 'documents_rejected_reasons' column...")
            cursor.execute("""
                ALTER TABLE admin_portfolio
                ADD COLUMN documents_rejected_reasons JSONB DEFAULT '[]'::jsonb
            """)
            columns_added += 1
        else:
            print("[OK] 'documents_rejected_reasons' already exists")

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
    print("Starting migration: Enhance admin_portfolio with detailed tracking")
    print(f"Database: {ADMIN_DATABASE_URL}\n")
    enhance_admin_portfolio()
