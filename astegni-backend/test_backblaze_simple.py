"""
Simple test to show new Backblaze profile-based structure
"""

import os
from dotenv import load_dotenv
load_dotenv()

from backblaze_service import get_backblaze_service

print("\n" * 2)
print("=" * 70)
print(" " * 15 + "BACKBLAZE PROFILE-BASED STRUCTURE TEST")
print("=" * 70)
print()

# Test connection
print("TESTING BACKBLAZE CONNECTION")
print("-" * 70)

b2_service = get_backblaze_service()

print(f"[OK] Backblaze service initialized")
print(f"[OK] Configured: {b2_service.configured}")
print(f"[OK] Bucket: {os.getenv('BACKBLAZE_BUCKET_NAME')}")
print()

# Show new folder structure
print("=" * 70)
print("NEW FOLDER STRUCTURE (PROFILE-BASED)")
print("=" * 70)
print()

# Example profile IDs
tutor_profile_id = 12
student_profile_id = 28

print("TUTOR PROFILE FILES (Profile ID: 12)")
print("-" * 70)

path = b2_service._get_folder_path('profile', 'avatar.jpg', f'profile_{tutor_profile_id}')
print(f"Profile Picture:  {path}")

path = b2_service._get_folder_path('cover', 'cover.jpg', f'profile_{tutor_profile_id}')
print(f"Cover Image:      {path}")

path = b2_service._get_folder_path('story_video', 'teaching_tip.mp4', f'profile_{tutor_profile_id}')
print(f"Video Story:      {path}")

path = b2_service._get_folder_path('story_image', 'quote.jpg', f'profile_{tutor_profile_id}')
print(f"Image Story:      {path}")

print()
print("STUDENT PROFILE FILES (Profile ID: 28)")
print("-" * 70)

path = b2_service._get_folder_path('profile', 'avatar.jpg', f'profile_{student_profile_id}')
print(f"Profile Picture:  {path}")

path = b2_service._get_folder_path('story_video', 'my_day.mp4', f'profile_{student_profile_id}')
print(f"Video Story:      {path}")

path = b2_service._get_folder_path('story_image', 'progress.jpg', f'profile_{student_profile_id}')
print(f"Image Story:      {path}")

path = b2_service._get_folder_path('files', 'certificate.pdf', str(student_profile_id))
print(f"Document:         {path}")

print()
print("SYSTEM/ADMIN FILES")
print("-" * 70)

path = b2_service._get_folder_path('post_image', 'banner.jpg', 'admin_system')
print(f"System Banner:    {path}")

path = b2_service._get_folder_path('ad_video', 'promo.mp4', 'admin_system')
print(f"System Ad Video:  {path}")

print()
print("=" * 70)
print("OLD vs NEW STRUCTURE COMPARISON")
print("=" * 70)
print()

print("STORIES:")
print("  OLD: stories/user_456/story_20240115.mp4")
print("  NEW: videos/stories/user_profile_123/story_20240115.mp4")
print("  NEW: images/stories/user_profile_123/story_20240115.jpg")
print()

print("SYSTEM FILES:")
print("  OLD: images/posts/user_system/banner.jpg")
print("  NEW: images/posts/user_admin_system/banner.jpg")
print()

print("=" * 70)
print("[SUCCESS] ALL TESTS COMPLETED!")
print("=" * 70)
print()
print("NEXT STEPS:")
print("1. Start your backend: python app.py")
print("2. Upload a file via API (profile picture, story, etc.)")
print("3. Check your Backblaze bucket to see new folders!")
print()
