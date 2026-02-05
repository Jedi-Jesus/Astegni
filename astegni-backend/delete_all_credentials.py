"""
Delete All Credentials from credentials Table

WARNING: This will permanently delete ALL credentials for ALL users!

This script:
1. Shows current credential counts
2. Asks for confirmation
3. Deletes all records from the credentials table
4. Verifies deletion

Safe to run multiple times (idempotent)
"""

import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def delete_all_credentials():
    """Delete all credentials from the credentials table"""

    print("=" * 70)
    print("DELETE ALL CREDENTIALS")
    print("=" * 70)
    print()
    print("WARNING: This will permanently delete ALL credentials!")
    print()

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)

    try:
        with conn.cursor() as cur:
            # Step 1: Show current state
            print("Step 1: Checking current state...")
            cur.execute("SELECT COUNT(*) as total FROM credentials")
            total_count = cur.fetchone()['total']

            print(f"Total credentials in database: {total_count}")
            print()

            if total_count == 0:
                print("[OK] No credentials found. Database already empty!")
                return

            # Show breakdown by role
            cur.execute("""
                SELECT uploader_role, COUNT(*) as count
                FROM credentials
                GROUP BY uploader_role
                ORDER BY uploader_role
            """)
            by_role = cur.fetchall()

            print("Breakdown by role:")
            for row in by_role:
                print(f"  {row['uploader_role']:15s}: {row['count']:4d} credentials")
            print()

            # Show breakdown by type
            cur.execute("""
                SELECT uploader_role, document_type, COUNT(*) as count
                FROM credentials
                GROUP BY uploader_role, document_type
                ORDER BY uploader_role, document_type
            """)
            by_type = cur.fetchall()

            print("Breakdown by role and type:")
            for row in by_type:
                print(f"  {row['uploader_role']:15s} | {row['document_type']:20s}: {row['count']:3d}")
            print()

            # Step 2: Confirmation
            print("=" * 70)
            print(f"You are about to DELETE {total_count} credential(s)")
            print("This action CANNOT be undone!")
            print("=" * 70)
            print()

            confirmation = input("Type 'DELETE ALL' to confirm: ")

            if confirmation != 'DELETE ALL':
                print()
                print("[CANCELLED] Deletion cancelled. No changes made.")
                return

            print()
            print("Step 2: Deleting all credentials...")

            # Step 3: Delete all credentials
            cur.execute("DELETE FROM credentials")
            deleted_count = cur.rowcount

            print(f"[OK] Deleted {deleted_count} credential(s)")
            print()

            # Step 4: Verify deletion
            print("Step 3: Verifying deletion...")
            cur.execute("SELECT COUNT(*) as remaining FROM credentials")
            remaining = cur.fetchone()['remaining']

            if remaining > 0:
                print(f"[WARNING] {remaining} credential(s) still remain!")
                print("Rolling back transaction...")
                conn.rollback()
                return

            # Commit the transaction
            conn.commit()

            print(f"[OK] Verified: 0 credentials remain")
            print()
            print("=" * 70)
            print("[OK] DELETION COMPLETED SUCCESSFULLY")
            print("=" * 70)
            print()
            print("Summary:")
            print(f"  [OK] Deleted {deleted_count} credential(s)")
            print(f"  [OK] 0 credentials remain in database")
            print(f"  [OK] Table 'credentials' is now empty")
            print()

    except KeyboardInterrupt:
        print()
        print()
        print("[CANCELLED] Operation cancelled by user. Rolling back...")
        conn.rollback()

    except Exception as e:
        print(f"[ERROR] Error during deletion: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise

    finally:
        conn.close()

if __name__ == '__main__':
    delete_all_credentials()
