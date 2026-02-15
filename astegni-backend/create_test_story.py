"""
Create a test story for jediael.s.abebe@gmail.com
"""

import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def create_test_story():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Get user
    cur.execute('SELECT id FROM users WHERE email = %s', ('jediael.s.abebe@gmail.com',))
    user = cur.fetchone()
    if not user:
        print('User not found')
        return
    user_id = user[0]

    # Get tutor profile
    cur.execute('SELECT id FROM tutor_profiles WHERE user_id = %s', (user_id,))
    tutor = cur.fetchone()
    if not tutor:
        print('Tutor profile not found')
        return
    profile_id = tutor[0]

    print(f'Creating test story for user_id={user_id}, profile_id={profile_id}')

    # Create test story
    media_url = 'https://f003.backblazeb2.com/file/astegni-media/images/cover/user_profile_5/Bruce_6_20260210_134821.jpg'
    caption = 'Welcome to my profile! Ready to help students excel in their studies.'
    expires_at = datetime.utcnow() + timedelta(hours=24)

    cur.execute('''
        INSERT INTO stories (user_id, profile_id, profile_type, media_url, media_type, caption, views, created_at, expires_at, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    ''', (user_id, profile_id, 'tutor', media_url, 'image', caption, 12, datetime.utcnow(), expires_at, True))

    story_id = cur.fetchone()[0]
    conn.commit()

    print(f'Test story created successfully! Story ID: {story_id}')
    print(f'Media URL: {media_url}')
    print(f'Caption: {caption}')
    print(f'Expires at: {expires_at}')

    # Verify
    cur.execute('SELECT COUNT(*) FROM stories WHERE user_id = %s', (user_id,))
    count = cur.fetchone()[0]
    print(f'Total stories for this user: {count}')

    cur.close()
    conn.close()

if __name__ == "__main__":
    create_test_story()
