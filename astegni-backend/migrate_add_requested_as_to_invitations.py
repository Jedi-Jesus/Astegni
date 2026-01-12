"""
Migration: Add requested_as column to parent_invitations table

This column differentiates between:
- "parent" - When a student invites someone to be their parent
- "coparent" - When a parent invites another parent to co-parent their child

Run: python migrate_add_requested_as_to_invitations.py
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    try:
        # Check if column already exists
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'parent_invitations' AND column_name = 'requested_as'
        """)

        if cur.fetchone():
            print("Column 'requested_as' already exists in parent_invitations table")
        else:
            # Add requested_as column with default 'parent' for backward compatibility
            cur.execute("""
                ALTER TABLE parent_invitations
                ADD COLUMN requested_as VARCHAR(20) DEFAULT 'parent' NOT NULL
            """)
            print("Added 'requested_as' column to parent_invitations table")

            # Add check constraint to ensure valid values
            cur.execute("""
                ALTER TABLE parent_invitations
                ADD CONSTRAINT check_requested_as
                CHECK (requested_as IN ('parent', 'coparent'))
            """)
            print("Added check constraint for requested_as values")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show current table structure
        cur.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'parent_invitations'
            ORDER BY ordinal_position
        """)

        print("\nCurrent parent_invitations table structure:")
        print("-" * 60)
        for col in cur.fetchall():
            print(f"  {col['column_name']}: {col['data_type']} (default: {col['column_default']}, nullable: {col['is_nullable']})")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
