"""
Seed test connection data using PROFILE IDs (tutor_profiles.id)
Connections use profile IDs, not user IDs!
"""
import os
import psycopg
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def seed_test_connections():
    """Create test connections using tutor_profiles.id"""

    print("\n" + "="*60)
    print("SEEDING TEST CONNECTION DATA (Using Profile IDs)")
    print("="*60)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get tutor profiles for users 85 and 86
        print("\n1. Getting tutor profiles for users 85 and 86...")
        cur.execute("""
            SELECT tp.id, tp.user_id, u.first_name || ' ' || u.father_name as name
            FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE u.id IN (85, 86)
            ORDER BY u.id
        """)
        tutors = cur.fetchall()

        if len(tutors) < 2:
            print("ERROR: Could not find tutor profiles for users 85 and 86")
            return

        tutor1_profile_id, tutor1_user_id, tutor1_name = tutors[0]
        tutor2_profile_id, tutor2_user_id, tutor2_name = tutors[1]

        print(f"OK: Found tutor profiles:")
        print(f"   - Tutor Profile ID {tutor1_profile_id} (User {tutor1_user_id}: {tutor1_name})")
        print(f"   - Tutor Profile ID {tutor2_profile_id} (User {tutor2_user_id}: {tutor2_name})")

        # Check for existing connections
        print(f"\n2. Checking for existing connections...")
        cur.execute("""
            SELECT id, status, requested_by, requested_to
            FROM connections
            WHERE (requested_by = %s AND requested_to = %s)
               OR (requested_by = %s AND requested_to = %s)
        """, (tutor1_profile_id, tutor2_profile_id, tutor2_profile_id, tutor1_profile_id))

        existing = cur.fetchall()

        if existing:
            print(f"   Found {len(existing)} existing connection(s) - deleting...")
            cur.execute("""
                DELETE FROM connections
                WHERE (requested_by = %s AND requested_to = %s)
                   OR (requested_by = %s AND requested_to = %s)
            """, (tutor1_profile_id, tutor2_profile_id, tutor2_profile_id, tutor1_profile_id))
            conn.commit()
            print(f"   OK: Deleted {cur.rowcount} connection(s)")
        else:
            print("   No existing connections found")

        # Create test connections
        print(f"\n3. Creating test connections...")
        now = datetime.utcnow()

        # Connection 1: ACCEPTED (Tutor 63 -> Tutor 64)
        print(f"\n   Creating ACCEPTED connection: Tutor {tutor1_profile_id} -> Tutor {tutor2_profile_id}")
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
        """, (tutor1_profile_id, tutor2_profile_id, now, now, now))
        conn1_id = cur.fetchone()[0]
        print(f"   OK: Created connection ID {conn1_id} (ACCEPTED)")

        # Connection 2: PENDING (Tutor 64 -> Tutor 63)
        print(f"\n   Creating PENDING request: Tutor {tutor2_profile_id} -> Tutor {tutor1_profile_id}")
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
        """, (tutor2_profile_id, tutor1_profile_id, now, now))
        conn2_id = cur.fetchone()[0]
        print(f"   OK: Created connection ID {conn2_id} (PENDING)")

        # Create additional connections with other tutors
        print(f"\n4. Creating additional test connections...")
        cur.execute("""
            SELECT tp.id, u.first_name || ' ' || u.father_name as name
            FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.id NOT IN (%s, %s)
            LIMIT 5
        """, (tutor1_profile_id, tutor2_profile_id))

        other_tutors = cur.fetchall()

        if other_tutors:
            print(f"   Found {len(other_tutors)} other tutors")

            # Create 2 accepted connections
            for other_tutor_id, other_name in other_tutors[:2]:
                print(f"   Creating ACCEPTED: Tutor {tutor1_profile_id} -> Tutor {other_tutor_id} ({other_name})")
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
                """, (tutor1_profile_id, other_tutor_id, now, now, now))
                conn_id = cur.fetchone()[0]
                print(f"   OK: Created connection ID {conn_id}")

            # Create 2 pending connections
            for other_tutor_id, other_name in other_tutors[2:4]:
                print(f"   Creating PENDING: Tutor {other_tutor_id} ({other_name}) -> Tutor {tutor1_profile_id}")
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
                """, (other_tutor_id, tutor1_profile_id, now, now))
                conn_id = cur.fetchone()[0]
                print(f"   OK: Created connection ID {conn_id}")

        # Commit all changes
        conn.commit()

        # Verify
        print("\n5. Verifying created connections...")
        cur.execute("""
            SELECT id, requested_by, requested_to, status
            FROM connections
            WHERE requested_by = %s OR requested_to = %s
            ORDER BY id DESC
        """, (tutor1_profile_id, tutor1_profile_id))

        all_connections = cur.fetchall()
        accepted = [c for c in all_connections if c[3] == 'accepted']
        pending = [c for c in all_connections if c[3] == 'pending']

        print(f"\n   Total connections for Tutor {tutor1_profile_id}: {len(all_connections)}")
        print(f"   - Accepted: {len(accepted)}")
        print(f"   - Pending: {len(pending)}")

        print("\n   Details:")
        for conn_id, req_by, req_to, status in all_connections[:10]:
            direction = "->" if req_by == tutor1_profile_id else "<-"
            other = req_to if req_by == tutor1_profile_id else req_by
            print(f"   - Connection {conn_id}: Tutor {tutor1_profile_id} {direction} Tutor {other} ({status})")

        print("\n" + "="*60)
        print("SUCCESS: TEST DATA SEEDED SUCCESSFULLY!")
        print("="*60)
        print(f"\nTest with User ID {tutor1_user_id} (email: jediael.s.abebe@gmail.com)")
        print(f"Tutor Profile ID: {tutor1_profile_id}")
        print("\nExpected results:")
        print(f"  - Connections panel: {len(accepted)} connections")
        print(f"  - Requests panel: {len(pending)} pending requests")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_test_connections()
