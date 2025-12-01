"""
Seed Events and Clubs Data
Creates sample Ethiopian educational events and clubs
"""

import psycopg
import os
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def seed_data():
    """Seed events and clubs with Ethiopian educational data"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get some user IDs to use as creators
        cur.execute("SELECT id FROM users LIMIT 10")
        user_ids = [row[0] for row in cur.fetchall()]

        if not user_ids:
            print("[ERROR] No users found. Please run user seeding first.")
            return

        print(f"Found {len(user_ids)} users for event/club creation")

        # Create Events
        print("\nCreating events...")

        events_data = [
            {
                'created_by': user_ids[0],
                'event_picture': '/uploads/system_images/system_images/Math wallpaper 1.jpeg',
                'title': 'Ethiopian Mathematics Olympiad Workshop',
                'type': 'Workshop',
                'description': 'Intensive preparation workshop for the Ethiopian Mathematics Olympiad. Students will learn advanced problem-solving techniques and practice with past competition questions.',
                'location': 'Addis Ababa University, Main Hall',
                'is_online': False,
                'start_datetime': datetime.now() + timedelta(days=7),
                'end_datetime': datetime.now() + timedelta(days=7, hours=4),
                'available_seats': 50,
                'price': 200.00,
                'subjects': ['Mathematics', 'Problem Solving'],
                'grade_levels': ['Grade 9-10', 'Grade 11-12'],
                'requirements': 'Basic knowledge of algebra and geometry required'
            },
            {
                'created_by': user_ids[1],
                'event_picture': '/uploads/system_images/system_images/Chemistry wallpaper 3.jpg',
                'title': 'Science Fair Preparation Session',
                'type': 'Seminar',
                'description': 'Learn how to create winning science fair projects. Topics include hypothesis formation, experimental design, and presentation skills.',
                'location': 'Online via Zoom',
                'is_online': True,
                'start_datetime': datetime.now() + timedelta(days=3),
                'end_datetime': datetime.now() + timedelta(days=3, hours=2),
                'available_seats': 100,
                'price': 0.00,
                'subjects': ['Chemistry', 'Biology', 'Physics'],
                'grade_levels': ['Grade 7-8', 'Grade 9-10'],
                'requirements': None
            },
            {
                'created_by': user_ids[2],
                'event_picture': '/uploads/system_images/system_images/Biology wallpaper 1.jpeg',
                'title': 'Amharic Literature and Poetry Night',
                'type': 'Cultural Event',
                'description': 'Celebrate Ethiopian literature with poetry readings, discussions, and performances by renowned Amharic poets and authors.',
                'location': 'Ethiopian National Theater, Addis Ababa',
                'is_online': False,
                'start_datetime': datetime.now() + timedelta(days=14),
                'end_datetime': datetime.now() + timedelta(days=14, hours=3),
                'available_seats': 200,
                'price': 150.00,
                'subjects': ['Amharic', 'Literature'],
                'grade_levels': ['University Level', 'Adult Learning'],
                'requirements': 'Interest in Ethiopian literature and culture'
            },
            {
                'created_by': user_ids[3],
                'event_picture': '/uploads/system_images/system_images/Physics wall paper 1.jpeg',
                'title': 'Coding Bootcamp for Beginners',
                'type': 'Workshop',
                'description': 'Learn the basics of programming with Python. Perfect for students wanting to start their coding journey.',
                'location': 'Online via Google Meet',
                'is_online': True,
                'start_datetime': datetime.now() + timedelta(days=5),
                'end_datetime': datetime.now() + timedelta(days=5, hours=5),
                'available_seats': 75,
                'price': 300.00,
                'subjects': ['Computer Science', 'Programming'],
                'grade_levels': ['Grade 9-10', 'Grade 11-12', 'University Level'],
                'requirements': 'Laptop or computer required'
            },
            {
                'created_by': user_ids[4],
                'event_picture': '/uploads/system_images/system_images/History wallpaper 1.jpeg',
                'title': 'Ethiopian History Quiz Competition',
                'type': 'Competition',
                'description': 'Test your knowledge of Ethiopian history from ancient Axum to modern times. Prizes for top performers!',
                'location': 'Jimma University, Conference Hall',
                'is_online': False,
                'start_datetime': datetime.now() + timedelta(days=21),
                'end_datetime': datetime.now() + timedelta(days=21, hours=3),
                'available_seats': 60,
                'price': 50.00,
                'subjects': ['History', 'Ethiopian Studies'],
                'grade_levels': ['Grade 11-12', 'University Level'],
                'requirements': None
            },
            {
                'created_by': user_ids[0],
                'event_picture': '/uploads/system_images/system_images/Geography wallpaper 1.jpeg',
                'title': 'STEM Career Fair',
                'type': 'Career Fair',
                'description': 'Meet professionals from various STEM fields, learn about career opportunities, and get advice on university programs.',
                'location': 'Bahir Dar University Campus',
                'is_online': False,
                'start_datetime': datetime.now() + timedelta(days=30),
                'end_datetime': datetime.now() + timedelta(days=30, hours=6),
                'available_seats': 300,
                'price': 0.00,
                'subjects': ['Science', 'Technology', 'Engineering', 'Mathematics'],
                'grade_levels': ['Grade 11-12', 'University Level'],
                'requirements': None
            }
        ]

        for event in events_data:
            cur.execute("""
                INSERT INTO events (
                    created_by, event_picture, title, type, description, location,
                    is_online, start_datetime, end_datetime, available_seats,
                    price, subjects, grade_levels, requirements
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                event['created_by'], event['event_picture'], event['title'],
                event['type'], event['description'], event['location'],
                event['is_online'], event['start_datetime'], event['end_datetime'],
                event['available_seats'], event['price'], json.dumps(event['subjects']),
                json.dumps(event['grade_levels']), event['requirements']
            ))
            print(f"  + Created event: {event['title']}")

        # Create Clubs
        print("\nCreating clubs...")

        clubs_data = [
            {
                'created_by': user_ids[0],
                'club_picture': '/uploads/system_images/system_images/Math wallpaper 2.jpeg',
                'title': 'Mathematics Excellence Club',
                'category': 'Academic',
                'description': 'A community for students passionate about mathematics. Weekly problem-solving sessions, guest lectures, and competition preparation.',
                'member_limit': 50,
                'membership_type': 'open',
                'is_paid': True,
                'membership_fee': 100.00,
                'subjects': ['Mathematics', 'Logic'],
                'meeting_schedule': 'Every Saturday, 2:00 PM - 4:00 PM',
                'meeting_location': 'Addis Ababa University, Room 301',
                'rules': 'Regular attendance required. Respectful participation in all activities. Complete weekly challenges.'
            },
            {
                'created_by': user_ids[1],
                'club_picture': '/uploads/system_images/system_images/Chemistry wallpaper 4.jpeg',
                'title': 'Young Scientists of Ethiopia',
                'category': 'Science',
                'description': 'Explore the wonders of science through hands-on experiments, field trips, and research projects.',
                'member_limit': 40,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0.00,
                'subjects': ['Chemistry', 'Biology', 'Physics'],
                'meeting_schedule': 'Bi-weekly on Thursdays, 3:30 PM - 5:30 PM',
                'meeting_location': 'Online and In-person (Hybrid)',
                'rules': 'Safety first in all experiments. Share findings with the group. Support fellow members.'
            },
            {
                'created_by': user_ids[2],
                'club_picture': '/uploads/system_images/system_images/Music.jpeg',
                'title': 'Ethiopian Literature & Debate Society',
                'category': 'Arts & Culture',
                'description': 'Discuss classic and contemporary Ethiopian literature, practice debate skills, and improve critical thinking.',
                'member_limit': 35,
                'membership_type': 'approval_required',
                'is_paid': True,
                'membership_fee': 75.00,
                'subjects': ['Amharic', 'Literature', 'Critical Thinking'],
                'meeting_schedule': 'Weekly on Wednesdays, 4:00 PM - 6:00 PM',
                'meeting_location': 'Ethiopian National Library, Conference Room',
                'rules': 'Read assigned materials before meetings. Participate actively in discussions. Maintain respectful discourse.'
            },
            {
                'created_by': user_ids[3],
                'club_picture': '/uploads/system_images/system_images/Math wallpaper 3.jpeg',
                'title': 'Coding & Robotics Club',
                'category': 'Technology',
                'description': 'Learn programming, build robots, and compete in robotics competitions. All skill levels welcome!',
                'member_limit': 30,
                'membership_type': 'open',
                'is_paid': True,
                'membership_fee': 250.00,
                'subjects': ['Computer Science', 'Engineering', 'Robotics'],
                'meeting_schedule': 'Tuesdays and Fridays, 3:00 PM - 5:00 PM',
                'meeting_location': 'Hawassa University, Tech Lab',
                'rules': 'Bring your laptop to sessions. Work collaboratively. Share your projects with the community.'
            },
            {
                'created_by': user_ids[4],
                'club_picture': '/uploads/system_images/system_images/Geography wallpaper 2.jpeg',
                'title': 'Environmental Action Group',
                'category': 'Community Service',
                'description': 'Make a difference! Join us in environmental conservation projects, tree planting, and sustainability initiatives.',
                'member_limit': 60,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0.00,
                'subjects': ['Environmental Science', 'Geography'],
                'meeting_schedule': 'First and Third Sunday of each month, 9:00 AM - 12:00 PM',
                'meeting_location': 'Various locations (announced weekly)',
                'rules': 'Commit to attending events. Respect nature. Promote eco-friendly practices.'
            },
            {
                'created_by': user_ids[0],
                'club_picture': '/uploads/system_images/system_images/Theology Wallpaper 1.jpg',
                'title': 'Language Exchange Circle',
                'category': 'Languages',
                'description': 'Practice English, Amharic, Oromo, and other languages in a friendly, supportive environment.',
                'member_limit': 45,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0.00,
                'subjects': ['English', 'Amharic', 'Oromo', 'French'],
                'meeting_schedule': 'Weekly on Saturdays, 10:00 AM - 12:00 PM',
                'meeting_location': 'Online via Zoom',
                'rules': 'Be patient with learners. Speak only target language during sessions. Encourage everyone to participate.'
            },
            {
                'created_by': user_ids[1],
                'club_picture': '/uploads/system_images/system_images/History wallpaper 1.jpeg',
                'title': 'Ethiopian History & Heritage Club',
                'category': 'Cultural',
                'description': 'Explore Ethiopia\'s rich history and cultural heritage through presentations, field trips, and research.',
                'member_limit': 40,
                'membership_type': 'open',
                'is_paid': True,
                'membership_fee': 120.00,
                'subjects': ['History', 'Ethiopian Studies', 'Archaeology'],
                'meeting_schedule': 'Monthly on last Saturday, 2:00 PM - 5:00 PM',
                'meeting_location': 'Ethiopian National Museum and other historical sites',
                'rules': 'Participate in monthly field trips. Prepare presentations on assigned topics. Respect historical sites.'
            }
        ]

        for club in clubs_data:
            cur.execute("""
                INSERT INTO clubs (
                    created_by, club_picture, title, category, description,
                    member_limit, membership_type, is_paid, membership_fee,
                    subjects, meeting_schedule, meeting_location, rules
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                club['created_by'], club['club_picture'], club['title'],
                club['category'], club['description'], club['member_limit'],
                club['membership_type'], club['is_paid'], club['membership_fee'],
                json.dumps(club['subjects']), club['meeting_schedule'], club['meeting_location'],
                club['rules']
            ))

            club_id = cur.fetchone()[0]

            # Auto-add creator as admin member
            cur.execute("""
                INSERT INTO club_memberships (user_id, club_id, role, status)
                VALUES (%s, %s, 'admin', 'active')
            """, (club['created_by'], club_id))

            # Update member count
            cur.execute("UPDATE clubs SET member_count = 1 WHERE id = %s", (club_id,))

            print(f"  + Created club: {club['title']}")

        conn.commit()
        print("\n[SUCCESS] Seeding completed successfully!")
        print(f"\nCreated:")
        print(f"  - {len(events_data)} events")
        print(f"  - {len(clubs_data)} clubs")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_data()
