"""
Seed connections with USER-BASED logic (No Duplicate User Pairs)

Key Principle: Connections are USER-to-USER, not ROLE-to-ROLE
- One connection per user pair (bidirectional check)
- Roles (requester_type, recipient_type) are metadata showing "how" they connected
- No redundant connections like: User 115 → User 85 AND User 85 → User 115

Users:
- User 115 (jediael.s.abebe@gmail.com): Has both TUTOR and STUDENT profiles
- User 85 (elias.kidane17@astegni.com): Has TUTOR profile only
- User 86 (bekele.abebe18@astegni.com): Has TUTOR profile only

Example Scenarios:
1. User 115 (as student) connects to User 85 (as tutor) → Creates ONE connection
   - If User 85 tries to connect back to User 115, it should be blocked (user pair already connected)
   - The existing connection can be viewed from both perspectives
"""
import os
import sys
import psycopg
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def connection_exists(cur, user1_id, user2_id):
    """Check if connection exists between two users (bidirectional)"""
    cur.execute("""
        SELECT id, requested_by, requester_type, recipient_id, recipient_type, status
        FROM connections
        WHERE (requested_by = %s AND recipient_id = %s)
           OR (requested_by = %s AND recipient_id = %s)
    """, (user1_id, user2_id, user2_id, user1_id))
    return cur.fetchone()

def seed():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        now = datetime.now()

        # Delete existing connections for test users
        print("Cleaning up existing test connections...")
        cur.execute("""
            DELETE FROM connections
            WHERE requested_by IN (115, 85, 86, 68, 69, 70, 71)
               OR recipient_id IN (115, 85, 86, 68, 69, 70, 71)
        """)
        deleted = cur.rowcount
        print(f"Deleted {deleted} existing connections\n")

        print("=" * 80)
        print("CREATING USER-BASED CONNECTIONS (No Duplicates)")
        print("=" * 80)

        connections_created = []

        # ============================================
        # Connection 1: User 115 (student) → User 85 (tutor)
        # ============================================
        print("\n[1] User 115 (student) → User 85 (tutor)")
        existing = connection_exists(cur, 115, 85)
        if existing:
            print(f"    SKIP: Connection already exists (ID: {existing[0]})")
        else:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, connected_at, updated_at
                ) VALUES (115, 'student', 85, 'tutor', 'accepted', %s, %s, %s)
                RETURNING id
            """, (now, now, now))
            conn_id = cur.fetchone()[0]
            print(f"    CREATED: Connection ID {conn_id} [ACCEPTED]")
            print(f"    → Student 115 is connected to Tutor 85")
            connections_created.append(conn_id)

        # ============================================
        # Connection 2: User 115 (tutor) → User 86 (tutor)
        # ============================================
        print("\n[2] User 115 (tutor) → User 86 (tutor)")
        existing = connection_exists(cur, 115, 86)
        if existing:
            print(f"    SKIP: Connection already exists (ID: {existing[0]})")
        else:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, updated_at
                ) VALUES (115, 'tutor', 86, 'tutor', 'pending', %s, %s)
                RETURNING id
            """, (now, now))
            conn_id = cur.fetchone()[0]
            print(f"    CREATED: Connection ID {conn_id} [PENDING]")
            print(f"    → Tutor 115 sent request to Tutor 86")
            connections_created.append(conn_id)

        # ============================================
        # Connection 3: User 115 (student) → User 68 (tutor)
        # ============================================
        print("\n[3] User 115 (student) → User 68 (tutor)")
        existing = connection_exists(cur, 115, 68)
        if existing:
            print(f"    SKIP: Connection already exists (ID: {existing[0]})")
        else:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, connected_at, updated_at
                ) VALUES (115, 'student', 68, 'tutor', 'accepted', %s, %s, %s)
                RETURNING id
            """, (now - timedelta(days=2), now - timedelta(days=2), now - timedelta(days=2)))
            conn_id = cur.fetchone()[0]
            print(f"    CREATED: Connection ID {conn_id} [ACCEPTED]")
            print(f"    → Student 115 is connected to Tutor 68")
            connections_created.append(conn_id)

        # ============================================
        # Connection 4: User 115 (student) → User 69 (tutor)
        # ============================================
        print("\n[4] User 115 (student) → User 69 (tutor)")
        existing = connection_exists(cur, 115, 69)
        if existing:
            print(f"    SKIP: Connection already exists (ID: {existing[0]})")
        else:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, connected_at, updated_at
                ) VALUES (115, 'student', 69, 'tutor', 'accepted', %s, %s, %s)
                RETURNING id
            """, (now - timedelta(days=1), now - timedelta(days=1), now - timedelta(days=1)))
            conn_id = cur.fetchone()[0]
            print(f"    CREATED: Connection ID {conn_id} [ACCEPTED]")
            print(f"    → Student 115 is connected to Tutor 69")
            connections_created.append(conn_id)

        # ============================================
        # Connection 5: User 70 (tutor) → User 115 (tutor)
        # ============================================
        print("\n[5] User 70 (tutor) → User 115 (tutor)")
        existing = connection_exists(cur, 70, 115)
        if existing:
            print(f"    SKIP: Connection already exists (ID: {existing[0]})")
        else:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, updated_at
                ) VALUES (70, 'tutor', 115, 'tutor', 'pending', %s, %s)
                RETURNING id
            """, (now - timedelta(hours=12), now - timedelta(hours=12)))
            conn_id = cur.fetchone()[0]
            print(f"    CREATED: Connection ID {conn_id} [PENDING]")
            print(f"    → Tutor 70 sent request to Tutor 115")
            connections_created.append(conn_id)

        # ============================================
        # Connection 6: User 71 (tutor) → User 115 (student)
        # ============================================
        print("\n[6] User 71 (tutor) → User 115 (student)")
        existing = connection_exists(cur, 71, 115)
        if existing:
            print(f"    SKIP: Connection already exists (ID: {existing[0]})")
        else:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, updated_at
                ) VALUES (71, 'tutor', 115, 'student', 'pending', %s, %s)
                RETURNING id
            """, (now - timedelta(hours=6), now - timedelta(hours=6)))
            conn_id = cur.fetchone()[0]
            print(f"    CREATED: Connection ID {conn_id} [PENDING]")
            print(f"    → Tutor 71 sent request to Student 115")
            connections_created.append(conn_id)

        # ============================================
        # DEMONSTRATION: Attempting to create duplicate (should skip)
        # ============================================
        print("\n" + "=" * 80)
        print("TESTING DUPLICATE PREVENTION")
        print("=" * 80)
        print("\n[TEST] Attempting to create duplicate: User 85 → User 115")
        existing = connection_exists(cur, 85, 115)
        if existing:
            print(f"    SUCCESS: Duplicate prevented!")
            print(f"    → Existing connection: User {existing[1]} ({existing[2]}) → User {existing[3]} ({existing[4]}) [{existing[5]}]")
        else:
            print(f"    WARNING: No existing connection found (unexpected)")

        conn.commit()

        # ============================================
        # Verification
        # ============================================
        print("\n" + "=" * 80)
        print("VERIFICATION")
        print("=" * 80)

        # Check for any duplicate user pairs
        cur.execute("""
            SELECT
                LEAST(requested_by, recipient_id) as user1,
                GREATEST(requested_by, recipient_id) as user2,
                COUNT(*) as count
            FROM connections
            WHERE requested_by IN (115, 85, 86, 68, 69, 70, 71)
               OR recipient_id IN (115, 85, 86, 68, 69, 70, 71)
            GROUP BY user1, user2
            HAVING COUNT(*) > 1
        """)
        duplicates = cur.fetchall()

        if duplicates:
            print("\nWARNING: Found duplicate user pairs:")
            for user1, user2, count in duplicates:
                print(f"  User {user1} <-> User {user2}: {count} connections")
        else:
            print("\nSUCCESS: No duplicate user pairs found!")

        # User 115 statistics
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE requested_by = 115) as outgoing,
                COUNT(*) FILTER (WHERE recipient_id = 115) as incoming
            FROM connections
            WHERE requested_by = 115 OR recipient_id = 115
        """)
        stats = cur.fetchone()

        print(f"\nUser 115 Connection Statistics:")
        print(f"  Total connections: {stats[0]}")
        print(f"  Accepted: {stats[1]}")
        print(f"  Pending: {stats[2]}")
        print(f"  Outgoing (initiated by 115): {stats[3]}")
        print(f"  Incoming (received by 115): {stats[4]}")

        # Show all connections for User 115
        print(f"\nAll connections for User 115:")
        cur.execute("""
            SELECT
                id,
                requested_by,
                requester_type,
                recipient_id,
                recipient_type,
                status,
                CASE
                    WHEN requested_by = 115 THEN 'OUTGOING'
                    ELSE 'INCOMING'
                END as direction
            FROM connections
            WHERE requested_by = 115 OR recipient_id = 115
            ORDER BY requested_at
        """)

        for row in cur.fetchall():
            conn_id, req_by, req_type, rec_id, rec_type, status, direction = row
            if direction == 'OUTGOING':
                print(f"  [{conn_id}] → User {rec_id} ({rec_type}) [{status.upper()}] (as {req_type})")
            else:
                print(f"  [{conn_id}] ← User {req_by} ({req_type}) [{status.upper()}] (viewing as {rec_type})")

        print("\n" + "=" * 80)
        print("SEED COMPLETE - USER-BASED CONNECTIONS")
        print("=" * 80)
        print(f"\nConnections created: {len(connections_created)}")
        print("Key principle: ONE connection per user pair (no duplicates)")
        print("Roles are metadata showing 'how' they connected\n")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed()
