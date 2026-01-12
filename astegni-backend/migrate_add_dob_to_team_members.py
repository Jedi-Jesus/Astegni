"""
Migration: Add DOB column to advertiser_team_members table
Date of birth is used for security verification of team members
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def run_migration():
    print("=" * 60)
    print("MIGRATION: Add DOB to advertiser_team_members")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check if column already exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'advertiser_team_members'
                        AND column_name = 'dob'
                    )
                """)
                exists = cur.fetchone()[0]

                if exists:
                    print("[INFO] Column 'dob' already exists in advertiser_team_members")
                else:
                    print("Adding 'dob' column to advertiser_team_members...")
                    cur.execute("""
                        ALTER TABLE advertiser_team_members
                        ADD COLUMN dob DATE
                    """)
                    print("  [OK] Added 'dob' column")

                conn.commit()
                print("\n[SUCCESS] Migration completed!")

                # Show updated table structure
                cur.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'advertiser_team_members'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                print("\nTable structure:")
                for col in columns:
                    print(f"  - {col[0]}: {col[1]}")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
