"""
Check the structure of schools tables in astegni_user_db
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def check_tables():
    print("Connecting to user database (astegni_user_db)...")
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    tables = ['requested_schools', 'schools', 'rejected_schools', 'suspended_schools']

    for table in tables:
        print(f"\n{'='*50}")
        print(f"TABLE: {table}")
        print('='*50)

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = %s
            )
        """, (table,))
        exists = cursor.fetchone()[0]

        if not exists:
            print(f"  Table does not exist!")
            continue

        # Get column info
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = %s
            ORDER BY ordinal_position
        """, (table,))

        columns = cursor.fetchall()
        print(f"\nColumns ({len(columns)}):")
        for col in columns:
            nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col[3]}" if col[3] else ""
            print(f"  - {col[0]}: {col[1]} {nullable}{default}")

        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"\nRow count: {count}")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    check_tables()
