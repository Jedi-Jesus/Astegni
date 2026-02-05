"""
Migration: Sync is_verified field with verification_status

This migration ensures consistency between verification_status and is_verified:
- verification_status = 'verified' -> is_verified = TRUE
- verification_status IN ('pending', 'rejected', 'suspended') -> is_verified = FALSE

Run this once to fix any existing data inconsistencies.
"""

import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Sync is_verified field with verification_status for all credentials"""
    try:
        print("Starting migration: Sync is_verified with verification_status")
        print("=" * 70)

        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cursor:

                # Step 1: Check current state
                print("\n1. Checking current state...")
                cursor.execute("""
                    SELECT
                        verification_status,
                        is_verified,
                        COUNT(*) as count
                    FROM credentials
                    GROUP BY verification_status, is_verified
                    ORDER BY verification_status, is_verified
                """)

                current_state = cursor.fetchall()
                print("\nCurrent state:")
                print("-" * 70)
                for row in current_state:
                    print(f"  verification_status: {row[0]:<15} | is_verified: {row[1]:<5} | count: {row[2]}")

                # Step 2: Update verified credentials to is_verified = TRUE
                print("\n2. Setting is_verified = TRUE for verification_status = 'verified'...")
                cursor.execute("""
                    UPDATE credentials
                    SET is_verified = TRUE
                    WHERE verification_status = 'verified' AND is_verified = FALSE
                """)
                verified_updated = cursor.rowcount
                print(f"   ✅ Updated {verified_updated} verified credentials to is_verified = TRUE")

                # Step 3: Update non-verified credentials to is_verified = FALSE
                print("\n3. Setting is_verified = FALSE for non-verified statuses...")
                cursor.execute("""
                    UPDATE credentials
                    SET is_verified = FALSE
                    WHERE verification_status IN ('pending', 'rejected', 'suspended')
                    AND is_verified = TRUE
                """)
                non_verified_updated = cursor.rowcount
                print(f"   ✅ Updated {non_verified_updated} non-verified credentials to is_verified = FALSE")

                # Step 4: Handle NULL verification_status (default to pending)
                print("\n4. Handling NULL verification_status...")
                cursor.execute("""
                    UPDATE credentials
                    SET
                        verification_status = 'pending',
                        is_verified = FALSE
                    WHERE verification_status IS NULL
                """)
                null_updated = cursor.rowcount
                print(f"   ✅ Updated {null_updated} credentials with NULL status to 'pending'")

                # Commit changes
                conn.commit()

                # Step 5: Verify final state
                print("\n5. Verifying final state...")
                cursor.execute("""
                    SELECT
                        verification_status,
                        is_verified,
                        COUNT(*) as count
                    FROM credentials
                    GROUP BY verification_status, is_verified
                    ORDER BY verification_status, is_verified
                """)

                final_state = cursor.fetchall()
                print("\nFinal state:")
                print("-" * 70)
                for row in final_state:
                    print(f"  verification_status: {row[0]:<15} | is_verified: {row[1]:<5} | count: {row[2]}")

                # Step 6: Check for inconsistencies
                print("\n6. Checking for inconsistencies...")
                cursor.execute("""
                    SELECT COUNT(*) FROM credentials
                    WHERE (verification_status = 'verified' AND is_verified = FALSE)
                    OR (verification_status IN ('pending', 'rejected', 'suspended') AND is_verified = TRUE)
                """)
                inconsistencies = cursor.fetchone()[0]

                if inconsistencies > 0:
                    print(f"   ⚠️  WARNING: Found {inconsistencies} inconsistent records!")
                else:
                    print(f"   ✅ No inconsistencies found. All records are synchronized.")

                # Step 7: Summary
                print("\n" + "=" * 70)
                print("Migration Summary:")
                print("-" * 70)
                print(f"  Verified → TRUE:      {verified_updated} records updated")
                print(f"  Non-verified → FALSE: {non_verified_updated} records updated")
                print(f"  NULL → pending:       {null_updated} records updated")
                print(f"  Total changes:        {verified_updated + non_verified_updated + null_updated} records")
                print("=" * 70)
                print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ ERROR during migration: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    migrate()
