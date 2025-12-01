"""Check information about session-related tables"""
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

tables = [
    'whiteboard_session_recordings',
    'tutor_schedules',
    'tutor_student_bookings',
    'tutor_student_enrollments'
]

print("\n" + "="*80)
print("TABLE INFORMATION CHECK")
print("="*80)

for table in tables:
    print(f"\n### {table.upper()} ###")

    # Check if table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = %s
        )
    """, (table,))

    exists = cur.fetchone()[0]

    if exists:
        print(f"Status: EXISTS")

        # Count rows
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        print(f"Rows: {count}")

        # Get columns
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
        """, (table,))

        columns = cur.fetchall()
        print(f"Columns ({len(columns)}):")
        for col in columns[:10]:  # Show first 10 columns
            print(f"  - {col[0]}: {col[1]}")
        if len(columns) > 10:
            print(f"  ... and {len(columns) - 10} more")

    else:
        print(f"Status: DOES NOT EXIST")

print("\n" + "="*80)

cur.close()
conn.close()
