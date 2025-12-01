"""
Cleanup Script: Remove Duplicate Bidirectional Connections

This script finds and removes duplicate connections where:
- User A -> User B (connection 1)
- User B -> User A (connection 2)

Keeps only ONE connection (the earlier one) and deletes the duplicate.
"""

import psycopg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def find_duplicates():
    """Find duplicate bidirectional connections"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Find duplicates where both A->B and B->A exist
    query = """
    SELECT
        c1.id as conn1_id,
        c1.requested_by as user1,
        c1.recipient_id as user2,
        c1.status as status1,
        c1.requested_at as date1,
        c2.id as conn2_id,
        c2.requested_by as user2_reverse,
        c2.recipient_id as user1_reverse,
        c2.status as status2,
        c2.requested_at as date2
    FROM connections c1
    INNER JOIN connections c2
        ON c1.requested_by = c2.recipient_id
        AND c1.recipient_id = c2.requested_by
    WHERE c1.id < c2.id  -- Avoid counting the same pair twice
    ORDER BY c1.requested_at;
    """

    cursor.execute(query)
    duplicates = cursor.fetchall()

    cursor.close()
    conn.close()

    return duplicates

def cleanup_duplicates(duplicates, dry_run=True):
    """Remove duplicate connections, keeping the earlier one"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    deleted_ids = []
    kept_ids = []

    for dup in duplicates:
        conn1_id, user1, user2, status1, date1, conn2_id, user2_rev, user1_rev, status2, date2 = dup

        # Determine which to keep (earlier one, or 'accepted' status takes priority)
        if status1 == 'accepted' and status2 != 'accepted':
            # Keep connection 1 (accepted)
            keep_id = conn1_id
            delete_id = conn2_id
            keep_status = status1
            delete_status = status2
        elif status2 == 'accepted' and status1 != 'accepted':
            # Keep connection 2 (accepted)
            keep_id = conn2_id
            delete_id = conn1_id
            keep_status = status2
            delete_status = status1
        elif date1 <= date2:
            # Keep the earlier connection
            keep_id = conn1_id
            delete_id = conn2_id
            keep_status = status1
            delete_status = status2
        else:
            # Keep connection 2 (earlier)
            keep_id = conn2_id
            delete_id = conn1_id
            keep_status = status2
            delete_status = status1

        kept_ids.append(keep_id)
        deleted_ids.append(delete_id)

        print(f"  User {user1} <-> User {user2}:")
        print(f"    Keep: ID {keep_id} (status: {keep_status})")
        print(f"    Delete: ID {delete_id} (status: {delete_status})")

        if not dry_run:
            cursor.execute("DELETE FROM connections WHERE id = %s", (delete_id,))

    if not dry_run:
        conn.commit()
        print(f"\n  Deleted {len(deleted_ids)} duplicate connections")
    else:
        print(f"\n  DRY RUN: Would delete {len(deleted_ids)} duplicate connections")

    cursor.close()
    conn.close()

    return kept_ids, deleted_ids

def main():
    print("\n" + "=" * 80)
    print("DUPLICATE CONNECTIONS CLEANUP")
    print("=" * 80)

    # Find duplicates
    print("\nSearching for duplicate bidirectional connections...")
    duplicates = find_duplicates()

    if not duplicates:
        print("\nNo duplicate connections found. Database is clean!")
        return

    print(f"\nFound {len(duplicates)} duplicate connection pairs:\n")

    # Show what will be deleted (dry run)
    print("DRY RUN - Preview of changes:")
    print("-" * 80)
    cleanup_duplicates(duplicates, dry_run=True)
    print("-" * 80)

    # Ask for confirmation
    print("\n" + "=" * 80)
    response = input("\nProceed with cleanup? (yes/no): ").strip().lower()

    if response == 'yes':
        print("\nExecuting cleanup...")
        kept_ids, deleted_ids = cleanup_duplicates(duplicates, dry_run=False)

        print("\n" + "=" * 80)
        print("CLEANUP COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print(f"\nKept {len(kept_ids)} connections")
        print(f"Deleted {len(deleted_ids)} duplicate connections")
        print("\nDeleted connection IDs:", deleted_ids)
        print("\nThe database now has unique bidirectional connections.")
        print()
    else:
        print("\nCleanup cancelled by user.")

if __name__ == "__main__":
    main()
