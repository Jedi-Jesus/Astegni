#!/usr/bin/env python3
"""
Database initialization script for Astegni platform
Works with PostgreSQL 17 and psycopg3 on Windows
"""

import os
import sys
import psycopg
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
        
        # Check if data already exists
        cursor.execute("SELECT COUNT(*) FROM counters")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print("ℹ️  Data already exists in database. Skipping seed.")
            cursor.execute("SELECT counter_type, count, label FROM counters")
            counters = cursor.fetchall()
            print("\nCurrent counters:")
            for counter in counters:
                print(f"  - {counter[2]}: {counter[1]}")
            return
        
        print("\n🌱 Seeding initial data...")
        
        # Seed counters
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
        
        # Seed news
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
        
        # Seed videos
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
        
        # Seed partners
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
        
        # Seed courses
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
        
        # Seed testimonials
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
        
        conn.commit()
        print("\n✅ Initial data seeded successfully!")
        
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
        from app import Base, engine
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
    except ImportError:
        print("⚠️  Could not import app.py. Make sure it exists in the same directory.")
        print("Tables will be created when you run the app for the first time.")
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

if __name__ == "__main__":
    main()