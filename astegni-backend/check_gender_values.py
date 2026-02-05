from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    # Check gender values in users table
    result = conn.execute(text("""
        SELECT DISTINCT u.gender, COUNT(*) as count
        FROM users u
        JOIN tutor_profiles tp ON tp.user_id = u.id
        WHERE tp.is_active = true
        AND u.is_verified = true
        AND u.is_active = true
        GROUP BY u.gender
        ORDER BY u.gender
    """))

    print("\nGender values in database (for active tutors):")
    print("-" * 50)
    for row in result.fetchall():
        gender = row[0] if row[0] else "(NULL)"
        count = row[1]
        print(f"  '{gender}': {count} tutors")

    print("\n" + "=" * 50)
    print("\nFilter expects: 'Male' or 'Female'")
    print("Make sure database values match exactly (case-sensitive)")
