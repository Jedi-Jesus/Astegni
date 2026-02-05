from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    # Check user_investments columns
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_investments'
        AND (column_name LIKE '%student%' OR column_name LIKE '%enrolled%')
        ORDER BY column_name
    """))

    print("Student-related columns in user_investments:")
    for row in result.fetchall():
        print(f"  - {row[0]}")

    # Check if we have both columns
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_investments'
        AND column_name IN ('student_payment_id', 'enrolled_student_id')
    """))

    cols = [row[0] for row in result.fetchall()]
    print(f"\nFound columns: {cols}")

    if 'student_payment_id' in cols and 'enrolled_student_id' in cols:
        print("\n⚠️ WARNING: Both student_payment_id AND enrolled_student_id exist!")
        print("We should keep only ONE column to reference enrolled_students")
