"""
Seed connections for TUTOR_PROFILES.ID = 85 and 86

Mapping:
- Tutor Profile ID 85 → User ID 115 (jediael.s.abebe@gmail.com)
- Tutor Profile ID 86 → User ID 141 (Kush Studios)

Note: connections table uses user_ids (FK to users.id)
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
        # User IDs for tutor profiles 85 and 86
        user_115 = 115  # Tutor Profile 85 (jediael.s.abebe@gmail.com)
        user_141 = 141  # Tutor Profile 86 (Kush Studios)

        print("="*60)
        print("SEEDING CONNECTIONS FOR TUTOR PROFILES 85 & 86")
        print("="*60)
        print(f"\nTutor Profile 85 -> User {user_115} (jediael.s.abebe@gmail.com)")
        print(f"Tutor Profile 86 -> User {user_141} (Kush Studios)")

        # Delete existing connections
        print(f"\nDeleting existing connections...")
        cur.execute("""
            DELETE FROM connections
            WHERE (requested_by IN (%s, %s) OR requested_to IN (%s, %s))
        """, (user_115, user_141, user_115, user_141))
        deleted = cur.rowcount
        print(f"Deleted {deleted} existing connections")

        now = datetime.utcnow()

        # Create ACCEPTED connection: 115 -> 141
        print(f"\nCreating ACCEPTED: User {user_115} -> User {user_141}")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                requested_to, requested_to_type,
                status, requested_at, connected_at, updated_at
            ) VALUES (%s, 'tutor', %s, 'tutor', 'accepted', %s, %s, %s)
            RETURNING id
        """, (user_115, user_141, now, now, now))
        print(f"Created connection ID: {cur.fetchone()[0]}")

        # Create PENDING connection: 141 -> 115
        print(f"\nCreating PENDING: User {user_141} -> User {user_115}")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                requested_to, requested_to_type,
                status, requested_at, updated_at
            ) VALUES (%s, 'tutor', %s, 'tutor', 'pending', %s, %s)
            RETURNING id
        """, (user_141, user_115, now, now))
        print(f"Created connection ID: {cur.fetchone()[0]}")

        # Create additional connections with other tutors
        print(f"\nCreating additional connections...")
        cur.execute("""
            SELECT tp.user_id, u.first_name, u.father_name
            FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.user_id NOT IN (%s, %s)
            LIMIT 5
        """, (user_115, user_141))

        other_tutors = cur.fetchall()

        for uid, fname, lname in other_tutors[:2]:
            print(f"  ACCEPTED: User {user_115} -> User {uid} ({fname} {lname})")
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    requested_to, requested_to_type,
                    status, requested_at, connected_at, updated_at
                ) VALUES (%s, 'tutor', %s, 'tutor', 'accepted', %s, %s, %s)
            """, (user_115, uid, now, now, now))

        for uid, fname, lname in other_tutors[2:4]:
            print(f"  PENDING: User {uid} ({fname} {lname}) -> User {user_115}")
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    requested_to, requested_to_type,
                    status, requested_at, updated_at
                ) VALUES (%s, 'tutor', %s, 'tutor', 'pending', %s, %s)
            """, (uid, user_115, now, now))

        conn.commit()

        # Verify
        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE status = 'accepted'),
                   COUNT(*) FILTER (WHERE status = 'pending')
            FROM connections
            WHERE requested_by = %s OR requested_to = %s
        """, (user_115, user_115))
        accepted, pending = cur.fetchone()

        print("\n" + "="*60)
        print("SUCCESS!")
        print("="*60)
        print(f"\nUser {user_115} (Tutor Profile 85) connections:")
        print(f"  - Accepted: {accepted}")
        print(f"  - Pending: {pending}")
        print("\nLogin with:")
        print("  Email: jediael.s.abebe@gmail.com")
        print("  Password: @JesusJediael1234")
        print("\nClick 'Community' in sidebar to see connections!")

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed()
