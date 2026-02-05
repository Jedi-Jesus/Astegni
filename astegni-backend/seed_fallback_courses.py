"""
Seed Fallback Courses from index.html course-flip.js

Seeds all 16 hardcoded fallback courses as Tier 1 (highest grade)
with excellent ratings and substantial rating counts
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All 16 hardcoded courses from course-flip.js (8 front + 8 back)
FALLBACK_COURSES = [
    # Front side courses
    {
        "course_name": "Mathematics",
        "course_category": "STEM",
        "course_level": "Beginner",
        "course_description": "Master the fundamentals of mathematics including algebra, geometry, and calculus. Perfect for students building a strong foundation.",
        "thumbnail": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500",
        "icon": "📐",
        "rating": 4.8,
        "rating_count": 250,
        "search_count": 150,
        "trending_score": 105.0
    },
    {
        "course_name": "Physics",
        "course_category": "STEM",
        "course_level": "Intermediate",
        "course_description": "Explore the fundamental laws of nature, from mechanics to thermodynamics and electromagnetism.",
        "thumbnail": "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=500",
        "icon": "⚛️",
        "rating": 4.9,
        "rating_count": 180,
        "search_count": 120,
        "trending_score": 84.0
    },
    {
        "course_name": "Chemistry",
        "course_category": "STEM",
        "course_level": "Advanced",
        "course_description": "Dive into the world of chemical reactions, molecular structures, and laboratory techniques.",
        "thumbnail": "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=500",
        "icon": "🧪",
        "rating": 4.7,
        "rating_count": 120,
        "search_count": 90,
        "trending_score": 63.0
    },
    {
        "course_name": "Music",
        "course_category": "Arts",
        "course_level": "Beginner",
        "course_description": "Learn music theory, instrument playing, and develop your musical talents from the ground up.",
        "thumbnail": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500",
        "icon": "🎵",
        "rating": 4.8,
        "rating_count": 300,
        "search_count": 200,
        "trending_score": 140.0
    },
    {
        "course_name": "English",
        "course_category": "Languages",
        "course_level": "All Levels",
        "course_description": "Master English language skills including reading, writing, speaking, and comprehension for all proficiency levels.",
        "thumbnail": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500",
        "icon": "🇬🇧",
        "rating": 4.9,
        "rating_count": 400,
        "search_count": 250,
        "trending_score": 175.0
    },
    {
        "course_name": "Business",
        "course_category": "Business",
        "course_level": "Intermediate",
        "course_description": "Learn business fundamentals including management, finance, and entrepreneurship strategies.",
        "thumbnail": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500",
        "icon": "📊",
        "rating": 4.8,
        "rating_count": 200,
        "search_count": 130,
        "trending_score": 91.0
    },
    {
        "course_name": "Photography",
        "course_category": "Arts",
        "course_level": "All Levels",
        "course_description": "Master the art of photography from camera basics to advanced composition and editing techniques.",
        "thumbnail": "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=500",
        "icon": "📸",
        "rating": 4.7,
        "rating_count": 150,
        "search_count": 100,
        "trending_score": 70.0
    },
    {
        "course_name": "Special Needs Education",
        "course_category": "Education",
        "course_level": "Beginner",
        "course_description": "Learn specialized teaching methods and support strategies for students with diverse learning needs.",
        "thumbnail": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500",
        "icon": "♿",
        "rating": 4.6,
        "rating_count": 90,
        "search_count": 60,
        "trending_score": 42.0
    },

    # Back side courses (when cards flip)
    {
        "course_name": "Cosmetology",
        "course_category": "Beauty & Wellness",
        "course_level": "All Levels",
        "course_description": "Master hair styling, makeup application, and beauty treatments with professional techniques.",
        "thumbnail": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500",
        "icon": "💄",
        "rating": 4.9,
        "rating_count": 120,
        "search_count": 80,
        "trending_score": 56.0
    },
    {
        "course_name": "Programming",
        "course_category": "Technology",
        "course_level": "Beginner",
        "course_description": "Learn coding fundamentals, software development, and programming languages from scratch.",
        "thumbnail": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500",
        "icon": "💻",
        "rating": 5.0,
        "rating_count": 500,
        "search_count": 350,
        "trending_score": 245.0
    },
    {
        "course_name": "Sports Training",
        "course_category": "Sports & Fitness",
        "course_level": "All Levels",
        "course_description": "Develop athletic skills, physical fitness, and sports technique with professional coaching methods.",
        "thumbnail": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500",
        "icon": "🏃",
        "rating": 4.6,
        "rating_count": 80,
        "search_count": 50,
        "trending_score": 35.0
    },
    {
        "course_name": "Culinary Arts",
        "course_category": "Arts",
        "course_level": "Intermediate",
        "course_description": "Master cooking techniques, food preparation, and culinary creativity from professional chefs.",
        "thumbnail": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500",
        "icon": "🍳",
        "rating": 4.7,
        "rating_count": 60,
        "search_count": 40,
        "trending_score": 28.0
    },
    {
        "course_name": "Chinese Language",
        "course_category": "Languages",
        "course_level": "Beginner",
        "course_description": "Learn Mandarin Chinese from basics to conversational fluency with native speakers.",
        "thumbnail": "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=500",
        "icon": "🇨🇳",
        "rating": 4.8,
        "rating_count": 150,
        "search_count": 100,
        "trending_score": 70.0
    },
    {
        "course_name": "Marketing",
        "course_category": "Business",
        "course_level": "Advanced",
        "course_description": "Master digital marketing, brand strategy, and customer engagement techniques for modern businesses.",
        "thumbnail": "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=500",
        "icon": "🎯",
        "rating": 4.9,
        "rating_count": 180,
        "search_count": 110,
        "trending_score": 77.0
    },
    {
        "course_name": "Graphic Design",
        "course_category": "Arts",
        "course_level": "Intermediate",
        "course_description": "Learn visual design, typography, and creative software tools to create stunning graphics.",
        "thumbnail": "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500",
        "icon": "🎨",
        "rating": 4.8,
        "rating_count": 220,
        "search_count": 140,
        "trending_score": 98.0
    },
    {
        "course_name": "Sign Language",
        "course_category": "Languages",
        "course_level": "All Levels",
        "course_description": "Learn sign language communication to connect with the deaf and hard-of-hearing community.",
        "thumbnail": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500",
        "icon": "🤟",
        "rating": 4.7,
        "rating_count": 110,
        "search_count": 70,
        "trending_score": 49.0
    }
]

def seed_courses():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("SEEDING TIER 1 FALLBACK COURSES")
        print("=" * 80)

        # Check if courses already exist
        existing = db.execute(text("SELECT COUNT(*) FROM courses")).scalar()
        if existing > 0:
            print(f"\n⚠️  Warning: {existing} courses already exist in database.")
            response = input("Do you want to add these courses anyway? (yes/no): ")
            if response.lower() != 'yes':
                print("Seeding cancelled.")
                return

        print(f"\nSeeding {len(FALLBACK_COURSES)} Tier 1 courses...")

        # Create a default uploader_id (use 1 for system/admin)
        uploader_id = 1

        inserted_count = 0
        for course in FALLBACK_COURSES:
            try:
                # Randomize created_at to spread courses over last 3 months
                days_ago = random.randint(1, 90)
                created_at = datetime.utcnow() - timedelta(days=days_ago)

                # Insert course
                db.execute(text("""
                    INSERT INTO courses (
                        uploader_id,
                        course_name,
                        course_category,
                        course_level,
                        course_description,
                        thumbnail,
                        duration,
                        lessons,
                        rating,
                        rating_count,
                        search_count,
                        trending_score,
                        last_search_increment,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        :uploader_id,
                        :course_name,
                        :course_category,
                        :course_level,
                        :course_description,
                        :thumbnail,
                        :duration,
                        :lessons,
                        :rating,
                        :rating_count,
                        :search_count,
                        :trending_score,
                        :last_search_increment,
                        'approved',
                        :created_at,
                        :updated_at
                    )
                """), {
                    "uploader_id": uploader_id,
                    "course_name": course["course_name"],
                    "course_category": course["course_category"],
                    "course_level": course["course_level"],
                    "course_description": course["course_description"],
                    "thumbnail": course.get("thumbnail"),
                    "duration": random.randint(30, 120),  # 30-120 hours
                    "lessons": random.randint(20, 60),    # 20-60 lessons
                    "rating": course["rating"],
                    "rating_count": course["rating_count"],
                    "search_count": course["search_count"],
                    "trending_score": course["trending_score"],
                    "last_search_increment": datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                    "created_at": created_at,
                    "updated_at": created_at
                })

                print(f"✓ Inserted: {course['icon']} {course['course_name']} "
                      f"(Rating: {course['rating']:.1f}⭐, "
                      f"Reviews: {course['rating_count']}, "
                      f"Searches: {course['search_count']})")
                inserted_count += 1

            except Exception as e:
                print(f"✗ Failed to insert {course['course_name']}: {str(e)}")

        db.commit()

        print("\n" + "=" * 80)
        print(f"✅ Successfully seeded {inserted_count}/{len(FALLBACK_COURSES)} courses!")
        print("=" * 80)

        # Show summary statistics
        result = db.execute(text("""
            SELECT
                COUNT(*) as total,
                AVG(rating) as avg_rating,
                SUM(rating_count) as total_reviews,
                SUM(search_count) as total_searches,
                AVG(trending_score) as avg_trending
            FROM courses
        """))
        stats = result.fetchone()

        print("\n📊 Course Database Statistics:")
        print(f"  Total courses: {stats[0]}")
        print(f"  Average rating: {stats[1]:.2f}⭐")
        print(f"  Total reviews: {stats[2]}")
        print(f"  Total searches tracked: {stats[3]}")
        print(f"  Average trending score: {stats[4]:.2f}")

        print("\n🎯 Top 5 Trending Courses:")
        top_courses = db.execute(text("""
            SELECT course_name, rating, search_count, trending_score
            FROM courses
            ORDER BY trending_score DESC
            LIMIT 5
        """))

        for i, course in enumerate(top_courses, 1):
            print(f"  {i}. {course[0]} - {course[1]:.1f}⭐, "
                  f"{course[2]} searches, trending_score={course[3]:.1f}")

        print("\n" + "=" * 80)
        print("✨ All courses are now Tier 1 with highest ratings!")
        print("Index.html will now show trending courses from database instead of fallback.")
        print("=" * 80)

    except Exception as e:
        print(f"\n✗ Seeding failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_courses()
