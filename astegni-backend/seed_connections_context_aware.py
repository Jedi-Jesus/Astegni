"""
Seed connections with context-aware roles (Updated Schema)

This seed file demonstrates the new context-aware connection system:
- requester_type: Based on user's active role when connecting
- recipient_type: Based on page context (view-tutor, view-student, etc.)

Users:
- User 115 (jediael.s.abebe@gmail.com): Has both TUTOR and STUDENT profiles
- User 85 (elias.kidane17@astegni.com): Has TUTOR profile only
- User 86 (bekele.abebe18@astegni.com): Has TUTOR profile only

Scenarios Created:
1. User 115 as STUDENT → User 85 as TUTOR (student viewing tutor profile)
2. User 115 as TUTOR → User 86 as TUTOR (tutor viewing tutor profile)
3. User 85 as TUTOR → User 115 as TUTOR (tutor viewing tutor profile)
4. User 86 as TUTOR → User 115 as STUDENT (tutor viewing student profile)
"""
import os
import sys
import psycopg
from dotenv import load_dotenv
from datetime import datetime

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def seed():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        now = datetime.now()

        # Delete existing connections for users 115, 85, 86
        print("Deleting existing connections for users 115, 85, 86...")
        cur.execute("""
            DELETE FROM connections
            WHERE requested_by IN (115, 85, 86) OR recipient_id IN (115, 85, 86)
        """)
        print(f"✅ Deleted {cur.rowcount} existing connections\n")

        print("="*70)
        print("CREATING CONTEXT-AWARE CONNECTIONS")
        print("="*70)

        # ============================================
        # Scenario 1: Student connecting to Tutor
        # ============================================
        print("\n📚 Scenario 1: User 115 as STUDENT → User 85 as TUTOR")
        print("   Context: Student viewing tutor profile (view-tutor.html)")
        print("   Status: ACCEPTED (already connected)")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                recipient_id, recipient_type,
                status, requested_at, connected_at, updated_at
            ) VALUES (115, 'student', 85, 'tutor', 'accepted', %s, %s, %s)
            RETURNING id
        """, (now, now, now))
        conn_id = cur.fetchone()[0]
        print(f"   ✅ Created connection ID: {conn_id}")
        print(f"   → Student 115 is connected to Tutor 85")

        # ============================================
        # Scenario 2: Tutor connecting to Tutor
        # ============================================
        print("\n👥 Scenario 2: User 115 as TUTOR → User 86 as TUTOR")
        print("   Context: Tutor viewing another tutor's profile (view-tutor.html)")
        print("   Status: PENDING (connection request sent)")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                recipient_id, recipient_type,
                status, requested_at, updated_at
            ) VALUES (115, 'tutor', 86, 'tutor', 'pending', %s, %s)
            RETURNING id
        """, (now, now))
        conn_id = cur.fetchone()[0]
        print(f"   ✅ Created connection ID: {conn_id}")
        print(f"   → Tutor 115 sent request to Tutor 86")

        # ============================================
        # Scenario 3: Tutor connecting to Tutor (Incoming)
        # ============================================
        print("\n👥 Scenario 3: User 85 as TUTOR → User 115 as TUTOR")
        print("   Context: Tutor viewing another tutor's profile (view-tutor.html)")
        print("   Status: PENDING (User 115 will see incoming request)")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                recipient_id, recipient_type,
                status, requested_at, updated_at
            ) VALUES (85, 'tutor', 115, 'tutor', 'pending', %s, %s)
            RETURNING id
        """, (now, now))
        conn_id = cur.fetchone()[0]
        print(f"   ✅ Created connection ID: {conn_id}")
        print(f"   → Tutor 85 sent request to Tutor 115")

        # ============================================
        # Scenario 4: Tutor connecting to Student
        # ============================================
        print("\n🎓 Scenario 4: User 86 as TUTOR → User 115 as STUDENT")
        print("   Context: Tutor viewing student profile (view-student.html)")
        print("   Status: ACCEPTED (tutor connected to student)")
        cur.execute("""
            INSERT INTO connections (
                requested_by, requester_type,
                recipient_id, recipient_type,
                status, requested_at, connected_at, updated_at
            ) VALUES (86, 'tutor', 115, 'student', 'accepted', %s, %s, %s)
            RETURNING id
        """, (now, now, now))
        conn_id = cur.fetchone()[0]
        print(f"   ✅ Created connection ID: {conn_id}")
        print(f"   → Tutor 86 is connected to Student 115")

        # ============================================
        # Additional connections with other users
        # ============================================
        print("\n🔗 Creating additional connections for variety...")

        # Get some other tutor users
        cur.execute("""
            SELECT DISTINCT u.id
            FROM users u
            JOIN tutor_profiles t ON u.id = t.user_id
            WHERE u.id NOT IN (115, 85, 86)
            LIMIT 5
        """)
        other_tutors = [row[0] for row in cur.fetchall()]

        # User 115 as student connected to 2 more tutors
        for tutor_id in other_tutors[:2]:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, connected_at, updated_at
                ) VALUES (115, 'student', %s, 'tutor', 'accepted', %s, %s, %s)
            """, (tutor_id, now, now, now))
            print(f"   ✅ Student 115 → Tutor {tutor_id} (ACCEPTED)")

        # User 115 as tutor with pending requests from 2 other tutors
        for tutor_id in other_tutors[2:4]:
            cur.execute("""
                INSERT INTO connections (
                    requested_by, requester_type,
                    recipient_id, recipient_type,
                    status, requested_at, updated_at
                ) VALUES (%s, 'tutor', 115, 'tutor', 'pending', %s, %s)
            """, (tutor_id, now, now))
            print(f"   ✅ Tutor {tutor_id} → Tutor 115 (PENDING)")

        conn.commit()

        # ============================================
        # Verify and Display Results
        # ============================================
        print("\n" + "="*70)
        print("VERIFICATION")
        print("="*70)

        # User 115 statistics
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE status = 'accepted' AND requester_type = 'student') as student_accepted,
                COUNT(*) FILTER (WHERE status = 'pending' AND requester_type = 'student') as student_pending,
                COUNT(*) FILTER (WHERE status = 'accepted' AND requester_type = 'tutor') as tutor_accepted,
                COUNT(*) FILTER (WHERE status = 'pending' AND requester_type = 'tutor') as tutor_pending,
                COUNT(*) FILTER (WHERE status = 'pending' AND recipient_id = 115) as incoming_pending
            FROM connections
            WHERE requested_by = 115 OR recipient_id = 115
        """)
        stats = cur.fetchone()

        print("\n👤 User 115 (jediael.s.abebe@gmail.com) - Has TUTOR + STUDENT profiles:")
        print(f"   As STUDENT:")
        print(f"      • Accepted connections: {stats[0]}")
        print(f"      • Pending requests: {stats[1]}")
        print(f"   As TUTOR:")
        print(f"      • Accepted connections: {stats[2]}")
        print(f"      • Pending requests: {stats[3]}")
        print(f"   Incoming pending requests: {stats[4]}")

        # Show all connections for User 115
        print("\n📋 All connections for User 115:")
        cur.execute("""
            SELECT
                CASE
                    WHEN requested_by = 115 THEN 'Outgoing'
                    ELSE 'Incoming'
                END as direction,
                requester_type,
                recipient_type,
                CASE
                    WHEN requested_by = 115 THEN recipient_id
                    ELSE requested_by
                END as other_user_id,
                status
            FROM connections
            WHERE requested_by = 115 OR recipient_id = 115
            ORDER BY status, direction
        """)

        for row in cur.fetchall():
            direction, req_type, rec_type, other_id, status = row
            if direction == 'Outgoing':
                print(f"   → {req_type.upper()} 115 → {rec_type.upper()} {other_id} ({status.upper()})")
            else:
                print(f"   ← {req_type.upper()} {other_id} → {rec_type.upper()} 115 ({status.upper()})")

        print("\n" + "="*70)
        print("✅ SUCCESS! Context-aware connections created")
        print("="*70)
        print("\n🔐 Test Login:")
        print("   Email: jediael.s.abebe@gmail.com")
        print("   Password: @JesusJediael1234")
        print("\n📖 Testing Instructions:")
        print("   1. Login and switch to STUDENT role")
        print("   2. Visit view-tutor.html?id=85")
        print("   3. You should see '✓ Connected' button (accepted)")
        print("   4. Switch to TUTOR role")
        print("   5. Visit view-tutor.html?id=86")
        print("   6. You should see '⏳ Request Pending' button")
        print("   7. Visit view-tutor.html?id=85")
        print("   8. You should see '📨 Accept Request' button (incoming)")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed()
