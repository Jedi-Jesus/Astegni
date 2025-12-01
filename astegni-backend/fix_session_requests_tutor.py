"""
Fix session requests to be assigned to user 115 instead of user 1
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

print("Updating session requests to be for tutor user_id 115...")

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

try:
    # Update all session requests from tutor_id 1 to tutor_id 115
    cur.execute("""
        UPDATE session_requests
        SET tutor_id = 115
        WHERE tutor_id = 1
        RETURNING id, status, student_name
    """)

    rows = cur.fetchall()
    conn.commit()

    print(f"\nUpdated {len(rows)} session requests:")
    print("ID | Status   | Student Name")
    print("-" * 50)
    for row in rows:
        print(f"{row[0]:2} | {row[1]:8} | {row[2]}")

    # Verify the update
    print("\n\nVerification - Current session requests for user 115:")
    cur.execute("""
        SELECT id, status, student_name
        FROM session_requests
        WHERE tutor_id = 115
        ORDER BY id
    """)

    rows = cur.fetchall()
    print(f"Total: {len(rows)} requests")
    print("ID | Status   | Student Name")
    print("-" * 50)
    for row in rows:
        print(f"{row[0]:2} | {row[1]:8} | {row[2]}")

    # Count by status
    cur.execute("""
        SELECT status, COUNT(*)
        FROM session_requests
        WHERE tutor_id = 115
        GROUP BY status
    """)

    print("\n\nBreakdown by status:")
    for row in cur.fetchall():
        print(f"  - {row[0]}: {row[1]} requests")

    print("\nSUCCESS! Session requests now belong to user 115")
    print("\nYou can now:")
    print("1. Refresh the browser")
    print("2. Go to 'Requested Sessions' panel")
    print("3. See 4 pending requests")
    print("4. Go to 'My Students' panel")
    print("5. See 2 accepted students")

except Exception as e:
    conn.rollback()
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    cur.close()
    conn.close()
