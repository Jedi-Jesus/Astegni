"""
Check admin_profile table data
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

# Get all admin profile records
cur.execute("""
    SELECT id, admin_id, first_name, father_name, grandfather_name,
           admin_username, phone_number, email, department
    FROM admin_profile
    ORDER BY id
""")

records = cur.fetchall()

print('Admin Profile Records:')
print('=' * 120)

if records:
    for row in records:
        print(f"\nID: {row[0]} | Admin ID: {row[1]}")
        print(f"  Name: {row[2]} {row[3]} {row[4]}")
        print(f"  Username: {row[5]}")
        print(f"  Phone: {row[6]}")
        print(f"  Email: {row[7]}")
        print(f"  Department: {row[8]}")
        print('-' * 120)
else:
    print("No records found in admin_profile table.")

print(f"\nTotal records: {len(records)}")

cur.close()
conn.close()
