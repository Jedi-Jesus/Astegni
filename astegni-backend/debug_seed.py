import psycopg
import json
import bcrypt
from dotenv import load_dotenv
import os

load_dotenv('main.env')

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "astegni_db")
DB_USER = os.getenv("DB_USER", "astegni_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Astegni2025")

conn_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"
conn = psycopg.connect(conn_string)
cursor = conn.cursor()

print("Checking existing data...")

# Check users with tutor role
cursor.execute("SELECT id, email FROM users WHERE email LIKE '%tutor@example.com'")
tutor_users = cursor.fetchall()
print(f"Found {len(tutor_users)} tutor users:")
for user in tutor_users:
    print(f"  ID: {user[0]}, Email: {user[1]}")

# Check tutor profiles
cursor.execute("SELECT id, user_id FROM tutor_profiles")
profiles = cursor.fetchall()
print(f"\nFound {len(profiles)} tutor profiles:")
for profile in profiles:
    print(f"  Profile ID: {profile[0]}, User ID: {profile[1]}")

cursor.close()
conn.close()