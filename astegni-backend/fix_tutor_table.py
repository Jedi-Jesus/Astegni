from app import engine, Base
from sqlalchemy import text

# First, drop the existing table
print("Dropping existing tutor_profiles table...")
with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS tutor_profiles CASCADE"))
    conn.commit()

# Now recreate it with the correct schema
from tutor_models import TutorProfile

print("Creating new tutor_profiles table...")
Base.metadata.create_all(bind=engine, tables=[TutorProfile.__table__])
print("Table recreated successfully!")