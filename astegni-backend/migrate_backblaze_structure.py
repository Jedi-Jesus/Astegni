"""
Migration script to restructure existing Backblaze B2 files
- Move stories from stories/ to images/stories/ and videos/stories/
- Rename user_system to user_admin_system
- Update file organization to use profile IDs
"""

import os
from dotenv import load_dotenv
load_dotenv()

from backblaze_service import get_backblaze_service

def get_file_extension(filename):
    """Get file extension in lowercase"""
    return os.path.splitext(filename)[1].lower()

def is_video_file(filename):
    """Check if file is a video"""
    video_extensions = ['.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.mkv']
    return get_file_extension(filename) in video_extensions

def is_image_file(filename):
    """Check if file is an image"""
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    return get_file_extension(filename) in image_extensions

def migrate_stories(b2_service):
    """
    Migrate stories from stories/ to images/stories/ or videos/stories/
    based on file type
    """
    print("\n" + "=" * 70)
    print("MIGRATING STORIES")
    print("=" * 70)

    if not b2_service.configured:
        print("[WARNING] Backblaze not configured - running in dry-run mode")
        print("This will show what WOULD happen without actually moving files")
        print()

    try:
        # List all files in the stories folder
        print("\n[1] Searching for files in stories/ folder...")

        if not b2_service.configured:
            print("[DRY RUN] Would search: stories/")
            print("[DRY RUN] Example files that would be found:")
            print("  - stories/user_12/story_video_20240115.mp4 → videos/stories/user_profile_12/")
            print("  - stories/user_28/story_image_20240115.jpg → images/stories/user_profile_28/")
            return {"migrated": 0, "errors": []}

        # Get list of files in stories folder
        files_to_migrate = []

        for file_info, _ in b2_service.bucket.ls(folder_to_list="stories/", recursive=True):
            files_to_migrate.append({
                'fileName': file_info.file_name,
                'fileId': file_info.id_,
                'size': file_info.size
            })

        if not files_to_migrate:
            print("[INFO] No files found in stories/ folder")
            print("       Your Backblaze might already be using the new structure!")
            return {"migrated": 0, "errors": []}

        print(f"[OK] Found {len(files_to_migrate)} files to migrate")
        print()

        # Migrate each file
        migrated_count = 0
        errors = []

        for file_info in files_to_migrate:
            old_path = file_info['fileName']
            file_id = file_info['fileId']

            # Extract filename from path
            # Example: stories/user_12/story_video_20240115.mp4
            parts = old_path.split('/')
            if len(parts) < 3:
                print(f"[SKIP] Invalid path format: {old_path}")
                continue

            user_folder = parts[1]  # e.g., "user_12"
            filename = parts[2]      # e.g., "story_video_20240115.mp4"

            # Determine new folder based on file type
            if is_video_file(filename):
                new_folder = "videos/stories/"
                file_type = "video"
            elif is_image_file(filename):
                new_folder = "images/stories/"
                file_type = "image"
            else:
                print(f"[SKIP] Unknown file type: {old_path}")
                continue

            # Convert user_id to profile_id format
            # If it's user_12, convert to user_profile_12
            if user_folder.startswith("user_") and not user_folder.startswith("user_profile_"):
                new_user_folder = user_folder.replace("user_", "user_profile_")
            else:
                new_user_folder = user_folder

            new_path = f"{new_folder}{new_user_folder}/{filename}"

            print(f"\n[{migrated_count + 1}/{len(files_to_migrate)}] Migrating {file_type} story:")
            print(f"  FROM: {old_path}")
            print(f"  TO:   {new_path}")

            try:
                # Download file
                print("  [→] Downloading...")
                file_data = b2_service.download_file(old_path)

                if not file_data:
                    raise Exception("Failed to download file")

                # Upload to new location
                print("  [→] Uploading to new location...")

                # Determine content type
                if is_video_file(filename):
                    content_type = 'video/mp4'
                elif is_image_file(filename):
                    content_type = 'image/jpeg'
                else:
                    content_type = 'application/octet-stream'

                # Upload directly to new path
                result = b2_service.bucket.upload_bytes(
                    file_data,
                    new_path,
                    content_type=content_type
                )

                # Delete old file
                print("  [→] Deleting old file...")
                b2_service.bucket.delete_file_version(file_id, old_path)

                print(f"  [✓] SUCCESS")
                migrated_count += 1

            except Exception as e:
                error_msg = f"Failed to migrate {old_path}: {str(e)}"
                print(f"  [✗] ERROR: {str(e)}")
                errors.append(error_msg)

        print("\n" + "=" * 70)
        print(f"STORIES MIGRATION COMPLETE")
        print("=" * 70)
        print(f"Migrated: {migrated_count}/{len(files_to_migrate)} files")
        if errors:
            print(f"Errors: {len(errors)}")
            for error in errors:
                print(f"  - {error}")
        print()

        return {"migrated": migrated_count, "errors": errors}

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        return {"migrated": 0, "errors": [str(e)]}

def migrate_system_folders(b2_service):
    """
    Rename user_system to user_admin_system
    """
    print("\n" + "=" * 70)
    print("MIGRATING SYSTEM FOLDERS")
    print("=" * 70)

    if not b2_service.configured:
        print("[DRY RUN] Would rename:")
        print("  images/posts/user_system/ → images/posts/user_admin_system/")
        print("  videos/ad/user_system/ → videos/ad/user_admin_system/")
        print("  (and other system folders)")
        return {"migrated": 0, "errors": []}

    print("\n[1] Searching for user_system folders...")

    folders_to_check = [
        "images/posts/",
        "images/blog/",
        "images/news/",
        "images/thumbnails/",
        "videos/ad/",
        "videos/programs/",
        "videos/lectures/"
    ]

    migrated_count = 0
    errors = []

    for folder in folders_to_check:
        print(f"\n[→] Checking {folder}...")

        try:
            # List files in user_system subfolder
            system_folder = f"{folder}user_system/"
            files_to_migrate = []

            for file_info, _ in b2_service.bucket.ls(folder_to_list=system_folder, recursive=False):
                files_to_migrate.append({
                    'fileName': file_info.file_name,
                    'fileId': file_info.id_
                })

            if not files_to_migrate:
                print(f"    No user_system files found")
                continue

            print(f"    Found {len(files_to_migrate)} files to migrate")

            for file_info in files_to_migrate:
                old_path = file_info['fileName']
                new_path = old_path.replace("user_system/", "user_admin_system/")

                print(f"    FROM: {old_path}")
                print(f"    TO:   {new_path}")

                # Download, upload, delete
                file_data = b2_service.download_file(old_path)

                b2_service.bucket.upload_bytes(
                    file_data,
                    new_path,
                    content_type='application/octet-stream'
                )

                b2_service.bucket.delete_file_version(file_info['fileId'], old_path)

                migrated_count += 1
                print(f"    [✓] Migrated")

        except Exception as e:
            error_msg = f"Failed to migrate {folder}: {str(e)}"
            print(f"    [✗] ERROR: {str(e)}")
            errors.append(error_msg)

    print("\n" + "=" * 70)
    print(f"SYSTEM FOLDERS MIGRATION COMPLETE")
    print("=" * 70)
    print(f"Migrated: {migrated_count} files")
    if errors:
        print(f"Errors: {len(errors)}")
    print()

    return {"migrated": migrated_count, "errors": errors}

def cleanup_empty_stories_folder(b2_service):
    """
    Remove empty stories/ folder after migration
    """
    print("\n" + "=" * 70)
    print("CLEANUP: Removing empty stories/ folder")
    print("=" * 70)

    if not b2_service.configured:
        print("[DRY RUN] Would check if stories/ is empty and remove it")
        return

    try:
        # Check if stories folder is empty
        files_in_stories = []
        for file_info, _ in b2_service.bucket.ls(folder_to_list="stories/", recursive=True):
            files_in_stories.append(file_info.file_name)

        if files_in_stories:
            print(f"[WARNING] stories/ folder still has {len(files_in_stories)} files")
            print("          Not removing folder.")
            for file_name in files_in_stories[:5]:  # Show first 5
                print(f"          - {file_name}")
            if len(files_in_stories) > 5:
                print(f"          ... and {len(files_in_stories) - 5} more")
        else:
            print("[OK] stories/ folder is empty")
            print("    Note: B2 doesn't have 'folders' - empty paths are automatically removed")

    except Exception as e:
        print(f"[INFO] Could not check stories/ folder: {str(e)}")
        print("       This is normal if the folder doesn't exist")

def main():
    """Run migration"""
    print("\n" * 2)
    print("=" * 70)
    print(" " * 15 + "BACKBLAZE STRUCTURE MIGRATION")
    print("=" * 70)
    print()
    print("This script will:")
    print("  1. Move stories from stories/ to images/stories/ or videos/stories/")
    print("  2. Rename user_system to user_admin_system")
    print("  3. Update paths to use profile_id format")
    print()

    # Auto-proceed (no confirmation needed)
    print("Press Ctrl+C within 5 seconds to cancel...")
    import time
    try:
        for i in range(5, 0, -1):
            print(f"  Starting in {i}...", end='\r')
            time.sleep(1)
        print("\n[OK] Starting migration...                    ")
    except KeyboardInterrupt:
        print("\n\n[CANCELLED] Migration cancelled by user")
        return

    # Get Backblaze service
    b2_service = get_backblaze_service()

    if not b2_service.configured:
        print("\n[WARNING] Backblaze is not configured!")
        print("          Running in DRY-RUN mode (no actual changes)")
        print()
    else:
        print(f"\n[OK] Connected to Backblaze bucket: {os.getenv('BACKBLAZE_BUCKET_NAME')}")
        print()

    # Run migrations
    results = {
        'stories': migrate_stories(b2_service),
        'system': migrate_system_folders(b2_service)
    }

    # Cleanup
    cleanup_empty_stories_folder(b2_service)

    # Final summary
    print("\n" + "=" * 70)
    print("MIGRATION SUMMARY")
    print("=" * 70)

    total_migrated = results['stories']['migrated'] + results['system']['migrated']
    total_errors = len(results['stories']['errors']) + len(results['system']['errors'])

    print(f"\nStories migrated: {results['stories']['migrated']}")
    print(f"System files migrated: {results['system']['migrated']}")
    print(f"Total files migrated: {total_migrated}")

    if total_errors > 0:
        print(f"\n[WARNING] {total_errors} errors occurred during migration")
        print("Check the output above for details")
    else:
        print(f"\n[SUCCESS] All files migrated successfully!")

    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("=" * 70)
    print("1. Log into your Backblaze account")
    print("2. Check the new folder structure:")
    print("   - images/stories/user_profile_*/")
    print("   - videos/stories/user_profile_*/")
    print("   - */user_admin_system/")
    print("3. Verify old stories/ folder is empty or removed")
    print()

if __name__ == "__main__":
    main()
