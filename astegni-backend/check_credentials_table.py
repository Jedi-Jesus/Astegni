"""Check if credentials table exists and show its structure"""
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
cur = conn.cursor()

# Check if credentials table exists
cur.execute("""
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'credentials'
    )
""")
exists = cur.fetchone()['exists']
print(f"credentials table exists: {exists}")

if exists:
    # Count records
    cur.execute("SELECT COUNT(*) as count FROM credentials")
    count = cur.fetchone()['count']
    print(f"Total records: {count}")

    # Show by type
    cur.execute("""
        SELECT document_type, COUNT(*) as count
        FROM credentials
        GROUP BY document_type
    """)
    types = cur.fetchall()
    print("By type:")
    for t in types:
        print(f"  - {t['document_type']}: {t['count']}")

cur.close()
conn.close()
