"""
Migration: Drop manage_tutors_profile Table

Removes the manage_tutors_profile table as it has no admin page or API endpoints.
This table is different from manage_tutor_documents_profile and is not being used.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db?sslmode=disable'
)

def check_table_exists(cursor, table_name):
    """Check if a table exists in the database"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_name = %s
        )
    """, (table_name,))
    return cursor.fetchone()[0]

def drop_manage_tutors_profile_table():
    """Drop manage_tutors_profile table from the database"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print(f"\n{'='*60}")
        print("Dropping manage_tutors_profile table")
        print(f"{'='*60}\n")

        table_name = 'manage_tutors_profile'

        if check_table_exists(cursor, table_name):
            print(f"[DROP] Dropping '{table_name}' table...")
            cursor.execute(f"DROP TABLE {table_name} CASCADE")
            print(f"[SUCCESS] Table '{table_name}' dropped successfully")
        else:
            print(f"[OK] Table '{table_name}' does not exist (already dropped)")

        conn.commit()

        print(f"\n{'='*60}")
        print(f"[SUCCESS] Migration completed!")
        print(f"{'='*60}\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Drop manage_tutors_profile table")
    print(f"Database: {ADMIN_DATABASE_URL}\n")

    confirmation = input("Are you sure you want to drop manage_tutors_profile table? (yes/no): ")
    if confirmation.lower() == 'yes':
        drop_manage_tutors_profile_table()
    else:
        print("[CANCELLED] Migration cancelled by user")
