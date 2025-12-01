"""
Migration script to add admin management fields to admin_profiles table
"""

import sys
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")

    # Parse the URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_full = host_db.split("/")

    # Remove query parameters (like ?sslmode=disable)
    if "?" in db_full:
        db_name = db_full.split("?")[0]
    else:
        db_name = db_full

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    # Connect
    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

def run_migration():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Adding admin management fields to admin_profiles table...")

        # Add new columns if they don't exist
        alter_queries = [
            # Add status field
            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
            """,

            # Add suspension fields
            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP
            """,

            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS suspension_reason TEXT
            """,

            # Add password change requirement
            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE
            """,

            # Add created and updated timestamps
            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """,

            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """,

            # Add last login tracking
            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
            """,

            # Add permissions field as JSONB array
            """
            ALTER TABLE admin_profiles
            ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb
            """
        ]

        for query in alter_queries:
            try:
                cursor.execute(query)
                print(f"[OK] Executed: {query.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  Column already exists, skipping...")
                else:
                    print(f"  Error: {e}")

        # Update existing records to have default status
        cursor.execute("""
            UPDATE admin_profiles
            SET status = 'active'
            WHERE status IS NULL
        """)

        # Update existing records to have empty permissions array
        cursor.execute("""
            UPDATE admin_profiles
            SET permissions = '[]'::jsonb
            WHERE permissions IS NULL
        """)

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")

        # Verify the columns
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'admin_profiles'
            ORDER BY ordinal_position
        """)

        print("\nCurrent admin_profiles table structure:")
        for col in cursor.fetchall():
            print(f"  - {col[0]}: {col[1]}")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        return False
    finally:
        if conn:
            cursor.close()
            conn.close()

    return True

if __name__ == "__main__":
    if run_migration():
        print("\n[SUCCESS] Database is ready for admin management features!")
    else:
        print("\n[FAILED] Migration failed. Please check the errors above.")