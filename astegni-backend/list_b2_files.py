#!/usr/bin/env python3
"""
Script to list all files in the B2 bucket
"""

import os
from dotenv import load_dotenv
from b2sdk.v2 import InMemoryAccountInfo, B2Api

# Load environment variables
load_dotenv()

def list_all_files():
    """List all files in the bucket"""

    key_id = os.getenv('BACKBLAZE_KEY_ID')
    application_key = os.getenv('BACKBLAZE_APPLICATION_KEY')
    bucket_name = os.getenv('BACKBLAZE_BUCKET_NAME', 'astegni-media')

    try:
        # Initialize B2 API
        print("Connecting to Backblaze B2...")
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", key_id, application_key)
        bucket = b2_api.get_bucket_by_name(bucket_name)
        print(f"Connected to bucket: {bucket_name}\n")

        print("All files in bucket:")
        print("=" * 60)

        file_count = 0
        folder_count = 0

        for file_version, folder_name in bucket.ls(recursive=True, fetch_count=1000):
            file_name = file_version.file_name
            file_size = file_version.size

            if file_name.endswith('.folder'):
                folder_count += 1
                print(f"[FOLDER] {file_name}")
            else:
                file_count += 1
                print(f"[FILE] {file_name} ({file_size} bytes)")

        print("=" * 60)
        print(f"\nSummary:")
        print(f"- Total folders: {folder_count}")
        print(f"- Total files: {file_count}")

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    list_all_files()