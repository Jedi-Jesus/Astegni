"""
Reset KYC verification for a user to allow retesting.
Usage: python reset_kyc_for_user.py [user_email]
"""

import psycopg2
import sys

DB_CONFIG = {
    'host': 'localhost',
    'database': 'astegni_user_db',
    'user': 'astegni_user',
    'password': 'Astegni2025',
    'port': 5432
}

def reset_kyc(user_email=None):
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        if user_email:
            # Get user ID
            cur.execute("SELECT id, first_name, kyc_verified FROM users WHERE email = %s", (user_email,))
            user = cur.fetchone()
            if not user:
                print(f"[ERROR] User with email '{user_email}' not found")
                return

            user_id = user[0]
            print(f"Found user: {user[1]} (ID: {user_id}, KYC Verified: {user[2]})")
        else:
            # Get the most recent user with KYC verification attempts
            cur.execute("""
                SELECT DISTINCT u.id, u.email, u.first_name, u.kyc_verified
                FROM users u
                JOIN kyc_verifications kv ON u.id = kv.user_id
                ORDER BY u.id DESC LIMIT 5
            """)
            users = cur.fetchall()

            if not users:
                print("[INFO] No users with KYC verifications found")
                return

            print("\nUsers with KYC verifications:")
            for u in users:
                print(f"  ID: {u[0]}, Email: {u[1]}, Name: {u[2]}, Verified: {u[3]}")

            user_id = users[0][0]
            print(f"\nResetting KYC for most recent user (ID: {user_id})...")

        # Delete KYC verification attempts
        cur.execute("DELETE FROM kyc_verification_attempts WHERE user_id = %s", (user_id,))
        attempts_deleted = cur.rowcount
        print(f"[OK] Deleted {attempts_deleted} verification attempts")

        # Delete KYC verifications
        cur.execute("DELETE FROM kyc_verifications WHERE user_id = %s", (user_id,))
        verifications_deleted = cur.rowcount
        print(f"[OK] Deleted {verifications_deleted} verifications")

        # Reset user's KYC status
        cur.execute("""
            UPDATE users
            SET kyc_verified = FALSE,
                kyc_verified_at = NULL,
                kyc_verification_id = NULL
            WHERE id = %s
        """, (user_id,))
        print(f"[OK] Reset user's KYC status")

        conn.commit()
        print("\n[SUCCESS] KYC reset complete! User can now start verification again.")

    except Exception as e:
        print(f"[ERROR] {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else None
    reset_kyc(email)
