"""
Migration: Create admin_invitations table for tracking admin invitations

This table stores invitation details separately from OTPs:
- Invitation data (name, email, phone, department, position, etc.)
- Status tracking (pending, accepted, expired, cancelled)
- Links to OTP via email/contact

The OTP itself is stored in the 'otps' table with purpose='admin_invitation'
"""
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def run_migration():
    print("=" * 60)
    print("Migration: Create admin_invitations table")
    print("=" * 60)

    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Create admin_invitations table
        print("\n[1/3] Creating admin_invitations table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_invitations (
                id SERIAL PRIMARY KEY,

                -- Personal Information
                first_name VARCHAR(100) NOT NULL,
                father_name VARCHAR(100) NOT NULL,
                grandfather_name VARCHAR(100),

                -- Contact Information
                email VARCHAR(255) NOT NULL,
                phone_number VARCHAR(50),

                -- Role Information
                department VARCHAR(100) NOT NULL,
                position VARCHAR(100) NOT NULL,
                employee_id VARCHAR(50),

                -- Invitation Details
                welcome_message TEXT,
                invited_by INTEGER REFERENCES admin_profile(id),

                -- Status Tracking
                status VARCHAR(20) DEFAULT 'pending',
                -- Status values: pending, accepted, expired, cancelled, resent

                -- If accepted, link to created admin
                admin_id INTEGER REFERENCES admin_profile(id),
                accepted_at TIMESTAMP,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,

                -- Constraints
                CONSTRAINT unique_pending_invitation UNIQUE (email, department, status)
            )
        """)
        print("  [OK] Created admin_invitations table")

        # Create indexes for faster lookups
        print("\n[2/3] Creating indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_invitations_email
            ON admin_invitations(email)
        """)
        print("  [OK] Created index on email")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_invitations_status
            ON admin_invitations(status)
        """)
        print("  [OK] Created index on status")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_invitations_department
            ON admin_invitations(department)
        """)
        print("  [OK] Created index on department")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_invitations_invited_by
            ON admin_invitations(invited_by)
        """)
        print("  [OK] Created index on invited_by")

        # Drop the unique constraint if it causes issues (email+department can have multiple expired/cancelled)
        print("\n[3/3] Adjusting constraints...")
        try:
            cursor.execute("""
                ALTER TABLE admin_invitations
                DROP CONSTRAINT IF EXISTS unique_pending_invitation
            """)
            # Create a partial unique index instead (only for pending status)
            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation
                ON admin_invitations(email, department)
                WHERE status = 'pending'
            """)
            print("  [OK] Created partial unique index for pending invitations")
        except Exception as e:
            print(f"  Note: Constraint adjustment: {e}")

        conn.commit()

        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
        print("\nTable Structure:")
        print("  - id: Serial primary key")
        print("  - first_name, father_name, grandfather_name: Name fields")
        print("  - email, phone_number: Contact info")
        print("  - department, position, employee_id: Role info")
        print("  - welcome_message: Custom invitation message")
        print("  - invited_by: Admin who sent the invitation")
        print("  - status: pending | accepted | expired | cancelled | resent")
        print("  - admin_id: Links to admin_profile when accepted")
        print("  - created_at, updated_at, expires_at: Timestamps")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
