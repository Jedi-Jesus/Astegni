import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

conn = psycopg.connect(DATABASE_URL)
cursor = conn.cursor()

cursor.execute("SELECT id, name, days, price, label, is_base, features FROM campaign_packages ORDER BY display_order LIMIT 3")
print("Sample Campaign Packages:")
print("-" * 80)
for row in cursor.fetchall():
    print(f"ID: {row[0]}, Name: {row[1]}, Days: {row[2]}, Price: {row[3]}, Label: {row[4]}, IsBase: {row[5]}")
    print(f"  Features: {row[6]}")

cursor.close()
conn.close()
