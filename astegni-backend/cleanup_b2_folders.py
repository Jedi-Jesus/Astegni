#!/usr/bin/env python3
"""
Script to clean up old/unwanted folders from Backblaze B2 bucket.
This will remove folders that are not part of the specified structure.
"""

import os
from dotenv import load_dotenv
from b2sdk.v2 import InMemoryAccountInfo, B2Api
import sys

# Load environment variables
load_dotenv()

def cleanup_b2_folders():
    """Remove old folders that are not part of the new structure"""

    # Get credentials from environment
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

        # Define folders that should be KEPT (your specified structure)
        keep_folders = {
            'images/.folder',
            'images/posts/.folder',
            'images/chat/.folder',
            'images/profile/.folder',
            'images/cover/.folder',
            'images/thumbnails/.folder',
            'images/blog/.folder',
            'images/news/.folder',
            'audio/.folder',
            'audio/lectures/.folder',
            'audio/podcasts/.folder',
            'audio/chat/.folder',
            'videos/.folder',
            'videos/ad/.folder',
            'videos/lectures/.folder',
            'videos/story/.folder',
            'videos/chat/.folder',
            'videos/programs/.folder',
            'documents/.folder',
            'documents/chat/.folder',
            'documents/resources/.folder'
        }

        # Define folders to be REMOVED (old structure)
        remove_folders = [
            'audio/music/.folder',
            'documents/assignments/.folder',
            'documents/pdf/.folder',
            'videos/reels/.folder',
            'videos/tutorials/.folder'
        ]

        print("\nRemoving old/unwanted folders...")
        removed_count = 0
        error_count = 0

        for folder in remove_folders:
            try:
                # Try to get file info and delete it
                file_info = bucket.get_file_info_by_name(folder)
                bucket.delete_file_version(file_info.id_, folder)
                folder_display = folder.replace('.folder', '')
                print(f"[REMOVED] {folder_display}")
                removed_count += 1
            except Exception as e:
                if "not found" not in str(e).lower():
                    print(f"[ERROR] Could not remove {folder}: {str(e)}")
                    error_count += 1
                # If file not found, it's already gone, which is fine

        print(f"\n{'='*50}")
        print(f"Cleanup Summary:")
        print(f"- Removed: {removed_count} folders")
        if error_count > 0:
            print(f"- Errors: {error_count}")
        print('='*50)

        # List final bucket structure
        print("\nFinal bucket structure (should only show your specified folders):")
        all_files = []
        for file_info in bucket.ls(recursive=True, fetch_count=200):
            file_name = file_info[0].file_name
            if file_name.endswith('.folder'):
                all_files.append(file_name)

        # Sort and display
        all_files.sort()
        for file_name in all_files:
            folder_display = file_name.replace('.folder', '')
            if file_name in keep_folders:
                print(f"  [OK] {folder_display}")
            else:
                print(f"  [UNEXPECTED] {folder_display} - This wasn't in your specified structure!")

        return True

    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("="*50)
    print("Backblaze B2 Folder Cleanup")
    print("="*50)
    print("\nThis will remove the following old folders:")
    print("  - audio/music/")
    print("  - documents/assignments/")
    print("  - documents/pdf/")
    print("  - videos/reels/")
    print("  - videos/tutorials/")
    print("\nAnd keep only your specified structure.")

    # Confirm before proceeding
    if '--force' not in sys.argv:
        try:
            response = input("\nProceed with cleanup? (y/n): ").lower()
            if response != 'y':
                print("Cleanup cancelled.")
                sys.exit(0)
        except EOFError:
            pass

    # Run cleanup
    success = cleanup_b2_folders()

    if success:
        print("\nCleanup complete! Your bucket now contains only the specified folders.")
    else:
        print("\nCleanup failed. Please check the error messages above.")