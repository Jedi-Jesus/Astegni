#!/usr/bin/env python3
"""
Seed tutor data from JavaScript static data into the database
"""

import psycopg
import json
import hashlib
import os
from datetime import datetime, date
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

# Convert URL for psycopg3 compatibility
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
if DATABASE_URL.startswith('postgresql+psycopg://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://', 1)

# Ethiopian tutor data extracted from JavaScript files
TUTOR_DATA = [
    {
        "id": 1,
        "first_name": "Abebe",
        "last_name": "Tadesse",
        "email": "abebe.tadesse@email.com",
        "phone": "+251911234567",
        "location": "Addis Ababa",
        "bio": "Experienced Mathematics tutor with 8 years of teaching experience",
        "subjects": ["Mathematics", "Physics"],
        "gender": "Male",
        "courseType": "Academic",
        "teachesAt": "Addis Ababa University",
        "learningMethod": "In-person",
        "languages": ["English", "Amharic"],
        "rating": 4.8,
        "hourly_rate": 350,
        "age": 32,
        "experience": 8,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 2,
        "first_name": "Hanan",
        "last_name": "Mohammed",
        "email": "hanan.mohammed@email.com",
        "phone": "+251922345678",
        "location": "Dire Dawa",
        "bio": "Professional English language instructor specializing in IELTS preparation",
        "subjects": ["English", "Literature"],
        "gender": "Female",
        "courseType": "Professional",
        "teachesAt": "Ethiopian High School",
        "learningMethod": "Online",
        "languages": ["English", "Amharic", "Oromo"],
        "rating": 4.6,
        "hourly_rate": 280,
        "age": 28,
        "experience": 5,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 3,
        "first_name": "Dawit",
        "last_name": "Kebede",
        "email": "dawit.kebede@email.com",
        "phone": "+251933456789",
        "location": "Bahir Dar",
        "bio": "Chemistry and Biology tutor with university teaching background",
        "subjects": ["Chemistry", "Biology"],
        "gender": "Male",
        "courseType": "Academic",
        "teachesAt": "Bahir Dar University",
        "learningMethod": "Hybrid",
        "languages": ["English", "Amharic"],
        "rating": 4.9,
        "hourly_rate": 420,
        "age": 35,
        "experience": 12,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 4,
        "first_name": "Meron",
        "last_name": "Assefa",
        "email": "meron.assefa@email.com",
        "phone": "+251944567890",
        "location": "Hawassa",
        "bio": "Computer Science and Programming mentor",
        "subjects": ["Computer Science", "Programming"],
        "gender": "Female",
        "courseType": "Both Academic and Professional",
        "teachesAt": "Hawassa University",
        "learningMethod": "Online",
        "languages": ["English", "Amharic", "Gurage"],
        "rating": 4.7,
        "hourly_rate": 380,
        "age": 29,
        "experience": 6,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 5,
        "first_name": "Solomon",
        "last_name": "Girma",
        "email": "solomon.girma@email.com",
        "phone": "+251955678901",
        "location": "Mekelle",
        "bio": "Mathematics and Economics tutor for high school and university students",
        "subjects": ["Mathematics", "Economics"],
        "gender": "Male",
        "courseType": "Academic",
        "teachesAt": "Mekelle University",
        "languages": ["English", "Amharic"],
        "rating": 2.8,
        "hourly_rate": 120,
        "age": 26,
        "experience": 3,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 6,
        "first_name": "Tigist",
        "last_name": "Haile",
        "email": "tigist.haile@email.com",
        "phone": "+251966789012",
        "location": "Jimma",
        "bio": "History and Geography specialist with research background",
        "subjects": ["History", "Geography"],
        "gender": "Female",
        "courseType": "Academic",
        "teachesAt": "Jimma University",
        "languages": ["English", "Amharic", "Oromo"],
        "rating": 3.4,
        "hourly_rate": 180,
        "age": 31,
        "experience": 7,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 7,
        "first_name": "Rahel",
        "last_name": "Mengistu",
        "email": "rahel.mengistu@email.com",
        "phone": "+251977890123",
        "location": "Adama",
        "bio": "Professional English and French language tutor with certification",
        "subjects": ["English", "French", "Literature"],
        "gender": "Female",
        "courseType": "Professional",
        "teachesAt": "Language Institute",
        "languages": ["English", "French", "Amharic"],
        "rating": 4.5,
        "hourly_rate": 250,
        "age": 27,
        "experience": 4,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 8,
        "first_name": "Yohannes",
        "last_name": "Tekle",
        "email": "yohannes.tekle@email.com",
        "phone": "+251988901234",
        "location": "Gondar",
        "bio": "High school Mathematics and Physics teacher",
        "subjects": ["Mathematics", "Physics"],
        "gender": "Male",
        "courseType": "Academic",
        "teachesAt": "Gondar High School",
        "languages": ["English", "Amharic"],
        "rating": 4.2,
        "hourly_rate": 200,
        "age": 33,
        "experience": 9,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 9,
        "first_name": "Selamawit",
        "last_name": "Desta",
        "email": "selamawit.desta@email.com",
        "phone": "+251999012345",
        "location": "Dessie",
        "bio": "Elementary grade teacher specializing in early childhood education for Grade 1-4 students",
        "subjects": ["Elementary Math", "Science", "Reading"],
        "gender": "Female",
        "courseType": "Academic",
        "teachesAt": "Dessie Elementary School",
        "learningMethod": "In-person",
        "languages": ["English", "Amharic"],
        "rating": 4.6,
        "hourly_rate": 150,
        "age": 25,
        "experience": 3,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 10,
        "first_name": "Alemayehu",
        "last_name": "Worku",
        "email": "alemayehu.worku@email.com",
        "phone": "+251910123456",
        "location": "Arba Minch",
        "bio": "University-level Statistics and Data Science instructor",
        "subjects": ["Statistics", "Data Science", "Mathematics"],
        "gender": "Male",
        "courseType": "Both Academic and Professional",
        "teachesAt": "Arba Minch University",
        "languages": ["English", "Amharic"],
        "rating": 4.9,
        "hourly_rate": 450,
        "age": 38,
        "experience": 14,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 11,
        "first_name": "Kalkidan",
        "last_name": "Mulugeta",
        "email": "kalkidan.mulugeta@email.com",
        "phone": "+251921234567",
        "location": "Addis Ababa, Bole",
        "bio": "Middle school teacher specializing in Grade 7-8 Mathematics and Science",
        "subjects": ["Mathematics", "Science", "Physics"],
        "gender": "Female",
        "courseType": "Academic",
        "teachesAt": "Bole Middle School",
        "languages": ["English", "Amharic"],
        "rating": 4.3,
        "hourly_rate": 220,
        "age": 30,
        "experience": 8,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 12,
        "first_name": "Biniyam",
        "last_name": "Getahun",
        "email": "biniyam.getahun@email.com",
        "phone": "+251932345678",
        "location": "Addis Ababa, Kirkos",
        "bio": "KG and preschool educator with early childhood development expertise",
        "subjects": ["Early Learning", "Basic Math", "Reading Readiness"],
        "gender": "Male",
        "courseType": "Academic",
        "teachesAt": "Kirkos Kindergarten Center",
        "languages": ["English", "Amharic"],
        "rating": 4.7,
        "hourly_rate": 180,
        "age": 28,
        "experience": 6,
        "profile_complete": True,
        "is_active": True
    },
    {
        "id": 13,
        "first_name": "Hiwot",
        "last_name": "Bekele",
        "email": "hiwot.bekele@email.com",
        "phone": "+251943456789",
        "location": "Addis Ababa, Yeka",
        "bio": "Grade 11-12 Chemistry and Biology teacher preparing students for university entrance",
        "subjects": ["Chemistry", "Biology", "University Prep"],
        "gender": "Female",
        "courseType": "Academic",
        "teachesAt": "Yeka Secondary School",
        "languages": ["English", "Amharic"],
        "rating": 4.8,
        "hourly_rate": 320,
        "age": 34,
        "experience": 11,
        "profile_complete": True,
        "is_active": True
    }
]

def get_db_connection():
    """Get database connection"""
    try:
        # Parse database URL
        if '?' in DATABASE_URL:
            db_url, params = DATABASE_URL.split('?', 1)
        else:
            db_url = DATABASE_URL

        # Extract connection parts
        protocol_and_rest = db_url.split('://', 1)[1]
        if '@' in protocol_and_rest:
            user_pass, host_db = protocol_and_rest.split('@', 1)
            if ':' in user_pass:
                username, password = user_pass.split(':', 1)
            else:
                username = user_pass
                password = ""
        else:
            username = ""
            password = ""
            host_db = protocol_and_rest

        if '/' in host_db:
            host_port, db_name = host_db.split('/', 1)
        else:
            host_port = host_db
            db_name = "astegni_db"

        if ':' in host_port:
            host, port = host_port.split(':', 1)
            port = int(port)
        else:
            host = host_port
            port = 5432

        print(f"Connecting to database: {db_name} at {host}:{port}")

        # Connect to database
        conn = psycopg.connect(
            dbname=db_name,
            user=username,
            password=password,
            host=host,
            port=port
        )

        return conn

    except Exception as e:
        print(f"ERROR: Connection error: {e}")
        return None

def create_user_and_tutor_profile(conn, tutor_data):
    """Create user and tutor profile"""
    cursor = conn.cursor()

    try:
        # Calculate birth year from age
        birth_year = datetime.now().year - tutor_data.get('age', 30)
        birth_date = date(birth_year, 1, 1)

        # Hash password (using email as base for demo)
        password_hash = hashlib.sha256(f"{tutor_data['email']}_password".encode()).hexdigest()

        # Check if user already exists
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (tutor_data['email'],)
        )
        existing_user = cursor.fetchone()

        if existing_user:
            user_id = existing_user[0]
            print(f"  INFO: User already exists: {tutor_data['first_name']} {tutor_data['last_name']}")
        else:
            # Create user
            cursor.execute("""
                INSERT INTO users (first_name, last_name, email, phone, password_hash, roles, active_role, bio, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                tutor_data['first_name'],
                tutor_data['last_name'],
                tutor_data['email'],
                tutor_data['phone'],
                password_hash,
                json.dumps(['user', 'tutor']),
                'tutor',
                tutor_data['bio'],
                tutor_data['is_active'],
                datetime.now()
            ))
            user_id = cursor.fetchone()[0]
            print(f"  SUCCESS: Created user: {tutor_data['first_name']} {tutor_data['last_name']}")

        # Check if tutor profile already exists
        cursor.execute(
            "SELECT id FROM tutor_profiles WHERE user_id = %s",
            (user_id,)
        )
        existing_profile = cursor.fetchone()

        if existing_profile:
            # Update existing tutor profile
            cursor.execute("""
                UPDATE tutor_profiles SET
                    bio = %s,
                    gender = %s,
                    date_of_birth = %s,
                    subjects_expertise = %s,
                    course_type = %s,
                    location = %s,
                    teaches_at = %s,
                    learning_method = %s,
                    languages = %s,
                    experience = %s,
                    price = %s,
                    currency = %s,
                    rating = %s,
                    rating_count = %s,
                    is_verified = %s,
                    is_active = %s,
                    profile_complete = %s,
                    updated_at = %s
                WHERE user_id = %s
            """, (
                tutor_data['bio'],
                tutor_data['gender'],
                birth_date,
                json.dumps(tutor_data['subjects']),
                tutor_data['courseType'],
                tutor_data['location'],
                tutor_data['teachesAt'],
                tutor_data.get('learningMethod', 'Online'),
                json.dumps(tutor_data['languages']),
                tutor_data['experience'],
                tutor_data['hourly_rate'],
                'ETB',
                tutor_data['rating'],
                max(1, int(tutor_data['rating'] * 50)),  # Generate rating count
                True,  # is_verified
                tutor_data['is_active'],
                tutor_data['profile_complete'],
                datetime.now(),
                user_id
            ))
            print(f"  SUCCESS: Updated tutor profile for: {tutor_data['first_name']} {tutor_data['last_name']}")
        else:
            # Create tutor profile
            cursor.execute("""
                INSERT INTO tutor_profiles (
                    user_id, bio, gender, date_of_birth, subjects_expertise, course_type, location,
                    teaches_at, learning_method, languages, experience, price, currency, rating,
                    rating_count, is_verified, is_active, profile_complete, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                tutor_data['bio'],
                tutor_data['gender'],
                birth_date,
                json.dumps(tutor_data['subjects']),
                tutor_data['courseType'],
                tutor_data['location'],
                tutor_data['teachesAt'],
                tutor_data.get('learningMethod', 'Online'),
                json.dumps(tutor_data['languages']),
                tutor_data['experience'],
                tutor_data['hourly_rate'],
                'ETB',
                tutor_data['rating'],
                max(1, int(tutor_data['rating'] * 50)),  # Generate rating count
                True,  # is_verified
                tutor_data['is_active'],
                tutor_data['profile_complete'],
                datetime.now(),
                datetime.now()
            ))
            print(f"  SUCCESS: Created tutor profile for: {tutor_data['first_name']} {tutor_data['last_name']}")

        cursor.close()
        return True

    except Exception as e:
        print(f"  ERROR: Error creating profile for {tutor_data['first_name']} {tutor_data['last_name']}: {e}")
        cursor.close()
        return False

def seed_tutor_data():
    """Seed all tutor data"""
    conn = get_db_connection()
    if not conn:
        return False

    try:
        print(f"INFO: Starting to seed {len(TUTOR_DATA)} tutors...")

        success_count = 0
        for tutor in TUTOR_DATA:
            if create_user_and_tutor_profile(conn, tutor):
                success_count += 1

        conn.commit()
        print(f"SUCCESS: Successfully seeded {success_count}/{len(TUTOR_DATA)} tutors!")

        conn.close()
        return True

    except Exception as e:
        print(f"ERROR: Seeding failed: {e}")
        conn.rollback()
        conn.close()
        return False

if __name__ == "__main__":
    print("INFO: Seeding Ethiopian tutor data into database...")
    success = seed_tutor_data()
    if success:
        print("SUCCESS: Seeding completed successfully!")
    else:
        print("ERROR: Seeding failed!")