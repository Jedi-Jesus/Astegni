"""
Seed test connections using USER IDs (matching current FK constraints)
Users 85 and 86
"""
import os
import psycopg
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def seed():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        now = datetime.utcnow()

        # Delete existing connections
        print("Deleting existing connections between users 85 and 86...")
        cur.execute("""
            DELETE FROM connections
            WHERE (requested_by IN (85, 86) AND requested_to IN (85, 86))
        """)
        print(f"Deleted {cur.rowcount} existing connections")

        # Create ACCEPTED connection: 85 -> 86
        print("\nCreating ACCEPTED connection: User 85 -> User 86")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                requested_to, requested_to_type,
                status, requested_at, connected_at, updated_at
            ) VALUES (85, 'tutor', 86, 'tutor', 'accepted', %s, %s, %s)
            RETURNING id
        """, (now, now, now))
        print(f"Created connection ID: {cur.fetchone()[0]}")

        # Create PENDING connection: 86 -> 85
        print("\nCreating PENDING request: User 86 -> User 85")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                requested_to, requested_to_type,
                status, requested_at, updated_at
            ) VALUES (86, 'tutor', 85, 'tutor', 'pending', %s, %s)
            RETURNING id
        """, (now, now))
        print(f"Created connection ID: {cur.fetchone()[0]}")

        # Create more connections with other users
        cur.execute("SELECT id FROM users WHERE id NOT IN (85, 86) LIMIT 5")
        other_users = [row[0] for row in cur.fetchall()]

        for uid in other_users[:2]:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    requested_to, requested_to_type,
                    status, requested_at, connected_at, updated_at
                ) VALUES (85, 'tutor', %s, 'tutor', 'accepted', %s, %s, %s)
            """, (uid, now, now, now))
            print(f"Created ACCEPTED connection: 85 -> {uid}")

        for uid in other_users[2:4]:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    requested_to, requested_to_type,
                    status, requested_at, updated_at
                ) VALUES (%s, 'tutor', 85, 'tutor', 'pending', %s, %s)
            """, (uid, now, now))
            print(f"Created PENDING connection: {uid} -> 85")

        conn.commit()

        # Verify
        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE status = 'accepted'),
                   COUNT(*) FILTER (WHERE status = 'pending')
            FROM connections
            WHERE requested_by = 85 OR requested_to = 85
        """)
        accepted, pending = cur.fetchone()

        print("\n" + "="*60)
        print("SUCCESS!")
        print("="*60)
        print(f"User 85 connections:")
        print(f"  - Accepted: {accepted}")
        print(f"  - Pending: {pending}")
        print("\nLogin with: jediael.s.abebe@gmail.com / @JesusJediael1234")

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed()
