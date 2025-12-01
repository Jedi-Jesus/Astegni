"""Check table structures"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
if database_url.startswith('postgresql://'):
    database_url = database_url.replace('postgresql://', '')

auth, host_db = database_url.split('@')
user, password = auth.split(':')
host_port, db_part = host_db.split('/')
db_name = db_part.split('?')[0]
host, port = host_port.split(':') if ':' in host_port else (host_port, '5432')

conn = psycopg.connect(dbname=db_name, user=user, password=password, host=host, port=port)
cursor = conn.cursor()

tables = ['course_requests', 'rejected_courses', 'suspended_courses']

for table in tables:
    cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position")
    cols = [r[0] for r in cursor.fetchall()]
    print(f"{table}: {cols}")

cursor.close()
conn.close()
