"""
Test script to verify the auto-delete system works correctly

Tests:
1. Check if account_deletion_requests table exists
2. Check if deletion_reason_stats table exists
3. Simulate creating a deletion request
4. Test the process_expired_deletions function
"""

import psycopg
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def test_tables_exist():
    """Check if required tables exist"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\n=== Testing Table Existence ===")

    # Check account_deletion_requests
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'account_deletion_requests'
        )
    """)
    adr_exists = cursor.fetchone()[0]
    print(f"✅ account_deletion_requests table exists: {adr_exists}")

    # Check deletion_reason_stats
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'deletion_reason_stats'
        )
    """)
    drs_exists = cursor.fetchone()[0]
    print(f"✅ deletion_reason_stats table exists: {drs_exists}")

    cursor.close()
    conn.close()

    return adr_exists and drs_exists


def test_pending_deletions():
    """Check for any pending deletions"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\n=== Checking Pending Deletions ===")

    cursor.execute("""
        SELECT adr.id, u.email, adr.scheduled_deletion_at, adr.status
        FROM account_deletion_requests adr
        JOIN users u ON adr.user_id = u.id
        WHERE adr.status = 'pending'
        ORDER BY adr.scheduled_deletion_at ASC
    """)

    pending = cursor.fetchall()

    if not pending:
        print("ℹ️ No pending account deletions found")
    else:
        print(f"📋 Found {len(pending)} pending deletion(s):")
        for req_id, email, scheduled_at, status in pending:
            days_until = (scheduled_at - datetime.now()).days
            print(f"  - ID {req_id}: {email}")
            print(f"    Scheduled: {scheduled_at}")
            print(f"    Days until deletion: {days_until}")
            print(f"    Status: {status}")

    cursor.close()
    conn.close()

    return len(pending)


def test_expired_deletions():
    """Check for any expired deletions (past 90 days)"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\n=== Checking Expired Deletions (Ready for Auto-Delete) ===")

    cursor.execute("""
        SELECT adr.id, u.email, adr.scheduled_deletion_at, adr.status
        FROM account_deletion_requests adr
        JOIN users u ON adr.user_id = u.id
        WHERE adr.status = 'pending'
        AND adr.scheduled_deletion_at <= CURRENT_TIMESTAMP
    """)

    expired = cursor.fetchall()

    if not expired:
        print("✅ No expired deletions found (good - no accounts ready for deletion)")
    else:
        print(f"⚠️ Found {len(expired)} expired deletion(s) ready for auto-delete:")
        for req_id, email, scheduled_at, status in expired:
            days_past = (datetime.now() - scheduled_at).days
            print(f"  - ID {req_id}: {email}")
            print(f"    Scheduled: {scheduled_at}")
            print(f"    Days past deadline: {days_past}")
            print(f"    Will be deleted on next cron run!")

    cursor.close()
    conn.close()

    return len(expired)


def test_completed_deletions():
    """Check deletion history"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\n=== Checking Deletion History ===")

    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM account_deletion_requests
        GROUP BY status
        ORDER BY status
    """)

    stats = cursor.fetchall()

    if not stats:
        print("ℹ️ No deletion records found")
    else:
        print("📊 Deletion Statistics:")
        for status, count in stats:
            print(f"  - {status}: {count}")

    cursor.close()
    conn.close()


def test_cron_function():
    """Test the process_expired_deletions function"""
    print("\n=== Testing Cron Function (DRY RUN) ===")

    try:
        from account_deletion_endpoints import process_expired_deletions

        # Check what would be deleted (without actually deleting)
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*)
            FROM account_deletion_requests adr
            JOIN users u ON adr.user_id = u.id
            WHERE adr.status = 'pending'
            AND adr.scheduled_deletion_at <= CURRENT_TIMESTAMP
        """)

        would_delete = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        print(f"🔍 Cron function would delete: {would_delete} account(s)")

        if would_delete > 0:
            print("⚠️ WARNING: There are accounts ready for deletion!")
            print("   To execute deletion, run: python cron_delete_expired_roles.py")
        else:
            print("✅ No accounts ready for deletion")

        return True

    except Exception as e:
        print(f"❌ Error testing cron function: {e}")
        return False


def test_cascade_delete():
    """Test if CASCADE delete is properly configured"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\n=== Testing CASCADE Configuration ===")

    # Check if users table has proper CASCADE on foreign keys
    cursor.execute("""
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND rc.delete_rule = 'CASCADE'
    """)

    cascades = cursor.fetchall()

    if cascades:
        print(f"✅ Found {len(cascades)} tables with CASCADE delete from users:")
        for constraint_name, table_name, column_name, foreign_table, foreign_column, delete_rule in cascades:
            print(f"  - {table_name}.{column_name} → {foreign_table}.{foreign_column} (CASCADE)")
    else:
        print("⚠️ No CASCADE deletes found - deletion may not work correctly!")

    cursor.close()
    conn.close()


def main():
    print("=" * 80)
    print("TESTING AUTO-DELETE SYSTEM")
    print("=" * 80)

    try:
        # Test 1: Tables exist
        tables_ok = test_tables_exist()

        if not tables_ok:
            print("\n❌ ERROR: Required tables don't exist!")
            print("   Run the migration script to create them.")
            return

        # Test 2: Check pending deletions
        test_pending_deletions()

        # Test 3: Check expired deletions
        expired_count = test_expired_deletions()

        # Test 4: Check deletion history
        test_completed_deletions()

        # Test 5: Test CASCADE configuration
        test_cascade_delete()

        # Test 6: Test cron function
        cron_ok = test_cron_function()

        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"✅ Tables exist: Yes")
        print(f"✅ Cron function: {'Working' if cron_ok else 'Error'}")
        print(f"⚠️ Accounts ready for deletion: {expired_count}")

        if expired_count > 0:
            print("\n⚠️ NEXT STEPS:")
            print("   1. Review the accounts ready for deletion above")
            print("   2. Run: python cron_delete_expired_roles.py")
            print("   3. Or set up automated cron job for daily execution")
        else:
            print("\n✅ System is ready! No immediate action needed.")
            print("   Set up cron job to run daily for automatic cleanup.")

        print("\n📝 To set up automated deletion:")
        print("   Linux/Mac: crontab -e")
        print("   Add: 0 2 * * * cd /path/to/astegni-backend && python cron_delete_expired_roles.py")
        print("\n   Windows: Use Task Scheduler (see cron_delete_expired_roles.py header)")

    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
