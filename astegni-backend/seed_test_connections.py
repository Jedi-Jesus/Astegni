"""
Seed test connection data between tutor_id 85 and tutor_id 86
For testing Community Panel functionality
"""
import os
import psycopg
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def seed_test_connections():
    """Create test connections for tutors 85 and 86"""

    print("\n" + "="*60)
    print("SEEDING TEST CONNECTION DATA")
    print("="*60)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # First, check if users 85 and 86 exist
        print("\n1. Checking if users exist...")
        cur.execute("""
            SELECT id, first_name || ' ' || father_name as name
            FROM users
            WHERE id IN (85, 86)
        """)
        users = cur.fetchall()

        if len(users) < 2:
            print("ERROR: Users 85 and 86 do not exist in the database")
            print("   Available users:")
            for user in users:
                print(f"   - User {user[0]}: {user[1]}")

            # Let's find the actual user IDs that exist
            print("\n   Looking for tutor profiles...")
            cur.execute("""
                SELECT u.id, u.first_name || ' ' || u.father_name as name, t.id as tutor_id
                FROM users u
                JOIN tutors t ON u.id = t.user_id
                ORDER BY u.id
                LIMIT 10
            """)
            tutors = cur.fetchall()

            if tutors:
                print("\n   Available tutors:")
                for tutor in tutors:
                    print(f"   - User ID: {tutor[0]}, Name: {tutor[1]}, Tutor ID: {tutor[2]}")

                if len(tutors) >= 2:
                    user1_id = tutors[0][0]
                    user2_id = tutors[1][0]
                    print(f"\n   Using User ID {user1_id} and User ID {user2_id} instead")
                else:
                    print("\n   ERROR: Not enough tutors found to create test connections")
                    return
            else:
                print("\n   ERROR: No tutors found in the database")
                return
        else:
            user1_id = 85
            user2_id = 86
            print(f"OK: Users found:")
            for user in users:
                print(f"   - User {user[0]}: {user[1]}")

        # Check if connections already exist
        print(f"\n2. Checking for existing connections between users {user1_id} and {user2_id}...")
        cur.execute("""
            SELECT id, status, requested_by, requested_to
            FROM connections
            WHERE (requested_by = %s AND requested_to = %s)
               OR (requested_by = %s AND requested_to = %s)
        """, (user1_id, user2_id, user2_id, user1_id))

        existing = cur.fetchall()

        if existing:
            print(f"   Found {len(existing)} existing connection(s):")
            for conn_record in existing:
                print(f"   - Connection ID {conn_record[0]}: Status={conn_record[1]}, From={conn_record[2]}, To={conn_record[3]}")

            # Delete existing connections
            print(f"\n   Deleting existing connections...")
            cur.execute("""
                DELETE FROM connections
                WHERE (requested_by = %s AND requested_to = %s)
                   OR (requested_by = %s AND requested_to = %s)
            """, (user1_id, user2_id, user2_id, user1_id))
            conn.commit()
            print(f"   OK: Deleted {cur.rowcount} existing connection(s)")
        else:
            print("   No existing connections found")

        # Create test connections
        print(f"\n3. Creating test connections...")

        # Connection 1: User {user1_id} -> User {user2_id} (ACCEPTED)
        print(f"\n   Creating ACCEPTED connection: User {user1_id} -> User {user2_id}")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                requested_to, requested_to_type,
                status, requested_at, connected_at, updated_at
            ) VALUES (
                %s, 'tutor',
                %s, 'tutor',
                'accepted', %s, %s, %s
            ) RETURNING id
        """, (user1_id, user2_id, datetime.utcnow(), datetime.utcnow(), datetime.utcnow()))

        connection1_id = cur.fetchone()[0]
        print(f"   OK: Created connection ID: {connection1_id} (ACCEPTED)")

        # Connection 2: User {user2_id} -> User {user1_id} (PENDING - for requests)
        print(f"\n   Creating PENDING connection request: User {user2_id} -> User {user1_id}")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                requested_to, requested_to_type,
                status, requested_at, updated_at
            ) VALUES (
                %s, 'tutor',
                %s, 'tutor',
                'pending', %s, %s
            ) RETURNING id
        """, (user2_id, user1_id, datetime.utcnow(), datetime.utcnow()))

        connection2_id = cur.fetchone()[0]
        print(f"   OK: Created connection ID: {connection2_id} (PENDING)")

        # Let's also create a few more test connections with other users
        print(f"\n4. Creating additional test connections...")

        # Get a few more users (simplified query without tutors table)
        cur.execute("""
            SELECT u.id
            FROM users u
            WHERE u.id NOT IN (%s, %s)
            AND 'tutor' = ANY(u.roles::text[])
            LIMIT 5
        """, (user1_id, user2_id))

        other_users = [row[0] for row in cur.fetchall()]

        if other_users:
            print(f"   Found {len(other_users)} other users to create connections with")

            # Create 2 accepted connections
            for i, other_user_id in enumerate(other_users[:2]):
                print(f"   Creating ACCEPTED connection: User {user1_id} -> User {other_user_id}")
                cur.execute("""
                    INSERT INTO connections (
                        requested_by, requester_type,
                        requested_to, requested_to_type,
                        status, requested_at, connected_at, updated_at
                    ) VALUES (
                        %s, 'tutor',
                        %s, 'tutor',
                        'accepted', %s, %s, %s
                    ) RETURNING id
                """, (user1_id, other_user_id, datetime.utcnow(), datetime.utcnow(), datetime.utcnow()))
                conn_id = cur.fetchone()[0]
                print(f"   OK: Created connection ID: {conn_id}")

            # Create 2 pending connections
            for i, other_user_id in enumerate(other_users[2:4]):
                print(f"   Creating PENDING connection: User {other_user_id} -> User {user1_id}")
                cur.execute("""
                    INSERT INTO connections (
                        requested_by, requester_type,
                        requested_to, requested_to_type,
                        status, requested_at, updated_at
                    ) VALUES (
                        %s, 'tutor',
                        %s, 'tutor',
                        'pending', %s, %s
                    ) RETURNING id
                """, (other_user_id, user1_id, datetime.utcnow(), datetime.utcnow()))
                conn_id = cur.fetchone()[0]
                print(f"   OK: Created connection ID: {conn_id}")

        # Commit all changes
        conn.commit()

        # Verify the data
        print("\n5. Verifying created connections...")
        cur.execute("""
            SELECT id, requested_by, recipient, status
            FROM connections
            WHERE requested_by = %s OR recipient = %s
            ORDER BY created_at DESC
        """, (user1_id, user1_id))

        all_connections = cur.fetchall()
        print(f"\n   Total connections for User {user1_id}: {len(all_connections)}")

        accepted_count = sum(1 for c in all_connections if c[3] == 'accepted')
        pending_count = sum(1 for c in all_connections if c[3] == 'pending')

        print(f"   - Accepted: {accepted_count}")
        print(f"   - Pending: {pending_count}")

        print("\n   Details:")
        for conn_record in all_connections[:10]:  # Show first 10
            direction = "→" if conn_record[1] == user1_id else "←"
            other_user = conn_record[2] if conn_record[1] == user1_id else conn_record[1]
            print(f"   - Connection {conn_record[0]}: User {user1_id} {direction} User {other_user} ({conn_record[3]})")

        print("\n" + "="*60)
        print("SUCCESS: TEST DATA SEEDED SUCCESSFULLY!")
        print("="*60)
        print(f"\nYou can now test with User ID {user1_id}")
        print("Expected results:")
        print(f"  - Connections panel: {accepted_count} connections")
        print(f"  - Requests panel: {pending_count} pending requests")

    except Exception as e:
        print(f"\nERROR: {e}")
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_test_connections()
