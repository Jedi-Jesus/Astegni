"""
Migration: Rename tutor_resources to resources table
- Renames table from tutor_resources to resources
- Changes tutor_id to uploader_id
- Adds uploader_role field
- Removes resource_type and view_count fields
- Renames created_at to upload_date
- Renames updated_at to modification_date
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Parse the DATABASE_URL
def parse_db_url(url):
    # Remove the postgresql:// prefix
    url = url.replace("postgresql://", "")
    # Split user:password@host:port/database
    user_pass, host_db = url.split("@")
    user, password = user_pass.split(":")
    host_port, database = host_db.split("/")
    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"
    # Remove query parameters from database name
    if "?" in database:
        database = database.split("?")[0]
    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "database": database
    }

def migrate():
    db_config = parse_db_url(DATABASE_URL)

    conn = psycopg2.connect(
        host=db_config["host"],
        port=db_config["port"],
        database=db_config["database"],
        user=db_config["user"],
        password=db_config["password"]
    )

    cursor = conn.cursor()

    try:
        # Check if tutor_resources table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_resources'
            );
        """)
        tutor_resources_exists = cursor.fetchone()[0]

        # Check if resources table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'resources'
            );
        """)
        resources_exists = cursor.fetchone()[0]

        if resources_exists:
            print("[OK] 'resources' table already exists. Skipping migration.")
            return

        if tutor_resources_exists:
            print("Found 'tutor_resources' table. Migrating to 'resources'...")

            # Step 1: Rename the table
            cursor.execute("ALTER TABLE tutor_resources RENAME TO resources;")
            print("[OK] Renamed table to 'resources'")

            # Step 2: Rename tutor_id to uploader_id
            cursor.execute("ALTER TABLE resources RENAME COLUMN tutor_id TO uploader_id;")
            print("[OK] Renamed tutor_id to uploader_id")

            # Step 3: Add uploader_role column
            cursor.execute("""
                ALTER TABLE resources
                ADD COLUMN IF NOT EXISTS uploader_role VARCHAR(50) DEFAULT 'tutor';
            """)
            print("[OK] Added uploader_role column")

            # Step 4: Remove resource_type column (if exists)
            cursor.execute("""
                ALTER TABLE resources DROP COLUMN IF EXISTS resource_type;
            """)
            print("[OK] Removed resource_type column")

            # Step 5: Remove view_count column (if exists)
            cursor.execute("""
                ALTER TABLE resources DROP COLUMN IF EXISTS view_count;
            """)
            print("[OK] Removed view_count column")

            # Step 6: Rename created_at to upload_date
            cursor.execute("ALTER TABLE resources RENAME COLUMN created_at TO upload_date;")
            print("[OK] Renamed created_at to upload_date")

            # Step 7: Rename updated_at to modification_date
            cursor.execute("ALTER TABLE resources RENAME COLUMN updated_at TO modification_date;")
            print("[OK] Renamed updated_at to modification_date")

            conn.commit()
            print("\n[SUCCESS] Migration completed successfully!")

        else:
            print("'tutor_resources' table does not exist. Creating fresh 'resources' table...")

            # Create the resources table from scratch
            cursor.execute("""
                CREATE TABLE resources (
                    id SERIAL PRIMARY KEY,
                    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    uploader_role VARCHAR(50) NOT NULL DEFAULT 'tutor',
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    category VARCHAR(100),
                    grade_level VARCHAR(50),
                    description TEXT,
                    file_url VARCHAR(500) NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_size INTEGER,
                    file_type VARCHAR(100),
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tags JSONB,
                    visibility VARCHAR(20) DEFAULT 'private',
                    download_count INTEGER DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'active'
                );
            """)

            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_uploader_id ON resources(uploader_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_uploader_role ON resources(uploader_role);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);")

            conn.commit()
            print("\n[SUCCESS] Created fresh 'resources' table successfully!")

        # Show final table structure
        print("\nFinal 'resources' table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'resources'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
