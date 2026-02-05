"""
Migration: Fix requested_sessions to use user-based requester_id

PROBLEM:
  Current: requester_id points to student_profiles.id OR parent_profiles.id (role-based)
  Issue: Same user with multiple roles appears as different requesters

SOLUTION:
  Change: requester_id to point to users.id (user-based)
  Keep: requester_type to maintain role context

DESIGN:
  requester_id:     users.id (who made the request)
  requester_type:   'student' or 'parent' (which role they used)

  To get profile ID: JOIN student_profiles/parent_profiles WHERE user_id = requester_id
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Fix requested_sessions.requester_id to user-based")
        print("=" * 80)

        # Step 1: Show current data
        print("\n1. CURRENT DATA (role-based requester_id):")
        cur.execute("""
            SELECT
                rs.id,
                rs.requester_id AS current_requester_id,
                rs.requester_type,
                CASE
                    WHEN rs.requester_type = 'student' THEN sp.user_id
                    WHEN rs.requester_type = 'parent' THEN pp.user_id
                END as should_be_user_id
            FROM requested_sessions rs
            LEFT JOIN student_profiles sp ON rs.requester_id = sp.id AND rs.requester_type = 'student'
            LEFT JOIN parent_profiles pp ON rs.requester_id = pp.id AND rs.requester_type = 'parent'
            ORDER BY rs.id
        """)

        rows = cur.fetchall()
        print(f"   {'ID':<5} {'Current(Profile)':<20} {'Type':<10} {'Should Be(User)':<20}")
        print("   " + "-" * 60)
        for row in rows:
            user_id = str(row[3]) if row[3] is not None else 'NULL'
            req_type = str(row[2]) if row[2] is not None else 'NULL'
            print(f"   {row[0]:<5} {row[1]:<20} {req_type:<10} {user_id:<20}")

        # Step 2: Add temporary column for new user_id values
        print("\n2. Adding temporary column temp_user_id...")
        cur.execute("""
            ALTER TABLE requested_sessions
            ADD COLUMN IF NOT EXISTS temp_user_id INTEGER
        """)
        conn.commit()
        print("   [OK] Column added")

        # Step 3: Populate temp_user_id with correct user_id values
        print("\n3. Populating temp_user_id with user IDs...")

        # For students
        cur.execute("""
            UPDATE requested_sessions rs
            SET temp_user_id = sp.user_id
            FROM student_profiles sp
            WHERE rs.requester_type = 'student'
            AND rs.requester_id = sp.id
        """)
        student_count = cur.rowcount
        print(f"   [OK] Updated {student_count} student requests")

        # For parents
        cur.execute("""
            UPDATE requested_sessions rs
            SET temp_user_id = pp.user_id
            FROM parent_profiles pp
            WHERE rs.requester_type = 'parent'
            AND rs.requester_id = pp.id
        """)
        parent_count = cur.rowcount
        print(f"   [OK] Updated {parent_count} parent requests")

        conn.commit()

        # Step 4: Verify no nulls
        print("\n4. Verifying data integrity...")
        cur.execute("""
            SELECT COUNT(*) FROM requested_sessions WHERE temp_user_id IS NULL
        """)
        null_count = cur.fetchone()[0]

        if null_count > 0:
            print(f"   [ERROR] ERROR: {null_count} rows have NULL temp_user_id!")
            print("   Rolling back migration...")
            conn.rollback()
            return False
        else:
            print(f"   [OK] All rows have valid user_id")

        # Step 5: Drop old foreign key constraint (if exists)
        print("\n5. Dropping old constraints...")
        # Check if FK exists
        cur.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'requested_sessions'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%requester_id%'
        """)
        fk_constraints = cur.fetchall()

        for fk in fk_constraints:
            print(f"   Dropping constraint: {fk[0]}")
            cur.execute(f"ALTER TABLE requested_sessions DROP CONSTRAINT IF EXISTS {fk[0]} CASCADE")

        conn.commit()
        print("   [OK] Old constraints dropped")

        # Step 6: Rename columns
        print("\n6. Renaming columns...")
        cur.execute("""
            ALTER TABLE requested_sessions
            RENAME COLUMN requester_id TO old_requester_profile_id
        """)
        print("   [OK] requester_id -> old_requester_profile_id")

        cur.execute("""
            ALTER TABLE requested_sessions
            RENAME COLUMN temp_user_id TO requester_id
        """)
        print("   [OK] temp_user_id -> requester_id")

        conn.commit()

        # Step 7: Add foreign key constraint
        print("\n7. Adding foreign key constraint to users table...")
        cur.execute("""
            ALTER TABLE requested_sessions
            ADD CONSTRAINT fk_requested_sessions_requester_user
            FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
        """)
        conn.commit()
        print("   [OK] Foreign key added: requester_id -> users.id")

        # Step 8: Make requester_id NOT NULL
        print("\n8. Setting requester_id as NOT NULL...")
        cur.execute("""
            ALTER TABLE requested_sessions
            ALTER COLUMN requester_id SET NOT NULL
        """)
        conn.commit()
        print("   [OK] requester_id is now NOT NULL")

        # Step 9: Show final data
        print("\n9. FINAL DATA (user-based requester_id):")
        cur.execute("""
            SELECT
                rs.id,
                rs.requester_id AS user_id,
                u.email,
                rs.requester_type,
                rs.old_requester_profile_id AS old_profile_id
            FROM requested_sessions rs
            JOIN users u ON rs.requester_id = u.id
            ORDER BY rs.id
        """)

        rows = cur.fetchall()
        print(f"   {'ID':<5} {'User ID':<10} {'Email':<35} {'Type':<10} {'Old Profile':<12}")
        print("   " + "-" * 80)
        for row in rows:
            print(f"   {row[0]:<5} {row[1]:<10} {row[2]:<35} {row[3]:<10} {row[4]:<12}")

        # Step 10: Optional - drop old column after verification
        print("\n10. Keeping old_requester_profile_id column for safety (can drop later)")
        print("    To drop: ALTER TABLE requested_sessions DROP COLUMN old_requester_profile_id;")

        print("\n" + "=" * 80)
        print("[OK] MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nCHANGES:")
        print("  - requester_id now points to users.id (user-based)")
        print("  - requester_type still indicates role ('student' or 'parent')")
        print("  - old_requester_profile_id preserved for rollback if needed")
        print("\nNEXT STEPS:")
        print("  1. Update session_request_endpoints.py")
        print("  2. Test API endpoints")
        print("  3. After verification, drop old_requester_profile_id column")

        return True

    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


def rollback():
    """Rollback migration if needed"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("\n" + "=" * 80)
        print("ROLLBACK MIGRATION")
        print("=" * 80)

        # Check if old column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            AND column_name = 'old_requester_profile_id'
        """)

        if not cur.fetchone():
            print("[ERROR] Cannot rollback - old_requester_profile_id column not found")
            return False

        print("\n1. Dropping new foreign key...")
        cur.execute("""
            ALTER TABLE requested_sessions
            DROP CONSTRAINT IF EXISTS fk_requested_sessions_requester_user CASCADE
        """)

        print("2. Renaming columns back...")
        cur.execute("""
            ALTER TABLE requested_sessions
            RENAME COLUMN requester_id TO temp_user_id
        """)

        cur.execute("""
            ALTER TABLE requested_sessions
            RENAME COLUMN old_requester_profile_id TO requester_id
        """)

        print("3. Dropping temp column...")
        cur.execute("""
            ALTER TABLE requested_sessions
            DROP COLUMN temp_user_id
        """)

        conn.commit()
        print("\n[OK] ROLLBACK COMPLETED")

        return True

    except Exception as e:
        print(f"\n[ERROR] ROLLBACK ERROR: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
