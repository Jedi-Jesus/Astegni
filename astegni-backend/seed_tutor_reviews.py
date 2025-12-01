"""
Seed tutor reviews for testing
Adds sample reviews from students and parents for tutor_id 85
"""

import psycopg
from datetime import datetime, timedelta
import random
import sys
import io

# Fix Unicode encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

# Sample reviews data
REVIEWS_DATA = [
    {
        "reviewer_name": "Abeba Tadesse",
        "reviewer_type": "student",
        "rating": 5,
        "review_text": "Mr. Dawit is an excellent math teacher! He explains complex calculus concepts in a way that's easy to understand. My grades improved from C to A in just 3 months.",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/student-teenage-girl.jpg",
        "days_ago": 2
    },
    {
        "reviewer_name": "Solomon Bekele",
        "reviewer_type": "parent",
        "rating": 5,
        "review_text": "As a parent, I'm very impressed with the dedication and professionalism. My daughter's confidence in mathematics has grown tremendously. Highly recommend!",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/Dad-profile.jpg",
        "days_ago": 5
    },
    {
        "reviewer_name": "Hanna Gebremedhin",
        "reviewer_type": "student",
        "rating": 4,
        "review_text": "Great tutor with good teaching methods. Sometimes the sessions run a bit over time, but the quality of instruction makes up for it. Would definitely recommend.",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/student-college-girl.jpg",
        "days_ago": 8
    },
    {
        "reviewer_name": "Meaza Alemayehu",
        "reviewer_type": "parent",
        "rating": 5,
        "review_text": "My son was struggling with physics, but after just two weeks of tutoring, he's now one of the top students in his class. Excellent communication and very patient.",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/Mom-profile.jpg",
        "days_ago": 12
    },
    {
        "reviewer_name": "Dawit Hailu",
        "reviewer_type": "student",
        "rating": 5,
        "review_text": "Best chemistry tutor I've ever had! Makes complex reactions easy to visualize and remember. Passed my university entrance exam with flying colors thanks to these sessions.",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/student-college-boy.jpg",
        "days_ago": 15
    },
    {
        "reviewer_name": "Tigist Wondimu",
        "reviewer_type": "student",
        "rating": 4,
        "review_text": "Very knowledgeable and patient teacher. Helped me understand biology concepts I'd been struggling with all semester. Only wish sessions were a bit longer.",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/student-teenage-girl-1.jpg",
        "days_ago": 18
    },
    {
        "reviewer_name": "Yohannes Tesfa",
        "reviewer_type": "parent",
        "rating": 5,
        "review_text": "Outstanding tutor! My twin daughters were both struggling with math, and now they're both excelling. Very professional, always on time, and genuinely cares about student success.",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/Dad-profile.jpg",
        "days_ago": 21
    },
    {
        "reviewer_name": "Sara Negash",
        "reviewer_type": "student",
        "rating": 5,
        "review_text": "Incredible teacher! The digital whiteboard sessions are so interactive and engaging. I actually look forward to my tutoring sessions now. Thank you!",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/student-teenage-girl.jpg",
        "days_ago": 25
    },
    {
        "reviewer_name": "Addis Kebede",
        "reviewer_type": "student",
        "rating": 4,
        "review_text": "Really good at explaining difficult concepts step by step. The homework help is invaluable. Sometimes the internet connection drops, but overall great experience.",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/student-kid-boy.jpg",
        "days_ago": 30
    },
    {
        "reviewer_name": "Rahel Assefa",
        "reviewer_type": "parent",
        "rating": 5,
        "review_text": "As a mother of three, finding a reliable tutor was challenging. This tutor has been a blessing! All my children have shown remarkable improvement in their studies. Worth every birr!",
        "reviewer_picture": "/uploads/system_images/system_profile_pictures/Mom-profile.jpg",
        "days_ago": 35
    }
]

def seed_reviews():
    """Seed tutor reviews for tutor_id 85"""

    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("🔄 Seeding tutor reviews for tutor_id 85...")

        # First, check if tutor_reviews table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_reviews'
            );
        """)
        table_exists = cur.fetchone()[0]

        if not table_exists:
            print("❌ Error: tutor_reviews table does not exist!")
            print("   Please create the table first using the appropriate migration script.")
            return

        # Check table schema
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutor_reviews'
            ORDER BY ordinal_position;
        """)
        columns = cur.fetchall()
        print(f"\n📋 Table schema (tutor_reviews):")
        for col_name, col_type in columns:
            print(f"   - {col_name}: {col_type}")

        # Get some user IDs with student role from users table
        cur.execute("""
            SELECT id FROM users
            WHERE roles::text LIKE '%student%'
            ORDER BY RANDOM()
            LIMIT 10;
        """)
        student_ids = [row[0] for row in cur.fetchall()]

        if len(student_ids) == 0:
            print(f"❌ Error: No users with student role found. Please create some student users first.")
            return

        if len(student_ids) < 10:
            print(f"⚠️  Warning: Only found {len(student_ids)} student users. Creating with available IDs...")

        # Delete existing reviews for tutor_id 85
        cur.execute("DELETE FROM tutor_reviews WHERE tutor_id = 85;")
        deleted_count = cur.rowcount
        print(f"\n🗑️  Deleted {deleted_count} existing reviews for tutor_id 85")

        # Insert new reviews
        insert_query = """
            INSERT INTO tutor_reviews (
                tutor_id,
                student_id,
                rating,
                title,
                review_text,
                subject_matter_rating,
                communication_rating,
                discipline_rating,
                punctuality_rating,
                is_verified,
                is_featured,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, rating;
        """

        inserted_count = 0
        for i, review_data in enumerate(REVIEWS_DATA):
            if i >= len(student_ids):
                print(f"⚠️  Skipping remaining reviews - not enough student IDs")
                break

            created_at = datetime.now() - timedelta(days=review_data['days_ago'])

            # Mark first 3 reviews as featured (for Success Stories widget)
            is_featured = inserted_count < 3

            # Generate varied ratings for the 4-factor system
            base_rating = review_data['rating']
            subject_rating = min(5, base_rating + random.uniform(-0.5, 0.5))
            comm_rating = min(5, base_rating + random.uniform(-0.5, 0.5))
            discipline_rating = min(5, base_rating + random.uniform(-0.5, 0.5))
            punctuality_rating = min(5, base_rating + random.uniform(-0.5, 0.5))

            cur.execute(insert_query, (
                85,  # tutor_id
                student_ids[i],  # student_id from available student profiles
                review_data['rating'],
                f"Review from {review_data['reviewer_name']}",  # title
                review_data['review_text'],
                subject_rating,  # subject_matter_rating
                comm_rating,  # communication_rating
                discipline_rating,  # discipline_rating
                punctuality_rating,  # punctuality_rating
                True,  # is_verified (all reviews are verified)
                is_featured,  # is_featured
                created_at
            ))

            result = cur.fetchone()
            inserted_count += 1
            featured_badge = "⭐ FEATURED" if is_featured else ""
            print(f"   ✓ Added review #{result[0]}: {review_data['reviewer_name']} - {result[1]} stars {featured_badge}")

        # Commit transaction
        conn.commit()

        # Verify insertion
        cur.execute("""
            SELECT COUNT(*),
                   AVG(rating)::DECIMAL(3,2),
                   AVG(subject_matter_rating)::DECIMAL(3,2),
                   AVG(communication_rating)::DECIMAL(3,2),
                   AVG(discipline_rating)::DECIMAL(3,2),
                   AVG(punctuality_rating)::DECIMAL(3,2),
                   COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_reviews
            FROM tutor_reviews
            WHERE tutor_id = 85;
        """)

        stats = cur.fetchone()
        total_reviews, avg_rating, avg_subject, avg_comm, avg_disc, avg_punct, featured_reviews = stats

        print(f"\n✅ Successfully seeded {inserted_count} reviews for tutor_id 85!")
        print(f"\n📊 Review Statistics:")
        print(f"   • Total Reviews: {total_reviews}")
        print(f"   • Average Overall Rating: {avg_rating} ⭐")
        print(f"   • Average Subject Matter: {avg_subject} ⭐")
        print(f"   • Average Communication: {avg_comm} ⭐")
        print(f"   • Average Discipline: {avg_disc} ⭐")
        print(f"   • Average Punctuality: {avg_punct} ⭐")
        print(f"   • Featured Reviews: {featured_reviews}")

        # Show sample of inserted reviews
        cur.execute("""
            SELECT title, rating,
                   LEFT(review_text, 60) as preview,
                   is_featured
            FROM tutor_reviews
            WHERE tutor_id = 85
            ORDER BY created_at DESC
            LIMIT 5;
        """)

        print(f"\n📝 Sample Reviews (Most Recent):")
        for row in cur.fetchall():
            title, rating, preview, is_featured = row
            featured_marker = " 🌟" if is_featured else ""
            print(f"   • {title}: {rating}★ - \"{preview}...\"{featured_marker}")

        # Close connection
        cur.close()
        conn.close()

        print(f"\n🚀 Ready to test! Open tutor-profile.html and check:")
        print(f"   1. Dashboard → Recent Reviews section")
        print(f"   2. Sidebar → Ratings & Reviews panel")
        print(f"   Both should show reviews with Success Stories styling!")

    except psycopg.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    seed_reviews()
