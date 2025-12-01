"""
Seed Tutor Packages
Creates sample tutor packages for testing
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Fix Unicode output for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_packages():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print('Seeding tutor packages...')

        # First, get some tutor IDs from the database
        cur.execute("""
            SELECT id, first_name, father_name
            FROM users
            WHERE roles::jsonb ? 'tutor'
            LIMIT 5
        """)
        tutors = cur.fetchall()

        if not tutors:
            print('ERROR: No tutors found in database. Please run seed_tutor_data.py first.')
            return

        print(f'Found {len(tutors)} tutors')

        packages_created = 0

        # Sample packages for different tutors
        sample_packages = [
            # Mathematics packages
            {
                'name': 'Mathematics Complete Package',
                'grade_level': 'Grade 9-10',
                'courses': 'Algebra, Geometry, Trigonometry',
                'description': 'Comprehensive mathematics package covering all Grade 9-10 topics',
                'hourly_rate': 250.00,
                'days_per_week': 3,
                'hours_per_day': 1.5,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 10,
                'discount_6_month': 15,
                'discount_12_month': 20
            },
            {
                'name': 'Advanced Mathematics',
                'grade_level': 'Grade 11-12',
                'courses': 'Calculus, Advanced Algebra, Statistics',
                'description': 'Advanced mathematics for university preparation',
                'hourly_rate': 350.00,
                'days_per_week': 4,
                'hours_per_day': 2,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 15,
                'discount_6_month': 20,
                'discount_12_month': 25
            },
            # Science packages
            {
                'name': 'Science Foundation Package',
                'grade_level': 'Grade 7-8',
                'courses': 'Physics, Chemistry, Biology',
                'description': 'Foundation science package for middle school',
                'hourly_rate': 200.00,
                'days_per_week': 3,
                'hours_per_day': 1,
                'payment_frequency': '2-weeks',
                'discount_1_month': 0,
                'discount_3_month': 5,
                'discount_6_month': 10,
                'discount_12_month': 15
            },
            {
                'name': 'Physics & Chemistry Package',
                'grade_level': 'Grade 11-12',
                'courses': 'Physics, Chemistry',
                'description': 'Advanced physics and chemistry for university preparation',
                'hourly_rate': 300.00,
                'days_per_week': 4,
                'hours_per_day': 1.5,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 12,
                'discount_6_month': 18,
                'discount_12_month': 22
            },
            # Language packages
            {
                'name': 'English Language Package',
                'grade_level': 'All Levels',
                'courses': 'Grammar, Writing, Reading Comprehension, Speaking',
                'description': 'Comprehensive English language learning package',
                'hourly_rate': 180.00,
                'days_per_week': 3,
                'hours_per_day': 1,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 8,
                'discount_6_month': 12,
                'discount_12_month': 18
            },
            # Programming packages
            {
                'name': 'Introduction to Programming',
                'grade_level': 'Grade 9+',
                'courses': 'Python, JavaScript, HTML/CSS',
                'description': 'Learn programming basics with hands-on projects',
                'hourly_rate': 400.00,
                'days_per_week': 2,
                'hours_per_day': 2,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 15,
                'discount_6_month': 25,
                'discount_12_month': 30
            },
            # University preparation
            {
                'name': 'University Entrance Prep',
                'grade_level': 'Grade 12',
                'courses': 'Mathematics, Physics, Chemistry, English',
                'description': 'Intensive university entrance exam preparation',
                'hourly_rate': 450.00,
                'days_per_week': 5,
                'hours_per_day': 2,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 10,
                'discount_6_month': 20,
                'discount_12_month': 25
            },
            # Music packages
            {
                'name': 'Music Theory & Piano',
                'grade_level': 'All Levels',
                'courses': 'Music Theory, Piano, Sight Reading',
                'description': 'Learn music theory and piano from basics to advanced',
                'hourly_rate': 220.00,
                'days_per_week': 2,
                'hours_per_day': 1,
                'payment_frequency': '2-weeks',
                'discount_1_month': 0,
                'discount_3_month': 5,
                'discount_6_month': 10,
                'discount_12_month': 15
            },
            # Art packages
            {
                'name': 'Art & Drawing Package',
                'grade_level': 'All Levels',
                'courses': 'Drawing, Painting, Color Theory, Sketching',
                'description': 'Comprehensive art package from fundamentals to advanced techniques',
                'hourly_rate': 200.00,
                'days_per_week': 2,
                'hours_per_day': 1.5,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 8,
                'discount_6_month': 15,
                'discount_12_month': 20
            },
            # Economics & Business
            {
                'name': 'Economics & Business Studies',
                'grade_level': 'Grade 11-12',
                'courses': 'Economics, Business Studies, Accounting',
                'description': 'Business and economics package for commerce students',
                'hourly_rate': 280.00,
                'days_per_week': 3,
                'hours_per_day': 1.5,
                'payment_frequency': 'monthly',
                'discount_1_month': 0,
                'discount_3_month': 10,
                'discount_6_month': 18,
                'discount_12_month': 22
            }
        ]

        # Distribute packages among tutors
        for idx, tutor in enumerate(tutors):
            tutor_id = tutor[0]
            tutor_name = f"{tutor[1]} {tutor[2]}"

            # Each tutor gets 2 packages
            for pkg_idx in range(2):
                pkg = sample_packages[(idx * 2 + pkg_idx) % len(sample_packages)]

                cur.execute("""
                    INSERT INTO tutor_packages (
                        tutor_id, name, grade_level, courses, description,
                        hourly_rate, days_per_week, hours_per_day, payment_frequency,
                        discount_1_month, discount_3_month, discount_6_month, discount_12_month,
                        is_active
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    tutor_id,
                    pkg['name'],
                    pkg['grade_level'],
                    pkg['courses'],
                    pkg['description'],
                    pkg['hourly_rate'],
                    pkg['days_per_week'],
                    pkg['hours_per_day'],
                    pkg['payment_frequency'],
                    pkg['discount_1_month'],
                    pkg['discount_3_month'],
                    pkg['discount_6_month'],
                    pkg.get('discount_12_month', 0),
                    True
                ))

                packages_created += 1
                print(f'  - Created package "{pkg["name"]}" for {tutor_name}')

        conn.commit()
        print(f'\nSuccessfully created {packages_created} tutor packages!')

        # Show summary
        cur.execute('SELECT COUNT(*) FROM tutor_packages')
        total = cur.fetchone()[0]
        print(f'Total packages in database: {total}')

    except Exception as e:
        print(f'ERROR: Error seeding packages: {e}')
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    seed_packages()
