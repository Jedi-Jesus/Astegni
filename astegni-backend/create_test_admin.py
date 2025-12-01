"""
Create a test admin user for testing the manage-tutors page
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import bcrypt

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_admin():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Check if admin exists
            result = conn.execute(text("""
                SELECT id, username, roles FROM users
                WHERE username = 'admin'
            """))

            existing = result.fetchone()

            if existing:
                # Update existing user to have admin role
                conn.execute(text("""
                    UPDATE users
                    SET roles = '["admin", "tutor"]'::jsonb,
                        password_hash = :password
                    WHERE username = 'admin'
                """), {"password": hash_password("admin123")})

                trans.commit()
                print(f"✅ Updated existing user 'admin' with admin role")
                print(f"   ID: {existing[0]}")
                print(f"   Previous roles: {existing[2]}")
            else:
                # Create new admin user
                result = conn.execute(text("""
                    INSERT INTO users (
                        username, email, password_hash,
                        first_name, father_name, grandfather_name,
                        roles, is_active, created_at
                    )
                    VALUES (
                        'admin', 'admin@astegni.com', :password,
                        'Admin', 'User', 'Test',
                        '["admin", "tutor"]'::jsonb, true, CURRENT_TIMESTAMP
                    )
                    RETURNING id
                """), {"password": hash_password("admin123")})

                user_id = result.fetchone()[0]
                trans.commit()
                print(f"✅ Created new admin user")
                print(f"   ID: {user_id}")

            print("\n📝 Login credentials:")
            print("   Username: admin")
            print("   Password: admin123")
            print("\n🌐 Test page:")
            print("   http://localhost:8080/test-tutor-profiles.html")
            print("\n🏢 Admin panel:")
            print("   http://localhost:8080/admin-pages/manage-tutors.html")

        except Exception as e:
            trans.rollback()
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_admin()