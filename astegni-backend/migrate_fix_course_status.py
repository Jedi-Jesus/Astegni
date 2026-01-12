"""
Migration: Fix Course Status Inconsistency
==========================================
Standardizes legacy 'approved' status to 'verified' for consistency.

The courses table should only use these status values:
- pending: Awaiting admin review
- verified: Approved and active
- rejected: Not approved
- suspended: Temporarily disabled

This migration converts any 'approved' status to 'verified'.
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)

def run_migration():
    """Run the migration to fix course status"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check current status distribution
        print("Current course status distribution:")
        cursor.execute("SELECT status, COUNT(*) FROM courses GROUP BY status ORDER BY status")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")

        # Count courses with 'approved' status
        cursor.execute("SELECT COUNT(*) FROM courses WHERE status = 'approved'")
        approved_count = cursor.fetchone()[0]

        if approved_count == 0:
            print("\nNo courses with 'approved' status found. Nothing to migrate.")
            return

        print(f"\nFound {approved_count} course(s) with 'approved' status.")
        print("Updating to 'verified'...")

        # Update 'approved' to 'verified'
        cursor.execute("""
            UPDATE courses
            SET status = 'verified', updated_at = NOW()
            WHERE status = 'approved'
        """)

        conn.commit()
        print(f"Successfully updated {approved_count} course(s) from 'approved' to 'verified'.")

        # Show new status distribution
        print("\nNew course status distribution:")
        cursor.execute("SELECT status, COUNT(*) FROM courses GROUP BY status ORDER BY status")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Migration: Fix Course Status Inconsistency")
    print("=" * 50)
    run_migration()
    print("\nMigration completed!")
