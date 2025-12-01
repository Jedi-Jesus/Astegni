"""
Seed packages specifically for tutor user_id 85 (tutor_profile_id 63)
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
        print('Creating packages for tutor user_id 85...')

        # Get tutor_profile id for user_id 85
        cur.execute('SELECT id FROM tutor_profiles WHERE user_id = 85')
        result = cur.fetchone()

        if not result:
            print('ERROR: No tutor profile found for user_id 85')
            return

        tutor_profile_id = result[0]
        print(f'Found tutor_profile_id: {tutor_profile_id}')

        # Delete existing packages for this tutor
        cur.execute('DELETE FROM tutor_packages WHERE tutor_id = %s', (tutor_profile_id,))
        print(f'Deleted {cur.rowcount} existing packages')

        # Sample packages
        packages = [
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
            }
        ]

        # Insert packages
        for pkg in packages:
            cur.execute("""
                INSERT INTO tutor_packages (
                    tutor_id, name, grade_level, courses, description,
                    hourly_rate, days_per_week, hours_per_day, payment_frequency,
                    discount_1_month, discount_3_month, discount_6_month, discount_12_month,
                    is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tutor_profile_id,
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
                pkg['discount_12_month'],
                True
            ))
            print(f'  ✅ Created: {pkg["name"]}')

        conn.commit()
        print(f'\n✅ Successfully created {len(packages)} packages!')

        # Verify
        cur.execute('SELECT COUNT(*) FROM tutor_packages WHERE tutor_id = %s', (tutor_profile_id,))
        count = cur.fetchone()[0]
        print(f'Total packages for tutor: {count}')

    except Exception as e:
        print(f'❌ Error: {e}')
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    seed_packages()
