#!/usr/bin/env python3
"""
Video Database Seeding Script for Astegni Platform
Seeds video reels, engagements, and comments
"""

import os
import sys
from tempfile import template
import psycopg
import json
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv("main.env")

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "astegni_db")
DB_USER = os.getenv("DB_USER", "astegni_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Astegni2025")


def check_and_create_tables(cursor, conn):
    """Check if video tables exist and create them if not"""
    print("\n📦 Checking video tables...")

    # Check if video_reels table exists
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'video_reels'
        );
    """
    )

    if not cursor.fetchone()[0]:
        print("  Creating video tables...")
        # Import models to create tables
        try:
            from app import Base, engine
            from video_models import (
                VideoReel,
                VideoEngagement,
                VideoComment,
                Playlist,
                PlaylistItem,
                TutorFollow,
            )

            Base.metadata.create_all(bind=engine)
            print("  ✅ Video tables created successfully")
        except Exception as e:
            print(f"  ⚠️ Error creating tables: {e}")
            return False
    else:
        print("  ✅ Video tables already exist")

    return True


def seed_video_reels(cursor, conn):
    """Seed video reels data"""
    print("\n🎬 Seeding video reels...")

    # Check if videos already exist
    cursor.execute("SELECT COUNT(*) FROM video_reels")
    existing_count = cursor.fetchone()[0]
    if existing_count > 0:
        print(f"  Found {existing_count} existing video reels.")
        response = input("  Do you want to add more videos? (y/n): ")
        if response.lower() != "y":
            return

    # Get tutors
    cursor.execute(
        """
        SELECT id, first_name, last_name 
        FROM users 
        WHERE roles::jsonb @> '["tutor"]'
        ORDER BY id
    """
    )
    tutors = cursor.fetchall()

    if not tutors:
        print("  ❌ No tutors found. Please seed tutors first using init_db.py")
        return

    print(f"  Found {len(tutors)} tutors")

    # Video templates - using local video paths and sample URLs
    video_templates = [
        {
            "title": "Introduction to Algebra",
            "video_number": "#001",
            "description": "Learn the fundamentals of algebra with easy-to-follow examples and practice problems. This comprehensive tutorial covers basic algebraic concepts.",
            "video_url": "../videos/test-video-1.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=1",
            "duration": "12:34",
            "category": "mathematics",
            "subject": "Mathematics",
            "grade_level": "Grade 9-10",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Physics: Laws of Motion",
            "video_number": "#002",
            "description": "Understanding Newton's laws of motion through real-world applications and demonstrations. Perfect for high school physics students.",
            "video_url": "../videos/test-video-2.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=2",
            "duration": "15:20",
            "category": "science",
            "subject": "Physics",
            "grade_level": "Grade 11-12",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Chemistry: Periodic Table Explained",
            "video_number": "#003",
            "description": "Master the periodic table with mnemonic techniques and visual aids. Understand element properties and trends.",
            "video_url": "../videos/test-video-3.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=3",
            "duration": "18:45",
            "category": "science",
            "subject": "Chemistry",
            "grade_level": "Grade 10-11",
            "views": random.randint(100, 5000),
        },
        {
            "title": "English Literature: Shakespeare",
            "video_number": "#004",
            "description": "Exploring Shakespeare's most famous works and their relevance today. Analysis of themes, characters, and literary devices.",
            "video_url": "../videos/test-video-4.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=4",
            "duration": "22:10",
            "category": "language",
            "subject": "English",
            "grade_level": "Grade 11-12",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Biology: Cell Structure",
            "video_number": "#005",
            "description": "Deep dive into cell structure and function with 3D animations. Covers prokaryotic and eukaryotic cells.",
            "video_url": "../videos/test-video-5.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=5",
            "duration": "14:30",
            "category": "science",
            "subject": "Biology",
            "grade_level": "Grade 9-10",
            "views": random.randint(100, 5000),
        },
        {
            "title": "History: Ancient Civilizations",
            "video_number": "#006",
            "description": "Journey through ancient Egypt, Rome, and Greece. Learn about their cultures, achievements, and lasting impact.",
            "video_url": "../videos/test-video-6.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=6",
            "duration": "25:15",
            "category": "social_studies",
            "subject": "History",
            "grade_level": "Grade 7-8",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Geography: World Maps",
            "video_number": "#007",
            "description": "Master world geography with interactive map exercises. Learn continents, countries, capitals, and physical features.",
            "video_url": "../videos/test-video-7.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=7",
            "duration": "16:40",
            "category": "social_studies",
            "subject": "Geography",
            "grade_level": "Grade 6-7",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Computer Science: Python Basics",
            "video_number": "#008",
            "description": "Start your coding journey with Python programming fundamentals. Variables, loops, functions, and more.",
            "video_url": "../videos/test-video-8.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=8",
            "duration": "19:55",
            "category": "technology",
            "subject": "Computer Science",
            "grade_level": "Grade 9-12",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Art: Drawing Techniques",
            "video_number": "#009",
            "description": "Learn professional drawing techniques from basic shapes to portraits. Includes shading and perspective.",
            "video_url": "../videos/test-video-9.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=9",
            "duration": "21:30",
            "category": "arts",
            "subject": "Art",
            "grade_level": "All Levels",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Music Theory Fundamentals",
            "video_number": "#010",
            "description": "Understanding scales, chords, and rhythm patterns. Perfect for beginners learning music theory.",
            "video_url": "../videos/test-video-10.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=10",
            "duration": "17:20",
            "category": "arts",
            "subject": "Music",
            "grade_level": "Beginner",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Calculus: Derivatives",
            "video_number": "#011",
            "description": "Master the concept of derivatives with step-by-step examples. Applications in real-world problems.",
            "video_url": "../videos/test-video-11.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=11",
            "duration": "20:15",
            "category": "mathematics",
            "subject": "Mathematics",
            "grade_level": "Grade 11-12",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Economics: Supply and Demand",
            "video_number": "#012",
            "description": "Understanding market economics through supply and demand curves. Real-world examples included.",
            "video_url": "../videos/test-video-12.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=12",
            "duration": "16:45",
            "category": "social_studies",
            "subject": "Economics",
            "grade_level": "Grade 10-12",
            "views": random.randint(100, 5000),
        },
        {
            "title": "French Language: Basic Conversation",
            "video_number": "#013",
            "description": "Learn essential French phrases for everyday conversation. Perfect for beginners.",
            "video_url": "../videos/test-video-13.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=13",
            "duration": "18:30",
            "category": "language",
            "subject": "French",
            "grade_level": "Beginner",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Statistics: Data Analysis",
            "video_number": "#014",
            "description": "Introduction to statistical analysis and data interpretation. Includes mean, median, mode, and standard deviation.",
            "video_url": "../videos/test-video-14.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=14",
            "duration": "19:20",
            "category": "mathematics",
            "subject": "Statistics",
            "grade_level": "Grade 10-12",
            "views": random.randint(100, 5000),
        },
        {
            "title": "Environmental Science: Climate Change",
            "video_number": "#015",
            "description": "Understanding climate change, its causes, and potential solutions. Based on latest scientific research.",
            "video_url": "../videos/test-video-15.mp4",
            "thumbnail_url": "https://picsum.photos/800/450?random=15",
            "duration": "23:45",
            "category": "science",
            "subject": "Environmental Science",
            "grade_level": "Grade 9-12",
            "views": random.randint(100, 5000),
        },
    ]

    # Sample video URLs to use if local files don't exist
    sample_video_urls = [
        "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
        "https://www.w3schools.com/html/mov_bbb.mp4",
        "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    ]

    # Create videos
    created_videos = 0
    for i, template in enumerate(video_templates):
        # Assign to a tutor (cycle through tutors)
        tutor = tutors[i % len(tutors)]
        tutor_id = tutor[0]

        # Check if local video exists, otherwise use sample
        video_url = template["video_url"]
        local_path = video_url

        
        if not os.path.exists(local_path):
            # Use a sample video URL
            video_url = sample_video_urls[i % len(sample_video_urls)]
            print(f"  ⚠️ Local video not found: {local_path}, using sample URL")

        # Calculate upload date (spread over last 30 days)
        days_ago = random.randint(0, 30)
        upload_date = datetime.now() - timedelta(days=days_ago)

        # Check if this video already exists
        cursor.execute(
            """
            SELECT id FROM video_reels 
            WHERE title = %s AND tutor_id = %s
        """,
            (template["title"], tutor_id),
        )

        if not cursor.fetchone():
            cursor.execute(
                """
                INSERT INTO video_reels (
                    tutor_id, title, video_number, description, video_url,
                    thumbnail_url, duration, category, subject, grade_level,
                    views, upload_date, is_active, meta_info
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    tutor_id,
                    template["title"],
                    template["video_number"],
                    template["description"],
                    video_url,
                    template["thumbnail_url"],
                    template["duration"],
                    template["category"],
                    template["subject"],
                    template["grade_level"],
                    template["views"],
                    upload_date,
                    True,
                    json.dumps({"seeded": True, "original_url": template["video_url"]}),
                ),
            )
            created_videos += 1  # INDENT THIS - inside the if block
            print(f"  ✅ Created video: {template['title']} by {tutor[1]} {tutor[2]}")  # INDENT THIS

    # These go OUTSIDE the for loop (no indentation from the for loop)
    conn.commit()
    print(f"\n  📊 Created {created_videos} new video reels")

    # Seed engagements and comments
    if created_videos > 0:
        seed_video_engagements(cursor, conn)
        seed_video_comments(cursor, conn)

def seed_video_engagements(cursor, conn):
    """Seed video engagements (likes, dislikes, favorites, saves, views)"""
    print("\n👍 Seeding video engagements...")

    # Get all videos
    cursor.execute("SELECT id FROM video_reels")
    video_ids = [row[0] for row in cursor.fetchall()]

    # Get some users (limit to prevent too many engagements)
    cursor.execute("SELECT id FROM users LIMIT 20")
    user_ids = [row[0] for row in cursor.fetchall()]

    if not video_ids or not user_ids:
        print("  ❌ No videos or users to create engagements")
        return

    engagement_types = ["like", "dislike", "favorite", "save", "view"]
    created_engagements = 0

    # Create random engagements
    for video_id in video_ids:
        # Random number of engagements per video (30-70% of users)
        num_engagements = random.randint(
            len(user_ids) // 3, min(len(user_ids) * 7 // 10, len(user_ids))
        )
        engaged_users = random.sample(user_ids, num_engagements)

        for user_id in engaged_users:
            # Each user might have multiple engagement types
            user_engagement_types = random.sample(
                engagement_types, random.randint(1, 3)
            )

            for engagement_type in user_engagement_types:
                # Skip if like and dislike both selected (mutually exclusive)
                if engagement_type == "dislike" and "like" in user_engagement_types:
                    continue

                # Check if engagement already exists
                cursor.execute(
                    """
                    SELECT id FROM video_engagements 
                    WHERE video_id = %s AND user_id = %s AND engagement_type = %s
                """,
                    (video_id, user_id, engagement_type),
                )

                if not cursor.fetchone():
                    cursor.execute(
                        """
                        INSERT INTO video_engagements (video_id, user_id, engagement_type, created_at)
                        VALUES (%s, %s, %s, %s)
                    """,
                        (video_id, user_id, engagement_type, datetime.now()),
                    )
                    created_engagements += 1

    conn.commit()
    print(f"  ✅ Created {created_engagements} engagements")


def seed_video_comments(cursor, conn):
    """Seed video comments with replies"""
    print("\n💬 Seeding video comments...")
    
    # Sample comments for tutor methodology/course preview videos
    comment_templates = [
        # From enrolled students
        "I've subscribed to his course and he's one of the great tutors! Please consider subscribing!",
        "Thank you Teach! Your course changed my grades completely!",
        "Been taking her classes for 3 months now. Best decision ever!",
        "I'm currently enrolled in this course. Worth every penny!",
        "My child improved from C to A after joining. Highly recommended!",
        "Seems like a great tutor. I like his methodology! I'll definitely consider enrolling.",
        # Interested prospects
        "How much is the monthly subscription?",
        "Do you offer trial classes?",
        "What's the schedule for Grade 10 mathematics?",
        "Is this available for online students outside Addis?",
        "Can you share the course syllabus?",
        "How many students per batch?",
        "Do you provide study materials?",
        "What's the duration of each session?",
        "Is there a discount for multiple subjects?",
        "Can I join mid-semester?",
        # Questions about methodology
        "Love your teaching style! When can I start?",
        "This approach looks perfect for my learning style. How do I enroll?",
        "Your method seems different from others. What makes it special?",
        "Do you use this same technique for all grades?",
        "Is this suitable for slow learners?",
        # Testimonials
        "My sister took your physics course last year and scored 95%!",
        "You taught my brother in 2023. He still talks about your classes!",
        "3 of my friends are already enrolled. They love it!",
        "Our whole study group joined after watching this!",
        # Engagement comments
        "Just enrolled after watching this video!",
        "Convinced! Where do I sign up?",
        "This is exactly what I was looking for!",
        "Finally found a tutor who explains clearly!",
        "Your passion for teaching shows!",
    ]

    # Reply templates (from tutors or other users)
    reply_templates = [
        "Why wait? Just subscribe!",
        "Thank you for the comment!",
        "100% 👍",
        "Will work harder!",
        "Please check packages on the platform",
        "No sorry, we don't offer that currently",
        "I'll definitely consider it, thank you!",
        "Welcome aboard!",
        "Thanks for your interest! DM for details",
        "Appreciate the feedback!",
        "Contact me through the platform for enrollment",
        "Check my profile for full course details",
        "Thank you dear! See you in class",
        "Glad you found it helpful!",
        "Your success is our goal!",
        "Thanks for the recommendation!",
        "We start new batches every month",
        "Yes, we have recorded sessions too",
        "Limited seats available, enroll soon!",
        "Thank you for trusting us with your education!",
    ]
    
    # Get videos
    cursor.execute("SELECT id FROM video_reels")
    video_ids = [row[0] for row in cursor.fetchall()]

    # Get users
    cursor.execute("SELECT id, first_name FROM users LIMIT 20")
    users = cursor.fetchall()

    # Get tutors (for replies)
    cursor.execute("""
        SELECT DISTINCT u.id, u.first_name 
        FROM users u 
        JOIN video_reels vr ON vr.tutor_id = u.id
    """)
    tutors = cursor.fetchall()

    if not video_ids or not users:
        print("  ❌ No videos or users to create comments")
        return

    created_comments = 0
    created_replies = 0

    # Add comments to random videos
    for video_id in random.sample(video_ids, min(len(video_ids), 10)):
        # 2-6 comments per video
        num_comments = random.randint(2, 6)
        commenting_users = random.sample(users, min(num_comments, len(users)))

        for user in commenting_users:
            user_id = user[0]
            comment_text = random.choice(comment_templates)

            cursor.execute("""
                INSERT INTO video_comments (video_id, user_id, text, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (video_id, user_id, comment_text, datetime.now()))

            comment_id = cursor.fetchone()[0]
            created_comments += 1

            # 40% chance of getting a reply
            if random.random() > 0.6:
                # Reply can be from tutor (50% chance) or another user
                if tutors and random.random() > 0.5:
                    # Tutor reply
                    tutor = random.choice(tutors)
                    reply_text = random.choice(reply_templates)

                    # Sometimes personalize the reply
                    if "Thank you" in reply_text and random.random() > 0.5:
                        reply_text = f"Thank you for the comment {user[1]}!"

                    cursor.execute("""
                        INSERT INTO video_comments (video_id, user_id, parent_comment_id, text, created_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (video_id, tutor[0], comment_id, reply_text, datetime.now()))
                    created_replies += 1
                else:
                    # Another user's reply
                    if len(users) > 1:
                        reply_user = random.choice([u for u in users if u[0] != user_id])
                        reply_text = random.choice([
                            "I agree! Great tutor",
                            "Yes, highly recommended",
                            "Can confirm, excellent teaching",
                            "I'm joining too!",
                            "See you in class!",
                            "Worth it!"
                        ])
                        cursor.execute("""
                            INSERT INTO video_comments (video_id, user_id, parent_comment_id, text, created_at)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (video_id, reply_user[0], comment_id, reply_text, datetime.now()))
                        created_replies += 1

    conn.commit()
    print(f"  ✅ Created {created_comments} comments and {created_replies} replies")


def seed_sample_playlists(cursor, conn):
    """Seed some sample playlists"""
    print("\n📝 Seeding sample playlists...")

    # Get some users
    cursor.execute("SELECT id FROM users LIMIT 5")
    user_ids = [row[0] for row in cursor.fetchall()]

    # Get some videos
    cursor.execute("SELECT id FROM video_reels LIMIT 20")
    video_ids = [row[0] for row in cursor.fetchall()]

    if not user_ids or not video_ids:
        print("  ❌ No users or videos to create playlists")
        return

    playlist_templates = [
        ("My Favorites", "Collection of my favorite educational videos"),
        ("Study Materials", "Videos for exam preparation"),
        ("Watch Later", "Videos to watch when I have time"),
        ("Math Tutorials", "Mathematics learning resources"),
        ("Science Collection", "Physics, Chemistry, and Biology videos"),
    ]

    created_playlists = 0
    created_items = 0

    for user_id in user_ids[:3]:  # Create playlists for first 3 users
        for playlist_name, playlist_desc in random.sample(playlist_templates, 2):
            # Check if playlist exists
            cursor.execute(
                """
                SELECT id FROM playlists 
                WHERE user_id = %s AND name = %s
            """,
                (user_id, playlist_name),
            )

            existing = cursor.fetchone()
            if not existing:
                cursor.execute(
                    """
                    INSERT INTO playlists (user_id, name, description, is_public, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """,
                    (user_id, playlist_name, playlist_desc, True, datetime.now()),
                )

                playlist_id = cursor.fetchone()[0]
                created_playlists += 1

                # Add 3-7 videos to playlist
                playlist_videos = random.sample(
                    video_ids, min(random.randint(3, 7), len(video_ids))
                )
                for position, video_id in enumerate(playlist_videos):
                    cursor.execute(
                        """
                        INSERT INTO playlist_items (playlist_id, video_id, position, added_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """,
                        (playlist_id, video_id, position, datetime.now()),
                    )
                    created_items += 1

    conn.commit()
    print(f"  ✅ Created {created_playlists} playlists with {created_items} videos")


def main():
    print("🚀 Astegni Video Database Seeding")
    print("=" * 50)

    try:
        # Connect to database
        conn_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"
        conn = psycopg.connect(conn_string)
        cursor = conn.cursor()

        print("✅ Connected to database")

        # Check and create tables if needed
        if not check_and_create_tables(cursor, conn):
            print("❌ Failed to create tables. Exiting.")
            return

        # Seed data
        seed_video_reels(cursor, conn)
        seed_sample_playlists(cursor, conn)

        # Get final counts
        cursor.execute("SELECT COUNT(*) FROM video_reels")
        video_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM video_engagements")
        engagement_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM video_comments")
        comment_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM playlists")
        playlist_count = cursor.fetchone()[0]

        print("\n" + "=" * 50)
        print("📊 Final Statistics:")
        print(f"  • Videos: {video_count}")
        print(f"  • Engagements: {engagement_count}")
        print(f"  • Comments: {comment_count}")
        print(f"  • Playlists: {playlist_count}")

        cursor.close()
        conn.close()

        print("\n✨ Video seeding complete!")
        print("\n📌 Next steps:")
        print("1. Place your video files in the 'videos' directory")
        print("2. Update video URLs in the script if needed")
        print("3. Start your API server: uvicorn app:app --reload")
        print("4. Open reels.html and enjoy your dynamic video system!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
