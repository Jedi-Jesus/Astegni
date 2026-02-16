"""
Update User Balance in Production Database
"""

import psycopg
from datetime import datetime

# Production database
PROD_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def update_balance(email, new_balance):
    """Update balance for a specific user"""

    print("="*80)
    print("USER BALANCE UPDATE - PRODUCTION DATABASE")
    print("="*80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    try:
        conn = psycopg.connect(PROD_USER_DB)
        cur = conn.cursor()

        # Check if user exists and get current balance
        print(f"Looking for user: {email}")
        cur.execute("SELECT id, first_name, father_name, email, account_balance FROM users WHERE email = %s;", (email,))
        user = cur.fetchone()

        if not user:
            print(f"\n[ERROR] User not found: {email}")
            conn.close()
            return

        user_id, first_name, father_name, user_email, current_balance = user
        full_name = f"{first_name} {father_name}"
        print(f"\nUser found:")
        print(f"  ID: {user_id}")
        print(f"  Name: {full_name}")
        print(f"  Email: {user_email}")
        print(f"  Current Balance: {current_balance}")

        print(f"\n  New Balance: {new_balance}")
        print(f"  Change: +{new_balance - (current_balance or 0)}")

        print("\n" + "-"*80)
        print("Updating balance...")

        # Update the balance
        cur.execute(
            "UPDATE users SET account_balance = %s WHERE email = %s;",
            (new_balance, email)
        )

        # Commit the transaction
        conn.commit()
        print("[SUCCESS] Balance updated!")

        # Verify the update
        cur.execute("SELECT account_balance FROM users WHERE email = %s;", (email,))
        updated_balance = cur.fetchone()[0]

        print("\nVerification:")
        print(f"  Updated Balance: {updated_balance}")

        if updated_balance == new_balance:
            print("\n[SUCCESS] Balance update verified!")
        else:
            print(f"\n[WARNING] Balance mismatch! Expected {new_balance}, got {updated_balance}")

        cur.close()
        conn.close()

        print("\n" + "="*80)
        print("UPDATE SUMMARY")
        print("="*80)
        print(f"User: {full_name} ({email})")
        print(f"Old Balance: {current_balance}")
        print(f"New Balance: {updated_balance}")
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        try:
            conn.rollback()
            conn.close()
        except:
            pass

if __name__ == "__main__":
    # Update balance to 50,000,000
    update_balance("jediael.s.abebe@gmail.com", 50000000.00)
