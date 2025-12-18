"""
Migration: Add subscription_type column to subscription_plans table
This allows different subscription types for tutors, students, parents, etc.
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

def run_migration():
    """Add subscription_type column to subscription_plans table"""
    conn = None
    try:
        conn = psycopg2.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 60)
        print("ADDING SUBSCRIPTION_TYPE TO SUBSCRIPTION_PLANS")
        print("=" * 60)

        # Check current columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'subscription_plans'
            ORDER BY ordinal_position
        """)
        sub_cols = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {sub_cols}")

        # Add subscription_type if not exists
        if 'subscription_type' not in sub_cols:
            print("\nAdding subscription_type column...")
            cursor.execute("""
                ALTER TABLE subscription_plans
                ADD COLUMN subscription_type VARCHAR(50) DEFAULT 'tutor'
            """)
            conn.commit()
            print("[OK] Added subscription_type column with default 'tutor'")
        else:
            print("\nsubscription_type column already exists. Skipping.")

        # Verify final structure
        print("\n" + "=" * 60)
        print("VERIFICATION - subscription_plans columns:")
        print("=" * 60)
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'subscription_plans'
            ORDER BY ordinal_position
        """)
        for row in cursor.fetchall():
            default = str(row[2])[:30] if row[2] else 'NULL'
            print(f"  - {row[0]}: {row[1]} (default: {default})")

        print("\n[OK] Migration completed successfully!")
        print("\nSubscription types available: tutor, student, parent, institute, advertiser")

    except Exception as e:
        print(f"Error during migration: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    run_migration()
