"""
Add joined_status boolean to events and clubs tables
This tracks whether a user has joined an event or club
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def add_joined_status_fields():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Adding joined_status to events table...")

        # Check if column exists in events
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = 'joined_status'
        """)

        if cur.fetchone() is None:
            cur.execute("""
                ALTER TABLE events
                ADD COLUMN joined_status BOOLEAN DEFAULT FALSE
            """)
            print("[OK] Added joined_status to events table")
        else:
            print("[INFO] joined_status already exists in events table")

        print("\nAdding joined_status to clubs table...")

        # Check if column exists in clubs
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'clubs' AND column_name = 'joined_status'
        """)

        if cur.fetchone() is None:
            cur.execute("""
                ALTER TABLE clubs
                ADD COLUMN joined_status BOOLEAN DEFAULT FALSE
            """)
            print("[OK] Added joined_status to clubs table")
        else:
            print("[INFO] joined_status already exists in clubs table")

        conn.commit()
        print("\n[OK] Migration completed successfully!")

        # Verify changes
        print("\n=== Verification ===")
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = 'joined_status'
        """)
        result = cur.fetchone()
        if result:
            print(f"Events: {result[0]} ({result[1]}) DEFAULT {result[2]}")

        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'clubs' AND column_name = 'joined_status'
        """)
        result = cur.fetchone()
        if result:
            print(f"Clubs: {result[0]} ({result[1]}) DEFAULT {result[2]}")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Adding joined_status to events and clubs tables")
    print("=" * 50)
    add_joined_status_fields()
