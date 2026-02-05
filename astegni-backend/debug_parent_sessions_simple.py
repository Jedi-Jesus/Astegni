"""
Simple debug script - no emojis
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    return psycopg.connect(database_url)

conn = get_db_connection()
cur = conn.cursor()

print("="*80)
print("KUSHSTUDIOS16 PARENT SESSIONS INVESTIGATION")
print("="*80)

# Get user
cur.execute("SELECT id, first_name, email FROM users WHERE email = 'kushstudios16@gmail.com'")
user = cur.fetchone()
user_id = user[0]
print(f"\nUser ID: {user_id}")
print(f"Name: {user[1]}")

# Get parent profile
cur.execute("SELECT id, children_ids FROM parent_profiles WHERE user_id = %s", (user_id,))
parent = cur.fetchone()
print(f"\nParent Profile ID: {parent[0]}")
print(f"Children IDs: {parent[1]}")

# Get student profile for this user
cur.execute("SELECT id, username FROM student_profiles WHERE user_id = %s", (user_id,))
student = cur.fetchone()
if student:
    print(f"\nUser's Student Profile ID: {student[0]}")
    print(f"Student Username: {student[1]}")

# Check if user's student profile is in their own children list
if student and parent[1] and student[0] in parent[1]:
    print("\n" + "!"*80)
    print("ROOT CAUSE FOUND!")
    print("!"*80)
    print(f"User's own student_profile_id ({student[0]}) is in their parent.children_ids!")
    print("This means they're seeing their OWN student sessions in the parent view!")
    print("\nFIX:")
    print(f"UPDATE parent_profiles SET children_ids = array_remove(children_ids, {student[0]}) WHERE user_id = {user_id};")
else:
    print("\nNo issue found - checking children details...")
    if parent[1]:
        cur.execute("""
            SELECT sp.id, u.first_name, u.email
            FROM student_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.id = ANY(%s)
        """, (parent[1],))
        children = cur.fetchall()
        print(f"\nFound {len(children)} children:")
        for child in children:
            print(f"  - Student Profile ID {child[0]}: {child[1]} ({child[2]})")

conn.close()
