"""
Cron Job: Delete Expired Roles and Accounts
Runs daily to permanently delete roles and accounts past their 90-day grace period

Usage:
    python cron_delete_expired_roles.py

Schedule with cron (Linux/Mac):
    0 2 * * * cd /path/to/astegni-backend && python cron_delete_expired_roles.py

Schedule with Task Scheduler (Windows):
    - Open Task Scheduler
    - Create Basic Task
    - Trigger: Daily at 2:00 AM
    - Action: Start a program
    - Program: python
    - Arguments: cron_delete_expired_roles.py
    - Start in: C:\path\to\astegni-backend
"""

import psycopg
from datetime import datetime
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def log(message):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}")

def delete_expired_roles():
    """
    Delete roles that have been scheduled for deletion and are past their 90-day grace period

    Checks all profile tables for scheduled_deletion_at timestamps that have passed
    and permanently deletes those role profiles
    """
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    deleted_roles = []

    try:
        # Profile tables with their corresponding role names
        profile_tables = {
            'student_profiles': 'student',
            'tutor_profiles': 'tutor',
            'parent_profiles': 'parent',
            'advertiser_profiles': 'advertiser',
            'user_profiles': 'user'
        }

        for table, role_name in profile_tables.items():
            # Find expired role deletions
            cursor.execute(f"""
                SELECT id, user_id
                FROM {table}
                WHERE scheduled_deletion_at IS NOT NULL
                AND scheduled_deletion_at <= CURRENT_TIMESTAMP
                AND is_active = FALSE
            """)

            expired_roles = cursor.fetchall()

            for profile_id, user_id in expired_roles:
                try:
                    # Get user email for logging
                    cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
                    user_email_result = cursor.fetchone()
                    user_email = user_email_result[0] if user_email_result else f"user_id_{user_id}"

                    # Delete the role profile (CASCADE handles related data)
                    cursor.execute(f"DELETE FROM {table} WHERE id = %s", (profile_id,))

                    # Remove role from user's roles array
                    cursor.execute("""
                        UPDATE users
                        SET roles = array_remove(roles, %s)
                        WHERE id = %s
                    """, (role_name, user_id))

                    conn.commit()

                    deleted_roles.append({
                        'role': role_name,
                        'user_id': user_id,
                        'user_email': user_email,
                        'profile_id': profile_id
                    })

                    log(f"[ROLE DELETED] {role_name} role for user {user_email} (profile_id: {profile_id})")

                except Exception as e:
                    conn.rollback()
                    log(f"[ERROR] Failed to delete {role_name} profile {profile_id}: {e}")
                    continue

        return deleted_roles

    except Exception as e:
        conn.rollback()
        log(f"[ERROR] Error in delete_expired_roles: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


def delete_expired_accounts():
    """
    Delete accounts that have been scheduled for deletion and are past their 90-day grace period

    Uses the existing account_deletion_endpoints.py logic
    """
    from account_deletion_endpoints import process_expired_deletions

    try:
        deleted_count = process_expired_deletions()
        log(f"[ACCOUNTS] Processed {deleted_count} expired account deletions")
        return deleted_count
    except Exception as e:
        log(f"[ERROR] Error in delete_expired_accounts: {e}")
        return 0


def main():
    """Main execution function"""
    log("=" * 80)
    log("CRON JOB: Delete Expired Roles and Accounts")
    log("=" * 80)

    try:
        # Delete expired roles
        log("\n[1/2] Checking for expired role deletions...")
        deleted_roles = delete_expired_roles()

        if deleted_roles:
            log(f"\n[SUMMARY] Deleted {len(deleted_roles)} expired role(s):")
            for item in deleted_roles:
                log(f"  - {item['role'].capitalize()} role for {item['user_email']}")
        else:
            log("[SUMMARY] No expired roles found")

        # Delete expired accounts
        log("\n[2/2] Checking for expired account deletions...")
        deleted_accounts = delete_expired_accounts()

        if deleted_accounts > 0:
            log(f"[SUMMARY] Deleted {deleted_accounts} expired account(s)")
        else:
            log("[SUMMARY] No expired accounts found")

        # Final summary
        log("\n" + "=" * 80)
        log(f"COMPLETED: {len(deleted_roles)} roles and {deleted_accounts} accounts deleted")
        log("=" * 80)

    except Exception as e:
        log(f"\n[FATAL ERROR] Cron job failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
