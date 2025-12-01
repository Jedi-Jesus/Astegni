import psycopg

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()

# Check total reviews
cur.execute('SELECT COUNT(*) FROM student_reviews')
total = cur.fetchone()[0]
print(f'[SUCCESS] Total reviews in database: {total}')

# Check by role
cur.execute('SELECT reviewer_role, COUNT(*) FROM student_reviews GROUP BY reviewer_role')
print('\nReviews by role:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]} reviews')

# Check sample review data
cur.execute("""
    SELECT sr.id, sr.review_title, sr.review_type, sr.overall_rating,
           u.email as reviewer_email, sr.reviewer_role
    FROM student_reviews sr
    JOIN users u ON sr.reviewer_id = u.id
    LIMIT 3
""")
print('\nSample reviews:')
for row in cur.fetchall():
    print(f'  ID {row[0]}: "{row[1]}" - {row[2]} ({row[3]} stars) from {row[5]} ({row[4]})')

conn.close()
print('\n[SUCCESS] Database check complete!')
