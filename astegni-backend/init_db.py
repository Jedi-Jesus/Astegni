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

# Ethiopian schools and universities
ETHIOPIAN_HIGH_SCHOOLS = [
    "St. Joseph School, Addis Ababa",
    "Lycée Guebre-Mariam, Addis Ababa", 
    "Sandford International School",
    "School of Tomorrow, Addis Ababa",
    "Nazareth School, Addis Ababa",
    "Meskaye Hizunan Medhanealem School",
    "Hillside School, Addis Ababa",
    "Cambridge Academy, Addis Ababa",
    "SOS Hermann Gmeiner School",
    "Bethel Teaching Hospital School",
    "Lideta Catholic Cathedral School",
    "Kokebe Tsibah Secondary School",
    "Yekatit 12 Secondary School",
    "Menelik II Secondary School",
    "Ayer Tena Secondary School"
]

ETHIOPIAN_UNIVERSITIES = [
    "Addis Ababa University",
    "Addis Ababa Science and Technology University",
    "Ethiopian Civil Service University",
    "St. Mary's University",
    "Unity University",
    "Rift Valley University",
    "Admas University",
    "Alpha University College",
    "Hawassa University",
    "Jimma University",
    "Bahir Dar University",
    "Mekelle University",
    "Gondar University",
    "Haramaya University",
    "Arba Minch University"
]

def get_price_by_rating_and_subject(rating, subjects):
    """Calculate price based on rating and subject type"""
    # Check if it's a certification course
    certification_subjects = ['Computer Programming', 'Video Editing', 'Web Development', 
                            'Graphic Design', 'Digital Marketing', 'Data Science', 'Computer Science']
    
    is_certification = any(subj in subjects for subj in certification_subjects)
    
    if rating <= 2.5:  # Beginners
        return random.choice([50, 75, 100])
    elif rating <= 3.5:  # Intermediate
        if is_certification:
            return random.choice([200, 250, 300])
        else:
            return random.choice([100, 150, 200])
    elif rating <= 4.5:  # Advanced
        if is_certification:
            return random.choice([350, 400])
        else:
            return random.choice([200, 250, 300, 350])
    else:  # Expert (4.5+)
        if is_certification:
            return random.choice([400, 450, 500])
        else:
            return random.choice([300, 350, 400])

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
        
        # Create admin user
        cursor.execute("SELECT id FROM users WHERE email = %s", ("admin@astegni.com",))
        if not cursor.fetchone():
            admin_password = bcrypt.hashpw("Admin@2025".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute("""
                INSERT INTO users (first_name, last_name, email, phone, password_hash, roles, active_role, is_active, email_verified, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                "Admin", "User", "admin@astegni.com", "+251900000000",
                admin_password, json.dumps(["admin"]), "admin",
                True, True, datetime.now(timezone.utc)
            ))
            print("  ✅ Created admin user")
        else:
            print("  ℹ️  Admin user already exists")
        
        # Create sample tutors with Ethiopian context
        cursor.execute("SELECT COUNT(*) FROM users WHERE roles::jsonb ? 'tutor'")
        tutor_count = cursor.fetchone()[0]
        
        if tutor_count < 25:  # Create 25 tutors to see ad effect
            print("  Creating 25 sample tutors with Ethiopian schools...")
            
            # Ethiopian names for authenticity
            ethiopian_first_names = [
                "Abebe", "Bekele", "Chaltu", "Dawit", "Eden", "Fikre", "Genet", "Haile",
                "Iskinder", "Jerusalem", "Kebede", "Lidya", "Meron", "Naod", "Oliyad",
                "Paulos", "Ruth", "Samuel", "Tewodros", "Yohannes", "Zelalem",
                "Alem", "Birtukan", "Daniel", "Elias", "Feven", "Girma", "Helen", "Isaac"
            ]
            
            ethiopian_last_names = [
                "Tadesse", "Bekele", "Alemu", "Kebede", "Tesfaye", "Abebe", "Mulugeta",
                "Gebremedhin", "Tsegaye", "Wolde", "Hailu", "Tekle", "Mekonnen", "Assefa",
                "Negash", "Asfaw", "Berhe", "Gebru", "Kidane", "Yohannes"
            ]
            
            subjects = [
                "Mathematics", "Physics", "Chemistry", "Biology", "English",
                "Amharic", "History", "Geography", "Computer Science", "Computer Programming",
                "Economics", "Accounting", "Business", "Art", "Music",
                "Video Editing", "Web Development", "Graphic Design"
            ]
            
            grades = ["Grade 9", "Grade 10", "Grade 11", "Grade 12", "University Level"]
            
            teaching_methods = [
                "Online Classes", "In-Person", "Hybrid", "Group Sessions",
                "One-on-One", "Weekend Classes", "Evening Classes"
            ]
            
            created_tutors = 0
            
            for i in range(25):
                first_name = random.choice(ethiopian_first_names)
                last_name = random.choice(ethiopian_last_names)
                email = f"{first_name.lower()}.{last_name.lower()}{i}@astegni.com"
                
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
                        first_name, last_name, email, f"+2519{random.randint(10000000, 99999999)}",
                        password_hash, json.dumps(["tutor"]), "tutor",
                        True, True, datetime.now(timezone.utc)
                    ))
                    user_id = cursor.fetchone()[0]
                    
                    # Determine rating - weighted distribution
                    rating_weights = [
                        (2.0, 2.5, 0.15),  # 15% beginners (2-2.5 stars)
                        (2.5, 3.5, 0.25),  # 25% intermediate (2.5-3.5 stars)
                        (3.5, 4.5, 0.40),  # 40% advanced (3.5-4.5 stars)
                        (4.5, 5.0, 0.20),  # 20% expert (4.5-5 stars)
                    ]
                    
                    rand = random.random()
                    cumulative = 0
                    rating = 3.5  # default
                    
                    for min_r, max_r, weight in rating_weights:
                        cumulative += weight
                        if rand <= cumulative:
                            rating = round(random.uniform(min_r, max_r), 1)
                            break
                    
                    # Select subjects
                    tutor_subjects = random.sample(subjects, k=random.randint(2, 5))
                    tutor_grades = random.sample(grades, k=random.randint(2, 4))
                    
                    # Determine teaches_at based on subjects
                    is_university_level = "University Level" in tutor_grades
                    is_certification = any(s in ["Computer Programming", "Web Development", "Video Editing", "Computer Science"] for s in tutor_subjects)
                    
                    if is_university_level or is_certification:
                        teaches_at = random.choice(ETHIOPIAN_UNIVERSITIES)
                    else:
                        teaches_at = random.choice(ETHIOPIAN_HIGH_SCHOOLS)
                    
                    # Calculate price based on rating and subjects
                    price = get_price_by_rating_and_subject(rating, tutor_subjects)
                    
                    # Create rating breakdown
                    rating_breakdown = {
                        "discipline": round(random.uniform(max(2.0, rating - 0.5), min(5.0, rating + 0.5)), 1),
                        "punctuality": round(random.uniform(max(2.0, rating - 0.5), min(5.0, rating + 0.5)), 1),
                        "communication_skills": round(random.uniform(max(2.0, rating - 0.5), min(5.0, rating + 0.5)), 1),
                        "knowledge_level": round(random.uniform(max(2.0, rating - 0.5), min(5.0, rating + 0.5)), 1),
                        "retention": round(random.uniform(max(2.0, rating - 0.5), min(5.0, rating + 0.5)), 1)
                    }
                    
                    # Create tutor profile
                    cursor.execute("""
                        INSERT INTO tutor_profiles (
                            user_id, bio, courses, grades, location, experience, 
                            price, rating, rating_count, is_verified, is_active, 
                            profile_complete, created_at, teaches_at, teaching_methods,
                            rating_breakdown, students_taught, response_time, completion_rate
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        user_id,
                        f"Experienced {random.choice(['educator', 'tutor', 'teacher', 'instructor'])} "
                        f"with {random.randint(2, 15) if rating > 2.5 else random.randint(0, 2)} years of experience. "
                        f"Specialized in {', '.join(tutor_subjects[:2])}. Currently teaching at {teaches_at}.",
                        json.dumps(tutor_subjects),
                        json.dumps(tutor_grades),
                        random.choice([
                            "Addis Ababa, Bole", "Addis Ababa, Kirkos", "Addis Ababa, Yeka",
                            "Addis Ababa, Kolfe Keranio", "Addis Ababa, Gulele", "Addis Ababa, Lideta",
                            "Addis Ababa, Arada", "Addis Ababa, Addis Ketema", "Addis Ababa, Akaky Kaliti",
                            "Addis Ababa, Nifas Silk-Lafto", "Bahir Dar", "Gondar", "Hawassa", "Mekelle"
                        ]),
                        random.randint(1, 15) if rating > 2.5 else random.randint(0, 2),
                        price,
                        rating,
                        random.randint(5, 200) if rating > 2.5 else random.randint(1, 10),
                        rating >= 4.0 or random.choice([True, False]),
                        True,
                        True,
                        datetime.now(timezone.utc),
                        teaches_at,
                        json.dumps(random.sample(teaching_methods, k=random.randint(2, 4))),
                        json.dumps(rating_breakdown),
                        random.randint(10, 500) if rating > 3 else random.randint(5, 50),
                        random.choice(["Within 1 hour", "Within 2 hours", "Within 6 hours", "Within 24 hours"]),
                        random.randint(85, 100) if rating > 3.5 else random.randint(70, 85)
                    ))
                    
                    created_tutors += 1
                    print(f"    ✅ Created tutor: {first_name} {last_name} - {teaches_at} - {price} ETB")
            
            print(f"  ✅ Created {created_tutors} new tutors")
        else:
            print(f"  ℹ️  Found {tutor_count} tutors (skipping creation)")
        
        # Create sample students
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
                        random.choice(ETHIOPIAN_HIGH_SCHOOLS),
                        json.dumps(["Mathematics", "Physics", "Chemistry", "Biology", "English"]),
                        "visual",
                        True,
                        datetime.now(timezone.utc)
                    ))
                    
                    print(f"    ✅ Created student: {first_name} {last_name}")
        else:
            print(f"  ℹ️  Found {student_count} students (skipping creation)")
        
        # Find this section in your init_db.py (around line 380-430) and replace it with:

        # Seed sample videos
        cursor.execute("SELECT COUNT(*) FROM video_reels")
        video_count = cursor.fetchone()[0]
        
        if video_count < 10:
            print("  Creating sample videos...")
            
            # Get ACTUAL tutor IDs from the database (not user IDs)
            cursor.execute("""
                SELECT tp.id 
                FROM tutor_profiles tp
                JOIN users u ON tp.user_id = u.id
                WHERE u.roles::jsonb ? 'tutor'
                LIMIT 10
            """)
            tutor_profile_ids = [row[0] for row in cursor.fetchall()]
            
            if tutor_profile_ids:
                video_data = [
                    ("Algebra Basics", "Mathematics", "Grade 9", "test-video-1.mp4"),
                    ("Physics Motion Laws", "Physics", "Grade 10", "test-video-2.mp4"),
                    ("Chemical Reactions", "Chemistry", "Grade 11", "test-video-3.mp4"),
                    ("Cell Biology", "Biology", "Grade 10", "test-video-4.mp4"),
                    ("English Grammar", "English", "Grade 9", "test-video-5.mp4"),
                    ("Ethiopian History", "History", "Grade 11", "test-video-6.mp4"),
                    ("World Geography", "Geography", "Grade 10", "test-video-7.mp4"),
                    ("Calculus Introduction", "Mathematics", "Grade 12", "test-video-8.mp4"),
                    ("Quantum Physics", "Physics", "Grade 12", "test-video-9.mp4"),
                    ("Organic Chemistry", "Chemistry", "Grade 12", "test-video-10.mp4"),
                ]
                
                created_count = 0
                
                for title, subject, grade_level, video_file in video_data:
                    # Use actual tutor_profile id, not user id
                    tutor_profile_id = random.choice(tutor_profile_ids)
                    
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
                            tutor_profile_id,  # Use the actual tutor_profile.id
                            title,
                            f"Learn {subject} with this comprehensive tutorial covering essential concepts and practical examples.",
                            f"/videos/{video_file}",
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
        
        print("\n🔑 Default Credentials:")
        print("  Admin: admin@astegni.com / Admin@2025")
        print("  Sample Tutor: abebe.tadesse0@astegni.com / Tutor@2025")
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