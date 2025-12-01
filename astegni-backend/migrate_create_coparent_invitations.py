"""
Migration: Create coparent_invitations table

This table stores invitations between parents to become co-parents
(share access to each other's children).

Similar to parent_invitations but for parent-to-parent relationships.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment")
    sys.exit(1)

# Convert to psycopg3 format if needed
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL)


def run_migration():
    """Create coparent_invitations table"""
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'coparent_invitations'
            )
        """))
        table_exists = result.scalar()

        if table_exists:
            print("Table 'coparent_invitations' already exists. Skipping creation.")
            return

        # Create the table
        conn.execute(text("""
            CREATE TABLE coparent_invitations (
                id SERIAL PRIMARY KEY,

                -- The parent who is sending the invitation
                inviter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- The parent receiving the invitation (NULL for new users)
                invitee_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

                -- Relationship type (Father, Mother, Guardian, Uncle, Aunt, etc.)
                relationship_type VARCHAR(50) NOT NULL,

                -- Status: pending, accepted, rejected
                status VARCHAR(20) NOT NULL DEFAULT 'pending',

                -- Timestamps
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP WITH TIME ZONE,

                -- For new users (not yet registered)
                is_new_user BOOLEAN DEFAULT FALSE,
                pending_email VARCHAR(255),
                pending_phone VARCHAR(50),
                pending_first_name VARCHAR(100),
                pending_father_name VARCHAR(100),
                pending_grandfather_name VARCHAR(100),
                pending_gender VARCHAR(20),

                -- Temporary password for new users
                temp_password_hash VARCHAR(255),
                invitation_token VARCHAR(255),
                token_expires_at TIMESTAMP WITH TIME ZONE
            )
        """))

        # Create indexes for faster lookups
        conn.execute(text("""
            CREATE INDEX idx_coparent_inv_inviter ON coparent_invitations(inviter_user_id)
        """))
        conn.execute(text("""
            CREATE INDEX idx_coparent_inv_invitee ON coparent_invitations(invitee_user_id)
        """))
        conn.execute(text("""
            CREATE INDEX idx_coparent_inv_status ON coparent_invitations(status)
        """))
        conn.execute(text("""
            CREATE INDEX idx_coparent_inv_email ON coparent_invitations(pending_email) WHERE pending_email IS NOT NULL
        """))
        conn.execute(text("""
            CREATE INDEX idx_coparent_inv_phone ON coparent_invitations(pending_phone) WHERE pending_phone IS NOT NULL
        """))

        conn.commit()
        print("SUCCESS: Created 'coparent_invitations' table with indexes")


if __name__ == "__main__":
    run_migration()
