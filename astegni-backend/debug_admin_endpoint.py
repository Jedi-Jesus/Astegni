"""
Debug admin endpoint issues
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"
)

# Convert for psycopg3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_query():
    """Test the query that's failing in the endpoint"""
    db = SessionLocal()

    try:
        # Try to execute the query that's failing
        result = db.execute(text("""
            SELECT tp.*, u.first_name, u.father_name, u.email, u.phone
            FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.verification_status = 'pending'
            ORDER BY tp.created_at DESC
            LIMIT 5
        """)).fetchall()

        print(f"Found {len(result)} pending tutors")
        for row in result:
            print(f"  - Tutor ID: {row.id}, User ID: {row.user_id}")

    except Exception as e:
        print(f"Error executing query: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_query()