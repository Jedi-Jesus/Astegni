"""
Seed script to populate tutor-related tables with sample data:
1. tutor_students - Sample tutor-student relationships
2. tutor_analysis - Sample analytics data for tutors
3. tutor_resources - Sample resources with mock file uploads

Run this after migrate_create_tutor_tables.py
"""

import os
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the app.py modules directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Convert postgresql:// to postgresql+psycopg://
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://')

# Create engine and session
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ethiopian subjects
SUBJECTS = [
    "Mathematics", "Physics", "Chemistry", "Biology",
    "English", "Amharic", "History", "Geography",
    "Economics", "Civics", "Computer Science", "Statistics"
]

# Resource categories
RESOURCE_CATEGORIES = [
    "lecture", "worksheet", "assignment", "reference",
    "study_guide", "practice_test", "solutions", "notes"
]

# Grade levels
GRADE_LEVELS = [
    "Grade 1-4", "Grade 5-8", "Grade 9-10",
    "Grade 11-12", "University Level", "Professional"
]

def seed_tutor_students(db, tutor_ids, student_ids):
    """Create sample tutor-student relationships"""
    print("\nSeeding tutor_students table...")

    from models import TutorStudent

    tutor_students_data = []

    for tutor_id in tutor_ids[:10]:  # First 10 tutors
        # Each tutor has 3-8 students
        num_students = random.randint(3, 8)
        selected_students = random.sample(student_ids, min(num_students, len(student_ids)))

        for student_id in selected_students:
            enrollment_date = datetime.utcnow() - timedelta(days=random.randint(30, 365))

            # 70% current students, 30% alumni
            is_alumni = random.random() < 0.3

            # Courses the student takes
            num_courses = random.randint(1, 3)
            courses = random.sample(SUBJECTS, num_courses)

            tutor_student = TutorStudent(
                tutor_id=tutor_id,
                student_id=student_id,
                student_type='alumni' if is_alumni else 'current',
                courses=courses,
                enrollment_date=enrollment_date,
                completion_date=enrollment_date + timedelta(days=random.randint(90, 180)) if is_alumni else None,
                total_sessions=random.randint(5, 50) if is_alumni else random.randint(1, 20),
                status='completed' if is_alumni else 'active'
            )
            tutor_students_data.append(tutor_student)

    db.bulk_save_objects(tutor_students_data)
    db.commit()
    print(f"   Created {len(tutor_students_data)} tutor-student relationships")

def seed_tutor_analysis(db, tutor_ids):
    """Create sample analytics data for tutors"""
    print("\nSeeding tutor_analysis table...")

    from models import TutorAnalysis

    tutor_analysis_data = []

    for tutor_id in tutor_ids[:10]:  # First 10 tutors
        # Generate realistic metrics
        total_students = random.randint(5, 50)
        current_students = random.randint(2, min(20, total_students))
        alumni_students = total_students - current_students

        total_sessions = random.randint(10, 200)
        sessions_cancelled = random.randint(0, int(total_sessions * 0.1))
        sessions_completed = total_sessions - sessions_cancelled

        success_rate = round(random.uniform(75.0, 98.0), 2)

        # Rating metrics (4-factor system)
        subject_matter = round(random.uniform(4.0, 5.0), 2)
        communication = round(random.uniform(3.8, 5.0), 2)
        discipline = round(random.uniform(4.0, 5.0), 2)
        punctuality = round(random.uniform(3.5, 5.0), 2)
        average_rating = round((subject_matter + communication + discipline + punctuality) / 4, 2)

        analysis = TutorAnalysis(
            tutor_id=tutor_id,

            # Profile visit metrics
            total_profile_visits=random.randint(100, 5000),
            unique_visitors=random.randint(50, 2000),
            visits_this_month=random.randint(10, 500),
            visits_this_week=random.randint(5, 150),

            # Performance metrics
            success_rate=success_rate,
            average_response_time=round(random.uniform(0.5, 24.0), 2),  # Hours
            total_sessions_completed=sessions_completed,
            total_sessions_cancelled=sessions_cancelled,

            # Rating metrics
            average_rating=average_rating,
            total_reviews=random.randint(5, 100),
            avg_subject_understanding_rating=subject_matter,
            avg_communication_rating=communication,
            avg_discipline_rating=discipline,
            avg_punctuality_rating=punctuality,

            # Engagement metrics
            total_students=total_students,
            current_students=current_students,
            alumni_students=alumni_students,
            total_requests=random.randint(15, 250),
            improvement_rate=round(random.uniform(5.0, 25.0), 2),  # Percentage improvement

            # Revenue metrics (ETB)
            total_earnings=round(random.uniform(5000, 100000), 2),
            earnings_this_month=round(random.uniform(500, 15000), 2),

            # Additional analytics data
            analytics_data={
                "peak_hours": ["14:00-16:00", "18:00-20:00"],
                "most_taught_subject": random.choice(SUBJECTS),
                "student_satisfaction": round(random.uniform(85, 98), 1)
            },

            last_visit_update=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        )
        tutor_analysis_data.append(analysis)

    db.bulk_save_objects(tutor_analysis_data)
    db.commit()
    print(f"   Created {len(tutor_analysis_data)} tutor analysis records")

def seed_tutor_resources(db, tutor_ids):
    """Create sample resources for tutors"""
    print("\nSeeding tutor_resources table...")

    from models import TutorResource

    tutor_resources_data = []

    # Sample resource titles by type
    resource_titles = {
        "document": [
            "Complete Study Guide for {subject}",
            "{subject} Practice Problems Set",
            "Summary Notes - {subject} Chapter {n}",
            "Exam Preparation Guide - {subject}",
            "{subject} Quick Reference Sheet"
        ],
        "video": [
            "Introduction to {subject} - Lesson {n}",
            "{subject} Tutorial Series Part {n}",
            "Solving {subject} Problems - Advanced Techniques",
            "{subject} Concepts Explained Simply",
            "Step-by-Step {subject} Walkthrough"
        ],
        "image": [
            "{subject} Diagram Collection",
            "Visual Guide to {subject}",
            "{subject} Infographic - Key Concepts",
            "Mind Map - {subject} Overview",
            "{subject} Formula Sheet"
        ]
    }

    for tutor_id in tutor_ids[:10]:  # First 10 tutors
        # Each tutor has 5-15 resources
        num_resources = random.randint(5, 15)

        for i in range(num_resources):
            resource_type = random.choice(["document", "video", "image"])
            subject = random.choice(SUBJECTS)

            # Pick a title template and format it
            title_template = random.choice(resource_titles[resource_type])
            title = title_template.format(
                subject=subject,
                n=random.randint(1, 10)
            )

            # Mock Backblaze B2 URL
            file_extension = {
                "document": "pdf",
                "video": "mp4",
                "image": "jpg"
            }[resource_type]

            file_name = f"{title.lower().replace(' ', '_')}.{file_extension}"
            file_url = f"https://s3.eu-central-003.backblazeb2.com/astegni-media/documents/resources/user_{tutor_id}/{file_name}"

            resource = TutorResource(
                tutor_id=tutor_id,
                title=title,
                description=f"Comprehensive {resource_type} resource for {subject}. Great for {random.choice(GRADE_LEVELS)} students.",
                resource_type=resource_type,
                category=random.choice(RESOURCE_CATEGORIES),
                file_url=file_url,
                file_name=file_name,
                file_size=random.randint(100000, 50000000),  # 100KB - 50MB
                file_type={
                    "document": "application/pdf",
                    "video": "video/mp4",
                    "image": "image/jpeg"
                }[resource_type],
                subject=subject,
                grade_level=random.choice(GRADE_LEVELS),
                tags=random.sample(["study", "exam", "practice", "theory", "advanced", "beginner"], k=random.randint(2, 4)),
                visibility=random.choice(["private", "students_only", "public"]),
                download_count=random.randint(0, 500),
                view_count=random.randint(0, 2000),
                status="active"
            )
            tutor_resources_data.append(resource)

    db.bulk_save_objects(tutor_resources_data)
    db.commit()
    print(f"   Created {len(tutor_resources_data)} tutor resources")

def get_sample_user_ids(db):
    """Get sample tutor and student IDs from the database"""
    from models import User, TutorProfile, StudentProfile

    # Get tutors
    tutors = db.query(User).join(TutorProfile).limit(10).all()
    tutor_ids = [t.id for t in tutors]

    # Get students
    students = db.query(User).join(StudentProfile).limit(20).all()
    student_ids = [s.id for s in students]

    return tutor_ids, student_ids

def seed_all():
    """Seed all tutor-related tables"""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("Starting tutor tables seeding process...")
        print("=" * 60)

        # Get sample user IDs
        tutor_ids, student_ids = get_sample_user_ids(db)

        if not tutor_ids:
            print("\nNo tutors found in database. Please run seed_tutor_data.py first.")
            return

        if not student_ids:
            print("\nNo students found in database. Please run seed_student_data.py first.")
            return

        print(f"\nFound {len(tutor_ids)} tutors and {len(student_ids)} students")

        # Seed tables
        seed_tutor_students(db, tutor_ids, student_ids)
        seed_tutor_analysis(db, tutor_ids)
        seed_tutor_resources(db, tutor_ids)

        print("\n" + "=" * 60)
        print("Seeding completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\nError during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
