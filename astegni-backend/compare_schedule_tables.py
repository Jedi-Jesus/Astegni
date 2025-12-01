"""
Compare the two schedule tables
"""
import psycopg

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()

print('=' * 70)
print('COMPARING SCHEDULE TABLES')
print('=' * 70)

# Get structure of tutor_schedules
print('\n1. tutor_schedules (603 rows)')
print('-' * 70)
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'tutor_schedules'
    ORDER BY ordinal_position
""")
cols1 = cur.fetchall()
for col, dtype in cols1:
    print(f'  {col}: {dtype}')

# Get structure of tutor_teaching_schedules
print('\n2. tutor_teaching_schedules (0 rows)')
print('-' * 70)
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'tutor_teaching_schedules'
    ORDER BY ordinal_position
""")
cols2 = cur.fetchall()
for col, dtype in cols2:
    print(f'  {col}: {dtype}')

# Show sample data from tutor_schedules
print('\n3. Sample data from tutor_schedules (first 3 rows)')
print('-' * 70)
cur.execute('SELECT * FROM tutor_schedules LIMIT 3')
rows = cur.fetchall()

if rows:
    # Get column names
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tutor_schedules'
        ORDER BY ordinal_position
    """)
    columns = [col[0] for col in cur.fetchall()]

    for i, row in enumerate(rows, 1):
        print(f'\nRow {i}:')
        for col_name, value in zip(columns, row):
            if value is not None:
                print(f'  {col_name}: {value}')

conn.close()
