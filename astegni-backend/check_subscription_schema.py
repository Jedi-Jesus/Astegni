import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

conn = psycopg.connect(DATABASE_URL)
cursor = conn.cursor()

# Check subscription_tiers schema
cursor.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'subscription_tiers'
    ORDER BY ordinal_position
""")
print("Subscription Tiers Schema:")
print("-" * 50)
for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]}")

cursor.close()
conn.close()
