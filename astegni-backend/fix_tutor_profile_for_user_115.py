"""
Fix Tutor Profile for User 115
Creates a tutor_profiles record for user ID 115
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def fix_tutor_profile():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print('Checking user 115...')

        # Get user details
        cur.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone, roles
            FROM users
            WHERE id = 115
        """)
        user = cur.fetchone()

        if not user:
            print('ERROR: User 115 not found!')
            return

        user_id, first_name, father_name, grandfather_name, email, phone, roles = user
        print(f'Found user: {first_name} {father_name} {grandfather_name}')
        print(f'Email: {email}, Phone: {phone}')
        print(f'Roles: {roles}')

        # Check if tutor_profiles record exists
        cur.execute("""
            SELECT COUNT(*) FROM tutor_profiles WHERE user_id = %s
        """, (user_id,))
        exists = cur.fetchone()[0]

        if exists:
            print('Tutor profile already exists!')
            return

        print('\nCreating tutor_profiles record...')

        # Create tutor_profiles record
        cur.execute("""
            INSERT INTO tutor_profiles (
                user_id,
                bio,
                subjects,
                languages,
                hourly_rate_min,
                hourly_rate_max,
                experience_years,
                education_level,
                certifications,
                teaching_experience,
                created_at,
                updated_at
            ) VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
        """, (
            user_id,
            f'Professional tutor with expertise in multiple subjects.',  # bio
            '["Mathematics", "Science", "English"]',  # subjects as JSON
            '["English", "Amharic"]',  # languages as JSON
            100.0,  # hourly_rate_min
            500.0,  # hourly_rate_max
            5,  # experience_years
            'Bachelor\'s Degree',  # education_level
            '["Teaching Certificate", "Subject Specialist"]',  # certifications as JSON
            'Experienced tutor with 5+ years of teaching experience.',  # teaching_experience
        ))

        conn.commit()
        print('SUCCESS: Tutor profile created!')

        # Verify
        cur.execute("""
            SELECT user_id, bio, subjects, hourly_rate_min, hourly_rate_max
            FROM tutor_profiles
            WHERE user_id = %s
        """, (user_id,))
        profile = cur.fetchone()

        if profile:
            print(f'\nVerified tutor profile:')
            print(f'  Tutor ID: {profile[0]}')
            print(f'  Bio: {profile[1]}')
            print(f'  Subjects: {profile[2]}')
            print(f'  Hourly Rate: {profile[3]} - {profile[4]} ETB')

    except Exception as e:
        print(f'ERROR: {e}')
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    fix_tutor_profile()
