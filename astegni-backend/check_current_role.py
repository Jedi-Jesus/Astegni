"""
Quick script to check current active_role in database
"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("=" * 60)
print("CHECKING DATABASE - USER ID 1")
print("=" * 60)

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, email, active_role, roles FROM users WHERE id = 1"))
    row = result.fetchone()

    if row:
        print(f"User ID: {row[0]}")
        print(f"Email: {row[1]}")
        print(f"active_role: {row[2]}")
        print(f"roles: {row[3]}")
    else:
        print("User not found!")

print("=" * 60)
