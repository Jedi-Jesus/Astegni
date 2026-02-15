"""
Check if captions are being saved in stories table
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def check_story_captions():
    """Check stories table for caption data"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Get all stories with their captions
    cur.execute('''
        SELECT id, user_id, caption, media_url, created_at
        FROM stories
        ORDER BY created_at DESC
        LIMIT 10
    ''')

    stories = cur.fetchall()

    if not stories:
        print("No stories found in database")
        return

    print(f"\nFound {len(stories)} recent stories:")
    print("-" * 100)

    for story in stories:
        story_id, user_id, caption, media_url, created_at = story
        print(f"Story ID: {story_id}")
        print(f"User ID: {user_id}")
        print(f"Caption: '{caption}' (type: {type(caption).__name__})")
        print(f"Has caption: {bool(caption)}")
        print(f"Media URL: {media_url[:60]}...")
        print(f"Created: {created_at}")
        print("-" * 100)

    # Check if caption column exists and its type
    cur.execute("""
        SELECT column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'stories' AND column_name = 'caption'
    """)

    caption_col = cur.fetchone()
    if caption_col:
        print(f"\nCaption column info:")
        print(f"  Column: {caption_col[0]}")
        print(f"  Type: {caption_col[1]}")
        print(f"  Nullable: {caption_col[2]}")
        print(f"  Max length: {caption_col[3]}")
    else:
        print("\n⚠️ WARNING: Caption column does not exist!")

    cur.close()
    conn.close()

if __name__ == "__main__":
    check_story_captions()
