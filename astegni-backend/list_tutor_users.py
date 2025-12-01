"""List tutor users from database"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Get tutor users
cur.execute("""
    SELECT id, username, email, phone, roles, active_role, password_hash
    FROM users
    WHERE roles::jsonb ? 'tutor'
    LIMIT 10
""")

rows = cur.fetchall()

print("=" * 80)
print("TUTOR USERS IN DATABASE:")
print("=" * 80)

for r in rows:
    print(f"\nID: {r[0]}")
    print(f"  Username: {r[1]}")
    print(f"  Email: {r[2]}")
    print(f"  Phone: {r[3]}")
    print(f"  Roles: {r[4]}")
    print(f"  Active Role: {r[5]}")
    print(f"  Has Password: {'Yes' if r[6] else 'No'}")

conn.close()

print("\n" + "=" * 80)
print("To login, use one of these usernames or emails with the correct password")
print("=" * 80)
