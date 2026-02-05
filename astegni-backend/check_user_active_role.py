"""
Quick script to check the actual active_role value in the database
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

# Connect to database
conn = psycopg.connect(DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://').replace('postgresql://', 'postgresql://'))
cur = conn.cursor()

print("=" * 80)
print("CHECKING USER ACTIVE_ROLE IN DATABASE")
print("=" * 80)

# Get user 1's data
cur.execute("""
    SELECT id, email, active_role, roles
    FROM users
    WHERE id = 1
""")

result = cur.fetchone()

if result:
    user_id, email, active_role, roles = result
    print(f"\nUser ID: {user_id}")
    print(f"Email: {email}")
    print(f"Active Role: {active_role}")
    print(f"All Roles: {roles}")
    print("\n" + "=" * 80)

    if active_role:
        print(f"✅ Database shows active_role = '{active_role}'")
    else:
        print(f"⚠️ Database shows active_role = NULL or empty")
else:
    print("❌ User not found")

cur.close()
conn.close()
