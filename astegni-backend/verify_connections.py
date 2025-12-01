import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

cursor.execute('SELECT id, requested_by, recipient_id, status FROM connections ORDER BY id')

print('\nCurrent Connections:')
print('ID  | Requested By | Recipient | Status')
print('-' * 50)
for row in cursor.fetchall():
    print(f'{row[0]:<3} | {row[1]:<12} | {row[2]:<9} | {row[3]}')

cursor.close()
conn.close()
