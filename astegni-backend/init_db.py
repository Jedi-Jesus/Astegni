"""
Fixed Database Initialization Script for Astegni Platform
Handles JSON columns properly and fixes table creation issues
"""

import os
import sys
from datetime import datetime, date, timedelta, timezone
import random
import json
from dotenv import load_dotenv
import psycopg
import bcrypt

# Load environment variables
load_dotenv()

def test_connection():
    """Test database connection"""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
        
        # Parse connection string
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")
        
        # Extract components
        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_name = host_db.split("/")
        
        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"
        
        print(f"🔄 Testing connection to {host}:{port}/{db_name}")
        
        # Test connection
        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Connected to PostgreSQL: {version[0][:50]}...")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def create_database():
    """Create database if it doesn't exist (optional - requires postgres user)"""
    try:
        # This is optional since you already have the database
        print("ℹ️  Database 'astegni_db' already exists (skipping creation)")
        return True
    except Exception as e:
        print(f"⚠️  Database setup note: {e}")
        return False

def seed_initial_data():
    """Seed initial data into the database"""
    try:
        # Get database URL
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
        
        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )
        cursor = conn.cursor()
        
        print("\n🌱 Seeding initial data...")
        
        # Seed admin user
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = 'admin@astegni.com'")
        admin_exists = cursor.fetchone()[0]
        
        if not admin_exists:
            print("  Creating admin user...")
            admin_password = bcrypt.hashpw("Admin@2025".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cursor.execute("""
                INSERT INTO users (first_name, last_name, email, phone, password_hash, roles, active_role, is_active, email_verified, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                "Admin", "User", "admin@astegni.com", "+251911111111",
                admin_password, json.dumps(["admin", "tutor", "student"]), "admin",
                True, True, datetime.now(timezone.utc)
            ))
            admin_id = cursor.fetchone()[0]
            print(f"  ✅ Admin user created (ID: {admin_id})")
        else:
            print("  ℹ️  Admin user already exists")
        
        # Seed sample tutors - Fixed query for JSON column
        cursor.execute("SELECT COUNT(*) FROM users WHERE roles::jsonb ? 'tutor'")
        tutor_count = cursor.fetchone()[0]
        
        if tutor_count < 5:
            print("  Creating sample tutors...")
            
            tutor_data = [
                ("Abebe", "Kebede", "abebe@example.com", "+251922222222", ["Mathematics", "Physics"], ["Grade 11", "Grade 12"]),
                ("Sara", "Tadesse", "sara@example.com", "+251933333333", ["English", "Biology"], ["Grade 9", "Grade 10"]),
                ("Daniel", "Bekele", "daniel@example.com", "+251944444444", ["Chemistry", "Mathematics"], ["Grade 10", "Grade 11"]),
                ("Marta", "Alemu", "marta@example.com", "+251955555555", ["History", "Geography"], ["Grade 7", "Grade 8"]),
                ("Yohannes", "Haile", "yohannes@example.com", "+251966666666", ["Computer Science", "Mathematics"], ["Grade 11", "Grade 12"])
            ]
            
            for first_name, last_name, email, phone, courses, grades in tutor_data:
                # Check if tutor exists
                cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
                existing = cursor.fetchone()
                
                if not existing:
                    # Create user
                    password_hash = bcrypt.hashpw("Tutor@2025".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    
                    cursor.execute("""
                        INSERT INTO users (first_name, last_name, email, phone, password_hash, roles, active_role, is_active, email_verified, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        first_name, last_name, email, phone,
                        password_hash, json.dumps(["tutor"]), "tutor",
                        True, True, datetime.now(timezone.utc)
                    ))
                    user_id = cursor.fetchone()[0]
                    
                    # Create tutor profile
                    cursor.execute("""
                        INSERT INTO tutor_profiles (
                            user_id, bio, courses, grades, location, experience, 
                            price, rating, rating_count, is_verified, is_active, 
                            profile_complete, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        user_id,
                        f"Experienced {courses[0]} tutor with {random.randint(3, 10)} years of teaching experience.",
                        json.dumps(courses),
                        json.dumps(grades),
                        "Addis Ababa",
                        random.randint(3, 10),
                        random.randint(200, 500),
                        round(random.uniform(4.0, 5.0), 1),
                        random.randint(10, 100),
                        True,
                        True,
                        True,
                        datetime.now(timezone.utc)
                    ))
                    
                    print(f"    ✅ Created tutor: {first_name} {last_name}")
                else:
                    print(f"  ℹ️  Found {tutor_count} tutors (skipping creation)")
        
                # Seed sample students - Fixed query for JSON column
                
                cursor.execute("SELECT COUNT(*) FROM users WHERE roles::jsonb ? 'student'")
                student_count = cursor.fetchone()[0]
        
            if student_count < 5:
                print("  Creating sample students...")
            
                student_data = [
                    ("Tigist", "Mengistu", "tigist@example.com", "+251977777777", "Grade 10"),
                    ("Dawit", "Solomon", "dawit@example.com", "+251988888888", "Grade 11"),
                    ("Helen", "Tesfaye", "helen@example.com", "+251999999999", "Grade 9"),
                    ("Michael", "Girma", "michael@example.com", "+251900000000", "Grade 12"),
                    ("Ruth", "Assefa", "ruth@example.com", "+251911111222", "Grade 8")
                ]
            
                for first_name, last_name, email, phone, grade_level in student_data:
                    
                    # Check if student exists
                    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
                    existing = cursor.fetchone()
                
                    if not existing:
        
                        # Create user
                        password_hash = bcrypt.hashpw("Student@2025".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    
                        cursor.execute("""
                            INSERT INTO users (first_name, last_name, email, phone, password_hash, roles, active_role, is_active, email_verified, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (
                            first_name, last_name, email, phone,
                            password_hash, json.dumps(["student"]), "student",
                            True, True, datetime.now(timezone.utc)
                        ))
                   
                        user_id = cursor.fetchone()[0]
                    
                        # Create student profile
                        cursor.execute("""
                           INSERT INTO student_profiles (
                            user_id, grade_level, school_name, subjects, 
                            learning_style, is_active, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            user_id,
                            grade_level,
                            "Addis Ababa Academy",
                            json.dumps(["Mathematics", "Physics", "Chemistry", "Biology", "English"]),
                            "visual",
                            True,
                            datetime.now(timezone.utc)
                        ))
                    
                        print(f"    ✅ Created student: {first_name} {last_name}")
                    
            else:
                print(f"  ℹ️  Found {student_count} students (skipping creation)")
        
            
            # Seed sample video reels
            cursor.execute("SELECT COUNT(*) FROM video_reels")
            video_count = cursor.fetchone()[0]

            if video_count < 18:  # Changed from 10 to 18
                print("  Creating sample video reels...")
    
        # Get tutor IDs
            
            cursor.execute("SELECT id FROM tutor_profiles LIMIT 5")
            
            tutor_ids = [row[0] for row in cursor.fetchall()]
    
        if tutor_ids:
            # Complete list for all 18 videos
            video_data = [
            ("Introduction to Calculus", "Mathematics", "Grade 12", "test-video-1.mp4"),
            ("Physics: Newton's Laws", "Physics", "Grade 11", "test-video-2.mp4"),
            ("Chemistry: Periodic Table", "Chemistry", "Grade 10", "test-video-3.mp4"),
            ("English Grammar Basics", "English", "Grade 9", "test-video-4.mp4"),
            ("Biology: Cell Structure", "Biology", "Grade 11", "test-video-5.mp4"),
            ("Algebra Fundamentals", "Mathematics", "Grade 10", "test-video-6.mp4"),
            ("Ethiopian History", "History", "Grade 12", "test-video-7.mp4"),
            ("Geography: Map Reading", "Geography", "Grade 9", "test-video-8.mp4"),
            ("Computer Programming Basics", "Computer Science", "Grade 11", "test-video-9.mp4"),
            ("Study Tips for Success", "General", "Grade 10", "test-video-10.mp4"),
            ("Trigonometry Explained", "Mathematics", "Grade 11", "test-video-11.mp4"),
            ("Chemical Reactions", "Chemistry", "Grade 11", "test-video-12.mp4"),
            ("Literature Analysis", "English", "Grade 12", "test-video-13.mp4"),
            ("World War II History", "History", "Grade 11", "test-video-14.mp4"),
            ("Python Programming", "Computer Science", "Grade 12", "test-video-15.mp4"),
            ("Organic Chemistry", "Chemistry", "Grade 12", "test-video-16.mp4"),
            ("Shakespeare's Works", "English", "Grade 12", "test-video-17.mp4"),
            ("Advanced Mathematics", "Mathematics", "Grade 12", "test-video.mp4"),
            ]
        
            created_count = 0
        
            for title, subject, grade_level, video_file in video_data:
                tutor_id = random.choice(tutor_ids)
            
            # Check if video exists
            cursor.execute("SELECT id FROM video_reels WHERE title = %s", (title,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO video_reels (
                        tutor_id, title, description, video_url, thumbnail_url,
                        duration, category, subject, grade_level, views, likes,
                        is_active, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    tutor_id,
                    title,
                    f"Learn {subject} with this comprehensive tutorial covering essential concepts and practical examples.",
                    f"/videos/{video_file}",  # Use actual file name
                    f"/thumbnails/{video_file.replace('.mp4', '.jpg')}",
                    f"{random.randint(5, 30)}:00",
                    "Tutorial",
                    subject,
                    grade_level,
                    random.randint(100, 10000),
                    random.randint(10, 1000),
                    True,
                    datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
                ))
                created_count += 1
        
                if created_count > 0:
                    print(f"    ✅ Created {created_count} sample videos")
                else:
                    print(f"    ℹ️  Videos already exist")
            else:
                print("    ⚠️  No tutors found to create videos")
        else:
            print(f"  ℹ️  Found {video_count} videos (skipping creation)")
        
        conn.commit()
        print("\n✅ Data seeding complete!")
        
        # Print summary
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tutor_profiles")
        total_tutors = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM student_profiles")
        total_students = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM video_reels")
        total_videos = cursor.fetchone()[0]
        
        print("\n📊 Database Summary:")
        print(f"  - Total Users: {total_users}")
        print(f"  - Total Tutors: {total_tutors}")
        print(f"  - Total Students: {total_students}")
        print(f"  - Total Videos: {total_videos}")
        
        print("\n🔐 Default Credentials:")
        print("  Admin: admin@astegni.com / Admin@2025")
        print("  Sample Tutor: abebe@example.com / Tutor@2025")
        print("  Sample Student: tigist@example.com / Student@2025")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()

def clear_existing_data():
    """Clear existing data if needed (optional)"""
    try:
        # Get database URL
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
        
        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )
        cursor = conn.cursor()
        
        print("\n🗑️  Clearing existing data...")
        
        # Clear in correct order due to foreign keys
        tables_to_clear = [
            "video_comments",
            "video_engagements",
            "video_reels",
            "tutoring_sessions",
            "tutor_student_enrollments",
            "student_profiles",
            "tutor_profiles",
            "refresh_tokens"
        ]
        
        for table in tables_to_clear:
            try:
                cursor.execute(f"DELETE FROM {table}")
                print(f"  ✅ Cleared {table}")
            except Exception as e:
                print(f"  ⚠️  Could not clear {table}: {e}")
        
        # Don't delete all users, just non-admin ones
        cursor.execute("DELETE FROM users WHERE email != 'admin@astegni.com'")
        print("  ✅ Cleared non-admin users")
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Data cleared successfully")
        
    except Exception as e:
        print(f"❌ Error clearing data: {e}")

def main():
    """Main function to initialize database"""
    print("🚀 Astegni Database Initialization")
    print("=" * 40)
    
    # Test connection
    if not test_connection():
        print("\n⚠️  Please fix the connection issues before proceeding.")
        sys.exit(1)
    
    # Create tables using SQLAlchemy
    print("\n📦 Creating database tables...")
    try:
        # Set environment variable to prevent duplicate table errors
        os.environ['SQLALCHEMY_WARN_20'] = '1'
        
        # Import the app to create tables
        from app import Base, engine
        
        # Create all tables (will skip if they exist)
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created/verified successfully")
        
    except Exception as e:
        print(f"⚠️  Note about tables: {e}")
        print("Continuing with data seeding...")
    
    # Ask if user wants to clear existing data
    if len(sys.argv) > 1 and sys.argv[1] == "--clear":
        clear_existing_data()
    
    # Seed initial data
    seed_initial_data()
    
    print("\n" + "=" * 40)
    print("✨ Database initialization complete!")
    print("\nNext steps:")
    print("1. Start the API server: uvicorn app:app --reload")
    print("2. Open API documentation: http://localhost:8000/docs")
    print("3. Test with the provided credentials")
    print("\nOptional: Run with --clear flag to clear existing data first")
    print("  python init_db.py --clear")

if __name__ == "__main__":
    main()