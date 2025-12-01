"""
Seed sample data for student_achievements, student_certifications, and student_extracurricular_activities

This script adds realistic Ethiopian student data for:
1. Academic achievements (awards, honors, competition wins)
2. Professional certifications (course completions, skill certificates)
3. Extracurricular activities (clubs, sports, volunteering, leadership)

Run this script:
    cd astegni-backend
    python seed_student_enhancements.py
"""

import psycopg
from dotenv import load_dotenv
import os
from datetime import date, timedelta
import random

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

# Sample data for Ethiopian context
ACHIEVEMENTS_DATA = [
    {
        'title': 'National Mathematics Olympiad - First Place',
        'description': 'Won first place in the National Mathematics Olympiad among Grade 12 students across Ethiopia',
        'type': 'competition',
        'organization': 'Ethiopian Mathematics Society',
        'months_ago': 6
    },
    {
        'title': 'Best Student Award',
        'description': 'Awarded Best Student of the Year for outstanding academic performance',
        'type': 'academic',
        'organization': 'Addis Ababa University',
        'months_ago': 3
    },
    {
        'title': 'Science Fair Gold Medal',
        'description': 'Research project on renewable energy won gold medal at National Science Fair',
        'type': 'competition',
        'organization': 'Ethiopian Science and Technology Commission',
        'months_ago': 8
    },
    {
        'title': "Dean's List - Fall 2024",
        'description': 'Recognized for achieving GPA above 3.8 in all courses',
        'type': 'honor',
        'organization': 'Jimma University',
        'months_ago': 4
    },
    {
        'title': 'English Debate Championship Winner',
        'description': 'Won inter-university English debate competition on climate change policy',
        'type': 'competition',
        'organization': 'Ethiopian Debate Association',
        'months_ago': 5
    },
    {
        'title': 'Perfect Score in National Exam',
        'description': 'Achieved 100% score in Grade 12 National Mathematics Examination',
        'type': 'academic',
        'organization': 'Ministry of Education Ethiopia',
        'months_ago': 12
    },
    {
        'title': 'Young Innovator Award',
        'description': 'Recognized for developing mobile app to help farmers access weather information',
        'type': 'award',
        'organization': 'Ethiopian Innovation Fund',
        'months_ago': 7
    },
    {
        'title': 'Chemistry Excellence Award',
        'description': 'Highest marks in chemistry across all sections for 3 consecutive semesters',
        'type': 'academic',
        'organization': 'Bahir Dar University',
        'months_ago': 2
    }
]

CERTIFICATIONS_DATA = [
    {
        'name': 'Python Programming Certificate',
        'organization': 'Coursera',
        'months_ago': 6,
        'skills': ['Python', 'Data Structures', 'Algorithms', 'Object-Oriented Programming'],
        'description': 'Completed comprehensive Python programming course with hands-on projects',
        'credential_id': 'CERT-PY-2024-8475'
    },
    {
        'name': 'Digital Marketing Fundamentals',
        'organization': 'Google Digital Garage',
        'months_ago': 8,
        'skills': ['SEO', 'Social Media Marketing', 'Content Marketing', 'Analytics'],
        'description': 'Google-certified digital marketing professional course',
        'credential_id': 'GDG-DM-2024-1823'
    },
    {
        'name': 'First Aid and CPR Certification',
        'organization': 'Ethiopian Red Cross Society',
        'months_ago': 10,
        'expiry_months': 14,  # Expires in 14 months
        'skills': ['First Aid', 'CPR', 'Emergency Response'],
        'description': 'Certified in emergency first aid and CPR techniques',
        'credential_id': 'ERCS-FA-2024-3456'
    },
    {
        'name': 'Microsoft Office Specialist',
        'organization': 'Microsoft',
        'months_ago': 12,
        'skills': ['Microsoft Word', 'Excel', 'PowerPoint', 'Office Suite'],
        'description': 'Certified in advanced Microsoft Office applications',
        'credential_id': 'MOS-2024-9821'
    },
    {
        'name': 'Web Development Bootcamp',
        'organization': 'Udemy',
        'months_ago': 9,
        'skills': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'],
        'description': 'Full-stack web development bootcamp with 50+ projects',
        'credential_id': 'UDM-WD-2024-5632'
    },
    {
        'name': 'English Language Proficiency - IELTS',
        'organization': 'British Council Ethiopia',
        'months_ago': 14,
        'expiry_months': 10,  # Expires in 10 months (2 years from issue)
        'skills': ['English Speaking', 'Writing', 'Reading', 'Listening'],
        'description': 'Achieved Band 7.5 in IELTS Academic',
        'credential_id': 'IELTS-2023-4782'
    },
    {
        'name': 'Data Analytics with Excel',
        'organization': 'LinkedIn Learning',
        'months_ago': 5,
        'skills': ['Data Analysis', 'Excel Formulas', 'Pivot Tables', 'Data Visualization'],
        'description': 'Advanced Excel for data analysis and business intelligence',
        'credential_id': 'LNK-DA-2024-7234'
    }
]

EXTRACURRICULAR_DATA = [
    {
        'name': 'Student Government Association',
        'type': 'leadership',
        'organization': 'Addis Ababa University',
        'role': 'Vice President',
        'start_months_ago': 18,
        'end_months_ago': 6,
        'hours_per_week': 8.0,
        'description': 'Led student initiatives, organized campus events, represented student concerns to administration',
        'achievements': ['Organized 5 major campus events', 'Increased student participation by 40%', 'Implemented new feedback system'],
        'skills': ['Leadership', 'Public Speaking', 'Event Management', 'Negotiation']
    },
    {
        'name': 'Addis Ababa Youth Football Club',
        'type': 'sport',
        'organization': 'Addis Ababa Youth Sports Center',
        'role': 'Team Captain',
        'start_months_ago': 36,
        'end_months_ago': None,  # Currently active
        'hours_per_week': 10.0,
        'description': 'Leading the university football team in regional competitions',
        'achievements': ['Won Regional Championship 2023', 'Top scorer in 2024 season', 'Led team to nationals'],
        'skills': ['Teamwork', 'Leadership', 'Physical Fitness', 'Strategic Thinking']
    },
    {
        'name': 'Ethiopian Red Cross Volunteer',
        'type': 'volunteer',
        'organization': 'Ethiopian Red Cross Society',
        'role': 'Volunteer Coordinator',
        'start_months_ago': 24,
        'end_months_ago': None,  # Currently active
        'hours_per_week': 6.0,
        'description': 'Coordinating disaster relief efforts and blood donation drives across Addis Ababa',
        'achievements': ['Organized 12 blood donation drives', 'Recruited 150+ new volunteers', 'Disaster relief in 3 regions'],
        'skills': ['Community Service', 'Coordination', 'First Aid', 'Crisis Management']
    },
    {
        'name': 'University Drama Club',
        'type': 'drama',
        'organization': 'Jimma University Arts Department',
        'role': 'Lead Actor & Director',
        'start_months_ago': 20,
        'end_months_ago': 4,
        'hours_per_week': 5.0,
        'description': 'Performed in and directed multiple stage productions',
        'achievements': ['Directed 3 plays', 'Best Actor Award 2023', 'Performed at National Theatre'],
        'skills': ['Public Speaking', 'Creative Expression', 'Teamwork', 'Time Management']
    },
    {
        'name': 'Environmental Conservation Club',
        'type': 'club',
        'organization': 'Bahir Dar University',
        'role': 'Founding Member',
        'start_months_ago': 30,
        'end_months_ago': None,  # Currently active
        'hours_per_week': 4.0,
        'description': 'Leading campus sustainability initiatives and tree planting campaigns',
        'achievements': ['Planted 5,000+ trees', 'Reduced campus plastic use by 60%', 'Established recycling program'],
        'skills': ['Environmental Awareness', 'Project Management', 'Community Engagement']
    },
    {
        'name': 'Debate Society',
        'type': 'debate',
        'organization': 'Hawassa University',
        'role': 'Member',
        'start_months_ago': 16,
        'end_months_ago': None,  # Currently active
        'hours_per_week': 3.0,
        'description': 'Participating in competitive debates on national and international issues',
        'achievements': ['Won 3 inter-university debates', 'Represented university at nationals', 'Best speaker award twice'],
        'skills': ['Critical Thinking', 'Public Speaking', 'Research', 'Argumentation']
    },
    {
        'name': 'University Choir',
        'type': 'music',
        'organization': 'Mekelle University',
        'role': 'Choir Member',
        'start_months_ago': 28,
        'end_months_ago': 8,
        'hours_per_week': 4.0,
        'description': 'Performed traditional and contemporary Ethiopian music at university and community events',
        'achievements': ['Performed at 20+ events', 'Recorded 2 albums', 'National music festival participation'],
        'skills': ['Musical Performance', 'Teamwork', 'Cultural Expression', 'Discipline']
    },
    {
        'name': 'Coding Club - Tech Tutoring',
        'type': 'club',
        'organization': 'Addis Ababa Science and Technology University',
        'role': 'Mentor',
        'start_months_ago': 12,
        'end_months_ago': None,  # Currently active
        'hours_per_week': 6.0,
        'description': 'Teaching programming to fellow students and organizing hackathons',
        'achievements': ['Mentored 30+ students', 'Organized 2 hackathons', 'Created online tutorial series'],
        'skills': ['Programming', 'Teaching', 'Mentorship', 'Technical Communication']
    }
]

def get_student_ids(cursor):
    """Get list of student user IDs from database"""
    cursor.execute("""
        SELECT id FROM users
        WHERE roles::jsonb ? 'student'
        ORDER BY id
        LIMIT 10
    """)
    return [row[0] for row in cursor.fetchall()]

def seed_achievements(cursor, student_ids):
    """Seed student achievements data"""
    print("\nSeeding student achievements...")
    count = 0

    for student_id in student_ids:
        # Each student gets 1-3 achievements
        num_achievements = random.randint(1, 3)
        selected_achievements = random.sample(ACHIEVEMENTS_DATA, num_achievements)

        for i, achievement in enumerate(selected_achievements):
            date_received = date.today() - timedelta(days=achievement['months_ago'] * 30)
            is_featured = i == 0  # Feature the first achievement
            verification_status = random.choice(['verified', 'verified', 'verified', 'pending'])  # 75% verified

            cursor.execute("""
                INSERT INTO student_achievements
                (student_id, title, description, achievement_type, issuing_organization,
                 date_received, verification_status, is_featured, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                achievement['title'],
                achievement['description'],
                achievement['type'],
                achievement['organization'],
                date_received,
                verification_status,
                is_featured,
                i
            ))
            count += 1

    print(f"Added {count} achievements for {len(student_ids)} students")

def seed_certifications(cursor, student_ids):
    """Seed student certifications data"""
    print("\nSeeding student certifications...")
    count = 0

    for student_id in student_ids:
        # Each student gets 1-4 certifications
        num_certs = random.randint(1, 4)
        selected_certs = random.sample(CERTIFICATIONS_DATA, num_certs)

        for i, cert in enumerate(selected_certs):
            issue_date = date.today() - timedelta(days=cert['months_ago'] * 30)
            expiration_date = None
            if 'expiry_months' in cert:
                expiration_date = date.today() + timedelta(days=cert['expiry_months'] * 30)

            is_featured = i == 0  # Feature the first certification
            verification_status = random.choice(['verified', 'verified', 'pending'])  # 67% verified

            cursor.execute("""
                INSERT INTO student_certifications
                (student_id, certification_name, issuing_organization, issue_date,
                 expiration_date, credential_id, skills, description,
                 verification_status, is_featured, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                cert['name'],
                cert['organization'],
                issue_date,
                expiration_date,
                cert['credential_id'],
                cert['skills'],
                cert['description'],
                verification_status,
                is_featured,
                i
            ))
            count += 1

    print(f"Added {count} certifications for {len(student_ids)} students")

def seed_extracurricular(cursor, student_ids):
    """Seed student extracurricular activities data"""
    print("\nSeeding extracurricular activities...")
    count = 0

    for student_id in student_ids:
        # Each student gets 2-4 activities
        num_activities = random.randint(2, 4)
        selected_activities = random.sample(EXTRACURRICULAR_DATA, num_activities)

        for i, activity in enumerate(selected_activities):
            start_date = date.today() - timedelta(days=activity['start_months_ago'] * 30)
            end_date = None
            is_currently_active = True

            if activity['end_months_ago'] is not None:
                end_date = date.today() - timedelta(days=activity['end_months_ago'] * 30)
                is_currently_active = False

            is_featured = i == 0  # Feature the first activity
            verification_status = random.choice(['verified', 'verified', 'pending'])  # 67% verified

            cursor.execute("""
                INSERT INTO student_extracurricular_activities
                (student_id, activity_name, activity_type, organization_name, role_position,
                 start_date, end_date, is_currently_active, hours_per_week, description,
                 achievements, skills_gained, verification_status, is_featured, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                activity['name'],
                activity['type'],
                activity['organization'],
                activity['role'],
                start_date,
                end_date,
                is_currently_active,
                activity['hours_per_week'],
                activity['description'],
                activity['achievements'],
                activity['skills'],
                verification_status,
                is_featured,
                i
            ))
            count += 1

    print(f"Added {count} extracurricular activities for {len(student_ids)} students")

def main():
    """Main seeding function"""
    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("="*70)
        print("SEEDING STUDENT ENHANCEMENT DATA")
        print("="*70)

        # Get student IDs
        student_ids = get_student_ids(cursor)

        if not student_ids:
            print("\nWARNING: No students found in database!")
            print("Please run: python seed_student_data.py first")
            return

        print(f"\nFound {len(student_ids)} students to enhance")

        # Seed all three tables
        seed_achievements(cursor, student_ids)
        seed_certifications(cursor, student_ids)
        seed_extracurricular(cursor, student_ids)

        # Commit changes
        conn.commit()

        print("\n" + "="*70)
        print("SEEDING COMPLETE!")
        print("="*70)
        print("\nSummary:")
        print(f"  - Enhanced {len(student_ids)} student profiles")
        print(f"  - Added achievements (awards, honors, competitions)")
        print(f"  - Added certifications (professional certificates)")
        print(f"  - Added extracurricular activities (clubs, sports, volunteering)")
        print("\nFeatures:")
        print(f"  - Each student has 1-3 achievements")
        print(f"  - Each student has 1-4 certifications")
        print(f"  - Each student has 2-4 extracurricular activities")
        print(f"  - ~70% items are verified")
        print(f"  - First item in each category is featured")
        print("\nNext steps:")
        print("  1. Create API endpoints: student_enhancement_endpoints.py")
        print("  2. Update student-profile.html to display sections")
        print("  3. Create frontend modals for adding/editing items")
        print("="*70)

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
