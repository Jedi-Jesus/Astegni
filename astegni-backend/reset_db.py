"""
Direct database reset without importing conflicting models
"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def reset_database_direct():
    """Reset database using direct SQL commands"""
    
    # Get database connection details
    database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
    
    # Parse connection string
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")
    
    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_name = host_db.split("/")
    
    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"
    
    print(f"🔄 Connecting to {host}:{port}/{db_name}")
    
    conn = psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )
    cursor = conn.cursor()
    
    print("🗑️  Dropping all existing tables...")
    
    # Get all table names
    cursor.execute("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
    """)
    tables = cursor.fetchall()
    
    # Drop all tables
    for table in tables:
        table_name = table[0]
        print(f"  Dropping {table_name}...")
        cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE")
    
    conn.commit()
    print("✅ All tables dropped")
    
    print("\n📦 Creating tables from scratch...")
    
    # Create tables with correct schema
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        phone VARCHAR,
        password_hash VARCHAR NOT NULL,
        roles JSON DEFAULT '["user"]',
        active_role VARCHAR DEFAULT 'user',
        profile_picture VARCHAR,
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tutor_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        bio TEXT,
        quote TEXT,
        gender VARCHAR,
        courses JSON DEFAULT '[]',
        grades JSON DEFAULT '[]',
        subjects_expertise JSON DEFAULT '[]',
        course_type VARCHAR,
        location VARCHAR,
        teaches_at VARCHAR,
        learning_method VARCHAR,
        teaching_methods JSON DEFAULT '[]',
        experience INTEGER DEFAULT 0,
        education_level VARCHAR,
        certifications JSON DEFAULT '[]',
        achievements JSON DEFAULT '[]',
        price FLOAT DEFAULT 0.0,
        currency VARCHAR DEFAULT 'ETB',
        availability JSON DEFAULT '{}',
        rating FLOAT DEFAULT 0.0,
        rating_count INTEGER DEFAULT 0,
        rating_breakdown JSON DEFAULT '{"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}',
        total_students INTEGER DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        profile_complete BOOLEAN DEFAULT FALSE,
        profile_completion FLOAT DEFAULT 0.0,
        cover_image VARCHAR,
        intro_video_url VARCHAR,
        portfolio_urls JSON DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        date_of_birth DATE,
        gender VARCHAR,
        grade_level VARCHAR,
        school_name VARCHAR,
        school_address VARCHAR,
        subjects JSON DEFAULT '[]',
        weak_subjects JSON DEFAULT '[]',
        strong_subjects JSON DEFAULT '[]',
        interests JSON DEFAULT '[]',
        learning_style VARCHAR,
        preferred_session_time VARCHAR,
        preferred_learning_mode VARCHAR DEFAULT 'online',
        academic_goals TEXT,
        career_aspirations TEXT,
        current_gpa FLOAT,
        target_gpa FLOAT,
        guardian_name VARCHAR,
        guardian_phone VARCHAR,
        guardian_email VARCHAR,
        guardian_relationship VARCHAR,
        total_sessions INTEGER DEFAULT 0,
        total_hours FLOAT DEFAULT 0.0,
        courses_enrolled INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        profile_complete BOOLEAN DEFAULT FALSE,
        profile_completion FLOAT DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tutor_student_enrollments (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER REFERENCES tutor_profiles(id),
        student_id INTEGER REFERENCES student_profiles(id),
        subjects JSON DEFAULT '[]',
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        session_frequency VARCHAR,
        session_duration INTEGER DEFAULT 60,
        total_sessions_planned INTEGER,
        sessions_completed INTEGER DEFAULT 0,
        hourly_rate FLOAT,
        payment_status VARCHAR DEFAULT 'pending',
        total_paid FLOAT DEFAULT 0.0,
        status VARCHAR DEFAULT 'active',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tutoring_sessions (
        id SERIAL PRIMARY KEY,
        enrollment_id INTEGER REFERENCES tutor_student_enrollments(id),
        tutor_id INTEGER REFERENCES tutor_profiles(id),
        student_id INTEGER REFERENCES student_profiles(id),
        subject VARCHAR NOT NULL,
        topic VARCHAR,
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        duration INTEGER DEFAULT 60,
        mode VARCHAR DEFAULT 'online',
        location VARCHAR,
        meeting_link VARCHAR,
        objectives TEXT,
        topics_covered JSON DEFAULT '[]',
        materials_used JSON DEFAULT '[]',
        homework_assigned TEXT,
        status VARCHAR DEFAULT 'scheduled',
        student_attended BOOLEAN,
        tutor_attended BOOLEAN,
        tutor_notes TEXT,
        student_feedback TEXT,
        student_rating FLOAT,
        amount FLOAT,
        payment_status VARCHAR DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS video_reels (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER REFERENCES tutor_profiles(id),
        title VARCHAR NOT NULL,
        description TEXT,
        video_url VARCHAR NOT NULL,
        thumbnail_url VARCHAR,
        duration VARCHAR,
        category VARCHAR,
        subject VARCHAR,
        grade_level VARCHAR,
        tags JSON DEFAULT '[]',
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS video_engagements (
        id SERIAL PRIMARY KEY,
        video_id INTEGER REFERENCES video_reels(id),
        user_id INTEGER REFERENCES users(id),
        engagement_type VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS video_comments (
        id SERIAL PRIMARY KEY,
        video_id INTEGER REFERENCES video_reels(id),
        user_id INTEGER REFERENCES users(id),
        parent_comment_id INTEGER REFERENCES video_comments(id),
        text TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tutor_follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id),
        tutor_id INTEGER REFERENCES tutor_profiles(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS favorite_tutors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        tutor_id INTEGER REFERENCES tutor_profiles(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    print("✅ Tables created successfully")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    print("⚠️  WARNING: This will DELETE ALL DATA in the database!")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() == "yes":
        reset_database_direct()
        print("\n✨ Database reset complete!")
        print("\nNow run: python init_db.py")
        print("Then restart server: uvicorn app:app --reload")
    else:
        print("Cancelled.")