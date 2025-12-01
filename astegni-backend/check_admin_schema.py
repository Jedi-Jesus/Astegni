import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'admin_profile'
        ORDER BY ordinal_position
    """))

    print("\nAdmin Profile Table Columns:")
    print("-" * 60)
    for row in result:
        print(f"{row[0]:<30} {row[1]}")
    print("-" * 60)
