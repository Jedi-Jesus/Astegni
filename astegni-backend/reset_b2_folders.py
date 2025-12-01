#!/usr/bin/env python3
"""
Script to completely reset B2 folder structure to only include specified folders
"""

import os
from dotenv import load_dotenv
from b2sdk.v2 import InMemoryAccountInfo, B2Api
import sys

# Load environment variables
load_dotenv()

def reset_b2_folders():
    """Reset B2 folder structure to only specified folders"""

    key_id = os.getenv('BACKBLAZE_KEY_ID')
    application_key = os.getenv('BACKBLAZE_APPLICATION_KEY')
    bucket_name = os.getenv('BACKBLAZE_BUCKET_NAME', 'astegni-media')

    if not key_id or not application_key:
        print("Error: Backblaze credentials not found in .env file")
        return False

    try:
        # Initialize B2 API
        print("Connecting to Backblaze B2...")
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", key_id, application_key)
        bucket = b2_api.get_bucket_by_name(bucket_name)
        print(f"Connected to bucket: {bucket_name}")

        # Step 1: Delete ALL .folder placeholder files
        print("\nStep 1: Removing ALL existing folder placeholders...")
        deleted_count = 0

        for file_version, folder_name in bucket.ls(recursive=True, fetch_count=1000):
            file_name = file_version.file_name
            if file_name.endswith('.folder'):
                try:
                    bucket.delete_file_version(file_version.id_, file_name)
                    print(f"  Deleted: {file_name.replace('.folder', '')}")
                    deleted_count += 1
                except Exception as e:
                    print(f"  Error deleting {file_name}: {str(e)}")

        print(f"\nDeleted {deleted_count} folder placeholders")

        # Step 2: Create ONLY the specified folders
        print("\nStep 2: Creating your specified folder structure...")

        specified_folders = [
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
            'videos/story/',
            'videos/chat/',
            'videos/programs/',

            # Documents folders
            'documents/',
            'documents/chat/',
            'documents/resources/'
        ]

        created_count = 0
        for folder in specified_folders:
            placeholder_name = f"{folder}.folder"
            try:
                bucket.upload_bytes(
                    b"",  # Empty content
                    placeholder_name,
                    content_type="application/x-directory"
                )
                print(f"  Created: {folder}")
                created_count += 1
            except Exception as e:
                print(f"  Error creating {folder}: {str(e)}")

        print(f"\nCreated {created_count} folders")

        # Step 3: Verify final structure
        print("\n" + "="*60)
        print("Final folder structure:")
        print("="*60)

        final_folders = []
        for file_version, folder_name in bucket.ls(recursive=True, fetch_count=1000):
            file_name = file_version.file_name
            if file_name.endswith('.folder'):
                final_folders.append(file_name.replace('.folder', ''))

        final_folders.sort()

        print("\nImages:")
        for f in final_folders:
            if f.startswith('images/'):
                print(f"  - {f}")

        print("\nAudio:")
        for f in final_folders:
            if f.startswith('audio/'):
                print(f"  - {f}")

        print("\nVideos:")
        for f in final_folders:
            if f.startswith('videos/'):
                print(f"  - {f}")

        print("\nDocuments:")
        for f in final_folders:
            if f.startswith('documents/'):
                print(f"  - {f}")

        # Check for unexpected folders
        expected = set(specified_folders)
        actual = set(final_folders)
        unexpected = actual - expected

        if unexpected:
            print("\n[WARNING] Unexpected folders found:")
            for f in unexpected:
                print(f"  - {f}")

        print("\n" + "="*60)
        print(f"Reset complete! Total folders: {len(final_folders)}")
        print("="*60)

        return True

    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("Backblaze B2 Folder Structure Reset")
    print("="*60)
    print("\nThis will:")
    print("1. DELETE all existing folder placeholders")
    print("2. CREATE only your specified folder structure")
    print("\nSpecified folders:")
    print("  Images: posts, chat, profile, cover, thumbnails, blog, news")
    print("  Audio: lectures, podcasts, chat")
    print("  Videos: ad, lectures, story, chat, programs")
    print("  Documents: chat, resources")

    # Confirm before proceeding
    if '--force' not in sys.argv:
        try:
            response = input("\nProceed with reset? (y/n): ").lower()
            if response != 'y':
                print("Reset cancelled.")
                sys.exit(0)
        except EOFError:
            pass

    # Run reset
    success = reset_b2_folders()

    if not success:
        print("\nReset failed. Please check the error messages above.")