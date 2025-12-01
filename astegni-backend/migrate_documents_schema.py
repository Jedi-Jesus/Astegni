"""
Migration: Update documents table schema
- Add 'folder' column
- Rename 'upload_date' to 'created_at'
- Rename 'modification_date' to 'updated_at'
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')


def migrate():
    """Run the migration"""
    print("Starting documents table schema migration...")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cursor:
            # Check if documents table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'documents'
                )
            """)
            if not cursor.fetchone()[0]:
                print("ERROR: 'documents' table does not exist!")
                return False

            # 1. Add 'folder' column if it doesn't exist
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'documents' AND column_name = 'folder'
                )
            """)
            if not cursor.fetchone()[0]:
                print("Adding 'folder' column...")
                cursor.execute("""
                    ALTER TABLE documents
                    ADD COLUMN folder VARCHAR(255) DEFAULT NULL
                """)
                print("[OK] Added 'folder' column")
            else:
                print("[OK] 'folder' column already exists")

            # 2. Rename 'upload_date' to 'created_at' if needed
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'documents' AND column_name = 'upload_date'
                )
            """)
            has_upload_date = cursor.fetchone()[0]

            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'documents' AND column_name = 'created_at'
                )
            """)
            has_created_at = cursor.fetchone()[0]

            if has_upload_date and not has_created_at:
                print("Renaming 'upload_date' to 'created_at'...")
                cursor.execute("""
                    ALTER TABLE documents
                    RENAME COLUMN upload_date TO created_at
                """)
                print("[OK] Renamed 'upload_date' to 'created_at'")
            elif has_created_at:
                print("[OK] 'created_at' column already exists")
            else:
                print("Adding 'created_at' column...")
                cursor.execute("""
                    ALTER TABLE documents
                    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                """)
                print("[OK] Added 'created_at' column")

            # 3. Rename 'modification_date' to 'updated_at' if needed
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'documents' AND column_name = 'modification_date'
                )
            """)
            has_modification_date = cursor.fetchone()[0]

            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'documents' AND column_name = 'updated_at'
                )
            """)
            has_updated_at = cursor.fetchone()[0]

            if has_modification_date and not has_updated_at:
                print("Renaming 'modification_date' to 'updated_at'...")
                cursor.execute("""
                    ALTER TABLE documents
                    RENAME COLUMN modification_date TO updated_at
                """)
                print("[OK] Renamed 'modification_date' to 'updated_at'")
            elif has_updated_at:
                print("[OK] 'updated_at' column already exists")
            else:
                print("Adding 'updated_at' column...")
                cursor.execute("""
                    ALTER TABLE documents
                    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                """)
                print("[OK] Added 'updated_at' column")

            conn.commit()

            # Verify final schema
            print("\n--- Final documents table columns ---")
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'documents'
                ORDER BY ordinal_position
            """)
            for row in cursor.fetchall():
                print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")

            print("\n[SUCCESS] Migration completed successfully!")
            return True


if __name__ == "__main__":
    migrate()
