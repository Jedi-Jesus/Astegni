"""List users in database for testing"""
import sys
import os

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT id, first_name, father_name, email, roles, is_active
        FROM users
        WHERE id = 115 OR email LIKE '%jediael%'
        LIMIT 10
    """))

    users = result.fetchall()

    print("Users in database:")
    for user in users:
        print(f"  ID: {user[0]}, Name: {user[1]} {user[2]}, Email: {user[3]}, Roles: {user[4]}, Active: {user[5]}")
