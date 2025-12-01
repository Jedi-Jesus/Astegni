"""
Create an admin user for testing
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import bcrypt
import json
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"
)

# Convert for psycopg3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin():
    """Create an admin user"""
    db = SessionLocal()

    try:
        # Check if admin exists
        result = db.execute(text("SELECT id FROM users WHERE email = :email"),
                           {"email": "admin@astegni.com"}).fetchone()

        if result:
            print("Admin user already exists")
            # Update password and ensure admin role
            hashed_password = bcrypt.hashpw("Admin2025!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            db.execute(text("""
                UPDATE users
                SET password_hash = :password,
                    roles = :roles,
                    active_role = :active_role
                WHERE email = :email
            """), {
                "password": hashed_password,
                "roles": json.dumps(["admin", "tutor"]),
                "active_role": "admin",
                "email": "admin@astegni.com"
            })
            db.commit()
            print("Admin password and roles updated")
        else:
            # Create new admin
            user_id = str(uuid.uuid4())
            hashed_password = bcrypt.hashpw("Admin2025!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            db.execute(text("""
                INSERT INTO users (id, email, username, password_hash, first_name, father_name,
                                 phone, roles, active_role, is_active, email_verified, created_at, updated_at)
                VALUES (:id, :email, :username, :password_hash, :first_name, :father_name,
                        :phone, :roles, :active_role, true, true, :created_at, :updated_at)
            """), {
                "id": int(user_id.replace("-", "")[:9]),  # Convert to integer ID
                "email": "admin@astegni.com",
                "username": "admin",
                "password_hash": hashed_password,
                "first_name": "System",
                "father_name": "Administrator",
                "phone": "+251911000000",
                "roles": json.dumps(["admin", "tutor"]),
                "active_role": "admin",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            db.commit()
            print(f"Admin user created successfully!")
            print(f"Email: admin@astegni.com")
            print(f"Password: Admin2025!")

    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()