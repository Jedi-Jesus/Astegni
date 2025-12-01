import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Update the departments to use the correct format
    result = conn.execute(text("""
        UPDATE admin_profile
        SET departments = ARRAY['manage-system-settings']::varchar[]
        WHERE email = 'admin@astegni.com'
        RETURNING id, email, departments
    """))

    conn.commit()

    row = result.fetchone()
    if row:
        print("SUCCESS: Admin department updated!")
        print(f"ID: {row[0]}")
        print(f"Email: {row[1]}")
        print(f"Departments: {row[2]}")
    else:
        print("ERROR: Admin not found")
