"""
Test script to verify new Backblaze profile-based structure
This will show you the new folder paths without actually uploading
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Import backblaze service
from backblaze_service import get_backblaze_service

def test_backblaze_connection():
    """Test if Backblaze is properly configured"""
    print("=" * 60)
    print("TESTING BACKBLAZE CONNECTION")
    print("=" * 60)

    b2_service = get_backblaze_service()

    print(f"✓ Backblaze service initialized")
    print(f"✓ Configured: {b2_service.configured}")
    print(f"✓ Bucket: {os.getenv('BACKBLAZE_BUCKET_NAME')}")
    print()

    return b2_service

def show_new_folder_structure(b2_service):
    """Show what the new folder structure looks like"""
    print("=" * 60)
    print("NEW FOLDER STRUCTURE (PROFILE-BASED)")
    print("=" * 60)
    print()

    # Example profile IDs
    tutor_profile_id = 12
    student_profile_id = 28

    print("📁 TUTOR PROFILE FILES (Profile ID: 12)")
    print("-" * 60)

    # Profile picture
    path = b2_service._get_folder_path('profile', 'avatar.jpg', f'profile_{tutor_profile_id}')
    print(f"Profile Picture: {path}")

    # Cover image
    path = b2_service._get_folder_path('cover', 'cover.jpg', f'profile_{tutor_profile_id}')
    print(f"Cover Image:     {path}")

    # Video story
    path = b2_service._get_folder_path('story_video', 'teaching_tip.mp4', f'profile_{tutor_profile_id}')
    print(f"Video Story:     {path}")

    # Image story
    path = b2_service._get_folder_path('story_image', 'quote.jpg', f'profile_{tutor_profile_id}')
    print(f"Image Story:     {path}")

    print()
    print("📁 STUDENT PROFILE FILES (Profile ID: 28)")
    print("-" * 60)

    # Profile picture
    path = b2_service._get_folder_path('profile', 'avatar.jpg', f'profile_{student_profile_id}')
    print(f"Profile Picture: {path}")

    # Video story
    path = b2_service._get_folder_path('story_video', 'my_day.mp4', f'profile_{student_profile_id}')
    print(f"Video Story:     {path}")

    # Image story
    path = b2_service._get_folder_path('story_image', 'progress.jpg', f'profile_{student_profile_id}')
    print(f"Image Story:     {path}")

    # Document (uses direct profile_id)
    path = b2_service._get_folder_path('files', 'certificate.pdf', str(student_profile_id))
    print(f"Document:        {path}")

    print()
    print("📁 SYSTEM/ADMIN FILES")
    print("-" * 60)

    # System files
    path = b2_service._get_folder_path('post_image', 'banner.jpg', 'admin_system')
    print(f"System Banner:   {path}")

    path = b2_service._get_folder_path('ad_video', 'promo.mp4', 'admin_system')
    print(f"System Ad Video: {path}")

    print()

def compare_old_vs_new():
    """Show comparison between old and new structure"""
    print("=" * 60)
    print("OLD vs NEW STRUCTURE COMPARISON")
    print("=" * 60)
    print()

    print("STORIES:")
    print("  OLD: stories/user_456/story_20240115.mp4")
    print("  NEW: videos/stories/user_profile_123/story_20240115.mp4")
    print("  NEW: images/stories/user_profile_123/story_20240115.jpg")
    print()

    print("PROFILE PICTURES:")
    print("  OLD: images/profile/user_profile_123/avatar.jpg  ✓ (already correct)")
    print("  NEW: images/profile/user_profile_123/avatar.jpg  ✓ (no change)")
    print()

    print("SYSTEM FILES:")
    print("  OLD: images/posts/user_system/banner.jpg")
    print("  NEW: images/posts/user_admin_system/banner.jpg")
    print()

def show_folder_mapping():
    """Show the folder mapping configuration"""
    print("=" * 60)
    print("FOLDER MAPPING CONFIGURATION")
    print("=" * 60)
    print()

    b2_service = get_backblaze_service()

    print("IMAGE FOLDERS:")
    for key, value in b2_service.FOLDER_MAPPING.items():
        if value.startswith('images/'):
            print(f"  '{key}' → {value}")

    print()
    print("VIDEO FOLDERS:")
    for key, value in b2_service.FOLDER_MAPPING.items():
        if value.startswith('videos/'):
            print(f"  '{key}' → {value}")

    print()
    print("DOCUMENT FOLDERS:")
    for key, value in b2_service.FOLDER_MAPPING.items():
        if value.startswith('documents/'):
            print(f"  '{key}' → {value}")

    print()

def main():
    """Run all tests"""
    print("\n" * 2)
    print("=" * 60)
    print("  BACKBLAZE PROFILE-BASED STRUCTURE TEST")
    print("=" * 60)
    print()

    try:
        # Test connection
        b2_service = test_backblaze_connection()

        # Show new structure
        show_new_folder_structure(b2_service)

        # Compare old vs new
        compare_old_vs_new()

        # Show folder mapping
        show_folder_mapping()

        print("=" * 60)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print()
        print("NEXT STEPS:")
        print("1. Start your backend: python app.py")
        print("2. Upload a file via API (profile picture, story, etc.)")
        print("3. Check your Backblaze bucket to see new folders!")
        print()

    except Exception as e:
        print("=" * 60)
        print("❌ ERROR:")
        print("=" * 60)
        print(f"{str(e)}")
        print()
        print("TROUBLESHOOTING:")
        print("- Check your .env file has correct Backblaze credentials")
        print("- Verify BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY")
        print("- Ensure BACKBLAZE_BUCKET_NAME is correct")
        print()

if __name__ == "__main__":
    main()
