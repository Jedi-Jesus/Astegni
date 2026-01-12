"""
Migration: Create Advertiser Team Members Table
Allows advertisers to invite team members to manage their brands and campaigns
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def run_migration():
    print("=" * 60)
    print("MIGRATION: Create Advertiser Team Members Table")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check if table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'advertiser_team_members'
                    )
                """)
                exists = cur.fetchone()[0]

                if exists:
                    print("[INFO] Table 'advertiser_team_members' already exists")
                else:
                    print("Creating 'advertiser_team_members' table...")
                    cur.execute("""
                        CREATE TABLE advertiser_team_members (
                            id SERIAL PRIMARY KEY,
                            advertiser_profile_id INTEGER NOT NULL,
                            user_id INTEGER,
                            email VARCHAR(255) NOT NULL,
                            full_name VARCHAR(255),
                            role VARCHAR(50) NOT NULL DEFAULT 'viewer',
                            status VARCHAR(50) NOT NULL DEFAULT 'pending',
                            invitation_token VARCHAR(255),
                            invited_by INTEGER NOT NULL,
                            invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            accepted_at TIMESTAMP,
                            last_active TIMESTAMP,
                            permissions JSONB DEFAULT '{}',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT team_role_check CHECK (role IN ('owner', 'brand_manager', 'admin', 'editor', 'viewer')),
                            CONSTRAINT team_status_check CHECK (status IN ('pending', 'active', 'suspended', 'removed'))
                        )
                    """)
                    print("  [OK] Created 'advertiser_team_members' table")

                    # Create indexes
                    print("Creating indexes...")
                    cur.execute("""
                        CREATE INDEX idx_team_advertiser_id ON advertiser_team_members(advertiser_profile_id)
                    """)
                    cur.execute("""
                        CREATE INDEX idx_team_user_id ON advertiser_team_members(user_id)
                    """)
                    cur.execute("""
                        CREATE INDEX idx_team_email ON advertiser_team_members(email)
                    """)
                    cur.execute("""
                        CREATE INDEX idx_team_invitation_token ON advertiser_team_members(invitation_token)
                    """)
                    print("  [OK] Created indexes")

                conn.commit()
                print("\n[SUCCESS] Migration completed!")

                # Show table structure
                cur.execute("""
                    SELECT column_name, data_type, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'advertiser_team_members'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                print("\nTable structure:")
                for col in columns:
                    print(f"  - {col[0]}: {col[1]} (default: {col[2] or 'none'})")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
