"""
Migration: Create child_invitations table

This table handles the invitation flow when a parent invites a user to become their child.

INVITATION FLOW (Parent invites Child):
=======================================

1. SEARCH FOR EXISTING USER:
   - Parent searches users by name, email, or phone
   - Returns matching users (may or may not already be students)

2. INVITE EXISTING USER:
   - Parent selects user and provides security verification (child's DOB)
   - Creates pending invitation in child_invitations table
   - If user doesn't have student role, it will be added when they accept
   - User sees invitation in their profile (Requests > Child Invitations)
   - User can accept/reject

3. INVITE NEW USER (Not in system):
   - Parent fills: first_name, father_name, grandfather_name, email/phone, gender, dob
   - ALL information saved in child_invitations table (NO user created yet)
   - Temp password sent via email/SMS
   - When new child logs in with temp password:
     a) User account is created in users table with student role
     b) Student profile is created
     c) invited_to_user_id in invitation is updated
     d) Invitation is auto-accepted (login = acceptance)
     e) Parent-child link is established (parent.children_ids and student.parent_id)

SECURITY:
=========
- For existing users: Parent must know child's DATE OF BIRTH
- For new users: No verification needed (parent is creating the account)
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    print("=" * 60)
    print("MIGRATION: Create child_invitations table")
    print("=" * 60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Check if table already exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'child_invitations'
                )
            """)
            exists = cur.fetchone()['exists']

            if exists:
                print("\n[INFO] Table 'child_invitations' already exists. Skipping creation.")
                return

            print("\n[STEP 1] Creating child_invitations table...")

            cur.execute("""
                CREATE TABLE child_invitations (
                    id SERIAL PRIMARY KEY,

                    -- Inviter info (always a parent)
                    inviter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    inviter_type VARCHAR(20) DEFAULT 'parent',

                    -- Invited user info
                    -- NULL if inviting a new user (not in system yet)
                    invited_to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

                    -- Relationship (always 'child' for this table)
                    relationship_type VARCHAR(50) DEFAULT 'child',

                    -- Status tracking
                    status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, rejected, expired
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    responded_at TIMESTAMP,

                    -- New user fields (stored here until user creates account)
                    is_new_user BOOLEAN DEFAULT FALSE,
                    pending_email VARCHAR(255),
                    pending_phone VARCHAR(20),
                    pending_first_name VARCHAR(100),
                    pending_father_name VARCHAR(100),
                    pending_grandfather_name VARCHAR(100),
                    pending_gender VARCHAR(20),
                    pending_dob DATE,  -- Store DOB for new users

                    -- Invitation token (for new users to create account)
                    invitation_token VARCHAR(255) UNIQUE,
                    token_expires_at TIMESTAMP,

                    -- Temp password hash (for new users)
                    temp_password_hash VARCHAR(255)
                )
            """)

            print("[SUCCESS] Table 'child_invitations' created!")

            # Create indexes for better query performance
            print("\n[STEP 2] Creating indexes...")

            cur.execute("""
                CREATE INDEX idx_child_invitations_inviter
                ON child_invitations(inviter_user_id)
            """)

            cur.execute("""
                CREATE INDEX idx_child_invitations_invited
                ON child_invitations(invited_to_user_id)
            """)

            cur.execute("""
                CREATE INDEX idx_child_invitations_status
                ON child_invitations(status)
            """)

            cur.execute("""
                CREATE INDEX idx_child_invitations_token
                ON child_invitations(invitation_token)
            """)

            cur.execute("""
                CREATE INDEX idx_child_invitations_pending_email
                ON child_invitations(pending_email)
            """)

            cur.execute("""
                CREATE INDEX idx_child_invitations_pending_phone
                ON child_invitations(pending_phone)
            """)

            print("[SUCCESS] Indexes created!")

            conn.commit()

            print("\n" + "=" * 60)
            print("MIGRATION COMPLETE!")
            print("=" * 60)
            print("\nTable created: child_invitations")
            print("\nColumns:")
            print("  - id: Primary key")
            print("  - inviter_user_id: Parent's user ID")
            print("  - inviter_type: Always 'parent'")
            print("  - invited_to_user_id: Child's user ID (NULL for new users)")
            print("  - relationship_type: Always 'child'")
            print("  - status: pending/accepted/rejected/expired")
            print("  - created_at, responded_at: Timestamps")
            print("  - is_new_user: Boolean flag")
            print("  - pending_*: New user info (stored until account created)")
            print("  - invitation_token: For new user registration")
            print("  - token_expires_at: Token expiry")
            print("  - temp_password_hash: For new user login")


if __name__ == "__main__":
    run_migration()
