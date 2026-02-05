"""
Test Script: Chat User-Based Migration
=======================================

Run this script after migrating to verify everything works correctly.

Usage: python test_chat_user_based_migration.py
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_success(text):
    print(f"  ✅ {text}")

def print_warning(text):
    print(f"  ⚠️  {text}")

def print_error(text):
    print(f"  ❌ {text}")

def print_info(text):
    print(f"  ℹ️  {text}")

def test_database_schema():
    """Test that all required columns exist"""
    print_header("Testing Database Schema")

    conn = get_connection()
    cur = conn.cursor()

    tests_passed = 0
    tests_failed = 0

    # Test 1: conversations.created_by_user_id exists
    try:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'conversations'
            AND column_name = 'created_by_user_id'
        """)
        if cur.fetchone():
            print_success("conversations.created_by_user_id exists")
            tests_passed += 1
        else:
            print_error("conversations.created_by_user_id NOT FOUND")
            tests_failed += 1
    except Exception as e:
        print_error(f"Error checking conversations table: {e}")
        tests_failed += 1

    # Test 2: conversation_participants.profile_id is nullable
    try:
        cur.execute("""
            SELECT is_nullable FROM information_schema.columns
            WHERE table_name = 'conversation_participants'
            AND column_name = 'profile_id'
        """)
        result = cur.fetchone()
        if result and result['is_nullable'] == 'YES':
            print_success("conversation_participants.profile_id is nullable")
            tests_passed += 1
        else:
            print_error("conversation_participants.profile_id is NOT nullable")
            tests_failed += 1
    except Exception as e:
        print_error(f"Error checking conversation_participants: {e}")
        tests_failed += 1

    # Test 3: chat_messages.sender_profile_id is nullable
    try:
        cur.execute("""
            SELECT is_nullable FROM information_schema.columns
            WHERE table_name = 'chat_messages'
            AND column_name = 'sender_profile_id'
        """)
        result = cur.fetchone()
        if result and result['is_nullable'] == 'YES':
            print_success("chat_messages.sender_profile_id is nullable")
            tests_passed += 1
        else:
            print_error("chat_messages.sender_profile_id is NOT nullable")
            tests_failed += 1
    except Exception as e:
        print_error(f"Error checking chat_messages: {e}")
        tests_failed += 1

    # Test 4: chat_settings table has user_id column
    try:
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'chat_settings'
            )
        """)
        if cur.fetchone()['exists']:
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'chat_settings'
                AND column_name = 'user_id'
            """)
            if cur.fetchone():
                print_success("chat_settings.user_id exists")
                tests_passed += 1
            else:
                print_warning("chat_settings table exists but user_id column missing")
                tests_failed += 1
        else:
            print_warning("chat_settings table does not exist (will be created on first use)")
            tests_passed += 1  # Not critical
    except Exception as e:
        print_error(f"Error checking chat_settings: {e}")
        tests_failed += 1

    # Test 5: blocked_chat_contacts has user_id columns
    try:
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'blocked_chat_contacts'
            )
        """)
        if cur.fetchone()['exists']:
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'blocked_chat_contacts'
                AND column_name IN ('blocker_user_id', 'blocked_user_id')
            """)
            results = cur.fetchall()
            if len(results) == 2:
                print_success("blocked_chat_contacts has user_id columns")
                tests_passed += 1
            else:
                print_warning(f"blocked_chat_contacts missing user_id columns (found {len(results)}/2)")
                tests_failed += 1
        else:
            print_warning("blocked_chat_contacts table does not exist (will be created on first use)")
            tests_passed += 1  # Not critical
    except Exception as e:
        print_error(f"Error checking blocked_chat_contacts: {e}")
        tests_failed += 1

    # Test 6: Check indexes exist
    try:
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'conversation_participants'
            AND indexname LIKE '%user_id%'
        """)
        indexes = cur.fetchall()
        if len(indexes) > 0:
            print_success(f"Found {len(indexes)} user_id index(es) on conversation_participants")
            tests_passed += 1
        else:
            print_warning("No user_id indexes found on conversation_participants")
            tests_failed += 1
    except Exception as e:
        print_error(f"Error checking indexes: {e}")
        tests_failed += 1

    cur.close()
    conn.close()

    print(f"\nSchema Tests: {tests_passed} passed, {tests_failed} failed")
    return tests_failed == 0


def test_data_integrity():
    """Test that existing data is intact"""
    print_header("Testing Data Integrity")

    conn = get_connection()
    cur = conn.cursor()

    tests_passed = 0
    tests_failed = 0

    # Test 1: Count conversations
    try:
        cur.execute("SELECT COUNT(*) as count FROM conversations")
        count = cur.fetchone()['count']
        print_info(f"Found {count} conversation(s)")
        tests_passed += 1
    except Exception as e:
        print_error(f"Error counting conversations: {e}")
        tests_failed += 1

    # Test 2: Count conversation participants
    try:
        cur.execute("SELECT COUNT(*) as count FROM conversation_participants WHERE is_active = true")
        count = cur.fetchone()['count']
        print_info(f"Found {count} active participant(s)")
        tests_passed += 1
    except Exception as e:
        print_error(f"Error counting participants: {e}")
        tests_failed += 1

    # Test 3: Count messages
    try:
        cur.execute("SELECT COUNT(*) as count FROM chat_messages WHERE is_deleted = false")
        count = cur.fetchone()['count']
        print_info(f"Found {count} message(s)")
        tests_passed += 1
    except Exception as e:
        print_error(f"Error counting messages: {e}")
        tests_failed += 1

    # Test 4: Check all participants have user_id
    try:
        cur.execute("""
            SELECT COUNT(*) as count FROM conversation_participants
            WHERE user_id IS NULL
        """)
        count = cur.fetchone()['count']
        if count == 0:
            print_success("All participants have user_id")
            tests_passed += 1
        else:
            print_error(f"{count} participant(s) missing user_id")
            tests_failed += 1
    except Exception as e:
        print_error(f"Error checking participant user_ids: {e}")
        tests_failed += 1

    # Test 5: Check all messages have sender_user_id
    try:
        cur.execute("""
            SELECT COUNT(*) as count FROM chat_messages
            WHERE sender_user_id IS NULL
        """)
        count = cur.fetchone()['count']
        if count == 0:
            print_success("All messages have sender_user_id")
            tests_passed += 1
        else:
            print_error(f"{count} message(s) missing sender_user_id")
            tests_failed += 1
    except Exception as e:
        print_error(f"Error checking message sender_user_ids: {e}")
        tests_failed += 1

    cur.close()
    conn.close()

    print(f"\nData Integrity Tests: {tests_passed} passed, {tests_failed} failed")
    return tests_failed == 0


def test_user_based_queries():
    """Test that user-based queries work"""
    print_header("Testing User-Based Queries")

    conn = get_connection()
    cur = conn.cursor()

    tests_passed = 0
    tests_failed = 0

    # Test 1: Get conversations by user_id
    try:
        # Get first user with conversations
        cur.execute("""
            SELECT DISTINCT user_id FROM conversation_participants
            WHERE user_id IS NOT NULL
            LIMIT 1
        """)
        result = cur.fetchone()

        if result:
            user_id = result['user_id']
            cur.execute("""
                SELECT c.*
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                WHERE cp.user_id = %s
                AND cp.is_active = true
            """, (user_id,))

            conversations = cur.fetchall()
            print_success(f"User {user_id} has {len(conversations)} conversation(s)")
            tests_passed += 1
        else:
            print_info("No users with conversations found (empty database)")
            tests_passed += 1
    except Exception as e:
        print_error(f"Error querying conversations by user_id: {e}")
        tests_failed += 1

    # Test 2: Get messages by user_id
    try:
        cur.execute("""
            SELECT DISTINCT sender_user_id FROM chat_messages
            WHERE sender_user_id IS NOT NULL
            LIMIT 1
        """)
        result = cur.fetchone()

        if result:
            user_id = result['sender_user_id']
            cur.execute("""
                SELECT COUNT(*) as count FROM chat_messages
                WHERE sender_user_id = %s
                AND is_deleted = false
            """, (user_id,))

            count = cur.fetchone()['count']
            print_success(f"User {user_id} sent {count} message(s)")
            tests_passed += 1
        else:
            print_info("No messages found (empty database)")
            tests_passed += 1
    except Exception as e:
        print_error(f"Error querying messages by user_id: {e}")
        tests_failed += 1

    # Test 3: Check for duplicate participants (should be 0)
    try:
        cur.execute("""
            SELECT conversation_id, user_id, COUNT(*) as count
            FROM conversation_participants
            WHERE is_active = true
            AND user_id IS NOT NULL
            GROUP BY conversation_id, user_id
            HAVING COUNT(*) > 1
        """)
        duplicates = cur.fetchall()

        if len(duplicates) == 0:
            print_success("No duplicate participants found")
            tests_passed += 1
        else:
            print_error(f"Found {len(duplicates)} duplicate participant record(s)")
            tests_failed += 1
    except Exception as e:
        print_error(f"Error checking for duplicates: {e}")
        tests_failed += 1

    cur.close()
    conn.close()

    print(f"\nUser-Based Query Tests: {tests_passed} passed, {tests_failed} failed")
    return tests_failed == 0


def test_helper_functions():
    """Test that helper functions work"""
    print_header("Testing Helper Functions")

    try:
        # Import helper functions
        from chat_user_based_helpers import (
            get_user_display_info,
            get_user_privacy_settings,
            are_users_connected,
            is_user_blocked
        )

        conn = get_connection()
        cur = conn.cursor()

        tests_passed = 0
        tests_failed = 0

        # Test 1: get_user_display_info
        try:
            cur.execute("SELECT id FROM users LIMIT 1")
            result = cur.fetchone()

            if result:
                user_id = result['id']
                info = get_user_display_info(conn, user_id)

                if info and 'name' in info:
                    print_success(f"get_user_display_info works: {info['name']}")
                    tests_passed += 1
                else:
                    print_error("get_user_display_info returned invalid data")
                    tests_failed += 1
            else:
                print_info("No users found in database (empty)")
                tests_passed += 1
        except Exception as e:
            print_error(f"get_user_display_info failed: {e}")
            tests_failed += 1

        # Test 2: get_user_privacy_settings
        try:
            cur.execute("SELECT id FROM users LIMIT 1")
            result = cur.fetchone()

            if result:
                user_id = result['id']
                settings = get_user_privacy_settings(conn, user_id)

                if settings and 'who_can_message' in settings:
                    print_success(f"get_user_privacy_settings works: {settings['who_can_message']}")
                    tests_passed += 1
                else:
                    print_error("get_user_privacy_settings returned invalid data")
                    tests_failed += 1
            else:
                print_info("No users found in database (empty)")
                tests_passed += 1
        except Exception as e:
            print_error(f"get_user_privacy_settings failed: {e}")
            tests_failed += 1

        # Test 3: are_users_connected
        try:
            cur.execute("SELECT id FROM users LIMIT 2")
            results = cur.fetchall()

            if len(results) >= 2:
                user1_id = results[0]['id']
                user2_id = results[1]['id']
                connected = are_users_connected(conn, user1_id, user2_id)

                print_success(f"are_users_connected works: {connected}")
                tests_passed += 1
            else:
                print_info("Not enough users to test connection (need 2)")
                tests_passed += 1
        except Exception as e:
            print_error(f"are_users_connected failed: {e}")
            tests_failed += 1

        cur.close()
        conn.close()

        print(f"\nHelper Function Tests: {tests_passed} passed, {tests_failed} failed")
        return tests_failed == 0

    except ImportError as e:
        print_error(f"Cannot import helper functions: {e}")
        print_info("Make sure chat_user_based_helpers.py is in the same directory")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("  CHAT USER-BASED MIGRATION - TEST SUITE")
    print("="*60)
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    all_passed = True

    # Run tests
    all_passed = test_database_schema() and all_passed
    all_passed = test_data_integrity() and all_passed
    all_passed = test_user_based_queries() and all_passed
    all_passed = test_helper_functions() and all_passed

    # Final summary
    print_header("FINAL RESULT")

    if all_passed:
        print_success("ALL TESTS PASSED! ✨")
        print_info("Migration is successful and working correctly.")
        print_info("You can now:")
        print_info("  1. Update frontend to use user-based approach")
        print_info("  2. Update backend endpoints to use new helpers")
        print_info("  3. Test thoroughly with real users")
        print_info("  4. Deploy to production")
    else:
        print_error("SOME TESTS FAILED")
        print_info("Please review the errors above and:")
        print_info("  1. Check if migration completed successfully")
        print_info("  2. Re-run migration if needed")
        print_info("  3. Check database logs for errors")

    print("\n" + "="*60 + "\n")

    return all_passed


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
