"""Check enrolled_courses table structure"""
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

cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'enrolled_courses' ORDER BY ordinal_position")
print('Current enrolled_courses table structure:')
for row in cursor.fetchall():
    print(f'  {row[0]}: {row[1]}')

cursor.close()
conn.close()
