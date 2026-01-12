"""
Migration: Remove account_self_destruct column from chat_settings table
This feature has been removed from the system.
"""

import psycopg2
from psycopg2.extras import RealDictCursor

def migrate():
    """Remove account_self_destruct column from chat_settings"""

    conn = psycopg2.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Check if column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'chat_settings' AND column_name = 'account_self_destruct'
        """)

        if cur.fetchone():
            print("Dropping account_self_destruct column from chat_settings...")
            cur.execute("ALTER TABLE chat_settings DROP COLUMN account_self_destruct")
            conn.commit()
            print("✓ Column dropped successfully")
        else:
            print("Column account_self_destruct does not exist - nothing to do")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
