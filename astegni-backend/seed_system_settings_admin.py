import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import bcrypt
from datetime import datetime

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

# Create engine and session
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def seed_system_settings_admin():
    """Seed system-settings admin profile"""
    try:
        # Check if admin already exists
        check_query = text("""
            SELECT id, email FROM admin_profile
            WHERE email = :email
        """)
        existing = session.execute(check_query, {"email": "admin@astegni.com"}).fetchone()

        if existing:
            print(f"WARNING: Admin already exists with email: admin@astegni.com")
            print(f"   Admin ID: {existing[0]}")
            print(f"   Would you like to update the password? (This script will skip update)")
            return

        # Hash the password
        password_hash = hash_password("Admin2025!")

        # Insert the system-settings admin (is_otp_verified removed - using password_hash presence instead)
        insert_query = text("""
            INSERT INTO admin_profile (
                email,
                password_hash,
                first_name,
                father_name,
                grandfather_name,
                phone_number,
                profile_picture,
                cover_picture,
                bio,
                quote,
                departments,
                created_at
            ) VALUES (
                :email,
                :password_hash,
                :first_name,
                :father_name,
                :grandfather_name,
                :phone_number,
                :profile_picture,
                :cover_picture,
                :bio,
                :quote,
                :departments,
                :created_at
            ) RETURNING id
        """)

        result = session.execute(insert_query, {
            "email": "admin@astegni.com",
            "password_hash": password_hash,
            "first_name": "System",
            "father_name": "Settings",
            "grandfather_name": "Admin",
            "phone_number": "+251911000000",
            "profile_picture": "uploads/system_images/system_profile_pictures/man-user.png",
            "cover_picture": "uploads/system_images/system_cover_pictures/admin cover.jpg",
            "bio": "System Settings Administrator - Manages platform configuration and settings",
            "quote": "Managing the platform for excellence in education",
            "departments": ["manage-system-settings"],
            "created_at": datetime.now()
        })

        admin_id = result.fetchone()[0]
        session.commit()

        print("SUCCESS: System Settings Admin created successfully!")
        print(f"\nAdmin Details:")
        print(f"   ID: {admin_id}")
        print(f"   Full Name: System Settings Admin")
        print(f"   Email: admin@astegni.com")
        print(f"   Password: Admin2025!")
        print(f"   Departments: ['manage-system-settings']")
        print(f"   Phone: +251911000000")
        print(f"\nLogin Credentials:")
        print(f"   Email: admin@astegni.com")
        print(f"   Password: Admin2025!")
        print(f"\nWARNING: Please change this password after first login!")

    except Exception as e:
        session.rollback()
        print(f"ERROR: Error creating admin: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    print("Seeding System Settings Admin Profile...")
    print("=" * 60)
    seed_system_settings_admin()
    print("=" * 60)
