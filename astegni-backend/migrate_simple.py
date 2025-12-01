"""
Simple migration script - no fancy characters
Migrates stories from stories/ to images/stories/ or videos/stories/
"""

import os
from dotenv import load_dotenv
load_dotenv()

from backblaze_service import get_backblaze_service

def is_video(filename):
    """Check if file is video"""
    exts = ['.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.mkv']
    return any(filename.lower().endswith(ext) for ext in exts)

def is_image(filename):
    """Check if file is image"""
    exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    return any(filename.lower().endswith(ext) for ext in exts)

print("\n" + "="*70)
print("BACKBLAZE MIGRATION: stories/ -> images/stories/ & videos/stories/")
print("="*70)

# Get service
b2 = get_backblaze_service()
print(f"\n[OK] Connected to: {os.getenv('BACKBLAZE_BUCKET_NAME')}\n")

# List files
print("[1] Finding files in stories/...")
files_to_migrate = []

for file_info, _ in b2.bucket.ls(folder_to_list="stories/", recursive=True):
    fname = file_info.file_name

    # Skip .folder marker files
    if fname.endswith('/.folder') or fname == 'stories/.folder':
        print(f"[SKIP] {fname} (marker file)")
        continue

    files_to_migrate.append({
        'name': fname,
        'id': file_info.id_,
        'size': file_info.size
    })

if not files_to_migrate:
    print("[INFO] No files to migrate")
    exit(0)

print(f"[OK] Found {len(files_to_migrate)} files\n")

# Migrate each file
migrated = 0
errors = []

for idx, file_info in enumerate(files_to_migrate, 1):
    old_path = file_info['name']
    file_id = file_info['id']

    # Parse path: stories/user_115/filename.jpg
    parts = old_path.split('/')
    if len(parts) < 3:
        print(f"[{idx}/{len(files_to_migrate)}] SKIP: {old_path} (invalid format)")
        continue

    user_folder = parts[1]  # e.g., "user_115"
    filename = parts[2]

    # Determine destination
    if is_video(filename):
        new_folder = "videos/stories/"
        file_type = "video"
    elif is_image(filename):
        new_folder = "images/stories/"
        file_type = "image"
    else:
        print(f"[{idx}/{len(files_to_migrate)}] SKIP: {old_path} (unknown type)")
        continue

    # Convert user_id to profile_id format
    if user_folder.startswith("user_") and not user_folder.startswith("user_profile_"):
        new_user_folder = user_folder.replace("user_", "user_profile_")
    else:
        new_user_folder = user_folder

    new_path = f"{new_folder}{new_user_folder}/{filename}"

    print(f"[{idx}/{len(files_to_migrate)}] Migrating {file_type}:")
    print(f"  FROM: {old_path}")
    print(f"  TO:   {new_path}")

    try:
        # Download
        print("  > Downloading...", end='', flush=True)
        file_data = b2.download_file(old_path)
        print(" OK")

        # Upload to new location
        print("  > Uploading...", end='', flush=True)
        content_type = 'video/mp4' if is_video(filename) else 'image/jpeg'
        b2.bucket.upload_bytes(file_data, new_path, content_type=content_type)
        print(" OK")

        # Delete old file
        print("  > Deleting old...", end='', flush=True)
        b2.bucket.delete_file_version(file_id, old_path)
        print(" OK")

        print("  [SUCCESS]")
        migrated += 1

    except Exception as e:
        error_msg = f"{old_path}: {str(e)}"
        errors.append(error_msg)
        print(f"  [ERROR] {str(e)}")

# Summary
print("\n" + "="*70)
print("MIGRATION COMPLETE")
print("="*70)
print(f"Migrated: {migrated}/{len(files_to_migrate)} files")

if errors:
    print(f"\nErrors ({len(errors)}):")
    for error in errors:
        print(f"  - {error}")
else:
    print("\n[SUCCESS] All files migrated successfully!")

print("\nNew structure:")
print("  images/stories/user_profile_*/")
print("  videos/stories/user_profile_*/")
print("\nOld stories/ folder should now be empty or removed automatically.")
print()
