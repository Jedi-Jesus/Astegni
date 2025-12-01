"""
Migration: Add resource_type, view_count, and thumbnail fields to resources table
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def parse_db_url(url):
    url = url.replace("postgresql://", "")
    user_pass, host_db = url.split("@")
    user, password = user_pass.split(":")
    host_port, database = host_db.split("/")
    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"
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
        # Check if resources table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'resources'
            );
        """)
        if not cursor.fetchone()[0]:
            print("[ERROR] 'resources' table does not exist!")
            return

        print("Adding new fields to 'resources' table...")

        # Add resource_type column
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'resources' AND column_name = 'resource_type'
            );
        """)
        if not cursor.fetchone()[0]:
            cursor.execute("""
                ALTER TABLE resources
                ADD COLUMN resource_type VARCHAR(50) DEFAULT 'document';
            """)
            print("[OK] Added resource_type column")
        else:
            print("[SKIP] resource_type column already exists")

        # Add view_count column
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'resources' AND column_name = 'view_count'
            );
        """)
        if not cursor.fetchone()[0]:
            cursor.execute("""
                ALTER TABLE resources
                ADD COLUMN view_count INTEGER DEFAULT 0;
            """)
            print("[OK] Added view_count column")
        else:
            print("[SKIP] view_count column already exists")

        # Add thumbnail column
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'resources' AND column_name = 'thumbnail'
            );
        """)
        if not cursor.fetchone()[0]:
            cursor.execute("""
                ALTER TABLE resources
                ADD COLUMN thumbnail VARCHAR(500);
            """)
            print("[OK] Added thumbnail column")
        else:
            print("[SKIP] thumbnail column already exists")

        conn.commit()
        print("\n[SUCCESS] Migration completed!")

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
