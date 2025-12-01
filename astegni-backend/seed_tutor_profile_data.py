"""
Seed script to populate tutor profiles with comprehensive sample data
Includes hero sections, reviews, activities, schedules, and stats
"""

import sys
import os
import random
from datetime import datetime, date, time, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from config import DATABASE_URL

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ethiopian names and data
ETHIOPIAN_FIRST_NAMES_MALE = [
    "Abebe", "Tadesse", "Kebede", "Mulugeta", "Bekele", "Tesfaye", "Getachew",
    "Haile", "Girma", "Dawit", "Solomon", "Daniel", "Samuel", "Yohannes", "Ermias"
]

ETHIOPIAN_FIRST_NAMES_FEMALE = [
    "Almaz", "Tigist", "Hiwot", "Meskerem", "Selam", "Bethlehem", "Sara",
    "Mulu", "Senait", "Rahel", "Eden", "Mahlet", "Meron", "Kidist", "Tsion"
]

ETHIOPIAN_FATHER_NAMES = [
    "Gebre", "Desta", "Worku", "Alemu", "Tessema", "Mekonnen", "Asfaw",
    "Beyene", "Mengistu", "Hailu", "Wolde", "Assefa", "Negash", "Tekle"
]

SUBJECTS = [
    "Mathematics", "Physics", "Chemistry", "Biology", "English", "Amharic",
    "History", "Geography", "Economics", "ICT", "Civics", "French"
]

GRADE_LEVELS = [
    "Grade 1-6", "Grade 7-8", "Grade 9-10", "Grade 11-12", "University Level"
]

CITIES = [
    "Addis Ababa", "Bahir Dar", "Hawassa", "Mekelle", "Dire Dawa",
    "Jimma", "Adama", "Gondar", "Dessie", "Harar"
]

REVIEW_TITLES = [
    "Outstanding Teacher",
    "Excellent Educator",
    "Great Learning Experience",
    "Highly Recommended",
    "Patient and Knowledgeable",
    "Transformed My Understanding",
    "Amazing Results",
    "Professional and Dedicated",
    "Best Tutor I've Had",
    "Exceptional Teaching Skills"
]

REVIEW_TEXTS = [
    "This tutor has significantly improved my understanding of the subject. Their teaching methods are clear and effective.",
    "I've learned more in a few sessions than I did in months of self-study. Highly professional and patient.",
    "Excellent at explaining complex concepts in simple terms. My grades have improved dramatically.",
    "Very knowledgeable and always prepared. Makes learning enjoyable and engaging.",
    "Patient, understanding, and always willing to explain things multiple times if needed.",
    "The best investment in my education. Results speak for themselves.",
    "Creates a comfortable learning environment. I look forward to every session.",
    "Helped me prepare for exams and exceeded my expectations. Truly dedicated to student success.",
    "Flexible schedule and always punctual. Great communication and teaching style.",
    "Uses real-world examples that make learning relevant and interesting."
]

ACTIVITY_TYPES = {
    "enrollment": {
        "icons": ["📖", "📚"],
        "colors": ["blue-500", "indigo-500"],
        "titles": ["New student enrolled in {subject}", "Student joined {subject} course"]
    },
    "review": {
        "icons": ["⭐", "🌟"],
        "colors": ["yellow-500", "amber-500"],
        "titles": ["5-star review received", "Positive review from student", "Student left feedback"]
    },
    "payment": {
        "icons": ["💰", "💵"],
        "colors": ["green-500", "emerald-500"],
        "titles": ["Payment received: ETB {amount}", "Session payment completed"]
    },
    "session_request": {
        "icons": ["📝", "📅"],
        "colors": ["purple-500", "violet-500"],
        "titles": ["New session request", "Student requested tutoring session"]
    }
}

def seed_tutor_data():
    """Seed comprehensive tutor profile data"""
    db = SessionLocal()

    try:
        print("Starting comprehensive tutor profile data seeding...")

        # Get all tutor profiles
        result = db.execute(text("SELECT id, user_id FROM tutor_profiles LIMIT 100"))
        tutors = result.fetchall()

        if not tutors:
            print("No tutor profiles found. Please run seed_tutor_data.py first.")
            return

        print(f"\nFound {len(tutors)} tutor profiles to update")

        # Update each tutor with comprehensive data
        for idx, (tutor_id, user_id) in enumerate(tutors, 1):
            print(f"\n[{idx}/{len(tutors)}] Updating tutor ID {tutor_id}...")

            # Generate random stats
            students_taught = random.randint(50, 2000)
            courses_created = random.randint(5, 50)
            current_students = random.randint(10, 100)
            total_sessions = random.randint(100, 5000)
            rating = round(random.uniform(4.0, 5.0), 1)
            rating_count = random.randint(20, 500)

            # Calculate metrics
            retention_score = round(random.uniform(4.3, 5.0), 1)
            discipline_score = round(random.uniform(4.0, 5.0), 1)
            punctuality_score = round(random.uniform(4.2, 5.0), 1)
            subject_matter_score = round(random.uniform(4.5, 5.0), 1)
            communication_score = round(random.uniform(4.0, 5.0), 1)

            # Dashboard stats
            success_rate = round(random.uniform(75.0, 98.0), 1)
            monthly_earnings = round(random.uniform(5000, 50000), 2)
            total_hours = round(random.uniform(500, 10000), 1)

            # Weekly stats
            sessions_this_week = random.randint(5, 25)
            hours_this_week = round(sessions_this_week * random.uniform(0.5, 2.0), 1)
            attendance_rate = round(random.uniform(80.0, 100.0), 1)
            teaching_streak = random.randint(0, 100)
            weekly_goal = round(random.uniform(60.0, 100.0), 1)

            # Connection stats
            total_connections = current_students + random.randint(50, 200)
            total_colleagues = random.randint(10, 50)

            # Hero titles (some custom, some default)
            hero_titles = [
                "Excellence in Education, Delivered with Passion",
                "Transforming Students into Scholars",
                "Your Success is My Mission",
                "Quality Education, Proven Results",
                "Empowering Minds, Building Futures"
            ]
            hero_title = random.choice(hero_titles)

            hero_subtitles = [
                "Empowering students through personalized learning and expert guidance",
                "Dedicated to academic excellence and student success",
                "Making complex subjects simple and understandable",
                "Professional tutoring with a personal touch",
                "Committed to your educational journey"
            ]
            hero_subtitle = random.choice(hero_subtitles)

            # Update tutor profile
            update_query = text("""
                UPDATE tutor_profiles SET
                    hero_title = :hero_title,
                    hero_subtitle = :hero_subtitle,
                    students_taught = :students_taught,
                    courses_created = :courses_created,
                    retention_score = :retention_score,
                    discipline_score = :discipline_score,
                    punctuality_score = :punctuality_score,
                    subject_matter_score = :subject_matter_score,
                    communication_score = :communication_score,
                    current_students = :current_students,
                    success_rate = :success_rate,
                    monthly_earnings = :monthly_earnings,
                    total_hours_taught = :total_hours,
                    sessions_this_week = :sessions_this_week,
                    hours_this_week = :hours_this_week,
                    attendance_rate = :attendance_rate,
                    teaching_streak_days = :teaching_streak,
                    weekly_goal_progress = :weekly_goal,
                    total_connections = :total_connections,
                    total_colleagues = :total_colleagues,
                    rating = :rating,
                    rating_count = :rating_count,
                    total_students = :students_taught,
                    total_sessions = :total_sessions
                WHERE id = :tutor_id
            """)

            db.execute(update_query, {
                "tutor_id": tutor_id,
                "hero_title": hero_title,
                "hero_subtitle": hero_subtitle,
                "students_taught": students_taught,
                "courses_created": courses_created,
                "retention_score": retention_score,
                "discipline_score": discipline_score,
                "punctuality_score": punctuality_score,
                "subject_matter_score": subject_matter_score,
                "communication_score": communication_score,
                "current_students": current_students,
                "success_rate": success_rate,
                "monthly_earnings": monthly_earnings,
                "total_hours": total_hours,
                "sessions_this_week": sessions_this_week,
                "hours_this_week": hours_this_week,
                "attendance_rate": attendance_rate,
                "teaching_streak": teaching_streak,
                "weekly_goal": weekly_goal,
                "total_connections": total_connections,
                "total_colleagues": total_colleagues,
                "rating": rating,
                "rating_count": rating_count,
                "total_sessions": total_sessions
            })

            print(f"  ✓ Updated profile stats")

            # Get student users for reviews
            students_result = db.execute(text("""
                SELECT id, first_name, father_name
                FROM users
                WHERE roles::jsonb ? 'student'
                LIMIT 20
            """))
            students = students_result.fetchall()

            if students:
                # Create 3-10 reviews for this tutor
                num_reviews = random.randint(3, min(10, len(students)))
                selected_students = random.sample(students, num_reviews)

                for student_id, first_name, father_name in selected_students:
                    review_rating = round(random.uniform(4.0, 5.0), 1)

                    review_query = text("""
                        INSERT INTO tutor_reviews (
                            tutor_id, student_id, rating, title, review_text,
                            retention_rating, discipline_rating, punctuality_rating,
                            subject_matter_rating, communication_rating,
                            is_verified, helpful_count, created_at
                        ) VALUES (
                            :tutor_id, :student_id, :rating, :title, :review_text,
                            :retention, :discipline, :punctuality,
                            :subject_matter, :communication,
                            :is_verified, :helpful_count, :created_at
                        )
                    """)

                    db.execute(review_query, {
                        "tutor_id": tutor_id,
                        "student_id": student_id,
                        "rating": review_rating,
                        "title": random.choice(REVIEW_TITLES),
                        "review_text": random.choice(REVIEW_TEXTS),
                        "retention": round(random.uniform(4.0, 5.0), 1),
                        "discipline": round(random.uniform(4.0, 5.0), 1),
                        "punctuality": round(random.uniform(4.0, 5.0), 1),
                        "subject_matter": round(random.uniform(4.5, 5.0), 1),
                        "communication": round(random.uniform(4.0, 5.0), 1),
                        "is_verified": random.choice([True, True, False]),
                        "helpful_count": random.randint(0, 50),
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 365))
                    })

                print(f"  ✓ Created {num_reviews} reviews")

            # Create 5-15 recent activities
            num_activities = random.randint(5, 15)
            for _ in range(num_activities):
                activity_type = random.choice(list(ACTIVITY_TYPES.keys()))
                activity_config = ACTIVITY_TYPES[activity_type]

                title_template = random.choice(activity_config["titles"])
                if "{subject}" in title_template:
                    title = title_template.format(subject=random.choice(SUBJECTS))
                elif "{amount}" in title_template:
                    amount = random.randint(500, 5000)
                    title = title_template.format(amount=amount)
                else:
                    title = title_template

                activity_query = text("""
                    INSERT INTO tutor_activities (
                        tutor_id, activity_type, title, icon, color,
                        amount, is_read, created_at
                    ) VALUES (
                        :tutor_id, :activity_type, :title, :icon, :color,
                        :amount, :is_read, :created_at
                    )
                """)

                db.execute(activity_query, {
                    "tutor_id": tutor_id,
                    "activity_type": activity_type,
                    "title": title,
                    "icon": random.choice(activity_config["icons"]),
                    "color": random.choice(activity_config["colors"]),
                    "amount": random.randint(500, 5000) if activity_type == "payment" else None,
                    "is_read": random.choice([True, False]),
                    "created_at": datetime.utcnow() - timedelta(hours=random.randint(1, 720))
                })

            print(f"  ✓ Created {num_activities} activities")

            # Create schedule for next 7 days
            today = date.today()
            sessions_per_day = random.randint(2, 5)

            for day_offset in range(7):
                schedule_date = today + timedelta(days=day_offset)
                num_sessions = random.randint(1, sessions_per_day)

                for session_num in range(num_sessions):
                    start_hour = random.randint(8, 18)
                    start_minute = random.choice([0, 30])
                    duration = random.choice([60, 90, 120])

                    start_time_obj = time(start_hour, start_minute)
                    end_hour = start_hour + (duration // 60)
                    end_minute = start_minute + (duration % 60)
                    if end_minute >= 60:
                        end_hour += 1
                        end_minute -= 60
                    end_time_obj = time(end_hour % 24, end_minute)

                    schedule_query = text("""
                        INSERT INTO tutor_schedules (
                            tutor_id, schedule_date, start_time, end_time,
                            subject, grade_level, session_format, status, created_at
                        ) VALUES (
                            :tutor_id, :schedule_date, :start_time, :end_time,
                            :subject, :grade_level, :session_format, :status, :created_at
                        )
                    """)

                    db.execute(schedule_query, {
                        "tutor_id": tutor_id,
                        "schedule_date": schedule_date,
                        "start_time": start_time_obj,
                        "end_time": end_time_obj,
                        "subject": random.choice(SUBJECTS),
                        "grade_level": random.choice(GRADE_LEVELS),
                        "session_format": random.choice(["Online", "In-person"]),
                        "status": "scheduled" if day_offset > 0 else random.choice(["scheduled", "in_progress"]),
                        "created_at": datetime.utcnow()
                    })

            print(f"  ✓ Created schedule for next 7 days")

        # Commit all changes
        db.commit()
        print(f"\n✅ Successfully seeded data for {len(tutors)} tutors!")
        print("\nData seeded includes:")
        print("  - Hero section (title, subtitle, stats)")
        print("  - Detailed rating metrics (retention, discipline, etc.)")
        print("  - Dashboard statistics (current students, success rate, earnings)")
        print("  - Weekly stats and teaching streaks")
        print("  - Connection statistics")
        print("  - Student reviews with detailed ratings")
        print("  - Recent activity timeline")
        print("  - Weekly schedule entries")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding data: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_tutor_data()
