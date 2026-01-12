"""
Migration: Add forwarded message columns to chat_messages table

This migration adds columns to store information about forwarded messages:
- is_forwarded: Boolean flag to indicate if message is forwarded
- forwarded_from_name: Name of the original sender
- forwarded_from_avatar: Avatar URL of the original sender
- forwarder_name: Name of the person who forwarded it
- forwarder_avatar: Avatar URL of the forwarder

Run: python migrate_add_forwarded_message_columns.py
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

    # Remove postgresql+psycopg:// prefix if present
    if '+psycopg' in database_url:
        database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')

    # Extract connection params from URL
    # Format: postgresql://user:password@host:port/database
    url = database_url.replace('postgresql://', '')
    user_pass, host_db = url.split('@')
    user, password = user_pass.split(':')
    host_port_db = host_db.split('/')
    host_port = host_port_db[0]
    database = host_port_db[1].split('?')[0]  # Remove any query params like ?sslmode=disable

    if ':' in host_port:
        host, port = host_port.split(':')
    else:
        host = host_port
        port = '5432'

    return psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
        cursor_factory=RealDictCursor
    )


def migrate():
    """Add forwarded message columns to chat_messages table"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        print("=" * 50)
        print("MIGRATION: Add Forwarded Message Columns")
        print("=" * 50)

        # Check if columns already exist
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'chat_messages'
            AND column_name IN ('is_forwarded', 'forwarded_from_name', 'forwarded_from_avatar', 'forwarder_name', 'forwarder_avatar')
        """)
        existing_columns = [row['column_name'] for row in cur.fetchall()]

        if len(existing_columns) == 5:
            print("All forwarded message columns already exist. Migration skipped.")
            return

        print(f"Existing columns: {existing_columns}")
        print("Adding missing columns...")

        # Add is_forwarded column
        if 'is_forwarded' not in existing_columns:
            print("  - Adding is_forwarded column...")
            cur.execute("""
                ALTER TABLE chat_messages
                ADD COLUMN is_forwarded BOOLEAN DEFAULT FALSE
            """)
            print("    [OK] is_forwarded added")

        # Add forwarded_from_name column (original sender's name)
        if 'forwarded_from_name' not in existing_columns:
            print("  - Adding forwarded_from_name column...")
            cur.execute("""
                ALTER TABLE chat_messages
                ADD COLUMN forwarded_from_name VARCHAR(255)
            """)
            print("    [OK] forwarded_from_name added")

        # Add forwarded_from_avatar column (original sender's avatar)
        if 'forwarded_from_avatar' not in existing_columns:
            print("  - Adding forwarded_from_avatar column...")
            cur.execute("""
                ALTER TABLE chat_messages
                ADD COLUMN forwarded_from_avatar VARCHAR(500)
            """)
            print("    [OK] forwarded_from_avatar added")

        # Add forwarder_name column (who forwarded it)
        if 'forwarder_name' not in existing_columns:
            print("  - Adding forwarder_name column...")
            cur.execute("""
                ALTER TABLE chat_messages
                ADD COLUMN forwarder_name VARCHAR(255)
            """)
            print("    [OK] forwarder_name added")

        # Add forwarder_avatar column (forwarder's avatar)
        if 'forwarder_avatar' not in existing_columns:
            print("  - Adding forwarder_avatar column...")
            cur.execute("""
                ALTER TABLE chat_messages
                ADD COLUMN forwarder_avatar VARCHAR(500)
            """)
            print("    [OK] forwarder_avatar added")

        # Create index for forwarded messages
        print("  - Creating index for forwarded messages...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_forwarded
            ON chat_messages(is_forwarded)
            WHERE is_forwarded = TRUE
        """)
        print("    [OK] Index created")

        conn.commit()

        print("")
        print("=" * 50)
        print("MIGRATION COMPLETE!")
        print("=" * 50)
        print("")
        print("New columns added to chat_messages:")
        print("  - is_forwarded (BOOLEAN)")
        print("  - forwarded_from_name (VARCHAR 255)")
        print("  - forwarded_from_avatar (VARCHAR 500)")
        print("  - forwarder_name (VARCHAR 255)")
        print("  - forwarder_avatar (VARCHAR 500)")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed - {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
