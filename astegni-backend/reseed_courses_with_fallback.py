"""
Replace database courses with the fallback courses from index.html (better quality)
"""

import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Fallback courses from js/index/course-flip.js (lines 78-183)
# These are the high-quality courses shown on the frontend
FALLBACK_COURSES = [
    {
        "title": "Mathematics",
        "icon": "📐",
        "category": "tech",
        "level": "Beginner",
        "students": 2500,
        "rating": 4.8,
        "instructor": "Dr. Abebe Kebede",
        "price": 299.99,
        "thumbnail": None,
        "description": "Comprehensive mathematics course covering algebra, geometry, and calculus fundamentals"
    },
    {
        "title": "Physics",
        "icon": "⚛️",
        "category": "tech",
        "level": "Intermediate",
        "students": 1800,
        "rating": 4.9,
        "instructor": "Prof. Meron Haile",
        "price": 349.99,
        "thumbnail": None,
        "description": "Advanced physics covering mechanics, thermodynamics, and quantum physics"
    },
    {
        "title": "Chemistry",
        "icon": "🧪",
        "category": "tech",
        "level": "Advanced",
        "students": 1200,
        "rating": 4.7,
        "instructor": "Dr. Sara Tadesse",
        "price": 399.99,
        "thumbnail": None,
        "description": "In-depth chemistry course including organic, inorganic, and analytical chemistry"
    },
    {
        "title": "Music",
        "icon": "🎵",
        "category": "arts",
        "level": "Beginner",
        "students": 3000,
        "rating": 4.8,
        "instructor": "Maestro Yohannes Alemu",
        "price": 199.99,
        "thumbnail": None,
        "description": "Learn music theory, instruments, and composition from a master musician"
    },
    {
        "title": "English",
        "icon": "🇬🇧",
        "category": "language",
        "level": "All Levels",
        "students": 4000,
        "rating": 4.9,
        "instructor": "Helen Negash",
        "price": 249.99,
        "thumbnail": None,
        "description": "Complete English language course from beginner to advanced proficiency"
    },
    {
        "title": "Business",
        "icon": "📊",
        "category": "business",
        "level": "Intermediate",
        "students": 2000,
        "rating": 4.8,
        "instructor": "Eden Wolde",
        "price": 449.99,
        "thumbnail": None,
        "description": "Business fundamentals including management, finance, and entrepreneurship"
    },
    {
        "title": "Photography",
        "icon": "📸",
        "category": "arts",
        "level": "All Levels",
        "students": 1500,
        "rating": 4.7,
        "instructor": "Birtukan Assefa",
        "price": 299.99,
        "thumbnail": None,
        "description": "Master photography from basics to advanced techniques and editing"
    },
    {
        "title": "Special Needs",
        "icon": "♿",
        "category": "arts",
        "level": "Beginner",
        "students": 900,
        "rating": 4.6,
        "instructor": "Daniel Tesfaye",
        "price": 199.99,
        "thumbnail": None,
        "description": "Specialized education for students with special needs and learning differences"
    },
]

def reset_and_seed_courses():
    """Clear all existing courses and seed with fallback data"""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

        # Parse connection string
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")

        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_part = host_db.split("/")
        db_name = db_part.split("?")[0]

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

        print("\n🗑️  Removing all existing courses...")

        # Check if courses table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'courses'
            );
        """)
        table_exists = cursor.fetchone()[0]

        if table_exists:
            cursor.execute("DELETE FROM courses;")
            print(f"  ✅ Cleared existing courses table")
        else:
            # Create courses table if it doesn't exist
            print("  📋 Creating courses table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS courses (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    icon VARCHAR(10),
                    category VARCHAR(100),
                    level VARCHAR(100),
                    students INTEGER DEFAULT 0,
                    rating DECIMAL(2,1) DEFAULT 0.0,
                    instructor VARCHAR(255),
                    price DECIMAL(10,2),
                    thumbnail VARCHAR(500),
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            print("  ✅ Courses table created")

        print("\n🌱 Seeding fallback courses...")

        for i, course in enumerate(FALLBACK_COURSES, 1):
            cursor.execute("""
                INSERT INTO courses
                (title, icon, category, level, students, rating, instructor, price, thumbnail, description, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                course["title"],
                course["icon"],
                course["category"],
                course["level"],
                course["students"],
                course["rating"],
                course["instructor"],
                course["price"],
                course["thumbnail"],
                course["description"],
                datetime.now(timezone.utc)
            ))
            print(f"  ✅ Added: {course['title']} ({course['category']}, {course['level']})")

        conn.commit()
        print("\n✅ All courses reseeded successfully!")

        # Show final count
        cursor.execute("SELECT COUNT(*) FROM courses;")
        count = cursor.fetchone()[0]
        print(f"\n📊 Total courses in database: {count}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"\n❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("RESET AND SEED COURSES WITH FALLBACK DATA")
    print("=" * 60)
    reset_and_seed_courses()
