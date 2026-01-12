"""
Debug script to check parent_invitations table and related data
Run this to see what's in the database
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("="*80)
print("PARENT INVITATIONS DATABASE DEBUG SCRIPT")
print("="*80)

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:

        # 1. Check total invitations
        print("\nSECTION 1: INVITATION STATISTICS")
        print("-"*80)
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
            FROM parent_invitations
        """)
        stats = cur.fetchone()
        print(f"Total invitations: {stats['total']}")
        print(f"  - Pending: {stats['pending']}")
        print(f"  - Accepted: {stats['accepted']}")
        print(f"  - Rejected: {stats['rejected']}")

        # 2. Show all pending invitations
        print("\nSECTION 2: ALL PENDING INVITATIONS")
        print("-"*80)
        cur.execute("""
            SELECT
                id,
                inviter_id,
                inviter_profile_type,
                invites_id,
                invites_profile_type,
                relationship_type,
                status,
                is_new_user,
                pending_email,
                pending_phone,
                created_at
            FROM parent_invitations
            WHERE status = 'pending'
            ORDER BY created_at DESC
        """)
        pending = cur.fetchall()

        if pending:
            for idx, inv in enumerate(pending, 1):
                print(f"\nInvitation #{idx}:")
                print(f"  ID: {inv['id']}")
                print(f"  Inviter: {inv['inviter_profile_type']} (profile_id={inv['inviter_id']})")
                print(f"  Invites: {inv['invites_profile_type']} (profile_id={inv['invites_id']})")
                print(f"  Relationship: {inv['relationship_type']}")
                print(f"  Is New User: {inv['is_new_user']}")
                if inv['is_new_user']:
                    print(f"  Pending Email: {inv['pending_email']}")
                    print(f"  Pending Phone: {inv['pending_phone']}")
                print(f"  Created: {inv['created_at']}")
        else:
            print("No pending invitations found!")

        # 3. Check user profiles for common test user (user_id = 115)
        print("\nSECTION 3: TEST USER PROFILES (user_id=115)")
        print("-"*80)

        # Check student profile
        cur.execute("SELECT id FROM student_profiles WHERE user_id = 115")
        student = cur.fetchone()
        if student:
            print(f"[OK] Student Profile: ID = {student['id']}")
        else:
            print("[NO] No student profile")

        # Check tutor profile
        cur.execute("SELECT id FROM tutor_profiles WHERE user_id = 115")
        tutor = cur.fetchone()
        if tutor:
            print(f"[OK] Tutor Profile: ID = {tutor['id']}")
        else:
            print("[NO] No tutor profile")

        # Check parent profile
        cur.execute("SELECT id FROM parent_profiles WHERE user_id = 115")
        parent = cur.fetchone()
        if parent:
            print(f"[OK] Parent Profile: ID = {parent['id']}")
        else:
            print("[NO] No parent profile")

        # 4. Cross-reference: Which invitations match user_id=115's profiles?
        print("\nSECTION 4: MATCHING INVITATIONS FOR USER 115")
        print("-"*80)

        profile_ids = []
        if student:
            profile_ids.append((student['id'], 'student'))
        if tutor:
            profile_ids.append((tutor['id'], 'tutor'))
        if parent:
            profile_ids.append((parent['id'], 'parent'))

        if profile_ids:
            print(f"Checking for invitations matching these profiles: {profile_ids}")

            for profile_id, profile_type in profile_ids:
                cur.execute("""
                    SELECT COUNT(*) as count
                    FROM parent_invitations
                    WHERE invites_id = %s
                    AND invites_profile_type = %s
                    AND status = 'pending'
                """, (profile_id, profile_type))
                count = cur.fetchone()['count']
                print(f"  - {profile_type} (ID={profile_id}): {count} pending invitations")
        else:
            print("[NO] User 115 has no profiles!")

        # 5. Show sample users with profiles
        print("\nSECTION 5: SAMPLE USERS WITH MULTIPLE PROFILES")
        print("-"*80)
        cur.execute("""
            SELECT
                u.id as user_id,
                u.email,
                u.roles,
                (SELECT id FROM student_profiles WHERE user_id = u.id) as student_profile_id,
                (SELECT id FROM tutor_profiles WHERE user_id = u.id) as tutor_profile_id,
                (SELECT id FROM parent_profiles WHERE user_id = u.id) as parent_profile_id
            FROM users u
            WHERE u.is_active = TRUE
            LIMIT 10
        """)
        users = cur.fetchall()

        for user in users:
            print(f"\nUser ID: {user['user_id']} | Email: {user['email']}")
            print(f"  Roles: {user['roles']}")
            print(f"  Student Profile: {user['student_profile_id'] or 'None'}")
            print(f"  Tutor Profile: {user['tutor_profile_id'] or 'None'}")
            print(f"  Parent Profile: {user['parent_profile_id'] or 'None'}")

        # 6. Create a test invitation if none exist
        print("\nSECTION 6: CREATE TEST INVITATION (if needed)")
        print("-"*80)

        if not pending and student and tutor:
            print("Creating a test invitation...")
            cur.execute("""
                INSERT INTO parent_invitations (
                    inviter_id,
                    inviter_profile_type,
                    invites_id,
                    invites_profile_type,
                    relationship_type,
                    status,
                    created_at
                ) VALUES (
                    %s, 'student', %s, 'tutor', 'Parent', 'pending', NOW()
                )
                RETURNING id
            """, (student['id'], tutor['id']))
            new_inv = cur.fetchone()
            conn.commit()
            print(f"[OK] Created test invitation with ID: {new_inv['id']}")
            print(f"   Student (ID={student['id']}) invites Tutor (ID={tutor['id']})")
        elif not pending:
            print("[WARN] Cannot create test invitation - user 115 needs both student and tutor profiles")
        else:
            print(f"[OK] {len(pending)} pending invitation(s) already exist - no test invitation needed")

print("\n" + "="*80)
print("DEBUG SCRIPT COMPLETE")
print("="*80)
