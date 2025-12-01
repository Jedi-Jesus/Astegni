"""
Seed connection data for testing tutor community panel
Creates connections between tutor 85 and tutor 86
"""

import psycopg
from datetime import datetime

# Database connection string
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def seed_tutor_connections():
    """Seed connections for tutors 85 and 86"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Seeding connection data for tutors 85 and 86...")

    # Delete existing connections for tutors 85 and 86 to avoid duplicates
    cur.execute("""
        DELETE FROM connections
        WHERE (requested_by IN (85, 86) OR requested_to IN (85, 86))
    """)
    conn.commit()
    print("Cleared existing connections for tutors 85 and 86")

    # Connection 1: Tutor 86 sends connection request to Tutor 85 (PENDING)
    cur.execute("""
        INSERT INTO connections (
            requested_by, requester_type,
            requested_to, requested_to_type,
            status, connection_message, requested_at
        ) VALUES (
            86, 'tutor',
            85, 'tutor',
            'pending',
            'Hi! I would love to connect with you and share teaching experiences.',
            %s
        )
    """, (datetime.utcnow(),))

    print("Created: Tutor 86 -> Tutor 85 (pending)")

    # Connection 2: Tutor 112 sends connection request to Tutor 85 (PENDING)
    cur.execute("""
        INSERT INTO connections (
            requested_by, requester_type,
            requested_to, requested_to_type,
            status, connection_message, requested_at
        ) VALUES (
            112, 'tutor',
            85, 'tutor',
            'pending',
            'Looking forward to collaborating on educational content!',
            %s
        )
    """, (datetime.utcnow(),))

    print("Created: Tutor 112 -> Tutor 85 (pending)")

    # Connection 3: Tutor 85 sends connection request to Tutor 90 (PENDING - OUTGOING)
    cur.execute("""
        INSERT INTO connections (
            requested_by, requester_type,
            requested_to, requested_to_type,
            status, connection_message, requested_at
        ) VALUES (
            85, 'tutor',
            90, 'tutor',
            'pending',
            'Hi! I saw your profile and would like to connect.',
            %s
        )
    """, (datetime.utcnow(),))

    print("Created: Tutor 85 -> Tutor 90 (pending - outgoing request)")

    # Connection 4: Tutor 85 is CONNECTED with Tutor 100 (ACCEPTED)
    cur.execute("""
        INSERT INTO connections (
            requested_by, requester_type,
            requested_to, requested_to_type,
            status, connection_message, requested_at, connected_at
        ) VALUES (
            100, 'tutor',
            85, 'tutor',
            'accepted',
            'Let''s collaborate on some projects!',
            %s,
            %s
        )
    """, (datetime.utcnow(), datetime.utcnow()))

    print("Created: Tutor 100 <-> Tutor 85 (accepted connection)")

    # Connection 5: Tutor 85 is CONNECTED with Tutor 105 (ACCEPTED)
    cur.execute("""
        INSERT INTO connections (
            requested_by, requester_type,
            requested_to, requested_to_type,
            status, connection_message, requested_at, connected_at
        ) VALUES (
            85, 'tutor',
            105, 'tutor',
            'accepted',
            'Great to have you in my network!',
            %s,
            %s
        )
    """, (datetime.utcnow(), datetime.utcnow()))

    print("Created: Tutor 85 <-> Tutor 105 (accepted connection)")

    # Commit all changes
    conn.commit()

    # Verify the data
    print("\nVerification:")
    print("\n--- Incoming Requests for Tutor 85 (status=pending, requested_to=85) ---")
    cur.execute("""
        SELECT id, requested_by, requested_to, status, connection_message
        FROM connections
        WHERE requested_to = 85 AND status = 'pending'
    """)
    incoming = cur.fetchall()
    for row in incoming:
        print(f"  Connection ID {row[0]}: Tutor {row[1]} -> Tutor {row[2]} ({row[3]}) - '{row[4]}'")
    print(f"  Total: {len(incoming)} incoming requests")

    print("\n--- Outgoing Requests for Tutor 85 (status=pending, requested_by=85) ---")
    cur.execute("""
        SELECT id, requested_by, requested_to, status, connection_message
        FROM connections
        WHERE requested_by = 85 AND status = 'pending'
    """)
    outgoing = cur.fetchall()
    for row in outgoing:
        print(f"  Connection ID {row[0]}: Tutor {row[1]} -> Tutor {row[2]} ({row[3]}) - '{row[4]}'")
    print(f"  Total: {len(outgoing)} outgoing requests")

    print("\n--- Accepted Connections for Tutor 85 (status=accepted) ---")
    cur.execute("""
        SELECT id, requested_by, requested_to, status
        FROM connections
        WHERE (requested_by = 85 OR requested_to = 85) AND status = 'accepted'
    """)
    accepted = cur.fetchall()
    for row in accepted:
        print(f"  Connection ID {row[0]}: Tutor {row[1]} <-> Tutor {row[2]} ({row[3]})")
    print(f"  Total: {len(accepted)} accepted connections")

    # Close connection
    cur.close()
    conn.close()

    print("\nSeeding completed successfully!")
    print(f"\nSummary for Tutor 85:")
    print(f"  - Incoming requests (pending): {len(incoming)}")
    print(f"  - Outgoing requests (pending): {len(outgoing)}")
    print(f"  - Accepted connections: {len(accepted)}")
    print(f"  - Total: {len(incoming) + len(outgoing) + len(accepted)}")

if __name__ == "__main__":
    seed_tutor_connections()
