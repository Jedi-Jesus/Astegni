"""
Migration: Remove unnecessary fields from tutor_profiles table

Removes the following columns:
- courses
- course_type
- teaches_at
- sessionFormat
- experience
- courses_created
- id_document_url

Run with: python migrate_remove_tutor_profile_fields.py
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

# Parse connection string
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "")

# Remove query parameters (like ?sslmode=disable)
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

parts = DATABASE_URL.split("@")
user_pass = parts[0].split(":")
host_db = parts[1].split("/")
host_port = host_db[0].split(":")

DB_USER = user_pass[0]
DB_PASSWORD = user_pass[1]
DB_HOST = host_port[0]
DB_PORT = host_port[1] if len(host_port) > 1 else "5432"
DB_NAME = host_db[1]

COLUMNS_TO_DROP = [
    'courses',
    'course_type',
    'teaches_at',
    '"sessionFormat"',  # Quoted because of camelCase
    'experience',
    'courses_created',
    'id_document_url',
    'grades',
    'live_picture'
]

def run_migration():
    print("=" * 60)
    print("Migration: Remove tutor_profiles fields")
    print("=" * 60)

    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.autocommit = False
        cursor = conn.cursor()

        print(f"\nConnected to database: {DB_NAME}")

        # Check which columns exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"\nExisting columns in tutor_profiles: {existing_columns}")

        # Drop each column if it exists
        for col in COLUMNS_TO_DROP:
            col_name = col.strip('"')  # Remove quotes for checking
            if col_name in existing_columns or col_name.lower() in [c.lower() for c in existing_columns]:
                print(f"\nDropping column: {col}")
                try:
                    cursor.execute(f"ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS {col}")
                    print(f"  Successfully dropped {col}")
                except Exception as e:
                    print(f"  Error dropping {col}: {e}")
            else:
                print(f"\nColumn {col} does not exist, skipping...")

        conn.commit()
        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

        # Verify remaining columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            ORDER BY ordinal_position
        """)
        remaining_columns = [row[0] for row in cursor.fetchall()]
        print(f"\nRemaining columns in tutor_profiles:")
        for col in remaining_columns:
            print(f"  - {col}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\nError during migration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    run_migration()
