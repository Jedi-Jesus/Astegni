#!/usr/bin/env python3
"""
Database initialization script for Astegni platform
Works with PostgreSQL 17 and psycopg3 on Windows
"""

import os
import sys
import psycopg
import json
import bcrypt
from dotenv import load_dotenv

# Load environment variables
load_dotenv('main.env')

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "astegni_db")
DB_USER = os.getenv("DB_USER", "astegni_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Astegni2025")

def test_connection():
    """Test database connection"""
    print("Testing database connection...")
    try:
        # Try to connect to the database
        conn_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"
        conn = psycopg.connect(conn_string)
        cursor = conn.cursor()
        
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        print(f"✅ Connected to PostgreSQL!")
        print(f"   Version: {version}")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check your username and password in .env file")
        print("3. Make sure the database 'astegni_db' exists")
        return False

def seed_tutor_profiles(cursor, conn):
    """Seed tutor profile data"""
    print("\n👨‍🏫 Seeding tutor profiles...")
    
    # Check if tutor profiles already exist
    cursor.execute("SELECT COUNT(*) FROM tutor_profiles")
    existing_count = cursor.fetchone()[0]
    if existing_count > 0:
        print(f"  Found {existing_count} existing tutor profiles.")
    
    # Get ALL users with tutor role - THIS IS THE KEY FIX
    cursor.execute("""
    SELECT id, first_name, last_name, email 
    FROM users 
    WHERE roles::jsonb @> '["tutor"]'
    ORDER BY id
""")
    tutor_users = cursor.fetchall()
    
    print(f"  Found {len(tutor_users)} users with tutor role")
    
    # Check which users already have profiles
    cursor.execute("SELECT user_id FROM tutor_profiles")
    users_with_profiles = [row[0] for row in cursor.fetchall()]
    
    # Profile templates
    profile_templates = [
        {
            'courses': ['Mathematics', 'Physics'],
            'grades': ['Grade 9-10', 'Grade 11-12'],
            'course_type': 'academics',
            'location': 'Addis Ababa',
            'teaches_at': 'Addis Ababa University',
            'learning_method': 'Hybrid',
            'experience': 5,
            'bio': 'Passionate educator with expertise in Math and Physics. Over 5 years of experience helping students excel.',
            'quote': 'Learning is a journey, not a destination.',
            'price': 500,
            'rating': 4.5,
            'rating_count': 127,
            'rating_breakdown': {
                'engagement': 4.6,
                'discipline': 4.5,
                'punctuality': 4.4,
                'communication': 4.5,
                'subject_matter': 4.5
            },
            'is_verified': True
        },
        {
            'courses': ['English', 'Literature', 'Creative Writing'],
            'grades': ['Grade 7-8', 'Grade 9-10'],
            'course_type': 'academics',
            'location': 'Hawassa',
            'teaches_at': 'Hawassa Online Academy',
            'learning_method': 'Online',
            'experience': 4,
            'bio': 'Dedicated English teacher specializing in creative writing and literature analysis.',
            'quote': 'Words have the power to change the world.',
            'price': 400,
            'rating': 4.8,
            'rating_count': 89,
            'rating_breakdown': {
                'engagement': 4.9,
                'discipline': 4.7,
                'punctuality': 4.8,
                'communication': 4.9,
                'subject_matter': 4.7
            },
            'is_verified': True
        },
        {
            'courses': ['Chemistry', 'Biology'],
            'grades': ['Freshman', 'Sophomore'],
            'course_type': 'academics',
            'location': 'Gondar',
            'teaches_at': 'University of Gondar',
            'learning_method': 'In-person',
            'experience': 6,
            'bio': 'Research scientist turned educator with a passion for making complex concepts simple.',
            'quote': 'Science is a way of thinking more than it is a body of knowledge.',
            'price': 600,
            'rating': 4.3,
            'rating_count': 156,
            'rating_breakdown': {
                'engagement': 4.3,
                'discipline': 4.4,
                'punctuality': 4.2,
                'communication': 4.3,
                'subject_matter': 4.3
            },
            'is_verified': True
        },
        {
            'courses': ['History', 'Social Studies', 'Civics'],
            'grades': ['Grade 9-10', 'Grade 11-12'],
            'course_type': 'academics',
            'location': 'Dire Dawa',
            'teaches_at': 'Dire Dawa High School',
            'learning_method': 'Hybrid',
            'experience': 3,
            'bio': 'Making history come alive through engaging storytelling and interactive lessons.',
            'quote': 'History teaches us about our future.',
            'price': 350,
            'rating': 3.8,
            'rating_count': 67,
            'rating_breakdown': {
                'engagement': 3.9,
                'discipline': 3.7,
                'punctuality': 3.8,
                'communication': 3.8,
                'subject_matter': 3.8
            },
            'is_verified': False
        },
        {
            'courses': ['Advanced Mathematics', 'Calculus', 'Statistics'],
            'grades': ['University Level'],
            'course_type': 'academics',
            'location': 'Addis Ababa',
            'teaches_at': 'Private Tutor',
            'learning_method': 'Online',
            'experience': 8,
            'bio': 'PhD in Mathematics with extensive experience in university-level tutoring.',
            'quote': 'Mathematics is the language of the universe.',
            'price': 800,
            'rating': 4.9,
            'rating_count': 203,
            'rating_breakdown': {
                'engagement': 4.9,
                'discipline': 4.9,
                'punctuality': 5.0,
                'communication': 4.8,
                'subject_matter': 4.9
            },
            'is_verified': True
        }
    ]
    
    # Create profiles for existing tutor users that don't have profiles
    created_profiles = 0
    for i, user in enumerate(tutor_users):
        user_id, first_name, last_name, email = user
        
        if user_id not in users_with_profiles:
            # Use template based on index, cycling if needed
            template = profile_templates[i % len(profile_templates)]
            
            cursor.execute("""
                INSERT INTO tutor_profiles (
                    user_id, courses, grades, course_type, location, teaches_at, 
                    learning_method, experience, bio, quote, price, currency,
                    rating, rating_count, rating_breakdown, is_verified, 
                    is_active, profile_complete
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING
            """, (
                user_id,
                json.dumps(template['courses']),
                json.dumps(template['grades']),
                template['course_type'],
                template['location'],
                template['teaches_at'],
                template['learning_method'],
                template['experience'],
                template['bio'],
                template['quote'],
                template['price'],
                'ETB',
                template['rating'],
                template['rating_count'],
                json.dumps(template['rating_breakdown']),
                template['is_verified'],
                True,
                True
            ))
            created_profiles += 1
            print(f"  Created profile for {first_name} {last_name}")
    
    # If we have fewer than 5 tutors total, create sample ones
    if len(tutor_users) < 5:
        print(f"  Creating {5 - len(tutor_users)} additional sample tutors...")
        
        sample_tutors = [
            ('Abebe', 'Kebede', 'abebe.tutor@example.com', '+251911111111'),
            ('Selam', 'Arega', 'selam.tutor@example.com', '+251922222222'),
            ('Tewodros', 'Alemayehu', 'tewodros.tutor@example.com', '+251933333333'),
            ('Meron', 'Getachew', 'meron.tutor@example.com', '+251944444444'),
            ('Daniel', 'Haile', 'daniel.tutor@example.com', '+251955555555')
        ]
        
        for i in range(5 - len(tutor_users)):
            tutor_data = sample_tutors[i]
            template = profile_templates[i]
            
            # Hash password
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw('Tutor@2025!'.encode('utf-8'), salt).decode('utf-8')
            
            # Create user with tutor role
            cursor.execute("""
                INSERT INTO users (first_name, last_name, email, phone, password_hash, roles, active_role, profile_picture, is_active, email_verified)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true, true)
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            """, (
                tutor_data[0], tutor_data[1], tutor_data[2], tutor_data[3], hashed_password, 
                json.dumps(['tutor']), 'tutor', 
                f'https://ui-avatars.com/api/?name={tutor_data[0]}+{tutor_data[1]}&background=f59e0b&color=fff'
            ))
            
            result = cursor.fetchone()
            if result:
                user_id = result[0]
                print(f"  Created sample tutor user: {tutor_data[0]} {tutor_data[1]}")
                
                # Create profile
                cursor.execute("""
                    INSERT INTO tutor_profiles (
                        user_id, courses, grades, course_type, location, teaches_at, 
                        learning_method, experience, bio, quote, price, currency,
                        rating, rating_count, rating_breakdown, is_verified, 
                        is_active, profile_complete
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id) DO NOTHING
                """, (
                    user_id,
                    json.dumps(template['courses']),
                    json.dumps(template['grades']),
                    template['course_type'],
                    template['location'],
                    template['teaches_at'],
                    template['learning_method'],
                    template['experience'],
                    template['bio'],
                    template['quote'],
                    template['price'],
                    'ETB',
                    template['rating'],
                    template['rating_count'],
                    json.dumps(template['rating_breakdown']),
                    template['is_verified'],
                    True,
                    True
                ))
                created_profiles += 1
    
    conn.commit()
    print(f"  Created {created_profiles} new tutor profiles")

def seed_initial_data():
    """Seed the database with initial data"""
    try:
        conn_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"
        conn = psycopg.connect(conn_string)
        cursor = conn.cursor()
        
        print("\n📦 Checking tables...")
        
        # Check if tables exist
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        table_count = cursor.fetchone()[0]
        
        if table_count == 0:
            print("⚠️  No tables found. They will be created when you run the app.")
            return
        
        print(f"✅ Found {table_count} tables")
        
        # Check and seed counters
        cursor.execute("SELECT COUNT(*) FROM counters")
        counter_count = cursor.fetchone()[0]
        
        if counter_count == 0:
            print("\n🌱 Seeding counters...")
            counters_data = [
                ('parents', 1250, 'Registered Parents', '👨‍👩‍👧‍👦'),
                ('students', 5432, 'Students', '🎓'),
                ('tutors', 387, 'Expert Tutors', '👨‍🏫'),
                ('centers', 67, 'Training Centers', '🏢'),
                ('books', 189, 'Books Available', '📚'),
                ('jobs', 23, 'Job Opportunities', '💼')
            ]
            
            for counter in counters_data:
                cursor.execute("""
                    INSERT INTO counters (counter_type, count, label, icon)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (counter_type) DO NOTHING
                """, counter)
                print(f"  Added counter: {counter[2]}")
        else:
            print(f"ℹ️  Found {counter_count} counters")
        
        # Check and seed news
        cursor.execute("SELECT COUNT(*) FROM news")
        news_count = cursor.fetchone()[0]
        
        if news_count == 0:
            print("\n📰 Seeding news...")
            news_data = [
                ('Astegni Launches AI-Powered Tutor Matching System',
                 'Our new AI algorithm matches students with the perfect tutor based on learning style, goals, and personality compatibility.',
                 'Technology', 'Today', True),
                ('Partnership with Addis Ababa University Announced',
                 'Students can now access university-level courses and receive official certificates through our platform.',
                 'Partnership', 'Yesterday', False),
                ('New Mobile App Released',
                 'Learn on the go with our new mobile applications available for Android and iOS.',
                 'Technology', '2 days ago', False)
            ]
            
            for news in news_data:
                cursor.execute("""
                    INSERT INTO news (title, content, category, date, is_breaking)
                    VALUES (%s, %s, %s, %s, %s)
                """, news)
            print(f"  Added {len(news_data)} news items")
        else:
            print(f"ℹ️  Found {news_count} news items")
        
        # Check and seed videos
        cursor.execute("SELECT COUNT(*) FROM videos")
        video_count = cursor.fetchone()[0]
        
        if video_count == 0:
            print("\n🎬 Seeding videos...")
            videos_data = [
                ('Introduction to Astegni Platform', 
                 'Learn how to navigate and use all features of Astegni educational platform.',
                 '5:23', '10.2K', 'intro', 523, 12),
                ('How to Find the Perfect Tutor',
                 'Step-by-step guide on using our tutor matching system.',
                 '8:15', '7.2K', 'tutorials', 356, 7),
                ('Student Success Story',
                 'Hear from students who improved their grades with Astegni.',
                 '6:30', '15.3K', 'success', 892, 5)
            ]
            
            for video in videos_data:
                cursor.execute("""
                    INSERT INTO videos (title, description, duration, views, category, likes, dislikes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, video)
            print(f"  Added {len(videos_data)} videos")
        else:
            print(f"ℹ️  Found {video_count} videos")
        
        # Check and seed partners
        cursor.execute("SELECT COUNT(*) FROM partners")
        partner_count = cursor.fetchone()[0]
        
        if partner_count == 0:
            print("\n🤝 Seeding partners...")
            partners_data = [
                ('Telebirr', 'https://telebirr.et', 1),
                ('Google Education', 'https://edu.google.com', 2),
                ('Microsoft', 'https://microsoft.com', 3),
                ('Coursera', 'https://coursera.org', 4),
                ('Addis Ababa University', 'https://aau.edu.et', 5)
            ]
            
            for partner in partners_data:
                cursor.execute("""
                    INSERT INTO partners (name, website, "order", is_active)
                    VALUES (%s, %s, %s, true)
                    ON CONFLICT DO NOTHING
                """, partner)
            print(f"  Added {len(partners_data)} partners")
        else:
            print(f"ℹ️  Found {partner_count} partners")
        
        # Check and seed courses
        cursor.execute("SELECT COUNT(*) FROM courses")
        course_count = cursor.fetchone()[0]
        
        if course_count == 0:
            print("\n📚 Seeding courses...")
            courses_data = [
                ('Mathematics', '📐', 'tech', 'Beginner', '2.5K', 4.8,
                 'Religious Studies', '⛪', 'All Levels', '1.2K', 4.9),
                ('Physics', '⚛️', 'tech', 'Intermediate', '1.8K', 4.9,
                 'Programming', '💻', 'Beginner', '5K', 5.0),
                ('Chemistry', '🧪', 'tech', 'Advanced', '1.2K', 4.7,
                 'Sports Training', '🏃', 'All Levels', '800', 4.6)
            ]
            
            for course in courses_data:
                cursor.execute("""
                    INSERT INTO courses (title, icon, category, level, students, rating,
                                       back_title, back_icon, back_level, back_students, back_rating)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, course)
            print(f"  Added {len(courses_data)} courses")
        else:
            print(f"ℹ️  Found {course_count} courses")
        
        # Check and seed testimonials
        cursor.execute("SELECT COUNT(*) FROM testimonials")
        testimonial_count = cursor.fetchone()[0]
        
        if testimonial_count == 0:
            print("\n💬 Seeding testimonials...")
            testimonials_data = [
                ('Astegni helped me find the perfect math tutor. My grades improved from C to A in just 3 months!',
                 'Sara Tadesse', 'Grade 12 Student', 'https://picsum.photos/60?random=1', 5),
                ('As a tutor, Astegni gave me the platform to reach students nationwide.',
                 'Daniel Bekele', 'Physics Tutor', 'https://picsum.photos/60?random=2', 5),
                ('The variety of courses and quality of instructors is unmatched.',
                 'Marta Alemu', 'Parent', 'https://picsum.photos/60?random=3', 5)
            ]
            
            for testimonial in testimonials_data:
                cursor.execute("""
                    INSERT INTO testimonials (text, author, role, avatar_url, rating, is_active)
                    VALUES (%s, %s, %s, %s, %s, true)
                """, testimonial)
            print(f"  Added {len(testimonials_data)} testimonials")
        else:
            print(f"ℹ️  Found {testimonial_count} testimonials")
        
        # ALWAYS check and seed tutor profiles
        seed_tutor_profiles(cursor, conn)
        
        conn.commit()
        print("\n✅ Data seeding complete!")
        
        # Final summary
        cursor.execute("SELECT COUNT(*) FROM tutor_profiles")
        tutor_profile_count = cursor.fetchone()[0]
        print(f"\nFinal counts:")
        print(f"  - Tutor profiles: {tutor_profile_count}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("🚀 Astegni Database Setup")
    print("=" * 40)
    
    # Test connection
    if not test_connection():
        print("\n⚠️  Please fix the connection issues before proceeding.")
        sys.exit(1)
    
    # Create tables by importing the app
    print("\n📦 Creating database tables...")
    try:
        # Import the models to ensure tables are created
        from app import Base, engine
        from tutor_models import TutorProfile  # Import the tutor model
        
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
    except ImportError as e:
        print(f"⚠️  Could not import required modules: {e}")
        print("Make sure app.py and tutor_models.py exist in the same directory.")
    except Exception as e:
        print(f"⚠️  Error creating tables: {e}")
        print("Tables may already exist or will be created when you run the app.")
    
    # Seed initial data
    seed_initial_data()
    
    print("\n" + "=" * 40)
    print("✨ Setup complete!")
    print("\nNext steps:")
    print("1. Start the API server: uvicorn app:app --reload")
    print("2. Open your browser to: http://localhost:8000")
    print("3. Check API documentation: http://localhost:8000/docs")
    print("4. Test tutor endpoints: http://localhost:8000/api/tutors")

if __name__ == "__main__":
    main()