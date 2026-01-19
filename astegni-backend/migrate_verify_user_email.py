"""
Migration script to verify a specific user's email in production database
Usage: python migrate_verify_user_email.py
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def verify_user_email(email: str):
    """Verify a user's email address"""

    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")

    # Create engine and session
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Check if user exists
        result = db.execute(
            text("SELECT id, email, is_verified FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()

        if not result:
            print(f"❌ User with email '{email}' not found!")
            return False

        user_id, user_email, is_verified = result

        if is_verified:
            print(f"✅ User '{email}' (ID: {user_id}) is already verified!")
            return True

        print(f"📧 Found user '{email}' (ID: {user_id})")
        print(f"   Current verification status: {is_verified}")
        print(f"   Updating to verified...")

        # Update user verification status
        db.execute(
            text("UPDATE users SET is_verified = TRUE WHERE email = :email"),
            {"email": email}
        )
        db.commit()

        # Verify the update
        result = db.execute(
            text("SELECT is_verified FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()

        if result and result[0]:
            print(f"✅ Successfully verified user '{email}'!")
            return True
        else:
            print(f"❌ Failed to verify user '{email}'")
            return False

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        return False
    finally:
        db.close()
        engine.dispose()

if __name__ == "__main__":
    # Email to verify
    EMAIL_TO_VERIFY = "jediael.s.abebe@gmail.com"

    print("="*60)
    print("User Email Verification Migration")
    print("="*60)
    print(f"Target email: {EMAIL_TO_VERIFY}")
    print("="*60)
    print()

    success = verify_user_email(EMAIL_TO_VERIFY)

    print()
    print("="*60)
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
    print("="*60)
