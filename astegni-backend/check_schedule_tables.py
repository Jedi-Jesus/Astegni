"""
Check all schedule-related tables in database
"""
import psycopg

conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()

# Get all tables with 'schedule' in name
cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE '%schedule%'
    ORDER BY table_name
""")
tables = cur.fetchall()

print('Tables with "schedule" in name:')
print('=' * 60)

if not tables:
    print('No tables found with "schedule" in name')
else:
    for (table,) in tables:
        # Get row count
        cur.execute(f'SELECT COUNT(*) FROM {table}')
        count = cur.fetchone()[0]

        # Get column count
        cur.execute(f"""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = '{table}'
        """)
        col_count = cur.fetchone()[0]

        print(f'\n{table}')
        print(f'  Rows: {count}')
        print(f'  Columns: {col_count}')

conn.close()
