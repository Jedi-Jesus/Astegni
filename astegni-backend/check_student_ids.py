import psycopg

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()

# Check which students have reviews
cur.execute("""
    SELECT sr.student_id, u.email, u.username, COUNT(*) as review_count
    FROM student_reviews sr
    JOIN users u ON sr.student_id = u.id
    GROUP BY sr.student_id, u.email, u.username
    ORDER BY review_count DESC
""")

print('[SUCCESS] Students with reviews:')
for row in cur.fetchall():
    print(f'  Student ID {row[0]} ({row[1] or row[2]}): {row[3]} reviews')

conn.close()
