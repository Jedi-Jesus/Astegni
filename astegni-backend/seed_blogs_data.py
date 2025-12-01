"""
Seed sample blog data for testing
"""

import os
import sys
import psycopg
import json
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

# Sample blog data
SAMPLE_BLOGS = [
    {
        'profile_id': 86,  # Tutor profile
        'role': 'tutor',
        'blog_picture': '/uploads/system_images/blog/film-making-tutorial.jpg',
        'title': '10 Tips for Better Film Making',
        'description': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
        'blog_text': '''
# 10 Tips for Better Film Making

Film making is an art that combines technical skills with creative vision. Whether you're a beginner or an experienced filmmaker, these tips will help you elevate your craft.

## 1. Plan Your Shots

Pre-visualization is key. Storyboard your scenes and plan your camera angles before you start shooting.

## 2. Lighting Matters

Good lighting can make or break your film. Learn the basics of three-point lighting and natural light techniques.

## 3. Sound Quality

Invest in good audio equipment. Poor sound quality can ruin even the best visuals.

## 4. Tell a Story

Every frame should serve the narrative. Focus on storytelling rather than just technical perfection.

## 5. Use Movement Wisely

Camera movement should have purpose. Static shots can be just as powerful as dynamic ones.

## 6. Color Grading

Post-production color grading can dramatically enhance your film's mood and atmosphere.

## 7. Edit Ruthlessly

Don't be afraid to cut scenes that don't serve the story, even if you love them.

## 8. Sound Design

Layered sound design adds depth and immersion to your film.

## 9. Test Your Equipment

Always test your gear before the shoot to avoid technical problems on set.

## 10. Keep Learning

Watch films critically, study techniques, and never stop improving your craft.
        ''',
        'reading_time': 9,
        'likes': 421,
        'comments': json.dumps([
            {'user_id': 28, 'username': 'Abeba', 'comment': 'Great tips! Very helpful for beginners.', 'timestamp': '2025-10-15T10:30:00'},
            {'user_id': 45, 'username': 'Dawit', 'comment': 'The lighting section was especially useful.', 'timestamp': '2025-10-16T14:20:00'}
        ]),
        'category': 'tutorial'
    },
    {
        'profile_id': 86,  # Tutor profile
        'role': 'tutor',
        'blog_picture': '/uploads/system_images/blog/camera-settings.jpg',
        'title': 'Understanding Camera Settings',
        'description': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
        'blog_text': '''
# Understanding Camera Settings

Mastering your camera settings is essential for capturing great footage. This guide breaks down the key settings every filmmaker should know.

## Aperture (F-Stop)

Controls depth of field and light intake. Lower f-numbers (f/1.8) create shallow depth of field with blurred backgrounds.

## Shutter Speed

The 180-degree rule suggests your shutter speed should be double your frame rate for natural motion blur.

## ISO

Sensor sensitivity to light. Keep it as low as possible to minimize noise, increasing only when necessary.

## White Balance

Ensures colors look natural. Use presets or custom settings based on your lighting conditions.

## Frame Rate

- 24fps: Cinematic look
- 30fps: Standard video
- 60fps: Smooth motion, slow-motion capability
- 120fps+: Dramatic slow-motion

## Resolution

4K is now standard, but consider your storage and editing capabilities.

## Picture Profiles

Many cameras offer flat picture profiles (LOG) for better color grading flexibility in post-production.
        ''',
        'reading_time': 9,
        'likes': 432,
        'comments': json.dumps([
            {'user_id': 33, 'username': 'Sara', 'comment': 'Finally understand aperture!', 'timestamp': '2025-10-20T09:15:00'},
            {'user_id': 51, 'username': 'Yonas', 'comment': 'The white balance tips saved my shoot.', 'timestamp': '2025-10-21T11:45:00'}
        ]),
        'category': 'tutorial'
    },
    {
        'profile_id': 28,  # Student profile
        'role': 'student',
        'blog_picture': '/uploads/system_images/blog/study-tips.jpg',
        'title': 'How I Improved My Grades in Mathematics',
        'description': 'Sharing my journey from struggling to excelling in math...',
        'blog_text': '''
# How I Improved My Grades in Mathematics

Two years ago, I was struggling with mathematics. Today, I'm one of the top performers in my class. Here's how I did it.

## Understanding vs. Memorization

I stopped trying to memorize formulas and started understanding the concepts behind them.

## Practice, Practice, Practice

I solved at least 10 problems daily, even when I didn't have homework.

## Study Groups

Forming a study group helped me learn from others and teach concepts I understood.

## Online Resources

YouTube tutorials and Khan Academy filled gaps in my understanding.

## Ask Questions

I stopped being afraid to ask questions in class or during tutoring sessions.

## Regular Reviews

I reviewed previous topics weekly to keep them fresh in my memory.

## Real-World Applications

Understanding how math applies to real life made it more interesting and easier to grasp.
        ''',
        'reading_time': 7,
        'likes': 289,
        'comments': json.dumps([
            {'user_id': 86, 'username': 'Mr. Tesfaye', 'comment': 'Proud of your progress!', 'timestamp': '2025-10-18T16:30:00'}
        ]),
        'category': 'education'
    },
    {
        'profile_id': 86,  # Tutor profile
        'role': 'tutor',
        'blog_picture': '/uploads/system_images/blog/physics-concepts.jpg',
        'title': 'Making Physics Fun and Understandable',
        'description': 'Physics doesn\'t have to be intimidating. Learn how to approach it with confidence...',
        'blog_text': '''
# Making Physics Fun and Understandable

As a physics tutor, I've seen many students initially intimidated by the subject. Here's how to make physics accessible and even enjoyable.

## Start with Real-World Examples

Physics is everywhere! Understanding how concepts apply to daily life makes them less abstract.

## Visualize Concepts

Use diagrams, animations, and hands-on experiments to visualize what's happening.

## Break Down Complex Problems

Divide complicated problems into smaller, manageable steps.

## Master the Fundamentals

Strong foundation in basic concepts makes advanced topics much easier.

## Practice Different Problem Types

Exposure to various problem formats builds versatility and confidence.

## Use Dimensional Analysis

Check if your answers make sense by analyzing units.

## Don't Rush

Physics requires deep thinking. Take time to understand rather than rushing through problems.
        ''',
        'reading_time': 8,
        'likes': 567,
        'comments': json.dumps([
            {'user_id': 28, 'username': 'Abeba', 'comment': 'This changed my perspective on physics!', 'timestamp': '2025-10-22T13:20:00'},
            {'user_id': 34, 'username': 'Marta', 'comment': 'The real-world examples really help.', 'timestamp': '2025-10-22T15:45:00'},
            {'user_id': 67, 'username': 'Binyam', 'comment': 'Can you do one on chemistry next?', 'timestamp': '2025-10-23T10:10:00'}
        ]),
        'category': 'tutorial'
    },
    {
        'profile_id': 86,  # Tutor profile
        'role': 'tutor',
        'blog_picture': '/uploads/system_images/blog/online-learning.jpg',
        'title': 'Effective Online Learning Strategies',
        'description': 'Make the most of your online learning experience with these proven strategies...',
        'blog_text': '''
# Effective Online Learning Strategies

Online learning offers flexibility, but it also requires discipline and effective strategies. Here's how to succeed.

## Create a Dedicated Study Space

Set up a quiet, organized area specifically for learning. This helps create the right mindset.

## Stick to a Schedule

Treat online classes like in-person ones. Set specific times for studying and stick to them.

## Minimize Distractions

Turn off notifications, close unnecessary tabs, and let others know when you're in class.

## Engage Actively

Participate in discussions, ask questions, and interact with your instructor and classmates.

## Take Notes

Don't just passively watch. Take notes as if you were in a physical classroom.

## Use the Digital Whiteboard

During tutoring sessions, make full use of collaborative tools like the digital whiteboard.

## Review Recordings

If sessions are recorded, watch them again to reinforce learning.

## Stay Organized

Keep track of assignments, deadlines, and materials in a digital planner.

## Take Breaks

Follow the Pomodoro Technique: 25 minutes of focused study, 5-minute break.

## Communicate Regularly

Don't hesitate to reach out to your tutor or instructor when you need help.
        ''',
        'reading_time': 10,
        'likes': 834,
        'comments': json.dumps([
            {'user_id': 28, 'username': 'Abeba', 'comment': 'The Pomodoro technique really works!', 'timestamp': '2025-10-25T09:30:00'},
            {'user_id': 45, 'username': 'Dawit', 'comment': 'Helped me stay focused during long sessions.', 'timestamp': '2025-10-25T14:15:00'},
            {'user_id': 51, 'username': 'Yonas', 'comment': 'Great advice for remote learners!', 'timestamp': '2025-10-26T11:20:00'}
        ]),
        'category': 'education'
    }
]

def seed_blogs():
    """Seed sample blog data"""

    conn = psycopg.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        print("=" * 70)
        print("Seeding blog data")
        print("=" * 70)

        # Clear existing data (optional - comment out to keep existing blogs)
        print("\n1. Clearing existing blog data...")
        cur.execute("DELETE FROM blogs")
        print("✅ Existing data cleared")

        # Insert sample blogs
        print("\n2. Inserting sample blogs...")

        for i, blog in enumerate(SAMPLE_BLOGS, 1):
            # Calculate created_at (blogs created 1 month ago)
            created_at = datetime.now() - timedelta(days=30)

            cur.execute("""
                INSERT INTO blogs (
                    profile_id, role, blog_picture, title, description,
                    blog_text, reading_time, likes, comments, category, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                blog['profile_id'],
                blog['role'],
                blog['blog_picture'],
                blog['title'],
                blog['description'],
                blog['blog_text'],
                blog['reading_time'],
                blog['likes'],
                blog['comments'],
                blog['category'],
                created_at
            ))

            blog_id = cur.fetchone()[0]
            print(f"✅ Blog {i}/{len(SAMPLE_BLOGS)}: '{blog['title']}' (ID: {blog_id})")

        print("\n" + "=" * 70)
        print("✅ SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 70)

        # Verify data
        print("\n3. Verifying seeded data...")
        cur.execute("SELECT COUNT(*) FROM blogs")
        count = cur.fetchone()[0]
        print(f"\nTotal blogs in database: {count}")

        cur.execute("""
            SELECT id, title, role, reading_time, likes, category
            FROM blogs
            ORDER BY created_at DESC
        """)
        blogs = cur.fetchall()

        print("\nSeeded blogs:")
        for blog in blogs:
            print(f"  - [{blog[5]}] {blog[1]} ({blog[2]}) - {blog[3]} min read, {blog[4]} likes")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_blogs()
