"""
Seed sample course data for testing
"""

import os
import sys
from datetime import datetime, timezone, timedelta
import random
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Sample Ethiopian course data
COURSE_CATEGORIES = {
    "Mathematics": ["Grade 11-12", "University"],
    "Science": ["Grade 9-10", "Grade 11-12", "University"],
    "Languages": ["Grade 1-6", "Grade 7-8", "Grade 9-10"],
    "Technology": ["Grade 11-12", "University", "Professional"],
    "Business": ["University", "Professional"],
    "Arts": ["Grade 7-8", "Grade 9-10", "Professional"]
}

SAMPLE_COURSES = [
    ("Python for Beginners", "Technology", "Grade 11-12", "Introduction to programming with Python", "Sara Tadesse"),
    ("Amharic Literature", "Languages", "Grade 9-10", "Study of classic and modern Amharic literature", "Yohannes Alemu"),
    ("Advanced Calculus", "Mathematics", "University", "Differential and integral calculus for university students", "Abebe Kebede"),
    ("Organic Chemistry", "Science", "Grade 11-12", "Comprehensive organic chemistry curriculum", "Meron Haile"),
    ("Web Development Fundamentals", "Technology", "Professional", "HTML, CSS, and JavaScript basics", "Daniel Tesfaye"),
    ("Business Ethics", "Business", "University", "Ethical decision-making in business", "Eden Wolde"),
    ("Digital Art & Design", "Arts", "Professional", "Adobe Creative Suite masterclass", "Birtukan Assefa"),
    ("Physics for Grade 12", "Science", "Grade 11-12", "Mechanics, thermodynamics, and electromagnetism", "Dawit Mulugeta"),
    ("Data Science with R", "Technology", "University", "Statistical analysis and data visualization", "Naod Gebru"),
    ("English Literature", "Languages", "Grade 9-10", "Classic English novels and poetry", "Helen Negash"),
]

def seed_courses():
    """Seed sample course data"""
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

        print("\n🌱 Seeding course data...")

        # Clear existing data
        print("  Clearing existing data...")
        cursor.execute("DELETE FROM course_requests;")
        cursor.execute("DELETE FROM active_courses;")
        cursor.execute("DELETE FROM rejected_courses;")
        cursor.execute("DELETE FROM suspended_courses;")

        # Seed course requests (pending)
        print("  Adding course requests...")
        for i, (title, category, level, description, requester) in enumerate(SAMPLE_COURSES[:4], 1):
            request_id = f"REQ-CRS-{str(i).zfill(3)}"
            cursor.execute("""
                INSERT INTO course_requests
                (request_id, title, category, level, description, requested_by, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (request_id, title, category, level, description, requester,
                  datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10))))

        # Seed active courses
        print("  Adding active courses...")
        for i, (title, category, level, description, requester) in enumerate(SAMPLE_COURSES[4:7], 1):
            course_id = f"CRS-{str(i).zfill(3)}"
            cursor.execute("""
                INSERT INTO active_courses
                (course_id, title, category, level, description, requested_by,
                 enrolled_students, rating, rating_count, notification_sent, approved_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (course_id, title, category, level, description, requester,
                  random.randint(50, 500), round(random.uniform(3.5, 5.0), 1), random.randint(10, 100),
                  random.choice([True, False]),
                  datetime.now(timezone.utc) - timedelta(days=random.randint(10, 30))))

        # Seed rejected courses
        print("  Adding rejected courses...")
        rejected_reasons = ["Duplicate content", "Quality issues", "Insufficient detail"]
        for i, (title, category, level, description, requester) in enumerate(SAMPLE_COURSES[7:9], 1):
            rejected_id = f"REJ-CRS-{str(i).zfill(3)}"
            cursor.execute("""
                INSERT INTO rejected_courses
                (rejected_id, original_request_id, title, category, level, description,
                 requested_by, rejection_reason, rejected_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (rejected_id, f"REQ-CRS-{str(i+10).zfill(3)}", title, category, level, description,
                  requester, random.choice(rejected_reasons),
                  datetime.now(timezone.utc) - timedelta(days=random.randint(5, 20))))

        # Seed suspended courses
        print("  Adding suspended courses...")
        suspension_reasons = ["Content under review", "Compliance check", "Quality review"]
        for i, (title, category, level, description, requester) in enumerate(SAMPLE_COURSES[9:10], 1):
            suspended_id = f"SUS-CRS-{str(i).zfill(3)}"
            cursor.execute("""
                INSERT INTO suspended_courses
                (suspended_id, original_course_id, title, category, level, description,
                 requested_by, enrolled_students, rating, rating_count, suspension_reason, suspended_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (suspended_id, f"CRS-{str(i+10).zfill(3)}", title, category, level, description,
                  requester, random.randint(20, 200), round(random.uniform(3.0, 4.5), 1), random.randint(5, 50),
                  random.choice(suspension_reasons),
                  datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5))))

        conn.commit()
        print("\n✅ Seeding completed successfully!")

        # Show counts
        print("\n📊 Course data status:")
        for table in ['course_requests', 'active_courses', 'rejected_courses', 'suspended_courses']:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} records")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("COURSE DATA SEEDING")
    print("=" * 60)
    seed_courses()
