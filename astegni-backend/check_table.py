import psycopg

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()

cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'tutor_students'
    ORDER BY ordinal_position;
""")

print('Current tutor_students columns:')
print('=' * 50)
for row in cur.fetchall():
    print(f'{row[0]:25} {row[1]}')

cur.close()
conn.close()
