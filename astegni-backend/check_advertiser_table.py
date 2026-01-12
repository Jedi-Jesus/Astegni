import psycopg2

conn = psycopg2.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')
cur = conn.cursor()
cur.execute("""SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'advertiser_profiles' ORDER BY ordinal_position""")
print("=== advertiser_profiles table columns ===")
for row in cur.fetchall():
    print(f'{row[0]}: {row[1]}')
conn.close()
