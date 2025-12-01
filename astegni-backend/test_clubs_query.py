import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cursor = conn.cursor()

# Test the fixed clubs query
query = """
    SELECT
        c.id, c.title, c.category, c.created_by, c.creator_type,
        CASE
            WHEN cm.user_id IS NOT NULL THEN true
            ELSE false
        END as is_member
    FROM clubs c
    LEFT JOIN club_members cm ON c.id = cm.club_id AND cm.user_id = 28
    WHERE (c.created_by = 28 AND c.creator_type = 'student')
       OR cm.user_id = 28
    GROUP BY c.id, c.title, c.category, c.created_by, c.creator_type, cm.user_id, c.created_at
    ORDER BY c.created_at DESC
"""

try:
    cursor.execute(query)
    rows = cursor.fetchall()
    print(f'Found {len(rows)} clubs for student_id 28:')
    for row in rows:
        print(f'  - ID: {row[0]}, Title: {row[1]}, Category: {row[2]}, Is Member: {row[5]}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
finally:
    cursor.close()
    conn.close()
