"""
Verify tutor_teaching_schedules table exists and show structure
"""
import psycopg

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()

# Check row count
cur.execute("SELECT COUNT(*) FROM tutor_teaching_schedules")
count = cur.fetchone()[0]

# Get table structure
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'tutor_teaching_schedules'
    ORDER BY ordinal_position
""")
columns = cur.fetchall()

print(f'[OK] Table exists! Row count: {count}')
print(f'\nTable structure ({len(columns)} columns):')
for col, dtype in columns:
    print(f'  - {col}: {dtype}')

conn.close()
