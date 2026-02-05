"""
Test script to verify the years column exists in credentials table
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Check if years column exists
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'credentials' AND column_name = 'years'
    """)

    result = cur.fetchone()

    if result:
        print("[OK] Years column exists in credentials table")
        print(f"  Column Name: {result[0]}")
        print(f"  Data Type: {result[1]}")
        print(f"  Nullable: {result[2]}")
    else:
        print("[ERROR] Years column does not exist in credentials table")

    cur.close()
    conn.close()

except Exception as e:
    print(f"Error: {str(e)}")
