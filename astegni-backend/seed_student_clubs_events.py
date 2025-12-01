"""
Seed clubs and events data for student_id 28
"""

import psycopg
import os
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_clubs_events():
    """Seed sample clubs and events for student_id 28"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Seeding clubs and events for student_id 28...")

        # Create clubs
        clubs_data = [
            {
                'title': 'Ethiopian Mathematics Club',
                'category': 'Academic',
                'description': 'A club dedicated to exploring advanced mathematics concepts, problem-solving techniques, and preparing for math competitions. We meet weekly to discuss challenging problems and share knowledge.',
                'member_limit': 30,
                'member_count': 15,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0,
                'subjects': ['Mathematics', 'Logic', 'Problem Solving'],
                'meeting_schedule': 'Every Wednesday 4:00 PM',
                'meeting_location': 'Room 205, Main Building',
                'rules': 'Be respectful, participate actively, help each other learn',
                'status': 'active',
                'created_by': 28,
                'creator_type': 'student',
                'club_picture': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
            },
            {
                'title': 'Science & Innovation Club',
                'category': 'Science',
                'description': 'For students passionate about scientific discovery and innovation. We conduct experiments, discuss latest scientific breakthroughs, and work on projects together.',
                'member_limit': 25,
                'member_count': 18,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0,
                'subjects': ['Physics', 'Chemistry', 'Biology', 'Technology'],
                'meeting_schedule': 'Every Friday 3:30 PM',
                'meeting_location': 'Science Lab 3',
                'rules': 'Safety first, respect equipment, collaborate with peers',
                'status': 'active',
                'created_by': 28,
                'creator_type': 'student',
                'club_picture': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
            },
            {
                'title': 'Debate & Public Speaking',
                'category': 'Communication',
                'description': 'Develop your argumentation, critical thinking, and public speaking skills. Perfect for students interested in debate competitions and improving communication abilities.',
                'member_limit': 20,
                'member_count': 12,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0,
                'subjects': ['English', 'Critical Thinking', 'Communication'],
                'meeting_schedule': 'Every Tuesday 5:00 PM',
                'meeting_location': 'Auditorium B',
                'rules': 'Listen respectfully, support diverse opinions, practice regularly',
                'status': 'active',
                'created_by': 28,
                'creator_type': 'student',
                'club_picture': 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400'
            },
            {
                'title': 'Ethiopian Cultural Heritage Club',
                'category': 'Cultural',
                'description': 'Celebrating Ethiopian culture, history, and traditions. Learn about our rich heritage, traditional music, dance, and customs while connecting with fellow students.',
                'member_limit': 40,
                'member_count': 28,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0,
                'subjects': ['History', 'Culture', 'Arts', 'Music'],
                'meeting_schedule': 'Every Saturday 2:00 PM',
                'meeting_location': 'Cultural Center',
                'rules': 'Respect all cultures, participate in activities, preserve traditions',
                'status': 'active',
                'created_by': 28,
                'creator_type': 'student',
                'club_picture': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400'
            },
            {
                'title': 'Coding & Technology Club',
                'category': 'Technology',
                'description': 'Learn programming, web development, and emerging technologies. Work on real projects, participate in hackathons, and build your tech skills with peers.',
                'member_limit': 35,
                'member_count': 22,
                'membership_type': 'open',
                'is_paid': False,
                'membership_fee': 0,
                'subjects': ['Computer Science', 'Programming', 'Web Development'],
                'meeting_schedule': 'Every Thursday 4:30 PM',
                'meeting_location': 'Computer Lab 2',
                'rules': 'Share knowledge, collaborate on projects, respect intellectual property',
                'status': 'active',
                'created_by': 28,
                'creator_type': 'student',
                'club_picture': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400'
            }
        ]

        club_ids = []
        for club in clubs_data:
            # Convert subjects list to JSON string
            club_copy = club.copy()
            club_copy['subjects'] = json.dumps(club['subjects'])

            cursor.execute("""
                INSERT INTO clubs (
                    title, category, description, member_limit, member_count,
                    membership_type, is_paid, membership_fee, subjects,
                    meeting_schedule, meeting_location, rules, status,
                    created_by, creator_type, club_picture
                ) VALUES (
                    %(title)s, %(category)s, %(description)s, %(member_limit)s, %(member_count)s,
                    %(membership_type)s, %(is_paid)s, %(membership_fee)s, %(subjects)s,
                    %(meeting_schedule)s, %(meeting_location)s, %(rules)s, %(status)s,
                    %(created_by)s, %(creator_type)s, %(club_picture)s
                )
                RETURNING id
            """, club_copy)
            club_ids.append(cursor.fetchone()[0])

        print(f"[OK] Created {len(clubs_data)} clubs")

        # Create events
        now = datetime.now()
        events_data = [
            {
                'title': 'Ethiopian Mathematics Olympiad Preparation',
                'type': 'Workshop',
                'description': 'Intensive workshop to prepare students for the upcoming Ethiopian Mathematics Olympiad. Expert tutors will cover problem-solving strategies and advanced topics.',
                'location': 'Main Hall, 3rd Floor',
                'is_online': False,
                'start_datetime': now + timedelta(days=7),
                'end_datetime': now + timedelta(days=7, hours=3),
                'available_seats': 50,
                'registered_count': 23,
                'price': 0,
                'subjects': ['Mathematics', 'Problem Solving'],
                'grade_levels': ['Grade 9-10', 'Grade 11-12'],
                'requirements': 'Basic knowledge of algebra and geometry required',
                'status': 'upcoming',
                'created_by': 28,
                'creator_type': 'student',
                'event_picture': 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400'
            },
            {
                'title': 'Science Fair 2025',
                'type': 'Competition',
                'description': 'Annual science fair where students showcase their research projects and experiments. Prizes for best projects in Physics, Chemistry, and Biology categories.',
                'location': 'Science Building Courtyard',
                'is_online': False,
                'start_datetime': now + timedelta(days=14),
                'end_datetime': now + timedelta(days=14, hours=6),
                'available_seats': 100,
                'registered_count': 45,
                'price': 0,
                'subjects': ['Physics', 'Chemistry', 'Biology', 'Science'],
                'grade_levels': ['Grade 7-8', 'Grade 9-10', 'Grade 11-12'],
                'requirements': 'Submit project proposal by registration deadline',
                'status': 'upcoming',
                'created_by': 28,
                'creator_type': 'student',
                'event_picture': 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400'
            },
            {
                'title': 'Inter-School Debate Championship',
                'type': 'Competition',
                'description': 'Regional debate competition bringing together top debaters from schools across Addis Ababa. Topics include current affairs, education, and social issues.',
                'location': 'Grand Auditorium',
                'is_online': False,
                'start_datetime': now + timedelta(days=21),
                'end_datetime': now + timedelta(days=21, hours=4),
                'available_seats': 200,
                'registered_count': 87,
                'price': 50,
                'subjects': ['English', 'Critical Thinking', 'Communication'],
                'grade_levels': ['Grade 9-10', 'Grade 11-12'],
                'requirements': 'Team of 3 members required, prior debate experience preferred',
                'status': 'upcoming',
                'created_by': 28,
                'creator_type': 'student',
                'event_picture': 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400'
            },
            {
                'title': 'Ethiopian Culture Night',
                'type': 'Social',
                'description': 'Celebrate Ethiopian culture with traditional food, music, dance performances, and cultural exhibitions. Open to all students and families.',
                'location': 'School Grounds',
                'is_online': False,
                'start_datetime': now + timedelta(days=28),
                'end_datetime': now + timedelta(days=28, hours=5),
                'available_seats': 300,
                'registered_count': 156,
                'price': 100,
                'subjects': ['Culture', 'Arts', 'Music', 'History'],
                'grade_levels': ['All Grades'],
                'requirements': 'No prerequisites - everyone welcome!',
                'status': 'upcoming',
                'created_by': 28,
                'creator_type': 'student',
                'event_picture': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400'
            },
            {
                'title': 'Introduction to Python Programming',
                'type': 'Workshop',
                'description': 'Beginner-friendly workshop covering Python basics, variables, loops, and functions. Perfect for students with no prior programming experience.',
                'location': 'Computer Lab 1',
                'is_online': True,
                'start_datetime': now + timedelta(days=10),
                'end_datetime': now + timedelta(days=10, hours=2),
                'available_seats': 30,
                'registered_count': 18,
                'price': 0,
                'subjects': ['Computer Science', 'Programming'],
                'grade_levels': ['Grade 9-10', 'Grade 11-12', 'University Level'],
                'requirements': 'Laptop required, no prior experience needed',
                'status': 'upcoming',
                'created_by': 28,
                'creator_type': 'student',
                'event_picture': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400'
            },
            {
                'title': 'College Application & Scholarship Workshop',
                'type': 'Workshop',
                'description': 'Learn how to write compelling college applications, personal statements, and find scholarship opportunities. Guest speakers from various universities.',
                'location': 'Conference Room A',
                'is_online': True,
                'start_datetime': now + timedelta(days=5),
                'end_datetime': now + timedelta(days=5, hours=2.5),
                'available_seats': 80,
                'registered_count': 62,
                'price': 0,
                'subjects': ['Career Guidance', 'Education'],
                'grade_levels': ['Grade 11-12'],
                'requirements': 'Bring questions about your college plans',
                'status': 'upcoming',
                'created_by': 28,
                'creator_type': 'student',
                'event_picture': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400'
            }
        ]

        event_ids = []
        for event in events_data:
            # Convert subjects and grade_levels lists to JSON strings
            event_copy = event.copy()
            event_copy['subjects'] = json.dumps(event['subjects'])
            event_copy['grade_levels'] = json.dumps(event['grade_levels'])

            cursor.execute("""
                INSERT INTO events (
                    title, type, description, location, is_online,
                    start_datetime, end_datetime, available_seats, registered_count,
                    price, subjects, grade_levels, requirements, status,
                    created_by, creator_type, event_picture
                ) VALUES (
                    %(title)s, %(type)s, %(description)s, %(location)s, %(is_online)s,
                    %(start_datetime)s, %(end_datetime)s, %(available_seats)s, %(registered_count)s,
                    %(price)s, %(subjects)s, %(grade_levels)s, %(requirements)s, %(status)s,
                    %(created_by)s, %(creator_type)s, %(event_picture)s
                )
                RETURNING id
            """, event_copy)
            event_ids.append(cursor.fetchone()[0])

        print(f"[OK] Created {len(events_data)} events")

        conn.commit()
        print(f"\n[SUCCESS] Successfully seeded {len(clubs_data)} clubs and {len(events_data)} events for student_id 28!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error seeding data: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed_clubs_events()
