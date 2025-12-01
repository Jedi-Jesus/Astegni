import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
engine = create_engine(DATABASE_URL)

print("Creating parent_profiles table...")
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS parent_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            username VARCHAR UNIQUE,
            bio TEXT,
            quote TEXT,
            relationship_type VARCHAR DEFAULT 'Parent',
            location VARCHAR,
            education_focus VARCHAR,
            total_children INTEGER DEFAULT 0,
            active_children INTEGER DEFAULT 0,
            total_sessions_booked INTEGER DEFAULT 0,
            total_amount_spent FLOAT DEFAULT 0.0,
            currency VARCHAR DEFAULT 'ETB',
            rating FLOAT DEFAULT 0.0,
            rating_count INTEGER DEFAULT 0,
            is_verified BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            profile_complete BOOLEAN DEFAULT FALSE,
            profile_completion FLOAT DEFAULT 0.0,
            profile_picture VARCHAR,
            cover_image VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    conn.commit()
    print("  parent_profiles table created")

print("Creating child_profiles table...")
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS child_profiles (
            id SERIAL PRIMARY KEY,
            parent_id INTEGER NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            date_of_birth DATE,
            gender VARCHAR,
            grade INTEGER,
            school_name VARCHAR,
            courses JSON DEFAULT '[]',
            progress FLOAT DEFAULT 0.0,
            current_tutor_id INTEGER REFERENCES tutor_profiles(id),
            next_session TIMESTAMP,
            total_sessions INTEGER DEFAULT 0,
            completed_sessions INTEGER DEFAULT 0,
            total_hours FLOAT DEFAULT 0.0,
            attendance_rate FLOAT DEFAULT 0.0,
            profile_picture VARCHAR,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    conn.commit()
    print("  child_profiles table created")

print("\nMigration completed successfully!")
print("Tables created: parent_profiles, child_profiles")
