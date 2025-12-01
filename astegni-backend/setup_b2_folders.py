#!/usr/bin/env python3
"""
Script to create folder structure in Backblaze B2 bucket.
B2 doesn't have actual folders, but we can create placeholder files to simulate folder structure.
"""

import os
from dotenv import load_dotenv
from b2sdk.v2 import InMemoryAccountInfo, B2Api
import sys

# Load environment variables
load_dotenv()

def create_b2_folders():
    """Create folder structure in Backblaze B2 bucket"""

    # Get credentials from environment
    key_id = os.getenv('BACKBLAZE_KEY_ID')
    application_key = os.getenv('BACKBLAZE_APPLICATION_KEY')
    bucket_name = os.getenv('BACKBLAZE_BUCKET_NAME', 'astegni-media')

    if not key_id or not application_key:
        print("Error: Backblaze credentials not found in .env file")
        print("Please ensure BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY are set")
        return False

    try:
        # Initialize B2 API
        print("Connecting to Backblaze B2...")
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", key_id, application_key)

        # Get the bucket
        bucket = b2_api.get_bucket_by_name(bucket_name)
        print(f"Connected to bucket: {bucket_name}")

        # Define folder structure
        folders = [
            # Images folders
            'images/',
            'images/posts/',
            'images/chat/',
            'images/profile/',
            'images/cover/',
            'images/thumbnails/',
            'images/blog/',
            'images/news/',

            # Audio folders
            'audio/',
            'audio/lectures/',
            'audio/podcasts/',
            'audio/chat/',

            # Videos folders
            'videos/',
            'videos/ad/',
            'videos/lectures/',
            'videos/chat/',
            'videos/programs/',

            # Stories folder (standalone, user-based separation only)
            'stories/',

            # Documents folders
            'documents/',
            'documents/chat/',
            'documents/resources/',
            'documents/files/'  # Student files (achievements, certificates, extracurricular)
        ]

        # Create placeholder files for each folder
        # B2 doesn't have real folders, so we create empty placeholder files
        print("\nCreating folder structure...")
        for folder in folders:
            placeholder_name = f"{folder}.folder"
            try:
                # Upload an empty file as a folder placeholder
                bucket.upload_bytes(
                    b"",  # Empty content
                    placeholder_name,
                    content_type="application/x-directory"
                )
                print(f"[OK] Created folder: {folder}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  Folder already exists: {folder}")
                else:
                    print(f"[ERROR] Error creating {folder}: {str(e)}")

        print("\n" + "="*50)
        print("Folder structure created successfully!")
        print("\nYou can now upload files to these folders:")
        print("\nImages:")
        print("  - images/posts/ (post images)")
        print("  - images/chat/ (chat images)")
        print("  - images/profile/ (profile pictures)")
        print("  - images/cover/ (cover photos)")
        print("  - images/thumbnails/ (video thumbnails)")
        print("  - images/blog/ (blog images)")
        print("  - images/news/ (news images)")
        print("\nAudio:")
        print("  - audio/lectures/ (lecture recordings)")
        print("  - audio/podcasts/ (podcast episodes)")
        print("  - audio/chat/ (voice messages and audio from chat)")
        print("\nVideos:")
        print("  - videos/ad/ (advertisement videos)")
        print("  - videos/lectures/ (lecture videos)")
        print("  - videos/chat/ (chat videos)")
        print("  - videos/programs/ (program videos)")
        print("\nStories:")
        print("  - stories/ (all user stories organized by user_id only)")
        print("\nDocuments:")
        print("  - documents/chat/ (chat documents)")
        print("  - documents/resources/ (resource files)")
        print("  - documents/files/ (student achievements, certificates, extracurricular)")
        print("="*50)

        # List current bucket contents
        print("\nCurrent bucket structure:")
        for file_info in bucket.ls(recursive=True, fetch_count=100):
            file_name = file_info[0].file_name
            if file_name.endswith('.folder'):
                folder_display = file_name.replace('.folder', '')
                print(f"  [FOLDER] {folder_display}")

        return True

    except Exception as e:
        print(f"Error: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check your .env file has correct Backblaze credentials")
        print("2. Ensure your API key has write permissions")
        print("3. Verify the bucket name is correct")
        return False

def test_upload_sample_file():
    """Test uploading a sample file to verify setup"""

    key_id = os.getenv('BACKBLAZE_KEY_ID')
    application_key = os.getenv('BACKBLAZE_APPLICATION_KEY')
    bucket_name = os.getenv('BACKBLAZE_BUCKET_NAME', 'astegni-media')

    try:
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", key_id, application_key)
        bucket = b2_api.get_bucket_by_name(bucket_name)

        # Test upload to each main folder
        test_content = b"Test file content"
        test_files = [
            ('images/test.txt', 'image test'),
            ('audio/test.txt', 'audio test'),
            ('videos/test.txt', 'video test'),
            ('documents/test.txt', 'document test'),
            ('documents/files/test.txt', 'student files test')
        ]

        print("\nTesting file uploads to each folder...")
        for file_path, content in test_files:
            try:
                bucket.upload_bytes(
                    content.encode(),
                    file_path,
                    content_type="text/plain"
                )
                print(f"[OK] Successfully uploaded test file to {file_path}")

                # Delete the test file
                file_version = bucket.get_file_info_by_name(file_path)
                bucket.delete_file_version(file_version.id_, file_path)
                print(f"  Cleaned up test file")

            except Exception as e:
                print(f"[ERROR] Error testing {file_path}: {str(e)}")

        print("\n[SUCCESS] All folders are working correctly!")

    except Exception as e:
        print(f"Error during testing: {str(e)}")

if __name__ == "__main__":
    import sys

    print("="*50)
    print("Backblaze B2 Folder Setup for Astegni")
    print("="*50)

    # Create folder structure
    success = create_b2_folders()

    if success:
        # Check if running with --test flag
        if '--test' in sys.argv:
            test_upload_sample_file()
        elif sys.stdin.isatty():  # Only ask if running interactively
            try:
                response = input("\nDo you want to test file uploads? (y/n): ").lower()
                if response == 'y':
                    test_upload_sample_file()
            except EOFError:
                pass  # Running non-interactively

    print("\nSetup complete!")