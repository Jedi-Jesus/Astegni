"""
Test Storage Limit System
Comprehensive tests for subscription-based storage validation
"""

import psycopg
from dotenv import load_dotenv
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from storage_service import StorageService

# Import from models module
import importlib.util
spec = importlib.util.spec_from_file_location("models", "app.py modules/models.py")
models = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models)

SessionLocal = models.SessionLocal
User = models.User
UserStorageUsage = models.UserStorageUsage

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def test_storage_service():
    """Test the StorageService functionality"""
    print("\n" + "="*60)
    print("TESTING STORAGE SERVICE")
    print("="*60)

    db = SessionLocal()

    try:
        # Get a test user (user_id = 1)
        user = db.query(User).filter(User.id == 1).first()

        if not user:
            print("ERROR: No users found in database. Please create a test user first.")
            return

        print(f"\nTest User: {user.email} (ID: {user.id})")
        print(f"Active Role: {user.active_role}")
        print(f"Subscription Plan ID: {user.subscription_plan_id}")

        # Test 1: Get subscription limits
        print("\n" + "-"*60)
        print("TEST 1: Get Subscription Limits")
        print("-"*60)
        limits = StorageService.get_user_subscription_limits(db, user.id)
        print(f"Max Image Size: {limits['max_image_size_mb']} MB")
        print(f"Max Video Size: {limits['max_video_size_mb']} MB")
        print(f"Max Document Size: {limits['max_document_size_mb']} MB")
        print(f"Max Audio Size: {limits['max_audio_size_mb']} MB")
        print(f"Total Storage Limit: {limits['storage_limit_gb']} GB")
        print(f"Max Image Storage: {limits['max_image_storage_mb']} MB")
        print(f"Max Video Storage: {limits['max_video_storage_mb']} MB")

        # Test 2: Get current storage usage
        print("\n" + "-"*60)
        print("TEST 2: Get Current Storage Usage")
        print("-"*60)
        usage = StorageService.get_user_storage_usage(db, user.id)
        print(f"Images: {usage['images_size']} bytes ({usage['images_count']} files)")
        print(f"Videos: {usage['videos_size']} bytes ({usage['videos_count']} files)")
        print(f"Documents: {usage['documents_size']} bytes ({usage['documents_count']} files)")
        print(f"Audios: {usage['audios_size']} bytes ({usage['audios_count']} files)")
        print(f"Total: {usage['total_size']} bytes")
        print(f"Total MB: {usage['total_size'] / (1024 * 1024):.2f} MB")

        # Test 3: Validate small image upload (should succeed)
        print("\n" + "-"*60)
        print("TEST 3: Validate Small Image Upload (2 MB)")
        print("-"*60)
        file_size = 2 * 1024 * 1024  # 2 MB
        is_allowed, error_msg = StorageService.validate_file_upload(
            db, user.id, file_size, 'image'
        )
        print(f"Is Allowed: {is_allowed}")
        print(f"Error Message: {error_msg if error_msg else 'None'}")

        # Test 4: Validate large image upload (should fail if exceeds limit)
        print("\n" + "-"*60)
        print("TEST 4: Validate Large Image Upload (10 MB)")
        print("-"*60)
        file_size = 10 * 1024 * 1024  # 10 MB
        is_allowed, error_msg = StorageService.validate_file_upload(
            db, user.id, file_size, 'image'
        )
        print(f"Is Allowed: {is_allowed}")
        print(f"Error Message: {error_msg if error_msg else 'None'}")

        # Test 5: Validate huge video upload (should fail)
        print("\n" + "-"*60)
        print("TEST 5: Validate Huge Video Upload (100 MB)")
        print("-"*60)
        file_size = 100 * 1024 * 1024  # 100 MB
        is_allowed, error_msg = StorageService.validate_file_upload(
            db, user.id, file_size, 'video'
        )
        print(f"Is Allowed: {is_allowed}")
        print(f"Error Message: {error_msg if error_msg else 'None'}")

        # Test 6: Simulate adding storage usage
        print("\n" + "-"*60)
        print("TEST 6: Simulate Adding Storage Usage (5 MB image)")
        print("-"*60)
        file_size = 5 * 1024 * 1024  # 5 MB
        print(f"Before: Total = {usage['total_size']} bytes")

        StorageService.update_storage_usage(
            db, user.id, file_size, 'image', operation='add'
        )

        updated_usage = StorageService.get_user_storage_usage(db, user.id)
        print(f"After: Total = {updated_usage['total_size']} bytes")
        print(f"Difference: {updated_usage['total_size'] - usage['total_size']} bytes")
        print(f"Images Count: {updated_usage['images_count']}")

        # Test 7: Get storage summary
        print("\n" + "-"*60)
        print("TEST 7: Get Storage Summary")
        print("-"*60)
        summary = StorageService.get_storage_summary(db, user.id)
        print(f"Total Used: {summary['usage']['total_size'] / (1024 * 1024):.2f} MB")
        print(f"Storage Limit: {summary['limits']['storage_limit_gb']} GB")
        print(f"Usage Percentage: {summary['usage_percentage']:.2f}%")
        print(f"Remaining: {summary['remaining_bytes'] / (1024 * 1024):.2f} MB")
        print(f"Can Upload: {summary['can_upload']}")

        # Test 8: Remove storage usage (cleanup)
        print("\n" + "-"*60)
        print("TEST 8: Remove Storage Usage (cleanup)")
        print("-"*60)
        StorageService.update_storage_usage(
            db, user.id, file_size, 'image', operation='remove'
        )

        final_usage = StorageService.get_user_storage_usage(db, user.id)
        print(f"Final Total: {final_usage['total_size']} bytes")
        print(f"Back to Original: {final_usage['total_size'] == usage['total_size']}")

        print("\n" + "="*60)
        print("ALL TESTS COMPLETED SUCCESSFULLY!")
        print("="*60)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def test_database_structure():
    """Test database table structure"""
    print("\n" + "="*60)
    print("TESTING DATABASE STRUCTURE")
    print("="*60)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Check if user_storage_usage table exists
    print("\nChecking user_storage_usage table...")
    cur.execute("""
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_name = 'user_storage_usage'
    """)
    count = cur.fetchone()[0]
    print(f"Table exists: {count > 0}")

    # Check table structure
    print("\nTable columns:")
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user_storage_usage'
        ORDER BY ordinal_position
    """)
    columns = cur.fetchall()
    for col in columns:
        print(f"  {col[0]:20} {col[1]:30} Nullable: {col[2]:3} Default: {col[3]}")

    # Check indexes
    print("\nTable indexes:")
    cur.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'user_storage_usage'
    """)
    indexes = cur.fetchall()
    for idx in indexes:
        print(f"  {idx[0]}")

    # Check triggers
    print("\nTable triggers:")
    cur.execute("""
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'user_storage_usage'
    """)
    triggers = cur.fetchall()
    if triggers:
        for trg in triggers:
            print(f"  {trg[0]}: {trg[1]}")
    else:
        print("  (No triggers found)")

    # Check sample data
    print("\nSample data (first 5 records):")
    cur.execute("""
        SELECT user_id, images_size, videos_size, total_size, images_count, videos_count
        FROM user_storage_usage
        LIMIT 5
    """)
    records = cur.fetchall()
    if records:
        print(f"  {'User ID':<10} {'Images (B)':<15} {'Videos (B)':<15} {'Total (B)':<15} {'Img Count':<10} {'Vid Count'}")
        print("  " + "-"*85)
        for rec in records:
            print(f"  {rec[0]:<10} {rec[1]:<15} {rec[2]:<15} {rec[3]:<15} {rec[4]:<10} {rec[5]}")
    else:
        print("  (No records yet)")

    cur.close()
    conn.close()

    print("\n" + "="*60)
    print("DATABASE STRUCTURE TEST COMPLETED")
    print("="*60)


def check_system_media_settings():
    """Check if system_media_settings table has subscription tier limits"""
    print("\n" + "="*60)
    print("CHECKING SYSTEM MEDIA SETTINGS")
    print("="*60)

    conn = psycopg.connect(os.getenv('ADMIN_DATABASE_URL'))
    cur = conn.cursor()

    # Check if system_media_settings exists
    cur.execute("""
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_name = 'system_media_settings'
    """)
    count = cur.fetchone()[0]

    if count == 0:
        print("\nWARNING: system_media_settings table does not exist in admin database!")
        print("Storage limits will use default values.")
        cur.close()
        conn.close()
        return

    print("\nSystem Media Settings:")
    cur.execute("""
        SELECT subscription_plan_id, max_image_size_mb, max_video_size_mb,
               max_document_size_mb, max_audio_size_mb, storage_limit_gb,
               max_image_storage_mb, max_video_storage_mb
        FROM system_media_settings
        ORDER BY subscription_plan_id
    """)

    settings = cur.fetchall()
    if settings:
        print(f"\n  {'Plan ID':<10} {'Img MB':<10} {'Vid MB':<10} {'Doc MB':<10} {'Aud MB':<10} {'Total GB':<12} {'Img Storage':<12} {'Vid Storage'}")
        print("  " + "-"*100)
        for s in settings:
            print(f"  {s[0]:<10} {s[1]:<10} {s[2]:<10} {s[3]:<10} {s[4]:<10} {s[5]:<12} {s[6]:<12} {s[7]}")
    else:
        print("\n  (No settings configured - using defaults)")

    cur.close()
    conn.close()

    print("\n" + "="*60)
    print("SYSTEM MEDIA SETTINGS CHECK COMPLETED")
    print("="*60)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("STORAGE LIMITS SYSTEM - COMPREHENSIVE TEST SUITE")
    print("="*60)

    # Test 1: Database structure
    test_database_structure()

    # Test 2: System media settings
    check_system_media_settings()

    # Test 3: Storage service functionality
    test_storage_service()

    print("\n" + "="*60)
    print("ALL TESTS COMPLETED!")
    print("="*60)
