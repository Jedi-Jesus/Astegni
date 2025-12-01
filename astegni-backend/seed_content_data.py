"""
Seed sample content data for manage-contents feature
Includes various content types, grade levels, and verification statuses
"""
import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

# Sample data arrays
UPLOADERS = [
    {"id": 1, "name": "Dr. Abebe Tadesse"},
    {"id": 2, "name": "Prof. Marta Bekele"},
    {"id": 3, "name": "Mr. Dawit Solomon"},
    {"id": 4, "name": "Mrs. Sara Haile"},
    {"id": 5, "name": "Dr. Yohannes Mulugeta"},
    {"id": 6, "name": "Ms. Hana Tesfaye"},
    {"id": 7, "name": "Prof. Getachew Mekonnen"},
    {"id": 8, "name": "Mr. Berhanu Alemu"},
]

GRADE_LEVELS = [
    "Grade 1-6",
    "Grade 7-8",
    "Grade 9-10",
    "Grade 11-12",
    "University Level",
    "All Grades"
]

COURSE_TYPES = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "Amharic",
    "History",
    "Geography",
    "Civics",
    "Economics",
    "Computer Science",
    "General Science"
]

VIDEO_TITLES = [
    "Introduction to Algebra",
    "Chemical Reactions Explained",
    "Cell Biology Basics",
    "Newton's Laws of Motion",
    "Ethiopian History Overview",
    "English Grammar Fundamentals",
    "Geography of Africa",
    "Basic Programming Concepts",
    "Photosynthesis Process",
    "Trigonometry Made Easy",
    "Organic Chemistry Introduction",
    "Economics Principles",
    "Physics Experiments",
    "Literature Analysis",
    "Mathematics Problem Solving"
]

IMAGE_TITLES = [
    "Periodic Table Chart",
    "Mathematical Formulas Reference",
    "Human Body Systems Diagram",
    "Ethiopian Map Geography",
    "Physics Equations Sheet",
    "Grammar Rules Poster",
    "Historical Timeline",
    "Biology Cell Structure",
    "Chemistry Lab Safety",
    "Geometry Shapes Guide",
    "Algebra Concepts Map",
    "World Geography Map"
]

DESCRIPTIONS = [
    "Comprehensive educational material for students",
    "High-quality teaching resource with detailed explanations",
    "Visual learning aid for classroom instruction",
    "Step-by-step tutorial covering key concepts",
    "Interactive lesson material for better understanding",
    "Reference material for exam preparation",
    "Detailed breakdown of important topics",
    "Educational content aligned with curriculum standards"
]

REJECTION_REASONS = [
    "Content quality does not meet standards",
    "Audio quality is poor and difficult to understand",
    "Content contains factual errors",
    "Video resolution is too low",
    "Incomplete or missing important information",
    "Does not align with curriculum requirements"
]

SUSPENSION_REASONS = [
    "Reported for inappropriate content",
    "Copyright infringement suspected",
    "Multiple user complaints received",
    "Violates community guidelines",
    "Pending investigation of content accuracy"
]

def get_db_connection():
    """Get database connection"""
    db_url = DATABASE_URL

    # Remove postgresql:// prefix
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "")

    # Split into user:pass@host:port/dbname
    parts = db_url.split('@')
    user_pass = parts[0].split(':')
    host_db = parts[1].split('/')

    # Clean database name from query parameters
    dbname = host_db[1].split('?')[0]
    host_port = host_db[0].split(':')

    return psycopg.connect(
        dbname=dbname,
        user=user_pass[0],
        password=user_pass[1],
        host=host_port[0],
        port=host_port[1] if len(host_port) > 1 else "5432"
    )

def seed_contents():
    """Seed content data with various verification statuses"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Seeding content data...")

        # Clear existing data
        cursor.execute("DELETE FROM contents")
        print("Cleared existing content data")

        contents_data = []

        # Generate 50 video contents
        for i in range(50):
            uploader = random.choice(UPLOADERS)
            title = random.choice(VIDEO_TITLES)
            grade_level = random.choice(GRADE_LEVELS)
            course_type = random.choice(COURSE_TYPES)
            description = random.choice(DESCRIPTIONS)

            # Random file size between 10MB and 500MB
            file_size = random.randint(10 * 1024 * 1024, 500 * 1024 * 1024)

            # Video duration in seconds (5 min to 60 min)
            duration = random.randint(300, 3600)

            # Random views
            views = random.randint(0, 5000)

            # File path in Backblaze format
            file_path = f"videos/educational/user_{uploader['id']}/video_{i+1}_{datetime.now().strftime('%Y%m%d')}.mp4"
            thumbnail_path = f"images/thumbnails/user_{uploader['id']}/thumb_{i+1}.jpg"

            # Random upload date in the last 90 days
            days_ago = random.randint(1, 90)
            uploaded_at = datetime.now() - timedelta(days=days_ago)

            # Determine verification status (40% verified, 30% pending, 20% rejected, 10% suspended)
            rand = random.random()
            if rand < 0.4:
                verification_status = 'verified'
                is_verified = True
                verified_at = uploaded_at + timedelta(days=random.randint(1, 5))
                rejected_at = None
                rejected_reason = None
                suspended_at = None
                suspended_reason = None
            elif rand < 0.7:
                verification_status = 'pending'
                is_verified = False
                verified_at = None
                rejected_at = None
                rejected_reason = None
                suspended_at = None
                suspended_reason = None
            elif rand < 0.9:
                verification_status = 'rejected'
                is_verified = False
                verified_at = None
                rejected_at = uploaded_at + timedelta(days=random.randint(1, 3))
                rejected_reason = random.choice(REJECTION_REASONS)
                suspended_at = None
                suspended_reason = None
            else:
                verification_status = 'suspended'
                is_verified = False
                verified_at = None
                rejected_at = None
                rejected_reason = None
                suspended_at = uploaded_at + timedelta(days=random.randint(1, 7))
                suspended_reason = random.choice(SUSPENSION_REASONS)

            contents_data.append((
                title,
                'video',
                None,  # uploader_id (NULL since we don't have actual users)
                uploader['name'],
                file_size,
                file_path,
                uploaded_at,
                description,
                grade_level,
                course_type,
                is_verified,
                verification_status,
                verified_at,
                rejected_at,
                rejected_reason,
                suspended_at,
                suspended_reason,
                thumbnail_path,
                duration,
                views
            ))

        # Generate 30 image contents
        for i in range(30):
            uploader = random.choice(UPLOADERS)
            title = random.choice(IMAGE_TITLES)
            grade_level = random.choice(GRADE_LEVELS)
            course_type = random.choice(COURSE_TYPES)
            description = random.choice(DESCRIPTIONS)

            # Random file size between 500KB and 10MB
            file_size = random.randint(500 * 1024, 10 * 1024 * 1024)

            # Random views
            views = random.randint(0, 3000)

            # File path in Backblaze format
            file_path = f"images/educational/user_{uploader['id']}/image_{i+1}_{datetime.now().strftime('%Y%m%d')}.jpg"

            # Random upload date in the last 90 days
            days_ago = random.randint(1, 90)
            uploaded_at = datetime.now() - timedelta(days=days_ago)

            # Determine verification status
            rand = random.random()
            if rand < 0.5:
                verification_status = 'verified'
                is_verified = True
                verified_at = uploaded_at + timedelta(days=random.randint(1, 5))
                rejected_at = None
                rejected_reason = None
                suspended_at = None
                suspended_reason = None
            elif rand < 0.8:
                verification_status = 'pending'
                is_verified = False
                verified_at = None
                rejected_at = None
                rejected_reason = None
                suspended_at = None
                suspended_reason = None
            elif rand < 0.95:
                verification_status = 'rejected'
                is_verified = False
                verified_at = None
                rejected_at = uploaded_at + timedelta(days=random.randint(1, 3))
                rejected_reason = random.choice(REJECTION_REASONS)
                suspended_at = None
                suspended_reason = None
            else:
                verification_status = 'suspended'
                is_verified = False
                verified_at = None
                rejected_at = None
                rejected_reason = None
                suspended_at = uploaded_at + timedelta(days=random.randint(1, 7))
                suspended_reason = random.choice(SUSPENSION_REASONS)

            contents_data.append((
                title,
                'image',
                None,  # uploader_id (NULL since we don't have actual users)
                uploader['name'],
                file_size,
                file_path,
                uploaded_at,
                description,
                grade_level,
                course_type,
                is_verified,
                verification_status,
                verified_at,
                rejected_at,
                rejected_reason,
                suspended_at,
                suspended_reason,
                None,  # No thumbnail for images
                None,  # No duration for images
                views
            ))

        # Insert all content data
        cursor.executemany("""
            INSERT INTO contents (
                title, content_type, uploader_id, uploader_name, file_size,
                file_path, uploaded_at, description, grade_level, course_type,
                is_verified, verification_status, verified_at, rejected_at,
                rejected_reason, suspended_at, suspended_reason, thumbnail_path,
                duration, views_count
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, contents_data)

        conn.commit()

        # Print summary statistics
        cursor.execute("SELECT COUNT(*) FROM contents")
        total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'pending'")
        pending = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'verified'")
        verified = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'rejected'")
        rejected = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE verification_status = 'suspended'")
        suspended = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE content_type = 'video'")
        videos = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contents WHERE content_type = 'image'")
        images = cursor.fetchone()[0]

        print(f"\nSuccessfully seeded {total} contents!")
        print(f"  - Videos: {videos}")
        print(f"  - Images: {images}")
        print(f"  - Pending: {pending}")
        print(f"  - Verified: {verified}")
        print(f"  - Rejected: {rejected}")
        print(f"  - Suspended: {suspended}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Failed to seed content data: {e}")
        raise

if __name__ == "__main__":
    seed_contents()
