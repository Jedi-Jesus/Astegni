"""
DELETE ALL USER DATA - Local Database Cleanup Script

WARNING: This script will PERMANENTLY DELETE ALL user data from your LOCAL database.

What will be deleted:
- All users (users table)
- All tutor profiles (tutor_profiles table)
- All student profiles (student_profiles table)
- All parent profiles (parent_profiles table)
- All advertiser profiles (advertiser_profiles table)
- All related data (KYC verifications, reviews, connections, etc.)

This is IRREVERSIBLE. Use only for testing/development on LOCAL database.

NEVER run this on production!
"""

import psycopg
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def delete_all_user_data():
    """Delete all user data from the database"""

    print("=" * 80)
    print("DELETE ALL USER DATA - LOCAL DATABASE CLEANUP")
    print("=" * 80)
    print("\nWARNING: This will PERMANENTLY DELETE ALL user data!")
    print("Database:", DATABASE_URL)
    print("\nCurrent data:")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Show current counts
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]
        print(f"  - Users: {user_count}")

        cur.execute("SELECT COUNT(*) FROM tutor_profiles")
        tutor_count = cur.fetchone()[0]
        print(f"  - Tutor profiles: {tutor_count}")

        cur.execute("SELECT COUNT(*) FROM student_profiles")
        student_count = cur.fetchone()[0]
        print(f"  - Student profiles: {student_count}")

        cur.execute("SELECT COUNT(*) FROM parent_profiles")
        parent_count = cur.fetchone()[0]
        print(f"  - Parent profiles: {parent_count}")

        cur.execute("SELECT COUNT(*) FROM advertiser_profiles")
        advertiser_count = cur.fetchone()[0]
        print(f"  - Advertiser profiles: {advertiser_count}")

        cur.execute("SELECT COUNT(*) FROM kyc_verifications")
        kyc_count = cur.fetchone()[0]
        print(f"  - KYC verifications: {kyc_count}")

        print("\n" + "=" * 80)
        print("PROCEEDING WITH DELETION...")
        print("=" * 80)

        # Delete in correct order (respecting foreign keys)
        # Most dependent tables first, then users table last

        # Step 1: Clear KYC foreign key references in users table first
        print("\n[1/18] Clearing KYC verification references in users...")
        cur.execute("UPDATE users SET kyc_verification_id = NULL WHERE kyc_verification_id IS NOT NULL")
        print(f"   Cleared {cur.rowcount} references")

        # Step 2: Delete KYC data
        print("[2/18] Deleting KYC verification attempts...")
        cur.execute("DELETE FROM kyc_verification_attempts")
        print(f"   Deleted {cur.rowcount} rows")

        print("[3/18] Deleting KYC verifications...")
        cur.execute("DELETE FROM kyc_verifications")
        print(f"   Deleted {cur.rowcount} rows")

        # Step 3: Delete reviews
        print("[4/18] Deleting tutor reviews...")
        cur.execute("DELETE FROM tutor_reviews")
        print(f"   Deleted {cur.rowcount} rows")

        print("[5/18] Deleting student reviews...")
        cur.execute("DELETE FROM student_reviews")
        print(f"   Deleted {cur.rowcount} rows")

        print("[6/18] Deleting parent reviews...")
        cur.execute("DELETE FROM parent_reviews")
        print(f"   Deleted {cur.rowcount} rows")

        # Step 4: Delete connections and relationships
        print("[7/18] Deleting connections...")
        cur.execute("DELETE FROM connections")
        print(f"   Deleted {cur.rowcount} rows")

        print("[8/18] Deleting enrolled students...")
        cur.execute("DELETE FROM enrolled_students")
        print(f"   Deleted {cur.rowcount} rows")

        # Step 5: Delete chat data
        print("[9/18] Deleting chat messages...")
        cur.execute("DELETE FROM chat_messages")
        print(f"   Deleted {cur.rowcount} rows")

        print("[10/18] Deleting conversation participants...")
        cur.execute("DELETE FROM conversation_participants")
        print(f"   Deleted {cur.rowcount} rows")

        print("[11/18] Deleting conversations...")
        cur.execute("DELETE FROM conversations")
        print(f"   Deleted {cur.rowcount} rows")

        # Step 6: Delete authentication tokens
        print("[12/18] Deleting refresh tokens...")
        cur.execute("DELETE FROM refresh_tokens")
        print(f"   Deleted {cur.rowcount} rows")

        print("[13/18] Deleting OTPs...")
        cur.execute("DELETE FROM otps")
        print(f"   Deleted {cur.rowcount} rows")

        # Step 7: Delete profile tables
        print("[14/18] Deleting advertiser profiles...")
        cur.execute("DELETE FROM advertiser_profiles")
        print(f"   Deleted {cur.rowcount} rows")

        print("[15/18] Deleting parent profiles...")
        cur.execute("DELETE FROM parent_profiles")
        print(f"   Deleted {cur.rowcount} rows")

        print("[16/18] Deleting student profiles...")
        cur.execute("DELETE FROM student_profiles")
        print(f"   Deleted {cur.rowcount} rows")

        print("[17/18] Deleting tutor profiles...")
        cur.execute("DELETE FROM tutor_profiles")
        print(f"   Deleted {cur.rowcount} rows")

        # Step 8: Finally delete users (CASCADE will handle remaining foreign keys)
        print("[18/18] Deleting users...")
        cur.execute("DELETE FROM users")
        deleted_users = cur.rowcount
        print(f"   Deleted {deleted_users} rows")

        # Commit all changes
        conn.commit()

        # Verify deletion
        print("\n" + "=" * 80)
        print("VERIFICATION")
        print("=" * 80)

        cur.execute("SELECT COUNT(*) FROM users")
        remaining_users = cur.fetchone()[0]
        print(f"Remaining users: {remaining_users}")

        cur.execute("SELECT COUNT(*) FROM tutor_profiles")
        remaining_tutors = cur.fetchone()[0]
        print(f"Remaining tutor profiles: {remaining_tutors}")

        cur.execute("SELECT COUNT(*) FROM student_profiles")
        remaining_students = cur.fetchone()[0]
        print(f"Remaining student profiles: {remaining_students}")

        cur.execute("SELECT COUNT(*) FROM parent_profiles")
        remaining_parents = cur.fetchone()[0]
        print(f"Remaining parent profiles: {remaining_parents}")

        cur.execute("SELECT COUNT(*) FROM advertiser_profiles")
        remaining_advertisers = cur.fetchone()[0]
        print(f"Remaining advertiser profiles: {remaining_advertisers}")

        print("\n" + "=" * 80)
        print("[SUCCESS] ALL USER DATA DELETED")
        print("=" * 80)
        print(f"\nDeleted:")
        print(f"  - {deleted_users} users")
        print(f"  - {tutor_count} tutor profiles")
        print(f"  - {student_count} student profiles")
        print(f"  - {parent_count} parent profiles")
        print(f"  - {advertiser_count} advertiser profiles")
        print(f"  - {kyc_count} KYC verifications")
        print(f"\nDatabase is now clean and ready for fresh testing!")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("DANGER ZONE - DELETE ALL USER DATA")
    print("=" * 80)
    print("\nThis will PERMANENTLY DELETE ALL users and related data from:")
    print(f"  {DATABASE_URL}")
    print("\nThis action CANNOT be undone!")
    print("\nYou should:")
    print("  1. Make sure this is a LOCAL/TEST database")
    print("  2. Create a backup if needed: pg_dump astegni_user_db > backup.sql")
    print("  3. Be absolutely certain you want to proceed")

    print("\n" + "=" * 80)
    response = input("\nType 'DELETE ALL DATA' to confirm deletion: ")

    if response == "DELETE ALL DATA":
        confirm = input("\nAre you ABSOLUTELY SURE? Type 'YES' to confirm: ")
        if confirm == "YES":
            delete_all_user_data()
        else:
            print("\n[CANCELLED] Deletion cancelled.")
    else:
        print("\n[CANCELLED] Deletion cancelled.")
