"""
Seed blog data specifically for student_id 28
"""

import os
import sys
import psycopg
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

# Student blogs for profile_id 28 (student role)
STUDENT_BLOGS = [
    {
        'profile_id': 28,
        'role': 'student',
        'blog_picture': '/uploads/system_images/blog/study-motivation.jpg',
        'title': 'My Journey to Academic Excellence',
        'description': 'How I transformed my study habits and achieved top grades in my class...',
        'blog_text': '''
# My Journey to Academic Excellence

Two years ago, I was an average student struggling to keep up with my coursework. Today, I'm proud to share that I've become one of the top performers in my grade. Here's my story and the strategies that made all the difference.

## The Turning Point

It all started when I realized that working harder wasn't the solution – I needed to work smarter. I began researching effective study techniques and gradually implemented them into my routine.

## Key Strategies That Worked

### 1. Active Learning
Instead of passively reading textbooks, I started:
- Creating mind maps for each chapter
- Teaching concepts to my study group
- Making flashcards for key terms
- Practicing with past exam papers

### 2. Time Management
I discovered the Pomodoro Technique:
- 25 minutes of focused study
- 5-minute break
- Repeat 4 times, then take a longer 15-30 minute break

This method helped me maintain concentration and avoid burnout.

### 3. Consistent Review
Every Sunday, I dedicated 2 hours to reviewing what I learned during the week. This spacing effect significantly improved my long-term retention.

### 4. Seeking Help
I wasn't afraid to ask questions anymore:
- Approached teachers during office hours
- Joined study groups with classmates
- Found a tutor on Astegni for subjects I struggled with

### 5. Taking Care of Myself
Good grades aren't just about studying:
- Getting 7-8 hours of sleep
- Eating nutritious meals
- Exercising regularly
- Taking breaks to recharge

## Results

After implementing these strategies consistently for 6 months:
- My average grade improved from 70% to 92%
- I developed genuine interest in subjects I used to dread
- I felt less stressed and more confident
- Teachers noticed my transformation and nominated me for academic awards

## My Advice to Fellow Students

**Start small.** Don't try to change everything overnight. Pick one or two strategies and master them before adding more.

**Be patient.** Results won't come immediately. Give yourself at least 2-3 months to see significant improvements.

**Stay consistent.** It's better to study 1 hour every day than 7 hours once a week.

**Find what works for YOU.** Everyone learns differently. Experiment and adapt these strategies to fit your learning style.

## Moving Forward

I'm now helping other students through peer tutoring sessions on Astegni. Sharing my knowledge and seeing others succeed has been incredibly rewarding.

Remember: Academic excellence isn't about being naturally gifted. It's about developing effective habits and maintaining consistency. If I can do it, so can you!

---

**Have questions about any of these strategies? Drop a comment below and I'll be happy to help!**
        ''',
        'reading_time': 8,
        'likes': 156,
        'comments': json.dumps([
            {'user_id': 86, 'username': 'Mr. Tesfaye', 'comment': 'So proud of your growth! Keep inspiring others.', 'timestamp': '2025-11-20T10:30:00'},
            {'user_id': 45, 'username': 'Dawit', 'comment': 'The Pomodoro technique really works! Thanks for sharing.', 'timestamp': '2025-11-21T14:20:00'},
            {'user_id': 33, 'username': 'Sara', 'comment': 'This motivated me to improve my study habits!', 'timestamp': '2025-11-22T09:15:00'}
        ]),
        'category': 'education'
    },
    {
        'profile_id': 28,
        'role': 'student',
        'blog_picture': '/uploads/system_images/blog/exam-preparation.jpg',
        'title': 'How I Prepare for Major Exams',
        'description': 'My complete exam preparation strategy that helped me ace my finals...',
        'blog_text': '''
# How I Prepare for Major Exams

Exam season used to fill me with anxiety. But after developing a solid preparation strategy, I now approach exams with confidence. Here's exactly how I prepare.

## 6 Weeks Before Exams

### Create a Study Schedule
- List all subjects and topics to cover
- Allocate time based on difficulty and importance
- Include buffer days for unexpected delays
- Schedule regular review sessions

### Organize Study Materials
- Gather all notes, textbooks, and resources
- Create summary sheets for each topic
- Identify weak areas that need extra attention

## 4 Weeks Before Exams

### Deep Dive into Content
- Study one subject per day with intense focus
- Make comprehensive notes
- Solve practice questions for each topic
- Form study groups for difficult subjects

### Practice, Practice, Practice
- Complete past exam papers under timed conditions
- Review marking schemes to understand what examiners look for
- Identify common question patterns

## 2 Weeks Before Exams

### Intensive Review
- Review all summary sheets daily
- Focus heavily on weak areas
- Take full-length practice exams
- Analyze mistakes and learn from them

### Memory Techniques
I use various methods to memorize information:
- Mnemonics for formulas and lists
- Visual associations for complex concepts
- Spaced repetition for vocabulary and definitions

## 1 Week Before Exams

### Final Polish
- Light review of all topics
- Focus on understanding, not cramming
- Revise summary sheets and flashcards
- Get plenty of rest

### Mental Preparation
- Visualize success
- Practice relaxation techniques
- Maintain regular exercise and sleep schedule
- Stay positive and confident

## Exam Day Strategy

### Morning Routine
- Wake up early with time to spare
- Eat a nutritious breakfast
- Arrive 30 minutes early
- Do light review of key concepts

### During the Exam
1. **Read all instructions carefully**
2. **Scan the entire paper first**
3. **Allocate time per question**
4. **Start with easiest questions**
5. **Show all working in math/science**
6. **Leave time for review**

## After the Exam

Don't stress about what you could have done better. Focus on the next exam if there is one, or take time to relax and recharge.

## Key Takeaways

✅ Start early – don't wait until the last minute
✅ Create a realistic study schedule and stick to it
✅ Practice with past papers under exam conditions
✅ Take care of your physical and mental health
✅ Stay calm and confident during the exam

This strategy helped me improve my exam performance dramatically. Adapt it to fit your learning style and watch your grades soar!

**What exam strategies work best for you? Share in the comments!**
        ''',
        'reading_time': 10,
        'likes': 203,
        'comments': json.dumps([
            {'user_id': 51, 'username': 'Yonas', 'comment': 'The 6-week timeline is perfect! Starting early makes such a difference.', 'timestamp': '2025-11-18T16:45:00'},
            {'user_id': 67, 'username': 'Binyam', 'comment': 'Your exam day strategy helped me stay calm during finals!', 'timestamp': '2025-11-19T11:30:00'}
        ]),
        'category': 'education'
    },
    {
        'profile_id': 28,
        'role': 'student',
        'blog_picture': '/uploads/system_images/blog/online-learning-tips.jpg',
        'title': 'Staying Focused During Online Classes',
        'description': 'Practical tips for making the most of virtual learning environments...',
        'blog_text': '''
# Staying Focused During Online Classes

Online learning comes with unique challenges. Here are the strategies I use to stay engaged and productive during virtual classes.

## Setting Up for Success

### Create a Dedicated Study Space
- Choose a quiet area away from distractions
- Ensure good lighting and comfortable seating
- Keep all materials within reach
- Use headphones to minimize external noise

### Technical Preparation
- Test internet connection before class
- Charge devices fully
- Have backup plans (mobile hotspot, alternative device)
- Close unnecessary apps and browser tabs

## During Class

### Active Participation
- Turn on your camera to stay accountable
- Take handwritten or digital notes
- Ask questions in chat or via microphone
- Engage with polls and interactive activities

### Beating Distractions
- Put phone on silent mode (or in another room)
- Use website blockers during class time
- Inform family members of your class schedule
- Take notes actively to maintain focus

### Energy Management
- Stand up and stretch during breaks
- Keep water and healthy snacks nearby
- Use the Pomodoro technique for long sessions
- Take proper breaks between classes

## After Class

### Immediate Review
- Review notes within 24 hours
- Clarify confusing points with classmates or teachers
- Complete any assignments promptly
- Organize notes and materials

### Self-Care
- Take breaks away from screens
- Exercise to release tension
- Maintain social connections (virtual or in-person)
- Get adequate sleep

## Tools That Help

### Apps I Use
- **Notion**: For organizing notes and assignments
- **Forest**: To stay off my phone during study time
- **Zoom/Google Meet**: For attending classes
- **Google Calendar**: For schedule management

### Study Techniques
- Cornell note-taking method
- Mind mapping for visual learners
- Recording classes (with permission) for review
- Creating study guides after each unit

## Challenges I Faced

### Screen Fatigue
**Solution**: Follow the 20-20-20 rule (every 20 minutes, look at something 20 feet away for 20 seconds)

### Feeling Isolated
**Solution**: Join virtual study groups, participate in class discussions, connect with classmates via social media

### Technical Issues
**Solution**: Always have a backup plan, record important classes, communicate with teachers about issues

## Results

Using these strategies, I:
- Maintained my grades during the transition to online learning
- Developed better self-discipline
- Learned valuable tech skills
- Built a sustainable study routine

Online learning isn't easier than traditional classroom learning – it's just different. With the right strategies and mindset, you can excel in virtual environments.

**What's your biggest challenge with online learning? Let's discuss solutions in the comments!**
        ''',
        'reading_time': 9,
        'likes': 178,
        'comments': json.dumps([
            {'user_id': 34, 'username': 'Marta', 'comment': 'The 20-20-20 rule saved my eyes! Great tip.', 'timestamp': '2025-11-23T13:20:00'},
            {'user_id': 28, 'username': 'Abeba', 'comment': 'Creating a dedicated study space made such a difference for me too!', 'timestamp': '2025-11-23T15:10:00'}
        ]),
        'category': 'tutorial'
    }
]

def seed_student_blogs():
    """Seed blog data for student_id 28"""

    conn = psycopg.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        print("=" * 70)
        print("Seeding student blogs for profile_id 28")
        print("=" * 70)

        # First verify the student exists
        print("\n1. Verifying student_id 28 exists...")
        cur.execute("""
            SELECT id, user_id, username, grade_level
            FROM student_profiles
            WHERE id = 28
        """)
        student = cur.fetchone()

        if not student:
            print("❌ ERROR: Student with ID 28 not found!")
            return

        student_id, user_id, username, grade = student
        print(f"✅ Found student: {username}")
        print(f"   - Student Profile ID: {student_id}")
        print(f"   - User ID: {user_id}")
        print(f"   - Grade Level: {grade or 'Not specified'}")

        # Delete existing blogs for student_id 28 (optional)
        print("\n2. Clearing existing blogs for student_id 28...")
        cur.execute("DELETE FROM blogs WHERE profile_id = 28 AND role = 'student'")
        print("✅ Existing student blogs cleared")

        # Insert student blogs
        print("\n3. Inserting student blogs...")

        for i, blog in enumerate(STUDENT_BLOGS, 1):
            # Blogs created at different times (30, 25, 20 days ago)
            days_ago = 30 - (i * 5)
            created_at = datetime.now() - timedelta(days=days_ago)

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
            print(f"✅ Blog {i}/{len(STUDENT_BLOGS)}: '{blog['title']}' (ID: {blog_id})")

        print("\n" + "=" * 70)
        print("✅ SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 70)

        # Verify data
        print("\n4. Verifying seeded data...")
        cur.execute("""
            SELECT COUNT(*)
            FROM blogs
            WHERE profile_id = 28 AND role = 'student'
        """)
        count = cur.fetchone()[0]
        print(f"\nTotal blogs for student_id 28: {count}")

        cur.execute("""
            SELECT id, title, reading_time, likes, category, created_at
            FROM blogs
            WHERE profile_id = 28 AND role = 'student'
            ORDER BY created_at DESC
        """)
        blogs = cur.fetchall()

        print("\nSeeded student blogs:")
        for blog in blogs:
            blog_date = blog[5].strftime('%Y-%m-%d') if blog[5] else 'Unknown'
            print(f"  - [{blog[4]}] {blog[1]} - {blog[2]} min read, {blog[3]} likes (Created: {blog_date})")

        # Show total blogs in database
        print("\n5. Total blogs in database...")
        cur.execute("SELECT COUNT(*) FROM blogs")
        total_count = cur.fetchone()[0]
        print(f"Total blogs (all users): {total_count}")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_student_blogs()
