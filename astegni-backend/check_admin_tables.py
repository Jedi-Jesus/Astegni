"""
Check admin database tables and structure
"""
import sys
import os
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

ADMIN_DB_URL = os.getenv('ADMIN_DATABASE_URL')
if ADMIN_DB_URL.startswith('postgresql://'):
    ADMIN_DB_URL = ADMIN_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

engine = create_engine(ADMIN_DB_URL)
inspector = inspect(engine)

print("\nAdmin Database Tables:")
print("=" * 60)

tables = inspector.get_table_names()
for table in sorted(tables):
    print(f"\n{table}:")
    columns = inspector.get_columns(table)
    for col in columns:
        print(f"  - {col['name']}: {col['type']}")
