"""
Archive Payment Records Older Than X Years
This script marks payment records as archived instead of deleting them
Maintains historical data for audit purposes
"""
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

def archive_old_payments(years=10, dry_run=True):
    """
    Archive payment records older than specified years

    Args:
        years (int): Number of years threshold (default: 10)
        dry_run (bool): If True, only show what would be archived without actually archiving
    """
    engine = create_engine(os.getenv('DATABASE_URL'))

    # Calculate cutoff date
    cutoff_date = datetime.now() - timedelta(days=365 * years)

    print(f"{'='*60}")
    print(f"Archive Old Payment Records")
    print(f"{'='*60}")
    print(f"Cutoff Date: {cutoff_date.strftime('%Y-%m-%d')}")
    print(f"Archive records older than: {years} years")
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (will make changes)'}")
    print(f"{'='*60}\n")

    with engine.begin() as conn:
        # 1. Find enrolled_students records to archive
        print("1. Checking enrolled_students...")
        result = conn.execute(text("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue
            FROM enrolled_students
            WHERE created_at < :cutoff_date
            AND (is_archived IS NULL OR is_archived = FALSE)
        """), {"cutoff_date": cutoff_date})

        stats = result.fetchone()
        print(f"   Found {stats[0]} records to archive:")
        print(f"   - Paid: {stats[1]}")
        print(f"   - Pending: {stats[2]}")
        print(f"   - Overdue: {stats[3]}")

        if not dry_run and stats[0] > 0:
            # Archive enrolled_students
            conn.execute(text("""
                UPDATE enrolled_students
                SET
                    is_archived = TRUE,
                    archived_at = NOW(),
                    archived_reason = :reason
                WHERE created_at < :cutoff_date
                AND (is_archived IS NULL OR is_archived = FALSE)
            """), {
                "cutoff_date": cutoff_date,
                "reason": f"Auto-archived: older than {years} years"
            })
            print(f"   ✅ Archived {stats[0]} enrolled_students records\n")
        else:
            print(f"   ℹ️  Would archive {stats[0]} records (dry run)\n")

        # 2. Find user_investments records to archive
        print("2. Checking user_investments...")
        result = conn.execute(text("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue
            FROM user_investments
            WHERE created_at < :cutoff_date
            AND student_payment_id IS NOT NULL
            AND (is_archived IS NULL OR is_archived = FALSE)
        """), {"cutoff_date": cutoff_date})

        stats = result.fetchone()
        print(f"   Found {stats[0]} records to archive:")
        print(f"   - Paid: {stats[1]}")
        print(f"   - Pending: {stats[2]}")
        print(f"   - Overdue: {stats[3]}")

        if not dry_run and stats[0] > 0:
            # Archive user_investments
            conn.execute(text("""
                UPDATE user_investments
                SET
                    is_archived = TRUE,
                    archived_at = NOW(),
                    archived_reason = :reason
                WHERE created_at < :cutoff_date
                AND student_payment_id IS NOT NULL
                AND (is_archived IS NULL OR is_archived = FALSE)
            """), {
                "cutoff_date": cutoff_date,
                "reason": f"Auto-archived: older than {years} years"
            })
            print(f"   ✅ Archived {stats[0]} user_investments records\n")
        else:
            print(f"   ℹ️  Would archive {stats[0]} records (dry run)\n")

        # 3. Show statistics after archiving
        if not dry_run:
            print("3. Archive Statistics:")
            result = conn.execute(text("""
                SELECT
                    COUNT(*) as total_archived,
                    MIN(archived_at) as first_archived,
                    MAX(archived_at) as last_archived
                FROM enrolled_students
                WHERE is_archived = TRUE
            """))
            stats = result.fetchone()
            print(f"   Total archived enrolled_students: {stats[0]}")
            print(f"   First archived: {stats[1]}")
            print(f"   Last archived: {stats[2]}\n")

    print(f"{'='*60}")
    print(f"Archive {'preview' if dry_run else 'process'} completed!")
    print(f"{'='*60}\n")


def unarchive_payments(enrollment_id):
    """
    Unarchive a specific payment record if needed

    Args:
        enrollment_id (int): The enrolled_students.id to unarchive
    """
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.begin() as conn:
        # Unarchive enrolled_students
        conn.execute(text("""
            UPDATE enrolled_students
            SET
                is_archived = FALSE,
                archived_at = NULL,
                archived_reason = NULL
            WHERE id = :id
        """), {"id": enrollment_id})

        # Unarchive related user_investments
        conn.execute(text("""
            UPDATE user_investments
            SET
                is_archived = FALSE,
                archived_at = NULL,
                archived_reason = NULL
            WHERE student_payment_id = :id
        """), {"id": enrollment_id})

        print(f"✅ Unarchived enrollment {enrollment_id} and related investments")


def view_archived_stats():
    """
    View statistics about archived records
    """
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.begin() as conn:
        print(f"\n{'='*60}")
        print("Archived Payment Records Statistics")
        print(f"{'='*60}\n")

        # Enrolled students stats
        result = conn.execute(text("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_archived = TRUE THEN 1 END) as archived,
                COUNT(CASE WHEN is_archived = FALSE OR is_archived IS NULL THEN 1 END) as active
            FROM enrolled_students
        """))
        stats = result.fetchone()
        print("Enrolled Students:")
        print(f"  Total: {stats[0]}")
        print(f"  Active: {stats[2]}")
        print(f"  Archived: {stats[1]}")
        print(f"  Archive %: {(stats[1]/stats[0]*100) if stats[0] > 0 else 0:.1f}%\n")

        # User investments stats
        result = conn.execute(text("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_archived = TRUE THEN 1 END) as archived,
                COUNT(CASE WHEN is_archived = FALSE OR is_archived IS NULL THEN 1 END) as active
            FROM user_investments
            WHERE student_payment_id IS NOT NULL
        """))
        stats = result.fetchone()
        print("User Investments (Payments):")
        print(f"  Total: {stats[0]}")
        print(f"  Active: {stats[2]}")
        print(f"  Archived: {stats[1]}")
        print(f"  Archive %: {(stats[1]/stats[0]*100) if stats[0] > 0 else 0:.1f}%\n")

        print(f"{'='*60}\n")


if __name__ == "__main__":
    import sys

    # Default: dry run for 10 years
    if len(sys.argv) > 1:
        if sys.argv[1] == "--stats":
            view_archived_stats()
        elif sys.argv[1] == "--unarchive":
            if len(sys.argv) > 2:
                unarchive_payments(int(sys.argv[2]))
            else:
                print("Usage: python archive_old_payment_records.py --unarchive <enrollment_id>")
        elif sys.argv[1] == "--live":
            years = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            print("⚠️  LIVE MODE - This will make changes!")
            confirm = input(f"Archive payments older than {years} years? (yes/no): ")
            if confirm.lower() == 'yes':
                archive_old_payments(years=years, dry_run=False)
            else:
                print("Cancelled.")
        else:
            years = int(sys.argv[1]) if sys.argv[1].isdigit() else 10
            archive_old_payments(years=years, dry_run=True)
    else:
        # Default: dry run for 10 years
        archive_old_payments(years=10, dry_run=True)
        print("\nTo run in live mode: python archive_old_payment_records.py --live 10")
        print("To view stats: python archive_old_payment_records.py --stats")
        print("To unarchive: python archive_old_payment_records.py --unarchive <enrollment_id>")
