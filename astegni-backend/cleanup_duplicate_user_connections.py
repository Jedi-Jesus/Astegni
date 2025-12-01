"""
Clean up duplicate user connections (User-Based, Not Role-Based)

Problem: Current database has redundant connections like:
- User 115 (student) → User 85 (tutor) [Accepted]
- User 85 (tutor) → User 115 (tutor) [Pending]

This creates confusion because connections should be USER-to-USER, not ROLE-to-ROLE.
Roles (requester_type, recipient_type) are only metadata to show "how" they connected.

Solution:
1. Identify duplicate user pairs (bidirectional connections)
2. Keep the most meaningful connection (accepted > pending, earlier timestamp)
3. Delete redundant connections
4. Preserve role context in the kept connection
"""
import os
import sys
import psycopg
from dotenv import load_dotenv
from datetime import datetime

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def cleanup_duplicate_connections():
    """Remove duplicate user connections, keeping only one per user pair"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 80)
        print("CLEANING UP DUPLICATE USER CONNECTIONS")
        print("=" * 80)

        # Step 1: Find all duplicate user pairs
        print("\n[Step 1] Finding duplicate user pairs...")
        cur.execute("""
            WITH user_pairs AS (
                SELECT
                    LEAST(requested_by, recipient_id) as user1,
                    GREATEST(requested_by, recipient_id) as user2,
                    COUNT(*) as connection_count,
                    ARRAY_AGG(id ORDER BY
                        CASE status
                            WHEN 'accepted' THEN 1
                            WHEN 'pending' THEN 2
                            WHEN 'rejected' THEN 3
                            WHEN 'blocked' THEN 4
                            ELSE 5
                        END,
                        requested_at ASC
                    ) as connection_ids,
                    ARRAY_AGG(status ORDER BY
                        CASE status
                            WHEN 'accepted' THEN 1
                            WHEN 'pending' THEN 2
                            WHEN 'rejected' THEN 3
                            WHEN 'blocked' THEN 4
                            ELSE 5
                        END,
                        requested_at ASC
                    ) as statuses
                FROM connections
                GROUP BY user1, user2
                HAVING COUNT(*) > 1
            )
            SELECT user1, user2, connection_count, connection_ids, statuses
            FROM user_pairs
            ORDER BY user1, user2
        """)

        duplicates = cur.fetchall()

        if not duplicates:
            print("No duplicate connections found. Database is clean!")
            return

        print(f"Found {len(duplicates)} user pairs with duplicate connections\n")

        # Step 2: Process each duplicate pair
        print("[Step 2] Processing duplicates...")
        print("-" * 80)

        total_deleted = 0

        for user1, user2, count, conn_ids, statuses in duplicates:
            print(f"\nUser {user1} <-> User {user2} ({count} connections)")

            # Keep the first connection (best status + earliest timestamp)
            keep_id = conn_ids[0]
            delete_ids = conn_ids[1:]

            print(f"  Keeping connection ID {keep_id} (status: {statuses[0]})")
            print(f"  Deleting {len(delete_ids)} duplicate(s): {delete_ids}")

            # Get details of the connection we're keeping
            cur.execute("""
                SELECT requested_by, requester_type, recipient_id, recipient_type, status
                FROM connections
                WHERE id = %s
            """, (keep_id,))
            kept_conn = cur.fetchone()
            print(f"  → Kept: User {kept_conn[0]} ({kept_conn[1]}) → User {kept_conn[2]} ({kept_conn[3]}) [{kept_conn[4]}]")

            # Show what we're deleting
            for del_id in delete_ids:
                cur.execute("""
                    SELECT requested_by, requester_type, recipient_id, recipient_type, status
                    FROM connections
                    WHERE id = %s
                """, (del_id,))
                del_conn = cur.fetchone()
                print(f"  ✗ Deleted: User {del_conn[0]} ({del_conn[1]}) → User {del_conn[2]} ({del_conn[3]}) [{del_conn[4]}]")

            # Delete duplicates
            for del_id in delete_ids:
                cur.execute("DELETE FROM connections WHERE id = %s", (del_id,))
                total_deleted += 1

            print("-" * 80)

        conn.commit()

        # Step 3: Verification
        print(f"\n[Step 3] Verification")
        print("=" * 80)

        cur.execute("""
            SELECT
                LEAST(requested_by, recipient_id) as user1,
                GREATEST(requested_by, recipient_id) as user2,
                COUNT(*) as connection_count
            FROM connections
            GROUP BY user1, user2
            HAVING COUNT(*) > 1
        """)

        remaining_duplicates = cur.fetchall()

        if remaining_duplicates:
            print(f"WARNING: Still found {len(remaining_duplicates)} duplicate pairs!")
            for user1, user2, count in remaining_duplicates:
                print(f"  User {user1} <-> User {user2}: {count} connections")
        else:
            print("SUCCESS: No duplicate user connections remain!")

        # Show final statistics
        cur.execute("SELECT COUNT(*) FROM connections")
        total_connections = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(DISTINCT LEAST(requested_by, recipient_id) || '-' || GREATEST(requested_by, recipient_id))
            FROM connections
        """)
        unique_user_pairs = cur.fetchone()[0]

        print(f"\nFinal Statistics:")
        print(f"  Total connections: {total_connections}")
        print(f"  Unique user pairs: {unique_user_pairs}")
        print(f"  Connections deleted: {total_deleted}")

        print("\n" + "=" * 80)
        print("CLEANUP COMPLETE")
        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    cleanup_duplicate_connections()
