"""Check what format permissions is in"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("SELECT permissions FROM admin_profile WHERE admin_id = 1")
perms = cur.fetchone()[0]

print(f"Permissions type: {type(perms)}")
print(f"Permissions value: {perms}")
print(f"Permissions repr: {repr(perms)}")

cur.close()
conn.close()
