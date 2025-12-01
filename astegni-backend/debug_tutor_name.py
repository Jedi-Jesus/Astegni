"""
Debug script to check tutor name fields in database
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("=" * 80)
print("CHECKING TUTOR NAME FIELDS IN DATABASE")
print("=" * 80)

# Get all users with tutor role
query = text("""
    SELECT
        u.id,
        u.username,
        u.first_name,
        u.father_name,
        u.grandfather_name,
        u.roles,
        tp.username as tutor_username
    FROM users u
    LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
    WHERE u.roles::text LIKE '%tutor%'
    ORDER BY u.id
    LIMIT 10
""")

result = db.execute(query)

print(f"\n{'ID':<6} {'Username':<20} {'First Name':<15} {'Father Name':<15} {'Grandfather':<15} {'Tutor Username':<20}")
print("-" * 120)

for row in result:
    user_id = row[0]
    username = row[1] or "NULL"
    first_name = row[2] or "NULL"
    father_name = row[3] or "NULL"
    grandfather_name = row[4] or "NULL"
    tutor_username = row[6] or "NULL"

    print(f"{user_id:<6} {username:<20} {first_name:<15} {father_name:<15} {grandfather_name:<15} {tutor_username:<20}")

    # Show what data.name would be
    name_parts = [first_name, father_name, grandfather_name]
    full_name = " ".join([n for n in name_parts if n and n != "NULL"])
    print(f"       → data.name would be: '{full_name}'")
    print(f"       → data.username would be: '{username}'")
    print()

db.close()

print("\n" + "=" * 80)
print("DIAGNOSIS:")
print("=" * 80)
print("1. Check if father_name and grandfather_name columns have data")
print("2. If they show 'NULL', the issue is empty database fields")
print("3. If they have data, check the JavaScript is using data.name correctly")
print("=" * 80)
